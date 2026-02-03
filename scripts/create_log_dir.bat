@echo off
chcp 65001 >nul
echo Creating OCR log directory...
docker-compose exec doctify-backend mkdir -p /app/logs/ocr_attempts
docker-compose exec doctify-backend chmod 777 /app/logs/ocr_attempts
echo Done! Verifying...
docker-compose exec doctify-backend ls -la /app/logs/
pause
