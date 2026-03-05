"""
OCR Orchestrator Service

Orchestrates OCR processing with AI provider abstraction and retry logic.
Integrates L2.5 enhanced processing for improved accuracy and validation.
"""

import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
import base64
import logging

from app.core.config import get_settings
from app.core.exceptions import ExternalServiceError, ValidationError
from app.domain.value_objects.token_usage import TokenUsage
from app.domain.value_objects.confidence_score import FieldConfidence

# Simple OCR Logger for MVP
from app.utils.simple_ocr_logger import log_ocr_request, log_all_attempts_summary

# L2.5 Enhanced Processing (migrated from old Doctify project)
from .l25_orchestrator import (
    L25Orchestrator,
    L25Config,
    L25Result,
    process_with_l25_enhancements,
)

settings = get_settings()
logger = logging.getLogger(__name__)


class OCROrchestrator:
    """
    Orchestrates OCR processing workflow.

    Provides AI provider abstraction, retry logic, and result validation.
    """

    def __init__(
        self,
        provider: Optional[str] = None,
        max_retries: int = 3,
        timeout: int = 60,
    ):
        """
        Initialize OCR orchestrator.

        Args:
            provider: AI provider name (openai, anthropic, etc.)
            max_retries: Maximum retry attempts
            timeout: Request timeout in seconds
        """
        # Handle case where AI_MODEL is not configured
        ai_model = settings.AI_MODEL or "openai/gpt-4"  # Default fallback
        self.provider = provider or ai_model.split("/")[0]
        self.model = ai_model
        self.max_retries = max_retries
        self.timeout = timeout
        self.api_key = settings.OPENAI_API_KEY
        self.base_url = settings.OPENAI_BASE_URL

    async def process_document(
        self,
        file_path: str,
        extraction_config: Dict[str, Any],
        mime_type: str,
    ) -> Dict[str, Any]:
        """
        Process document with OCR and data extraction.

        Args:
            file_path: Path to document file
            extraction_config: Extraction configuration (fields, rules)
            mime_type: Document MIME type

        Returns:
            Extraction result dictionary with data, confidence, and token usage

        Raises:
            ExternalServiceError: If OCR processing fails
        """
        # Read and encode file
        file_content = await self._read_file(file_path)
        encoded_content = await self._encode_file(file_content, mime_type)

        # Build extraction prompt
        extraction_prompt = await self._build_extraction_prompt(extraction_config)

        # Process with retry logic
        result = await self._process_with_retry(
            encoded_content=encoded_content,
            prompt=extraction_prompt,
            mime_type=mime_type,
        )

        return result

    async def _process_with_retry(
        self,
        encoded_content: str,
        prompt: str,
        mime_type: str,
    ) -> Dict[str, Any]:
        """
        Process document with retry logic.

        Args:
            encoded_content: Base64 encoded file content
            prompt: Extraction prompt
            mime_type: Document MIME type

        Returns:
            Extraction result

        Raises:
            ExternalServiceError: If all retries fail
        """
        last_error = None

        for attempt in range(self.max_retries):
            try:
                result = await self._call_ai_provider(
                    encoded_content=encoded_content,
                    prompt=prompt,
                    mime_type=mime_type,
                )

                # Validate result
                await self._validate_result(result)

                return result

            except Exception as e:
                last_error = e

                # Log retry attempt
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(2**attempt)  # Exponential backoff
                    continue

        # All retries failed
        raise ExternalServiceError(
            f"OCR processing failed after {self.max_retries} attempts: {str(last_error)}",
            details={"provider": self.provider, "model": self.model},
        )

    async def _call_ai_provider(
        self,
        encoded_content: str,
        prompt: str,
        mime_type: str,
    ) -> Dict[str, Any]:
        """
        Call AI provider for OCR processing.

        Args:
            encoded_content: Base64 encoded content
            prompt: Extraction prompt
            mime_type: Document MIME type

        Returns:
            Raw AI response

        Raises:
            ExternalServiceError: If API call fails
        """
        try:
            # This is a placeholder for actual AI provider integration
            # In production, this would call OpenAI, Anthropic, etc.

            # Example structure for OpenAI Vision API:
            # import openai
            # client = openai.AsyncOpenAI(api_key=self.api_key, base_url=self.base_url)
            # response = await client.chat.completions.create(
            #     model=self.model,
            #     messages=[
            #         {
            #             "role": "user",
            #             "content": [
            #                 {"type": "text", "text": prompt},
            #                 {
            #                     "type": "image_url",
            #                     "image_url": {
            #                         "url": f"data:{mime_type};base64,{encoded_content}"
            #                     }
            #                 }
            #             ]
            #         }
            #     ],
            #     timeout=self.timeout,
            # )

            # For now, return mock structure
            return {
                "extracted_data": {},
                "confidence_scores": {},
                "token_usage": {
                    "prompt_tokens": 1000,
                    "completion_tokens": 500,
                    "total_tokens": 1500,
                },
                "model": self.model,
                "provider": self.provider,
            }

        except Exception as e:
            raise ExternalServiceError(
                f"AI provider API call failed: {str(e)}",
                details={"provider": self.provider, "model": self.model},
            )

    async def _read_file(self, file_path: str) -> bytes:
        """Read file content."""
        try:
            with open(file_path, "rb") as f:
                return f.read()
        except Exception as e:
            raise ExternalServiceError(f"Failed to read file: {str(e)}")

    async def _encode_file(self, content: bytes, mime_type: str) -> str:
        """Encode file content to base64."""
        return base64.b64encode(content).decode("utf-8")

    async def _build_extraction_prompt(
        self,
        extraction_config: Dict[str, Any],
    ) -> str:
        """
        Build extraction prompt from configuration.

        Args:
            extraction_config: Extraction configuration

        Returns:
            Formatted extraction prompt
        """
        fields = extraction_config.get("extraction_fields", [])
        language = extraction_config.get("language", "en")

        # Build field descriptions
        field_descriptions = []
        for field in fields:
            name = field.get("name", "")
            field_type = field.get("type", "string")
            description = field.get("description", "")
            required = field.get("required", False)

            field_desc = f"- **{name}** ({field_type})"
            if required:
                field_desc += " [REQUIRED]"
            if description:
                field_desc += f": {description}"

            field_descriptions.append(field_desc)

        # Build complete prompt
        prompt = f"""
Extract the following information from this document:

{chr(10).join(field_descriptions)}

Return the extracted data as a JSON object with the following structure:
{{
    "extracted_data": {{
        "field_name": "extracted_value",
        ...
    }},
    "confidence_scores": {{
        "field_name": 0.95,
        ...
    }}
}}

Guidelines:
- Extract data accurately and preserve original formatting
- Use confidence scores from 0.0 to 1.0
- Mark required fields that cannot be extracted with null
- Language: {language}
"""

        return prompt.strip()

    async def _validate_result(self, result: Dict[str, Any]) -> None:
        """
        Validate extraction result.

        Args:
            result: Extraction result

        Raises:
            ValidationError: If result is invalid
        """
        if not isinstance(result, dict):
            raise ValidationError("Result must be a dictionary")

        if "extracted_data" not in result:
            raise ValidationError("Result missing 'extracted_data'")

        if not isinstance(result["extracted_data"], dict):
            raise ValidationError("'extracted_data' must be a dictionary")

    async def batch_process_documents(
        self,
        file_paths: List[str],
        extraction_config: Dict[str, Any],
        mime_types: List[str],
        max_concurrent: int = 3,
    ) -> List[Dict[str, Any]]:
        """
        Process multiple documents concurrently.

        Args:
            file_paths: List of file paths
            extraction_config: Extraction configuration
            mime_types: List of MIME types
            max_concurrent: Maximum concurrent processes

        Returns:
            List of extraction results

        Raises:
            ValidationError: If input lists have different lengths
        """
        if len(file_paths) != len(mime_types):
            raise ValidationError("file_paths and mime_types must have same length")

        # Create semaphore for concurrency control
        semaphore = asyncio.Semaphore(max_concurrent)

        async def process_with_semaphore(file_path: str, mime_type: str):
            async with semaphore:
                return await self.process_document(
                    file_path=file_path,
                    extraction_config=extraction_config,
                    mime_type=mime_type,
                )

        # Process all documents concurrently
        tasks = [
            process_with_semaphore(file_path, mime_type)
            for file_path, mime_type in zip(file_paths, mime_types)
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Convert exceptions to error dictionaries
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append(
                    {
                        "error": str(result),
                        "file_path": file_paths[i],
                    }
                )
            else:
                processed_results.append(result)

        return processed_results

    def calculate_cost(self, token_usage: Dict[str, int]) -> float:
        """
        Calculate processing cost based on token usage.

        Args:
            token_usage: Token usage dictionary

        Returns:
            Estimated cost in USD
        """
        # Model pricing (example rates, adjust based on actual pricing)
        pricing = {
            "gpt-4": {"prompt": 0.03, "completion": 0.06},  # per 1K tokens
            "gpt-4-vision-preview": {"prompt": 0.01, "completion": 0.03},
            "gpt-4o": {"prompt": 0.005, "completion": 0.015},
            "gpt-3.5-turbo": {"prompt": 0.0015, "completion": 0.002},
            "claude-3-opus": {"prompt": 0.015, "completion": 0.075},
            "claude-3-sonnet": {"prompt": 0.003, "completion": 0.015},
            "claude-3-haiku": {"prompt": 0.00025, "completion": 0.00125},
        }

        model = self.model.split("/")[-1]
        rates = pricing.get(model, {"prompt": 0.01, "completion": 0.02})

        prompt_cost = (token_usage.get("prompt_tokens", 0) / 1000) * rates["prompt"]
        completion_cost = (token_usage.get("completion_tokens", 0) / 1000) * rates[
            "completion"
        ]

        return round(prompt_cost + completion_cost, 4)

    async def process_document_with_l25(
        self,
        file_path: str,
        extraction_config: Dict[str, Any],
        mime_type: str,
        enable_retry: bool = True,
        enable_validation: bool = True,
        region: str = "MY",
        document_id: Optional[str] = None,
        user_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Process document with L2.5 enhanced OCR processing.

        L2.5 features include:
        - Document type-specific prompts
        - Low confidence retry mechanism
        - Malaysia localization validation
        - Intelligent result selection from multiple attempts

        Args:
            file_path: Path to document file
            extraction_config: Extraction configuration (fields, rules)
            mime_type: Document MIME type
            enable_retry: Enable low-confidence retry
            enable_validation: Enable validation with localization
            region: Localization region (default: MY for Malaysia)
            document_id: Optional document ID for logging
            user_id: Optional user ID for logging

        Returns:
            Extraction result dictionary with enhanced data, confidence, and metadata

        Raises:
            ExternalServiceError: If OCR processing fails
        """
        try:
            # Convert extraction_config to project_config format expected by L2.5
            project_config = self._convert_to_project_config(extraction_config)

            # Process with L2.5 enhancements
            l25_result = await process_with_l25_enhancements(
                file_path=file_path,
                project_config=project_config,
                enable_retry=enable_retry,
                enable_validation=enable_validation,
                region=region,
                document_id=document_id,
                user_id=user_id,
            )

            # Convert L25Result to standard response format
            return self._convert_l25_result(l25_result)

        except Exception as e:
            logger.error(f"L2.5 OCR processing failed: {str(e)}")
            raise ExternalServiceError(
                f"L2.5 OCR processing failed: {str(e)}",
                details={
                    "provider": self.provider,
                    "model": self.model,
                    "l25_enabled": True,
                },
            )

    def _convert_to_project_config(
        self, extraction_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Convert extraction_config to project_config format for L2.5."""
        project_config = {}

        # Map extraction_fields to expected format
        if "extraction_fields" in extraction_config:
            fields = []
            for field in extraction_config["extraction_fields"]:
                fields.append(
                    {
                        "fieldName": field.get("name", ""),
                        "outputType": field.get("type", "string"),
                        "defaultValue": field.get("default", ""),
                        "description": field.get("description", ""),
                    }
                )
            project_config["fields"] = fields

        # Pass through other config options
        if "language" in extraction_config:
            project_config["language"] = extraction_config["language"]

        if "expected_json_output" in extraction_config:
            project_config["expected_json_output"] = extraction_config[
                "expected_json_output"
            ]

        if "message_content" in extraction_config:
            project_config["message_content"] = extraction_config["message_content"]

        # Pass through table config if present
        if "table" in extraction_config:
            project_config["table"] = extraction_config["table"]

        return project_config

    def _convert_l25_result(self, l25_result: L25Result) -> Dict[str, Any]:
        """Convert L25Result to standard extraction result format."""
        result_dict = l25_result.to_dict()

        # Extract model and provider from result
        actual_model = result_dict.get("model", self.model)
        # Provider is the prefix before "/" in model name (e.g., "openai" from "openai/gpt-4")
        actual_provider = (
            actual_model.split("/")[0] if "/" in actual_model else self.provider
        )

        # Map to standard format expected by the application
        return {
            "extracted_data": result_dict.get("standardized_output", {}),
            "confidence_scores": result_dict.get("standardized_output", {}).get(
                "field_confidences", {}
            ),
            "overall_confidence": result_dict.get("confidence"),
            "document_type": result_dict.get("doc_type"),
            "document_type_confidence": result_dict.get("doc_type_confidence"),
            "token_usage": result_dict.get("token_usage", {}),
            "total_token_usage": result_dict.get("total_token_usage", {}),
            "model": actual_model,
            "provider": actual_provider,  # Extract provider from model name
            "l25_metadata": {
                "enabled": result_dict.get("l25_metadata", {}).get(
                    "l25_enabled", False
                ),
                "prompt_enhanced": result_dict.get("l25_metadata", {}).get(
                    "prompt_enhanced", False
                ),
                "retry_count": result_dict.get("retry_count", 0),
                "retry_reasons": result_dict.get("retry_reasons", []),
                "was_corrected": result_dict.get("was_corrected", False),
                "corrections": result_dict.get("corrections", {}),
                "validation": result_dict.get("validation"),
                "models_used": result_dict.get("models_used", []),  # Add model history
            },
            "errors": result_dict.get("errors", []),
            "process_time": result_dict.get("process_time", 0),
        }
