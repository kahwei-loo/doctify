# AI 模型配置说明

**更新日期**: 2026-02-03
**配置版本**: v2.0 (OpenRouter + Qwen/Gemini)

---

## 🎯 当前模型配置

### 模型升级链（L25 Orchestration）

系统使用智能重试和模型升级策略，按以下顺序尝试：

| 尝试次数 | 模型 | 提供商 | 说明 |
|---------|------|--------|------|
| **第 1 次** | Qwen3 VL 8B Instruct | Qwen | 快速且成本效益高 |
| **第 2 次** | Qwen2.5 VL 32B Instruct | Qwen | 更高准确度（32B 参数） |
| **第 3 次** | Gemini 3 Flash Preview | Google | Google 最新多模态模型 |

### OpenRouter 模型 ID

```yaml
模型1:
  名称: "Qwen3 VL 8B Instruct"
  OpenRouter ID: "qwen/qwen-3-vl-8b-instruct"
  参数规模: 8B
  特点: 快速、成本低、适合大多数文档

模型2:
  名称: "Qwen2.5 VL 32B Instruct"
  OpenRouter ID: "qwen/qwen-2.5-vl-32b-instruct"
  参数规模: 32B
  特点: 高准确度、复杂文档处理

模型3:
  名称: "Gemini 3 Flash Preview"
  OpenRouter ID: "google/gemini-3-flash-preview"
  特点: Google 最新多模态模型、处理复杂布局
```

---

## ⚙️ 环境变量配置

### 必需配置

在 `.env` 文件中设置以下变量：

```bash
# OpenRouter API 配置
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_API_KEY=sk-or-v1-xxxxxxxxxxxxx  # 你的 OpenRouter API Key

# 默认模型（可选，默认使用 Qwen3 VL 8B）
AI_MODEL=qwen/qwen-3-vl-8b-instruct

# 以下密钥不再需要（通过 OpenRouter 统一访问）
# ANTHROPIC_API_KEY=  # 不需要
# GOOGLE_AI_API_KEY=  # 不需要
```

### 如何获取 OpenRouter API Key

1. 访问 https://openrouter.ai/
2. 注册账号
3. 前往 API Keys 页面
4. 创建新的 API Key
5. 复制 Key 到 `.env` 文件的 `OPENAI_API_KEY` 变量

---

## 🔧 配置文件位置

### 1. 模型升级链配置

**文件**: `backend/app/services/ocr/l25_orchestrator.py`
**位置**: Line 748-756

```python
# Model escalation: cost-effective models with fallback chain
base_model = settings.AI_MODEL or "qwen/qwen-3-vl-8b-instruct"
self.model_escalation_chain = [
    base_model,  # Retry 0: Qwen3 VL 8B (fast & cost-effective)
    "qwen/qwen-2.5-vl-32b-instruct",  # Retry 1: Qwen2.5 VL 32B (higher accuracy)
    "google/gemini-3-flash-preview",  # Retry 2: Gemini 3 Flash Preview (latest)
]
```

### 2. Docker Compose 配置

**文件**: `docker-compose.yml`
**位置**: Line 94-101

```yaml
environment:
  - OPENAI_BASE_URL=${OPENAI_BASE_URL:-https://openrouter.ai/api/v1}
  - OPENAI_API_KEY=${OPENAI_API_KEY}
  - AI_MODEL=${AI_MODEL:-qwen/qwen-3-vl-8b-instruct}
```

### 3. 应用配置

**文件**: `backend/app/core/config.py`
**位置**: Line 265-278

```python
OPENAI_BASE_URL: Optional[str] = Field(
    default=None,
    description="OpenAI API base URL (use OpenRouter or custom endpoint)"
)

OPENAI_API_KEY: Optional[str] = Field(
    default=None,
    description="OpenAI API key"
)

AI_MODEL: Optional[str] = Field(
    default=None,
    description="AI model identifier (e.g., qwen/qwen-3-vl-8b-instruct)"
)
```

---

## 🎨 自定义模型配置

### 方法 1: 修改默认模型

在 `.env` 文件中设置：

```bash
# 使用 Qwen2.5 VL 32B 作为默认模型
AI_MODEL=qwen/qwen-2.5-vl-32b-instruct

# 或使用 Gemini 2.5 Flash 作为默认模型
AI_MODEL=google/gemini-2.5-flash-preview-0925
```

### 方法 2: 修改升级链

编辑 `backend/app/services/ocr/l25_orchestrator.py` 的 `model_escalation_chain`：

```python
self.model_escalation_chain = [
    "google/gemini-2.5-flash-preview-0925",  # 第一次就用最强的
    "qwen/qwen-2.5-vl-32b-instruct",         # 降级到 32B
    "qwen/qwen-3-vl-8b-instruct",            # 最后降级到 8B
]
```

### 方法 3: 添加其他 OpenRouter 模型

OpenRouter 支持的其他多模态模型：

```python
# 示例：添加其他模型到升级链
self.model_escalation_chain = [
    "qwen/qwen-3-vl-8b-instruct",
    "anthropic/claude-3-5-sonnet-20241022",  # Claude 3.5 Sonnet
    "openai/gpt-4o",                          # GPT-4o
    "google/gemini-2.5-flash-preview-0925",
]
```

