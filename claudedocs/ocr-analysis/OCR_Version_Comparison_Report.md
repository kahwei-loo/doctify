# OCR Version Comparison Report - Model Escalation Bug

## 📋 Executive Summary

**Test Document**: MIX.STORE Receipt (ID: 3f42afd8-4af7-43ef-af18-53f6ee02fa41)
**Upload Time**: 2026-01-30 10:58:14 (UTC+8)
**Test Result**: ❌ **CRITICAL BUG - Model Information Recording Error**

**Key Findings**:
1. ✅ Model escalation code logic is correct
2. ❌ **Model field in metadata records incorrectly**
3. ❓ Cannot verify if model escalation actually executed

---

## 🐛 Root Cause: Model Information Loss

### Bug #1: Model Field Source Error

**Problem Location**: `app/services/ocr/orchestrator.py:487`

**Erroneous Code**:
```python
def _convert_l25_result_to_extraction_result(self, l25_result):
    return {
        "model": self.model,  # ❌ BUG: Uses orchestrator's initial model
        "provider": self.provider,
        # ...
    }
```

**Problem**:
- `self.model` is the value from orchestrator initialization (gpt-4-vision-preview or gpt-4o-mini)
- L25Orchestrator internally escalates model, but this information **is not passed back**
- Final metadata always shows **initial model**, not the actually used model

---

### Bug #2: L25Result Missing Model Field

**Problem Location**: `app/services/ocr/l25_orchestrator.py:122-175`

**L25Result Definition**:
```python
@dataclass
class L25Result:
    standardized_output: Optional[Dict[str, Any]]
    # ... other fields
    # ❌ Missing: model field
    # ❌ Missing: models_used (retry history)
```

**to_dict() Method**:
```python
def to_dict(self) -> Dict[str, Any]:
    return {
        # ... other fields
        "l25_metadata": {
            "l25_enabled": self.l25_enabled,
            # ❌ Missing: model information
        },
    }
```

---

## 📊 Actual Data Proves the Problem

### Database Metadata

```json
{
  "model": "openai/gpt-4o-mini",  // ❌ Shows initial model
  "l25_metadata": {
    "retry_count": 2,  // ✅ Did retry 2 times
    "retry_reasons": [
      "low_overall_confidence",
      "missing_critical_fields",
      "low_overall_confidence",
      "missing_critical_fields"
    ]
  },
  "total_token_usage": {
    "total_tokens": 79621  // ✅ 78K ≈ 26K x 3 attempts
  }
}
```

**Evidence**:
1. `retry_count: 2` → Did retry 2 times (3 total attempts)
2. `total_tokens: 79621` → Multiple API calls (26K x 3)
3. `model: "gpt-4o-mini"` → **But still shows initial model**
4. **Missing each retry's model record**

---

## 🔍 Model Escalation Code Review

### ✅ Code Logic is Correct

**Escalation Chain** (Line 737-749):
```python
self.model_escalation_chain = [
    base_model,                              # Retry 0
    "openai/gpt-4o-mini",                    # Retry 1
    "openai/gpt-4o",                         # Retry 2
    "anthropic/claude-3-5-sonnet-20241022",  # Retry 3
]
self.model = self.model_escalation_chain[0]
```

**Retry Loop** (Line 802-807):
```python
model_index = min(
    retry_context.attempt_number - 1,
    len(self.model_escalation_chain) - 1
)
current_model = self.model_escalation_chain[model_index]
self.model = current_model  # ✅ Model should be updated
```

**API Call** (Line 1136):
```python
completion = await self.client.chat.completions.create(
    model=self.model,  # ✅ Uses escalated model
    # ...
)
```

---

## ❓ Is Model Escalation Actually Working?

### Two Possible Scenarios

**Scenario A**: Escalation works, but metadata records incorrectly
```
Attempt 1: gpt-4o-mini → confidence 0.35 → RETRY
Attempt 2: gpt-4o      → confidence 0.38 → RETRY
Attempt 3: gpt-4o      → confidence 0.41 → DONE
But metadata shows: "model": "gpt-4o-mini" ❌
```

