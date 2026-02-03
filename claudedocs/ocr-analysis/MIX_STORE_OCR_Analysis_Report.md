# MIX.STORE Receipt OCR Analysis Report

## 📄 Document Information

**Document ID**: `3f42afd8-4af7-43ef-af18-53f6ee02fa41`
**Original Filename**: `fad97bc0cf4749e21e446dbc4cf4be5c.jpg`
**Upload Time**: 2026-01-30 10:58:14 (UTC+8)
**Processing Status**: ✅ completed
**File Type**: image/jpeg

---

## 🎯 OCR Processing Results Overview

| Metric | Value | Status |
|--------|-------|--------|
| **Overall Confidence** | 0.41 | ⚠️ **Extremely Low** (Target >0.80) |
| **Model Used** | openai/gpt-4o-mini | Retry #0 |
| **Retry Count** | 2 retries | ⚠️ Maximum retries reached |
| **Token Usage** | 79,621 tokens | High consumption |
| **Processing Time** | 22.4s | Normal |
| **Validation** | 1 warning | ⚠️ line_items_mismatch |

**Retry Reasons**:
- Retry #1: `low_overall_confidence` + `missing_critical_fields`
- Retry #2: `low_overall_confidence` + `missing_critical_fields`

---

## ❌ Detailed Recognition Errors Comparison

### 1. Date Recognition Error - **CRITICAL**

| Field | Actual Value | OCR Extracted Value | Status |
|-------|--------------|---------------------|--------|
| **Date** | 2022-01-17 | 2023-10-01 | ❌ **Completely Wrong** |
| **Time** | 22:48:44 | (missing) | ❌ **Not Extracted** |

**Issues**:
- Date recognition completely incorrect (2022 vs 2023, 01 vs 10)
- documentTime field completely missing

---

### 2. Line Items Recognition Error - **CRITICAL**

#### Actual Receipt Content (4 items):

```
1. [Promo]元气森林 葡萄味桃汽水 (蒸汽水)
   - Qty: 1
   - Unit Price: 3.50
   - Subtotal: 3.50
   - Discount: -0.60
   - Final: 2.90

2. [Promo]元气森林 森米气泡水 (橘水)
   - Qty: 2
   - Unit Price: 3.90
   - Subtotal: 7.80
   - Discount: -0.80
   - Final: 7.00

3. [Promo]元气森林 葡萄味桃汽水 蜜桃水 (水蜜桃)
   - Qty: 1
   - Unit Price: 3.50
   - Subtotal: 3.50
   - Discount: -0.60
   - Final: 2.90

4. MIX Plastic Bag (L)
   - Qty: 1
   - Unit Price: 0.20
   - Subtotal: 0.20
   - Discount: 0.00
   - Final: 0.20
```

#### OCR Extracted Result (only 2 items, with errors):

```json
[
  {
    "description": "元芸滋补饮品(水蜜桃味)",  // ❌ Brand error: "元芸" vs "元气森林"
    "quantity": 3.5,                      // ❌ Quantity error: 3.5 vs 1
    "unitPrice": 3.5,                     // ❌ Quantity and price confused
    "amount": 12.25                       // ❌ Amount calculation error
  },
  {
    "description": "MIX Plastic Bag (L)", // ✅ Correct
    "quantity": 0.2,                      // ❌ Quantity error: 0.2 vs 1
    "unitPrice": 0.2,                     // ✅ Price correct
    "amount": 0.04                        // ❌ Amount error: 0.04 vs 0.20
  }
]
```

**Issue Summary**:
1. ❌ **Only identified 2 items, actually 4** - Missing 2 "元气森林" products
2. ❌ **Brand name error** - "元芸滋补饮品" vs "元气森林"
3. ❌ **Quantity and Price confused** - quantity shows 3.5, should be price
4. ❌ **Amount calculation errors** - 12.25 and 0.04 both incorrect
5. ❌ **Merged multiple items** - Merged 3 元气森林 items into 1

---

### 3. Amount Fields Comparison

| Field | Actual Value | OCR Extracted Value | Status |
|-------|--------------|---------------------|--------|
| **Subtotal** | RM 15.00 | 15 | ✅ Correct |
| **Item Discount** | RM 2.00 | (missing) | ❌ **Not Extracted** |
| **Coupon Applied** | RM -2.00 | (missing) | ❌ **Not Extracted** |
| **Order Discount** | (unclear) | (missing) | ⚠️ Not extracted |
| **Rounding Adj** | RM 0.00 | (missing) | ❌ **Not Extracted** |
| **Nett Total** | RM 13.00 | 13 | ✅ Correct |
| **Tax Amount** | RM 0.00 | 0 | ✅ Correct |

**Missing Critical Fields**:
- ❌ `totalDiscountAmount`: Should be 2.00 (Item Discount)
- ❌ `totalRoundingAmount`: Should be 0.00
- ❌ `serviceCharge`: Should be 0.00
- ❌ `documentTime`: Should be "22:48:44"

