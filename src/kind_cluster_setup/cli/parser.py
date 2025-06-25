import argparse

from kind_cluster_setup.commands import (CreateCommand, DeleteCommand,
                                         DeployCommand, StatusCommand)
from kind_cluster_setup.commands.delete_app import DeleteAppCommand
from kind_cluster_setup.commands.modify import ModifyCommand


def create_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Setup and manage Kind Clusters with independent app deployments"
    )
    subparsers = parser.add_subparsers(dest="action", required=True)

    # Create subparser
    create_parser = subparsers.add_parser("create", help="Create a new Kind cluster")
    create_parser.add_argument(
        "--environment",
        choices=["dev", "qa", "staging", "prod"],
        default="dev",
        help="Environment to use",
    )
    create_parser.set_defaults(func=CreateCommand().execute)

    # Delete subparser
    delete_parser = subparsers.add_parser(
        "delete", help="Delete an existing Kind cluster"
    )
    delete_parser.add_argument(
        "--environment",
        choices=["dev", "qa", "staging", "prod"],
        default="dev",
        help="Environment to use",
    )
    delete_parser.set_defaults(func=DeleteCommand().execute)

    # Status subparser
    status_parser = subparsers.add_parser(
        "status", help="Check the status of a cluster or application"
    )
    status_parser.add_argument(
        "--environment",
        choices=["dev", "qa", "staging", "prod"],
        default="dev",
        help="Environment to use",
    )
    status_parser.add_argument(
        "--apps", nargs="+", help="Names of the apps to check status"
    )
    status_parser.add_argument(
        "--deployments",
        nargs="+",
        choices=["helm", "kubernetes"],
        help="Deployment methods used for each app",
    )
    status_parser.set_defaults(func=StatusCommand().execute)

    # Deploy subparser
    deploy_parser = subparsers.add_parser(
        "deploy", help="Deploy an application to the cluster"
    )
    deploy_parser.add_argument(
        "--environment",
        choices=["dev", "qa", "staging", "prod"],
        default="dev",
        help="Environment to use",
    )
    deploy_parser.add_argument(
        "--apps", nargs="+", required=True, help="Names of the apps to deploy"
    )
    deploy_parser.add_argument(
        "--deployments",
        nargs="+",
        choices=["helm", "kubernetes"],
        required=True,
        help="Deployment methods to use for each app",
    )
    deploy_parser.add_argument(
        "--cluster-name",
        help="Name of the cluster to deploy to (default: kind-{environment})",
    )
    deploy_parser.add_argument(
        "--expose", action="store_true", help="Expose the application as a service"
    )
    deploy_parser.add_argument(
        "--service-type",
        choices=["ClusterIP", "NodePort", "LoadBalancer"],
        default="NodePort",
        help="Type of service to create when exposing the application",
    )
    deploy_parser.add_argument(
        "--port", type=int, default=80, help="Port that the service should serve on"
    )
    deploy_parser.add_argument(
        "--target-port",
        type=int,
        default=80,
        help="Port that the container accepts traffic on",
    )
    deploy_parser.set_defaults(func=DeployCommand().execute)

    # Modify subparser
    modify_parser = subparsers.add_parser(
        "modify", help="Modify an existing application"
    )
    modify_parser.add_argument(
        "--environment",
        choices=["dev", "qa", "staging", "prod"],
        default="dev",
        help="Environment to use",
    )
    modify_parser.add_argument("--app", required=True, help="Name of the app to modify")
    modify_parser.add_argument("--image", help="New container image to use")
    modify_parser.add_argument("--replicas", type=int, help="Number of replicas to run")
    modify_parser.add_argument("--cpu-limit", help="CPU limit (e.g., '500m', '1')")
    modify_parser.add_argument(
        "--memory-limit", help="Memory limit (e.g., '512Mi', '1Gi')"
    )
    modify_parser.add_argument(
        "--cpu-request", help="CPU request (e.g., '250m', '500m')"
    )
    modify_parser.add_argument(
        "--memory-request", help="Memory request (e.g., '256Mi', '512Mi')"
    )
    modify_parser.add_argument(
        "--expose", action="store_true", help="Expose the application as a service"
    )
    modify_parser.add_argument(
        "--service-type",
        choices=["ClusterIP", "NodePort", "LoadBalancer"],
        default="NodePort",
        help="Type of service to create when exposing the application",
    )
    modify_parser.add_argument(
        "--port", type=int, default=80, help="Port that the service should serve on"
    )
    modify_parser.add_argument(
        "--target-port",
        type=int,
        default=80,
        help="Port that the container accepts traffic on",
    )
    modify_parser.set_defaults(func=ModifyCommand().execute)

    # Delete-app subparser
    delete_app_parser = subparsers.add_parser(
        "delete-app", help="Delete an application from a cluster"
    )
    delete_app_parser.add_argument(
        "--environment",
        choices=["dev", "qa", "staging", "prod"],
        default="dev",
        help="Environment to use",
    )
    delete_app_parser.add_argument(
        "--app", required=True, help="Name of the app to delete"
    )
    delete_app_parser.add_argument(
        "--force",
        action="store_true",
        help="Force deletion even if the cluster is not running",
    )
    delete_app_parser.add_argument(
        "--delete-config",
        action="store_true",
        help="Delete the application configuration files",
    )
    delete_app_parser.set_defaults(func=DeleteAppCommand().execute)

    return parser
