# OCR 系统 Bug 修复实施报告

**修复日期**: 2026-02-03
**状态**: ✅ P0 修复全部完成
**版本**: v1.1.0 (Enhanced Logging & Auditing)

---

## 🎯 修复概览

完成了 **5个关键 bug** 的修复，主要提升系统的可观测性、可审计性和决策质量。

| Bug ID | 描述 | 严重性 | 状态 |
|--------|------|--------|------|
| #1 | 误导性日志消息 | 🟡 Medium | ✅ 已修复 |
| #2 | 缺少数据内容记录 | 🔴 Critical | ✅ 已修复 |
| #3 | 重试结果未持久化 | 🔴 Critical | ✅ 已修复 |
| #4 | 选择逻辑阈值问题 | 🟠 High | ✅ 已修复 |
| #5 | Token 统计准确性 | 🟡 Medium | ✅ 已验证（无需修改） |

---

## 📝 详细修复内容

### Fix #1: 改进日志消息 ✅

**文件**: `backend/app/services/ocr/l25_orchestrator.py`
**修改行**: 1045-1089

**Before**:
```python
logger.info(
    f"L2.5 selected best result from {len(all_results)} attempts, "
    f"confidence improved from {all_confidences[0]:.2f} to {best_confidence:.2f}"
)
```

**After**:
```python
confidence_history = ', '.join(f'{c:.2f}' for c in all_confidences)
logger.info(
    f"L2.5 completed {len(all_results)} attempts with confidences: [{confidence_history}]. "
    f"Selected attempt {selected_index + 1} with confidence {best_confidence:.2f}"
)
```

**改进点**:
- ✅ 显示所有尝试的 confidence 历史
- ✅ 明确指出选择了第几次尝试
- ✅ 避免误导性的 "improved from X to Y" 措辞

---

### Fix #2: 增强 OCR Log 记录完整数据 ✅

**文件**: `backend/app/utils/ocr_logger.py`
**修改行**: 1-150

#### 新增参数

**Before** (只记录元数据):
```python
def log_ocr_attempt(
    document_id: str,
    attempt_number: int,
    model: str,
    tokens: Dict[str, int],
    confidence: float,
    doc_type: str,
    line_items_count: int,
    validation_errors: int,
    additional_data: Optional[Dict[str, Any]] = None,
)
```

**After** (记录完整数据):
```python
def log_ocr_attempt(
    document_id: str,
    attempt_number: int,
    model: str,
    tokens: Dict[str, int],
    confidence: float,
    doc_type: str,
    line_items_count: int,
    validation_errors: int,
    # 新增参数 ↓
    extracted_data: Optional[Dict[str, Any]] = None,
    prompt_used: Optional[str] = None,
    raw_response: Optional[str] = None,
    field_confidences: Optional[Dict[str, float]] = None,
    additional_data: Optional[Dict[str, Any]] = None,
)
```

#### 增强的日志格式

**新增字段**:
```json
{
  "document_id": "...",
  "timestamp": "2026-02-03T10:30:45.123Z",
  "attempt_number": 1,
  "model": "google/gemini-2.0-flash-001",
  "confidence": 0.85,
  "doc_type": "CASH BILL",
  "tokens": {...},

  "extracted_data": {                    // ← 新增：实际提取的数据
    "documentNo": "227/143",
    "documentDate": "2024-10-15",
    "totalPayableAmount": 3315.00,
    "lineItems": [...]
  },

  "field_confidences": {                 // ← 新增：字段级别 confidence
    "documentNo": 0.95,
    "documentDate": 0.88,
    "totalPayableAmount": 0.92
  },

  "prompt_used": "...",                  // ← 新增：使用的 prompt
  "raw_response": "{...}",               // ← 新增：AI 原始响应

  "line_items_count": 2,
  "validation_errors": 0
}
```

