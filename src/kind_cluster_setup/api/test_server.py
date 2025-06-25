import logging
import sys

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://localhost:3002",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


class ClusterCreate(BaseModel):
    environment: str
    worker_nodes: int


@app.post("/api/cluster/create")
async def create_cluster(cluster: ClusterCreate):
    try:
        logger.info(f"Received cluster creation request: {cluster}")
        response = {
            "status": "success",
            "message": "Test response",
            "data": cluster.dict(),
        }
        logger.info(f"Sending response: {response}")
        return JSONResponse(content=response)
    except Exception as e:
        logger.error(f"Error creating cluster: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    try:
        import uvicorn

        logger.info("Starting test server on port 8010...")
        uvicorn.run(app, host="0.0.0.0", port=8010, log_level="debug")
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        sys.exit(1)
