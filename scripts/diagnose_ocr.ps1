# OCR 系统诊断工具
# 检查OCR日志系统是否正常工作

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "       OCR 系统诊断工具" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 检查1: Docker容器状态
Write-Host "[1/6] 检查 Docker 容器状态..." -ForegroundColor Yellow
$containers = docker ps --filter "name=doctify" --format "{{.Names}}: {{.Status}}"
if ($containers) {
    Write-Host "✓ 容器运行中:" -ForegroundColor Green
    $containers | ForEach-Object { Write-Host "  $_" }
} else {
    Write-Host "✗ 没有运行的容器" -ForegroundColor Red
    Write-Host "  请先运行: docker-compose up -d" -ForegroundColor Yellow
    exit
}
Write-Host ""

# 检查2: 日志目录是否存在
Write-Host "[2/6] 检查日志目录..." -ForegroundColor Yellow
$dirCheck = docker-compose exec -T doctify-backend test -d /app/logs/ocr_attempts && echo "exists" || echo "not_exists"
if ($dirCheck -match "exists") {
    Write-Host "✓ 日志目录存在: /app/logs/ocr_attempts/" -ForegroundColor Green
} else {
    Write-Host "✗ 日志目录不存在" -ForegroundColor Red
    Write-Host "  正在创建..." -ForegroundColor Yellow
    docker-compose exec -T doctify-backend mkdir -p /app/logs/ocr_attempts
    docker-compose exec -T doctify-backend chmod 777 /app/logs/ocr_attempts
    Write-Host "✓ 目录已创建" -ForegroundColor Green
}
Write-Host ""

# 检查3: 日志文件是否存在
Write-Host "[3/6] 检查日志文件..." -ForegroundColor Yellow
$logCount = docker-compose exec -T doctify-backend sh -c "ls /app/logs/ocr_attempts/*.json 2>/dev/null | wc -l"
$logCount = $logCount.Trim()
if ([int]$logCount -gt 0) {
    Write-Host "✓ 找到 $logCount 个日志文件" -ForegroundColor Green
} else {
    Write-Host "⚠ 还没有日志文件" -ForegroundColor Yellow
    Write-Host "  可能原因: 还没有上传并处理过文档" -ForegroundColor Gray
}
Write-Host ""

# 检查4: 最近的文档处理记录
Write-Host "[4/6] 检查最近的文档处理..." -ForegroundColor Yellow
$recentLogs = docker-compose logs --tail=50 doctify-celery 2>&1 | Select-String -Pattern "Processing document|OCR completed|Task.*succeeded"
if ($recentLogs) {
    Write-Host "✓ 找到最近的处理记录:" -ForegroundColor Green
    $recentLogs | Select-Object -First 3 | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} else {
    Write-Host "⚠ 没有找到最近的处理记录" -ForegroundColor Yellow
    Write-Host "  尝试上传一个测试文档" -ForegroundColor Gray
}
Write-Host ""

# 检查5: API Keys配置
Write-Host "[5/6] 检查 AI Provider API Keys..." -ForegroundColor Yellow
$envVars = docker-compose exec -T doctify-backend env | Select-String -Pattern "API_KEY"
if ($envVars) {
    Write-Host "✓ 找到配置的 API Keys:" -ForegroundColor Green
    $envVars | ForEach-Object {
        $key = $_.ToString().Split('=')[0]
        Write-Host "  $key = ***" -ForegroundColor Gray
    }
} else {
    Write-Host "✗ 没有找到 API Keys 配置" -ForegroundColor Red
    Write-Host "  请检查 .env 文件和 docker-compose.yml" -ForegroundColor Yellow
}
Write-Host ""

# 检查6: OCR Logger 模块是否存在
Write-Host "[6/6] 检查 OCR Logger 模块..." -ForegroundColor Yellow
$loggerExists = docker-compose exec -T doctify-backend test -f /app/app/utils/ocr_logger.py && echo "exists" || echo "not_exists"
if ($loggerExists -match "exists") {
    Write-Host "✓ OCR Logger 模块存在" -ForegroundColor Green
} else {
    Write-Host "✗ OCR Logger 模块不存在" -ForegroundColor Red
}
Write-Host ""

# 总结
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "诊断总结" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

if ($logCount -gt 0) {
    Write-Host ""
    Write-Host "✓ OCR 日志系统正常工作！" -ForegroundColor Green
    Write-Host ""
    Write-Host "查看日志文件:" -ForegroundColor Yellow
    Write-Host "  docker-compose exec doctify-backend ls -la /app/logs/ocr_attempts/" -ForegroundColor Gray
    Write-Host ""
    Write-Host "查看最新日志:" -ForegroundColor Yellow
    Write-Host '  docker-compose exec doctify-backend sh -c "ls -t /app/logs/ocr_attempts/*.json | head -1 | xargs cat"' -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "⚠ OCR 日志系统已就绪，但还没有日志文件" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "下一步:" -ForegroundColor Yellow
    Write-Host "  1. 在前端上传一个测试文档 (PDF/图片)" -ForegroundColor Gray
    Write-Host "  2. 等待 OCR 处理完成 (查看状态变为 'completed')" -ForegroundColor Gray
    Write-Host "  3. 重新运行此诊断脚本，应该能看到日志文件" -ForegroundColor Gray
}

Write-Host ""
Read-Host "按 Enter 退出"