**新功能价值**:
- ✅ **准确度验证**: 可对比提取数据与真实数据（ground truth）
- ✅ **AI 行为调试**: 看到 prompt 和 response 的对应关系
- ✅ **质量分析**: 字段级别 confidence 分析
- ✅ **错误诊断**: 快速定位哪些字段提取错误

---

### Fix #3: 记录所有重试结果 ✅

**文件**: `backend/app/utils/ocr_logger.py`
**新增函数**: `log_all_attempts()` (line 165-260)

#### 新功能

**功能**: 创建独立的日志文件记录所有重试尝试

**文件命名**: `ocr_all_attempts_{document_id}_{timestamp}.json`

**日志结构**:
```json
{
  "document_id": "3f42afd8-4af7-43ef-af18-53f6ee02fa41",
  "timestamp": "2026-02-03T10:30:45.123Z",
  "total_attempts": 3,
  "selected_attempt": 1,
  "selected_confidence": 0.45,
  "confidence_range": {
    "min": 0.42,
    "max": 0.45,
    "avg": 0.43
  },
  "attempts": [
    {
      "attempt_number": 1,
      "model": "openai/gpt-4o-mini",
      "confidence": 0.45,
      "extracted_data": {...},
      "field_confidences": {...},
      "is_selected": true              // ← 标记哪个被选择
    },
    {
      "attempt_number": 2,
      "model": "openai/gpt-4o",
      "confidence": 0.43,
      "extracted_data": {...},
      "field_confidences": {...},
      "is_selected": false
    },
    {
      "attempt_number": 3,
      "model": "anthropic/claude-3-5-sonnet",
      "confidence": 0.42,
      "extracted_data": {...},
      "field_confidences": {...},
      "is_selected": false
    }
  ]
}
```

**价值**:
- ✅ **决策审计**: 看到所有选项和选择依据
- ✅ **准确度对比**: 手动对比哪次提取最准确
- ✅ **模型性能分析**: 对比不同 AI 模型的表现
- ✅ **策略优化**: 验证选择逻辑是否合理

#### L25 Orchestrator 集成

**文件**: `backend/app/services/ocr/l25_orchestrator.py`
**修改行**: 1045-1089

**调用位置**: 在选择最佳结果后立即记录

```python
if len(all_results) > 1:
    # 选择最佳结果
    best_result, best_confidence = select_best_result(
        all_results, all_confidences
    )
    selected_index = all_confidences.index(best_confidence)

    # 记录所有尝试（新增）
    log_all_attempts(
        document_id=document_id,
        all_results=all_results,
        all_confidences=all_confidences,
        all_field_confidences=all_field_confidences,
        selected_index=selected_index,
        models_used=models_used
    )
```

---

### Fix #4: 改进选择逻辑 ✅

**文件**: `backend/app/services/ocr/retry_strategy.py`
**修改行**: 223-271

#### 改进内容

**Before** (阈值太高):
```python
for i, conf in enumerate(confidences[1:], 1):
    if conf > best_conf + 0.05:  # 0.05 太高！0.48 vs 0.45 不会触发
        best_idx = i
        best_conf = conf
```

**After** (降低阈值 + 详细日志):
```python
CONFIDENCE_THRESHOLD = 0.03  # 降低到 0.03，更敏感

for i, conf in enumerate(confidences[1:], 1):
    if conf > best_conf + CONFIDENCE_THRESHOLD:
        logger.debug(
            f"Attempt {i+1} has significantly higher confidence "
            f"({conf:.3f} > {best_conf:.3f} + {CONFIDENCE_THRESHOLD}), selecting it"
        )
        best_idx = i
        best_conf = conf
    elif abs(conf - best_conf) <= CONFIDENCE_THRESHOLD:
        curr_filled = _count_filled_fields(results[i])
        best_filled = _count_filled_fields(results[best_idx])
        if curr_filled > best_filled:
            logger.debug(
                f"Attempt {i+1} has similar confidence but more complete fields, selecting it"
            )
            best_idx = i
            best_conf = conf

logger.info(
    f"Selected attempt {best_idx + 1} with confidence {best_conf:.3f} "
    f"from {len(results)} attempts"
)
```

