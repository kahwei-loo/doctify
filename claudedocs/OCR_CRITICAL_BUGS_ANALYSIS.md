# OCR 系统关键 Bug 分析报告

## 🚨 发现的严重问题

### 1. **Bug #1: 误导性日志消息（已确认）**

**位置**: `backend/app/services/ocr/l25_orchestrator.py:1045-1048`

**问题代码**:
```python
logger.info(
    f"L2.5 selected best result from {len(all_results)} attempts, "
    f"confidence improved from {all_confidences[0]:.2f} to {best_confidence:.2f}"
)
```

**问题分析**:
- 日志显示 "confidence improved from 0.45 to 0.42"
- 这个消息**严重误导**，因为：
  - `all_confidences[0]` 是第一次尝试的 confidence
  - `best_confidence` 是选择的最佳 confidence
  - 如果第一次就是最好的，会显示 "improved from 0.45 to 0.45"
  - 如果最后一次最好，会显示 "improved from 0.45 to 0.42"（实际是变差了！）

**正确的日志应该是**:
```python
logger.info(
    f"L2.5 selected best result from {len(all_results)} attempts, "
    f"best confidence: {best_confidence:.2f} (attempts: {', '.join(f'{c:.2f}' for c in all_confidences)})"
)
```

### 2. **Bug #2: 缺少实际数据内容记录（准确度无法验证）**

**位置**: `backend/app/utils/ocr_logger.py:108-128`

**问题**:
OCR log 只记录了 **元数据**（confidence, tokens, doc_type），但**没有记录实际提取的数据内容**。

**当前记录的数据**:
```json
{
  "document_id": "...",
  "confidence": 0.85,
  "doc_type": "CASH BILL",
  "line_items_count": 2,
  "tokens": {...}
}
```

**缺少的关键数据**:
- ❌ 实际提取的字段值（documentNo, totalAmount, lineItems 等）
- ❌ AI 返回的原始 response
- ❌ 使用的 prompt
- ❌ 每个字段的 confidence 分数
- ❌ 重试过程中的所有结果（用于对比）

**影响**:
- **无法验证准确度**：不知道提取的数据是否正确
- **无法分析错误**：不知道哪些字段经常出错
- **无法优化 prompt**：看不到 prompt 和 response 的关系
- **无法调试 AI 行为**：看不到 AI 的实际输出

### 3. **Bug #3: 重试结果未持久化（无法审计）**

**位置**: `backend/app/services/ocr/l25_orchestrator.py:913-923`

**问题代码**:
```python
# Track for best-result selection
all_results.append(std_output)
all_confidences.append(confidence or 0.0)
```

**问题分析**:
- `all_results` 和 `all_confidences` 只在**内存**中
- 重试过程中的所有结果**没有保存**到日志
- OCR log 只记录**最终选择的结果**
- **无法审计**选择逻辑是否正确

**实际场景**:
```
Attempt 1: confidence 0.45, extracted_data={...} ← 最好但被丢弃
Attempt 2: confidence 0.43, extracted_data={...} ← 被丢弃
Attempt 3: confidence 0.42, extracted_data={...} ← 被选择（如果是最后一次）

OCR log 只记录: confidence 0.42 ← 看不到其他尝试！
```

### 4. **潜在 Bug #4: select_best_result 逻辑可能有问题**

**位置**: `backend/app/services/ocr/retry_strategy.py:223-256`

**问题代码**:
```python
for i, conf in enumerate(confidences[1:], 1):
    if conf > best_conf + 0.05:  # 只有高出 0.05 才更新
        best_idx = i
        best_conf = conf
    elif abs(conf - best_conf) <= 0.05:  # 相近则比较完整度
        curr_filled = _count_filled_fields(results[i])
        best_filled = _count_filled_fields(results[best_idx])
        if curr_filled > best_filled:
            best_idx = i
            best_conf = conf
```

**潜在问题**:
- 阈值 0.05 可能太高：0.45 vs 0.48 不会触发更新（0.48 < 0.45 + 0.05）
- 没有考虑**字段级别的 confidence**：整体 confidence 低但关键字段 confidence 高的情况
- 没有考虑**文档类型 confidence**：可能选错文档类型

**测试建议**:
需要用实际数据测试以下场景：
- Attempt 1: overall_confidence=0.45, 但 totalAmount 字段 confidence=0.3
- Attempt 2: overall_confidence=0.43, 但 totalAmount 字段 confidence=0.9
- 应该选择哪个？

