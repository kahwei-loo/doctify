# OCR 日志系统使用指南

## 🎯 设计理念

**MVP 阶段的简单实用方案**:
- ✅ **双重日志**: 实时 stdout + 持久化文件
- ✅ **易读格式**: Markdown + 清晰分隔符
- ✅ **完整信息**: Prompt, Response, Tokens, 性能指标
- ✅ **容错设计**: 日志失败不影响业务

## 📋 日志内容

每个 OCR 请求会记录:

### 基本信息
- 时间戳 (UTC)
- 文档 ID
- 用户 ID
- 文件名
- 尝试次数

### AI 模型信息
- 模型名称
- Token 使用量 (Prompt/Completion/Total)
- 处理耗时

### Prompt & Response
- **完整 Prompt** (发送给 AI 的提示)
- **原始 Response** (AI 返回的完整响应)
- **结构化输出** (解析后的 JSON 数据)

### 质量指标
- 置信度 (Confidence)
- 文档类型
- 验证错误数量

### 额外信息
- Function/Tool calling (如果有)
- 重试原因
- 字段级置信度

## 📂 日志文件位置

### Docker 容器内
```
/app/logs/ocr_attempts/
├── ocr_<document_id>_attempt1_<timestamp>.md
├── ocr_<document_id>_attempt2_<timestamp>.md
├── ocr_summary_<document_id>_<timestamp>.md
└── ...
```

### 宿主机 (通过 Docker Volume)
```bash
# 查看 volume 位置
docker volume inspect doctify_backend_logs

# Windows 上通常在:
\\wsl$\docker-desktop-data\data\docker\volumes\doctify_backend_logs\_data\ocr_attempts
```

## 🔍 查看日志

### 方法 1: Docker Logs (实时监控)
```bash
# 查看 Celery worker 日志 (包含 OCR 结构化日志)
docker-compose logs -f doctify-celery | grep "OCR_LOG"

# 示例输出:
# 📊 OCR_LOG: {"timestamp": "2026-02-03T13:45:30Z", "event": "ocr_request", ...}
```

### 方法 2: 查看日志文件
```bash
# 进入容器
docker exec -it doctify-celery-dev sh

# 查看最近的日志
ls -lht /app/logs/ocr_attempts/ | head -10

# 查看特定日志
cat /app/logs/ocr_attempts/ocr_<document_id>_attempt1_*.md
```

### 方法 3: 使用日志查看脚本
```bash
# 查看最近 10 条日志
docker exec doctify-celery-dev python scripts/view_ocr_logs.py

# 查看最近 20 条日志
docker exec doctify-celery-dev python scripts/view_ocr_logs.py --limit 20

# 查看特定文档的所有日志
docker exec doctify-celery-dev python scripts/view_ocr_logs.py --document-id <uuid>
```

### 方法 4: 复制日志到本地
```bash
# 复制特定日志文件
docker cp doctify-celery-dev:/app/logs/ocr_attempts/ocr_xxx.md ./

# 复制整个日志目录
docker cp doctify-celery-dev:/app/logs/ocr_attempts ./ocr_logs
```

## 📊 日志文件格式示例

```markdown
# OCR Processing Log

================================================================================

## 📋 基本信息

- **时间**: 2026-02-03 13:45:30 UTC
- **文档 ID**: `3f42afd8-4af7-43ef-af18-53f6ee02fa41`
- **用户 ID**: `99f248e4-a403-431a-9d76-45a99c1d53d6`
- **文件名**: `receipt_001.jpg`
- **尝试次数**: 1

--------------------------------------------------------------------------------

## 🤖 AI 模型信息

- **模型**: `qwen/qwen3-vl-8b-instruct`
- **Token 使用**:
  - Prompt Tokens: 15,234
  - Completion Tokens: 11,566
  - **Total Tokens**: **26,800**
- **处理耗时**: 3.45s

--------------------------------------------------------------------------------

## 📝 Prompt (发送给 AI 的完整提示)

```
You are a helpful assistant that processes documents...
[完整 prompt 内容]
```

--------------------------------------------------------------------------------

## 🔍 Raw Response (AI 返回的原始响应)

```json
{
  "documentNo": "227/143",
  "date": "2024-01-15",
  "totalAmount": 3315.00,
  ...
}
```

--------------------------------------------------------------------------------

## ✅ 结构化输出 (Extracted Data)

```json
{
  "documentNo": "227/143",
  "merchantName": "Mix Store",
  "totalAmount": 3315.00,
  "lineItems": [...]
}
```

--------------------------------------------------------------------------------

## 📊 质量指标

- **置信度**: 85.30% (0.8530)
- **文档类型**: receipt
- **验证错误数**: 0

================================================================================
Generated at 2026-02-03 13:45:30 UTC
================================================================================
```

