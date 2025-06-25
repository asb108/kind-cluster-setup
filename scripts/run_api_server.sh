#!/bin/bash

# Run the API server

# Add the project root to PYTHONPATH
export PYTHONPATH=$PYTHONPATH:$(pwd)

# Run the server
python src/kind_cluster_setup/api/server.py