### 5. **Bug #5: token_usage 可能不准确**

**位置**: `backend/app/services/ocr/l25_orchestrator.py:1088`

**问题代码**:
```python
return L25Result(
    ...
    token_usage=token_usage,  # ← 这是最后一次调用的 token_usage
    total_token_usage=total_token_usage,  # ← 这是累计的
    ...
)
```

**问题分析**:
- `token_usage` 字段返回的是**最后一次 AI 调用**的 token usage
- 但 OCR log 记录的是 `token_usage`（不是 `total_token_usage`）
- 如果有重试，OCR log 记录的 token 数量**不准确**

## 📊 影响评估

| Bug | 严重性 | 影响 | 优先级 |
|-----|--------|------|--------|
| #1 误导性日志 | 🟡 Medium | 开发者困惑，误以为有 bug | P2 |
| #2 缺少数据内容 | 🔴 Critical | **无法验证准确度**，无法优化 | P0 |
| #3 重试未持久化 | 🔴 Critical | **无法审计决策**，无法调试 | P0 |
| #4 选择逻辑问题 | 🟠 High | 可能选择次优结果 | P1 |
| #5 Token 统计错误 | 🟡 Medium | 成本分析不准确 | P2 |

## 🔧 修复建议

### Fix #1: 改进日志消息

```python
if len(all_results) > 1:
    best_result, best_confidence = select_best_result(
        all_results, all_confidences
    )
    confidence_history = ', '.join(f'{c:.2f}' for c in all_confidences)
    logger.info(
        f"L2.5 completed {len(all_results)} attempts with confidences: [{confidence_history}]. "
        f"Selected attempt {all_confidences.index(best_confidence) + 1} with confidence {best_confidence:.2f}"
    )
```

### Fix #2: 增强 OCR Log 记录完整数据

**修改 `log_ocr_attempt()` 参数**:
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
    # 新增参数：
    extracted_data: Optional[Dict[str, Any]] = None,  # ← 实际提取的数据
    prompt_used: Optional[str] = None,  # ← 使用的 prompt
    raw_response: Optional[str] = None,  # ← AI 原始响应
    field_confidences: Optional[Dict[str, float]] = None,  # ← 字段级别 confidence
    additional_data: Optional[Dict[str, Any]] = None,
) -> Path:
```

**增强的 log 格式**:
```json
{
  "document_id": "...",
  "timestamp": "2026-02-03T10:30:45.123Z",
  "attempt_number": 1,
  "model": "google/gemini-2.0-flash-001",

  "confidence": 0.85,
  "doc_type": "CASH BILL",
  "doc_type_confidence": 0.90,

  "tokens": {
    "prompt_tokens": 15000,
    "completion_tokens": 11566,
    "total_tokens": 26566
  },

  "extracted_data": {
    "documentNo": "227/143",
    "documentDate": "2024-10-15",
    "totalPayableAmount": 3315.00,
    "lineItems": [...]
  },

  "field_confidences": {
    "documentNo": 0.95,
    "documentDate": 0.88,
    "totalPayableAmount": 0.92
  },

  "prompt_used": "Extract document data...",
  "raw_response": "{\n  \"docType\": \"CASH BILL\",\n  ...\n}",

  "line_items_count": 2,
  "validation_errors": 0,
  "retry_reasons": []
}
```

### Fix #3: 记录所有重试结果

**创建 `log_all_attempts()` 函数**:
```python
def log_all_attempts(
    document_id: str,
    all_results: List[Dict[str, Any]],
    all_confidences: List[float],
    selected_index: int,
    models_used: List[str],
) -> Path:
    """
    Log all retry attempts for comparison and auditing.
    """
    log_dir = ensure_log_directory()
    timestamp = datetime.utcnow()
    filename = f"ocr_all_attempts_{document_id}_{timestamp.strftime('%Y%m%d_%H%M%S_%f')[:-3]}.json"
    log_file = log_dir / filename

    log_data = {
        "document_id": document_id,
        "timestamp": timestamp.isoformat() + "Z",
        "total_attempts": len(all_results),
        "selected_attempt": selected_index + 1,
        "attempts": [
            {
                "attempt_number": i + 1,
                "model": models_used[i],
                "confidence": all_confidences[i],
                "extracted_data": all_results[i],
                "is_selected": i == selected_index
            }
            for i in range(len(all_results))
        ]
    }

    with open(log_file, "w", encoding="utf-8") as f:
        json.dump(log_data, f, indent=2, ensure_ascii=False)

    return log_file
