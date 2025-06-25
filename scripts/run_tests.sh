#!/bin/bash

# Run tests for the Kind Cluster Setup application

# Add the project root to PYTHONPATH
export PYTHONPATH=$PYTHONPATH:$(pwd)

# Run the tests
python -m unittest discover tests
