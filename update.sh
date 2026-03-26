#!/bin/bash
# ============================================
#  欢乐三张 — 自动更新部署脚本
#  用法: ./update.sh
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔄 [1/4] 拉取最新代码..."
git fetch origin main
git reset --hard origin/main

echo ""
echo "🔨 [2/4] 重新构建镜像..."
docker compose build

echo ""
echo "♻️  [3/4] 重启容器..."
docker compose up -d

echo ""
echo "🧹 [4/4] 清理旧镜像..."
docker image prune -f

echo ""
echo "✅ 更新完成！访问 http://localhost 查看效果"
echo ""
docker compose ps
