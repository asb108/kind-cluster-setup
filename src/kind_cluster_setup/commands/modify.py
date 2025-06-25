"""
Command for modifying an existing application.

This module provides the ModifyCommand class, which is responsible for
modifying an existing application in a Kind cluster.
"""

import os
import json
from typing import Dict, Any, Optional, List, Union
from datetime import datetime

from kind_cluster_setup.commands.base import Command
from kind_cluster_setup.core.deployment import DeploymentStrategyFactory
from kind_cluster_setup.core.command import SubprocessCommandExecutor
from kind_cluster_setup.config.config_loader import load_app_config, get_environment_config
from kind_cluster_setup.utils.logging import get_logger
from kind_cluster_setup.utils.yaml_handler import load_yaml, dump_yaml, dump_multi_yaml
from kind_cluster_setup.domain.entities import Application, Task

logger = get_logger(__name__)


class ModifyCommand(Command):
    """Command for modifying an existing application."""

    def execute(self, args) -> None:
        """
        Execute the modify command.

        Args:
            args: Command-line arguments
        """
        logger.info(f"Modifying application {args.app} in {args.environment} environment")

        # Create a task to track the modification
        # Convert args to a serializable dict
        args_dict = {}
        for key, value in vars(args).items():
            if not key.startswith('_') and not callable(value):
                args_dict[key] = value

        task = Task(
            name=f"modify-{args.app}",
            description=f"Modify application {args.app} in {args.environment} environment",
            command="modify",
            args=args_dict
        )
        self._task_repo.save(task)

        try:
            # Find the application
            application = self._app_repo.find_by_name(args.app)
            if not application:
                error_msg = f"Application {args.app} not found"
                logger.error(error_msg)
                self._update_task_status(task, "failed", {"error": error_msg})
                return

            # Find the cluster
            cluster = self._cluster_repo.find_by_id(application.cluster_id)
            if not cluster:
                error_msg = f"Cluster with ID {application.cluster_id} not found"
                logger.error(error_msg)
                self._update_task_status(task, "failed", {"error": error_msg})
                return

            # Check if the cluster is running
            if cluster.status != "running":
                error_msg = f"Cluster {cluster.name} is not running (status: {cluster.status})"
                logger.error(error_msg)
                self._update_task_status(task, "failed", {"error": error_msg})
                return

            # Load the current application configuration
            try:
                current_config_path = self._get_app_config_path(args.app, args.environment)
                current_config = load_yaml(current_config_path, multi_doc=True)
            except Exception as e:
                error_msg = f"Failed to load current configuration for {args.app}: {str(e)}"
                logger.error(error_msg)
                self._update_task_status(task, "failed", {"error": error_msg})
                return

            # Apply modifications
            modified_config = self._apply_modifications(current_config, args)

            # Save the modified configuration
            try:
                if isinstance(modified_config, list):
                    dump_multi_yaml(modified_config, current_config_path)
                else:
                    dump_yaml(modified_config, current_config_path)
                logger.info(f"Saved modified configuration for {args.app}")
            except Exception as e:
                error_msg = f"Failed to save modified configuration for {args.app}: {str(e)}"
                logger.error(error_msg)
                self._update_task_status(task, "failed", {"error": error_msg})
                return

            # Get environment configuration
            env_config = get_environment_config(args.environment)

            # Deploy the modified application
            try:
                # Create deployment strategy
                executor = SubprocessCommandExecutor()
                strategy_factory = DeploymentStrategyFactory.create_default_factory(executor)
                strategy = strategy_factory.create_strategy(application.deployment_method)

                # Prepare values for deployment
                values = {}

                # Add expose parameters if requested
                if hasattr(args, 'expose') and args.expose:
                    values['expose_service'] = True
                    values['service_type'] = args.service_type
                    values['service_port'] = args.port
                    values['target_port'] = args.target_port

                # Deploy the application
                result = strategy.deploy(
                    app=args.app,
                    app_config=modified_config,
                    env_config=env_config,
                    cluster_name=cluster.name,
                    values=values
                )

                if not result:
                    error_msg = f"Failed to deploy modified application {args.app}"
                    logger.error(error_msg)
                    self._update_task_status(task, "failed", {"error": error_msg})
                    return

                # Update the application entity
                application.config = modified_config[0] if isinstance(modified_config, list) else modified_config
                application.updated_at = datetime.now()
                application.status = "deployed"
                self._app_repo.save(application)

                logger.info(f"Successfully modified and deployed application {args.app}")
                self._update_task_status(task, "completed", {"result": "success"})

            except Exception as e:
                error_msg = f"Failed to deploy modified application {args.app}: {str(e)}"
                logger.error(error_msg)
                self._update_task_status(task, "failed", {"error": error_msg})

        except Exception as e:
            error_msg = f"Failed to modify application {args.app}: {str(e)}"
            logger.error(error_msg)
            self._update_task_status(task, "failed", {"error": error_msg})

    def _apply_modifications(self, config: Union[Dict[str, Any], List[Dict[str, Any]]], args) -> Union[Dict[str, Any], List[Dict[str, Any]]]:
        """
        Apply modifications to the application configuration.

        Args:
            config: Current application configuration
            args: Command-line arguments with modifications

        Returns:
            Modified application configuration
        """
        # Handle both single document and multi-document configs
        if isinstance(config, list):
            # For multi-document configs, find the Deployment document
            for i, doc in enumerate(config):
                if doc.get('kind') == 'Deployment':
                    config[i] = self._modify_deployment(doc, args)
                elif doc.get('kind') == 'Service' and hasattr(args, 'service_type'):
                    config[i] = self._modify_service(doc, args)
            return config
        else:
            # For single document config
            if config.get('kind') == 'Deployment':
                return self._modify_deployment(config, args)
            return config

    def _modify_deployment(self, deployment: Dict[str, Any], args) -> Dict[str, Any]:
        """
        Modify a Kubernetes Deployment configuration.

        Args:
            deployment: Deployment configuration
            args: Command-line arguments with modifications

        Returns:
            Modified Deployment configuration
        """
        # Update image if specified
        if hasattr(args, 'image') and args.image:
            containers = deployment.get('spec', {}).get('template', {}).get('spec', {}).get('containers', [])
            if containers:
                containers[0]['image'] = args.image
                logger.info(f"Updated image to {args.image}")

        # Update replicas if specified
        if hasattr(args, 'replicas') and args.replicas is not None:
            if 'spec' not in deployment:
                deployment['spec'] = {}
            deployment['spec']['replicas'] = args.replicas
            logger.info(f"Updated replicas to {args.replicas}")

        # Update resource limits if specified
        if hasattr(args, 'cpu_limit') or hasattr(args, 'memory_limit'):
            containers = deployment.get('spec', {}).get('template', {}).get('spec', {}).get('containers', [])
            if containers:
                container = containers[0]
                if 'resources' not in container:
                    container['resources'] = {}
                if 'limits' not in container['resources']:
                    container['resources']['limits'] = {}

                if hasattr(args, 'cpu_limit') and args.cpu_limit:
                    container['resources']['limits']['cpu'] = args.cpu_limit
                    logger.info(f"Updated CPU limit to {args.cpu_limit}")

                if hasattr(args, 'memory_limit') and args.memory_limit:
                    container['resources']['limits']['memory'] = args.memory_limit
                    logger.info(f"Updated memory limit to {args.memory_limit}")

        # Update resource requests if specified
        if hasattr(args, 'cpu_request') or hasattr(args, 'memory_request'):
            containers = deployment.get('spec', {}).get('template', {}).get('spec', {}).get('containers', [])
            if containers:
                container = containers[0]
                if 'resources' not in container:
                    container['resources'] = {}
                if 'requests' not in container['resources']:
                    container['resources']['requests'] = {}

                if hasattr(args, 'cpu_request') and args.cpu_request:
                    container['resources']['requests']['cpu'] = args.cpu_request
                    logger.info(f"Updated CPU request to {args.cpu_request}")

                if hasattr(args, 'memory_request') and args.memory_request:
                    container['resources']['requests']['memory'] = args.memory_request
                    logger.info(f"Updated memory request to {args.memory_request}")

        return deployment

    def _modify_service(self, service: Dict[str, Any], args) -> Dict[str, Any]:
        """
        Modify a Kubernetes Service configuration.

        Args:
            service: Service configuration
            args: Command-line arguments with modifications

        Returns:
            Modified Service configuration
        """
        # Update service type if specified
        if hasattr(args, 'service_type') and args.service_type:
            if 'spec' not in service:
                service['spec'] = {}
            service['spec']['type'] = args.service_type
            logger.info(f"Updated service type to {args.service_type}")

        # Update port if specified
        if hasattr(args, 'port') and args.port is not None:
            if 'spec' not in service:
                service['spec'] = {}
            if 'ports' not in service['spec'] or not service['spec']['ports']:
                service['spec']['ports'] = [{}]
            service['spec']['ports'][0]['port'] = args.port
            logger.info(f"Updated service port to {args.port}")

        # Update target port if specified
        if hasattr(args, 'target_port') and args.target_port is not None:
            if 'spec' not in service:
                service['spec'] = {}
            if 'ports' not in service['spec'] or not service['spec']['ports']:
                service['spec']['ports'] = [{}]
            service['spec']['ports'][0]['targetPort'] = args.target_port
            logger.info(f"Updated service target port to {args.target_port}")

        return service

    def _get_app_config_path(self, app: str, environment: str) -> str:
        """
        Get the path to the application configuration file.

        Args:
            app: Application name
            environment: Environment name

        Returns:
            Path to the application configuration file
        """
        # Check standard paths
        paths = [
            f"applications/{app}/config/{environment}.yaml",
            f"config/apps/{environment}/{app}.yaml",
            f"applications/{app}/kubernetes/{environment}.yaml"
        ]

        for path in paths:
            if os.path.exists(path):
                return path

        # If no path exists, use the default path
        return f"applications/{app}/config/{environment}.yaml"

    def _update_task_status(self, task: Task, status: str, result: Dict[str, Any] = None) -> None:
        """
        Update the status and result of a task.

        Args:
            task: Task to update
            status: New status
            result: Task result
        """
        task.status = status
        if result:
            task.result = result
        self._task_repo.save(task)