---

### 4. Merchant Information Comparison

| Field | Actual Value | OCR Extracted Value | Status |
|-------|--------------|---------------------|--------|
| **Vendor Name** | MIX.STORE | MIX STORE | ✅ Basically correct |
| **Address** | Mix Store@Semenyin, 1-07-01 Block H... | (missing) | ❌ Not extracted |
| **Seller Reg No** | (not on receipt) | 202401012345 | ❌ **Hallucinated!** |
| **Buyer Name** | Loo Kah Wei | Loo Kah Wei | ✅ Correct |

**Issues**:
- `seller_reg_no: "202401012345"` is a **hallucinated field** - this information doesn't exist on the receipt

---

## 🔍 Root Cause Analysis

### 1. Reasons for Extremely Low Confidence

**Actual Confidence: 0.41** (Target: >0.80)

Possible causes:
1. ❌ **Image Quality** - Receipt is tilted, uneven lighting, some text blurry
2. ❌ **Chinese Character Recognition** - "元气森林" misidentified as "元芸滋补饮品"
3. ❌ **Complex Layout** - Multiple similar products with [Promo] tags, scattered discount information
4. ❌ **Field Confusion** - Quantity and Price values similar (3.5, 3.90), easily confused
5. ❌ **Model Limitations** - gpt-4o-mini performs poorly on complex Chinese receipts

---

### 2. Line Items Mismatch Warning

**Validation Warning**:
```
Line items total (12.29) doesn't match subtotal (15)
Delta: 18.07% (exceeds 10% threshold)
```

**Reason**:
- OCR calculation: 12.25 + 0.04 = 12.29
- Actual Subtotal: 15.00
- Difference: 2.71 (18.07%)

**Problem**:
- Severe line items missing causing total mismatch
- Should trigger ERROR and retry, but after 2 retries still not improved

---

### 3. Why Did 2 Retries Still Fail?

**Retry History**:
```
Retry #0 (gpt-4o-mini): Low confidence, missing fields → RETRY
Retry #1 (gpt-4o-mini): Still low confidence, missing fields → RETRY
Retry #2 (gpt-4o-mini): Still failing → Max retries reached, returned low-quality result
```

**Problems**:
1. ❌ **Model didn't escalate** - Should upgrade from gpt-4o-mini to gpt-4o or claude
2. ❌ **Same model retry** - Repeating with same model won't improve results
3. ⚠️ **Validation threshold** - Line items mismatch 18% exceeds 10%, should be ERROR not WARNING

---

## 🐛 Discovered Bugs and Issues

### Bug #1: Model Escalation Not Working

**Expected Behavior**:
```python
Retry #0: gpt-4o-mini (base model)
Retry #1: gpt-4o (escalate)
Retry #2: anthropic/claude-3-5-sonnet (escalate)
```

**Actual Behavior**:
```
Retry #0: gpt-4o-mini
Retry #1: gpt-4o-mini (❌ Didn't escalate!)
Retry #2: gpt-4o-mini (❌ Didn't escalate!)
```

**Cause**: Model escalation code may not be executing correctly

---

### Bug #2: Line Items Validation Should Be ERROR

**Current Behavior**:
```json
"warnings": [{
  "code": "line_items_mismatch",
  "message": "Line items total (12.29) doesn't match subtotal (15)"
}]
```

**Problem**: 18.07% difference should be ERROR (>10% threshold), but classified as WARNING

**Expected Behavior**: Should trigger ERROR → Force retry with better model

---

### Bug #3: Hallucinated Field

**Finding**: `seller_reg_no: "202401012345"`

**Problem**: Receipt doesn't have this information, AI fabricated it

**Cause**: Although `additionalProperties: false` constraint exists, `seller_reg_no` is a valid field in schema, so AI tries to populate it even when not on receipt

---

### Bug #4: Missing Discount Fields

**Receipt Actually Has**:
- Item Discount: RM 2.00
- Coupon Applied: -RM 2.00

**OCR Result Missing**:
- `totalDiscountAmount`: (not extracted)

**Cause**: Although schema has this field, AI didn't correctly identify discount information

---

## 📊 Comparison with Previous McDonald's Test

| Metric | McDonald's (Doc 2) | MIX.STORE (Current) |
|--------|-------------------|---------------------|
| **Confidence** | 0.45 | 0.41 |
| **Line Items Accuracy** | 0% (100% hallucinated) | 50% (2/4 extracted, with errors) |
| **Discount Detection** | ❌ Missing | ❌ Missing |
| **Date Accuracy** | ✅ Correct | ❌ Completely wrong |
| **Model Escalation** | ❌ Not working | ❌ Not working |
| **Validation** | Warning passed | Warning passed |

