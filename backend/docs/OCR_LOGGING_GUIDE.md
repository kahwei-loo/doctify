# OCR Logging System Guide

## 🎯 Design Philosophy

**Simple and practical approach for MVP stage**:
- ✅ **Dual logging**: Real-time stdout + persistent file storage
- ✅ **Readable format**: JSON + clear separators
- ✅ **Complete information**: Prompt, Response, Tokens, performance metrics
- ✅ **Fault-tolerant design**: Logging failures do not affect business logic

## 📋 Log Contents

Each OCR request records:

### Basic Information
- Timestamp (UTC)
- Document ID
- User ID
- Filename
- Attempt number

### AI Model Information
- Model name
- Token usage (Prompt/Completion/Total)
- Processing time

### Prompt & Response
- **Full Prompt** (the prompt sent to the AI)
- **Raw Response** (the complete response returned by the AI)
- **Structured Output** (parsed JSON data)

### Quality Metrics
- Confidence score
- Document type
- Validation error count

### Additional Information
- Function/Tool calling (if applicable)
- Retry reason
- Field-level confidence

## 📂 Log File Locations

### Inside Docker Container
```
/app/logs/ocr_attempts/
├── ocr_<document_id>_attempt1_<timestamp>.json
├── ocr_<document_id>_attempt2_<timestamp>.json
├── ocr_summary_<document_id>_<timestamp>.json
└── ...
```

### Host Machine (via Docker Volume)
```bash
# Check volume location
docker volume inspect doctify_backend_logs

# On Windows, typically at:
\\wsl$\docker-desktop-data\data\docker\volumes\doctify_backend_logs\_data\ocr_attempts
```

## 🔍 Viewing Logs

### Method 1: Docker Logs (Real-time Monitoring)
```bash
# View Celery worker logs (includes OCR structured logs)
docker-compose logs -f doctify-celery | grep "OCR_LOG"

# Example output:
# 📊 OCR_LOG: {"timestamp": "2026-02-03T13:45:30Z", "event": "ocr_request", ...}
```

### Method 2: View Log Files Directly
```bash
# Enter the container
docker exec -it doctify-celery-dev sh

# List recent logs
ls -lht /app/logs/ocr_attempts/ | head -10

# View a specific log
cat /app/logs/ocr_attempts/ocr_<document_id>_attempt1_*.json
```

### Method 3: Use the Log Viewer Script
```bash
# View the 10 most recent logs
docker exec doctify-celery-dev python scripts/view_ocr_logs.py

# View the 20 most recent logs
docker exec doctify-celery-dev python scripts/view_ocr_logs.py --limit 20

# View all logs for a specific document
docker exec doctify-celery-dev python scripts/view_ocr_logs.py --document-id <uuid>
```

### Method 4: Copy Logs to Local Machine
```bash
# Copy a specific log file
docker cp doctify-celery-dev:/app/logs/ocr_attempts/ocr_xxx.json ./

# Copy the entire log directory
docker cp doctify-celery-dev:/app/logs/ocr_attempts ./ocr_logs
```

## 📊 Log File Format Example

```json
{
  "timestamp": "2026-02-03T13:45:30Z",
  "log_version": "1.0",
  "document_id": "3f42afd8-4af7-43ef-af18-53f6ee02fa41",
  "user_id": "99f248e4-a403-431a-9d76-45a99c1d53d6",
  "filename": "receipt_001.jpg",
  "attempt_number": 1,
  "model": "qwen/qwen3-vl-8b-instruct",
  "tokens": {
    "prompt_tokens": 15234,
    "completion_tokens": 11566,
    "total_tokens": 26800
  },
  "processing_time_seconds": 3.45,
  "prompt": "You are a helpful assistant that processes documents...",
  "raw_response": "{\"documentNo\": \"227/143\", ...}",
  "extracted_data": {
    "documentNo": "227/143",
    "merchantName": "Mix Store",
    "totalAmount": 3315.00,
    "lineItems": []
  },
  "tools_called": [],
  "confidence": 0.8530,
  "doc_type": "receipt",
  "validation_errors": 0,
  "additional_data": {}
}
```

## 🔄 Multi-Attempt Scenarios

When OCR performs multiple retries:

1. **Each attempt is logged individually**:
   - `ocr_<doc_id>_attempt1_<ts>.json`
   - `ocr_<doc_id>_attempt2_<ts>.json`
   - `ocr_<doc_id>_attempt3_<ts>.json`

2. **Summary comparison log**:
   - `ocr_summary_<doc_id>_<ts>.json`
   - Contains a comparison of all attempts

## 🛠 Debugging Tips

### 1. Analyze Token Usage
```bash
# Find high token usage requests
docker exec doctify-celery-dev python scripts/view_ocr_logs.py --analyze
```

### 2. Check Low Confidence Cases
```bash
# Use the analysis script to identify low-confidence results
docker exec doctify-celery-dev python scripts/view_ocr_logs.py --analyze
```

### 3. Compare Different Model Performance
Review summary log files to compare models and results across different attempts.

### 4. Analyze Prompt Improvements
Examine the prompt section of log files for optimization opportunities.

## 🧹 Log Cleanup

### Automatic Cleanup (Recommended)
Logs older than 30 days are automatically cleaned up (via Celery scheduled task).

### Manual Cleanup
```bash
# Delete logs older than 30 days
docker exec doctify-celery-dev python -c "
from app.utils.simple_ocr_logger import cleanup_old_logs
deleted = cleanup_old_logs(days_to_keep=30)
print(f'Deleted {deleted} old log files')
"

# Delete all logs (use with caution!)
docker exec doctify-celery-dev sh -c "rm -rf /app/logs/ocr_attempts/*.json"
```

## 💡 FAQ

### Q: Why can't I find log files?
A: Check the following:
1. Confirm Docker volume is properly mounted: `docker volume inspect doctify_backend_logs`
2. Check if the directory exists inside the container: `docker exec doctify-celery-dev ls -la /app/logs/ocr_attempts/`
3. Check Celery logs for write errors: `docker-compose logs doctify-celery | grep OCR_LOG_ERROR`

### Q: What if log files are too large?
A: The logging system automatically truncates overly long content:
- Prompt is limited to 5,000 characters
- Raw Response is limited to 10,000 characters

### Q: How to analyze logs locally?
A: After copying logs to your local machine, open them with any JSON viewer or:
```bash
# Use VS Code
code ./ocr_logs/

# Use the analysis script
python scripts/view_ocr_logs.py --view ./ocr_logs/ocr_xxx.json
```

### Q: Can logging be disabled?
A: Yes, but not recommended. Logging is critical for debugging and optimization. If absolutely needed:
- Modify the code to skip logging calls
- Or set the environment variable `DISABLE_OCR_LOGGING=true`

## 🚀 Best Practices

1. **Review regularly**: Check recent logs daily to monitor system operation
2. **Compare attempts**: Use summary logs to compare results across different attempts
3. **Optimize prompts**: Use prompt and response data from logs to refine prompts
4. **Monitor tokens**: Track token usage to avoid excessive costs
5. **Save important logs**: For important test cases, promptly copy logs to local storage

## 📚 Related Documentation

- [OCR System Architecture](./OCR_ARCHITECTURE.md)
- [L2.5 Enhanced Processing](./L25_ENHANCEMENT.md)
- [Performance Optimization Guide](./PERFORMANCE_OPTIMIZATION.md)
