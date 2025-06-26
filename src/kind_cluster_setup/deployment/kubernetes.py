import json
import os
import tempfile
from typing import Any, Dict, List, Optional, Union

import yaml

from kind_cluster_setup.core.command import (CommandResult,
                                             SubprocessCommandExecutor)
from kind_cluster_setup.core.kubernetes import KubectlClient
from kind_cluster_setup.deployment.base import DeploymentStrategy
from kind_cluster_setup.utils.constants import K8S_MANIFEST_PATH, PROJECT_ROOT
from kind_cluster_setup.utils.logging import get_logger

logger = get_logger(__name__)


class KubernetesDeploymentStrategy(DeploymentStrategy):
    def __init__(self):
        """Initialize the Kubernetes deployment strategy."""
        self.executor = SubprocessCommandExecutor()
        self.kubectl_client = KubectlClient(self.executor)

    def deploy(
        self,
        app: str,
        app_config: Union[Dict[str, Any], List[Dict[str, Any]]],
        env_config: Dict[str, Any],
        template_dir: str = None,
        cluster_name: str = None,
        values: Dict[str, Any] = None,
    ) -> bool:
        """Deploy Kubernetes manifests for an application.

        Args:
            app: Name of the application to deploy
            app_config: Application configuration (can be a single document or a list of documents)
            env_config: Environment configuration
            template_dir: Directory containing Kubernetes manifest templates (optional)
            cluster_name: Name of the Kubernetes cluster (optional)
            values: Values for template substitution (optional)

        Returns:
            bool: True if deployment was successful, False otherwise
        """
        logger.info(f"Deploying Kubernetes manifests for {app}")

        # Get namespace from app_config first (from frontend), then env_config, or use default format
        # Handle both single document (dict) and multi-document (list) app_config
        if isinstance(app_config, list):
            # For multi-document, try to get namespace from first document with metadata
            namespace = None
            for doc in app_config:
                if isinstance(doc, dict) and doc.get("metadata", {}).get("namespace"):
                    namespace = doc["metadata"]["namespace"]
                    break
            # Fallback to env_config or default
            if not namespace:
                namespace = env_config.get("namespace", f"{app}-{env_config.get('environment', 'dev')}")
        else:
            # Single document case
            namespace = app_config.get("namespace") or env_config.get(
                "namespace", f"{app}-{env_config.get('environment', 'dev')}"
            )

        # Set kubectl context to the target cluster
        if cluster_name is None:
            # Try to get cluster name from environment
            cluster_name = f"my-kind-cluster"

        context = f"kind-{cluster_name}"
        if cluster_name.startswith("kind-"):
            context = cluster_name

        self._set_kubectl_context(context)

        # Create namespace if it doesn't exist
        self._create_namespace_if_not_exists(namespace, context)

        # If values is not provided, use app_config as values
        if values is None:
            values = {}

        # Check if we have a template directory or direct YAML config
        if template_dir is not None and os.path.exists(template_dir):
            logger.info(f"Using template directory: {template_dir}")
            logger.info(
                f"Deploying to namespace: {namespace} in cluster: {cluster_name}"
            )

            # Process templates and apply to cluster
            with tempfile.TemporaryDirectory() as temp_dir:
                processed_files = self._process_template_files(
                    template_dir, temp_dir, values
                )

                if not processed_files:
                    logger.warning(f"No template files found for {app}")
                    return False

                # Apply the processed templates
                try:
                    result = self.kubectl_client.apply(
                        files=[temp_dir], context=context, namespace=namespace
                    )
                    logger.info(
                        f"Successfully applied {app} templates: {result.stdout}"
                    )
                except Exception as e:
                    logger.error(f"Failed to apply {app} templates: {str(e)}")
                    raise
        else:
            # Direct YAML config
            logger.info(f"Using direct YAML configuration for {app}")

            # Create a temporary file with the YAML config
            with tempfile.TemporaryDirectory() as temp_dir:
                yaml_file = os.path.join(temp_dir, f"{app}.yaml")

                # Handle both single document and multi-document configs
                if isinstance(app_config, list):
                    from kind_cluster_setup.utils.yaml_handler import \
                        dump_multi_yaml

                    dump_multi_yaml(app_config, yaml_file)
                else:
                    from kind_cluster_setup.utils.yaml_handler import dump_yaml

                    dump_yaml(app_config, yaml_file)

                # Apply the YAML file
                try:
                    result = self.kubectl_client.apply(
                        files=[yaml_file], context=context, namespace=namespace
                    )
                    logger.info(
                        f"Successfully applied {app} configuration: {result.stdout}"
                    )
                except Exception as e:
                    logger.error(f"Failed to apply {app} configuration: {str(e)}")
                    raise

        # Wait for deployments to be ready
        self._wait_for_deployments(app, namespace, context)

        # Expose services if requested
        expose_service = values.get("expose_service", False)
        if expose_service:
            service_type = values.get("service_type", "NodePort")
            service_port = values.get("service_port", 80)
            target_port = values.get("target_port", 80)

            logger.info(f"Exposing service for {app} with type {service_type}")
            try:
                # Check if service already exists
                result = self.kubectl_client.get(
                    resource="service", name=app, namespace=namespace, context=context
                )

                if "not found" in result.stderr:
                    # Create service
                    result = self.kubectl_client.expose(
                        resource="deployment",
                        name=app,
                        port=service_port,
                        target_port=target_port,
                        type=service_type,
                        namespace=namespace,
                        context=context,
                    )
                    logger.info(f"Service created: {result.stdout}")
                else:
                    logger.info(f"Service already exists for {app}")

                # Get service details
                result = self.kubectl_client.get(
                    resource="service",
                    name=app,
                    namespace=namespace,
                    context=context,
                    output="json",
                )

                import json

                service_details = json.loads(result.stdout)

                # For NodePort services, get the node port
                if (
                    service_type == "NodePort"
                    and "spec" in service_details
                    and "ports" in service_details["spec"]
                ):
                    node_port = service_details["spec"]["ports"][0].get("nodePort")
                    if node_port:
                        logger.info(f"Service {app} exposed on NodePort {node_port}")

                        # For Kind clusters, we need to port-forward to access the service
                        if context.startswith("kind-"):
                            logger.info(
                                f"Kind cluster detected. To access the service, run:"
                            )
                            logger.info(
                                f"kubectl port-forward service/{app} {node_port}:{service_port} -n {namespace}"
                            )
            except Exception as e:
                logger.warning(f"Failed to expose service for {app}: {str(e)}")

        logger.info(f"Kubernetes manifests for {app} deployed successfully")
        return True

    def _set_kubectl_context(self, context_name: str) -> None:
        """Set the kubectl context.

        Args:
            context_name: Name of the kubectl context
        """
        try:
            # Check if the expected context exists
            check_context = self.kubectl_client.execute(
                ["config", "get-context", context_name], check=False
            )

            if check_context.success:
                # Set kubectl context if it exists
                logger.info(f"Setting kubectl context to {context_name}")
                self.kubectl_client.execute(["config", "use-context", context_name])
            else:
                # Get current context if target doesn't exist
                current_context = self.kubectl_client.execute(
                    ["config", "current-context"]
                )
                current_context_name = current_context.stdout.strip()
                logger.warning(
                    f"Context {context_name} not found, using current context: {current_context_name}"
                )
        except Exception as e:
            logger.error(f"Failed to set kubectl context: {str(e)}")
            # Continue using current context instead of failing
            logger.warning("Continuing with current kubectl context")

    def _create_namespace_if_not_exists(
        self, namespace: str, context: Optional[str] = None
    ) -> None:
        """Create a Kubernetes namespace if it doesn't exist.

        Args:
            namespace: Name of the namespace to create
            context: Kubernetes context to use
        """
        try:
            # Check if namespace exists
            check_ns = self.kubectl_client.execute(
                ["get", "namespace", namespace], context=context, check=False
            )

            if not check_ns.success:
                # Namespace doesn't exist, create it
                logger.info(f"Creating namespace {namespace}")
                create_ns = self.kubectl_client.execute(
                    ["create", "namespace", namespace], context=context
                )

                logger.info(f"Successfully created namespace {namespace}")
            else:
                logger.info(f"Namespace {namespace} already exists")
        except Exception as e:
            logger.error(f"Error creating namespace: {str(e)}")
            raise

    def _process_template_files(
        self, template_dir: str, output_dir: str, values: Dict[str, Any]
    ) -> List[str]:
        """Process template files by substituting values and save to output directory"""
        processed_files = []

        if not os.path.exists(template_dir):
            logger.error(f"Template directory {template_dir} does not exist")
            return processed_files

        # Check if directory is empty
        if not os.listdir(template_dir):
            logger.warning(f"Template directory {template_dir} is empty")
            return processed_files

        # Process each YAML file in the template directory
        for filename in os.listdir(template_dir):
            if filename.endswith((".yaml", ".yml")) and not filename.startswith("."):
                input_file = os.path.join(template_dir, filename)
                output_file = os.path.join(output_dir, filename)

                try:
                    with open(input_file, "r") as f:
                        content = f.read()

                    # Replace template variables - handle both {{ key }} and {{ .key }} formats
                    for key, value in values.items():
                        # Handle both formats: {{ key }} and {{ .key }}
                        placeholders = [f"{{{{ {key} }}}}", f"{{{{ .{key} }}}}"]

                        for placeholder in placeholders:
                            # Handle different value types appropriately
                            if isinstance(value, (dict, list)):
                                # Convert complex objects to YAML format
                                yaml_value = yaml.dump(value, default_flow_style=False)
                                # Adjust indentation to match the placeholder's position
                                content = content.replace(
                                    placeholder, yaml_value.rstrip()
                                )
                            else:
                                # Simple string replacement for primitive types
                                content = content.replace(placeholder, str(value))

                    # Handle special template functions and conditionals
                    import base64
                    import re

                    # Handle base64 encoding: {{ .password | b64enc }}
                    b64_pattern = r"\{\{\s*\.(\w+)\s*\|\s*b64enc\s*\}\}"

                    def b64_replace(match):
                        key = match.group(1)
                        if key in values:
                            return base64.b64encode(str(values[key]).encode()).decode()
                        return match.group(0)

                    content = re.sub(b64_pattern, b64_replace, content)

                    # Handle simple conditionals: {{- if .enable_monitoring }} ... {{- end }}
                    # For now, we'll remove conditional blocks if the condition is false
                    conditional_pattern = (
                        r"\{\{-\s*if\s*\.(\w+)\s*\}\}(.*?)\{\{-\s*end\s*\}\}"
                    )

                    def conditional_replace(match):
                        key = match.group(1)
                        content_block = match.group(2)
                        if key in values and values[key]:
                            return content_block
                        return ""

                    content = re.sub(
                        conditional_pattern,
                        conditional_replace,
                        content,
                        flags=re.DOTALL,
                    )

                    # Validate the resulting YAML
                    try:
                        yaml.safe_load(content)
                    except yaml.YAMLError as e:
                        logger.warning(
                            f"Generated YAML for {filename} may be invalid: {e}"
                        )

                    # Write processed content to output file
                    with open(output_file, "w") as f:
                        f.write(content)

                    processed_files.append(output_file)
                    logger.info(f"Processed template file: {filename}")
                except Exception as e:
                    logger.error(
                        f"Failed to process template file {filename}: {str(e)}"
                    )

        return processed_files

    def _wait_for_deployments(
        self,
        app: str,
        namespace: str,
        context: Optional[str] = None,
        timeout: int = 300,
    ) -> None:
        """Wait for deployments to be ready.

        Args:
            app: Name of the application
            namespace: Kubernetes namespace
            context: Kubernetes context to use
            timeout: Timeout in seconds
        """
        try:
            # Wait for deployments with app label
            self.kubectl_client.wait_for_condition(
                resource_type="deployment",
                condition="available",
                selector=f"app={app}",
                timeout=f"{timeout}s",
                context=context,
                namespace=namespace,
            )
            logger.info(f"All deployments for {app} are ready")
        except Exception as e:
            logger.warning(
                f"Timed out waiting for {app} deployments to be ready: {str(e)}"
            )

    def check_status(
        self, app: str, env_config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Check the status of a Kubernetes deployment.

        Args:
            app: Name of the application to check
            env_config: Environment configuration

        Returns:
            Dict containing status information
        """
        if env_config is None:
            env_config = {"environment": "dev"}
        logger.info(f"Checking status of Kubernetes deployment for {app}")

        # Get namespace from env_config or use provided namespace or app name
        namespace = env_config.get(
            "namespace", f"{app}-{env_config.get('environment', 'dev')}"
        )

        try:
            # Get pods status
            pods_data = {"items": []}
            try:
                pods = self.kubectl_client.get_pods(
                    namespace=namespace, selector=f"app={app}"
                )
                pods_data["items"] = pods
            except Exception as e:
                logger.warning(f"Failed to get pods: {str(e)}")

            # Get services status
            services_data = {"items": []}
            try:
                services_result = self.kubectl_client.execute(
                    ["get", "services", "-l", f"app={app}", "-o", "json"],
                    namespace=namespace,
                )
                services_data = json.loads(services_result.stdout)
            except Exception as e:
                logger.warning(f"Failed to get services: {str(e)}")

            # Check for ingress if it exists
            ingress_data = {"items": []}
            try:
                ingress_result = self.kubectl_client.execute(
                    ["get", "ingress", "-l", f"app={app}", "-o", "json"],
                    namespace=namespace,
                    check=False,
                )
                if ingress_result.success:
                    ingress_data = json.loads(ingress_result.stdout)
            except Exception as e:
                logger.warning(f"Failed to get ingress: {str(e)}")

            # Process pods data
            pods = []
            for pod in pods_data.get("items", []):
                pod_name = pod.get("metadata", {}).get("name", "")
                status = pod.get("status", {})
                phase = status.get("phase", "Unknown")
                conditions = status.get("conditions", [])
                ready_condition = next(
                    (c for c in conditions if c.get("type") == "Ready"), {}
                )
                ready = ready_condition.get("status", "False") == "True"

                containers = []
                for container in pod.get("spec", {}).get("containers", []):
                    container_name = container.get("name", "")
                    container_image = container.get("image", "")
                    container_status = next(
                        (
                            c
                            for c in status.get("containerStatuses", [])
                            if c.get("name") == container_name
                        ),
                        {},
                    )
                    container_ready = container_status.get("ready", False)
                    container_state = container_status.get("state", {})
                    container_state_type = next(iter(container_state.keys()), "unknown")

                    containers.append(
                        {
                            "name": container_name,
                            "image": container_image,
                            "ready": container_ready,
                            "state": container_state_type,
                        }
                    )

                pods.append(
                    {
                        "name": pod_name,
                        "phase": phase,
                        "ready": ready,
                        "containers": containers,
                    }
                )

            # Process services data
            services = []
            for svc in services_data.get("items", []):
                svc_name = svc.get("metadata", {}).get("name", "")
                svc_type = svc.get("spec", {}).get("type", "ClusterIP")
                ports = []

                for port in svc.get("spec", {}).get("ports", []):
                    port_info = {
                        "name": port.get("name", ""),
                        "port": port.get("port", 0),
                        "target_port": port.get("targetPort", 0),
                    }

                    # Add node port if available
                    if "nodePort" in port:
                        port_info["node_port"] = port.get("nodePort")

                    ports.append(port_info)

                # Get cluster IP and external IP if available
                cluster_ip = svc.get("spec", {}).get("clusterIP", "")
                external_ips = (
                    svc.get("status", {}).get("loadBalancer", {}).get("ingress", [])
                )
                external_ip = external_ips[0].get("ip") if external_ips else ""

                services.append(
                    {
                        "name": svc_name,
                        "type": svc_type,
                        "cluster_ip": cluster_ip,
                        "external_ip": external_ip,
                        "ports": ports,
                    }
                )

            # Process ingress data
            ingresses = []
            for ing in ingress_data.get("items", []):
                ing_name = ing.get("metadata", {}).get("name", "")
                hosts = []

                for rule in ing.get("spec", {}).get("rules", []):
                    host = rule.get("host", "")
                    if host:
                        hosts.append(host)

                ingresses.append({"name": ing_name, "hosts": hosts})

            # Generate access URLs
            access_urls = []

            # Check if this is a Kind cluster
            is_kind_cluster = True  # Default to True for safety
            try:
                cluster_info = self.kubectl_client.execute(["cluster-info"])
                is_kind_cluster = "kind" in cluster_info.stdout.lower()
                logger.info(
                    f"Detected {'Kind' if is_kind_cluster else 'non-Kind'} cluster"
                )
            except Exception as e:
                logger.warning(
                    f"Failed to determine cluster type, assuming Kind cluster: {str(e)}"
                )

            # First check ingress URLs
            for ing in ingresses:
                for host in ing.get("hosts", []):
                    # For Kind clusters or if host contains 'undefined', use localhost with NodePort
                    if is_kind_cluster or "undefined" in host:
                        # Find a NodePort service to use instead
                        for svc in services:
                            if svc.get("type") == "NodePort":
                                for port in svc.get("ports", []):
                                    if "node_port" in port:
                                        logger.info(
                                            f"Using localhost NodePort instead of ingress host for Kind cluster"
                                        )
                                        access_urls.append(
                                            {
                                                "type": "nodeport",
                                                "url": f"http://localhost:{port.get('node_port')}",
                                            }
                                        )
                                        # Only add the first NodePort we find
                                        break
                                # Break after finding the first service with NodePort
                                break
                    # For non-Kind clusters with valid hosts
                    elif host and "undefined" not in host:
                        access_urls.append({"type": "ingress", "url": f"http://{host}"})

            # Then check service URLs
            for svc in services:
                # For LoadBalancer services with external IP
                if svc.get("type") == "LoadBalancer" and svc.get("external_ip"):
                    for port in svc.get("ports", []):
                        access_urls.append(
                            {
                                "type": "loadbalancer",
                                "url": f"http://{svc.get('external_ip')}:{port.get('port')}",
                            }
                        )

                # For NodePort services
                elif svc.get("type") == "NodePort":
                    for port in svc.get("ports", []):
                        if "node_port" in port:
                            # For Kind clusters, always use localhost
                            # We already determined if this is a Kind cluster above
                            if is_kind_cluster:
                                node_ip = "localhost"
                                logger.info(
                                    f"Using localhost for Kind cluster NodePort service"
                                )
                            else:
                                # Try to get the node IP for non-Kind clusters
                                try:
                                    node_ip_result = self.kubectl_client.execute(
                                        [
                                            "get",
                                            "nodes",
                                            "-o",
                                            "jsonpath={.items[0].status.addresses[?(@.type=='InternalIP')].address}",
                                        ]
                                    )
                                    node_ip = node_ip_result.stdout.strip()
                                    if not node_ip:
                                        node_ip = "localhost"  # Fallback if no IP found
                                except Exception as e:
                                    logger.error(
                                        f"Failed to determine node IP: {str(e)}"
                                    )
                                    node_ip = "localhost"  # Fallback on error

                            # Add the NodePort URL
                            access_urls.append(
                                {
                                    "type": "nodeport",
                                    "url": f"http://{node_ip}:{port.get('node_port')}",
                                }
                            )
                            logger.info(
                                f"Added NodePort access URL: http://{node_ip}:{port.get('node_port')}"
                            )

            # For specific applications like Airflow, add application-specific info
            app_info = {}
            if app == "airflow":
                app_info = {
                    "admin_user": "admin",
                    "admin_password": "admin",  # This should be retrieved from the deployment config
                }

            # Determine overall status based on pods
            status = "Running"
            if not pods:
                status = "No Pods Found"
            elif any(pod.get("phase") == "Failed" for pod in pods):
                status = "Failed"
            elif not all(pod.get("ready") for pod in pods):
                status = "Not Ready"

            # Combine all data
            status_data = {
                "app": app,
                "namespace": namespace,
                "status": status,
                "pods": pods,
                "services": services,
                "ingresses": ingresses,
                "access_urls": access_urls,
                "app_info": app_info,
                "message": f"{app} deployment status: {status}",
            }

            logger.info(f"Kubernetes deployment status for {app} checked successfully")
            return status_data

        except Exception as e:
            logger.error(
                f"Failed to check status of Kubernetes deployment for {app}: {str(e)}"
            )
            return {
                "app": app,
                "namespace": namespace,
                "status": "Error",
                "message": f"Failed to check status: {str(e)}",
                "pods": [],
                "services": [],
                "ingresses": [],
                "access_urls": [],
            }

    def delete(self, app: str, namespace: Optional[str] = None) -> bool:
        """Delete a deployed application from the Kubernetes cluster

        Args:
            app: Name of the application to delete
            namespace: Kubernetes namespace, defaults to app-specific namespace

        Returns:
            bool: True if deletion was successful, False otherwise
        """
        logger.info(f"Deleting Kubernetes resources for {app}")

        # Determine namespace if not provided
        if namespace is None:
            namespace = f"{app}-dev"

        try:
            # Delete all resources with the app label
            result = self.kubectl_client.execute(
                ["delete", "all", "-l", f"app={app}"], namespace=namespace
            )

            logger.info(f"Successfully deleted resources for {app}: {result.stdout}")

            # Check if we should delete the namespace too (if it's app-specific)
            if namespace.startswith(f"{app}-"):
                logger.info(f"Checking if namespace {namespace} should be deleted")
                # Check if there are any resources left in the namespace
                check_result = self.kubectl_client.execute(
                    ["get", "all", "-o", "json"], namespace=namespace
                )

                resources = json.loads(check_result.stdout)

                if not resources.get("items"):
                    # No resources left, safe to delete the namespace
                    logger.info(f"Deleting empty namespace {namespace}")
                    self.kubectl_client.execute(["delete", "namespace", namespace])
                    logger.info(f"Successfully deleted namespace {namespace}")

            return True

        except Exception as e:
            logger.error(f"Error deleting resources for {app}: {str(e)}")
            return False
