# -*- coding: utf-8 -*-
"""应用启动引导：首次启动时自动初始化演示档案（幂等）。

- 数据库中已有任意档案时跳过，因此可随服务启动反复执行。
- 测试环境通过环境变量 BUNKER_SEED_DEMO=0 关闭（见 tests/conftest.py）。
"""
from .core.config import INITIAL_RESOURCES, SURVIVAL_TARGET_DAY
from .core.database import SessionLocal
from .models import GameSession, Resident, Facility
from .services.engine import FACILITY_ZH


def seed_demo_data():
    """数据库为空时写入一个演示档案。已有档案则跳过。

    返回 True 表示本次实际创建了演示档案。
    """
    db = SessionLocal()
    try:
        if db.query(GameSession).first():
            return False
        gs = GameSession(
            name="基地一号（演示）",
            day=1,
            target_day=SURVIVAL_TARGET_DAY,
            status="running",
            resources=dict(INITIAL_RESOURCES),
            survivors=3,
            score=0,
        )
        db.add(gs)
        db.flush()
        for name, job, hp, mp in (
            ("林粤", "engineer", 90, 80),
            ("夏岚", "farmer", 88, 85),
            ("老周", "general", 92, 78),
        ):
            db.add(Resident(session_id=gs.id, name=name, job=job, health=hp, morale=mp, alive=1, joined_day=1))
        for cat in ("power", "farm", "water", "oxygen"):
            db.add(Facility(session_id=gs.id, name=FACILITY_ZH[cat], category=cat, level=1, status="active", built_day=1))
        db.commit()
        return True
    finally:
        db.close()
