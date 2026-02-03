# OCR 日志访问指南

**问题**: 找不到OCR日志JSON文件
**原因**: 日志保存在Docker Volume中，不是主机目录
**状态**: ✅ 已提供3种解决方案

---

## 🎯 快速解决（推荐方案）

### **方案1: 使用便捷脚本** ⭐⭐⭐ 最简单

双击运行：`scripts/view_ocr_logs_docker.bat`

或者命令行：
```bash
cd C:\Users\KahWei\Projects\ai-works\kahwei-loo\doctify
.\scripts\view_ocr_logs_docker.bat
```

功能菜单：
```
1. 查看所有日志文件列表
2. 查看最新的日志文件
3. 复制所有日志到主机 (backend/logs_exported)
4. 查看特定文档的日志
5. 实时监控新日志
```

---

### **方案2: 手动命令查看** ⭐⭐ 快速

```bash
# 查看所有日志文件
docker-compose exec doctify-backend ls -la /app/logs/ocr_attempts/

# 查看最新日志内容
docker-compose exec doctify-backend sh -c "ls -t /app/logs/ocr_attempts/*.json | head -1 | xargs cat"

# 复制所有日志到主机
mkdir backend\logs_exported
docker cp doctify-backend-dev:/app/logs/ocr_attempts backend/logs_exported/

# 查看特定文档的日志（替换document_id）
docker-compose exec doctify-backend cat /app/logs/ocr_attempts/ocr_{document_id}_*.json
```

---

### **方案3: 修改为主机目录映射** ⭐ 一劳永逸

**优点**: 日志直接保存到主机 `backend/logs/`，无需Docker命令查看
**缺点**: 需要重启容器

#### Step 1: 创建主机目录
```bash
mkdir backend\logs\ocr_attempts
```

#### Step 2: 备份配置
```bash
copy docker-compose.yml docker-compose.yml.backup
```

#### Step 3: 手动修改 `docker-compose.yml`

找到两处 `backend_logs:/app/logs`（约104行和153行），修改为：
```yaml
# Before (2处都要改):
- backend_logs:/app/logs

# After:
- ./backend/logs:/app/logs
```

找到 volumes 部分（约206行），删除或注释：
```yaml
# Before:
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  backend_uploads:
    driver: local
  backend_temp:
    driver: local
  backend_logs:        # ← 删除这行
    driver: local      # ← 删除这行

# After:
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  backend_uploads:
    driver: local
  backend_temp:
    driver: local
  # backend_logs 已改为主机目录映射
```

#### Step 4: 重启容器
```bash
docker-compose down
docker-compose up -d
```

#### Step 5: 验证
```bash
# 上传测试文档后，直接查看主机目录
dir backend\logs\ocr_attempts\

# 查看日志内容
type backend\logs\ocr_attempts\ocr_*.json
```

---

## 📊 日志文件格式

```json
{
  "document_id": "3f42afd8-4af7-43ef-af18-53f6ee02fa41",
  "timestamp": "2026-02-02T14:23:45.123Z",
  "attempt_number": 1,
  "model": "google/gemini-2.0-flash-001",
  "tokens": {
    "prompt_tokens": 15000,
    "completion_tokens": 11566,
    "total_tokens": 26566
  },
  "confidence": 0.81,
  "doc_type": "receipt",
  "line_items_count": 2,
  "validation_errors": 0,
  "doc_type_confidence": 0.95,
  "retry_reasons": [],
  "has_validation_errors": false
}
```

**文件命名格式**:
```
ocr_{document_id}_{timestamp}.json

例如:
ocr_3f42afd8-4af7-43ef-af18-53f6ee02fa41_20260202_142345_123.json
     ↑                                      ↑
     文档ID                                 时间戳 (YYYYMMDD_HHMMSS_mmm)
```

---

## 🔍 常用查询命令

### **Windows (PowerShell)**

