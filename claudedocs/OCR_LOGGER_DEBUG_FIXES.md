# OCR Logger Debugging & Fixes

**Created**: 2026-02-03
**Status**: 🔧 DEBUGGING IN PROGRESS
**Priority**: 🔴 P0 - Critical (logging completely broken)

---

## 🐛 Issues Discovered

### Issue 1: Relative Path (CRITICAL)
**Problem**: OCR logger used relative path `logs/ocr_attempts` instead of absolute path.

**Impact**:
- Logs created in wrong location (relative to working directory at runtime)
- Files not visible in expected `/app/logs/ocr_attempts/` directory
- Docker volume mapping not working

**Root Cause**:
```python
# BEFORE (WRONG)
LOGS_DIR = Path("logs/ocr_attempts")  # Relative path!

# AFTER (FIXED)
LOGS_DIR = Path("/app/logs/ocr_attempts")  # Absolute path
```

### Issue 2: Silent Failure
**Problem**: Exceptions caught and only logged to stderr, making debugging difficult.

**Impact**:
- Real errors hidden from celery logs
- No visibility into what's failing
- Can't diagnose permission issues, path issues, etc.

**Fix Applied**:
- Added `exc_info=True` to logger.error() for full stack traces
- Added `print()` statements to force output to celery stdout
- Added detailed log messages with emojis for visibility (✅/❌)

### Issue 3: Missing Debug Information
**Problem**: No visibility into logging process steps.

**Fix Applied**:
- Added info log before each log_ocr_attempt call
- Added info log in ensure_log_directory()
- Added warning when document_id extraction fails

---

## 🔧 Fixes Applied

### Fix 1: Absolute Path in ocr_logger.py
**File**: `backend/app/utils/ocr_logger.py` (Line 32-34)

```python
# Log directory configuration
# IMPORTANT: Use absolute path to work correctly in Docker container
LOGS_DIR = Path("/app/logs/ocr_attempts")
```

### Fix 2: Enhanced Error Logging in ocr_logger.py
**File**: `backend/app/utils/ocr_logger.py`

**Line 36-43** (ensure_log_directory):
```python
def ensure_log_directory() -> Path:
    """Ensure log directory exists, create if needed."""
    try:
        LOGS_DIR.mkdir(parents=True, exist_ok=True)
        logger.info(f"OCR log directory ensured: {LOGS_DIR}")
        return LOGS_DIR
    except Exception as e:
        logger.error(f"Failed to create OCR log directory {LOGS_DIR}: {e}")
        raise
```

**Line 158-165** (log_ocr_attempt):
```python
logger.info(f"✅ OCR attempt {attempt_number} logged to: {log_file}")
return log_file

except Exception as e:
    logger.error(f"❌ Failed to write OCR log file {log_file}: {e}", exc_info=True)
    # Also print to stdout for celery logs visibility
    print(f"❌ OCR LOGGER ERROR: Failed to write {log_file}: {e}")
    raise
```

**Line 289-295** (log_all_attempts):
```python
logger.info(f"✅ All {len(all_results)} OCR attempts logged to: {log_file}")
return log_file

except Exception as e:
    logger.error(f"❌ Failed to write all-attempts log file {log_file}: {e}", exc_info=True)
    # Also print to stdout for celery logs visibility
    print(f"❌ OCR LOGGER ERROR: Failed to write all-attempts log {log_file}: {e}")
    raise
```

### Fix 3: Enhanced Logging in l25_orchestrator.py
**File**: `backend/app/services/ocr/l25_orchestrator.py`

**Line 993** (before log_ocr_attempt call):
```python
logger.info(f"Logging OCR attempt {retry_context.attempt_number} for document {document_id} with model {current_model}")
```

**Line 1019-1022** (error handling):
```python
except Exception as log_error:
    # Don't fail the OCR process if logging fails, but log details to stderr AND stdout
    logger.error(f"❌ Failed to write OCR attempt log: {log_error}", exc_info=True)
    print(f"❌ OCR ORCHESTRATOR: Logging failed for attempt {retry_context.attempt_number}: {log_error}")
```

**Line 1071-1075** (before log_all_attempts):
```python
if document_id:
    logger.info(f"Logging all {len(all_results)} attempts for document {document_id}")
    log_all_attempts(...)
else:
    logger.warning(f"Could not extract document_id from file_path: {file_path}, skipping all-attempts log")
```

