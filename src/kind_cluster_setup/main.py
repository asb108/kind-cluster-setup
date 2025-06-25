"""
Main entry point for the Kind Cluster Setup application.

This module initializes the application, sets up the repositories,
and provides the main function for running the application.
"""

import os
import sys
import argparse
from typing import Dict, Any, List, Optional

from kind_cluster_setup.cli.parser import create_parser
from kind_cluster_setup.utils.logging import setup_logging, get_logger
from kind_cluster_setup.utils.constants import PROJECT_ROOT
from kind_cluster_setup.infrastructure.repositories.factory import init_repository_factory

logger = get_logger(__name__)


def setup_data_directory() -> str:
    """
    Set up the data directory for storing repository data.

    Returns:
        str: Path to the data directory
    """
    data_dir = os.path.join(PROJECT_ROOT, "data")
    os.makedirs(data_dir, exist_ok=True)
    return data_dir


def main() -> int:
    """
    Main entry point for the Kind Cluster Setup application.

    Returns:
        int: Exit code (0 for success, non-zero for failure)
    """
    try:
        # Set up logging
        setup_logging()

        # Set up the data directory
        data_dir = setup_data_directory()

        # Initialize the repository factory
        init_repository_factory(data_dir)

        # Create the argument parser
        parser = create_parser()

        # Parse the command-line arguments
        args = parser.parse_args()

        # Log the action
        if hasattr(args, 'action'):
            logger.info(f"Starting Action: {args.action}")
            logger.debug(f"Parsed arguments: {vars(args)}")

        # Execute the command
        if hasattr(args, 'func'):
            args.func(args)
        elif hasattr(args, 'command'):
            args.command.execute(args)
        else:
            parser.print_help()
            return 0

        logger.info("Action completed")
        return 0
    except KeyboardInterrupt:
        logger.info("Operation cancelled by user")
        return 130
    except Exception as e:
        logger.error(f"An error occurred: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