```

### Fix #4: 改进 select_best_result 逻辑

```python
def select_best_result(
    results: List[Dict[str, Any]],
    confidences: List[float],
    field_confidences_list: Optional[List[Dict[str, float]]] = None,
    critical_fields: Optional[List[str]] = None,
) -> Tuple[Dict[str, Any], float, int]:
    """
    Select the best result with improved logic.

    Returns:
        (best_result, best_confidence, best_index)
    """
    if not results:
        raise ValueError("No results to select from")

    if len(results) == 1:
        return results[0], confidences[0], 0

    # 降低阈值到 0.03（更敏感）
    CONFIDENCE_THRESHOLD = 0.03

    # 计算每个结果的综合分数
    scores = []
    for i, (result, conf) in enumerate(zip(results, confidences)):
        score = conf  # 基础分数

        # 考虑关键字段的 confidence
        if critical_fields and field_confidences_list and i < len(field_confidences_list):
            critical_confs = [
                field_confidences_list[i].get(field, 0.0)
                for field in critical_fields
            ]
            if critical_confs:
                critical_avg = sum(critical_confs) / len(critical_confs)
                score = score * 0.7 + critical_avg * 0.3  # 加权

        # 考虑完整度
        filled_count = _count_filled_fields(result)
        completeness_bonus = min(filled_count / 20, 0.1)  # 最多加 0.1
        score += completeness_bonus

        scores.append(score)

    # 选择最高分
    best_idx = scores.index(max(scores))
    best_result = results[best_idx]
    best_confidence = confidences[best_idx]

    logger.debug(
        f"Result scores: {[f'{s:.3f}' for s in scores]}, "
        f"selected index {best_idx}"
    )

    return best_result, best_confidence, best_idx
```

### Fix #5: 修复 token_usage 记录

```python
# 在 l25_orchestrator.py 调用 log_ocr_attempt 时：
log_ocr_attempt(
    document_id=document_id,
    ...
    tokens=total_token_usage,  # ← 改用累计的 token usage
    ...
)
```

## 🧪 测试验证计划

### 1. 准备测试数据
- 准备 3 个测试文档（简单、中等、复杂）
- 每个文档手动标注正确答案（ground truth）

### 2. 测试场景

**场景 A：重试逻辑验证**
- 强制触发 3 次重试
- 检查是否选择了最高 confidence 的结果
- 验证日志记录是否正确

**场景 B：数据准确度验证**
- 比对提取结果与 ground truth
- 计算准确率（field-level accuracy）
- 验证 confidence 分数是否反映真实准确度

**场景 C：成本统计验证**
- 验证 token usage 统计是否正确
- 检查多次重试时的累计 token

### 3. 日志审计
- 检查所有 OCR log 文件
- 验证是否记录了完整数据
- 确认重试过程的所有尝试都被保存

## 🎯 实施优先级

### Phase 1 (本周 - P0 修复)
1. ✅ Fix #2: 增强 OCR Log 记录完整数据
2. ✅ Fix #3: 记录所有重试结果
3. ✅ 添加测试验证

### Phase 2 (下周 - P1 优化)
1. ✅ Fix #4: 改进 select_best_result 逻辑
2. ✅ Fix #1: 改进日志消息
3. ✅ Fix #5: 修复 token_usage 记录

### Phase 3 (后续 - 持续优化)
1. ✅ 添加 OCR log 分析工具
2. ✅ 构建准确度监控仪表板
3. ✅ 实现自动化测试套件

## 📝 总结

当前 OCR 系统存在**多个严重 bug**，主要问题是：

1. **可观测性不足**：无法看到 AI 实际输出和 prompt
2. **可审计性缺失**：重试过程的决策无法追溯
3. **准确度无法验证**：没有记录实际提取的数据内容

这些问题导致：
- ❌ 无法验证系统准确度
- ❌ 无法优化 AI prompt
- ❌ 无法调试 AI 行为
- ❌ 无法分析成本效益

**建议立即进行 P0 修复**，增强日志记录和审计能力。
