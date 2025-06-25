import logging
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ClusterCreate(BaseModel):
    name: str
    environment: str
    worker_nodes: int


class Application(BaseModel):
    id: int
    name: str
    status: str
    version: str
    cluster: str


class ClusterNode(BaseModel):
    name: str
    role: str
    status: str
    cpu: float
    memory: float
    disk: float
    version: str


class ClusterOverall(BaseModel):
    cpu: float
    memory: float
    storage: float


class ClusterStatus(BaseModel):
    nodes: List[ClusterNode]
    overall: ClusterOverall


@app.post("/api/cluster/create")
async def create_cluster(cluster: ClusterCreate):
    try:
        logger.info(f"Received request: {cluster}")
        return {
            "status": "success",
            "message": "Cluster created successfully",
            "data": cluster.dict(),
        }
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/apps/list")
async def list_applications():
    try:
        logger.info("Received request for applications list")
        # Mock data for demonstration
        applications = [
            {
                "id": 1,
                "name": "Airflow",
                "status": "Running",
                "version": "2.7.3",
                "cluster": "my-kind-cluster-dev",
            },
            {
                "id": 2,
                "name": "PostgreSQL",
                "status": "Running",
                "version": "14.1",
                "cluster": "my-kind-cluster-dev",
            },
        ]
        return applications
    except Exception as e:
        logger.error(f"Error getting applications: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cluster/status")
async def get_cluster_status():
    try:
        logger.info("Received request for cluster status")
        # Mock data for demonstration
        status = {
            "nodes": [
                {
                    "name": "kind-control-plane",
                    "role": "control-plane",
                    "status": "Ready",
                    "cpu": 65,
                    "memory": 45,
                    "disk": 30,
                    "version": "v1.29.2",
                }
            ],
            "overall": {
                "cpu": 42.5,
                "memory": 52.5,
                "storage": 26.25,
            },
        }
        return status
    except Exception as e:
        logger.error(f"Error getting cluster status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    logger.info("Starting server on port 8020...")
    uvicorn.run(app, host="0.0.0.0", port=8020, log_level="debug")
