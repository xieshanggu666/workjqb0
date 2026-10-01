#!/usr/bin/env node
/* eslint-disable */
/**
 * 一次性环境准备：创建 .venv 虚拟环境并安装 requirements.txt。
 *
 *   node scripts/setup.js
 *
 * 可选环境变量：
 *   PIP_INDEX_URL  指定 pip 镜像（如 https://mirrors.aliyun.com/pypi/simple/）
 *   PYTHON         指定创建 venv 用的基础解释器（默认 python3）
 */
"use strict";

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const isWin = process.platform === "win32";
const VENV_DIR = path.join(ROOT, ".venv");
const VENV_PY = isWin
  ? path.join(VENV_DIR, "Scripts", "python.exe")
  : path.join(VENV_DIR, "bin", "python");
const BASE_PY = process.env.PYTHON || (isWin ? "python" : "python3");

function run(cmd, args, opts = {}) {
  console.log(`$ ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
    ...opts,
  });
  if (r.error) {
    console.error(`执行失败：${r.error.message}`);
    process.exit(1);
  }
  return r.status ?? 1;
}

// 1) 创建虚拟环境（已存在则跳过）
if (!fs.existsSync(VENV_PY)) {
  console.log("==> 创建虚拟环境 .venv");
  const code = run(BASE_PY, ["-m", "venv", ".venv"]);
  if (code !== 0) {
    console.error("创建虚拟环境失败，请确认已安装 Python 3.10+。");
    process.exit(code);
  }
} else {
  console.log("==> .venv 已存在，跳过创建");
}

// 2) 安装/更新依赖
console.log("==> 安装 requirements.txt");
const pipArgs = ["-m", "pip", "install"];
if (!process.env.PIP_INDEX_URL && !process.env.PIP_NO_INDEX) {
  pipArgs.push("--default-timeout=120");
}
pipArgs.push("-r", "requirements.txt");
const code = run(VENV_PY, pipArgs);
if (code !== 0) process.exit(code);

console.log("\n环境准备完成。启动游戏：");
console.log("    npm run dev      （开发模式，热重载）");
console.log("    npm start        （普通模式）");