```powershell
# 查看最近5个日志
Get-ChildItem backend\logs\ocr_attempts\*.json | Sort-Object LastWriteTime -Descending | Select-Object -First 5 | Get-Content | ConvertFrom-Json

# 查找低置信度文档 (<70%)
Get-ChildItem backend\logs\ocr_attempts\*.json | Get-Content | ConvertFrom-Json | Where-Object { $_.confidence -lt 0.7 }

# 统计各模型使用次数
Get-ChildItem backend\logs\ocr_attempts\*.json | Get-Content | ConvertFrom-Json | Group-Object model | Select-Object Count, Name
```

### **使用 jq (需要安装)**

```bash
# 安装 jq
# Windows: choco install jq
# 或下载: https://stedolan.github.io/jq/download/

# 查看最新日志的关键信息
cat backend/logs/ocr_attempts/*.json | tail -1 | jq '{document_id, model, confidence, doc_type, tokens: .tokens.total_tokens}'

# 查找低置信度的文档
jq 'select(.confidence < 0.7)' backend/logs/ocr_attempts/*.json

# 统计各模型的使用次数
jq -r '.model' backend/logs/ocr_attempts/*.json | sort | uniq -c

# 查看特定文档的所有尝试
cat backend/logs/ocr_attempts/ocr_YOUR_DOCUMENT_ID_*.json | jq -s '.'
```

---

## 🐛 故障排查

### **问题1: 容器内也没有日志文件**

**检查**:
```bash
# 检查容器是否运行
docker ps | grep doctify-backend

# 检查日志目录权限
docker-compose exec doctify-backend ls -la /app/logs/

# 手动创建目录
docker-compose exec doctify-backend mkdir -p /app/logs/ocr_attempts
```

**可能原因**:
- 还没有上传过文档（日志只在OCR处理时创建）
- 日志函数调用失败（检查容器日志）

**验证**:
```bash
# 查看是否有日志错误
docker-compose logs doctify-celery | grep "Failed to write OCR attempt log"
```

---

### **问题2: 日志文件存在但内容为空**

**检查**:
```bash
# 查看文件大小
docker-compose exec doctify-backend ls -lh /app/logs/ocr_attempts/

# 查看最近的Celery日志
docker-compose logs --tail=50 doctify-celery
```

**可能原因**:
- 文件权限问题
- 磁盘空间不足

---

### **问题3: 修改docker-compose.yml后容器无法启动**

**回滚**:
```bash
# 恢复备份
copy docker-compose.yml.backup docker-compose.yml

# 重启
docker-compose down
docker-compose up -d
```

---

## 📋 测试验证清单

完成修复后，按以下步骤验证：

```bash
✅ Step 1: 上传测试文档
   - 在前端上传一个PDF/图片
   - 等待OCR处理完成

✅ Step 2: 检查日志是否生成
   # 方案1用户（Docker Volume）
   docker-compose exec doctify-backend ls -la /app/logs/ocr_attempts/

   # 方案3用户（主机目录）
   dir backend\logs\ocr_attempts\

✅ Step 3: 查看日志内容
   # 方案1用户
   docker-compose exec doctify-backend cat /app/logs/ocr_attempts/ocr_*.json | tail -1

   # 方案3用户
   type backend\logs\ocr_attempts\ocr_*.json

✅ Step 4: 验证数据完整性
   - 检查 document_id 是否正确
   - 检查 tokens、confidence 等字段是否有值
   - 检查 timestamp 格式是否正确
```

---

## 💡 建议

### **开发环境** (推荐方案3)
- 使用主机目录映射 `./backend/logs:/app/logs`
- 方便直接访问和分析
- 与代码热重载配合良好

### **生产环境** (使用方案1)
- 保持Docker Volume
- 使用日志收集系统（ELK、Loki等）
- 定期清理旧日志（内置 cleanup_old_logs 函数）

---

## 🔗 相关文件

- 日志工具: `backend/app/utils/ocr_logger.py`
- 日志调用: `backend/app/services/ocr/l25_orchestrator.py:995`
- 查看脚本: `scripts/view_ocr_logs_docker.bat`
- Python工具: `scripts/view_ocr_logs.py`

---

**更新日期**: 2026-02-02
**状态**: ✅ 已解决
**推荐方案**: 方案1（使用脚本）或 方案3（修改配置）
