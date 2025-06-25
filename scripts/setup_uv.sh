#!/bin/bash

# Script to set up uv and install dependencies for kind-setup project

set -e

echo "Setting up uv for kind-setup project..."

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "uv not found. Installing uv..."
    pip install uv
    echo "uv installed successfully!"
else
    echo "uv already installed. Checking for updates..."
    pip install -U uv
fi

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    uv venv
fi

echo "Activating virtual environment..."
source .venv/bin/activate

echo "Installing dependencies with uv..."
uv pip install -e .

echo "Installing development dependencies..."
uv pip install -e ".[dev]"

echo "\nSetup complete! You can now use uv for package management."
echo "See UV_MIGRATION.md for more information on using uv with this project."