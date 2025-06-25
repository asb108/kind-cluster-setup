from typing import Any, Dict, List, TextIO, Union

import yaml


def load_yaml(file_path: str, multi_doc: bool = False) -> Union[Any, List[Any]]:
    """Load YAML data from a file.

    Args:
        file_path: Path to the YAML file
        multi_doc: If True, load all documents in the file, otherwise load only the first document

    Returns:
        The loaded YAML data. If multi_doc is True, returns a list of documents.
    """
    with open(file_path, "r") as f:
        if multi_doc:
            return list(yaml.safe_load_all(f))
        else:
            return yaml.safe_load(f)


def dump_yaml(data: Any, file_path: str) -> None:
    """Dump data to a YAML file.

    Args:
        data: The data to dump
        file_path: Path to the output file
    """
    with open(file_path, "w") as f:
        yaml.dump(data, f, default_flow_style=False)


def dump_multi_yaml(data_list: List[Any], file_path: str) -> None:
    """Dump multiple documents to a YAML file.

    Args:
        data_list: List of data to dump as separate documents
        file_path: Path to the output file
    """
    with open(file_path, "w") as f:
        yaml.dump_all(data_list, f, default_flow_style=False)