**改进点**:
- ✅ 降低阈值从 0.05 → 0.03（更敏感）
- ✅ 添加详细决策日志
- ✅ 提供可调试性

---

### Fix #5: Token 统计验证 ✅

**文件**: `backend/app/services/ocr/l25_orchestrator.py`
**状态**: ✅ 验证后确认**无需修改**

#### 验证结果

**原始代码**:
```python
# 在循环中记录单次 token usage
log_ocr_attempt(
    ...
    tokens=token_usage,  # 单次的 token
    ...
)

# 在最终返回累计 token usage
return L25Result(
    ...
    token_usage=token_usage,        # 最后一次的
    total_token_usage=total_token_usage,  # 累计的
    ...
)
```

**分析**:
- ✅ 循环中记录单次 token usage 是**正确的**
- ✅ 每次尝试应该记录该次用了多少 token
- ✅ L25Result 中同时提供了单次和累计值
- ✅ 调用方可以根据需要选择使用哪个

**结论**: 无需修改，设计合理。

---

### Fix #6: 增强 AI Response 捕获 ✅

**文件**: `backend/app/services/ocr/l25_orchestrator.py`
**修改行**: 1236-1267

#### 新增返回字段

**Before** (只返回解析后的数据):
```python
return {
    "content": output_data,
    "token_usage": {...},
    "process_time": ...
}
```

**After** (添加 prompt 和 raw_response):
```python
# 捕获原始响应
raw_response_data = None
if hasattr(message, "tool_calls") and message.tool_calls:
    raw_response_data = message.tool_calls[0].function.arguments
    output_data = json.loads(raw_response_data)
elif hasattr(message, "function_call") and message.function_call:
    raw_response_data = message.function_call.arguments
    output_data = json.loads(raw_response_data)
elif hasattr(message, "content") and message.content:
    raw_response_data = message.content
    output_data = extract_json_from_content(message.content)

# 构建 prompt 文本
prompt_text = f"System: {messages[0]['content']}\n\nUser: [Document images with instructions]"

return {
    "content": output_data,
    "token_usage": {...},
    "process_time": ...,
    "prompt": prompt_text,           # ← 新增
    "raw_response": raw_response_data  # ← 新增
}
```

**传递到 log_ocr_attempt**:
```python
log_ocr_attempt(
    ...
    extracted_data=std_output,
    prompt_used=ai_response.get("prompt"),      # ← 新增
    raw_response=ai_response.get("raw_response"),  # ← 新增
    field_confidences=field_confs,
    ...
)
```

---

## 📊 修复效果对比

### Before (修复前)

**OCR Log 内容**:
```json
{
  "document_id": "...",
  "confidence": 0.42,
  "doc_type": "CASH BILL",
  "tokens": {...}
}
```

**问题**:
- ❌ 看不到提取的数据内容
- ❌ 看不到 AI 的 prompt 和 response
- ❌ 看不到其他重试结果
- ❌ 无法验证准确度
- ❌ 无法调试 AI 行为
- ❌ 无法审计决策过程

**日志消息**:
```
L2.5 selected best result from 3 attempts,
confidence improved from 0.45 to 0.42
```
- ❌ 误导性（"improved" 实际是变差了）

---

### After (修复后)

**单次尝试日志** (`ocr_{document_id}_{timestamp}.json`):
```json
{
  "document_id": "...",
  "confidence": 0.85,
  "doc_type": "CASH BILL",
  "tokens": {...},

  "extracted_data": {                // ✅ 实际数据
    "documentNo": "227/143",
    "totalPayableAmount": 3315.00
  },

  "field_confidences": {             // ✅ 字段 confidence
    "documentNo": 0.95,
    "totalPayableAmount": 0.92
  },

  "prompt_used": "...",              // ✅ Prompt
  "raw_response": "{...}"            // ✅ Raw response
}
```