**Line 1084-1087** (error handling):
```python
except Exception as log_error:
    # Don't fail the OCR process if logging fails, but log details to stderr AND stdout
    logger.error(f"❌ Failed to write all-attempts log: {log_error}", exc_info=True)
    print(f"❌ OCR ORCHESTRATOR: All-attempts logging failed: {log_error}")
```

---

## 🧪 Testing & Verification Steps

### Step 1: Restart Containers (REQUIRED)
Code changes need container restart to take effect:

```bash
cd /path/to/doctify
docker-compose down
docker-compose up -d
```

**Wait for services to be healthy** (~30 seconds):
```bash
docker-compose ps
# All services should show (healthy)
```

### Step 2: Monitor Celery Logs in Real-Time
Open a terminal and watch celery logs:

```bash
docker-compose logs -f doctify-celery
```

**What to look for**:
1. ✅ **Success indicators**:
   ```
   OCR log directory ensured: /app/logs/ocr_attempts
   Logging OCR attempt 1 for document xxx with model qwen/qwen3-vl-8b-instruct
   ✅ OCR attempt 1 logged to: /app/logs/ocr_attempts/ocr_xxx_20260203_123456_789.json
   ```

2. ❌ **Error indicators**:
   ```
   ❌ Failed to create OCR log directory /app/logs/ocr_attempts: [error details]
   ❌ OCR LOGGER ERROR: Failed to write /app/logs/ocr_attempts/ocr_xxx.json: [error details]
   ❌ OCR ORCHESTRATOR: Logging failed for attempt 1: [error details]
   ```

### Step 3: Upload Test Document
1. Access frontend: http://localhost:3003
2. Login and upload a document (PDF or image)
3. Watch celery logs for logging messages

### Step 4: Verify Log Files Created
Check if log files are being created:

```bash
# Method 1: From host (if volume mapping works)
ls -la /path/to/doctify/backend/logs/ocr_attempts/

# Method 2: Inside container (most reliable)
docker-compose exec doctify-celery ls -la /app/logs/ocr_attempts/

# Method 3: Check file count
docker-compose exec doctify-celery sh -c "ls /app/logs/ocr_attempts/ | wc -l"
```

**Expected output**:
- Two JSON files per document:
  - `ocr_{document_id}_{timestamp}.json` (single attempt logs)
  - `ocr_all_attempts_{document_id}_{timestamp}.json` (comparison log)

### Step 5: Inspect Log File Content
```bash
# List files
docker-compose exec doctify-celery ls -lh /app/logs/ocr_attempts/

# Read a single attempt log
docker-compose exec doctify-celery cat /app/logs/ocr_attempts/ocr_{document_id}_{timestamp}.json

# Read all-attempts log
docker-compose exec doctify-celery cat /app/logs/ocr_attempts/ocr_all_attempts_{document_id}_{timestamp}.json
```

**Verify log contains**:
- ✅ `extracted_data` - actual extracted content
- ✅ `prompt_used` - prompt sent to AI
- ✅ `raw_response` - raw AI response
- ✅ `field_confidences` - per-field confidence scores
- ✅ `model` - model used (e.g., `qwen/qwen3-vl-8b-instruct`)
- ✅ `tokens` - token usage stats

---

## 🔍 Debugging Common Issues

### Problem: Directory Permission Denied
**Symptoms**:
```
❌ Failed to create OCR log directory /app/logs/ocr_attempts: Permission denied
```

**Solution**:
```bash
# Check volume permissions
docker-compose exec doctify-celery ls -ld /app/logs

# Fix permissions (if needed)
docker-compose exec -u root doctify-celery chmod 777 /app/logs
docker-compose exec -u root doctify-celery mkdir -p /app/logs/ocr_attempts
docker-compose exec -u root doctify-celery chmod 777 /app/logs/ocr_attempts
```

### Problem: Still Using Relative Path
**Symptoms**:
- Logs created but not in `/app/logs/ocr_attempts/`
- Files appear in unexpected location

**Verification**:
```bash
# Check where files are actually being created
docker-compose exec doctify-celery find / -name "ocr_*.json" 2>/dev/null
```

**Solution**:
- Verify code changes are applied (check ocr_logger.py line 34)
- Ensure container was restarted after code change

### Problem: No Logging Messages at All
**Symptoms**:
- No log messages in celery logs
- No ✅ or ❌ indicators

