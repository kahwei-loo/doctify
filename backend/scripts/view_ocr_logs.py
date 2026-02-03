#!/usr/bin/env python3
"""
OCR 日志查看器 - 快速查看和分析 JSON 格式的 OCR 日志

用法:
    # 查看最近 10 条日志
    python scripts/view_ocr_logs.py

    # 查看最近 20 条日志
    python scripts/view_ocr_logs.py --limit 20

    # 查看特定文档的日志
    python scripts/view_ocr_logs.py --document-id <uuid>

    # 查看特定日志文件
    python scripts/view_ocr_logs.py --view <filepath>

    # 生成统计分析报告
    python scripts/view_ocr_logs.py --analyze

    # 在 Docker 容器中运行
    docker exec doctify-celery-dev python scripts/view_ocr_logs.py
"""

import argparse
import json
from pathlib import Path
from datetime import datetime


LOGS_DIR = Path("/app/logs/ocr_attempts")


def format_timestamp(ts_str: str) -> str:
    """格式化时间戳"""
    try:
        dt = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except:
        return ts_str


def format_tokens(tokens_dict: dict) -> str:
    """格式化 token 信息"""
    if not tokens_dict:
        return "N/A"
    total = tokens_dict.get("total_tokens", 0)
    prompt = tokens_dict.get("prompt_tokens", 0)
    completion = tokens_dict.get("completion_tokens", 0)
    return f"{total:,} ({prompt:,} prompt + {completion:,} completion)"


def list_recent_logs(limit: int = 10):
    """列出最近的日志文件"""
    if not LOGS_DIR.exists():
        print(f"❌ Log directory not found: {LOGS_DIR}")
        return

    log_files = sorted(
        LOGS_DIR.glob("ocr_*.json"),
        key=lambda p: p.stat().st_mtime,
        reverse=True
    )

    if not log_files:
        print("📭 No log files found")
        return

    print(f"\n📋 Recent OCR Logs ({len(log_files[:limit])} of {len(log_files)} total)\n")
    print("=" * 100)

    for i, log_file in enumerate(log_files[:limit], 1):
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            mtime = datetime.fromtimestamp(log_file.stat().st_mtime)
            size_kb = log_file.stat().st_size / 1024

            print(f"\n{i}. {log_file.name}")
            print(f"   Time:       {format_timestamp(data.get('timestamp', ''))}")
            print(f"   Document:   {data.get('document_id', 'N/A')}")
            print(f"   Model:      {data.get('model', 'N/A')}")
            print(f"   Tokens:     {format_tokens(data.get('tokens'))}")
            print(f"   Confidence: {data.get('confidence', 0):.1%}" if data.get('confidence') else "   Confidence: N/A")
            print(f"   Size:       {size_kb:.1f} KB")

        except Exception as e:
            print(f"\n{i}. {log_file.name}")
            print(f"   ❌ Error reading file: {e}")


def view_log(log_file: Path):
    """显示日志文件详细内容"""
    if not log_file.exists():
        print(f"❌ Log file not found: {log_file}")
        return

    try:
        with open(log_file, 'r', encoding='utf-8') as f:
            data = json.load(f)

        print("\n" + "=" * 100)
        print(f"📄 {log_file.name}")
        print("=" * 100)

        # 基本信息
        print("\n📋 Basic Information:")
        print(f"  Timestamp:    {format_timestamp(data.get('timestamp', ''))}")
        print(f"  Document ID:  {data.get('document_id', 'N/A')}")
        print(f"  User ID:      {data.get('user_id', 'N/A')}")
        print(f"  Filename:     {data.get('filename', 'N/A')}")
        print(f"  Attempt:      #{data.get('attempt_number', 1)}")

        # AI 模型信息
        print("\n🤖 AI Model Information:")
        print(f"  Model:        {data.get('model', 'N/A')}")
        print(f"  Tokens:       {format_tokens(data.get('tokens'))}")
        proc_time = data.get('processing_time_seconds')
        if proc_time:
            print(f"  Proc Time:    {proc_time:.2f}s")

        # 质量指标
        print("\n📊 Quality Metrics:")
        conf = data.get('confidence')
        if conf is not None:
            print(f"  Confidence:   {conf:.1%} ({conf:.4f})")
        print(f"  Doc Type:     {data.get('doc_type', 'N/A')}")
        print(f"  Val Errors:   {data.get('validation_errors', 0)}")

        # Tools Called
        tools = data.get('tools_called', [])
        if tools:
            print("\n🔧 Tools Called:")
            for tool in tools:
                print(f"  - {tool}")

        # Prompt (前 500 字符)
        prompt = data.get('prompt')
        if prompt:
            print("\n📝 Prompt (first 500 chars):")
            print(f"  {prompt[:500]}")
            if len(prompt) > 500:
                print(f"  ... (total {len(prompt)} chars)")

        # Extracted Data
        extracted = data.get('extracted_data')
        if extracted:
            print("\n✅ Extracted Data:")
            print(json.dumps(extracted, indent=2, ensure_ascii=False))

        # Additional Data
        additional = data.get('additional_data')
        if additional:
            print("\n📦 Additional Data:")
            print(json.dumps(additional, indent=2, ensure_ascii=False))

        print("\n" + "=" * 100)

    except Exception as e:
        print(f"❌ Error reading log file: {e}")


