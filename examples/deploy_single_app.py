from kind_cluster_setup.commands.create import CreateCommand
from kind_cluster_setup.commands.deploy import DeployCommand
from argparse import Namespace

def main():
    # Create a Kind cluster
    create_args = Namespace(environment="dev")
    CreateCommand().execute(create_args)

    # Deploy a single app
    deploy_args = Namespace(
        environment="dev",
        apps=["airflow"],
        deployments=["helm"]
    )
    DeployCommand().execute(deploy_args)

if __name__ == "__main__":
    main()