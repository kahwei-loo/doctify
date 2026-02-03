# OCR Logfile Solution - Quick Start Guide

**Implementation Date**: 2026-01-31
**Approach**: Simple logfiles for MVP (no database complexity)
**Evolution Path**: Logfiles → Database (when scale demands) → Full MLOps (if successful)

---

## Overview

Simple timestamped JSON logfiles for tracking OCR attempts. Zero database complexity, human-readable, easy to analyze.

**Files Created**:
- `backend/app/utils/ocr_logger.py` - Logging utility
- `scripts/analyze_ocr_logs.py` - Analysis script
- `logs/ocr_attempts/` - Log directory (auto-created)

**Log Format**: `logs/ocr_attempts/ocr_{document_id}_{timestamp}.json`

---

## Log File Structure

```json
{
  "document_id": "3f42afd8-4af7-43ef-af18-53f6ee02fa41",
  "timestamp": "2026-01-31T10:30:45.123Z",
  "attempt_number": 1,
  "model": "google/gemini-2.0-flash-001",
  "tokens": {
    "prompt_tokens": 15000,
    "completion_tokens": 11566,
    "total_tokens": 26566
  },
  "confidence": 0.35,
  "doc_type": "receipt",
  "line_items_count": 2,
  "validation_errors": 2,
  "doc_type_confidence": 0.85,
  "retry_reasons": ["low_overall_confidence"],
  "has_validation_errors": true
}
```

---

## Quick Analysis Commands

### Using Python Script (Recommended)

```bash
# Analyze all logs
python scripts/analyze_ocr_logs.py

# Analyze last 7 days
python scripts/analyze_ocr_logs.py --days 7

# Find low confidence attempts (<0.5)
python scripts/analyze_ocr_logs.py --max-confidence 0.5

# Analyze specific model
python scripts/analyze_ocr_logs.py --model "openai/gpt-4o"

# Find high confidence attempts (>0.8)
python scripts/analyze_ocr_logs.py --min-confidence 0.8
```

### Using jq (Command Line)

```bash
# Average confidence by model
jq -s 'group_by(.model) | map({model: .[0].model, avg_conf: (map(.confidence) | add / length)})' logs/ocr_attempts/*.json

# Count attempts by model
jq -s 'group_by(.model) | map({model: .[0].model, count: length})' logs/ocr_attempts/*.json

# Find low confidence attempts
jq 'select(.confidence < 0.5)' logs/ocr_attempts/*.json

# Total tokens used
jq -s 'map(.tokens.total_tokens) | add' logs/ocr_attempts/*.json

# Average tokens per model
jq -s 'group_by(.model) | map({model: .[0].model, avg_tokens: (map(.tokens.total_tokens) | add / length)})' logs/ocr_attempts/*.json

# Count validation errors
jq -s '[.[] | select(.validation_errors > 0)] | length' logs/ocr_attempts/*.json

# Documents with retries (multiple attempts)
jq -s 'group_by(.document_id) | map(select(length > 1)) | length' logs/ocr_attempts/*.json
```

### Using grep (Quick Search)

```bash
# Find all attempts for specific document
grep "3f42afd8-4af7-43ef-af18-53f6ee02fa41" logs/ocr_attempts/*.json

# Find all low confidence attempts
grep -l '"confidence": 0\.[0-4]' logs/ocr_attempts/*.json

# Find all attempts using GPT-4o
grep -l '"openai/gpt-4o"' logs/ocr_attempts/*.json

# Count total log files
ls -1 logs/ocr_attempts/*.json | wc -l
```

---

## Common Analysis Workflows

### 1. Identify Top Problems

```bash
# Run comprehensive analysis
python scripts/analyze_ocr_logs.py

# Look at "Problem Patterns" section
# Example output:
#   ⚠️  Problem Patterns (Top 5):
#     • insufficient_line_items: 15 occurrences
#     • low_confidence_with_validation_errors: 12 occurrences
#     • uncertain_document_type: 8 occurrences
```

### 2. Compare Model Performance

```bash
# Analyze all models
python scripts/analyze_ocr_logs.py

# Check "Model Performance" section
# Example output:
#   openai/gpt-4o:
#     Avg Confidence: 0.823
#     Success Rate (≥0.7): 85.0%
#
#   google/gemini-2.0-flash-001:
#     Avg Confidence: 0.687
#     Success Rate (≥0.7): 60.0%
```

### 3. Track Escalation Effectiveness

```bash
# Check escalation success rate
python scripts/analyze_ocr_logs.py

# Look at "Model Escalation Analysis" section
# Example output:
#   Total Documents: 50
#   Documents with Retry: 15
#   Escalation Rate: 30.0%
#   Escalation Success Rate: 80.0%  # 80% improved after retry
```

### 4. Debug Specific Document

