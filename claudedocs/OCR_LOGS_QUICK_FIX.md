# OCR 日志问题 - 快速修复指南

**问题**:
- ✗ `ls: cannot access '/app/logs/ocr_attempts/': No such file or directory`
- ✗ bat脚本显示乱码

**状态**: ✅ 已提供完整解决方案

---

## 🚀 快速修复（3步搞定）

### **Step 1: 创建日志目录**

直接复制粘贴这3条命令：

```bash
docker-compose exec doctify-backend mkdir -p /app/logs/ocr_attempts
docker-compose exec doctify-backend chmod 777 /app/logs/ocr_attempts
docker-compose exec doctify-backend ls -la /app/logs/
```

**期望输出**:
```
drwxrwxrwx 2 root root 4096 Feb  2 14:30 ocr_attempts
```

---

### **Step 2: 运行诊断脚本**

右键点击 → "Run with PowerShell":
```
scripts\diagnose_ocr.ps1
```

这个脚本会检查：
- ✅ Docker容器状态
- ✅ 日志目录是否存在
- ✅ API Keys配置
- ✅ OCR模块是否正常

---

### **Step 3: 上传测试文档**

1. 在浏览器打开 http://localhost:3003
2. 上传一个测试PDF或图片
3. 等待状态变为 "Completed"
4. 再次检查日志：

```bash
docker-compose exec doctify-backend ls -la /app/logs/ocr_attempts/
```

**应该看到**:
```
-rw-r--r-- 1 root root 1234 Feb  2 14:35 ocr_abc123_20260202_143512_456.json
```

---

## 📊 查看日志（3种方法）

### **方法1: PowerShell脚本** (推荐) ⭐⭐⭐

右键点击 → "Run with PowerShell":
```
scripts\view_ocr_logs.ps1
```

功能：
1. 列出所有日志文件
2. 查看最新日志
3. 复制到主机
4. 查看特定文档

---

### **方法2: 命令行** ⭐⭐

```bash
# 查看所有日志文件
docker-compose exec doctify-backend ls -lh /app/logs/ocr_attempts/

# 查看最新日志内容（格式化）
docker-compose exec doctify-backend sh -c "cat /app/logs/ocr_attempts/*.json | tail -1" | python -m json.tool

# 复制到主机（然后可以用记事本打开）
docker cp doctify-backend-dev:/app/logs/ocr_attempts C:\Users\KahWei\Desktop\ocr_logs
```

---

### **方法3: 直接在容器内查看** ⭐

```bash
# 进入容器
docker-compose exec doctify-backend bash

# 查看日志（在容器内）
cd /app/logs/ocr_attempts
ls -la
cat ocr_*.json | tail -1

# 退出容器
exit
```

---

## 🐛 如果还是找不到日志

### **检查清单**:

#### ✅ 检查1: 容器是否运行
```bash
docker ps | grep doctify
```
应该看到 `doctify-backend-dev` 和 `doctify-celery-dev`

#### ✅ 检查2: 日志目录权限
```bash
docker-compose exec doctify-backend ls -ld /app/logs/ocr_attempts/
```
应该看到 `drwxrwxrwx` (777权限)

#### ✅ 检查3: 是否真的处理过文档
```bash
docker-compose logs doctify-celery | grep -i "processing document"
```
应该看到处理记录

#### ✅ 检查4: 查看错误日志
```bash
docker-compose logs doctify-celery | grep -i "failed to write ocr"
```
如果有错误会显示

#### ✅ 检查5: 手动触发日志写入测试

进入容器测试：
```bash
docker-compose exec doctify-backend python3 << 'EOF'
from app.utils.ocr_logger import log_ocr_attempt
from pathlib import Path

# 测试写入
result = log_ocr_attempt(
    document_id="test-12345",
    attempt_number=1,
    model="test/model",
    tokens={"prompt_tokens": 100, "completion_tokens": 50, "total_tokens": 150},
    confidence=0.85,
    doc_type="test",
    line_items_count=0,
    validation_errors=0
)

print(f"✓ 测试日志已写入: {result}")
print(f"✓ 文件存在: {result.exists()}")
EOF
```

然后检查：
```bash
docker-compose exec doctify-backend ls -la /app/logs/ocr_attempts/
```

---

## 💡 永久解决方案（推荐）

如果您经常需要查看日志，建议修改 `docker-compose.yml` 让日志直接保存到主机：

**修改前**:
```yaml
volumes:
  - ./backend:/app
  - backend_uploads:/app/uploads
  - backend_temp:/app/temp_uploads
  - backend_logs:/app/logs  # ← Docker Volume
```

**修改后**:
```yaml
volumes:
  - ./backend:/app
  - backend_uploads:/app/uploads
  - backend_temp:/app/temp_uploads
  - ./backend/logs:/app/logs  # ← 主机目录映射
```

然后：
```bash
# 创建主机目录
mkdir backend\logs\ocr_attempts

# 重启容器
docker-compose down
docker-compose up -d

# 验证（直接在主机查看）
dir backend\logs\ocr_attempts\
```

---

## 📋 测试验证

完成修复后，按此流程验证：

```bash
# 1. 确认目录存在
docker-compose exec doctify-backend ls -la /app/logs/ocr_attempts/
# ✓ 应该看到空目录

# 2. 上传测试文档
# （在浏览器中上传）

# 3. 等待处理完成
docker-compose logs -f doctify-celery
# ✓ 应该看到 "OCR completed" 或 "Task succeeded"

# 4. 检查日志生成
docker-compose exec doctify-backend ls -la /app/logs/ocr_attempts/
# ✓ 应该看到 .json 文件

# 5. 查看日志内容
docker-compose exec doctify-backend cat /app/logs/ocr_attempts/ocr_*.json | tail -1
# ✓ 应该看到 JSON 格式的日志数据
```

---

## 🔗 相关脚本

| 脚本文件 | 用途 | 运行方式 |
|---------|------|---------|
| `diagnose_ocr.ps1` | 系统诊断 | 右键 → Run with PowerShell |
| `view_ocr_logs.ps1` | 查看日志 | 右键 → Run with PowerShell |
| `create_log_dir.bat` | 创建目录 | 双击运行 |

**注意**: 不要用之前的 `view_ocr_logs_docker.bat`，它有UTF-8乱码问题。

---

## 📞 还是不行？

如果按照以上步骤还是有问题，请提供以下信息：

```bash
# 收集诊断信息
docker-compose ps > debug_info.txt
docker-compose logs --tail=100 doctify-celery >> debug_info.txt
docker-compose exec doctify-backend ls -laR /app/logs/ >> debug_info.txt
```

然后把 `debug_info.txt` 发给我。

---

**更新时间**: 2026-02-02
**状态**: ✅ 完整解决方案
**推荐**: 先运行 `diagnose_ocr.ps1` 诊断
