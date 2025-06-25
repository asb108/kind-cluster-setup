"""Data provider module for Kind Cluster Setup API.

This module provides data access abstractions for the API server,
including mock data for testing and development purposes.
"""

import logging
import subprocess
import datetime
import json
from typing import Dict, Any, List, Optional, Tuple
from ..core.docker import DockerClient
from ..core.command import SubprocessCommandExecutor

logger = logging.getLogger(__name__)

class DataProvider:
    """Base class for data providers.

    This class defines the interface for data providers that supply
    information to the API server.
    """

    def get_clusters(self) -> List[Dict[str, Any]]:
        """Get list of clusters."""
        raise NotImplementedError("Subclasses must implement get_clusters")

    def get_cluster_status(self, environments: List[str]) -> Dict[str, Any]:
        """Get status of clusters across environments."""
        raise NotImplementedError("Subclasses must implement get_cluster_status")

    def get_applications(self) -> List[Dict[str, Any]]:
        """Get list of applications."""
        raise NotImplementedError("Subclasses must implement get_applications")


class KindDataProvider(DataProvider):
    """Data provider that interacts with actual Kind clusters.

    This provider uses the Kind CLI and Kubernetes commands to retrieve
    real data from the system.
    """

    def __init__(self):
        """Initialize the KindDataProvider with Docker client."""
        self.docker_client = DockerClient(SubprocessCommandExecutor())

    def _is_cluster_running(self, cluster_name: str) -> bool:
        """Check if a Kind cluster is actually running by checking Docker containers.

        Args:
            cluster_name: Name of the cluster to check

        Returns:
            True if the cluster's Docker containers are running, False otherwise
        """
        try:
            # Check if Docker is running
            if not self.docker_client.is_running():
                logger.warning("Docker is not running")
                return False

            # Get all containers
            containers = self.docker_client.get_containers(all_containers=True)

            # Look for containers that belong to this cluster
            cluster_containers = []
            for container in containers:
                container_name = container.get('Names', '')
                # Kind containers are named like: kind-{cluster-name}-control-plane, kind-{cluster-name}-worker
                if container_name.startswith(f'{cluster_name}-') or container_name.startswith(f'kind-{cluster_name}-'):
                    cluster_containers.append(container)

            if not cluster_containers:
                logger.debug(f"No Docker containers found for cluster {cluster_name}")
                return False

            # Check if at least the control plane container is running
            control_plane_running = False
            for container in cluster_containers:
                container_name = container.get('Names', '')
                container_state = container.get('State', '').lower()

                if 'control-plane' in container_name:
                    if container_state == 'running':
                        control_plane_running = True
                        break

            logger.debug(f"Cluster {cluster_name} control plane running: {control_plane_running}")
            return control_plane_running

        except Exception as e:
            logger.error(f"Error checking if cluster {cluster_name} is running: {str(e)}")
            return False

    def cluster_exists(self, cluster_name: str) -> bool:
        """Check if a cluster exists.

        Args:
            cluster_name: Name of the cluster to check

        Returns:
            True if the cluster exists, False otherwise
        """
        try:
            # Check if kind is installed
            kind_check = subprocess.run(['which', 'kind'],
                                      stdout=subprocess.PIPE,
                                      stderr=subprocess.PIPE,
                                      text=True)

            if kind_check.returncode != 0:
                logger.error("Kind CLI is not installed or not in PATH")
                return False

            # Get list of clusters
            result = subprocess.run(['kind', 'get', 'clusters'],
                                   stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE,
                                   text=True)

            if result.returncode != 0:
                logger.error(f"Failed to list clusters: {result.stderr}")
                return False

            # Check if cluster exists
            clusters = result.stdout.strip().split('\n')
            return cluster_name in clusters
        except Exception as e:
            logger.error(f"Error checking if cluster exists: {str(e)}")
            return False

    def get_cluster_config(self, cluster_name: str) -> Dict[str, Any]:
        """Get configuration for a specific cluster.

        Args:
            cluster_name: Name of the cluster to get configuration for

        Returns:
            Configuration details for the specified cluster
        """
        try:
            # Check if cluster exists
            if not self.cluster_exists(cluster_name):
                raise ValueError(f"Cluster {cluster_name} does not exist")

            # Get cluster configuration using kubectl
            kubectl_cmd = [
                'kubectl', 'config', 'view',
                '--context', f'kind-{cluster_name}',
                '-o', 'json'
            ]

            kubectl_result = subprocess.run(
                kubectl_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            if kubectl_result.returncode != 0:
                logger.warning(f"Failed to get kubectl config: {kubectl_result.stderr}")
                # Fallback to basic config
                return {
                    "name": cluster_name,
                    "kind": "Cluster",
                    "apiVersion": "kind.x-k8s.io/v1alpha4",
                    "nodes": self._get_cluster_nodes(cluster_name)
                }

            # Parse kubectl output
            try:
                kubectl_config = json.loads(kubectl_result.stdout)
            except json.JSONDecodeError:
                logger.warning("Failed to parse kubectl config as JSON")
                kubectl_config = {}

            # Get node information
            nodes = self._get_cluster_nodes(cluster_name)

            # Build configuration object
            config = {
                "name": cluster_name,
                "kind": "Cluster",
                "apiVersion": "kind.x-k8s.io/v1alpha4",
                "nodes": nodes,
                "kubeconfig": kubectl_config
            }

            # Try to get resource limits if available
            try:
                # This would require parsing the Kind config file
                # For now, we'll just provide default values
                config["resource_limits"] = {
                    "worker": {
                        "cpu": "2",
                        "memory": "2Gi"
                    },
                    "control_plane": {
                        "cpu": "2",
                        "memory": "2Gi"
                    }
                }
            except Exception as e:
                logger.warning(f"Failed to get resource limits: {str(e)}")

            return config
        except Exception as e:
            logger.error(f"Error getting cluster config: {str(e)}")
            # Return basic config
            return {
                "name": cluster_name,
                "kind": "Cluster",
                "apiVersion": "kind.x-k8s.io/v1alpha4",
                "error": str(e)
            }

    def _get_cluster_nodes(self, cluster_name: str) -> List[Dict[str, Any]]:
        """Get nodes for a specific cluster.

        Args:
            cluster_name: Name of the cluster to get nodes for

        Returns:
            List of nodes for the specified cluster
        """
        try:
            # Set kubectl context to the cluster
            subprocess.run(
                ['kubectl', 'config', 'use-context', f'kind-{cluster_name}'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            # Get nodes
            nodes_result = subprocess.run(
                ['kubectl', 'get', 'nodes', '-o', 'json'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            if nodes_result.returncode != 0:
                logger.warning(f"Failed to get nodes: {nodes_result.stderr}")
                return [{"role": "control-plane"}, {"role": "worker"}]

            # Parse nodes output
            try:
                nodes_data = json.loads(nodes_result.stdout)
                nodes = []

                for item in nodes_data.get("items", []):
                    node_name = item.get("metadata", {}).get("name", "")
                    labels = item.get("metadata", {}).get("labels", {})

                    # Determine role based on labels
                    role = "worker"
                    if "node-role.kubernetes.io/control-plane" in labels:
                        role = "control-plane"

                    nodes.append({
                        "name": node_name,
                        "role": role
                    })

                return nodes
            except json.JSONDecodeError:
                logger.warning("Failed to parse nodes output as JSON")
                return [{"role": "control-plane"}, {"role": "worker"}]
        except Exception as e:
            logger.error(f"Error getting cluster nodes: {str(e)}")
            return [{"role": "control-plane"}, {"role": "worker"}]

    def get_clusters(self) -> List[Dict[str, Any]]:
        """Get list of clusters using Kind CLI."""
        try:
            # Check if kind is installed
            kind_check = subprocess.run(['which', 'kind'],
                                      stdout=subprocess.PIPE,
                                      stderr=subprocess.PIPE,
                                      text=True)

            if kind_check.returncode != 0:
                logger.error("Kind CLI is not installed or not in PATH")
                return []

            # Get list of clusters
            result = subprocess.run(['kind', 'get', 'clusters'],
                                   stdout=subprocess.PIPE,
                                   stderr=subprocess.PIPE,
                                   text=True)

            if result.returncode != 0:
                logger.error(f"Failed to list clusters: {result.stderr}")
                return []

            # Parse the output (one cluster name per line)
            clusters = []
            cluster_names = [line for line in result.stdout.strip().split('\n') if line]

            logger.info(f"Found {len(cluster_names)} Kind clusters: {cluster_names}")

            # Get more details for each cluster
            for cluster_name in cluster_names:
                try:
                    # Get node count using kubectl
                    kubectl_cmd = [
                        'kubectl', 'get', 'nodes',
                        '--context', f'kind-{cluster_name}',
                        '--no-headers',
                        '-o', 'custom-columns=NAME:.metadata.name'
                    ]

                    nodes_result = subprocess.run(
                        kubectl_cmd,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True
                    )

                    # Count nodes
                    node_count = 0
                    if nodes_result.returncode == 0:
                        nodes = [n for n in nodes_result.stdout.strip().split('\n') if n]
                        node_count = len(nodes)

                    # Get creation time
                    created_at = self._get_cluster_creation_time(cluster_name)

                    # Check if cluster is actually running by checking Docker containers
                    is_running = self._is_cluster_running(cluster_name)
                    status = "Running" if is_running else "Stopped"

                    clusters.append({
                        "name": cluster_name,
                        "status": status,
                        "nodes": node_count,
                        "created": created_at
                    })

                except Exception as e:
                    logger.error(f"Error getting details for cluster {cluster_name}: {str(e)}")
                    # Check if cluster is actually running by checking Docker containers
                    is_running = self._is_cluster_running(cluster_name)
                    status = "Running" if is_running else "Stopped"

                    # Add with minimal information
                    clusters.append({
                        "name": cluster_name,
                        "status": status,
                        "nodes": 0,
                        "created": "Unknown"
                    })

            return clusters
        except Exception as e:
            logger.error(f"Error getting clusters: {str(e)}")
            return []

    def _get_cluster_creation_time(self, cluster_name: str) -> str:
        """Get the creation time of a cluster."""
        try:
            # Try to get the creation time of the first node
            kubectl_cmd = [
                'kubectl', 'get', 'nodes',
                '--context', f'kind-{cluster_name}',
                '--no-headers',
                '-o', 'custom-columns=CREATED:.metadata.creationTimestamp'
            ]

            result = subprocess.run(
                kubectl_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            if result.returncode == 0 and result.stdout.strip():
                # Return the first creation timestamp
                return result.stdout.strip().split('\n')[0]

            # Fallback to current time if we can't get the actual creation time
            return datetime.datetime.now().isoformat()
        except Exception as e:
            logger.error(f"Error getting creation time for cluster {cluster_name}: {str(e)}")
            return datetime.datetime.now().isoformat()

    def get_cluster_status(self, environments: List[str]) -> Dict[str, Any]:
        """Get status of clusters across environments."""
        try:
            # Get list of clusters
            clusters = self.get_clusters()

            # Initialize response structure
            response = {
                "cluster_count": len(clusters),
                "node_count": sum(cluster.get("nodes", 0) for cluster in clusters),
                "cpu_usage": 0,
                "clusters": clusters,
                "environments_checked": environments,
                "nodes": []
            }

            # Get node metrics if possible
            total_cpu = 0
            total_memory = 0
            node_count = 0

            for cluster in clusters:
                cluster_name = cluster.get("name")
                try:
                    # Get node metrics using kubectl top
                    kubectl_cmd = [
                        'kubectl', 'top', 'nodes',
                        '--context', f'kind-{cluster_name}'
                    ]

                    metrics_result = subprocess.run(
                        kubectl_cmd,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True
                    )

                    if metrics_result.returncode == 0:
                        # Parse metrics output
                        lines = metrics_result.stdout.strip().split('\n')
                        if len(lines) > 1:  # Skip header
                            for line in lines[1:]:
                                parts = line.split()
                                if len(parts) >= 5:
                                    node_name = parts[0]
                                    cpu_usage = int(parts[2].rstrip('%'))
                                    memory_usage = int(parts[4].rstrip('%'))

                                    # Add to totals
                                    total_cpu += cpu_usage
                                    total_memory += memory_usage
                                    node_count += 1

                                    # Add node info
                                    response["nodes"].append({
                                        "name": node_name,
                                        "role": "control-plane" if "control-plane" in node_name else "worker",
                                        "status": "Ready",
                                        "cpu": cpu_usage,
                                        "memory": memory_usage,
                                        "disk": 0,  # Not available from kubectl top
                                        "version": self._get_node_version(cluster_name, node_name)
                                    })
                except Exception as e:
                    logger.error(f"Error getting metrics for cluster {cluster_name}: {str(e)}")

            # Calculate averages
            if node_count > 0:
                response["cpu_usage"] = round(total_cpu / node_count)
                response["memory_usage"] = round(total_memory / node_count)

                # Add overall metrics
                response["overall"] = {
                    "cpu": response["cpu_usage"],
                    "memory": response["memory_usage"],
                    "storage": 0  # Not available from kubectl top
                }

            return response
        except Exception as e:
            logger.error(f"Error in get_cluster_status: {str(e)}")
            # Return basic structure with clusters
            return {
                "cluster_count": len(self.get_clusters()),
                "node_count": 0,
                "cpu_usage": 0,
                "clusters": self.get_clusters(),
                "environments_checked": environments,
                "nodes": []
            }

    def get_cluster_details(self, cluster_name: str) -> Dict[str, Any]:
        """Get comprehensive details for a specific cluster."""
        try:
            if not self.cluster_exists(cluster_name):
                raise ValueError(f"Cluster {cluster_name} does not exist")

            context = f"kind-{cluster_name}"

            # Get cluster info
            cluster_info_cmd = [
                'kubectl', 'cluster-info', '--context', context
            ]

            cluster_info_result = subprocess.run(
                cluster_info_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            # Get Kubernetes version
            version_cmd = [
                'kubectl', 'version', '--context', context, '-o', 'json'
            ]

            version_result = subprocess.run(
                version_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            version_info = {}
            if version_result.returncode == 0:
                try:
                    version_data = json.loads(version_result.stdout)
                    version_info = {
                        "client_version": version_data.get("clientVersion", {}).get("gitVersion", "Unknown"),
                        "server_version": version_data.get("serverVersion", {}).get("gitVersion", "Unknown")
                    }
                except json.JSONDecodeError:
                    version_info = {"client_version": "Unknown", "server_version": "Unknown"}

            # Get cluster status
            cluster_status = self._get_cluster_status_simple(cluster_name)

            return {
                "name": cluster_name,
                "status": cluster_status,
                "version": version_info,
                "cluster_info": cluster_info_result.stdout if cluster_info_result.returncode == 0 else "Unable to fetch cluster info",
                "created": self._get_cluster_creation_time(cluster_name),
                "context": context
            }

        except Exception as e:
            logger.error(f"Error getting cluster details for {cluster_name}: {str(e)}")
            return {
                "name": cluster_name,
                "status": "Unknown",
                "version": {"client_version": "Unknown", "server_version": "Unknown"},
                "cluster_info": "Error fetching cluster info",
                "created": datetime.datetime.now().isoformat(),
                "context": f"kind-{cluster_name}",
                "error": str(e)
            }

    def get_cluster_nodes_detailed(self, cluster_name: str) -> Dict[str, Any]:
        """Get detailed information about cluster nodes."""
        try:
            if not self.cluster_exists(cluster_name):
                raise ValueError(f"Cluster {cluster_name} does not exist")

            context = f"kind-{cluster_name}"

            # Get nodes with detailed info
            nodes_cmd = [
                'kubectl', 'get', 'nodes', '--context', context, '-o', 'json'
            ]

            nodes_result = subprocess.run(
                nodes_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            nodes_data = []
            if nodes_result.returncode == 0:
                try:
                    nodes_json = json.loads(nodes_result.stdout)
                    for node in nodes_json.get("items", []):
                        node_info = self._parse_node_info(node)

                        # Get node metrics if available
                        metrics = self._get_node_metrics(cluster_name, node_info["name"])
                        if metrics:
                            node_info.update(metrics)

                        nodes_data.append(node_info)

                except json.JSONDecodeError as e:
                    logger.error(f"Error parsing nodes JSON: {str(e)}")

            return {
                "cluster_name": cluster_name,
                "node_count": len(nodes_data),
                "nodes": nodes_data
            }

        except Exception as e:
            logger.error(f"Error getting detailed nodes for {cluster_name}: {str(e)}")
            return {
                "cluster_name": cluster_name,
                "node_count": 0,
                "nodes": [],
                "error": str(e)
            }

    def _parse_node_info(self, node_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse node information from kubectl output."""
        metadata = node_data.get("metadata", {})
        status = node_data.get("status", {})

        # Determine node role
        labels = metadata.get("labels", {})
        role = "worker"
        if "node-role.kubernetes.io/control-plane" in labels:
            role = "control-plane"
        elif "node-role.kubernetes.io/master" in labels:
            role = "control-plane"

        # Get node conditions
        conditions = status.get("conditions", [])
        ready_condition = next((c for c in conditions if c.get("type") == "Ready"), {})
        ready = ready_condition.get("status") == "True"

        # Get node info
        node_info = status.get("nodeInfo", {})

        # Get creation time
        creation_time = metadata.get("creationTimestamp", "")
        age = self._calculate_age(creation_time) if creation_time else "Unknown"

        return {
            "name": metadata.get("name", "Unknown"),
            "role": role,
            "status": "Ready" if ready else "NotReady",
            "ready": ready,
            "age": age,
            "version": node_info.get("kubeletVersion", "Unknown"),
            "os": f"{node_info.get('osImage', 'Unknown')} ({node_info.get('architecture', 'Unknown')})",
            "kernel": node_info.get("kernelVersion", "Unknown"),
            "container_runtime": node_info.get("containerRuntimeVersion", "Unknown"),
            "conditions": conditions,
            "labels": labels,
            "annotations": metadata.get("annotations", {}),
            "creation_timestamp": creation_time
        }

    def _get_node_metrics(self, cluster_name: str, node_name: str) -> Dict[str, Any]:
        """Get resource metrics for a specific node."""
        try:
            context = f"kind-{cluster_name}"

            # Try to get node metrics
            metrics_cmd = [
                'kubectl', 'top', 'node', node_name, '--context', context, '--no-headers'
            ]

            metrics_result = subprocess.run(
                metrics_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            if metrics_result.returncode == 0:
                # Parse metrics output
                lines = metrics_result.stdout.strip().split('\n')
                if lines and lines[0]:
                    parts = lines[0].split()
                    if len(parts) >= 5:
                        return {
                            "cpu_usage": parts[1],
                            "cpu_percentage": parts[2],
                            "memory_usage": parts[3],
                            "memory_percentage": parts[4]
                        }

            return {}

        except Exception as e:
            logger.debug(f"Could not get metrics for node {node_name}: {str(e)}")
            return {}

    def _calculate_age(self, creation_timestamp: str) -> str:
        """Calculate age from creation timestamp."""
        try:
            # Parse ISO timestamp
            created = datetime.datetime.fromisoformat(creation_timestamp.replace('Z', '+00:00'))
            now = datetime.datetime.now(datetime.timezone.utc)
            delta = now - created

            days = delta.days
            hours = delta.seconds // 3600
            minutes = (delta.seconds % 3600) // 60

            if days > 0:
                return f"{days}d"
            elif hours > 0:
                return f"{hours}h"
            else:
                return f"{minutes}m"

        except Exception:
            return "Unknown"

    def _get_cluster_status_simple(self, cluster_name: str) -> str:
        """Get simple cluster status."""
        try:
            if not self.cluster_exists(cluster_name):
                return "Not Found"

            context = f"kind-{cluster_name}"

            # Try to get cluster info to check if it's running
            cluster_info_cmd = [
                'kubectl', 'cluster-info', '--context', context
            ]

            result = subprocess.run(
                cluster_info_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                return "Running"
            else:
                return "Error"

        except subprocess.TimeoutExpired:
            return "Timeout"
        except Exception as e:
            logger.debug(f"Error getting cluster status for {cluster_name}: {str(e)}")
            return "Unknown"

    def _get_cluster_creation_time(self, cluster_name: str) -> str:
        """Get cluster creation time."""
        try:
            # For Kind clusters, we can try to get the creation time from the container
            result = subprocess.run(
                ['docker', 'inspect', f'{cluster_name}-control-plane', '--format', '{{.Created}}'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            if result.returncode == 0:
                return result.stdout.strip()
            else:
                # Fallback to current time
                return datetime.datetime.now().isoformat()

        except Exception:
            return datetime.datetime.now().isoformat()

    def get_cluster_health(self, cluster_name: str) -> Dict[str, Any]:
        """Get cluster health information including component status."""
        try:
            if not self.cluster_exists(cluster_name):
                raise ValueError(f"Cluster {cluster_name} does not exist")

            context = f"kind-{cluster_name}"

            # Get component status
            components_cmd = [
                'kubectl', 'get', 'componentstatuses', '--context', context, '-o', 'json'
            ]

            components_result = subprocess.run(
                components_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            components = []
            if components_result.returncode == 0:
                try:
                    components_json = json.loads(components_result.stdout)
                    for comp in components_json.get("items", []):
                        comp_info = {
                            "name": comp.get("metadata", {}).get("name", "Unknown"),
                            "conditions": comp.get("conditions", [])
                        }
                        # Determine health status
                        healthy = all(c.get("status") == "True" for c in comp_info["conditions"] if c.get("type") == "Healthy")
                        comp_info["healthy"] = healthy
                        comp_info["status"] = "Healthy" if healthy else "Unhealthy"
                        components.append(comp_info)
                except json.JSONDecodeError:
                    logger.error("Error parsing component status JSON")

            # Get system pods status
            system_pods_cmd = [
                'kubectl', 'get', 'pods', '-n', 'kube-system', '--context', context, '-o', 'json'
            ]

            system_pods_result = subprocess.run(
                system_pods_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            system_pods = []
            if system_pods_result.returncode == 0:
                try:
                    pods_json = json.loads(system_pods_result.stdout)
                    for pod in pods_json.get("items", []):
                        pod_info = self._parse_pod_info(pod)
                        system_pods.append(pod_info)
                except json.JSONDecodeError:
                    logger.error("Error parsing system pods JSON")

            # Calculate overall health
            healthy_components = sum(1 for c in components if c.get("healthy", False))
            healthy_pods = sum(1 for p in system_pods if p.get("status") == "Running")

            overall_health = "Healthy"
            if len(components) > 0 and healthy_components < len(components):
                overall_health = "Degraded"
            if len(system_pods) > 0 and healthy_pods < len(system_pods) * 0.8:  # 80% threshold
                overall_health = "Degraded"

            return {
                "cluster_name": cluster_name,
                "overall_health": overall_health,
                "components": components,
                "system_pods": system_pods,
                "summary": {
                    "total_components": len(components),
                    "healthy_components": healthy_components,
                    "total_system_pods": len(system_pods),
                    "healthy_system_pods": healthy_pods
                }
            }

        except Exception as e:
            logger.error(f"Error getting cluster health for {cluster_name}: {str(e)}")
            return {
                "cluster_name": cluster_name,
                "overall_health": "Unknown",
                "components": [],
                "system_pods": [],
                "summary": {
                    "total_components": 0,
                    "healthy_components": 0,
                    "total_system_pods": 0,
                    "healthy_system_pods": 0
                },
                "error": str(e)
            }

    def _parse_pod_info(self, pod_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse pod information from kubectl output."""
        metadata = pod_data.get("metadata", {})
        status = pod_data.get("status", {})
        spec = pod_data.get("spec", {})

        # Get pod phase
        phase = status.get("phase", "Unknown")

        # Get container statuses
        container_statuses = status.get("containerStatuses", [])
        ready_containers = sum(1 for c in container_statuses if c.get("ready", False))
        total_containers = len(container_statuses)

        # Get creation time
        creation_time = metadata.get("creationTimestamp", "")
        age = self._calculate_age(creation_time) if creation_time else "Unknown"

        return {
            "name": metadata.get("name", "Unknown"),
            "namespace": metadata.get("namespace", "Unknown"),
            "status": phase,
            "ready": f"{ready_containers}/{total_containers}",
            "age": age,
            "node": spec.get("nodeName", "Unknown"),
            "creation_timestamp": creation_time,
            "labels": metadata.get("labels", {}),
            "containers": [c.get("name") for c in spec.get("containers", [])]
        }

    def get_cluster_resources(self, cluster_name: str) -> Dict[str, Any]:
        """Get resource utilization across namespaces."""
        try:
            if not self.cluster_exists(cluster_name):
                raise ValueError(f"Cluster {cluster_name} does not exist")

            context = f"kind-{cluster_name}"

            # Get all namespaces
            namespaces_cmd = [
                'kubectl', 'get', 'namespaces', '--context', context, '-o', 'json'
            ]

            namespaces_result = subprocess.run(
                namespaces_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            namespace_resources = []
            if namespaces_result.returncode == 0:
                try:
                    namespaces_json = json.loads(namespaces_result.stdout)
                    for ns in namespaces_json.get("items", []):
                        ns_name = ns.get("metadata", {}).get("name", "Unknown")

                        # Get resource usage for this namespace
                        ns_resources = self._get_namespace_resources(cluster_name, ns_name)
                        namespace_resources.append(ns_resources)

                except json.JSONDecodeError:
                    logger.error("Error parsing namespaces JSON")

            # Calculate totals
            total_pods = sum(ns.get("pod_count", 0) for ns in namespace_resources)
            total_services = sum(ns.get("service_count", 0) for ns in namespace_resources)
            total_deployments = sum(ns.get("deployment_count", 0) for ns in namespace_resources)

            return {
                "cluster_name": cluster_name,
                "namespaces": namespace_resources,
                "summary": {
                    "total_namespaces": len(namespace_resources),
                    "total_pods": total_pods,
                    "total_services": total_services,
                    "total_deployments": total_deployments
                }
            }

        except Exception as e:
            logger.error(f"Error getting cluster resources for {cluster_name}: {str(e)}")
            return {
                "cluster_name": cluster_name,
                "namespaces": [],
                "summary": {
                    "total_namespaces": 0,
                    "total_pods": 0,
                    "total_services": 0,
                    "total_deployments": 0
                },
                "error": str(e)
            }

    def _get_namespace_resources(self, cluster_name: str, namespace: str) -> Dict[str, Any]:
        """Get resource information for a specific namespace."""
        try:
            context = f"kind-{cluster_name}"

            # Get pods in namespace
            pods_cmd = [
                'kubectl', 'get', 'pods', '-n', namespace, '--context', context, '-o', 'json'
            ]

            pods_result = subprocess.run(
                pods_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            pod_count = 0
            running_pods = 0
            if pods_result.returncode == 0:
                try:
                    pods_json = json.loads(pods_result.stdout)
                    pods = pods_json.get("items", [])
                    pod_count = len(pods)
                    running_pods = sum(1 for p in pods if p.get("status", {}).get("phase") == "Running")
                except json.JSONDecodeError:
                    pass

            # Get services in namespace
            services_cmd = [
                'kubectl', 'get', 'services', '-n', namespace, '--context', context, '-o', 'json'
            ]

            services_result = subprocess.run(
                services_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            service_count = 0
            if services_result.returncode == 0:
                try:
                    services_json = json.loads(services_result.stdout)
                    service_count = len(services_json.get("items", []))
                except json.JSONDecodeError:
                    pass

            # Get deployments in namespace
            deployments_cmd = [
                'kubectl', 'get', 'deployments', '-n', namespace, '--context', context, '-o', 'json'
            ]

            deployments_result = subprocess.run(
                deployments_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            deployment_count = 0
            if deployments_result.returncode == 0:
                try:
                    deployments_json = json.loads(deployments_result.stdout)
                    deployment_count = len(deployments_json.get("items", []))
                except json.JSONDecodeError:
                    pass

            return {
                "name": namespace,
                "pod_count": pod_count,
                "running_pods": running_pods,
                "service_count": service_count,
                "deployment_count": deployment_count,
                "status": "Active"  # Namespaces are typically active if they exist
            }

        except Exception as e:
            logger.debug(f"Error getting resources for namespace {namespace}: {str(e)}")
            return {
                "name": namespace,
                "pod_count": 0,
                "running_pods": 0,
                "service_count": 0,
                "deployment_count": 0,
                "status": "Unknown",
                "error": str(e)
            }

    def get_cluster_network_info(self, cluster_name: str) -> Dict[str, Any]:
        """Get network configuration and status."""
        try:
            if not self.cluster_exists(cluster_name):
                raise ValueError(f"Cluster {cluster_name} does not exist")

            context = f"kind-{cluster_name}"

            # Get services
            services_cmd = [
                'kubectl', 'get', 'services', '--all-namespaces', '--context', context, '-o', 'json'
            ]

            services_result = subprocess.run(
                services_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            services = []
            if services_result.returncode == 0:
                try:
                    services_json = json.loads(services_result.stdout)
                    for svc in services_json.get("items", []):
                        svc_info = self._parse_service_info(svc)
                        services.append(svc_info)
                except json.JSONDecodeError:
                    logger.error("Error parsing services JSON")

            # Get ingresses
            ingresses_cmd = [
                'kubectl', 'get', 'ingresses', '--all-namespaces', '--context', context, '-o', 'json'
            ]

            ingresses_result = subprocess.run(
                ingresses_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            ingresses = []
            if ingresses_result.returncode == 0:
                try:
                    ingresses_json = json.loads(ingresses_result.stdout)
                    for ing in ingresses_json.get("items", []):
                        ing_info = self._parse_ingress_info(ing)
                        ingresses.append(ing_info)
                except json.JSONDecodeError:
                    logger.error("Error parsing ingresses JSON")

            return {
                "cluster_name": cluster_name,
                "services": services,
                "ingresses": ingresses,
                "summary": {
                    "total_services": len(services),
                    "total_ingresses": len(ingresses),
                    "cluster_ip_services": sum(1 for s in services if s.get("type") == "ClusterIP"),
                    "nodeport_services": sum(1 for s in services if s.get("type") == "NodePort"),
                    "loadbalancer_services": sum(1 for s in services if s.get("type") == "LoadBalancer")
                }
            }

        except Exception as e:
            logger.error(f"Error getting network info for {cluster_name}: {str(e)}")
            return {
                "cluster_name": cluster_name,
                "services": [],
                "ingresses": [],
                "summary": {
                    "total_services": 0,
                    "total_ingresses": 0,
                    "cluster_ip_services": 0,
                    "nodeport_services": 0,
                    "loadbalancer_services": 0
                },
                "error": str(e)
            }

    def _parse_service_info(self, service_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse service information from kubectl output."""
        metadata = service_data.get("metadata", {})
        spec = service_data.get("spec", {})

        return {
            "name": metadata.get("name", "Unknown"),
            "namespace": metadata.get("namespace", "Unknown"),
            "type": spec.get("type", "ClusterIP"),
            "cluster_ip": spec.get("clusterIP", "None"),
            "external_ip": spec.get("externalIPs", []),
            "ports": spec.get("ports", []),
            "selector": spec.get("selector", {}),
            "age": self._calculate_age(metadata.get("creationTimestamp", ""))
        }

    def _parse_ingress_info(self, ingress_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse ingress information from kubectl output."""
        metadata = ingress_data.get("metadata", {})
        spec = ingress_data.get("spec", {})
        status = ingress_data.get("status", {})

        return {
            "name": metadata.get("name", "Unknown"),
            "namespace": metadata.get("namespace", "Unknown"),
            "hosts": [rule.get("host", "*") for rule in spec.get("rules", [])],
            "paths": [path.get("path", "/") for rule in spec.get("rules", []) for path in rule.get("http", {}).get("paths", [])],
            "load_balancer": status.get("loadBalancer", {}),
            "age": self._calculate_age(metadata.get("creationTimestamp", ""))
        }

    def get_cluster_storage_info(self, cluster_name: str) -> Dict[str, Any]:
        """Get storage classes and persistent volume information."""
        try:
            if not self.cluster_exists(cluster_name):
                raise ValueError(f"Cluster {cluster_name} does not exist")

            context = f"kind-{cluster_name}"

            # Get storage classes
            sc_cmd = [
                'kubectl', 'get', 'storageclasses', '--context', context, '-o', 'json'
            ]

            sc_result = subprocess.run(
                sc_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            storage_classes = []
            if sc_result.returncode == 0:
                try:
                    sc_json = json.loads(sc_result.stdout)
                    for sc in sc_json.get("items", []):
                        sc_info = {
                            "name": sc.get("metadata", {}).get("name", "Unknown"),
                            "provisioner": sc.get("provisioner", "Unknown"),
                            "reclaim_policy": sc.get("reclaimPolicy", "Unknown"),
                            "volume_binding_mode": sc.get("volumeBindingMode", "Unknown"),
                            "default": sc.get("metadata", {}).get("annotations", {}).get("storageclass.kubernetes.io/is-default-class") == "true"
                        }
                        storage_classes.append(sc_info)
                except json.JSONDecodeError:
                    logger.error("Error parsing storage classes JSON")

            # Get persistent volumes
            pv_cmd = [
                'kubectl', 'get', 'pv', '--context', context, '-o', 'json'
            ]

            pv_result = subprocess.run(
                pv_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            persistent_volumes = []
            if pv_result.returncode == 0:
                try:
                    pv_json = json.loads(pv_result.stdout)
                    for pv in pv_json.get("items", []):
                        pv_info = {
                            "name": pv.get("metadata", {}).get("name", "Unknown"),
                            "capacity": pv.get("spec", {}).get("capacity", {}).get("storage", "Unknown"),
                            "access_modes": pv.get("spec", {}).get("accessModes", []),
                            "reclaim_policy": pv.get("spec", {}).get("persistentVolumeReclaimPolicy", "Unknown"),
                            "status": pv.get("status", {}).get("phase", "Unknown"),
                            "claim": pv.get("spec", {}).get("claimRef", {}).get("name", "None"),
                            "storage_class": pv.get("spec", {}).get("storageClassName", "None")
                        }
                        persistent_volumes.append(pv_info)
                except json.JSONDecodeError:
                    logger.error("Error parsing persistent volumes JSON")

            # Get persistent volume claims
            pvc_cmd = [
                'kubectl', 'get', 'pvc', '--all-namespaces', '--context', context, '-o', 'json'
            ]

            pvc_result = subprocess.run(
                pvc_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            persistent_volume_claims = []
            if pvc_result.returncode == 0:
                try:
                    pvc_json = json.loads(pvc_result.stdout)
                    for pvc in pvc_json.get("items", []):
                        pvc_info = {
                            "name": pvc.get("metadata", {}).get("name", "Unknown"),
                            "namespace": pvc.get("metadata", {}).get("namespace", "Unknown"),
                            "status": pvc.get("status", {}).get("phase", "Unknown"),
                            "volume": pvc.get("spec", {}).get("volumeName", "None"),
                            "capacity": pvc.get("status", {}).get("capacity", {}).get("storage", "Unknown"),
                            "access_modes": pvc.get("spec", {}).get("accessModes", []),
                            "storage_class": pvc.get("spec", {}).get("storageClassName", "None")
                        }
                        persistent_volume_claims.append(pvc_info)
                except json.JSONDecodeError:
                    logger.error("Error parsing persistent volume claims JSON")

            return {
                "cluster_name": cluster_name,
                "storage_classes": storage_classes,
                "persistent_volumes": persistent_volumes,
                "persistent_volume_claims": persistent_volume_claims,
                "summary": {
                    "total_storage_classes": len(storage_classes),
                    "total_persistent_volumes": len(persistent_volumes),
                    "total_persistent_volume_claims": len(persistent_volume_claims),
                    "bound_pvs": sum(1 for pv in persistent_volumes if pv.get("status") == "Bound"),
                    "bound_pvcs": sum(1 for pvc in persistent_volume_claims if pvc.get("status") == "Bound")
                }
            }

        except Exception as e:
            logger.error(f"Error getting storage info for {cluster_name}: {str(e)}")
            return {
                "cluster_name": cluster_name,
                "storage_classes": [],
                "persistent_volumes": [],
                "persistent_volume_claims": [],
                "summary": {
                    "total_storage_classes": 0,
                    "total_persistent_volumes": 0,
                    "total_persistent_volume_claims": 0,
                    "bound_pvs": 0,
                    "bound_pvcs": 0
                },
                "error": str(e)
            }

    def get_cluster_events(self, cluster_name: str, limit: int = 100) -> Dict[str, Any]:
        """Get recent cluster events and logs."""
        try:
            if not self.cluster_exists(cluster_name):
                raise ValueError(f"Cluster {cluster_name} does not exist")

            context = f"kind-{cluster_name}"

            # Get events from all namespaces
            events_cmd = [
                'kubectl', 'get', 'events', '--all-namespaces', '--context', context,
                '--sort-by=.metadata.creationTimestamp', '-o', 'json'
            ]

            events_result = subprocess.run(
                events_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            events = []
            if events_result.returncode == 0:
                try:
                    events_json = json.loads(events_result.stdout)
                    for event in events_json.get("items", [])[-limit:]:  # Get last N events
                        event_info = {
                            "namespace": event.get("metadata", {}).get("namespace", "Unknown"),
                            "name": event.get("metadata", {}).get("name", "Unknown"),
                            "type": event.get("type", "Unknown"),
                            "reason": event.get("reason", "Unknown"),
                            "message": event.get("message", "Unknown"),
                            "source": event.get("source", {}).get("component", "Unknown"),
                            "object": {
                                "kind": event.get("involvedObject", {}).get("kind", "Unknown"),
                                "name": event.get("involvedObject", {}).get("name", "Unknown"),
                                "namespace": event.get("involvedObject", {}).get("namespace", "Unknown")
                            },
                            "first_timestamp": event.get("firstTimestamp", ""),
                            "last_timestamp": event.get("lastTimestamp", ""),
                            "count": event.get("count", 1),
                            "age": self._calculate_age(event.get("metadata", {}).get("creationTimestamp", ""))
                        }
                        events.append(event_info)
                except json.JSONDecodeError:
                    logger.error("Error parsing events JSON")

            # Sort events by timestamp (most recent first)
            events.sort(key=lambda x: x.get("last_timestamp", ""), reverse=True)

            # Categorize events
            warning_events = [e for e in events if e.get("type") == "Warning"]
            normal_events = [e for e in events if e.get("type") == "Normal"]

            return {
                "cluster_name": cluster_name,
                "events": events,
                "summary": {
                    "total_events": len(events),
                    "warning_events": len(warning_events),
                    "normal_events": len(normal_events),
                    "recent_warnings": warning_events[:10]  # Last 10 warnings
                }
            }

        except Exception as e:
            logger.error(f"Error getting events for {cluster_name}: {str(e)}")
            return {
                "cluster_name": cluster_name,
                "events": [],
                "summary": {
                    "total_events": 0,
                    "warning_events": 0,
                    "normal_events": 0,
                    "recent_warnings": []
                },
                "error": str(e)
            }

    def get_cluster_workloads(self, cluster_name: str) -> Dict[str, Any]:
        """Get comprehensive workload information."""
        try:
            if not self.cluster_exists(cluster_name):
                raise ValueError(f"Cluster {cluster_name} does not exist")

            context = f"kind-{cluster_name}"

            # Get all pods
            pods_cmd = [
                'kubectl', 'get', 'pods', '--all-namespaces', '--context', context, '-o', 'json'
            ]

            pods_result = subprocess.run(
                pods_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            pods = []
            if pods_result.returncode == 0:
                try:
                    pods_json = json.loads(pods_result.stdout)
                    for pod in pods_json.get("items", []):
                        pod_info = self._parse_pod_info(pod)
                        pods.append(pod_info)
                except json.JSONDecodeError:
                    logger.error("Error parsing pods JSON")

            # Get all deployments
            deployments_cmd = [
                'kubectl', 'get', 'deployments', '--all-namespaces', '--context', context, '-o', 'json'
            ]

            deployments_result = subprocess.run(
                deployments_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            deployments = []
            if deployments_result.returncode == 0:
                try:
                    deployments_json = json.loads(deployments_result.stdout)
                    for deployment in deployments_json.get("items", []):
                        dep_info = self._parse_deployment_info(deployment)
                        deployments.append(dep_info)
                except json.JSONDecodeError:
                    logger.error("Error parsing deployments JSON")

            # Analyze workloads by namespace
            namespace_workloads = {}
            for pod in pods:
                ns = pod.get("namespace", "Unknown")
                if ns not in namespace_workloads:
                    namespace_workloads[ns] = {"pods": [], "running_pods": 0, "failed_pods": 0}
                namespace_workloads[ns]["pods"].append(pod)
                if pod.get("status") == "Running":
                    namespace_workloads[ns]["running_pods"] += 1
                elif pod.get("status") in ["Failed", "Error", "CrashLoopBackOff"]:
                    namespace_workloads[ns]["failed_pods"] += 1

            return {
                "cluster_name": cluster_name,
                "pods": pods,
                "deployments": deployments,
                "namespace_workloads": namespace_workloads,
                "summary": {
                    "total_pods": len(pods),
                    "running_pods": sum(1 for p in pods if p.get("status") == "Running"),
                    "failed_pods": sum(1 for p in pods if p.get("status") in ["Failed", "Error", "CrashLoopBackOff"]),
                    "total_deployments": len(deployments),
                    "ready_deployments": sum(1 for d in deployments if d.get("ready_replicas", 0) == d.get("replicas", 0))
                }
            }

        except Exception as e:
            logger.error(f"Error getting workloads for {cluster_name}: {str(e)}")
            return {
                "cluster_name": cluster_name,
                "pods": [],
                "deployments": [],
                "namespace_workloads": {},
                "summary": {
                    "total_pods": 0,
                    "running_pods": 0,
                    "failed_pods": 0,
                    "total_deployments": 0,
                    "ready_deployments": 0
                },
                "error": str(e)
            }

    def _parse_deployment_info(self, deployment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Parse deployment information from kubectl output."""
        metadata = deployment_data.get("metadata", {})
        spec = deployment_data.get("spec", {})
        status = deployment_data.get("status", {})

        return {
            "name": metadata.get("name", "Unknown"),
            "namespace": metadata.get("namespace", "Unknown"),
            "replicas": spec.get("replicas", 0),
            "ready_replicas": status.get("readyReplicas", 0),
            "available_replicas": status.get("availableReplicas", 0),
            "updated_replicas": status.get("updatedReplicas", 0),
            "strategy": spec.get("strategy", {}).get("type", "Unknown"),
            "age": self._calculate_age(metadata.get("creationTimestamp", "")),
            "labels": metadata.get("labels", {}),
            "selector": spec.get("selector", {})
        }

    def _get_node_version(self, cluster_name: str, node_name: str) -> str:
        """Get Kubernetes version for a node."""
        try:
            kubectl_cmd = [
                'kubectl', 'get', 'nodes', node_name,
                '--context', f'kind-{cluster_name}',
                '--no-headers',
                '-o', 'custom-columns=VERSION:.status.nodeInfo.kubeletVersion'
            ]

            result = subprocess.run(
                kubectl_cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()

            return "unknown"
        except Exception as e:
            logger.error(f"Error getting version for node {node_name}: {str(e)}")
            return "unknown"

    def get_applications(self) -> List[Dict[str, Any]]:
        """Get list of applications from Kubernetes."""
        try:
            applications = []

            # Get list of clusters
            clusters = self.get_clusters()

            for cluster in clusters:
                cluster_name = cluster.get("name")
                try:
                    # Get all namespaces
                    kubectl_cmd = [
                        'kubectl', 'get', 'namespaces',
                        '--context', f'kind-{cluster_name}',
                        '--no-headers',
                        '-o', 'custom-columns=NAME:.metadata.name'
                    ]

                    ns_result = subprocess.run(
                        kubectl_cmd,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True
                    )

                    if ns_result.returncode == 0:
                        namespaces = [ns for ns in ns_result.stdout.strip().split('\n') if ns]

                        # Skip system namespaces
                        app_namespaces = [ns for ns in namespaces if not ns.startswith('kube-') and ns != 'default']

                        for namespace in app_namespaces:
                            # Get deployments in namespace
                            deploy_cmd = [
                                'kubectl', 'get', 'deployments',
                                '--context', f'kind-{cluster_name}',
                                '-n', namespace,
                                '--no-headers',
                                '-o', 'custom-columns=NAME:.metadata.name,READY:.status.readyReplicas'
                            ]

                            deploy_result = subprocess.run(
                                deploy_cmd,
                                stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE,
                                text=True
                            )

                            if deploy_result.returncode == 0 and deploy_result.stdout.strip():
                                for line in deploy_result.stdout.strip().split('\n'):
                                    if not line:
                                        continue

                                    parts = line.split()
                                    if len(parts) >= 2:
                                        app_name = parts[0]
                                        ready = parts[1] != "None" and int(parts[1] or 0) > 0

                                        applications.append({
                                            "id": f"{cluster_name}-{namespace}-{app_name}",
                                            "name": app_name,
                                            "display_name": app_name.title(),
                                            "status": "Running" if ready else "Pending",
                                            "cluster": cluster_name,
                                            "namespace": namespace,
                                            "deployment_method": "kubectl"  # Assume kubectl as default
                                        })
                except Exception as e:
                    logger.error(f"Error getting applications for cluster {cluster_name}: {str(e)}")

            return applications
        except Exception as e:
            logger.error(f"Error getting applications: {str(e)}")
            return []


class MockDataProvider(DataProvider):
    """Mock data provider for testing and development.

    This provider returns predefined data without making actual system calls.
    """

    def __init__(self):
        """Initialize with mock data."""
        self.mock_clusters = [
            {"name": "my-kind-cluster-dev", "status": "Running"},
            {"name": "test-1", "status": "Running"}
        ]

        self.mock_applications = [
            {
                "id": "app-1",
                "name": "Airflow",
                "display_name": "Apache Airflow",
                "description": "Apache Airflow workflow management platform",
                "status": "Running",
                "version": "2.7.3",
                "cluster": "my-kind-cluster-dev",
                "namespace": "airflow",
                "deployment_method": "helm",
                "access_urls": [{"type": "ingress", "url": "http://localhost:8080/airflow"}]
            },
            {
                "id": "app-2",
                "name": "PostgreSQL",
                "display_name": "PostgreSQL Database",
                "description": "PostgreSQL database server",
                "status": "Running",
                "version": "14.1",
                "cluster": "my-kind-cluster-dev",
                "namespace": "postgres",
                "deployment_method": "kubectl",
                "access_urls": [{"type": "service", "url": "postgresql://localhost:5432"}]
            },
        ]

        self.mock_cluster_status = {
            "nodes": [
                {
                    "name": "kind-control-plane",
                    "role": "control-plane",
                    "status": "Ready",
                    "cpu": 65,
                    "memory": 45,
                    "disk": 30,
                    "version": "v1.29.2",
                }
            ],
            "overall": {
                "cpu": 42.5,
                "memory": 52.5,
                "storage": 26.25,
            }
        }

    def get_clusters(self) -> List[Dict[str, Any]]:
        """Get mock list of clusters."""
        return self.mock_clusters

    def get_cluster_status(self, environments: List[str]) -> Dict[str, Any]:
        """Get mock status of clusters across environments."""
        status = self.mock_cluster_status.copy()
        status["clusters"] = self.mock_clusters
        status["cluster_count"] = len(self.mock_clusters)
        status["environments_checked"] = environments
        return status

    def get_applications(self) -> List[Dict[str, Any]]:
        """Get mock list of applications."""
        return self.mock_applications


def get_data_provider(use_mock: bool = False) -> DataProvider:
    """Factory function to get the appropriate data provider.

    Args:
        use_mock: Whether to use mock data instead of real data

    Returns:
        DataProvider instance
    """
    if use_mock:
        logger.info("Using mock data provider")
        return MockDataProvider()
    else:
        logger.info("Using Kind data provider")
        return KindDataProvider()