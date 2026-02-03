@echo off
REM 查看Docker容器内的OCR日志
REM 使用方法: 双击运行或在命令行执行

echo ============================================
echo 📊 OCR 日志查看工具
echo ============================================
echo.

:menu
echo 请选择操作:
echo 1. 查看所有日志文件列表
echo 2. 查看最新的日志文件
echo 3. 复制所有日志到主机 (backend/logs_exported)
echo 4. 查看特定文档的日志 (需要输入document_id)
echo 5. 实时监控新日志
echo 6. 退出
echo.

set /p choice="请输入选项 (1-6): "

if "%choice%"=="1" goto list_logs
if "%choice%"=="2" goto view_latest
if "%choice%"=="3" goto copy_logs
if "%choice%"=="4" goto view_document
if "%choice%"=="5" goto monitor_logs
if "%choice%"=="6" goto end

echo 无效选项，请重新选择
goto menu

:list_logs
echo.
echo 📁 所有日志文件列表:
echo ----------------------------------------
docker-compose exec doctify-backend ls -lh /app/logs/ocr_attempts/
echo.
pause
goto menu

:view_latest
echo.
echo 📄 最新的日志内容:
echo ----------------------------------------
docker-compose exec doctify-backend sh -c "ls -t /app/logs/ocr_attempts/*.json 2>/dev/null | head -1 | xargs cat"
echo.
pause
goto menu

:copy_logs
echo.
echo 📦 正在复制日志到主机...
if not exist backend\logs_exported mkdir backend\logs_exported
docker cp doctify-backend-dev:/app/logs/ocr_attempts backend/logs_exported/
echo ✅ 日志已复制到: backend\logs_exported\ocr_attempts\
echo.
pause
goto menu

:view_document
echo.
set /p doc_id="请输入 document_id (36位UUID): "
echo.
echo 📄 文档 %doc_id% 的日志:
echo ----------------------------------------
docker-compose exec doctify-backend sh -c "cat /app/logs/ocr_attempts/ocr_%doc_id%_*.json"
echo.
pause
goto menu

:monitor_logs
echo.
echo 👁️ 实时监控新日志 (按Ctrl+C停止)...
echo ----------------------------------------
docker-compose exec doctify-backend sh -c "watch -n 2 'ls -lt /app/logs/ocr_attempts/ | head -5'"
pause
goto menu

:end
echo.
echo 👋 再见！
exit /b
