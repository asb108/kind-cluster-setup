from kind_cluster_setup.commands.create import CreateCommand
from kind_cluster_setup.commands.deploy import DeployCommand
from argparse import Namespace

def main():
    # Create a Kind cluster
    create_args = Namespace(environment="qa")
    CreateCommand().execute(create_args)

    # Deploy multiple apps
    deploy_args = Namespace(
        environment="qa",
        apps=["airflow", "trino"],
        deployments=["helm", "kubernetes"]
    )
    DeployCommand().execute(deploy_args)

if __name__ == "__main__":
    main()