**Conclusion**: Similar problem patterns suggest P0+P1 fixes may not have fully taken effect

---

## 🔧 Issues Needing Fix

### 🔴 Critical (P0)

1. **Model Escalation Not Executing**
   - Check model switching code in retry logic
   - Verify `self.model_escalation_chain` is correct
   - Ensure `self.model` is properly set during retry

2. **Severe Line Items Missing**
   - 4 items only extracted 2
   - Chinese brand name recognition error ("元气森林" vs "元芸滋补饮品")
   - Quantity/Price confusion

3. **Date Recognition Error**
   - 2022-01-17 recognized as 2023-10-01
   - Completely wrong year, month, date

---

### 🟡 Important (P1)

4. **Discount Fields Not Extracted**
   - `totalDiscountAmount` in schema but not extracted
   - Item-level discount information lost

5. **Validation Threshold Issue**
   - 18% difference should be ERROR not WARNING
   - Should trigger forced retry

6. **Time Field Missing**
   - `documentTime` completely not extracted
   - Receipt clearly shows "22:48:44"

---

### 🟢 Low Priority (P2)

7. **Hallucinated Field**
   - `seller_reg_no` fabricated data
   - Need stricter validation

8. **Rounding Field Missing**
   - `totalRoundingAmount` not extracted

---

## 🎯 Recommended Fix Steps

### Step 1: Verify Model Escalation Code

```bash
# Check retry logic
cd backend
grep -n "model_escalation_chain" app/services/ocr/l25_orchestrator.py

# Check model switching in retry loop
grep -A 10 "retry_context.attempt_number" app/services/ocr/l25_orchestrator.py
```

**Expected**: Should see code like:
```python
model_index = min(
    retry_context.attempt_number - 1,
    len(self.model_escalation_chain) - 1
)
current_model = self.model_escalation_chain[model_index]
self.model = current_model
```

---

### Step 2: Check Validation Logic

```bash
# Check validation threshold
grep -A 5 "line_items_mismatch" backend/app/services/ocr/validation_layer.py
```

**Expected**: Should see 10% threshold and ERROR severity

---

### Step 3: Test Model Escalation

Create test script to verify escalation works:

```python
# test_model_escalation.py
from app.services.ocr.l25_orchestrator import L25Orchestrator

orchestrator = L25Orchestrator()

print("Model escalation chain:")
for i, model in enumerate(orchestrator.model_escalation_chain):
    print(f"  Retry {i}: {model}")

print(f"\nInitial model: {orchestrator.model}")
```

---

### Step 4: Retest This Receipt

Use fixed code to reprocess this MIX.STORE receipt, expected improvements:

| Metric | Current | After Fix Target |
|--------|---------|-----------------|
| **Confidence** | 0.41 | >0.80 |
| **Line Items Count** | 2/4 (50%) | 4/4 (100%) |
| **Date Accuracy** | ❌ Wrong | ✅ 2022-01-17 |
| **Discount Detection** | ❌ Missing | ✅ 2.00 |
| **Model Escalation** | ❌ Not working | ✅ gpt-4o-mini → gpt-4o |
| **Validation** | WARNING passed | ERROR triggers retry |

---

## 📝 Complete Receipt Content (For Reference)

```
MIX.STORE
Mix Store@Semenyin
1-07-01 Block H Pasal Komersial Jalan
Semenyin, Semenyih 43500
Selangor

Date: 2022-01-17 22:48:44
Receipt No: 1700172260119700269

Product Name | Price*Qty | Amount | Disc | Total
------------------------------------------------
[Promo]元气森林 葡萄味桃汽水 蒸汽水
             3.50×1        3.50   0.60   2.90

[Promo]元气森林 森米气泡水 橘水 900ml
             3.90×2        7.80   0.80   7.00

[Promo]元气森林 葡萄味桃汽水 蜜桃水 茶白小
600ml        3.50×1        3.50   0.60   2.90

MIX Plastic Bag (L)
             0.20×1        0.20   0.00   0.20

Subtotal:                                 15.00
Item Discount:                             2.00
Coupon Applied:                           -2.00
Order Discount:                            0.00
Rounding Adj:                              0.00
Nett Total:                               13.00

Order Received:           RM              13.00
Cash:                     RM              13.00
Change:                   RM              13.00

Name:                                Loo Kah Wei
Level:                               SnackTaster
```

---

## 🔬 Next Investigation Steps

1. **View Complete Logs** - Check model usage during retries
2. **Verify Code** - Confirm model escalation code is executed
3. **Test Other Models** - Manually test this receipt with gpt-4o
4. **Check Prompt** - Verify 2092-character enhanced prompt is being used

---

_Report Generated: 2026-01-30 11:16_
_Document ID: 3f42afd8-4af7-43ef-af18-53f6ee02fa41_
_Analysis Tool: Docker Compose + PostgreSQL Query_
