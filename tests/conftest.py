# -*- coding: utf-8 -*-
"""pytest 全局配置：关闭服务启动时的演示档案自动播种。

必须在任何 app.* 模块导入之前设置环境变量，因此放在根 conftest 顶部。
"""
import os

os.environ.setdefault("BUNKER_SEED_DEMO", "0")