```bash
# Find all attempts for document
grep "3f42afd8-4af7-43ef-af18-53f6ee02fa41" logs/ocr_attempts/*.json

# Or use jq for prettier output
jq 'select(.document_id == "3f42afd8-4af7-43ef-af18-53f6ee02fa41")' logs/ocr_attempts/*.json

# View attempt progression
jq -s 'map(select(.document_id == "3f42afd8-4af7-43ef-af18-53f6ee02fa41")) | sort_by(.attempt_number)' logs/ocr_attempts/*.json
```

---

## Custom Python Analysis

```python
import json
import glob
from collections import defaultdict

# Load logs
logs = [json.load(open(f)) for f in glob.glob("logs/ocr_attempts/*.json")]

# Calculate average confidence
avg_conf = sum(log['confidence'] for log in logs) / len(logs)
print(f"Average Confidence: {avg_conf:.3f}")

# Group by model
model_stats = defaultdict(list)
for log in logs:
    model_stats[log['model']].append(log['confidence'])

# Print model performance
for model, confidences in model_stats.items():
    avg = sum(confidences) / len(confidences)
    print(f"{model}: {avg:.3f} (n={len(confidences)})")

# Find problematic documents (low confidence after retries)
doc_attempts = defaultdict(list)
for log in logs:
    doc_attempts[log['document_id']].append(log)

problematic = []
for doc_id, attempts in doc_attempts.items():
    if len(attempts) > 1:  # Has retries
        last_attempt = max(attempts, key=lambda x: x['attempt_number'])
        if last_attempt['confidence'] < 0.5:
            problematic.append(doc_id)

print(f"\nProblematic Documents: {len(problematic)}")
for doc_id in problematic[:5]:  # Show first 5
    print(f"  - {doc_id}")
```

---

## Maintenance

### Clean Up Old Logs

```bash
# Delete logs older than 30 days (manual)
find logs/ocr_attempts -name "ocr_*.json" -mtime +30 -delete

# Or use Python cleanup function
python -c "from app.utils.ocr_logger import cleanup_old_logs; cleanup_old_logs(days_to_keep=30)"
```

### Backup Logs

```bash
# Tar compress logs by month
tar -czf logs_backup_2026-01.tar.gz logs/ocr_attempts/ocr_*_202601*.json

# Move to backup directory
mkdir -p logs/backups
mv logs_backup_2026-01.tar.gz logs/backups/
```

---

## When to Migrate to Database

**Current Approach Works When**:
- ✅ <1000 documents/month
- ✅ Manual analysis <30 min/week
- ✅ Team <5 people
- ✅ MVP/early stage

**Migrate to Database When**:
- ⚠️ >5000 documents/month
- ⚠️ Manual analysis >30 min/week
- ⚠️ Need real-time dashboard
- ⚠️ Team >10 people
- ⚠️ Complex analytics required

**Migration Script**: When time comes, see `claudedocs/OCR_CONTINUOUS_OPTIMIZATION_KNOWLEDGE.md` for database migration guide.

---

## Troubleshooting

### No Logs Generated

```bash
# Check if log directory exists
ls -la logs/ocr_attempts/

# Check backend logs for errors
docker-compose logs -f doctify-backend | grep "OCR attempt logged"

# Verify logging is enabled (check l25_orchestrator.py has import)
grep "from app.utils.ocr_logger import log_ocr_attempt" backend/app/services/ocr/l25_orchestrator.py
```

### Analysis Script Errors

```bash
# Ensure script is executable
chmod +x scripts/analyze_ocr_logs.py

# Run with Python directly
python scripts/analyze_ocr_logs.py

# Check log file format (should be valid JSON)
jq . logs/ocr_attempts/ocr_*.json | head -20
```

---

## Integration with Existing Workflows

### 1. Check Logs After OCR Run

```bash
# Upload document through frontend/API
# Then check logs
python scripts/analyze_ocr_logs.py --days 1

# Or tail logs in real-time
tail -f logs/ocr_attempts/ocr_*.json
```

### 2. Daily/Weekly Analysis

```bash
# Add to crontab for weekly reports
0 9 * * 1 python /path/to/scripts/analyze_ocr_logs.py --days 7 > /tmp/ocr_weekly_report.txt
```

### 3. Pre-Commit Hook (Optional)

```bash
# .git/hooks/pre-commit
# Analyze recent changes
python scripts/analyze_ocr_logs.py --days 1
```

---

## Benefits Recap

**MVP Advantages** ✅:
- 30-minute implementation
- Zero database complexity
- Human-readable (cat/grep/jq)
- Easy to delete/cleanup
- Debugging-friendly (tail -f)
- Git-friendly (can version control if needed)

**Future Evolution** 🚀:
- Phase 2 (6 months): Migrate to PostgreSQL when >1000 docs/month
- Phase 3 (1 year): Full MLOps if business successful
- Progressive enhancement, not premature optimization

---

**Last Updated**: 2026-01-31
**Status**: ✅ Implemented and Ready to Use
