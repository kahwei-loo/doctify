"""
Celery Application Configuration

Configures Celery for asynchronous task processing with optimized queues,
monitoring, and error handling.
"""

import asyncio
import logging
from typing import Optional
from celery import Celery, Task
from celery.signals import (
    task_prerun,
    task_postrun,
    task_failure,
    task_retry,
    worker_init,
)
from kombu import Queue, Exchange

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


# =============================================================================
# Celery Application Configuration
# =============================================================================

celery_app = Celery(
    "doctify",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

# Configure Celery
celery_app.conf.update(
    # Task execution settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # Task result settings
    result_expires=3600,  # Results expire after 1 hour
    result_backend_transport_options={
        "master_name": "mymaster",
        "visibility_timeout": 3600,
    },
    # Task routing and queues
    task_default_queue="default",
    task_default_exchange="doctify",
    task_default_exchange_type="topic",
    task_default_routing_key="task.default",
    # Worker settings
    worker_prefetch_multiplier=1,  # Disable prefetching for fair distribution
    worker_max_tasks_per_child=1000,  # Restart worker after 1000 tasks
    worker_disable_rate_limits=False,
    # Task time limits
    task_soft_time_limit=3600,  # 1 hour soft limit
    task_time_limit=3900,  # 1 hour 5 minutes hard limit
    # Retry settings
    task_acks_late=True,  # Acknowledge task after execution
    task_reject_on_worker_lost=True,
    # Monitoring and logging
    task_send_sent_event=True,
    worker_send_task_events=True,
    task_track_started=True,
    # Error handling
    task_annotations={
        "*": {
            "rate_limit": "100/m",  # Default rate limit
            "time_limit": 3900,
            "soft_time_limit": 3600,
        }
    },
)


# =============================================================================
# Queue Configuration
# =============================================================================

# Define exchanges
default_exchange = Exchange("doctify", type="topic", durable=True)
ocr_exchange = Exchange("doctify.ocr", type="topic", durable=True)
export_exchange = Exchange("doctify.export", type="topic", durable=True)
cleanup_exchange = Exchange("doctify.cleanup", type="topic", durable=True)

# Define queues with priorities
celery_app.conf.task_queues = (
    # Default queue for miscellaneous tasks
    Queue(
        "default",
        exchange=default_exchange,
        routing_key="task.default",
        queue_arguments={"x-max-priority": 10},
    ),
    # High-priority OCR processing queue
    Queue(
        "ocr_queue",
        exchange=ocr_exchange,
        routing_key="task.ocr.#",
        queue_arguments={"x-max-priority": 10},
    ),
    # Export generation queue
    Queue(
        "export_queue",
        exchange=export_exchange,
        routing_key="task.export.#",
        queue_arguments={"x-max-priority": 5},
    ),
    # Low-priority cleanup queue
    Queue(
        "cleanup_queue",
        exchange=cleanup_exchange,
        routing_key="task.cleanup.#",
        queue_arguments={"x-max-priority": 1},
    ),
)

# Task routing rules
celery_app.conf.task_routes = {
    # OCR tasks route to ocr_queue
    "app.tasks.document.ocr.*": {
        "queue": "ocr_queue",
        "exchange": "doctify.ocr",
        "routing_key": "task.ocr.process",
    },
    # Export tasks route to export_queue
    "app.tasks.document.export.*": {
        "queue": "export_queue",
        "exchange": "doctify.export",
        "routing_key": "task.export.generate",
    },
    # Cleanup tasks route to cleanup_queue
    "app.tasks.cleanup.*": {
        "queue": "cleanup_queue",
        "exchange": "doctify.cleanup",
        "routing_key": "task.cleanup.files",
    },
}


# =============================================================================
# Custom Task Base Class
# =============================================================================


class BaseTask(Task):
    """
    Base task class with enhanced error handling and logging.
    """

    autoretry_for = (Exception,)
    retry_kwargs = {"max_retries": 3, "countdown": 60}
    retry_backoff = True
    retry_backoff_max = 600  # 10 minutes
    retry_jitter = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """
        Error handler for failed tasks.

        Args:
            exc: Exception raised by task
            task_id: Unique task ID
            args: Task positional arguments
            kwargs: Task keyword arguments
            einfo: Exception info
        """
        logger.error(
            f"Task {self.name}[{task_id}] failed",
            extra={
                "task_id": task_id,
                "task_name": self.name,
                "task_args": args,
                "task_kwargs": kwargs,
                "exception": str(exc),
                "traceback": str(einfo),
            },
            exc_info=True,
        )

    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """
        Retry handler for tasks.

        Args:
            exc: Exception that caused retry
            task_id: Unique task ID
            args: Task positional arguments
            kwargs: Task keyword arguments
            einfo: Exception info
        """
        logger.warning(
            f"Task {self.name}[{task_id}] retry",
            extra={
                "task_id": task_id,
                "task_name": self.name,
                "retry_count": self.request.retries,
                "max_retries": self.max_retries,
                "exception": str(exc),
            },
        )

    def on_success(self, retval, task_id, args, kwargs):
        """
        Success handler for tasks.

        Args:
            retval: Task return value
            task_id: Unique task ID
            args: Task positional arguments
            kwargs: Task keyword arguments
        """
        logger.info(
            f"Task {self.name}[{task_id}] succeeded",
            extra={
                "task_id": task_id,
                "task_name": self.name,
                "task_args": args,
                "task_kwargs": kwargs,
            },
        )


# Set default task base class
celery_app.Task = BaseTask


# =============================================================================
# Celery Signals
# =============================================================================

# Database initialization tracking
_db_initialized = False


def ensure_db_initialized():
    """
    Ensure database is initialized before task execution.
    This is called before each task to lazily initialize the database connection.
    """
    global _db_initialized

    if _db_initialized:
        return

    from app.db.database import init_db, _async_session_factory

    # Check if already initialized
    if _async_session_factory is not None:
        _db_initialized = True
        return

    logger.info("Initializing database connection for Celery worker...")

    try:
        # Create or get event loop and run init_db
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        loop.run_until_complete(init_db())
        _db_initialized = True
        logger.info("Database connection initialized successfully for Celery worker")
    except Exception as e:
        logger.error(f"Failed to initialize database for Celery worker: {e}")
        raise


@worker_init.connect
def worker_init_handler(**kwargs):
    """
    Handler called when the Celery worker process starts.
    Attempts to initialize database connection pool for async tasks.
    """
    try:
        ensure_db_initialized()
    except Exception as e:
        logger.warning(
            f"Database initialization in worker_init failed, will retry on first task: {e}"
        )


@task_prerun.connect
def task_prerun_handler(
    sender=None, task_id=None, task=None, args=None, kwargs=None, **extra
):
    """
    Handler called before task execution.
    Ensures database is initialized before any task runs.
    """
    # Ensure database is initialized before task execution
    ensure_db_initialized()

    logger.info(
        f"Starting task {task.name}[{task_id}]",
        extra={
            "task_id": task_id,
            "task_name": task.name,
            "task_args": args,
            "task_kwargs": kwargs,
        },
    )


@task_postrun.connect
def task_postrun_handler(
    sender=None,
    task_id=None,
    task=None,
    args=None,
    kwargs=None,
    retval=None,
    state=None,
    **extra,
):
    """
    Handler called after task execution.
    """
    logger.info(
        f"Completed task {task.name}[{task_id}] with state {state}",
        extra={
            "task_id": task_id,
            "task_name": task.name,
            "state": state,
            "task_args": args,
            "task_kwargs": kwargs,
        },
    )


@task_failure.connect
def task_failure_handler(
    sender=None,
    task_id=None,
    exception=None,
    args=None,
    kwargs=None,
    traceback=None,
    einfo=None,
    **extra,
):
    """
    Handler called when task fails.
    """
    logger.error(
        f"Task {sender.name}[{task_id}] failed with exception: {exception}",
        extra={
            "task_id": task_id,
            "task_name": sender.name,
            "exception": str(exception),
            "traceback": str(traceback),
            "task_args": args,
            "task_kwargs": kwargs,
        },
        exc_info=True,
    )


@task_retry.connect
def task_retry_handler(sender=None, task_id=None, reason=None, einfo=None, **extra):
    """
    Handler called when task is retried.
    """
    logger.warning(
        f"Task {sender.name}[{task_id}] retrying: {reason}",
        extra={
            "task_id": task_id,
            "task_name": sender.name,
            "reason": str(reason),
            "einfo": str(einfo),
        },
    )


# =============================================================================
# Task Registration
# =============================================================================

# Import tasks to register them with Celery
# This ensures tasks are discovered when Celery starts
celery_app.autodiscover_tasks(["app.tasks.document", "app.tasks.rag"])

# Explicitly import standalone task modules (not subpackages)
import app.tasks.knowledge_base  # noqa: F401 - KB embedding & crawl tasks

# =============================================================================
# Utility Functions
# =============================================================================


def get_task_info(task_id: str) -> Optional[dict]:
    """
    Get information about a task by ID.

    Args:
        task_id: Celery task ID

    Returns:
        Task information dictionary or None if not found
    """
    try:
        result = celery_app.AsyncResult(task_id)
        return {
            "task_id": task_id,
            "state": result.state,
            "result": result.result,
            "traceback": result.traceback,
            "info": result.info,
        }
    except Exception as e:
        logger.error(f"Error getting task info for {task_id}: {e}")
        return None


def revoke_task(task_id: str, terminate: bool = False) -> bool:
    """
    Revoke/cancel a task.

    Args:
        task_id: Celery task ID
        terminate: If True, terminate running task

    Returns:
        True if task was revoked successfully
    """
    try:
        celery_app.control.revoke(task_id, terminate=terminate)
        logger.info(f"Revoked task {task_id} (terminate={terminate})")
        return True
    except Exception as e:
        logger.error(f"Error revoking task {task_id}: {e}")
        return False


def get_active_tasks() -> list:
    """
    Get list of currently active tasks.

    Returns:
        List of active task information
    """
    try:
        inspect = celery_app.control.inspect()
        active = inspect.active()
        return active or []
    except Exception as e:
        logger.error(f"Error getting active tasks: {e}")
        return []


def get_queue_length(queue_name: str) -> int:
    """
    Get number of tasks waiting in queue.

    Args:
        queue_name: Name of queue to check

    Returns:
        Number of tasks in queue
    """
    try:
        with celery_app.connection_or_acquire() as conn:
            return conn.default_channel.queue_declare(
                queue=queue_name, passive=True
            ).message_count
    except Exception as e:
        logger.error(f"Error getting queue length for {queue_name}: {e}")
        return 0
