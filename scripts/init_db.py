# -*- coding: utf-8 -*-
"""初始化数据库（建表 + 演示档案）。幂等，可重复运行。

正常使用无需手动执行：服务首次启动时会自动建库并播种（见 app/main.py 的 lifespan）。
本脚本保留用于显式初始化/重置后的补种。
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import Base, engine
from app.core.migration import ensure_schema
from app.bootstrap import seed_demo_data


def main():
    Base.metadata.create_all(bind=engine)
    ensure_schema(engine)
    if seed_demo_data():
        print("演示档案创建完成。")
    else:
        print("数据库已存在档案，跳过演示数据。")


if __name__ == "__main__":
    main()