## 🔄 多次尝试场景

当 OCR 进行多次重试时:

1. **每次尝试单独记录**:
   - `ocr_<doc_id>_attempt1_<ts>.md`
   - `ocr_<doc_id>_attempt2_<ts>.md`
   - `ocr_<doc_id>_attempt3_<ts>.md`

2. **汇总对比日志**:
   - `ocr_summary_<doc_id>_<ts>.md`
   - 包含所有尝试的对比表格

## 🛠 调试技巧

### 1. 分析 Token 使用
```bash
# 查找高 token 使用的请求
docker exec doctify-celery-dev sh -c "grep 'Total Tokens' /app/logs/ocr_attempts/*.md"
```

### 2. 检查低置信度情况
```bash
# 查找置信度 < 60% 的情况
docker exec doctify-celery-dev sh -c "grep 'confidence.*0\.[0-5]' /app/logs/ocr_attempts/*.md"
```

### 3. 对比不同模型表现
通过查看 summary 日志文件，对比不同 attempt 使用的模型和效果。

### 4. 分析 Prompt 改进
查看 prompt 部分，看是否有优化空间。

## 🧹 日志清理

### 自动清理 (推荐)
日志会自动清理 30 天以上的文件 (通过 Celery 定时任务)。

### 手动清理
```bash
# 删除 30 天以上的日志
docker exec doctify-celery-dev python -c "
from app.utils.simple_ocr_logger import cleanup_old_logs
deleted = cleanup_old_logs(days_to_keep=30)
print(f'Deleted {deleted} old log files')
"

# 删除所有日志 (慎用!)
docker exec doctify-celery-dev sh -c "rm -rf /app/logs/ocr_attempts/*.md"
```

## 💡 常见问题

### Q: 为什么找不到日志文件?
A: 检查以下几点:
1. 确认 Docker volume 正确挂载: `docker volume inspect doctify_backend_logs`
2. 检查容器内目录是否存在: `docker exec doctify-celery-dev ls -la /app/logs/ocr_attempts/`
3. 查看 Celery logs 是否有写入错误: `docker-compose logs doctify-celery | grep OCR_LOG_ERROR`

### Q: 日志文件太大怎么办?
A: 日志系统会自动截断过长的内容:
- Prompt 限制在 5,000 字符
- Raw Response 限制在 10,000 字符

### Q: 如何在本地分析日志?
A: 复制日志到本地后，用任何 Markdown 编辑器打开，或者:
```bash
# 使用 VS Code
code ./ocr_logs/

# 使用浏览器 (安装 Markdown 插件)
```

### Q: 可以关闭日志吗?
A: 可以，但不推荐。日志对于调试和优化非常重要。如果确实需要:
- 修改代码跳过日志调用
- 或者设置环境变量 `DISABLE_OCR_LOGGING=true`

## 🚀 最佳实践

1. **定期查看**: 每天查看最近的日志，了解系统运行情况
2. **对比分析**: 使用 summary 日志对比不同尝试的效果
3. **优化 Prompt**: 根据日志中的 prompt 和 response 优化提示词
4. **监控 Token**: 注意 token 使用量，避免成本过高
5. **保存重要日志**: 对于重要的测试案例，及时复制日志到本地保存

## 📚 相关文档

- [OCR 系统架构](./OCR_ARCHITECTURE.md)
- [L2.5 增强处理说明](./L25_ENHANCEMENT.md)
- [性能优化指南](./PERFORMANCE_OPTIMIZATION.md)
