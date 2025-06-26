import os
import subprocess
import sys
import time
import traceback
import uuid
from datetime import datetime
from pathlib import Path
from threading import Thread

sys.path.append(
    os.path.dirname(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    )
)

import json
import logging
from typing import Any, Callable, Dict, List, Optional

import uvicorn
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.middleware.base import BaseHTTPMiddleware

from kind_cluster_setup.api.data_provider import get_data_provider
from kind_cluster_setup.api.task_persistence import get_task_store
from kind_cluster_setup.commands import CreateCommand, DeployCommand, StatusCommand
from kind_cluster_setup.config.server_config import (
    API_STATUS,
    DEFAULT_ENVIRONMENTS,
    TASK_MESSAGES,
    get_server_config,
)

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# Get server configuration
server_config = get_server_config()

# Initialize data provider
use_mock_data = os.environ.get("USE_MOCK_DATA", "false").lower() == "true"
data_provider = get_data_provider(use_mock=use_mock_data)

# Initialize task store for persistence
task_store_type = os.environ.get("TASK_STORE_TYPE", "file")
task_file_path = os.environ.get("TASK_FILE_PATH", "./tasks.json")
task_store = get_task_store(persistence_type=task_store_type, file_path=task_file_path)

# Load existing tasks if any
TASK_STATUSES = task_store.get_all_tasks()

app = FastAPI(title="Kind Cluster Setup API")


# Error handling middleware
class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        try:
            return await call_next(request)
        except Exception as e:
            logger.error(f"Unhandled exception: {str(e)}")
            logger.error(traceback.format_exc())
            return JSONResponse(
                status_code=500,
                content={
                    "status": "error",
                    "message": "An internal server error occurred",
                    "error": str(e),
                },
            )


# Add a custom handler for OPTIONS requests (preflight)
@app.options("/{path:path}")
async def options_handler(path: str):
    return {"message": "OK"}


