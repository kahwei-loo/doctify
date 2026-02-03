"""
Simple OCR Logger for MVP - JSON 格式，便于分析和调试

特点:
- JSON 文件日志 (机器可读, 便于分析)
- 清晰的 stdout 输出 (人类可读, 实时监控)
- 容错设计 (日志失败不影响业务)
- 完整信息 (Prompt, Response, Tokens, 性能指标)
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

# 日志目录
LOGS_DIR = Path("/app/logs/ocr_attempts")


def ensure_log_directory() -> Path:
    """确保日志目录存在"""
    try:
        LOGS_DIR.mkdir(parents=True, exist_ok=True)
        return LOGS_DIR
    except Exception as e:
        logger.error(f"Failed to create log directory {LOGS_DIR}: {e}")
        # 降级: 使用临时目录
        fallback_dir = Path("/tmp/ocr_logs")
        fallback_dir.mkdir(parents=True, exist_ok=True)
        return fallback_dir


def log_ocr_request(
    # 基本信息
    document_id: str,
    user_id: Optional[str] = None,
    filename: str = "unknown",

    # 处理信息
    attempt_number: int = 1,
    model: str = "unknown",

    # Prompt & Response
    prompt: Optional[str] = None,
    raw_response: Optional[str] = None,

    # 结构化输出
    extracted_data: Optional[Dict[str, Any]] = None,

    # Function/Tool Calling
    tools_called: Optional[List[str]] = None,

    # Token 使用
    tokens: Optional[Dict[str, int]] = None,

    # 性能指标
    processing_time_seconds: Optional[float] = None,

    # 质量指标
    confidence: Optional[float] = None,
    doc_type: Optional[str] = None,
    validation_errors: int = 0,

    # 额外信息
    additional_data: Optional[Dict[str, Any]] = None,
) -> Optional[Path]:
    """
    记录 OCR 请求完整信息

    策略:
    1. 清晰的 stdout 输出 (带分隔符, Docker logs 可见)
    2. 结构化 JSON 文件 (完整数据, 便于分析)
    3. 容错设计 (日志失败不影响业务)

    Returns:
        成功返回日志文件路径, 失败返回 None
    """
    timestamp = datetime.utcnow()

    # ========================================================================
    # Step 1: 清晰的 stdout 输出 (实时可见)
    # ========================================================================
    try:
        _print_stdout_log(
            timestamp=timestamp,
            document_id=document_id,
            user_id=user_id,
            filename=filename,
            attempt_number=attempt_number,
            model=model,
            tokens=tokens,
            processing_time_seconds=processing_time_seconds,
            confidence=confidence,
            doc_type=doc_type,
            validation_errors=validation_errors,
        )
    except Exception as e:
        logger.error(f"Failed to print stdout log: {e}")

    # ========================================================================
    # Step 2: JSON 文件日志 (完整数据)
    # ========================================================================
    try:
        log_dir = ensure_log_directory()

        # 文件名: ocr_<document_id>_attempt<N>_<timestamp>.json
        timestamp_str = timestamp.strftime("%Y%m%d_%H%M%S")
        log_filename = f"ocr_{document_id}_attempt{attempt_number}_{timestamp_str}.json"
        log_file = log_dir / log_filename

        # 构建完整的日志数据
        log_data = {
            # 元数据
            "timestamp": timestamp.isoformat() + "Z",
            "log_version": "1.0",

            # 基本信息
            "document_id": document_id,
            "user_id": user_id,
            "filename": filename,
            "attempt_number": attempt_number,

            # AI 模型信息
            "model": model,
            "tokens": tokens or {},
            "processing_time_seconds": processing_time_seconds,

            # Prompt & Response
            "prompt": prompt,
            "raw_response": raw_response,

            # 结构化输出
            "extracted_data": extracted_data,

            # Function/Tool Calling
            "tools_called": tools_called or [],

            # 质量指标
            "confidence": confidence,
            "doc_type": doc_type,
            "validation_errors": validation_errors,

            # 额外信息
            "additional_data": additional_data or {},
        }

        # 写入 JSON 文件 (格式化, 便于阅读)
        with open(log_file, "w", encoding="utf-8") as f:
            json.dump(log_data, f, indent=2, ensure_ascii=False)

        logger.info(f"✅ OCR log saved: {log_file}")
        print(f"✅ Log saved: {log_file}")

        return log_file

    except Exception as e:
        # 日志失败不影响业务
        logger.error(f"Failed to write OCR log file: {e}", exc_info=True)
        print(f"❌ OCR_LOG_ERROR: {e}")
        return None


def _print_stdout_log(
    timestamp: datetime,
    document_id: str,
    user_id: Optional[str],
    filename: str,
    attempt_number: int,
    model: str,
    tokens: Optional[Dict[str, int]],
    processing_time_seconds: Optional[float],
    confidence: Optional[float],
    doc_type: Optional[str],
    validation_errors: int,
):
    """打印清晰的 stdout 日志 (带分隔符)"""

    # 格式化时间
    time_str = timestamp.strftime("%Y-%m-%d %H:%M:%S UTC")

    # 格式化 tokens
    if tokens:
        prompt_tokens = tokens.get("prompt_tokens", 0)
        completion_tokens = tokens.get("completion_tokens", 0)
        total_tokens = tokens.get("total_tokens", 0)
        token_str = f"{total_tokens:,} ({prompt_tokens:,} prompt + {completion_tokens:,} completion)"
    else:
        token_str = "N/A"

    # 格式化耗时
    if processing_time_seconds is not None:
        if processing_time_seconds >= 1:
            time_str_duration = f"{processing_time_seconds:.2f}s"
        else:
            time_str_duration = f"{int(processing_time_seconds * 1000)}ms"
    else:
        time_str_duration = "N/A"

    # 格式化置信度
    conf_str = f"{confidence:.1%}" if confidence is not None else "N/A"

    # 打印分隔符日志
    print("=" * 80)
    print(f"📊 OCR Request #{attempt_number} [{time_str}]")
    print("=" * 80)
    print(f"Document:   {document_id}")
    if user_id:
        print(f"User:       {user_id}")
    print(f"File:       {filename}")
    print(f"Model:      {model}")
    print(f"Tokens:     {token_str}")
    print(f"Time:       {time_str_duration}")
    print(f"Confidence: {conf_str}")
    if doc_type:
        print(f"Doc Type:   {doc_type}")
    if validation_errors > 0:
        print(f"Errors:     {validation_errors}")
    print("-" * 80)


def log_all_attempts_summary(
    document_id: str,
    attempts: List[Dict[str, Any]],
    selected_attempt: int,
) -> Optional[Path]:
    """
    记录所有尝试的汇总对比 (JSON 格式)

    用于分析:
    - 哪次尝试效果最好?
    - 不同模型的表现对比
    - Retry 策略是否有效
    """
    try:
        log_dir = ensure_log_directory()
        timestamp_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        log_filename = f"ocr_summary_{document_id}_{timestamp_str}.json"
        log_file = log_dir / log_filename

        # 构建汇总数据
        summary_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "document_id": document_id,
            "total_attempts": len(attempts),
            "selected_attempt": selected_attempt,
            "attempts": attempts,

            # 统计信息
            "statistics": {
                "avg_confidence": sum(a.get("confidence", 0) for a in attempts) / len(attempts) if attempts else 0,
                "max_confidence": max((a.get("confidence", 0) for a in attempts), default=0),
                "min_confidence": min((a.get("confidence", 0) for a in attempts), default=0),
                "total_tokens": sum(a.get("tokens", {}).get("total_tokens", 0) for a in attempts),
                "total_time": sum(a.get("processing_time", 0) for a in attempts),
            }
        }

        # 写入文件
        with open(log_file, "w", encoding="utf-8") as f:
            json.dump(summary_data, f, indent=2, ensure_ascii=False)

        logger.info(f"✅ Summary log saved: {log_file}")
        print(f"✅ Summary saved: {log_file}")

        return log_file

    except Exception as e:
        logger.error(f"Failed to write summary log: {e}", exc_info=True)
        return None


def get_recent_logs(limit: int = 10) -> List[Path]:
    """获取最近的日志文件列表"""
    try:
        log_dir = ensure_log_directory()
        log_files = sorted(
            log_dir.glob("ocr_*.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )
        return log_files[:limit]
    except Exception as e:
        logger.error(f"Failed to get recent logs: {e}")
        return []


def read_log(log_file: Path) -> Optional[Dict[str, Any]]:
    """读取日志文件并返回 JSON 数据"""
    try:
        with open(log_file, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to read log file {log_file}: {e}")
        return None


def analyze_logs(
    document_id: Optional[str] = None,
    limit: int = 100
) -> Dict[str, Any]:
    """
    分析日志文件，生成统计报告

    可用于:
    - 统计平均 token 使用
    - 对比不同模型效果
    - 分析处理耗时
    """
    try:
        log_dir = ensure_log_directory()

        # 查找日志文件
        if document_id:
            pattern = f"ocr_{document_id}_*.json"
        else:
            pattern = "ocr_*.json"

        log_files = sorted(
            log_dir.glob(pattern),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )[:limit]

        if not log_files:
            return {"error": "No log files found"}

        # 统计数据
        total_requests = 0
        total_tokens = 0
        total_time = 0
        model_stats = {}
        confidence_scores = []

        for log_file in log_files:
            try:
                data = read_log(log_file)
                if not data:
                    continue

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
                    model_stats[model] = {"count": 0, "total_tokens": 0}
                model_stats[model]["count"] += 1
                model_stats[model]["total_tokens"] += tokens.get("total_tokens", 0)

                # 置信度统计
                conf = data.get("confidence")
                if conf is not None:
                    confidence_scores.append(conf)

            except Exception as e:
                logger.error(f"Error analyzing log {log_file}: {e}")

        # 生成报告
        report = {
            "total_requests": total_requests,
            "total_tokens": total_tokens,
            "avg_tokens_per_request": total_tokens / total_requests if total_requests > 0 else 0,
            "total_processing_time": total_time,
            "avg_processing_time": total_time / total_requests if total_requests > 0 else 0,
            "model_statistics": model_stats,
            "confidence_statistics": {
                "avg": sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0,
                "max": max(confidence_scores) if confidence_scores else 0,
                "min": min(confidence_scores) if confidence_scores else 0,
            } if confidence_scores else None,
        }

        return report

    except Exception as e:
        logger.error(f"Failed to analyze logs: {e}", exc_info=True)
        return {"error": str(e)}


def cleanup_old_logs(days_to_keep: int = 30) -> int:
    """清理旧日志文件"""
    try:
        log_dir = ensure_log_directory()
        cutoff_time = datetime.utcnow().timestamp() - (days_to_keep * 86400)

        deleted_count = 0
        for log_file in log_dir.glob("ocr_*.json"):
            if log_file.stat().st_mtime < cutoff_time:
                log_file.unlink()
                deleted_count += 1

        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} old OCR logs (>{days_to_keep} days)")

        return deleted_count

    except Exception as e:
        logger.error(f"Failed to cleanup logs: {e}")
        return 0