**所有尝试日志** (`ocr_all_attempts_{document_id}_{timestamp}.json`):
```json
{
  "total_attempts": 3,
  "selected_attempt": 1,
  "confidence_range": {
    "min": 0.42,
    "max": 0.45,
    "avg": 0.43
  },
  "attempts": [
    {"attempt_number": 1, "confidence": 0.45, "is_selected": true, ...},
    {"attempt_number": 2, "confidence": 0.43, "is_selected": false, ...},
    {"attempt_number": 3, "confidence": 0.42, "is_selected": false, ...}
  ]
}
```

**改进的日志消息**:
```
L2.5 completed 3 attempts with confidences: [0.45, 0.43, 0.42].
Selected attempt 1 with confidence 0.45
```
- ✅ 清晰明确
- ✅ 显示所有 confidence
- ✅ 明确选择了哪次

---

## 🎯 实现的价值

### 1. **可验证性** ✅
- 可以对比提取数据与 ground truth
- 计算准确率（字段级别和文档级别）
- 验证 confidence 分数是否可靠

### 2. **可调试性** ✅
- 看到完整的 prompt → AI → response 流程
- 分析为什么 AI 提取错误
- 优化 prompt 以提高准确度

### 3. **可审计性** ✅
- 追溯每个决策的依据
- 验证选择逻辑是否合理
- 发现潜在的系统性问题

### 4. **可优化性** ✅
- 对比不同 AI 模型的表现
- 优化重试策略
- 改进 confidence 计算方法

---

## 📋 验证清单

修复完成后需要验证：

### 1. 功能验证
- [ ] 重启 Docker 容器
- [ ] 创建 OCR 日志目录
- [ ] 上传测试文档
- [ ] 检查单次尝试日志文件生成
- [ ] 检查所有尝试日志文件生成（如果有重试）
- [ ] 验证日志包含所有新增字段

### 2. 准确度测试
- [ ] 准备 3 个测试文档（简单、中等、复杂）
- [ ] 手动标注 ground truth
- [ ] 运行 OCR 提取
- [ ] 对比提取结果与 ground truth
- [ ] 计算字段级别准确率
- [ ] 验证 confidence 分数是否反映真实准确度

### 3. 重试逻辑测试
- [ ] 强制触发重试（设置低 confidence 阈值）
- [ ] 验证是否选择了最高 confidence 的结果
- [ ] 检查所有尝试日志是否完整
- [ ] 验证日志消息是否清晰明确

### 4. 性能测试
- [ ] 测量日志写入对 OCR 性能的影响
- [ ] 确保日志失败不会导致 OCR 失败
- [ ] 验证日志文件大小可控

---

## 🚀 后续改进建议

### Phase 3 (未来优化)

**1. 日志分析工具**
- 创建 Python 脚本分析 OCR 日志
- 生成准确率报告和统计图表
- 识别常见错误模式

**2. 准确度监控仪表板**
- 可视化 OCR 准确率趋势
- 按文档类型、AI 模型分组统计
- 实时监控 confidence 分布

**3. 自动化测试套件**
- 基于 ground truth 的自动化测试
- 回归测试确保准确度不下降
- CI/CD 集成

**4. Prompt 优化**
- 基于日志分析优化 prompt
- A/B 测试不同 prompt 版本
- 持续改进提取准确度

---

## 📞 问题反馈

如果发现问题或有改进建议，请：
1. 检查日志文件是否正确生成
2. 运行诊断脚本 `scripts/diagnose_ocr.ps1`
3. 提供错误日志和样本数据
4. 联系开发团队

---

**修复完成时间**: 2026-02-03 10:45 UTC+8
**修复人员**: Claude + KahWei
**版本**: v1.1.0 - Enhanced Logging & Auditing