**Scenario B**: Escalation doesn't work at all (code has bug)
```
Attempt 1: gpt-4o-mini → confidence 0.35 → RETRY
Attempt 2: gpt-4o-mini → confidence 0.38 → RETRY (BUG!)
Attempt 3: gpt-4o-mini → confidence 0.41 → DONE
metadata shows: "model": "gpt-4o-mini" ✅ (but result is poor)
```

**Currently cannot determine which scenario!**

---

## 🔧 Fix Solutions

### Fix #1: Add Model Field to L25Result (P0)

**File**: `app/services/ocr/l25_orchestrator.py`

**Step 1**: Add field to dataclass
```python
@dataclass
class L25Result:
    # ... existing fields

    # ✅ New fields
    model: str  # Final model used
    models_used: List[Dict[str, Any]]  # Retry history
```

**Step 2**: Record model in retry loop
```python
models_used = []

while True:
    # ... escalation logic
    current_model = self.model_escalation_chain[model_index]
    self.model = current_model

    attempt_info = {
        "attempt": retry_context.attempt_number,
        "model": current_model,
        "timestamp": datetime.utcnow().isoformat(),
    }

    # API call
    ai_response = await self._call_document_intelligence(...)

    attempt_info.update({
        "tokens": ai_response.get("token_usage", {}),
        "confidence": current_confidence,
    })
    models_used.append(attempt_info)
```

**Step 3**: Return with model
```python
return L25Result(
    # ... existing fields
    model=self.model,
    models_used=models_used,
)
```

---

### Fix #2: Orchestrator Uses L25's Model (P0)

**File**: `app/services/ocr/orchestrator.py`

**Modify Line 487**:
```python
def _convert_l25_result_to_extraction_result(self, l25_result):
    result_dict = l25_result.to_dict()
    return {
        "model": result_dict.get("model", self.model),  # ✅ Use L25's model
        "l25_metadata": {
            # ... existing fields
            "models_used": result_dict.get("models_used", []),  # ✅ Add history
        },
    }
```

---

### Fix #3: Enhanced Logging (P1)

**File**: `app/services/ocr/l25_orchestrator.py`

**Enhanced retry logging**:
```python
if is_retry:
    logger.warning(  # ✅ Change to WARNING to ensure output
        f"🔄 L2.5 RETRY #{retry_context.attempt_number}: "
        f"Escalating to {current_model}"
    )

# After API call
logger.warning(
    f"✅ Attempt #{retry_context.attempt_number}: "
    f"Model={current_model} | Confidence={current_confidence:.3f}"
)
```

---

## 📈 Expected Effect After Fix

### Before (Current)
```json
{
  "model": "openai/gpt-4o-mini",
  "confidence": 0.41,
  "retry_count": 2
}
```
Problem: Don't know if escalation actually happened

### After (Fixed)
```json
{
  "model": "openai/gpt-4o",
  "confidence": 0.41,
  "retry_count": 2,
  "l25_metadata": {
    "models_used": [
      {
        "attempt": 1,
        "model": "openai/gpt-4o-mini",
        "tokens": {"total": 26566},
        "confidence": 0.35
      },
      {
        "attempt": 2,
        "model": "openai/gpt-4o",  // ✅ Can see escalation
        "tokens": {"total": 26500},
        "confidence": 0.38
      },
      {
        "attempt": 3,
        "model": "openai/gpt-4o",
        "tokens": {"total": 26555},
        "confidence": 0.41
      }
    ]
  }
}
```
Advantage: Clearly see model escalation process

---

## 🎯 Verification Plan

1. **Implement Fixes** → Modify 3 files
2. **Retest** → Upload same MIX.STORE receipt
3. **Check Logs** → Confirm escalation executes
4. **Check Database** → Verify models_used records

---

_Report Generated: 2026-01-30 12:27_
_Analysis Tool: Docker Compose + PostgreSQL_
