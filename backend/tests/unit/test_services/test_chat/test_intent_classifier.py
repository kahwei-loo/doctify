"""
Unit tests for Intent Classifier service.

Phase 13 - Chatbot Implementation
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.chat.intent_classifier import IntentClassifier


@pytest.mark.asyncio
class TestIntentClassifier:
    """Test suite for IntentClassifier service."""

    @pytest.fixture
    def classifier(self):
        """Create IntentClassifier instance."""
        return IntentClassifier()

    @pytest.mark.parametrize(
        "user_message,expected_intent",
        [
            ("What does the contract say about payment terms?", "rag_query"),
            ("Show me invoices from January", "document_search"),
            ("Delete this document", "document_operation"),
            ("Total revenue from all invoices", "insights_query"),
            ("Can you elaborate on that?", "clarification"),
            ("Hello", "greeting"),
            ("What is the meaning of life?", "unknown"),
        ],
    )
    async def test_classify_intent_success(
        self, classifier, user_message, expected_intent
    ):
        """Test successful intent classification for various message types."""
        # Mock OpenAI response
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = expected_intent

        with patch.object(
            classifier.client.chat.completions,
            "create",
            new_callable=AsyncMock,
            return_value=mock_response,
        ):
            result = await classifier.classify_intent(user_message)
            assert result == expected_intent

    async def test_classify_intent_with_context(self, classifier):
        """Test intent classification with conversation context."""
        context = {
            "history": [
                {"role": "user", "content": "What is the contract about?"},
                {"role": "assistant", "content": "The contract is about..."},
            ]
        }

        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "clarification"

        with patch.object(
            classifier.client.chat.completions,
            "create",
            new_callable=AsyncMock,
            return_value=mock_response,
        ):
            result = await classifier.classify_intent(
                "Can you tell me more?", conversation_context=context
            )
            assert result == "clarification"

    async def test_classify_intent_invalid_response(self, classifier):
        """Test handling of invalid intent response from LLM."""
        # Mock OpenAI response with invalid intent
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "invalid_intent"

        with patch.object(
            classifier.client.chat.completions,
            "create",
            new_callable=AsyncMock,
            return_value=mock_response,
        ):
            result = await classifier.classify_intent("Some message")
            assert result == "unknown"

    async def test_classify_intent_api_error(self, classifier):
        """Test handling of API errors during classification."""
        with patch.object(
            classifier.client.chat.completions,
            "create",
            new_callable=AsyncMock,
            side_effect=Exception("API Error"),
        ):
            result = await classifier.classify_intent("Some message")
            assert result == "unknown"

    async def test_classify_intent_empty_message(self, classifier):
        """Test classification of empty message."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "unknown"

        with patch.object(
            classifier.client.chat.completions,
            "create",
            new_callable=AsyncMock,
            return_value=mock_response,
        ):
            result = await classifier.classify_intent("")
            assert result == "unknown"

    async def test_classify_intent_gpt4_parameters(self, classifier):
        """Test that GPT-4 is called with correct parameters."""
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "rag_query"

        with patch.object(
            classifier.client.chat.completions,
            "create",
            new_callable=AsyncMock,
            return_value=mock_response,
        ) as mock_create:
            await classifier.classify_intent("Test message")

            # Verify GPT-4 parameters
            mock_create.assert_called_once()
            call_kwargs = mock_create.call_args.kwargs
            assert call_kwargs["model"] == "gpt-4"
            assert call_kwargs["temperature"] == 0.0
            assert call_kwargs["max_tokens"] == 20
            assert len(call_kwargs["messages"]) == 2
            assert call_kwargs["messages"][0]["role"] == "system"
            assert call_kwargs["messages"][1]["role"] == "user"