**可用模型列表**: https://openrouter.ai/models

---

## 💰 成本估算

### OpenRouter 定价（估算）

| 模型 | 输入成本 | 输出成本 | 典型文档成本 |
|------|---------|---------|------------|
| Qwen3 VL 8B | ~$0.10/M tokens | ~$0.20/M tokens | ~$0.02 |
| Qwen2.5 VL 32B | ~$0.30/M tokens | ~$0.50/M tokens | ~$0.05 |
| Gemini 2.5 Flash | ~$0.10/M tokens | ~$0.40/M tokens | ~$0.03 |

**注意**: 实际成本以 OpenRouter 官方定价为准。

### 成本优化建议

1. **提高首次成功率**：优化 prompt 减少重试次数
2. **智能重试**：只在低 confidence 时重试
3. **批量处理**：批量上传文档降低平均成本
4. **监控成本**：使用 OpenRouter Dashboard 监控 API 使用

---

## 🧪 测试模型配置

### 测试步骤

1. **重启容器**（加载新配置）
```bash
docker-compose down
docker-compose up -d
```

2. **检查模型配置**
```bash
docker-compose exec doctify-backend python3 -c "
from app.core.config import get_settings
settings = get_settings()
print(f'Base URL: {settings.OPENAI_BASE_URL}')
print(f'Model: {settings.AI_MODEL}')
"
```

3. **上传测试文档**
- 访问 http://localhost:3003
- 上传 PDF/图片
- 查看 Celery 日志确认使用的模型

4. **查看日志确认模型**
```bash
docker-compose logs doctify-celery | grep -i "model\|qwen\|gemini"
```

### 预期日志输出

```
[INFO] L2.5 orchestrator initialized with model: qwen/qwen-3-vl-8b-instruct
[INFO] Model escalation chain: ['qwen/qwen-3-vl-8b-instruct', 'qwen/qwen-2.5-vl-32b-instruct', 'google/gemini-3-flash-preview']
```

---

## 🔍 故障排查

### 问题 1: API Key 无效

**错误**: `401 Unauthorized`

**解决**:
1. 检查 `.env` 文件中的 `OPENAI_API_KEY`
2. 确认 OpenRouter API Key 有效
3. 重启容器加载新配置

### 问题 2: 模型不支持

**错误**: `Model not found` 或 `Invalid model ID`

**解决**:
1. 访问 https://openrouter.ai/models 确认模型 ID
2. 检查模型 ID 拼写是否正确
3. 确认 OpenRouter 账户是否启用该模型

### 问题 3: Gemini 特殊处理

Gemini 模型需要特殊的 schema 格式，代码已自动处理：

```python
# 自动检测 Gemini 模型
is_gemini = "gemini" in self.model.lower() or "google/" in self.model.lower()
functions = self._build_function_schema(project_config, for_google=is_gemini)
```

### 问题 4: 成本过高

如果发现成本过高：

1. 检查重试次数：
```bash
docker-compose logs doctify-celery | grep "retry\|attempt"
```

2. 分析重试原因：
```bash
cat logs/ocr_attempts/ocr_all_attempts_*.json | jq '.attempts[].retry_reasons'
```

3. 优化策略：
   - 降低重试阈值（减少不必要的重试）
   - 优化 prompt（提高首次成功率）
   - 调整 confidence 计算方法

---

## 📊 模型性能对比

### 测试方法

1. 准备 10 个测试文档（不同类型和复杂度）
2. 分别使用三个模型处理
3. 对比以下指标：
   - 准确率（与 ground truth 对比）
   - 处理时间
   - Token 使用量
   - 成本

### 记录模板

```json
{
  "model": "qwen/qwen-3-vl-8b-instruct",
  "test_cases": 10,
  "accuracy": "92%",
  "avg_time": "3.2s",
  "avg_tokens": 18000,
  "avg_cost": "$0.018",
  "strengths": ["快速", "成本低"],
  "weaknesses": ["复杂表格识别略差"]
}
```

---

## 🔄 从旧配置迁移

### 如果你之前使用 OpenAI/Anthropic 直连

**旧配置**:
```bash
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

**新配置**:
```bash
# 统一使用 OpenRouter
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_API_KEY=sk-or-v1-xxxxx  # 换成 OpenRouter Key

# 不再需要以下配置
# ANTHROPIC_API_KEY=  # 删除或注释
# GOOGLE_AI_API_KEY=  # 删除或注释
```

**优势**:
- ✅ 单一 API Key 管理
- ✅ 统一计费和监控
- ✅ 更多模型选择
- ✅ 自动负载均衡和重试

---

## 📝 配置变更日志

### v2.0 (2026-02-03)
- ✅ 切换到 OpenRouter 统一接口
- ✅ 更新默认模型为 Qwen3 VL 8B
- ✅ 升级链改为 Qwen3 → Qwen2.5 → Gemini 2.5
- ✅ 移除对单独 Anthropic/Google API 的依赖

### v1.0 (之前)
- 使用 OpenAI, Anthropic, Google 直连
- 默认模型 Gemini 2.0 Flash
- 升级链 Gemini → GPT-4o → Claude → Qwen

---

**维护人员**: Claude + KahWei
**联系**: 如有问题请查看 `claudedocs/OCR_LOGS_QUICK_FIX.md`
