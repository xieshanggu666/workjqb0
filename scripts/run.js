#!/usr/bin/env node
/* eslint-disable */
/**
 * 末日地堡生存 —— 一键启动/测试入口（跨平台，无需第三方依赖）。
 *
 * 用法（通过 package.json 的 scripts 调用）：
 *   node scripts/run.js dev [uvicorn 参数...]   开发模式（--reload 热重载）
 *   node scripts/run.js start [uvicorn 参数...] 生产模式
 *   node scripts/run.js test [pytest 参数...]   运行测试
 *   node scripts/run.js init-db                 手动初始化数据库+演示档案
 *
 * 特性：
 *   - 自动优先使用项目根目录下 .venv / venv 中的 Python 解释器
 *   - dev/start 启动前预检 fastapi/uvicorn 是否安装，缺失时给出安装提示
 *   - 完整转发 stdio 与 Ctrl-C / kill 信号，退出码与子进程一致
 */
"use strict";

const { spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const HOST = process.env.HOST || "127.0.0.1";
const PORT = process.env.PORT || "8000";

/** 按优先级查找可用的 Python 解释器：项目虚拟环境 → PATH 上的 python3/python。 */
function resolvePython() {
  const exe = process.platform === "win32" ? "python.exe" : "python3";
  const candidates = [
    ...[".venv", "venv"].map((d) => path.join(ROOT, d, "bin", exe)),
    ...[".venv", "venv"].map((d) => path.join(ROOT, d, "Scripts", "python.exe")),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return process.platform === "win32" ? "python" : "python3";
}

const PYTHON = resolvePython();

/** 静默执行，返回退出码（不继承 stdio）。 */
function runQuiet(args) {
  const r = spawnSync(PYTHON, args, { cwd: ROOT, stdio: "ignore" });
  return r.status === 0;
}

/** 以前台子进程方式执行，继承 stdio 并转发信号；Promise 最终 resolve 退出码。 */
function run(args) {
  const child = spawn(PYTHON, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });

  return new Promise((resolve) => {
    child.on("exit", (code, signal) => {
      if (code !== null) resolve(code);
      else resolve(128 + (signal === "SIGINT" ? 2 : 15));
    });
    child.on("error", (err) => {
      console.error(`无法启动 Python 解释器（${PYTHON}）：${err.message}`);
      console.error("请确认已安装 Python 3.10+，或在项目根目录创建 .venv 虚拟环境。");
      resolve(1);
    });

    const forward = (signal) => {
      if (!child.killed) child.kill(signal);
    };
    process.on("SIGINT", () => forward("SIGINT"));
    process.on("SIGTERM", () => forward("SIGTERM"));
  });
}

/** 启动 uvicorn 前预检后端依赖，缺失则打印安装指引并退出。 */
function checkDeps() {
  const ok = runQuiet(["-c", "import fastapi, uvicorn, sqlalchemy, pydantic"]);
  if (ok) return true;
  console.error("[启动失败] 未检测到后端依赖。请先安装：\n");
  if (fs.existsSync(path.join(ROOT, ".venv")) || fs.existsSync(path.join(ROOT, "venv"))) {
    const pip = process.platform === "win32"
      ? "venv\\Scripts\\pip"
      : ".venv/bin/pip";
    console.error(`    ${pip} install -r requirements.txt\n`);
  } else {
    console.error("    python3 -m venv .venv");
    console.error(
      process.platform === "win32"
        ? "    .venv\\Scripts\\pip install -r requirements.txt\n"
        : "    .venv/bin/pip install -r requirements.txt\n"
    );
  }
  console.error("安装完成后重新运行本命令即可（首次启动会自动建库并创建演示档案）。");
  return false;
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);

  switch (command) {
    case "dev":
      if (!checkDeps()) process.exit(1);
      process.exit(await run([
        "-m", "uvicorn", "app.main:app",
        "--reload", "--host", HOST, "--port", PORT,
        ...rest,
      ]));
      break;
    case "start":
      if (!checkDeps()) process.exit(1);
      process.exit(await run([
        "-m", "uvicorn", "app.main:app",
        "--host", HOST, "--port", PORT,
        ...rest,
      ]));
      break;
    case "test":
      process.exit(await run([
        "-m", "pytest", "tests", "-q",
        ...rest,
      ]));
      break;
    case "init-db":
      process.exit(await run(["scripts/init_db.py", ...rest]));
      break;
    default:
      console.error("未知命令。可用：dev | start | test | init-db");
      process.exit(1);
  }
}

main();
