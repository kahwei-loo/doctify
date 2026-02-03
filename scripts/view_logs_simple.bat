@echo off
echo ============================================
echo OCR Log Viewer
echo ============================================
echo.
echo [1] List all log files
echo [2] View latest log
echo [3] Copy logs to host (backend/logs_exported)
echo [4] Exit
echo.
set /p choice="Select option (1-4): "

if "%choice%"=="1" goto list
if "%choice%"=="2" goto latest
if "%choice%"=="3" goto copy
if "%choice%"=="4" goto end

:list
echo.
echo All log files:
docker-compose exec doctify-backend ls -lh /app/logs/ocr_attempts/
echo.
pause
goto end

:latest
echo.
echo Latest log content:
docker-compose exec doctify-backend sh -c "ls -t /app/logs/ocr_attempts/*.json 2>/dev/null | head -1 | xargs cat"
echo.
pause
goto end

:copy
echo.
echo Copying logs to host...
if not exist backend\logs_exported mkdir backend\logs_exported
docker cp doctify-backend-dev:/app/logs/ocr_attempts backend/logs_exported/
echo Done! Check: backend\logs_exported\ocr_attempts\
echo.
pause
goto end

:end
exit /b
