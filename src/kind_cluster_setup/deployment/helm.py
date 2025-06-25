import os
import tempfile
import yaml
from typing import Dict, Any, List, Optional, Union
from kind_cluster_setup.deployment.base import DeploymentStrategy
from kind_cluster_setup.utils.logging import get_logger
from kind_cluster_setup.utils.constants import HELM_CHART_PATH, PROJECT_ROOT
from kind_cluster_setup.core.command import SubprocessCommandExecutor, CommandResult
from kind_cluster_setup.core.helm import HelmClient
from kind_cluster_setup.core.kubernetes import KubectlClient

logger = get_logger(__name__)

class HelmDeploymentStrategy(DeploymentStrategy):
    def __init__(self):
        """Initialize the Helm deployment strategy."""
        self.executor = SubprocessCommandExecutor()
        self.helm_client = HelmClient(self.executor)
        self.kubectl_client = KubectlClient(self.executor)

    def deploy(self, app: str, app_config: Union[Dict[str, Any], List[Dict[str, Any]]], env_config: Dict[str, Any],
              template_dir: str = None, cluster_name: str = None, values: Dict[str, Any] = None) -> bool:
        """Deploy an application using Helm

        Args:
            app: Name of the application to deploy
            app_config: Application-specific configuration (can be a single document or a list of documents)
            env_config: Environment configuration
            template_dir: Directory containing Helm chart (optional)
            cluster_name: Name of the Kubernetes cluster (optional)
            values: Values for template substitution (optional)

        Returns:
            bool: True if deployment was successful, False otherwise
        """
        logger.info(f"Deploying Helm chart for {app}")

        values_file_path = None

        try:
            # Handle app_config as a dictionary or list
            config = app_config
            if isinstance(app_config, list):
                # If app_config is a list of documents, use the first one as the config
                config = app_config[0] if app_config else {}

            # Get namespace from config or use default format
            namespace = config.get('namespace', env_config.get('namespace', f"{app}-{env_config.get('environment', 'dev')}"))

            # Get template directory - either from provided template_dir, app_config, or use default path
            chart_dir = template_dir
            if not chart_dir:
                chart_dir = config.get('template_dir')
            if not chart_dir:
                chart_dir = os.path.join(PROJECT_ROOT, "templates", "apps", app)

            # Try alternative paths if the chart directory doesn't exist
            if not os.path.exists(chart_dir):
                alt_paths = [
                    os.path.join(PROJECT_ROOT, "applications", app, "helm"),
                    os.path.join(PROJECT_ROOT, "helm", app)
                ]
                for alt_path in alt_paths:
                    if os.path.exists(alt_path):
                        chart_dir = alt_path
                        break

            # Validate template directory
            if not self._validate_template_dir(chart_dir):
                logger.error(f"Invalid Helm chart directory: {chart_dir}")
                return False

            # Get values for template substitution
            helm_values = values if values is not None else config.get('values', {})

            # Get cluster context
            actual_cluster_name = cluster_name if cluster_name else config.get('cluster_name', 'kind')
            context = f"kind-{actual_cluster_name}"
            if actual_cluster_name.startswith("kind-"):
                context = actual_cluster_name

            # Get release name
            release_name = config.get('release_name', f"{app}-release")

            # Get chart version if specified
            version = config.get('app_version')

            logger.info(f"Using chart directory: {chart_dir}")
            logger.info(f"Deploying to namespace: {namespace} in cluster: {actual_cluster_name}")

            # Set kubectl context
            try:
                self.kubectl_client.execute(["config", "use-context", context])
                logger.info(f"Set kubectl context to {context}")
            except Exception as e:
                logger.error(f"Failed to set kubectl context: {str(e)}")
                return False

            # Check if Helm is installed
            if not self.helm_client.is_installed():
                error_msg = "Helm is not installed or not in PATH"
                logger.error(error_msg)
                return False

            # Create values.yaml file from provided values
            try:
                with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as temp_values_file:
                    yaml.dump(helm_values, temp_values_file)
                    values_file_path = temp_values_file.name
            except Exception as e:
                logger.error(f"Failed to create temporary values file: {str(e)}")
                return False

            # Install or upgrade the Helm chart
            try:
                logger.info(f"Installing/upgrading Helm chart {chart_dir} as {release_name} in namespace {namespace}")
                result = self.helm_client.install_or_upgrade(
                    release_name=release_name,
                    chart=chart_dir,
                    namespace=namespace,
                    values_file=values_file_path,
                    version=version,
                    create_namespace=True,
                    wait=True
                )

                logger.info(f"Helm chart for {app} deployed successfully")
                logger.info(f"Helm output: {result.stdout}")

                return True
            except Exception as e:
                error_msg = f"Failed to deploy with Helm: {str(e)}"
                logger.error(error_msg)
                return False

        except Exception as e:
            logger.error(f"Error deploying {app} with Helm: {str(e)}")
            return False
        finally:
            # Clean up temporary values file in all cases
            if values_file_path and os.path.exists(values_file_path):
                try:
                    os.unlink(values_file_path)
                except Exception as e:
                    logger.warning(f"Failed to clean up temporary values file: {str(e)}")

    def check_status(self, app: str, namespace: Optional[str] = None) -> Dict[str, Any]:
        """Check the status of a deployed Helm chart

        Args:
            app: Name of the application to check
            namespace: Kubernetes namespace, defaults to app-specific namespace

        Returns:
            Dict containing status information
        """
        logger.info(f"Checking status of Helm chart for {app}")

        # Determine namespace if not provided
        if namespace is None:
            namespace = f"{app}-dev"

        # Get release name (could be different from app name)
        release_name = f"{app}-release"

        status_info = {
            'status': 'Unknown',
            'pods': [],
            'services': [],
            'message': ''
        }

        # Check Helm release status
        try:
            # Execute the helm status command
            result = self.helm_client.execute(
                ["status", release_name, "--namespace", namespace]
            )

            logger.info(f"Helm chart for {app} status checked successfully")
            status_info['status'] = 'Deployed'
            status_info['message'] = result.stdout

            # Get pod status
            try:
                # Get pods with the app.kubernetes.io/instance label
                pods = self.kubectl_client.get_pods(
                    namespace=namespace,
                    selector=f"app.kubernetes.io/instance={release_name}"
                )

                status_info['pods'] = pods

                # Determine overall status based on pods
                if status_info['pods']:
                    all_running = all(pod.get('status', {}).get('phase') == 'Running' for pod in status_info['pods'])
                    status_info['status'] = 'Running' if all_running else 'Partially Running'
            except Exception as e:
                logger.warning(f"Could not get pod status: {str(e)}")

            # Get service status
            try:
                # Execute the kubectl get services command
                svc_result = self.kubectl_client.execute(
                    ["get", "services", "-l", f"app.kubernetes.io/instance={release_name}", "-o", "json"],
                    namespace=namespace
                )

                # Parse the JSON output
                svc_data = yaml.safe_load(svc_result.stdout)
                status_info['services'] = svc_data.get('items', [])
            except Exception as e:
                logger.warning(f"Could not get service status: {str(e)}")

            return status_info

        except Exception as e:
            error_msg = f"Failed to check status of Helm chart for {app}: {str(e)}"
            logger.error(error_msg)
            status_info['status'] = 'Error'
            status_info['message'] = error_msg
            return status_info

    def delete(self, app: str, namespace: Optional[str] = None) -> bool:
        """Delete a deployed Helm release

        Args:
            app: Name of the application to delete
            namespace: Kubernetes namespace, defaults to app-specific namespace

        Returns:
            bool: True if deletion was successful, False otherwise
        """
        logger.info(f"Deleting Helm release for {app}")

        # Determine namespace if not provided
        if namespace is None:
            namespace = f"{app}-dev"

        # Get release name
        release_name = f"{app}-release"

        try:
            # Uninstall the Helm release
            result = self.helm_client.uninstall(
                release_name=release_name,
                namespace=namespace,
                wait=True
            )

            logger.info(f"Helm release for {app} deleted successfully")
            logger.debug(f"Helm uninstall output: {result.stdout}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete Helm release for {app}: {str(e)}")
            return False

    def _validate_template_dir(self, template_dir: str) -> bool:
        """Validate that the template directory exists and contains valid Helm chart files

        Args:
            template_dir: Path to the Helm chart directory

        Returns:
            bool: True if directory is valid, False otherwise
        """
        if not os.path.exists(template_dir):
            logger.error(f"Template directory does not exist: {template_dir}")
            return False

        # Check for Chart.yaml which is required for a valid Helm chart
        chart_yaml = os.path.join(template_dir, "Chart.yaml")
        if not os.path.exists(chart_yaml):
            logger.warning(f"Chart.yaml not found in template directory: {template_dir}")
            # This might be a local chart directory without Chart.yaml, so we'll continue
            # but log a warning

        return True