def find_document_logs(document_id: str):
    """查找特定文档的所有日志"""
    if not LOGS_DIR.exists():
        print(f"❌ Log directory not found: {LOGS_DIR}")
        return

    pattern = f"ocr_{document_id}_*.json"
    log_files = sorted(
        LOGS_DIR.glob(pattern),
        key=lambda p: p.stat().st_mtime,
        reverse=True
    )

    if not log_files:
        print(f"📭 No logs found for document: {document_id}")
        return

    print(f"\n📋 Logs for Document {document_id} ({len(log_files)} files)\n")
    print("=" * 100)

    for i, log_file in enumerate(log_files, 1):
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            print(f"\n{i}. Attempt #{data.get('attempt_number', i)}")
            print(f"   Time:       {format_timestamp(data.get('timestamp', ''))}")
            print(f"   Model:      {data.get('model', 'N/A')}")
            print(f"   Tokens:     {format_tokens(data.get('tokens'))}")
            print(f"   Confidence: {data.get('confidence', 0):.1%}" if data.get('confidence') else "   Confidence: N/A")
            print(f"   File:       {log_file.name}")

        except Exception as e:
            print(f"\n{i}. {log_file.name}")
            print(f"   ❌ Error: {e}")


def analyze_logs(document_id: str = None, limit: int = 100):
    """分析日志并生成统计报告"""
    if not LOGS_DIR.exists():
        print(f"❌ Log directory not found: {LOGS_DIR}")
        return

    # 查找日志文件
    if document_id:
        pattern = f"ocr_{document_id}_*.json"
    else:
        pattern = "ocr_*.json"

    log_files = sorted(
        LOGS_DIR.glob(pattern),
        key=lambda p: p.stat().st_mtime,
        reverse=True
    )[:limit]

    if not log_files:
        print("📭 No log files found for analysis")
        return

    # 统计数据
    total_requests = 0
    total_tokens = 0
    total_time = 0.0
    model_stats = {}
    confidence_scores = []

    for log_file in log_files:
        try:
            with open(log_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            total_requests += 1

            # Token 统计
            tokens = data.get("tokens", {})
            total_tokens += tokens.get("total_tokens", 0)

            # 耗时统计
            proc_time = data.get("processing_time_seconds", 0)
            if proc_time:
                total_time += proc_time

            # 模型统计
            model = data.get("model", "unknown")
            if model not in model_stats:
                model_stats[model] = {"count": 0, "total_tokens": 0, "total_time": 0}
            model_stats[model]["count"] += 1
            model_stats[model]["total_tokens"] += tokens.get("total_tokens", 0)
            model_stats[model]["total_time"] += proc_time or 0

            # 置信度统计
            conf = data.get("confidence")
            if conf is not None:
                confidence_scores.append(conf)

        except Exception as e:
            print(f"⚠️  Error analyzing {log_file.name}: {e}")

    # 打印报告
    print("\n" + "=" * 100)
    print("📊 OCR Logs Analysis Report")
    print("=" * 100)

    print(f"\n📈 Overall Statistics:")
    print(f"  Total Requests:       {total_requests:,}")
    print(f"  Total Tokens:         {total_tokens:,}")
    print(f"  Avg Tokens/Request:   {total_tokens / total_requests if total_requests > 0 else 0:,.0f}")
    print(f"  Total Processing:     {total_time:.2f}s")
    print(f"  Avg Time/Request:     {total_time / total_requests if total_requests > 0 else 0:.2f}s")

    if confidence_scores:
        print(f"\n🎯 Confidence Statistics:")
        print(f"  Average:              {sum(confidence_scores) / len(confidence_scores):.1%}")
        print(f"  Maximum:              {max(confidence_scores):.1%}")
        print(f"  Minimum:              {min(confidence_scores):.1%}")

    if model_stats:
        print(f"\n🤖 Model Statistics:")
        for model, stats in sorted(model_stats.items(), key=lambda x: x[1]['count'], reverse=True):
            print(f"\n  {model}:")
            print(f"    Requests:           {stats['count']:,}")
            print(f"    Total Tokens:       {stats['total_tokens']:,}")
            print(f"    Avg Tokens:         {stats['total_tokens'] / stats['count'] if stats['count'] > 0 else 0:,.0f}")
            if stats['total_time'] > 0:
                print(f"    Avg Time:           {stats['total_time'] / stats['count']:.2f}s")

    print("\n" + "=" * 100)


def main():
    parser = argparse.ArgumentParser(description='View and analyze OCR logs')
    parser.add_argument('--limit', type=int, default=10, help='Number of recent logs to show')
    parser.add_argument('--document-id', type=str, help='Show logs for specific document ID')
    parser.add_argument('--view', type=str, help='View specific log file')
    parser.add_argument('--analyze', action='store_true', help='Generate analysis report')
    parser.add_argument('--analyze-limit', type=int, default=100, help='Number of logs to analyze')

    args = parser.parse_args()

    if args.analyze:
        analyze_logs(document_id=args.document_id, limit=args.analyze_limit)
    elif args.document_id:
        find_document_logs(args.document_id)
    elif args.view:
        view_log(Path(args.view))
    else:
        list_recent_logs(args.limit)


if __name__ == '__main__':
    main()
