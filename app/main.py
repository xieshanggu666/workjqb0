# -*- coding: utf-8 -*-
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from .core.database import Base, engine
from .core.migration import ensure_schema
from .bootstrap import seed_demo_data
from .api.router import router

BASE = Path(__file__).resolve().parent.parent
STATIC = BASE / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 首次启动自动播种演示档案（幂等）；设 BUNKER_SEED_DEMO=0 可关闭
    if os.getenv("BUNKER_SEED_DEMO", "1") not in ("0", "false", "False"):
        if seed_demo_data():
            print("首次启动：已创建演示档案「基地一号」。")
    yield


app = FastAPI(title="末日地堡生存", version="1.0.0", lifespan=lifespan)

# 先按最新模型补缺表，再为旧版数据库补齐新增列（幂等，兼容旧档案）
Base.metadata.create_all(bind=engine)
ensure_schema(engine)

app.include_router(router)


@app.get("/")
def index():
    return FileResponse(STATIC / "index.html")


app.mount("/static", StaticFiles(directory=STATIC), name="static")