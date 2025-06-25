import logging
import sys

def setup_logging(level=logging.INFO):
    """
    Set up logging configuration for the application.

    Args:
        level (int): The logging level (default: logging.INFO)
    """
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )

def get_logger(name: str) -> logging.Logger:
    """
    Get a logger with the specified name.

    Args:
        name (str): The name of the logger

    Returns:
        logging.Logger: A logger instance
    """
    return logging.getLogger(name)