# Add middleware
app.add_middleware(ErrorHandlingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=server_config["cors"]["allow_origins"],
    allow_credentials=server_config["cors"]["allow_credentials"],
    allow_methods=server_config["cors"]["allow_methods"],
    allow_headers=server_config["cors"]["allow_headers"],
    expose_headers=server_config["cors"]["expose_headers"],
    max_age=server_config["cors"]["max_age"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint to verify the API server is running.

    Returns a simple status message indicating the server is healthy.
    """
    return create_api_response(
        API_STATUS["success"],
        "API server is healthy",
        data={
            "version": server_config.get("version", "1.0.0"),
            "mock_data": use_mock_data,
        },
    )


@app.get("/api/cluster/{name}/health")
async def check_cluster_health(name: str):
    """
    Check the health of a specific Kind cluster.

    Returns detailed health information including node status and issues.
    """
    try:
        logger.info(f"Checking health for cluster: {name}")

        # Import KindCluster class
        from kind_cluster_setup.cluster.kind_cluster import KindCluster

        # Create a temporary KindCluster instance for health checking
        cluster_config = {"name": name}
        env_config = {"environment": "dev"}  # Default environment

        cluster = KindCluster(cluster_config, env_config)
        health_info = cluster.check_health()

        status_code = 200
        if health_info["status"] == "unavailable":
            status_code = 503  # Service Unavailable
        elif health_info["status"] == "degraded":
            status_code = 207  # Multi-Status

        return JSONResponse(
            status_code=status_code,
            content=create_api_response(
                (
                    API_STATUS["success"]
                    if health_info["status"] == "healthy"
                    else API_STATUS["warning"]
                ),
                f"Cluster health: {health_info['status']}",
                data=health_info,
            ),
        )
    except Exception as e:
        logger.error(f"Failed to check cluster health: {str(e)}")
        logger.error(traceback.format_exc())

        raise HTTPException(
            status_code=500,
            detail=create_api_response(
                API_STATUS["error"],
                f"Failed to check cluster health: {str(e)}",
                error={"error_type": type(e).__name__},
            ),
        )


class NodeConfig(BaseModel):
    cpu: int
    memory: str


class ResourceLimits(BaseModel):
    worker_config: NodeConfig
    control_plane_config: NodeConfig


class CustomPorts(BaseModel):
    http_port: Optional[int] = None  # Default HTTP port (80 or alternative)
    https_port: Optional[int] = None  # Default HTTPS port (443 or alternative)
    nodeport_start: Optional[int] = (
        None  # Default NodePort range start (30000 or alternative)
    )


class ClusterCreate(BaseModel):
    name: str
    environment: str
    worker_nodes: int
    worker_config: Optional[NodeConfig] = None
    control_plane_config: Optional[NodeConfig] = None
    apply_resource_limits: bool = True
    custom_ports: Optional[CustomPorts] = None  # Add custom ports support


class ApplicationDeploy(BaseModel):
    cluster_name: str
    app_name: str
    app_version: Optional[str] = None
    namespace: str = "default"
    values: Optional[Dict[str, Any]] = None  # Custom configuration values
    deployment_method: str = "kubectl"  # Options: kubectl, helm, kustomize
    environment: str = "dev"  # Environment (dev, test, prod)


class ApplicationAction(BaseModel):
    action: str  # start, stop, restart
    cluster_name: str
    namespace: str = "default"


class ApplicationScale(BaseModel):
    replicas: int
    cluster_name: str
    namespace: str = "default"


class ApplicationUpdate(BaseModel):
    cluster_name: str
    namespace: str = "default"
    values: Dict[str, Any]  # New configuration values


# Default configurations for worker and control plane nodes
DEFAULT_WORKER_CONFIG = {"cpu": "2", "memory": "4GB"}
DEFAULT_CONTROL_PLANE_CONFIG = {"cpu": "2", "memory": "4GB"}


# Background task function to create cluster
async def create_cluster_task(
    task_id: str,
    cluster_name: str,
    worker_nodes: int,
    apply_resource_limits: bool,
    worker_config: Optional[Dict[str, Any]] = None,
    control_plane_config: Optional[Dict[str, Any]] = None,
    custom_ports: Optional[Dict[str, Any]] = None,
):
    try:
        logger.info(f"Starting task {task_id} for cluster: {cluster_name}")
        # Update status to indicate task is running
        task_status = TASK_STATUSES.get(task_id, {})
        task_status.update(
            {
                "status": "running",
                "message": "Cluster creation in progress...",
                "completed": False,
                "success": False,
                "updated_at": datetime.utcnow().isoformat(),
                "progress": 20,  # Initial progress
            }
        )
        # Ensure required fields are present
        for field in ["task_id", "type", "created_at"]:
            if field not in task_status:
                task_status[field] = task_id if field == "task_id" else ""

        TASK_STATUSES[task_id] = task_status
        task_store.save_task(task_id, task_status)

        # Execute the long-running operation
        result = {}
        try:
            logger.info(
                f"Creating command with parameters: name={cluster_name}, worker_nodes={worker_nodes}, apply_resource_limits={apply_resource_limits}"
            )
            command = CreateCommand()

            # Create an args Namespace with the required parameters
            from argparse import Namespace

            args = Namespace(
                name=cluster_name,
                worker_nodes=worker_nodes,
                apply_resource_limits=apply_resource_limits,
                environment="dev",
                worker_config=worker_config,
                control_plane_config=control_plane_config,
                custom_ports=custom_ports,
            )

            logger.info(f"Executing command with args: {vars(args)}")
            cmd_result = command.execute(args)

            if cmd_result:  # Check if result is not None
                result.update(cmd_result)

            logger.info(f"Command execution result: {cmd_result}")

            # Update task status to indicate progress
            task_status = TASK_STATUSES.get(task_id, {})
            task_status.update(
                {
                    "status": "running",
                    "message": "Cluster created, applying resource limits if needed...",
                    "progress": 70,
                    "updated_at": datetime.utcnow().isoformat(),
                }
            )
            TASK_STATUSES[task_id] = task_status
            task_store.save_task(task_id, task_status)

        except Exception as e:
            logger.error(f"Error in create_cluster_task: {str(e)}")
            logger.error(traceback.format_exc())
            # We'll mark the task as failed at the end of the function if this happens
            result["error"] = str(e)
            result["cluster_creation"] = "failed"

        # Apply resource limits if specified
        if apply_resource_limits and (worker_config or control_plane_config):
            logger.info(f"Applying resource limits to cluster {cluster_name}")
            try:
                # Call the standalone apply_resource_limits function
                resource_limits_result = apply_resource_limits(
                    cluster_name=cluster_name,
                    worker_config=worker_config,
                    control_plane_config=control_plane_config,
                    worker_nodes=worker_nodes,
                )
                # Log the result of applying resource limits
                logger.info(
                    f"Resource limits applied successfully: {resource_limits_result}"
                )
                # Merge the resource limits result with the main result
                if resource_limits_result and isinstance(result, dict):
                    result.update({"resource_limits": resource_limits_result})
            except Exception as e:
                error_msg = f"Failed to apply resource limits: {str(e)}"
                logger.error(error_msg)
                logger.error(traceback.format_exc())
                if isinstance(result, dict):
                    result.update({"resource_limits_error": error_msg})

        # Check cluster health after creation
        try:
            # Import KindCluster class
            from kind_cluster_setup.cluster.kind_cluster import KindCluster

            # Create a KindCluster instance
            cluster_config = {
                "name": cluster_name,
                "worker_nodes": worker_nodes,
                "apply_resource_limits": apply_resource_limits,
            }

            # Add advanced configuration if provided
            if worker_config:
                cluster_config["worker_config"] = worker_config
            if control_plane_config:
                cluster_config["control_plane_config"] = control_plane_config

            # Add custom port configuration if provided
            if custom_ports:
                if "http_port" in custom_ports and custom_ports["http_port"]:
                    cluster_config["http_port"] = custom_ports["http_port"]
                if "https_port" in custom_ports and custom_ports["https_port"]:
                    cluster_config["https_port"] = custom_ports["https_port"]
                if "nodeport_start" in custom_ports and custom_ports["nodeport_start"]:
                    cluster_config["nodeport_start"] = custom_ports["nodeport_start"]

            env_config = {"environment": "dev"}

            kind_cluster = KindCluster(cluster_config, env_config)
            health_info = kind_cluster.check_health()
            result["health"] = health_info
            logger.info(f"Cluster health check: {health_info['status']}")
        except Exception as health_error:
            logger.warning(f"Failed to check cluster health: {str(health_error)}")
            result["health"] = {"status": "unknown", "error": str(health_error)}

        # Check if there were any serious errors during execution
        has_error = (
            result.get("error") is not None
            or result.get("cluster_creation") == "failed"
        )

        # Check if Docker containers exist for this cluster (as a final validation)
        try:
            import subprocess

            containers = subprocess.run(
                [
                    "docker",
                    "ps",
                    "-a",
                    "--filter",
                    f"name={cluster_name}",
                    "--format",
                    "{{{{.Names}}}}",
                ],
                capture_output=True,
                text=True,
            )

            # If we found containers with this cluster name, consider it a success
            # even if there were minor errors (like with resource limits)
            if containers.stdout.strip() and not has_error:
                logger.info(
                    f"Found containers for cluster {cluster_name}: {containers.stdout.strip()}"
                )
                success = True
                message = "Cluster created successfully"
                status = "completed"
            else:
                # If no containers were found and we had errors, mark as failed
                if has_error:
                    success = False
                    message = f"Cluster creation failed: {result.get('error', 'Unknown error')}"
                    status = "failed"
                else:
                    # Edge case: No containers but also no recorded errors
                    success = False
                    message = "Cluster creation failed: No containers found but no error reported"
                    status = "failed"
        except Exception as container_check_error:
            logger.error(f"Error checking containers: {str(container_check_error)}")
            # Fall back to the error status from earlier steps
            success = not has_error
            message = (
                "Cluster created successfully"
                if success
                else f"Cluster creation failed: {result.get('error', 'Unknown error')}"
            )
            status = "completed" if success else "failed"

        # Update status to indicate task completed
        task_status = TASK_STATUSES.get(task_id, {})
        task_status.update(
            {
                "status": status,
                "message": message,
                "completed": True,
                "success": success,
                "progress": 100,
                "result": result,
                "updated_at": datetime.utcnow().isoformat(),
            }
        )

        # Ensure required fields are present
        for field in ["task_id", "type", "created_at"]:
            if field not in task_status:
                task_status[field] = task_id if field == "task_id" else ""

        TASK_STATUSES[task_id] = task_status
        task_store.save_task(task_id, task_status)
        logger.info(
            f"Task {task_id} completed with status: {status}, success: {success}"
        )
        logger.info(f"Final message: {message}")
    except Exception as e:
        logger.error(f"Task {task_id} failed: {str(e)}")
        logger.error(traceback.format_exc())

        # Check for orphaned containers
        try:
            import subprocess

            containers = subprocess.run(
                [
                    "docker",
                    "ps",
                    "-a",
                    "--filter",
                    f"name={cluster_name}",
                    "--format",
                    "{{.Names}}",
                ],
                capture_output=True,
                text=True,
            )

            if containers.stdout.strip():
                logger.warning(
                    f"Found orphaned containers: {containers.stdout}. Consider cleaning them up."
                )
        except Exception:
            pass

        # Update status to indicate task failed
        task_status = TASK_STATUSES.get(task_id, {})
        task_status.update(
            {
                "status": "failed",
                "message": f"Cluster creation failed: {str(e)}",
                "completed": True,
                "success": False,
                "progress": 100,
                "error": str(e),
                "updated_at": datetime.utcnow().isoformat(),
            }
        )
        # Ensure required fields are present
        for field in ["task_id", "type", "created_at"]:
            if field not in task_status:
                task_status[field] = task_id if field == "task_id" else ""

        TASK_STATUSES[task_id] = task_status
        task_store.save_task(task_id, task_status)
        logger.error(f"Task {task_id} failed: {str(e)}")


@app.post("/api/cluster/create")
async def create_cluster(cluster: ClusterCreate, background_tasks: BackgroundTasks):
    """
    Create a new Kind cluster with the specified configuration.

    Returns a task ID that can be used to track the progress of the cluster creation.
    """
    try:
        # Generate a unique task ID
        task_id = str(uuid.uuid4())

        # Create a new task for tracking
        task_status = {
            "task_id": task_id,
            "type": "cluster_create",
            "status": "pending",
            "completed": False,
            "success": False,
            "message": f"Creating cluster {cluster.name}...",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "details": {
                "cluster_name": cluster.name,
                "worker_nodes": cluster.worker_nodes,
                "apply_resource_limits": cluster.apply_resource_limits,
                "custom_ports": (
                    cluster.custom_ports.dict() if cluster.custom_ports else None
                ),
            },
            "progress": 0,
            "result": None,
        }
        TASK_STATUSES[task_id] = task_status

        # Save task to persistent storage
        task_store.save_task(task_id, TASK_STATUSES[task_id])

        # Prepare worker configuration if provided
        worker_config_dict = None
        if cluster.worker_config:
            worker_config_dict = cluster.worker_config.dict()

        # Prepare control plane configuration if provided
        control_plane_config_dict = None
        if cluster.control_plane_config:
            control_plane_config_dict = cluster.control_plane_config.dict()

        # Prepare custom ports configuration if provided
        custom_ports_dict = None
        if cluster.custom_ports:
            custom_ports_dict = cluster.custom_ports.dict()

        # Create the cluster in a background task
        background_tasks.add_task(
            create_cluster_task,
            task_id=task_id,
            cluster_name=cluster.name,
            worker_nodes=cluster.worker_nodes,
            apply_resource_limits=cluster.apply_resource_limits,
            worker_config=worker_config_dict,
            control_plane_config=control_plane_config_dict,
            custom_ports=custom_ports_dict,
        )

        # Return immediate response with task ID
        return create_api_response(
            API_STATUS["accepted"],
            f"Cluster creation task started for {cluster.name}",
            data={"task_id": task_id},
        )
    except Exception as e:
        logger.error(f"Failed to initiate cluster creation: {str(e)}")
        logger.error(traceback.format_exc())

        # Raise HTTPException with appropriate status code
        raise HTTPException(
            status_code=500,
            detail=create_api_response(
                API_STATUS["error"],
                f"Failed to initiate cluster creation: {str(e)}",
                error={"error_type": type(e).__name__},
            ),
        )


# Standardized API response format
def create_api_response(status: str, message: str, data: Any = None, error: Any = None):
    """Create a standardized API response format.

    Args:
        status: Status of the response (success, error, pending, etc.)
        message: Human-readable message describing the response
        data: Optional data payload
        error: Optional error details

    Returns:
        Dict with standardized response format
    """
    # Use status codes from centralized config
    if status not in API_STATUS.values():
        logger.warning(f"Non-standard status code used: {status}")

    response = {"status": status, "message": message}

    if data is not None:
        response["data"] = data

    if error is not None:
        response["error"] = error

    return response


# Helper function to get task message from centralized config
def get_task_message(
    task_type: str, status: str, format_args: Dict[str, Any] = None
) -> str:
    """Get a standardized task message from the configuration.

    Args:
        task_type: Type of task (cluster_creation, app_deployment, etc.)
        status: Status of the task (queued, running, completed, failed, etc.)
        format_args: Optional arguments to format into the message

    Returns:
        Formatted message string
    """
    if task_type not in TASK_MESSAGES:
        return f"{task_type} {status}"

    if status not in TASK_MESSAGES[task_type]:
        return f"{task_type} {status}"

    message = TASK_MESSAGES[task_type][status]

    # Format the message with provided arguments if any
    if format_args:
        try:
            return message.format(**format_args)
        except KeyError as e:
            logger.warning(f"Missing format argument for message: {e}")
            return message

    return message


@app.get("/api/tasks/{task_id}")
async def get_task_status(task_id: str):
    """Get the status of any task by its ID.

    This is a generic endpoint that can be used to check the status of any task,
    including cluster creation and application deployment tasks.
    """
    logger.info(f"Fetching status for task: {task_id}")

    # Check if task exists in memory
    task_status = TASK_STATUSES.get(task_id)

    # If not in memory, try to get from task store
    if task_status is None:
        task_status = task_store.get_task(task_id)
        if task_status is not None:
            # Update in-memory cache
            TASK_STATUSES[task_id] = task_status

    # If still not found, return a proper error response
    if task_status is None:
        logger.warning(f"Task {task_id} not found in memory or persistent storage")
        return {
            "task_id": task_id,
            "status": "not_found",
            "completed": True,
            "success": False,
            "message": f"Task {task_id} not found",
        }

    # Ensure the response has all required fields
    if "task_id" not in task_status:
        task_status["task_id"] = task_id
    if "status" not in task_status:
        task_status["status"] = "unknown"
    if "completed" not in task_status:
        task_status["completed"] = False
    if "success" not in task_status:
        task_status["success"] = False
    if "message" not in task_status:
        task_status["message"] = ""

    return task_status


# Removed duplicate /api/apps/list endpoint - using task-based implementation below


def load_app_templates():
    """Load application templates from the templates/apps directory.

    Returns:
        List of application templates with metadata
    """
    templates = []

    try:
        # Get the project root directory (4 levels up from this file)
        project_root = Path(__file__).parent.parent.parent.parent
        templates_dir = project_root / "templates" / "apps"

        logger.info(f"Looking for templates in: {templates_dir}")

        if not templates_dir.exists():
            logger.warning(f"Templates directory not found: {templates_dir}")
            return []

        # Scan for template directories
        for template_dir in templates_dir.iterdir():
            if template_dir.is_dir():
                metadata_file = template_dir / "metadata.json"

                if metadata_file.exists():
                    try:
                        with open(metadata_file, "r") as f:
                            metadata = json.load(f)

                        # Add the template name (directory name) to the metadata
                        template = {"name": template_dir.name, **metadata}

                        templates.append(template)
                        logger.info(f"Loaded template: {template_dir.name}")

                    except json.JSONDecodeError as e:
                        logger.error(f"Invalid JSON in {metadata_file}: {e}")
                    except Exception as e:
                        logger.error(f"Error reading {metadata_file}: {e}")
                else:
                    logger.warning(f"No metadata.json found in {template_dir}")

        logger.info(f"Loaded {len(templates)} application templates")
        return templates

    except Exception as e:
        logger.error(f"Error loading application templates: {e}")
        logger.error(traceback.format_exc())
        return []


@app.get("/api/apps/templates")
async def get_app_templates():
    """Get a list of available application templates.

    Returns information about all available application templates that can be deployed,
    including their metadata, default values, and deployment methods.
    """
    try:
        logger.info("Fetching application templates")

        templates = load_app_templates()

        return create_api_response(
            API_STATUS["success"],
            f"Found {len(templates)} application templates",
            data=templates,
        )

    except Exception as e:
        logger.error(f"Failed to get application templates: {str(e)}")
        logger.error(traceback.format_exc())

        raise HTTPException(
            status_code=500,
            detail=create_api_response(
                API_STATUS["error"],
                f"Failed to get application templates: {str(e)}",
                error={"error_type": type(e).__name__},
            ),
        )


def deploy_application_task(task_id: str, deployment_config: Dict[str, Any]):
    """
    Background task for deploying applications to Kind clusters.

    This function handles the actual deployment process based on the specified method
    (kubectl, helm, or kustomize).
    """
    logger.info(f"Starting deployment task {task_id}")

    try:
        # Update task status to running
        task_status = {
            "status": "running",
            "message": get_task_message(
                "app_deployment",
                "preparing",
                {"app_name": deployment_config["app_name"]},
            ),
            "completed": False,
            "progress": 10,
        }
        TASK_STATUSES[task_id] = task_status
        task_store.save_task(task_id, task_status)

        # Import the deployment command
        from kind_cluster_setup.commands.deploy import DeployCommand

        # Update task status to deploying
        task_status = {
            "status": "running",
            "message": get_task_message(
                "app_deployment",
                "deploying",
                {
                    "app_name": deployment_config["app_name"],
                    "cluster_name": deployment_config["cluster_name"],
                },
            ),
            "completed": False,
            "progress": 30,
        }
        TASK_STATUSES[task_id] = task_status
        task_store.save_task(task_id, task_status)

        # Get environment from config or use default
        environment = deployment_config.get("environment", "dev")

        # Create an args Namespace with the required parameters
        # DeployCommand expects 'apps' and 'deployments' as lists
        from argparse import Namespace

        args = Namespace(
            apps=[deployment_config["app_name"]],  # DeployCommand expects a list
            deployments=[
                deployment_config.get("deployment_method", "kubernetes")
            ],  # DeployCommand expects this attribute
            cluster_name=deployment_config["cluster_name"],
            environment=environment,
            namespace=deployment_config.get("namespace", "default"),
            values=deployment_config.get("values", {}),
        )

        # Instead of using DeployCommand which expects config files,
        # we'll use the template system directly for deployment
        from kind_cluster_setup.deployment.helm import HelmDeploymentStrategy
        from kind_cluster_setup.deployment.kubernetes import (
            KubernetesDeploymentStrategy,
        )

        # Load the template for the application using existing template loading logic
        templates = load_app_templates()
        template = None
        for t in templates:
            if t["name"] == deployment_config["app_name"]:
                template = t
                break

        if not template:
            raise ValueError(
                f"Template not found for application: {deployment_config['app_name']}"
            )

        # Create deployment strategy based on method
        deployment_method = deployment_config.get("deployment_method", "kubernetes")
        if deployment_method == "helm":
            strategy = HelmDeploymentStrategy()
        elif deployment_method in ["kubernetes", "kubectl"]:
            strategy = KubernetesDeploymentStrategy()
        else:
            raise ValueError(f"Unsupported deployment method: {deployment_method}")

        # Get default values from template metadata
        template_defaults = {}
        if template and "parameters" in template:
            # New parameter system
            for param_name, param_config in template["parameters"].items():
                if "default" in param_config:
                    template_defaults[param_name] = param_config["default"]
        elif template and "default_values" in template:
            # Legacy default_values system (for templates like Airflow)
            template_defaults = template["default_values"].copy()

        # Merge user values with template defaults
        merged_values = template_defaults.copy()
        merged_values.update(deployment_config.get("values", {}) or {})

        # Prepare the app config from template and values
        app_config = {
            "name": deployment_config["app_name"],
            "template": template,
            "values": merged_values,
            "namespace": deployment_config.get("namespace", "default"),
        }

        # Get environment config
        from kind_cluster_setup.config.config_loader import get_environment_config

        env_config = get_environment_config(environment)

        # Get the template directory path
        from pathlib import Path

        project_root = Path(__file__).parent.parent.parent.parent
        base_template_dir = (
            project_root / "templates" / "apps" / deployment_config["app_name"]
        )

        # For Kubernetes deployment, look for the kubernetes subdirectory
        deployment_method = deployment_config.get("deployment_method", "kubernetes")
        if deployment_method in ["kubernetes", "kubectl"]:
            kubernetes_dir = base_template_dir / "kubernetes"
            # Use kubernetes subdirectory if it exists, otherwise use base directory
            template_dir = (
                kubernetes_dir if kubernetes_dir.exists() else base_template_dir
            )
        else:
            template_dir = base_template_dir

        # Deploy the application
        result = strategy.deploy(
            app=deployment_config["app_name"],
            app_config=app_config,
            env_config=env_config,
            template_dir=str(template_dir) if template_dir.exists() else None,
            cluster_name=deployment_config["cluster_name"],
            values=merged_values,
        )

        # Handle the result from deployment strategy (which returns a boolean)
        if isinstance(result, bool):
            result = {
                "app_name": deployment_config["app_name"],
                "status": "success" if result else "failed",
                "deployment_method": deployment_config.get(
                    "deployment_method", "kubernetes"
                ),
                "cluster_name": deployment_config["cluster_name"],
                "namespace": deployment_config.get("namespace", "default"),
            }
        else:
            # Ensure the result has all required fields (for dict results)
            if not result.get("app_name"):
                result["app_name"] = deployment_config["app_name"]

            if not result.get("cluster_name"):
                result["cluster_name"] = deployment_config["cluster_name"]

        # Store the result in TASK_STATUSES
        task_status = {
            "status": "completed",
            "message": get_task_message(
                "app_deployment",
                "completed",
                {
                    "app_name": deployment_config["app_name"],
                    "cluster_name": deployment_config["cluster_name"],
                },
            ),
            "completed": True,
            "progress": 100,
            "result": result,
        }
        TASK_STATUSES[task_id] = task_status
        task_store.save_task(task_id, task_status)

        logger.info(f"Deployment task {task_id} completed successfully")

    except Exception as e:
        logger.error(f"Deployment task {task_id} failed: {str(e)}")
        logger.error(traceback.format_exc())

        # Update status to indicate task failed
        task_status = {
            "status": "failed",
            "message": get_task_message(
                "app_deployment",
                "failed",
                {
                    "app_name": deployment_config.get("app_name", "unknown"),
                    "error": str(e),
                },
            ),
            "completed": True,
            "error": {"message": str(e), "type": type(e).__name__},
        }
        TASK_STATUSES[task_id] = task_status
        task_store.save_task(task_id, task_status)


@app.post("/api/apps/deploy")
async def deploy_application(
    deployment: ApplicationDeploy, background_tasks: BackgroundTasks
):
    """
    Deploy an application to a Kind cluster.

    Parameters:
    - cluster_name: Name of the target Kind cluster
    - app_name: Name of the application to deploy (must match a template name)
    - app_version: Optional version of the application
    - namespace: Kubernetes namespace to deploy to (default: 'default')
    - values: Optional custom configuration values
    - deployment_method: Method to use for deployment (kubectl, helm, kustomize)
    - environment: Optional environment name (default: 'dev')
    """
    logger.info(
        f"Deploying {deployment.app_name} to cluster {deployment.cluster_name} using {deployment.deployment_method}"
    )

    try:
        # Generate a unique task ID
        task_id = str(uuid.uuid4())
        task_status = {
            "task_id": task_id,
            "status": "pending",
            "completed": False,
            "success": False,
            "message": "Cluster creation in progress",
            "cluster_name": deployment.cluster_name,
            "worker_nodes": 1,
            "environment": deployment.environment,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

        # Store the task status
        TASK_STATUSES[task_id] = task_status
        task_store.save_task(task_id, task_status)

        # Start deployment in background
        thread = Thread(
            target=deploy_application_task, args=(task_id, deployment.dict())
        )
        thread.daemon = True
        thread.start()

        return create_api_response(
            API_STATUS["accepted"],
            get_task_message(
                "app_deployment",
                "started",
                {
                    "app_name": deployment.app_name,
                    "cluster_name": deployment.cluster_name,
                },
            ),
            data={"task_id": task_id},
        )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to initiate application deployment: {error_msg}")
        logger.error(traceback.format_exc())

        raise HTTPException(
            status_code=500,
            detail=create_api_response(
                API_STATUS["error"],
                f"Failed to initiate application deployment: {error_msg}",
                error={"error_type": type(e).__name__},
            ),
        )


def apply_resource_limits(
    cluster_name: str,
    worker_config: Dict[str, Any] = None,
    control_plane_config: Dict[str, Any] = None,
    worker_nodes: int = 1,
) -> Dict[str, Any]:
    """
    Apply resource limits to a Kind cluster's Docker containers.

    Args:
        cluster_name: Name of the Kind cluster
        worker_config: Configuration for worker nodes (cpu and memory)
        control_plane_config: Configuration for control plane node (cpu and memory)
        worker_nodes: Number of worker nodes in the cluster

    Returns:
        Dict containing results of the resource limits application
    """

    result = {}
    logger.info(f"Automatically applying resource limits to cluster: {cluster_name}")

    # Define default values if either config is missing
    if not worker_config:
        worker_config = DEFAULT_WORKER_CONFIG.copy()
        logger.info(f"Using default worker config: {worker_config}")

    if not control_plane_config:
        control_plane_config = DEFAULT_CONTROL_PLANE_CONFIG.copy()
        logger.info(f"Using default control plane config: {control_plane_config}")

    try:
        # Call our set_resource_limits implementation directly
        import subprocess
        import time

        # Add a delay to ensure containers are fully created
        time.sleep(5)

        # Set control plane limits
        cp_memory_bytes = (
            int(control_plane_config["memory"].replace("GB", "")) * 1024 * 1024 * 1024
        )
        cp_memory_swap = cp_memory_bytes * 2
        cp_cpus = float(control_plane_config["cpu"])
        cp_container = f"{cluster_name}-control-plane"

        # Construct command
        cp_cmd = [
            "docker",
            "update",
            "--memory",
            str(cp_memory_bytes),
            "--memory-swap",
            str(cp_memory_swap),
            "--cpus",
            str(cp_cpus),
            cp_container,
        ]

        logger.info(f"Running command to set control plane limits: {' '.join(cp_cmd)}")
        cp_result = subprocess.run(cp_cmd, capture_output=True, text=True)

        if cp_result.returncode == 0:
            logger.info(f"Successfully applied control plane limits to {cp_container}")
            result["control_plane_limits"] = "applied"
        else:
            logger.error(f"Failed to apply control plane limits: {cp_result.stderr}")
            result["control_plane_limits"] = "failed"

        # Set worker limits
        worker_memory_bytes = (
            int(worker_config["memory"].replace("GB", "")) * 1024 * 1024 * 1024
        )
        worker_memory_swap = worker_memory_bytes * 2
        worker_cpus = float(worker_config["cpu"])

        workers_updated = 0

        # Apply limits to each worker node
        for i in range(worker_nodes):
            worker_suffix = "" if i == 0 else str(i + 1)
            worker_container = f"{cluster_name}-worker{worker_suffix}"

            # Check if container exists
            check_cmd = [
                "docker",
                "ps",
                "-a",
                "--filter",
                f"name={worker_container}",
                "--format",
                "{{{{.Names}}}}",
            ]
            check_result = subprocess.run(check_cmd, capture_output=True, text=True)

            if check_result.stdout.strip():
                worker_cmd = [
                    "docker",
                    "update",
                    "--memory",
                    str(worker_memory_bytes),
                    "--memory-swap",
                    str(worker_memory_swap),
                    "--cpus",
                    str(worker_cpus),
                    worker_container,
                ]

                logger.info(
                    f"Running command to set worker limits: {' '.join(worker_cmd)}"
                )
                worker_result = subprocess.run(
                    worker_cmd, capture_output=True, text=True
                )

                if worker_result.returncode == 0:
                    logger.info(
                        f"Successfully applied worker limits to {worker_container}"
                    )
                    workers_updated += 1
                else:
                    logger.error(
                        f"Failed to apply worker limits to {worker_container}: {worker_result.stderr}"
                    )

        result["worker_limits_applied"] = workers_updated
        logger.info(f"Resource limits applied to {workers_updated} worker nodes")

    except Exception as e:
        logger.error(f"Error applying resource limits: {str(e)}")
        logger.error(traceback.format_exc())
        result["resource_limits_error"] = str(e)

    return result


# Removed redundant endpoint /api/cluster/deploy
# This functionality is now handled by the more flexible /api/apps/deploy endpoint
# If you need to deploy a default application, use /api/apps/deploy with appropriate parameters


@app.get("/api/clusters/list")
async def list_clusters():
    """
    List all Kind clusters available on the system.
    """
    logger.info("Listing all Kind clusters")
    try:
        # Use kind CLI to get the real cluster list
        import subprocess

        result = subprocess.run(
            ["kind", "get", "clusters"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        if result.returncode != 0:
            logger.error(f"Failed to list clusters: {result.stderr}")
            return create_api_response(
                "error",
                "Failed to list clusters",
                error=result.stderr,
                data={"clusters": [], "count": 0},
            )

        # Parse the output (one cluster name per line)
        clusters = []
        for line in result.stdout.strip().split("\n"):
            if line:  # Skip empty lines
                clusters.append(
                    {"name": line, "status": "Running"}  # Default status for now
                )

        logger.info(f"Found {len(clusters)} clusters")
        return create_api_response(
            "success",
            "Clusters retrieved successfully",
            data={"clusters": clusters, "count": len(clusters)},
        )

    except Exception as e:
        logger.error(f"Failed to list clusters: {str(e)}")
        logger.error(f"Stack trace: {traceback.format_exc()}")
        return create_api_response(
            "error",
            "Failed to list clusters due to an error",
            error=str(e),
            data={"clusters": [], "count": 0},
        )


@app.get("/api/cluster/status")
async def get_cluster_status(environments: Optional[str] = None):
    """
    Get status of all clusters across environments.

    Parameters:
    - environments: Optional comma-separated list of environments to check (default: dev,staging,prod)
    """
    logger.info("Fetching cluster status")
    try:
        # Parse environments parameter or use defaults
        env_list = environments.split(",") if environments else DEFAULT_ENVIRONMENTS
        logger.info(f"Checking status for environments: {env_list}")

        # Use data provider to get cluster status
        response_data = data_provider.get_cluster_status(env_list)

        # Add cluster count if not already present
        if "cluster_count" not in response_data and "clusters" in response_data:
            response_data["cluster_count"] = len(response_data["clusters"])

        return create_api_response(
            "success", "Cluster status retrieved successfully", data=response_data
        )
    except Exception as e:
        logger.error(f"Failed to get cluster status: {str(e)}")
        logger.error(f"Stack trace: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, detail=f"Failed to get cluster status: {str(e)}"
        )


@app.get("/api/cluster/{cluster_name}/details")
async def get_cluster_details(cluster_name: str):
    """
    Get comprehensive details for a specific cluster.

    Parameters:
    - cluster_name: Name of the cluster to get details for
    """
    try:
        logger.info(f"Getting details for cluster {cluster_name}")

        # Check if cluster exists
        if not data_provider.cluster_exists(cluster_name):
            raise HTTPException(
                status_code=404, detail=f"Cluster {cluster_name} not found"
            )

        details = data_provider.get_cluster_details(cluster_name)

        return create_api_response(
            "success",
            f"Details for cluster {cluster_name} retrieved successfully",
            data=details,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get cluster details for {cluster_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cluster/{cluster_name}/nodes")
async def get_cluster_nodes(cluster_name: str):
    """
    Get detailed node information for a specific cluster.

    Parameters:
    - cluster_name: Name of the cluster to get nodes for
    """
    try:
        logger.info(f"Getting nodes for cluster {cluster_name}")

        if not data_provider.cluster_exists(cluster_name):
            raise HTTPException(
                status_code=404, detail=f"Cluster {cluster_name} not found"
            )

        nodes = data_provider.get_cluster_nodes_detailed(cluster_name)

        return create_api_response(
            "success",
            f"Nodes for cluster {cluster_name} retrieved successfully",
            data=nodes,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get nodes for {cluster_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cluster/{cluster_name}/health")
async def get_cluster_health(cluster_name: str):
    """
    Get health information for a specific cluster.

    Parameters:
    - cluster_name: Name of the cluster to get health for
    """
    try:
        logger.info(f"Getting health for cluster {cluster_name}")

        if not data_provider.cluster_exists(cluster_name):
            raise HTTPException(
                status_code=404, detail=f"Cluster {cluster_name} not found"
            )

        health = data_provider.get_cluster_health(cluster_name)

        return create_api_response(
            "success",
            f"Health for cluster {cluster_name} retrieved successfully",
            data=health,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get health for {cluster_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cluster/{cluster_name}/resources")
async def get_cluster_resources(cluster_name: str):
    """
    Get resource utilization for a specific cluster.

    Parameters:
    - cluster_name: Name of the cluster to get resources for
    """
    try:
        logger.info(f"Getting resources for cluster {cluster_name}")

        if not data_provider.cluster_exists(cluster_name):
            raise HTTPException(
                status_code=404, detail=f"Cluster {cluster_name} not found"
            )

        resources = data_provider.get_cluster_resources(cluster_name)

        return create_api_response(
            "success",
            f"Resources for cluster {cluster_name} retrieved successfully",
            data=resources,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get resources for {cluster_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cluster/{cluster_name}/network")
async def get_cluster_network(cluster_name: str):
    """
    Get network information for a specific cluster.

    Parameters:
    - cluster_name: Name of the cluster to get network info for
    """
    try:
        logger.info(f"Getting network info for cluster {cluster_name}")

        if not data_provider.cluster_exists(cluster_name):
            raise HTTPException(
                status_code=404, detail=f"Cluster {cluster_name} not found"
            )

        network = data_provider.get_cluster_network_info(cluster_name)

        return create_api_response(
            "success",
            f"Network info for cluster {cluster_name} retrieved successfully",
            data=network,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get network info for {cluster_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cluster/{cluster_name}/storage")
async def get_cluster_storage(cluster_name: str):
    """
    Get storage information for a specific cluster.

    Parameters:
    - cluster_name: Name of the cluster to get storage info for
    """
    try:
        logger.info(f"Getting storage info for cluster {cluster_name}")

        if not data_provider.cluster_exists(cluster_name):
            raise HTTPException(
                status_code=404, detail=f"Cluster {cluster_name} not found"
            )

        storage = data_provider.get_cluster_storage_info(cluster_name)

        return create_api_response(
            "success",
            f"Storage info for cluster {cluster_name} retrieved successfully",
            data=storage,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get storage info for {cluster_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cluster/{cluster_name}/workloads")
async def get_cluster_workloads(cluster_name: str):
    """
    Get workload information for a specific cluster.

    Parameters:
    - cluster_name: Name of the cluster to get workloads for
    """
    try:
        logger.info(f"Getting workloads for cluster {cluster_name}")

        if not data_provider.cluster_exists(cluster_name):
            raise HTTPException(
                status_code=404, detail=f"Cluster {cluster_name} not found"
            )

        workloads = data_provider.get_cluster_workloads(cluster_name)

        return create_api_response(
            "success",
            f"Workloads for cluster {cluster_name} retrieved successfully",
            data=workloads,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get workloads for {cluster_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cluster/{cluster_name}/events")
async def get_cluster_events(cluster_name: str, limit: int = 100):
    """
    Get recent events for a specific cluster.

    Parameters:
    - cluster_name: Name of the cluster to get events for
    - limit: Maximum number of events to return (default: 100)
    """
    try:
        logger.info(f"Getting events for cluster {cluster_name}")

        if not data_provider.cluster_exists(cluster_name):
            raise HTTPException(
                status_code=404, detail=f"Cluster {cluster_name} not found"
            )

        events = data_provider.get_cluster_events(cluster_name, limit)

        return create_api_response(
            "success",
            f"Events for cluster {cluster_name} retrieved successfully",
            data=events,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get events for {cluster_name}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/task-debug")
async def task_debug(max_keys: int = 20):
    """
    Return detailed info about TASK_STATUSES for debugging purposes.

    Parameters:
    - max_keys: Maximum number of task keys to return (default: 20)
    """
    all_keys = list(TASK_STATUSES.keys())
    logger.info(f"TASK_STATUSES has {len(all_keys)} keys: {all_keys[:max_keys]}")

    # Limit max_keys to a reasonable range for security
    if max_keys > 100:
        max_keys = 100

    debug_data = {
        "total_tasks": len(TASK_STATUSES),
        "keys": all_keys[:max_keys],
        "has_tasks": len(TASK_STATUSES) > 0,
        # Add typical structure of a few tasks if any exist
        "sample_structure": (
            [
                {
                    "task_id": task_id,
                    "type": TASK_STATUSES[task_id].get("type"),
                    "status": TASK_STATUSES[task_id].get("status"),
                }
                for task_id in list(TASK_STATUSES.keys())[:5]
            ]
            if TASK_STATUSES
            else []
        ),
    }

    return create_api_response(
        "success", "Task debug information retrieved", data=debug_data
    )


class PortForwardRequest(BaseModel):
    resource: str  # e.g., 'pod/mypod' or 'svc/myservice'
    port_mapping: str  # e.g., '8080:80'


class AppPortForwardRequest(BaseModel):
    app_id: str
    cluster_name: str
    namespace: str = "default"
    local_port: Optional[int] = None  # If not provided, will auto-assign


@app.post("/api/cluster/{name}/port-forward")
async def start_port_forward(name: str, request: PortForwardRequest):
    """
    Start port forwarding to a resource in the cluster.

    Parameters:
    - name: Name of the cluster
    - resource: Resource to forward to (e.g., 'pod/mypod' or 'svc/myservice')
    - port_mapping: Port mapping (e.g., '8080:80')
    """
    try:
        logger.info(
            f"Starting port forwarding for {request.resource} in cluster {name}"
        )

        # Import KindCluster class
        from kind_cluster_setup.cluster.kind_cluster import KindCluster

        # Create a KindCluster instance
        cluster_config = {"name": name}
        env_config = {"environment": "dev"}  # Default environment

        cluster = KindCluster(cluster_config, env_config)

        # Start port forwarding in a background thread
        def port_forward_task():
            try:
                process = cluster.port_forward(request.resource, request.port_mapping)
                # Keep track of the process for later termination if needed
                # You might want to store this in a global dict or database
                logger.info(f"Port forwarding started for {request.resource}")
            except Exception as e:
                logger.error(f"Port forwarding failed: {str(e)}")

        thread = Thread(target=port_forward_task)
        thread.daemon = True
        thread.start()

        return create_api_response(
            API_STATUS["success"],
            f"Port forwarding started for {request.resource}",
            data={
                "cluster": name,
                "resource": request.resource,
                "port_mapping": request.port_mapping,
            },
        )
    except Exception as e:
        logger.error(f"Failed to start port forwarding: {str(e)}")
        logger.error(traceback.format_exc())

        raise HTTPException(
            status_code=500,
            detail=create_api_response(
                API_STATUS["error"],
                f"Failed to start port forwarding: {str(e)}",
                error={"error_type": type(e).__name__},
            ),
        )


# Global dictionary to track active port forwards
ACTIVE_PORT_FORWARDS = {}


def is_port_in_use(port: int) -> bool:
    """Check if a port is already in use."""
    import socket

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("localhost", port))
            return False
        except OSError:
            return True


async def get_app_deployment_status(app_id: str, cluster_name: str, namespace: str):
    """Get deployment status for an application."""
    try:
        # Try to get task details first (for task-based applications)
        task = task_store.get_task(app_id)
        app_name = None

        if task and task.get("details", {}).get("app_name"):
            app_name = task["details"]["app_name"]
        else:
            # For real applications, we need to be smarter about finding related services
            # Since app_id is a UUID, we'll look for common application patterns
            context = f"kind-{cluster_name}"

            # Get all services first to understand what's available
            services_cmd = (
                f"kubectl get services -n {namespace} --context {context} -o json"
            )
            result = subprocess.run(
                services_cmd, shell=True, capture_output=True, text=True
            )

            if result.returncode == 0:
                import json

                services_data = json.loads(result.stdout)
                service_names = [
                    s["metadata"]["name"] for s in services_data.get("items", [])
                ]

                # Look for common application patterns
                if any("airflow" in name for name in service_names):
                    app_name = "airflow"  # Generic airflow app
                elif any("grafana" in name for name in service_names):
                    app_name = "grafana"
                elif any("prometheus" in name for name in service_names):
                    app_name = "prometheus"
                else:
                    # Fallback to first deployment name
                    deployments_cmd = f"kubectl get deployments -n {namespace} --context {context} -o json"
                    result = subprocess.run(
                        deployments_cmd, shell=True, capture_output=True, text=True
                    )
                    if result.returncode == 0:
                        deployments_data = json.loads(result.stdout)
                        deployments = deployments_data.get("items", [])
                        if deployments:
                            app_name = deployments[0]["metadata"]["name"]

        if not app_name:
            return None

        # Get all services and filter based on app pattern
        context = f"kind-{cluster_name}"
        services_cmd = (
            f"kubectl get services -n {namespace} --context {context} -o json"
        )
        result = subprocess.run(
            services_cmd, shell=True, capture_output=True, text=True
        )

        services_info = []
        if result.returncode == 0:
            import json

            services_data = json.loads(result.stdout)
            for service in services_data.get("items", []):
                service_name = service["metadata"]["name"]

                # For airflow, include all airflow-related services
                # For other apps, use the original logic
                should_include = False
                if app_name == "airflow":
                    should_include = "airflow" in service_name.lower()
                else:
                    should_include = (
                        app_name.lower() in service_name.lower()
                        or service_name.lower() in app_name.lower()
                    )

                if should_include:
                    service_info = {
                        "name": service_name,
                        "type": service["spec"].get("type", "ClusterIP"),
                        "ports": [],
                    }

                    for port in service["spec"].get("ports", []):
                        service_info["ports"].append(
                            {
                                "name": port.get("name", ""),
                                "port": port.get("port"),
                                "target_port": port.get("targetPort"),
                                "node_port": port.get("nodePort"),
                            }
                        )

                    services_info.append(service_info)

        return {"app": app_name, "namespace": namespace, "services": services_info}

    except Exception as e:
        logger.error(f"Error getting app deployment status: {str(e)}")
        return None


@app.post("/api/apps/{app_id}/port-forward")
async def start_app_port_forward(app_id: str, request: AppPortForwardRequest):
    """
    Start port forwarding for a specific application.

    This endpoint automatically detects the appropriate service for the application
    and starts port forwarding to make it accessible on localhost.
    """
    try:
        logger.info(f"Starting port forwarding for application {app_id}")

        cluster_name = request.cluster_name
        namespace = request.namespace

        # Get application details to find the appropriate service
        app_details = await get_app_deployment_status(app_id, cluster_name, namespace)

        if not app_details or "services" not in app_details:
            raise HTTPException(
                status_code=404, detail=f"No services found for application {app_id}"
            )

        services = app_details["services"]
        if not services:
            raise HTTPException(
                status_code=404,
                detail=f"No services available for application {app_id}",
            )

        # Find the main service (usually the first one or one with 'web' in the name)
        target_service = None
        target_port = None

        # Look for web/UI services first with improved priority
        service_priority = []

        for service in services:
            service_name = service.get("name", "")
            ports = service.get("ports", [])

            # Assign priority scores (higher = better)
            priority = 0

            # Highest priority: webserver services
            if "webserver" in service_name.lower():
                priority = 100
            # High priority: web, ui, frontend services
            elif any(
                keyword in service_name.lower() for keyword in ["web", "ui", "frontend"]
            ):
                priority = 90
            # Medium priority: services with common web ports
            elif ports and any(p.get("port") in [80, 8080, 3000, 9090] for p in ports):
                priority = 50
            # Low priority: other services
            else:
                priority = 10

            # Reduce priority for database/cache services
            if any(
                keyword in service_name.lower()
                for keyword in ["redis", "postgres", "mysql", "db", "cache"]
            ):
                priority = 1

            service_priority.append((priority, service_name, ports))

        # Sort by priority (highest first)
        service_priority.sort(key=lambda x: x[0], reverse=True)

        # Select the highest priority service
        if service_priority:
            _, target_service, ports = service_priority[0]
            if ports:
                target_port = ports[0].get("port", 80)

            logger.info(
                f"Selected service '{target_service}' with priority {service_priority[0][0]} for app {app_id}"
            )
            logger.info(
                f"Available services with priorities: {[(p, name) for p, name, _ in service_priority]}"
            )

        if not target_service or not target_port:
            raise HTTPException(
                status_code=404,
                detail=f"Could not determine target service and port for application {app_id}",
            )

        # Determine local port
        local_port = request.local_port
        if not local_port:
            # Auto-assign a port starting from 8080
            local_port = 8080
            while is_port_in_use(local_port):
                local_port += 1
                if local_port > 9000:  # Safety limit
                    raise HTTPException(
                        status_code=500, detail="Could not find an available local port"
                    )

        # Check if port forwarding is already active for this app
        pf_key = f"{app_id}-{cluster_name}-{namespace}"
        if pf_key in ACTIVE_PORT_FORWARDS:
            existing_pf = ACTIVE_PORT_FORWARDS[pf_key]
            if existing_pf["process"].poll() is None:  # Process is still running
                return create_api_response(
                    API_STATUS["success"],
                    f"Port forwarding already active for {app_id}",
                    data={
                        "app_id": app_id,
                        "cluster": cluster_name,
                        "namespace": namespace,
                        "service": existing_pf["service"],
                        "local_port": existing_pf["local_port"],
                        "target_port": existing_pf["target_port"],
                        "access_url": f"http://localhost:{existing_pf['local_port']}",
                        "status": "already_active",
                    },
                )
            else:
                # Process died, remove it
                del ACTIVE_PORT_FORWARDS[pf_key]

        # Start port forwarding
        context_name = f"kind-{cluster_name}"
        resource = f"service/{target_service}"
        port_mapping = f"{local_port}:{target_port}"

        cmd = [
            "kubectl",
            "port-forward",
            resource,
            port_mapping,
            f"--context={context_name}",
            f"--namespace={namespace}",
        ]

        logger.info(f"Starting port forwarding: {' '.join(cmd)}")
        process = subprocess.Popen(
            cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )

        # Store the process info
        ACTIVE_PORT_FORWARDS[pf_key] = {
            "process": process,
            "app_id": app_id,
            "cluster": cluster_name,
            "namespace": namespace,
            "service": target_service,
            "local_port": local_port,
            "target_port": target_port,
            "started_at": datetime.utcnow().isoformat(),
        }

        # Give it a moment to start
        import time

        time.sleep(1)

        # Check if the process is still running
        if process.poll() is not None:
            # Process failed to start
            stdout, stderr = process.communicate()
            error_msg = stderr or stdout or "Unknown error"
            raise HTTPException(
                status_code=500, detail=f"Failed to start port forwarding: {error_msg}"
            )

        access_url = f"http://localhost:{local_port}"

        return create_api_response(
            API_STATUS["success"],
            f"Port forwarding started for {app_id}",
            data={
                "app_id": app_id,
                "cluster": cluster_name,
                "namespace": namespace,
                "service": target_service,
                "local_port": local_port,
                "target_port": target_port,
                "access_url": access_url,
                "status": "started",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start port forwarding for app {app_id}: {str(e)}")
        logger.error(traceback.format_exc())

        raise HTTPException(
            status_code=500,
            detail=create_api_response(
                API_STATUS["error"],
                f"Failed to start port forwarding: {str(e)}",
                error={"error_type": type(e).__name__},
            ),
        )


@app.delete("/api/apps/{app_id}/port-forward")
async def stop_app_port_forward(
    app_id: str, cluster_name: str, namespace: str = "default"
):
    """
    Stop port forwarding for a specific application.
    """
    try:
        logger.info(f"Stopping port forwarding for application {app_id}")

        pf_key = f"{app_id}-{cluster_name}-{namespace}"

        if pf_key not in ACTIVE_PORT_FORWARDS:
            raise HTTPException(
                status_code=404,
                detail=f"No active port forwarding found for application {app_id}",
            )

        pf_info = ACTIVE_PORT_FORWARDS[pf_key]
        process = pf_info["process"]

        # Terminate the process
        if process.poll() is None:  # Process is still running
            process.terminate()
            # Give it a moment to terminate gracefully
            import time

            time.sleep(1)

            # Force kill if still running
            if process.poll() is None:
                process.kill()

        # Remove from active port forwards
        del ACTIVE_PORT_FORWARDS[pf_key]

        return create_api_response(
            API_STATUS["success"],
            f"Port forwarding stopped for {app_id}",
            data={
                "app_id": app_id,
                "cluster": cluster_name,
                "namespace": namespace,
                "local_port": pf_info["local_port"],
                "status": "stopped",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to stop port forwarding for app {app_id}: {str(e)}")
        logger.error(traceback.format_exc())

        raise HTTPException(
            status_code=500,
            detail=create_api_response(
                API_STATUS["error"],
                f"Failed to stop port forwarding: {str(e)}",
                error={"error_type": type(e).__name__},
            ),
        )


@app.get("/api/apps/{app_id}/port-forward/status")
async def get_app_port_forward_status(
    app_id: str, cluster_name: str, namespace: str = "default"
):
    """
    Get the current port forwarding status for an application.
    """
    try:
        pf_key = f"{app_id}-{cluster_name}-{namespace}"

        if pf_key not in ACTIVE_PORT_FORWARDS:
            return create_api_response(
                API_STATUS["success"],
                f"No port forwarding active for {app_id}",
                data={
                    "app_id": app_id,
                    "cluster": cluster_name,
                    "namespace": namespace,
                    "status": "inactive",
                },
            )

        pf_info = ACTIVE_PORT_FORWARDS[pf_key]
        process = pf_info["process"]

        # Check if process is still running
        if process.poll() is not None:
            # Process died, remove it
            del ACTIVE_PORT_FORWARDS[pf_key]
            return create_api_response(
                API_STATUS["success"],
                f"Port forwarding for {app_id} has stopped",
                data={
                    "app_id": app_id,
                    "cluster": cluster_name,
                    "namespace": namespace,
                    "status": "stopped",
                },
            )

        return create_api_response(
            API_STATUS["success"],
            f"Port forwarding active for {app_id}",
            data={
                "app_id": app_id,
                "cluster": cluster_name,
                "namespace": namespace,
                "service": pf_info["service"],
                "local_port": pf_info["local_port"],
                "target_port": pf_info["target_port"],
                "access_url": f"http://localhost:{pf_info['local_port']}",
                "started_at": pf_info["started_at"],
                "status": "active",
            },
        )

    except Exception as e:
        logger.error(f"Failed to get port forwarding status for app {app_id}: {str(e)}")

        raise HTTPException(
            status_code=500,
            detail=create_api_response(
                API_STATUS["error"],
                f"Failed to get port forwarding status: {str(e)}",
                error={"error_type": type(e).__name__},
            ),
        )


async def get_application_access_urls(cluster_name: str, namespace: str, app_name: str):
    """
    Detect access URLs for an application by checking services, port forwarding, and standard ports.
    """
    access_urls = []

    try:
        context = f"kind-{cluster_name}"

        # 1. Check for services associated with this application
        service_cmd = f"kubectl get services -n {namespace} --context {context} -o json"
        result = subprocess.run(service_cmd, shell=True, capture_output=True, text=True)

        if result.returncode == 0:
            import json

            services_data = json.loads(result.stdout)

            for service in services_data.get("items", []):
                service_name = service.get("metadata", {}).get("name", "")
                service_spec = service.get("spec", {})

                # Check if this service is related to our app
                if app_name in service_name or service_name in app_name:
                    service_type = service_spec.get("type", "ClusterIP")
                    ports = service_spec.get("ports", [])

                    for port_info in ports:
                        port = port_info.get("port")
                        target_port = port_info.get("targetPort", port)
                        node_port = port_info.get("nodePort")

                        # Generate access URLs based on service type
                        if service_type == "NodePort" and node_port:
                            access_urls.append(
                                {
                                    "type": "NodePort",
                                    "url": f"http://localhost:{node_port}",
                                    "label": f"{service_name} (NodePort)",
                                    "port": node_port,
                                    "service": service_name,
                                }
                            )
                        elif service_type == "LoadBalancer":
                            # For Kind clusters, LoadBalancer typically maps to localhost
                            access_urls.append(
                                {
                                    "type": "LoadBalancer",
                                    "url": f"http://localhost:{port}",
                                    "label": f"{service_name} (LoadBalancer)",
                                    "port": port,
                                    "service": service_name,
                                }
                            )

        # 2. Check for active port forwarding sessions
        port_forward_urls = await detect_port_forwarding(
            cluster_name, namespace, app_name
        )
        access_urls.extend(port_forward_urls)

        # 3. Add standard application URLs based on app type
        standard_urls = get_standard_app_urls(app_name, cluster_name, namespace)
        access_urls.extend(standard_urls)

        # Remove duplicates
        seen_urls = set()
        unique_urls = []
        for url_info in access_urls:
            url_key = url_info["url"]
            if url_key not in seen_urls:
                seen_urls.add(url_key)
                unique_urls.append(url_info)

        logger.info(
            f"Found {len(unique_urls)} access URLs for {app_name}: {[u['url'] for u in unique_urls]}"
        )
        return unique_urls

    except Exception as e:
        logger.error(f"Error detecting access URLs for {app_name}: {str(e)}")
        return []


async def detect_port_forwarding(cluster_name: str, namespace: str, app_name: str):
    """
    Detect active port forwarding sessions for an application.
    """
    port_forward_urls = []

    try:
        # Check for kubectl port-forward processes
        ps_cmd = "ps aux | grep 'kubectl port-forward' | grep -v grep"
        result = subprocess.run(ps_cmd, shell=True, capture_output=True, text=True)

        if result.returncode == 0:
            for line in result.stdout.strip().split("\n"):
                if line and (app_name in line or f"kind-{cluster_name}" in line):
                    # Parse port forwarding info
                    # Example: kubectl port-forward -n default service/airflow-modern 8080:8080
                    if "service/" in line and ":" in line:
                        try:
                            # Extract port mapping (e.g., "8080:8080")
                            parts = line.split()
                            for part in parts:
                                if ":" in part and part.replace(":", "").isdigit():
                                    local_port = part.split(":")[0]
                                    # Check if the port is actually accessible
                                    is_accessible = is_port_accessible(int(local_port))
                                    port_forward_urls.append(
                                        {
                                            "type": "PortForward",
                                            "url": f"http://localhost:{local_port}",
                                            "label": f"{app_name} (Port Forward)",
                                            "port": int(local_port),
                                            "service": app_name,
                                            "status": (
                                                "accessible"
                                                if is_accessible
                                                else "unreachable"
                                            ),
                                        }
                                    )
                                    break
                        except Exception as e:
                            logger.debug(
                                f"Error parsing port forward line: {line}, error: {e}"
                            )

        return port_forward_urls

    except Exception as e:
        logger.error(f"Error detecting port forwarding: {str(e)}")
        return []


def get_standard_app_urls(app_name: str, cluster_name: str, namespace: str):
    """
    Generate standard access URLs based on application type and known patterns.
    """
    standard_urls = []

    # Airflow applications
    if "airflow" in app_name.lower():
        if "webserver" in app_name or app_name == "airflow" or "modern" in app_name:
            # Check common Airflow ports
            common_ports = [8080, 8081, 8082]
            for port in common_ports:
                if is_port_accessible(port):
                    standard_urls.append(
                        {
                            "type": "Standard",
                            "url": f"http://localhost:{port}",
                            "label": f"Airflow Web UI (Port {port})",
                            "port": port,
                            "service": app_name,
                        }
                    )
                    break  # Only add the first accessible port

    # Add more application types as needed
    elif "grafana" in app_name.lower():
        if is_port_accessible(3000):
            standard_urls.append(
                {
                    "type": "Standard",
                    "url": "http://localhost:3000",
                    "label": "Grafana Dashboard",
                    "port": 3000,
                    "service": app_name,
                }
            )

    elif "prometheus" in app_name.lower():
        if is_port_accessible(9090):
            standard_urls.append(
                {
                    "type": "Standard",
                    "url": "http://localhost:9090",
                    "label": "Prometheus UI",
                    "port": 9090,
                    "service": app_name,
                }
            )

    return standard_urls


def is_port_accessible(port: int) -> bool:
    """
    Check if a port is accessible on localhost.
    """
    try:
        import socket

        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex(("localhost", port))
        sock.close()
        return result == 0
    except Exception:
        return False


async def get_real_kubernetes_applications():
    """
    Query all Kind clusters for real deployed applications.
    Returns a list of applications found in Kubernetes clusters.
    """
    applications = []

    try:
        # Get list of Kind clusters
        result = subprocess.run(
            ["kind", "get", "clusters"], capture_output=True, text=True
        )
        if result.returncode != 0:
            logger.warning("No Kind clusters found")
            return applications

        clusters = result.stdout.strip().split("\n") if result.stdout.strip() else []
        logger.info(f"Found {len(clusters)} Kind clusters: {clusters}")

        for cluster in clusters:
            if not cluster.strip():
                continue

            context = f"kind-{cluster}"
            logger.info(f"Querying cluster: {cluster} (context: {context})")

            # Get all namespaces
            cmd = f"kubectl get namespaces --context {context} -o json"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

            if result.returncode != 0:
                logger.warning(f"Failed to get namespaces for cluster {cluster}")
                continue

            import json

            namespaces_data = json.loads(result.stdout)
            namespaces = [
                ns["metadata"]["name"] for ns in namespaces_data.get("items", [])
            ]

            # Filter out system namespaces but include default
            user_namespaces = [
                ns
                for ns in namespaces
                if not ns.startswith(("kube-", "local-path-storage")) or ns == "default"
            ]
            logger.info(f"Found user namespaces in {cluster}: {user_namespaces}")

            for namespace in user_namespaces:
                # Get deployments in this namespace
                cmd = f"kubectl get deployments -n {namespace} --context {context} -o json"
                result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

                if result.returncode != 0:
                    continue

                deployments_data = json.loads(result.stdout)

                for deployment in deployments_data.get("items", []):
                    metadata = deployment.get("metadata", {})
                    spec = deployment.get("spec", {})
                    status = deployment.get("status", {})

                    app_name = metadata.get("name", "unknown")

                    # Skip system deployments
                    if app_name.startswith(("coredns", "local-path-provisioner")):
                        continue

                    # Get access URLs for this application
                    access_urls = await get_application_access_urls(
                        cluster, namespace, app_name
                    )

                    app = {
                        "name": app_name,
                        "display_name": app_name.replace("-", " ").title(),
                        "app_name": app_name,  # Add app_name field for consistency
                        "cluster": cluster,
                        "namespace": namespace,
                        "replicas": spec.get("replicas", 0),
                        "ready_replicas": status.get("readyReplicas", 0),
                        "available_replicas": status.get("availableReplicas", 0),
                        "version": metadata.get("labels", {}).get("version", "unknown"),
                        "status": (
                            "Running"
                            if status.get("readyReplicas", 0) > 0
                            else "Stopped"
                        ),
                        "pods": [],
                        "services": [],
                        "access_urls": access_urls,
                    }

                    applications.append(app)
                    logger.info(
                        f"Found real application: {app_name} in {namespace}@{cluster}"
                    )

        logger.info(f"Found {len(applications)} real applications across all clusters")
        return applications

    except Exception as e:
        logger.error(f"Error querying real Kubernetes applications: {str(e)}")
        return applications


def get_system_components():
    """Get system components from all Kind clusters."""
    system_apps = []

    try:
        # Get all Kind clusters
        import subprocess

        result = subprocess.run(
            ["kind", "get", "clusters"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        if result.returncode != 0:
            logger.error(f"Failed to get clusters: {result.stderr}")
            return system_apps

        clusters = [
            line.strip() for line in result.stdout.strip().split("\n") if line.strip()
        ]

        for cluster in clusters:
            try:
                # Get deployments from system namespaces
                system_namespaces = [
                    "kube-system",
                    "local-path-storage",
                    "ingress-nginx",
                    "cert-manager",
                ]

                for namespace in system_namespaces:
                    cmd = f"kubectl get deployments -n {namespace} --context kind-{cluster} -o json"
                    result = subprocess.run(
                        cmd, shell=True, capture_output=True, text=True
                    )

                    if result.returncode == 0:
                        import json

                        deployments_data = json.loads(result.stdout)

                        for deployment in deployments_data.get("items", []):
                            name = deployment.get("metadata", {}).get("name", "")
                            if name:
                                # Create a unique ID for system components
                                app_id = f"system-{cluster}-{namespace}-{name}"

                                system_app = {
                                    "id": app_id,
                                    "name": name.title(),
                                    "app_name": name,
                                    "status": "Running",  # Assume running if deployment exists
                                    "version": "system",
                                    "cluster": cluster,
                                    "namespace": namespace,
                                    "deployment_method": "system",
                                    "is_demo": False,
                                    "access_urls": [],
                                }

                                system_apps.append(system_app)
                                logger.debug(
                                    f"Added system component: {name} in {namespace}@{cluster}"
                                )

            except Exception as e:
                logger.error(
                    f"Error getting system components from cluster {cluster}: {str(e)}"
                )
                continue

    except Exception as e:
        logger.error(f"Error getting system components: {str(e)}")

    return system_apps


@app.get("/api/apps/list")
async def list_applications(include_system_components: bool = False):
    """
    List all applications deployed to clusters.

    Parameters:
    - include_system_components: If True, includes system components like coredns, local-path-provisioner, etc.

    Returns information about all real applications from Kubernetes clusters.
    """
    logger.info(
        f"Listing applications based on completed deployment tasks (include_system_components={include_system_components})"
    )
    try:
        # Debug: Log keys to understand what we're working with
        task_keys = list(TASK_STATUSES.keys())
        logger.info(
            f"TASK_STATUSES has {len(task_keys)} tasks with keys: {task_keys[:10] if task_keys else 'EMPTY!'}"
        )

        # If TASK_STATUSES is empty or doesn't contain viable applications, we may need to add sample tasks
        # Check if we need demo apps by scanning for active (non-deleted) deployment tasks
        active_apps = []
        for tid, task in TASK_STATUSES.items():
            if (
                task.get("type") == "deploy_application"
                and task.get("status") == "completed"
                and not task.get("deleted", False)
            ):

                config = task.get("config", {})
                app_name = config.get("app_name")
                cluster_name = config.get("cluster_name")
                if app_name and cluster_name:
                    active_apps.append((app_name, cluster_name))

        # Always query real Kubernetes deployments for live data
        logger.info("Querying Kubernetes clusters for real deployments.")
        real_apps = await get_real_kubernetes_applications()

        # Clear old task-based applications and use only real data
        TASK_STATUSES.clear()

        # Convert real apps to task format for consistency
        for app in real_apps:
            sample_task_id = str(uuid.uuid4())
            real_task = {
                "type": "deploy_application",
                "status": "completed",
                "config": {
                    "app_name": app["app_name"],  # Use app_name field
                    "display_name": app["display_name"],
                    "cluster_name": app["cluster"],
                    "namespace": app["namespace"],
                    "deployment_method": "kubectl",
                    "app_version": app.get("version", "unknown"),
                    "is_demo": False,  # Mark as real application
                },
                "result": {
                    "deployment_status": {
                        "app": app["app_name"],  # Use app_name field
                        "namespace": app["namespace"],
                        "pods": app.get("pods", []),
                        "services": app.get("services", []),
                        "access_urls": app.get("access_urls", []),
                    }
                },
            }
            TASK_STATUSES[sample_task_id] = real_task
            logger.info(
                f"Added real application: {app['app_name']} from cluster {app['cluster']}"
            )

        # Extract application data from tasks
        applications = []
        for task_id, task in TASK_STATUSES.items():
            if (
                task.get("type") == "deploy_application"
                and task.get("status") == "completed"
            ):
                config = task.get("config", {})
                result = task.get("result", {})

                # Extract deployment status
                deployment_status = result.get("deployment_status", {})
                access_urls = deployment_status.get("access_urls", [])

                # Create application entry
                app = {
                    "id": task_id,
                    "name": config.get("app_name", "Unknown"),
                    "display_name": config.get(
                        "display_name",
                        config.get("app_name", "Unknown").replace("-", " ").title(),
                    ),
                    "app_name": config.get("app_name", "Unknown"),
                    "status": "Running",  # Default status
                    "version": config.get("app_version", "latest"),
                    "cluster": config.get("cluster_name", "Unknown"),
                    "namespace": config.get("namespace", "default"),
                    "deployment_method": config.get("deployment_method", "kubectl"),
                    "is_demo": config.get("is_demo", False),
                    "access_urls": access_urls,
                }

                applications.append(app)

        # Add system components if requested
        if include_system_components:
            logger.info(
                f"include_system_components=True, calling get_system_components()"
            )
            system_apps = get_system_components()
            logger.info(
                f"get_system_components() returned {len(system_apps)} system components"
            )
            applications.extend(system_apps)
            logger.info(f"Added {len(system_apps)} system components")

        return create_api_response(
            "success", f"Found {len(applications)} applications", data=applications
        )
    except Exception as e:
        logger.error(f"Failed to list applications: {str(e)}")
        logger.error(f"Stack trace: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=create_api_response(
                "error", f"Failed to list applications: {str(e)}"
            ),
        )


def get_applications():
    try:
        applications = []
        # Use a copy of keys
        task_ids = list(TASK_STATUSES.keys())
        for task_id in task_ids:
            task_status = TASK_STATUSES.get(task_id)

            if not task_status:
                continue  # Skip if task somehow disappeared

            logger.debug(
                f"Processing task {task_id}: {task_status.get('status')}, type: {task_status.get('type')}"
            )

            # Check if this is a COMPLETED deployment task
            # AND that it hasn't been marked as deleted by a subsequent task
            if (
                task_status.get("type") == "deploy_application"
                and task_status.get("status") == "completed"
                and not task_status.get("deleted", False)
            ):  # Check for a 'deleted' flag

                config = task_status.get("config", {})
                result = task_status.get(
                    "result", {}
                )  # Deployment result might have useful info too

                app_name = config.get("app_name")
                if not app_name:
                    logger.warning(
                        f"Task {task_id} (deploy_application) is completed but missing app_name in config. Skipping."
                    )
                    continue

                cluster_name = config.get("cluster_name")
                namespace = config.get("namespace", "default")
                deployment_method = config.get("deployment_method", "kubectl")
                app_version = config.get(
                    "app_version", "N/A"
                )  # Use N/A if not specified
                deployment_status_details = result.get(
                    "deployment_status", {}
                )  # Get detailed status if available
                metadata = result.get("metadata", {})  # Get metadata if available

                # Ensure deployment_status is a dictionary
                if deployment_status_details is None:
                    deployment_status_details = {}

                # Basic display name generation
                display_name = metadata.get(
                    "display_name", app_name.replace("-", " ").title()
                )
                description = metadata.get("description", f"{display_name} Application")
                icon = metadata.get("icon", "")

                application = {
                    "id": task_id,  # Use task_id (string UUID) as the unique ID
                    "name": app_name,
                    "display_name": display_name,
                    "description": description,
                    "icon": icon,
                    "status": "Running",  # Assume running if deployment task completed (could query kube later)
                    "version": app_version,
                    "cluster": cluster_name,
                    "namespace": namespace,
                    "deployment_method": deployment_method,
                    "deployment_status": deployment_status_details,
                    "metadata": metadata,
                }
                applications.append(application)
                logger.debug(
                    f"Added application to list: {application['name']} (ID: {task_id})"
                )

        logger.info(f"Found {len(applications)} active applications from task history.")
        # Consider adding direct Kubernetes query here for more accuracy
        return applications
    except Exception as e:
        logger.error(f"Failed to list applications: {str(e)}")
        logger.error(f"Stack trace: {traceback.format_exc()}")
        return []  # Return empty list on error


@app.delete("/api/apps/{task_id}")
async def delete_application(
    task_id: str,
    appName: str = None,  # Optional query parameter - app name from frontend
    clusterName: str = None,  # Optional query parameter - cluster name from frontend
):
    # Enhanced logging to debug the ID issue
    logger.info(
        f"Received delete request - ID: '{task_id}', appName: '{appName}', clusterName: '{clusterName}'"
    )

    # Find by query parameters first if provided (most reliable method)
    if appName and clusterName:
        logger.info(
            f"Attempting to find application by name '{appName}' in cluster '{clusterName}'"
        )

        # Try to find the application by name and cluster
        matching_task_id = None
        for tid, task in TASK_STATUSES.items():
            if (
                task.get("type") == "deploy_application"
                and task.get("status") == "completed"
                and not task.get("deleted", False)
            ):

                config = task.get("config", {})
                if (
                    config.get("app_name") == appName
                    and config.get("cluster_name") == clusterName
                ):

                    matching_task_id = tid
                    logger.info(
                        f"Found matching task for app '{appName}' in cluster '{clusterName}': {matching_task_id}"
                    )
                    break

        if matching_task_id:
            # Use the found task_id instead of the one provided in the URL
            task_id = matching_task_id
            logger.info(
                f"Using found task_id: {task_id} for app '{appName}' in cluster '{clusterName}'"
            )

    # If no match by name/cluster or these weren't provided, try by ID
    # Handle numeric IDs for backward compatibility
    elif task_id.isdigit():
        logger.warning(
            f"Received numeric ID: {task_id}. Attempting to find matching task..."
        )

        # Temporary counter to simulate old behavior
        numeric_id = int(task_id)
        counter = 1
        matching_task_id = None

        # Find task that would have had this numeric ID
        for tid, task in TASK_STATUSES.items():
            if (
                task.get("type") == "deploy_application"
                and task.get("status") == "completed"
                and not task.get("deleted", False)
            ):

                if counter == numeric_id:
                    matching_task_id = tid
                    break
                counter += 1

        if matching_task_id:
            logger.info(
                f"Found matching task for numeric ID {task_id}: {matching_task_id}"
            )
            task_id = matching_task_id
        else:
            # If not found by ID and no app name/cluster provided, return error
            logger.error(f"No task found matching numeric ID {task_id}")
            raise HTTPException(
                status_code=404,
                detail=f"Application with ID {task_id} not found. Consider using appName and clusterName parameters.",
            )

    # At this point we should have a valid task_id (either original, found by name/cluster, or mapped from numeric ID)
    # Now look up the task by the final task_id
    deployment_task = TASK_STATUSES.get(task_id)

    # Final validation
    if not deployment_task:
        logger.error(f"No task found with ID '{task_id}' after all resolution attempts")
        raise HTTPException(
            status_code=404, detail=f"Application with ID '{task_id}' not found"
        )

    if deployment_task.get("type") != "deploy_application":
        logger.error(
            f"Task with ID '{task_id}' is not a deployment task (type: {deployment_task.get('type')})"
        )
        raise HTTPException(
            status_code=400,
            detail=f"ID '{task_id}' does not correspond to a deployment task",
        )

    if deployment_task.get("deleted", False):
        logger.warning(f"Application with ID '{task_id}' is already marked as deleted")
        return {"message": f"Application already deleted"}

    # Extract app details from the found task
    config = deployment_task.get("config", {})
    app_name = config.get("app_name")
    cluster_name = config.get("cluster_name")
    namespace = config.get("namespace", "default")

    logger.info(
        f"Deleting Kubernetes resources for '{app_name}' in namespace '{namespace}' on cluster '{cluster_name}'"
    )

    try:
        # Actually delete the Kubernetes resources
        context = f"kind-{cluster_name}"

        # Determine the correct label selector based on the app
        if app_name == "airflow":
            # For Airflow, delete all components
            label_selector = "app=airflow"
        elif app_name.startswith("airflow-"):
            # For individual Airflow components, use both app and component labels
            component = app_name.replace("airflow-", "")
            label_selector = f"app=airflow,component={component}"
        else:
            # For other apps, use the app name as label
            label_selector = f"app={app_name}"

        logger.info(f"Using label selector: {label_selector}")

        # Delete all resources with the appropriate label selector
        delete_commands = [
            f"kubectl delete deployment,statefulset,daemonset -l {label_selector} -n {namespace} --context {context} --ignore-not-found=true",
            f"kubectl delete service -l {label_selector} -n {namespace} --context {context} --ignore-not-found=true",
            f"kubectl delete configmap -l {label_selector} -n {namespace} --context {context} --ignore-not-found=true",
            f"kubectl delete secret -l {label_selector} -n {namespace} --context {context} --ignore-not-found=true",
            f"kubectl delete pvc -l {label_selector} -n {namespace} --context {context} --ignore-not-found=true",
            f"kubectl delete ingress -l {label_selector} -n {namespace} --context {context} --ignore-not-found=true",
        ]

        deleted_resources = []
        for cmd in delete_commands:
            try:
                result = subprocess.run(
                    cmd, shell=True, capture_output=True, text=True, timeout=30
                )
                if result.returncode == 0 and result.stdout.strip():
                    deleted_resources.append(result.stdout.strip())
                    logger.info(f"Deleted resources: {result.stdout.strip()}")
                elif result.stderr and "not found" not in result.stderr.lower():
                    logger.warning(f"Delete command warning: {result.stderr.strip()}")
            except subprocess.TimeoutExpired:
                logger.warning(f"Delete command timed out: {cmd}")
            except Exception as e:
                logger.warning(f"Delete command failed: {cmd}, error: {str(e)}")

        # Mark as deleted in task store
        deployment_task["deleted"] = True
        deployment_task["status"] = "deleted"
        deployment_task["deleted_resources"] = deleted_resources
        logger.info(
            f"SUCCESS: Deleted application '{app_name}' and marked as deleted in task store"
        )

        # Check if this is a demo app and add to the do-not-regenerate list if it is
        is_demo = config.get("is_demo", False)
        if is_demo:
            app_key = (app_name, cluster_name)
            DELETED_DEMO_APPS.add(app_key)
            logger.info(
                f"Added demo app {app_key} to DELETED_DEMO_APPS list - will not be regenerated"
            )

        # Return success with details of what was deleted
        return {
            "message": f"Application '{app_name}' deleted successfully",
            "deleted_resources": deleted_resources,
            "namespace": namespace,
            "cluster": cluster_name,
        }

    except Exception as e:
        logger.error(
            f"Failed to delete Kubernetes resources for '{app_name}': {str(e)}"
        )
        # Still mark as deleted in task store even if Kubernetes deletion failed
        deployment_task["deleted"] = True
        deployment_task["status"] = "deleted"
        return {
            "message": f"Application '{app_name}' marked as deleted (some Kubernetes resources may still exist)",
            "error": str(e),
            "namespace": namespace,
            "cluster": cluster_name,
        }


@app.post("/api/apps/{app_id}/action")
async def manage_application(app_id: str, action_request: ApplicationAction):
    """
    Manage application lifecycle (start, stop, restart).
    Supports both task-based applications and real applications discovered from Kubernetes.
    """
    logger.info(f"Managing application {app_id} with action: {action_request.action}")

    try:
        # First try to get task details (for task-based applications)
        task = task_store.get_task(app_id)
        cluster_name = action_request.cluster_name
        namespace = action_request.namespace

        if task:
            # Task-based application
            config = task.get("config", {})
            app_name = config.get("app_name", "unknown")
            logger.info(f"Found task-based application: {app_name}")
        else:
            # Real application discovered from Kubernetes
            logger.info(f"Task not found for {app_id}, treating as real application")

            # Try to get deployments in the namespace
            cmd = f"kubectl get deployments -n {namespace} --context kind-{cluster_name} -o jsonpath='{{.items[*].metadata.name}}'"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

            if result.returncode == 0 and result.stdout.strip():
                deployments = result.stdout.strip().split()
                logger.info(f"Found deployments in {namespace}: {deployments}")

                # Use first deployment for real applications
                if deployments:
                    app_name = deployments[0]
                else:
                    app_name = "unknown"
            else:
                app_name = "unknown"

            logger.info(f"Using app_name: {app_name} for real application")

        # Execute the action based on type
        if action_request.action == "stop":
            # Scale deployment to 0 replicas
            cmd = f"kubectl scale deployment {app_name} --replicas=0 -n {namespace} --context kind-{cluster_name}"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

            if result.returncode == 0:
                # Update task status if it's a task-based application
                if task:
                    task["status"] = "stopped"
                    task_store.save_task(app_id, task)
                return create_api_response(
                    "success", f"Application {app_name} stopped successfully"
                )
            else:
                raise Exception(f"Failed to stop application: {result.stderr}")

        elif action_request.action == "start":
            # Scale deployment to 1 replica (or original replica count for task-based apps)
            if task:
                config = task.get("config", {})
                replicas = config.get("replicas", 1)
            else:
                replicas = 1  # Default for real applications

            cmd = f"kubectl scale deployment {app_name} --replicas={replicas} -n {namespace} --context kind-{cluster_name}"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

            if result.returncode == 0:
                # Update task status if it's a task-based application
                if task:
                    task["status"] = "running"
                    task_store.save_task(app_id, task)
                return create_api_response(
                    "success", f"Application {app_name} started successfully"
                )
            else:
                raise Exception(f"Failed to start application: {result.stderr}")

        elif action_request.action == "restart":
            # Restart deployment
            cmd = f"kubectl rollout restart deployment {app_name} -n {namespace} --context kind-{cluster_name}"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

            if result.returncode == 0:
                return create_api_response(
                    "success", f"Application {app_name} restarted successfully"
                )
            else:
                raise Exception(f"Failed to restart application: {result.stderr}")
        else:
            raise HTTPException(
                status_code=400, detail=f"Unknown action: {action_request.action}"
            )

    except Exception as e:
        logger.error(f"Failed to manage application {app_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/apps/{app_id}/scale")
async def scale_application(app_id: str, scale_request: ApplicationScale):
    """
    Scale application replicas.
    Supports both task-based applications and real applications discovered from Kubernetes.
    """
    logger.info(f"Scaling application {app_id} to {scale_request.replicas} replicas")

    try:
        # First try to get task details (for task-based applications)
        task = task_store.get_task(app_id)
        cluster_name = scale_request.cluster_name
        namespace = scale_request.namespace

        if task:
            # Task-based application
            config = task.get("config", {})
            app_name = config.get("app_name", "unknown")
            logger.info(f"Found task-based application: {app_name}")
        else:
            # Real application discovered from Kubernetes
            logger.info(f"Task not found for {app_id}, treating as real application")

            # Try to get deployments in the namespace
            cmd = f"kubectl get deployments -n {namespace} --context kind-{cluster_name} -o jsonpath='{{.items[*].metadata.name}}'"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

            if result.returncode == 0 and result.stdout.strip():
                deployments = result.stdout.strip().split()
                logger.info(f"Found deployments in {namespace}: {deployments}")

                # Use first deployment for real applications
                if deployments:
                    app_name = deployments[0]
                else:
                    app_name = "unknown"
            else:
                app_name = "unknown"

            logger.info(f"Using app_name: {app_name} for real application")

        # Scale the deployment
        cmd = f"kubectl scale deployment {app_name} --replicas={scale_request.replicas} -n {namespace} --context kind-{cluster_name}"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

        if result.returncode == 0:
            # Update task config with new replica count if it's a task-based application
            if task:
                config = task.get("config", {})
                config["replicas"] = scale_request.replicas
                task["config"] = config
                task_store.save_task(app_id, task)

            return create_api_response(
                "success",
                f"Application {app_name} scaled to {scale_request.replicas} replicas",
            )
        else:
            raise Exception(f"Failed to scale application: {result.stderr}")

    except Exception as e:
        logger.error(f"Failed to scale application {app_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/apps/{app_id}/details")
async def get_application_details(
    app_id: str, cluster_name: str, namespace: str = "default", app_name: str = None
):
    """
    Get detailed information about a deployed application.
    Supports both task-based applications and real applications discovered from Kubernetes.
    """
    logger.info(f"Getting details for application {app_id}")

    try:
        # First try to get task details (for task-based applications)
        task = task_store.get_task(app_id)

        if task:
            # Task-based application
            config = task.get("config", {})
            app_name = config.get("app_name", "unknown")
            logger.info(f"Found task-based application: {app_name}")
        else:
            # Real application discovered from Kubernetes
            logger.info(f"Task not found for {app_id}, treating as real application")

            # Try to get deployments in the namespace
            cmd = f"kubectl get deployments -n {namespace} --context kind-{cluster_name} -o jsonpath='{{.items[*].metadata.name}}'"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

            if result.returncode == 0 and result.stdout.strip():
                deployments = result.stdout.strip().split()
                logger.info(f"Found deployments in {namespace}: {deployments}")

                # Use provided app_name or first deployment
                if app_name:
                    app_name = app_name
                elif deployments:
                    app_name = deployments[0]
                else:
                    app_name = "unknown"
            else:
                app_name = app_name or "unknown"

            logger.info(f"Using app_name: {app_name} for real application")

        # Get deployment status
        cmd = f"kubectl get deployment {app_name} -n {namespace} --context kind-{cluster_name} -o json"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

        deployment_info = {}
        if result.returncode == 0:
            import json

            deployment_data = json.loads(result.stdout)
            deployment_info = {
                "name": deployment_data.get("metadata", {}).get("name", app_name),
                "namespace": deployment_data.get("metadata", {}).get(
                    "namespace", namespace
                ),
                "replicas": deployment_data.get("spec", {}).get("replicas", 0),
                "ready_replicas": deployment_data.get("status", {}).get(
                    "readyReplicas", 0
                ),
                "available_replicas": deployment_data.get("status", {}).get(
                    "availableReplicas", 0
                ),
                "conditions": deployment_data.get("status", {}).get("conditions", []),
            }

        # Get pods
        cmd = f"kubectl get pods -l app={app_name} -n {namespace} --context kind-{cluster_name} -o json"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

        pods_info = []
        if result.returncode == 0:
            import json

            pods_data = json.loads(result.stdout)
            for pod in pods_data.get("items", []):
                pod_info = {
                    "name": pod.get("metadata", {}).get("name", ""),
                    "phase": pod.get("status", {}).get("phase", "Unknown"),
                    "ready": all(
                        condition.get("status") == "True"
                        for condition in pod.get("status", {}).get("conditions", [])
                        if condition.get("type") == "Ready"
                    ),
                    "restart_count": sum(
                        container.get("restartCount", 0)
                        for container in pod.get("status", {}).get(
                            "containerStatuses", []
                        )
                    ),
                    "created": pod.get("metadata", {}).get("creationTimestamp", ""),
                }
                pods_info.append(pod_info)

        # Get services
        cmd = f"kubectl get services -l app={app_name} -n {namespace} --context kind-{cluster_name} -o json"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

        services_info = []
        if result.returncode == 0:
            import json

            services_data = json.loads(result.stdout)
            for service in services_data.get("items", []):
                service_info = {
                    "name": service.get("metadata", {}).get("name", ""),
                    "type": service.get("spec", {}).get("type", "ClusterIP"),
                    "cluster_ip": service.get("spec", {}).get("clusterIP", ""),
                    "ports": service.get("spec", {}).get("ports", []),
                }
                services_info.append(service_info)

        # Get secrets (for database credentials)
        cmd = f"kubectl get secrets -l app={app_name} -n {namespace} --context kind-{cluster_name} -o json"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

        secrets_info = []
        if result.returncode == 0:
            import json

            secrets_data = json.loads(result.stdout)
            for secret in secrets_data.get("items", []):
                secret_info = {
                    "name": secret.get("metadata", {}).get("name", ""),
                    "type": secret.get("type", ""),
                    "data_keys": (
                        list(secret.get("data", {}).keys())
                        if secret.get("data")
                        else []
                    ),
                }
                secrets_info.append(secret_info)

        # Generate access information
        access_info = {
            "port_forward_commands": [],
            "connection_info": {},
            "service_urls": [],
        }

        # Add port-forward commands for services
        for service in services_info:
            for port in service.get("ports", []):
                port_number = port.get("port", 0)
                target_port = port.get("targetPort", port_number)
                port_name = port.get("name", "")

                # Use a different local port to avoid conflicts
                local_port = (
                    port_number + 1000 if port_number < 9000 else port_number + 100
                )

                cmd = f"kubectl port-forward service/{service['name']} {local_port}:{port_number} -n {namespace} --context kind-{cluster_name}"
                access_info["port_forward_commands"].append(
                    {
                        "service": service["name"],
                        "port_name": port_name or f"port-{port_number}",
                        "local_port": local_port,
                        "service_port": port_number,
                        "command": cmd,
                        "access_url": f"http://localhost:{local_port}",
                    }
                )

        # Add specific connection info for known applications
        if app_name.lower() in ["postgresql", "postgres"]:
            # Try to get password from secret
            password = "postgres123"  # default
            username = "postgres"
            database = "mydb"

            for secret in secrets_info:
                if "password" in secret.get("data_keys", []):
                    # Note: In real implementation, you'd decode the base64 secret
                    # For now, we'll use the default password
                    break

            access_info["connection_info"] = {
                "type": "PostgreSQL Database",
                "host": "localhost",
                "port": 5433,  # port-forwarded port
                "database": database,
                "username": username,
                "password": password,
                "connection_string": f"postgresql://{username}:{password}@localhost:5433/{database}",
                "psql_command": f"psql -h localhost -p 5433 -U {username} -d {database}",
                "notes": [
                    "Run the port-forward command first to access the database",
                    "Default credentials are used for this deployment",
                    "Use any PostgreSQL client with the connection details above",
                ],
            }

        return create_api_response(
            "success",
            "Application details retrieved",
            data={
                "task": task if task else None,
                "deployment": deployment_info,
                "pods": pods_info,
                "services": services_info,
                "secrets": secrets_info,
                "access_info": access_info,
                "app_name": app_name,
                "namespace": namespace,
                "cluster": cluster_name,
            },
        )

    except Exception as e:
        logger.error(f"Failed to get application details {app_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/apps/{app_id}/logs")
async def get_application_logs(
    app_id: str,
    cluster_name: str,
    namespace: str = "default",
    lines: int = 100,
    app_name: str = None,
):
    """
    Get logs for a deployed application.
    Supports both task-based applications and real applications discovered from Kubernetes.
    """
    logger.info(f"Getting logs for application {app_id}")

    try:
        # First try to get task details (for task-based applications)
        task = task_store.get_task(app_id)

        if task:
            # Task-based application
            config = task.get("config", {})
            app_name = config.get("app_name", "unknown")
            logger.info(f"Found task-based application: {app_name}")
        else:
            # Real application discovered from Kubernetes
            # For real applications, we need to derive the app name from the deployment
            # Let's try to find deployments in the namespace and match by name patterns
            logger.info(f"Task not found for {app_id}, treating as real application")

            # Try to get deployments in the namespace
            cmd = f"kubectl get deployments -n {namespace} --context kind-{cluster_name} -o jsonpath='{{.items[*].metadata.name}}'"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

            if result.returncode == 0 and result.stdout.strip():
                deployments = result.stdout.strip().split()
                logger.info(f"Found deployments in {namespace}: {deployments}")

                # For now, use the first deployment or the provided app_name
                if app_name:
                    app_name = app_name
                elif deployments:
                    app_name = deployments[0]  # Use first deployment
                else:
                    app_name = "unknown"
            else:
                app_name = app_name or "unknown"

            logger.info(f"Using app_name: {app_name} for real application")

        # Get logs from all pods with the app label
        cmd = f"kubectl logs -l app={app_name} -n {namespace} --context kind-{cluster_name} --tail={lines}"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

        if result.returncode == 0:
            return create_api_response(
                "success",
                "Application logs retrieved",
                data={
                    "logs": result.stdout,
                    "app_name": app_name,
                    "namespace": namespace,
                    "cluster": cluster_name,
                },
            )
        else:
            # Try alternative approaches for getting logs
            # Try getting logs from deployment name
            cmd_alt = f"kubectl logs deployment/{app_name} -n {namespace} --context kind-{cluster_name} --tail={lines}"
            result_alt = subprocess.run(
                cmd_alt, shell=True, capture_output=True, text=True
            )

            if result_alt.returncode == 0:
                return create_api_response(
                    "success",
                    "Application logs retrieved",
                    data={
                        "logs": result_alt.stdout,
                        "app_name": app_name,
                        "namespace": namespace,
                        "cluster": cluster_name,
                    },
                )
            else:
                return create_api_response(
                    "warning",
                    "No logs available or application not found",
                    data={
                        "logs": result.stderr
                        or result_alt.stderr
                        or "No logs available",
                        "app_name": app_name,
                        "namespace": namespace,
                        "cluster": cluster_name,
                    },
                )

    except Exception as e:
        logger.error(f"Failed to get application logs {app_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/apps/{app_id}/metrics")
async def get_application_metrics(
    app_id: str, cluster_name: str, namespace: str = "default", app_name: str = None
):
    """
    Get resource metrics for a deployed application.
    Supports both task-based applications and real applications discovered from Kubernetes.
    """
    logger.info(f"Getting metrics for application {app_id}")

    try:
        # First try to get task details (for task-based applications)
        task = task_store.get_task(app_id)

        if task:
            # Task-based application
            config = task.get("config", {})
            app_name = config.get("app_name", "unknown")
            logger.info(f"Found task-based application: {app_name}")
        else:
            # Real application discovered from Kubernetes
            logger.info(f"Task not found for {app_id}, treating as real application")

            # Try to get deployments in the namespace
            cmd = f"kubectl get deployments -n {namespace} --context kind-{cluster_name} -o jsonpath='{{.items[*].metadata.name}}'"
            result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

            if result.returncode == 0 and result.stdout.strip():
                deployments = result.stdout.strip().split()
                logger.info(f"Found deployments in {namespace}: {deployments}")

                # Use provided app_name or first deployment
                if app_name:
                    app_name = app_name
                elif deployments:
                    app_name = deployments[0]
                else:
                    app_name = "unknown"
            else:
                app_name = app_name or "unknown"

            logger.info(f"Using app_name: {app_name} for real application")

        # Try to get metrics using kubectl top
        cmd = f"kubectl top pods -l app={app_name} -n {namespace} --context kind-{cluster_name} --no-headers"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

        metrics = []
        if result.returncode == 0 and result.stdout.strip():
            lines = result.stdout.strip().split("\n")
            for line in lines:
                parts = line.split()
                if len(parts) >= 3:
                    metrics.append(
                        {"pod_name": parts[0], "cpu": parts[1], "memory": parts[2]}
                    )

        # Get resource requests and limits
        cmd = f"kubectl get deployment {app_name} -n {namespace} --context kind-{cluster_name} -o json"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)

        resource_info = {}
        if result.returncode == 0:
            import json

            deployment_data = json.loads(result.stdout)
            containers = (
                deployment_data.get("spec", {})
                .get("template", {})
                .get("spec", {})
                .get("containers", [])
            )
            if containers:
                resources = containers[0].get("resources", {})
                resource_info = {
                    "requests": resources.get("requests", {}),
                    "limits": resources.get("limits", {}),
                }

        return create_api_response(
            "success",
            "Application metrics retrieved",
            data={
                "metrics": metrics,
                "resources": resource_info,
                "app_name": app_name,
                "namespace": namespace,
                "cluster": cluster_name,
            },
        )

    except Exception as e:
        logger.error(f"Failed to get application metrics {app_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/test/apps/{name}")  # Changed from GET to DELETE
async def test_delete(name: str):
    # This endpoint seems unrelated to the main app logic, leaving as is for now
    # Might need adjustment if it interacts with TASK_STATUSES
    logger.info(f"Test deleting {name}")
    return {"message": f"{name} test deleted"}


@app.get("/api/test/task-statuses")
async def get_task_statuses():
    try:
        # Convert TASK_STATUSES to a JSON-serializable format
        task_statuses_serializable = {}
        for task_id, status in TASK_STATUSES.items():
            task_statuses_serializable[task_id] = {
                "status": status.get("status"),
                "message": status.get("message"),
                "completed": status.get("completed"),
                "progress": status.get("progress"),
                "has_result": "result" in status,
            }

        return {"task_count": len(TASK_STATUSES), "tasks": task_statuses_serializable}
    except Exception as e:
        logger.error(f"Failed to get task statuses: {str(e)}")
        logger.error(f"Stack trace: {traceback.format_exc()}")
        return {"error": str(e)}


@app.get("/api/test/add-sample-app/{cluster_name}")
async def add_sample_app(cluster_name: str):
    try:
        # Create a unique task ID
        task_id = str(uuid.uuid4())

        # Sample application data
        app_name = "airflow"
        namespace = "airflow"

        # Create sample deployment status
        deployment_status = {
            "app": app_name,
            "namespace": namespace,
            "pods": [
                {
                    "name": f"{app_name}-webserver",
                    "phase": "Running",
                    "ready": True,
                    "containers": [
                        {
                            "name": "webserver",
                            "image": "apache/airflow:2.6.0",
                            "ready": True,
                            "state": "running",
                        }
                    ],
                },
                {
                    "name": f"{app_name}-scheduler",
                    "phase": "Running",
                    "ready": True,
                    "containers": [
                        {
                            "name": "scheduler",
                            "image": "apache/airflow:2.6.0",
                            "ready": True,
                            "state": "running",
                        }
                    ],
                },
            ],
            "services": [
                {
                    "name": f"{app_name}-webserver",
                    "type": "ClusterIP",
                    "cluster_ip": "10.96.0.10",
                    "external_ip": "",
                    "ports": [{"name": "http", "port": 8080, "target_port": 8080}],
                }
            ],
            "ingresses": [{"name": f"{app_name}-ingress", "hosts": ["airflow.local"]}],
            "access_urls": [{"type": "ingress", "url": "http://airflow.local"}],
            "app_info": {"admin_user": "admin", "admin_password": "admin"},
        }

        # Create sample metadata
        metadata = {
            "display_name": "Apache Airflow",
            "description": "Apache Airflow is an open-source platform for developing, scheduling, and monitoring batch-oriented workflows.",
            "version": "2.6.0",
            "icon": "https://airflow.apache.org/docs/apache-airflow/stable/_images/pin_large.png",
            "category": "Data Processing",
        }

        # Create sample result
        result = {
            "status": "success",
            "app_name": app_name,
            "display_name": metadata["display_name"],
            "description": metadata["description"],
            "icon": metadata["icon"],
            "category": metadata["category"],
            "cluster_name": cluster_name,
            "namespace": namespace,
            "deployment_method": "kubectl",
            "app_version": "2.6.0",
            "deployment_status": deployment_status,
            "metadata": metadata,
        }

        # Add to TASK_STATUSES
        TASK_STATUSES[task_id] = {
            "status": "completed",
            "message": f"Successfully deployed {app_name} to {cluster_name}",
            "completed": True,
            "progress": 100,
            "result": result,
        }

        logger.info(
            f"Added sample application {app_name} to TASK_STATUSES with task_id {task_id}"
        )
        return {
            "status": "success",
            "message": f"Added sample application {app_name} to TASK_STATUSES",
            "task_id": task_id,
        }
    except Exception as e:
        logger.error(f"Failed to add sample application: {str(e)}")
        logger.error(f"Stack trace: {traceback.format_exc()}")
        return {"error": str(e)}


# API Endpoints Notes:
# The following endpoints are redundant and could be consolidated:
# 1. /api/tasks/{task_id} and /api/cluster/status/{task_id} - We've already removed the redundant endpoint
# 2. /api/cluster/deploy and /api/apps/deploy - The former uses hardcoded values while the latter is configurable
# 3. /api/cluster/{name}/set-resource-limits could use the apply_resource_limits function


@app.get("/api/cluster/{name}/config")
async def get_cluster_config(name: str):
    """
    Get configuration for a specific Kind cluster.

    Parameters:
    - name: Name of the cluster to get configuration for

    Returns:
    - Configuration details for the specified cluster
    """
    try:
        logger.info(f"Getting configuration for cluster {name}")

        # Check if the cluster exists
        if not data_provider.cluster_exists(name):
            logger.warning(f"Cluster {name} does not exist")
            raise HTTPException(
                status_code=404,
                detail=create_api_response(
                    API_STATUS["error"],
                    f"Cluster {name} not found",
                    error={"error_type": "ClusterNotFound"},
                ),
            )

        # Get cluster configuration
        config = data_provider.get_cluster_config(name)

        return create_api_response(
            API_STATUS["success"],
            f"Configuration for cluster {name} retrieved successfully",
            data=config,
        )
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error getting cluster configuration: {error_msg}")
        logger.error(traceback.format_exc())

        raise HTTPException(
            status_code=500,
            detail=create_api_response(
                API_STATUS["error"],
                f"Failed to get cluster configuration: {error_msg}",
                error={"error_type": type(e).__name__},
            ),
        )


@app.post("/api/cluster/{name}/set-resource-limits")
async def set_resource_limits(name: str, limits: ResourceLimits):
    """
    Set resource limits for an existing Kind cluster.

    Parameters:
    - name: Name of the cluster to apply limits to
    - limits: ResourceLimits object containing worker and control plane configurations
    """
    logger.info(f"Setting resource limits for cluster {name}")
    logger.info(f"Worker config: {limits.worker_config}")
    logger.info(f"Control plane config: {limits.control_plane_config}")

    try:
        # Check if cluster exists
        command = ["kind", "get", "clusters"]
        result = subprocess.run(command, capture_output=True, text=True)
        clusters = result.stdout.splitlines()

        if name not in clusters:
            raise HTTPException(
                status_code=404,
                detail=create_api_response(
                    API_STATUS["error"], f"Cluster {name} not found"
                ),
            )

        # Get worker and control plane configurations
        worker_config = limits.worker_config
        control_plane_config = limits.control_plane_config

        # Extract CPU and memory values
        worker_cpu = float(worker_config.cpu) if worker_config else 2
        worker_mem = worker_config.memory.replace("GB", "") if worker_config else "4"
        cp_cpu = float(control_plane_config.cpu) if control_plane_config else 2
        cp_mem = (
            control_plane_config.memory.replace("GB", "")
            if control_plane_config
            else "4"
        )

        logger.info("===== USING DEDICATED RESOURCE LIMITS SCRIPT =====")
        script_path = os.path.join(
            os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            ),
            "scripts",
            "set_resource_limits.sh",
        )

        # Ensure script exists and is executable
        if not os.path.exists(script_path):
            logger.error(f"Resource limits script not found at: {script_path}")
            return create_api_response("error", "Resource limits script not found")

        # Make script executable (just in case)
        os.chmod(script_path, 0o755)

        # Build the command
        cmd = [
            script_path,
            name,  # cluster name
            str(worker_cpu),  # worker CPU
            str(worker_mem),  # worker memory (GB)
            str(cp_cpu),  # control plane CPU
            str(cp_mem),  # control plane memory (GB)
        ]

        logger.info(f"Executing resource limits script: {' '.join(cmd)}")

        # Run the script with 5 minute timeout
        process = subprocess.run(
            cmd, capture_output=True, text=True, timeout=300  # 5 minutes timeout
        )

        # Log the output
        if process.stdout:
            for line in process.stdout.splitlines():
                logger.info(f"[SCRIPT] {line}")

        # Log any errors
        if process.stderr:
            for line in process.stderr.splitlines():
                logger.error(f"[SCRIPT] {line}")

        # Check the results
        if process.returncode != 0:
            logger.error(
                f"Resource limits script failed with code {process.returncode}"
            )
            return create_api_response(
                "error",
                f"Failed to apply resource limits. Script exit code: {process.returncode}",
                error={"script_output": process.stdout, "script_error": process.stderr},
            )

        # Verify the limits were actually set using docker inspect
        logger.info("Verifying resource limits were correctly applied...")

        # Check control plane
        verify_cmd = [
            "docker",
            "inspect",
            f"{name}-control-plane",
            "-f",
            "Memory={{.HostConfig.Memory}},CPUs={{.HostConfig.NanoCpus}}",
        ]
        verify_result = subprocess.run(verify_cmd, capture_output=True, text=True)
        logger.info(f"Control plane verification: {verify_result.stdout.strip()}")

        return create_api_response(
            API_STATUS["success"],
            "Resource limits updated successfully",
            data={"script_output": process.stdout},
        )
    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error setting resource limits: {error_msg}")
        logger.error(traceback.format_exc())

        raise HTTPException(
            status_code=500,
            detail=create_api_response(
                API_STATUS["error"],
                f"Failed to set resource limits: {error_msg}",
                error={"error_type": type(e).__name__},
            ),
        )


def start_api_server(
    host: str = "0.0.0.0",
    port: int = 8020,
    reload: bool = False,
    environment: str = "dev",
):
    """Start the API server.

    Args:
        host: Host to bind to
        port: Port to bind to
        reload: Whether to enable auto-reload
        environment: Environment to use for configuration (dev, staging, prod)
    """
    logger.info(f"Starting API server on {host}:{port}")

    # Check if the port is available before starting
    import socket
    import subprocess

    def is_port_available(port):
        # Check using socket
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            result = s.connect_ex(("localhost", port))
            if result == 0:
                return False  # Port is in use

        # Double-check using lsof for more reliability
        try:
            result = subprocess.run(
                ["lsof", "-i", f":{port}"], capture_output=True, text=True
            )
            if result.stdout.strip():
                return False  # Port is in use
        except Exception as e:
            logger.warning(f"Failed to check port using lsof: {str(e)}")
            # Continue anyway, we already checked with socket

        return True  # Port is available

    # Try to find an available port if the specified one is in use
    original_port = port
    max_attempts = 5
    attempt = 0

    while attempt < max_attempts:
        if is_port_available(port):
            break

        logger.warning(f"Port {port} is already in use. Trying next port.")
        port += 1
        attempt += 1

    if attempt == max_attempts:
        logger.error(f"Failed to find an available port after {max_attempts} attempts.")
        logger.error(f"Please manually specify a different port.")
        raise RuntimeError(f"All ports from {original_port} to {port-1} are in use.")

    if port != original_port:
        logger.info(f"Using alternative port {port} instead of {original_port}")

    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allows all origins
        allow_credentials=False,  # Important: must match frontend withCredentials setting
        allow_methods=["*"],  # Allows all methods
        allow_headers=["*"],  # Allows all headers
    )

    logger.info(f"Starting server on {host}:{port} (environment: {environment})...")
    uvicorn.run(app, host=host, port=port, reload=reload)


if __name__ == "__main__":
    import argparse

    # Parse command line arguments
    parser = argparse.ArgumentParser(description="Kind Cluster Setup API Server")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind the server to")
    parser.add_argument(
        "--port", type=int, default=8020, help="Port to bind the server to"
    )
    parser.add_argument(
        "--mock", action="store_true", help="Use mock data instead of real data"
    )
    parser.add_argument(
        "--task-store",
        default="file",
        choices=["memory", "file"],
        help="Task persistence type",
    )
    parser.add_argument(
        "--task-file", default="./tasks.json", help="Path to task persistence file"
    )
    parser.add_argument(
        "--env",
        default="dev",
        choices=["dev", "staging", "prod"],
        help="Environment to use",
    )
    args = parser.parse_args()

    # Set environment variables based on arguments
    if args.mock:
        os.environ["USE_MOCK_DATA"] = "true"
        logger.info("Using mock data mode")
    os.environ["TASK_STORE_TYPE"] = args.task_store
    os.environ["TASK_FILE_PATH"] = args.task_file

    # Log startup information
    logger.info(f"Starting Kind Cluster Setup API server on {args.host}:{args.port}")
    logger.info(f"Environment: {args.env}")
    logger.info(
        f"Task persistence: {args.task_store} ({args.task_file if args.task_store == 'file' else ''})"
    )

    # Start the server
    start_api_server(host=args.host, port=args.port, environment=args.env)
