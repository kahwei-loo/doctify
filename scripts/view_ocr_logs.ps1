# OCR 日志查看工具 (PowerShell)
# 使用方法: 右键 -> Run with PowerShell

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "         OCR 日志查看工具" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

function Show-Menu {
    Write-Host "请选择操作:" -ForegroundColor Yellow
    Write-Host "1. 查看所有日志文件列表"
    Write-Host "2. 查看最新的日志内容"
    Write-Host "3. 复制日志到主机 (backend/logs_exported)"
    Write-Host "4. 查看特定文档的日志"
    Write-Host "5. 退出"
    Write-Host ""
}

function List-Logs {
    Write-Host ""
    Write-Host "所有日志文件:" -ForegroundColor Green
    Write-Host "----------------------------------------"
    docker-compose exec doctify-backend ls -lh /app/logs/ocr_attempts/
    Write-Host ""
    Read-Host "按Enter继续"
}

function View-Latest {
    Write-Host ""
    Write-Host "最新日志内容:" -ForegroundColor Green
    Write-Host "----------------------------------------"
    docker-compose exec doctify-backend sh -c "ls -t /app/logs/ocr_attempts/*.json 2>/dev/null | head -1 | xargs cat"
    Write-Host ""
    Read-Host "按Enter继续"
}

function Copy-Logs {
    Write-Host ""
    Write-Host "正在复制日志..." -ForegroundColor Yellow

    if (!(Test-Path "backend\logs_exported")) {
        New-Item -ItemType Directory -Path "backend\logs_exported" | Out-Null
    }

    docker cp doctify-backend-dev:/app/logs/ocr_attempts backend/logs_exported/

    Write-Host "✓ 日志已复制到: backend\logs_exported\ocr_attempts\" -ForegroundColor Green
    Write-Host ""
    Read-Host "按Enter继续"
}

function View-Document {
    Write-Host ""
    $docId = Read-Host "请输入 document_id (36位UUID)"
    Write-Host ""
    Write-Host "文档日志:" -ForegroundColor Green
    Write-Host "----------------------------------------"
    docker-compose exec doctify-backend sh -c "cat /app/logs/ocr_attempts/ocr_${docId}_*.json 2>/dev/null"
    Write-Host ""
    Read-Host "按Enter继续"
}

# 主循环
while ($true) {
    Clear-Host
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "         OCR 日志查看工具" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""

    Show-Menu
    $choice = Read-Host "请输入选项 (1-5)"

    switch ($choice) {
        "1" { List-Logs }
        "2" { View-Latest }
        "3" { Copy-Logs }
        "4" { View-Document }
        "5" {
            Write-Host ""
            Write-Host "再见!" -ForegroundColor Cyan
            exit
        }
        default {
            Write-Host "无效选项，请重新选择" -ForegroundColor Red
            Start-Sleep -Seconds 1
        }
    }
}
