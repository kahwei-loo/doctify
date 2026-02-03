#!/bin/bash
# 修复 OCR 日志访问问题

echo "🔧 修复 OCR 日志访问问题..."
echo ""

# Step 1: 创建主机日志目录
echo "📁 Step 1: 创建主机日志目录"
mkdir -p backend/logs/ocr_attempts
chmod 777 backend/logs/ocr_attempts
echo "✅ 目录已创建: backend/logs/ocr_attempts"
echo ""

# Step 2: 从Docker volume复制现有日志
echo "📦 Step 2: 从 Docker volume 复制现有日志"
if docker ps | grep -q doctify-backend-dev; then
    echo "正在复制日志文件..."
    docker cp doctify-backend-dev:/app/logs/ocr_attempts/. backend/logs/ocr_attempts/ 2>/dev/null || echo "（没有现有日志或容器未运行）"
    echo "✅ 日志已复制"
else
    echo "⚠️ 容器未运行，跳过复制"
fi
echo ""

# Step 3: 备份docker-compose.yml
echo "💾 Step 3: 备份 docker-compose.yml"
cp docker-compose.yml docker-compose.yml.backup
echo "✅ 备份已创建: docker-compose.yml.backup"
echo ""

# Step 4: 修改docker-compose.yml
echo "✏️ Step 4: 修改 docker-compose.yml"
cat > docker-compose.yml.tmp << 'COMPOSE_EOF'
# 在这里插入修改后的配置
COMPOSE_EOF

# 使用sed直接修改
sed -i 's|backend_logs:/app/logs|./backend/logs:/app/logs|g' docker-compose.yml
sed -i '/^  backend_logs:/d' docker-compose.yml
sed -i '/^    driver: local$/d' docker-compose.yml

echo "✅ docker-compose.yml 已修改"
echo ""

# Step 5: 重启容器
echo "🔄 Step 5: 重启容器以应用更改"
echo "运行: docker-compose down && docker-compose up -d"
echo ""

echo "✅ 修复完成！"
echo ""
echo "📋 验证步骤:"
echo "1. 重启容器: docker-compose down && docker-compose up -d"
echo "2. 上传测试文档"
echo "3. 查看日志: ls -la backend/logs/ocr_attempts/"
echo ""
