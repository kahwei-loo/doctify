"""
Mock Objects for Testing

Provides mock implementations of external services for isolated testing.
"""

from typing import Any, Dict, List, Optional
from unittest.mock import MagicMock, AsyncMock
from datetime import datetime, timezone


# =============================================================================
# OCR Service Mock
# =============================================================================

class MockOCRService:
    """
    Mock OCR service for testing document processing without actual AI calls.
    """

    def __init__(
        self,
        default_text: str = "Sample extracted text",
        default_confidence: float = 0.95,
        should_fail: bool = False,
        failure_message: str = "OCR processing failed",
    ):
        self.default_text = default_text
        self.default_confidence = default_confidence
        self.should_fail = should_fail
        self.failure_message = failure_message
        self.call_count = 0
        self.last_call_args: Optional[Dict[str, Any]] = None

    async def extract_text(
        self,
        file_content: bytes,
        mime_type: str = "application/pdf",
        config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Mock text extraction."""
        self.call_count += 1
        self.last_call_args = {
            "file_content_size": len(file_content),
            "mime_type": mime_type,
            "config": config,
        }

        if self.should_fail:
            raise Exception(self.failure_message)

        return {
            "text": self.default_text,
            "confidence": self.default_confidence,
            "metadata": {
                "provider": "mock",
                "model": "mock-model",
                "processing_time_ms": 100,
            },
            "pages": [
                {
                    "page_number": 1,
                    "text": self.default_text,
                    "confidence": self.default_confidence,
                }
            ],
        }

    def reset(self) -> None:
        """Reset mock state."""
        self.call_count = 0
        self.last_call_args = None
        self.should_fail = False


# =============================================================================
# S3 Client Mock
# =============================================================================

class MockS3Client:
    """
    Mock S3 client for testing file storage without actual AWS calls.
    """

    def __init__(self):
        self.storage: Dict[str, bytes] = {}
        self.upload_count = 0
        self.download_count = 0
        self.delete_count = 0

    def upload_fileobj(
        self,
        fileobj: Any,
        bucket: str,
        key: str,
        **kwargs,
    ) -> None:
        """Mock file upload."""
        self.upload_count += 1
        content = fileobj.read()
        fileobj.seek(0)
        self.storage[f"{bucket}/{key}"] = content

    def download_fileobj(
        self,
        bucket: str,
        key: str,
        fileobj: Any,
        **kwargs,
    ) -> None:
        """Mock file download."""
        self.download_count += 1
        storage_key = f"{bucket}/{key}"
        if storage_key in self.storage:
            fileobj.write(self.storage[storage_key])
            fileobj.seek(0)
        else:
            raise Exception(f"Object not found: {storage_key}")

    def delete_object(
        self,
        Bucket: str,
        Key: str,
        **kwargs,
    ) -> Dict[str, Any]:
        """Mock file deletion."""
        self.delete_count += 1
        storage_key = f"{Bucket}/{Key}"
        if storage_key in self.storage:
            del self.storage[storage_key]
        return {"DeleteMarker": True}

    def head_object(
        self,
        Bucket: str,
        Key: str,
        **kwargs,
    ) -> Dict[str, Any]:
        """Mock head object (check if exists)."""
        storage_key = f"{Bucket}/{Key}"
        if storage_key in self.storage:
            return {
                "ContentLength": len(self.storage[storage_key]),
                "ContentType": "application/octet-stream",
                "LastModified": datetime.now(timezone.utc),
            }
        raise Exception(f"Object not found: {storage_key}")

    def reset(self) -> None:
        """Reset mock state."""
        self.storage.clear()
        self.upload_count = 0
        self.download_count = 0
        self.delete_count = 0


# =============================================================================
# Redis Client Mock
# =============================================================================

class MockRedisClient:
    """
    Mock Redis client for testing caching without actual Redis.
    """

    def __init__(self):
        self.data: Dict[str, Any] = {}
        self.expiry: Dict[str, Optional[int]] = {}

    def get(self, key: str) -> Optional[str]:
        """Get value by key."""
        return self.data.get(key)

    def set(
        self,
        key: str,
        value: Any,
        ex: Optional[int] = None,
        px: Optional[int] = None,
        nx: bool = False,
        xx: bool = False,
    ) -> bool:
        """Set value with optional expiry."""
        if nx and key in self.data:
            return False
        if xx and key not in self.data:
            return False

        self.data[key] = value
        self.expiry[key] = ex or (px // 1000 if px else None)
        return True

    def setex(self, key: str, seconds: int, value: Any) -> bool:
        """Set value with expiry in seconds."""
        return self.set(key, value, ex=seconds)

    def delete(self, *keys: str) -> int:
        """Delete one or more keys."""
        deleted = 0
        for key in keys:
            if key in self.data:
                del self.data[key]
                self.expiry.pop(key, None)
                deleted += 1
        return deleted

    def exists(self, *keys: str) -> int:
        """Check if keys exist."""
        return sum(1 for key in keys if key in self.data)

    def incr(self, key: str) -> int:
        """Increment value."""
        if key not in self.data:
            self.data[key] = 0
        self.data[key] = int(self.data[key]) + 1
        return self.data[key]

    def decr(self, key: str) -> int:
        """Decrement value."""
        if key not in self.data:
            self.data[key] = 0
        self.data[key] = int(self.data[key]) - 1
        return self.data[key]

    def hset(self, name: str, key: str = None, value: Any = None, mapping: Dict = None) -> int:
        """Set hash field(s)."""
        if name not in self.data:
            self.data[name] = {}

        if mapping:
            self.data[name].update(mapping)
            return len(mapping)
        elif key is not None:
            self.data[name][key] = value
            return 1
        return 0

    def hget(self, name: str, key: str) -> Optional[str]:
        """Get hash field."""
        if name in self.data and isinstance(self.data[name], dict):
            return self.data[name].get(key)
        return None

    def hgetall(self, name: str) -> Dict[str, str]:
        """Get all hash fields."""
        if name in self.data and isinstance(self.data[name], dict):
            return self.data[name].copy()
        return {}

    def lpush(self, key: str, *values: Any) -> int:
        """Push values to list head."""
        if key not in self.data:
            self.data[key] = []
        for value in values:
            self.data[key].insert(0, value)
        return len(self.data[key])

    def rpush(self, key: str, *values: Any) -> int:
        """Push values to list tail."""
        if key not in self.data:
            self.data[key] = []
        self.data[key].extend(values)
        return len(self.data[key])

    def lrange(self, key: str, start: int, end: int) -> List[Any]:
        """Get list range."""
        if key not in self.data:
            return []
        # Handle negative indices
        if end == -1:
            return self.data[key][start:]
        return self.data[key][start : end + 1]

    def flushdb(self) -> None:
        """Clear all data."""
        self.data.clear()
        self.expiry.clear()

    def close(self) -> None:
        """Close connection (no-op for mock)."""
        pass

    def reset(self) -> None:
        """Reset mock state."""
        self.flushdb()


# =============================================================================
# Celery Task Mock
# =============================================================================

class MockCeleryTask:
    """
    Mock Celery task for testing async tasks without actual Celery.
    """

    def __init__(self, name: str = "mock_task"):
        self.name = name
        self.calls: List[Dict[str, Any]] = []
        self.results: Dict[str, Any] = {}
        self.should_fail = False
        self.failure_exception = Exception("Task failed")

    def delay(self, *args, **kwargs) -> "MockAsyncResult":
        """Submit task for async execution."""
        task_id = f"mock-task-{len(self.calls)}"
        self.calls.append({
            "task_id": task_id,
            "args": args,
            "kwargs": kwargs,
            "timestamp": datetime.now(timezone.utc),
        })

        if self.should_fail:
            result = MockAsyncResult(task_id, state="FAILURE", result=self.failure_exception)
        else:
            result = MockAsyncResult(task_id, state="SUCCESS", result=self.results.get("default"))

        return result

    def apply_async(self, args=None, kwargs=None, **options) -> "MockAsyncResult":
        """Submit task with options."""
        return self.delay(*(args or []), **(kwargs or {}))

    def apply(self, args=None, kwargs=None, **options) -> Any:
        """Execute task synchronously."""
        self.calls.append({
            "task_id": "sync",
            "args": args or [],
            "kwargs": kwargs or {},
            "timestamp": datetime.now(timezone.utc),
        })

        if self.should_fail:
            raise self.failure_exception

        return self.results.get("default")

    def reset(self) -> None:
        """Reset mock state."""
        self.calls.clear()
        self.results.clear()
        self.should_fail = False


class MockAsyncResult:
    """Mock Celery AsyncResult."""

    def __init__(
        self,
        task_id: str,
        state: str = "PENDING",
        result: Any = None,
    ):
        self.id = task_id
        self.task_id = task_id
        self.state = state
        self.status = state
        self.result = result
        self._ready = state in ("SUCCESS", "FAILURE")

    def ready(self) -> bool:
        """Check if task is complete."""
        return self._ready

    def successful(self) -> bool:
        """Check if task completed successfully."""
        return self.state == "SUCCESS"

    def failed(self) -> bool:
        """Check if task failed."""
        return self.state == "FAILURE"

    def get(self, timeout: float = None, propagate: bool = True) -> Any:
        """Get task result."""
        if self.state == "FAILURE" and propagate:
            raise self.result if isinstance(self.result, Exception) else Exception(str(self.result))
        return self.result


# =============================================================================
# WebSocket Mock
# =============================================================================

class MockWebSocket:
    """
    Mock WebSocket connection for testing real-time features.
    """

    def __init__(self):
        self.messages_sent: List[Any] = []
        self.messages_received: List[Any] = []
        self.is_connected = True
        self.client_id: Optional[str] = None

    async def accept(self) -> None:
        """Accept WebSocket connection."""
        self.is_connected = True

    async def close(self, code: int = 1000) -> None:
        """Close WebSocket connection."""
        self.is_connected = False

    async def send_json(self, data: Dict[str, Any]) -> None:
        """Send JSON message."""
        self.messages_sent.append(data)

    async def send_text(self, data: str) -> None:
        """Send text message."""
        self.messages_sent.append(data)

    async def receive_json(self) -> Dict[str, Any]:
        """Receive JSON message."""
        if self.messages_received:
            return self.messages_received.pop(0)
        return {}

    async def receive_text(self) -> str:
        """Receive text message."""
        if self.messages_received:
            return str(self.messages_received.pop(0))
        return ""

    def add_message(self, message: Any) -> None:
        """Add message to receive queue (for testing)."""
        self.messages_received.append(message)

    def reset(self) -> None:
        """Reset mock state."""
        self.messages_sent.clear()
        self.messages_received.clear()
        self.is_connected = True


# =============================================================================
# HTTP Client Mock
# =============================================================================

class MockHTTPResponse:
    """Mock HTTP response."""

    def __init__(
        self,
        status_code: int = 200,
        json_data: Optional[Dict[str, Any]] = None,
        text_data: str = "",
        headers: Optional[Dict[str, str]] = None,
    ):
        self.status_code = status_code
        self._json_data = json_data
        self._text_data = text_data
        self.headers = headers or {}

    def json(self) -> Dict[str, Any]:
        """Get JSON response."""
        return self._json_data or {}

    @property
    def text(self) -> str:
        """Get text response."""
        return self._text_data

    def raise_for_status(self) -> None:
        """Raise exception for error status codes."""
        if self.status_code >= 400:
            raise Exception(f"HTTP Error: {self.status_code}")


class MockHTTPClient:
    """
    Mock HTTP client for testing external API calls.
    """

    def __init__(self):
        self.responses: Dict[str, MockHTTPResponse] = {}
        self.requests: List[Dict[str, Any]] = []
        self.default_response = MockHTTPResponse()

    def set_response(
        self,
        url: str,
        response: MockHTTPResponse,
        method: str = "GET",
    ) -> None:
        """Set response for a specific URL."""
        key = f"{method}:{url}"
        self.responses[key] = response

    async def get(self, url: str, **kwargs) -> MockHTTPResponse:
        """Mock GET request."""
        return await self._request("GET", url, **kwargs)

    async def post(self, url: str, **kwargs) -> MockHTTPResponse:
        """Mock POST request."""
        return await self._request("POST", url, **kwargs)

    async def put(self, url: str, **kwargs) -> MockHTTPResponse:
        """Mock PUT request."""
        return await self._request("PUT", url, **kwargs)

    async def delete(self, url: str, **kwargs) -> MockHTTPResponse:
        """Mock DELETE request."""
        return await self._request("DELETE", url, **kwargs)

    async def _request(self, method: str, url: str, **kwargs) -> MockHTTPResponse:
        """Execute mock request."""
        self.requests.append({
            "method": method,
            "url": url,
            "kwargs": kwargs,
            "timestamp": datetime.now(timezone.utc),
        })

        key = f"{method}:{url}"
        return self.responses.get(key, self.default_response)

    def reset(self) -> None:
        """Reset mock state."""
        self.responses.clear()
        self.requests.clear()