**Possible Causes**:
1. OCR not being triggered (document processing failed earlier)
2. Code not loaded (need container restart)
3. Log level too high (missing debug/info logs)

**Solution**:
```bash
# Check if celery worker is running
docker-compose ps doctify-celery

# Check for OCR task execution
docker-compose logs doctify-celery | grep -i "ocr\|document"

# Restart with fresh logs
docker-compose restart doctify-celery
docker-compose logs -f doctify-celery
```

### Problem: Model Name Errors
**Symptoms**:
```
Model not found: qwen/qwen-3-vl-8b-instruct
Invalid model identifier
```

**Solution**:
✅ Already fixed in previous update:
- `qwen/qwen-3-vl-8b-instruct` → `qwen/qwen3-vl-8b-instruct`
- `qwen/qwen-2.5-vl-32b-instruct` → `qwen/qwen3-vl-32b-instruct`
- `google/gemini-2.5-flash-preview-0925` → `google/gemini-3-flash-preview`

Verify in `backend/app/services/ocr/l25_orchestrator.py` line 748-756.

---

## 📊 Success Criteria

After fixes are verified, you should see:

### ✅ In Celery Logs
```
[INFO] OCR log directory ensured: /app/logs/ocr_attempts
[INFO] Logging OCR attempt 1 for document 3f42afd8-... with model qwen/qwen3-vl-8b-instruct
[INFO] ✅ OCR attempt 1 logged to: /app/logs/ocr_attempts/ocr_3f42afd8-..._20260203_123456_789.json
[INFO] L2.5 completed 3 attempts with confidences: [0.45, 0.43, 0.42]. Selected attempt 1 with confidence 0.45
[INFO] Logging all 3 attempts for document 3f42afd8-...
[INFO] ✅ All 3 OCR attempts logged to: /app/logs/ocr_attempts/ocr_all_attempts_3f42afd8-..._20260203_123456_790.json
```

### ✅ In Log Directory
```bash
$ docker-compose exec doctify-celery ls -lh /app/logs/ocr_attempts/
total 24K
-rw-r--r-- 1 root root 8.5K Feb  3 12:34 ocr_3f42afd8-4af7-43ef-af18-53f6ee02fa41_20260203_123456_789.json
-rw-r--r-- 1 root root 8.5K Feb  3 12:34 ocr_3f42afd8-4af7-43ef-af18-53f6ee02fa41_20260203_123457_123.json
-rw-r--r-- 1 root root 6.2K Feb  3 12:34 ocr_all_attempts_3f42afd8-4af7-43ef-af18-53f6ee02fa41_20260203_123457_456.json
```

### ✅ In Log File Content
```json
{
  "document_id": "3f42afd8-4af7-43ef-af18-53f6ee02fa41",
  "timestamp": "2026-02-03T12:34:56.789Z",
  "attempt_number": 1,
  "model": "qwen/qwen3-vl-8b-instruct",
  "confidence": 0.45,
  "extracted_data": {
    "docType": "CASH BILL",
    "documentNo": "227/143",
    "totalPayableAmount": 3315.00
  },
  "prompt_used": "System: You are a document...",
  "raw_response": "{\"docType\":\"CASH BILL\",...}",
  "field_confidences": {
    "documentNo": 0.95,
    "totalPayableAmount": 0.45
  }
}
```

---

## 📝 Next Steps After Verification

1. **If logging works**:
   - Document successful test results
   - Monitor logs for a few documents
   - Verify log file sizes are reasonable
   - Test log cleanup after 30 days (optional)

2. **If logging still fails**:
   - Capture full error stack trace from celery logs
   - Check Docker volume mapping in docker-compose.yml
   - Verify file system permissions inside container
   - Consider alternative log location (e.g., `/tmp/ocr_attempts/`)

3. **Performance monitoring**:
   - Watch log file sizes over time
   - Monitor disk space usage
   - Consider log rotation strategy if needed

---

## 🔗 Related Documentation

- **P0 Fixes**: `claudedocs/OCR_FIXES_IMPLEMENTED.md`
- **Model Config**: `claudedocs/MODEL_CONFIGURATION.md`
- **Bug Analysis**: `claudedocs/OCR_CRITICAL_BUGS_ANALYSIS.md`

---

**Last Updated**: 2026-02-03
**Status**: Fixes applied, awaiting container restart and testing
