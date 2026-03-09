"""
Tool Router Service

Routes chat intents to appropriate tools/services.
Phase 13 - Chatbot Implementation
"""

from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.chat.intent_classifier import IntentType
from app.db.repositories.document import DocumentRepository


class ToolRouter:
    """Route chat intents to appropriate tools/services."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.document_repo = DocumentRepository(session)

    async def execute_tool(
        self, intent: IntentType, user_message: str, context: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        Execute appropriate tool based on intent.

        Args:
            intent: The classified intent type
            user_message: The user's message
            context: Conversation context history

        Returns:
            Dict with 'response' and optional tool-specific data
        """
        if intent == "document_search":
            return await self._handle_document_search(user_message)

        elif intent == "document_operation":
            return await self._handle_document_operation(user_message)

        elif intent == "insights_query":
            return await self._handle_insights_query(user_message)

        elif intent == "unknown":
            return {
                "response": "I'm not sure how to help with that. Could you rephrase your question or try:\n- Ask about document content\n- Search for documents\n- Request data analysis"
            }

        else:
            return {
                "response": "I'm still learning how to handle that type of request."
            }

    async def _handle_document_search(self, user_message: str) -> Dict[str, Any]:
        """Search for documents by name/metadata."""
        # Simplified: Extract search term and query documents
        # In production, use NER or LLM to extract search criteria
        search_term = (
            user_message.lower().replace("find", "").replace("show me", "").strip()
        )

        # Search documents (simplified)
        documents = await self.document_repo.list(limit=10)
        matching_docs = [
            doc for doc in documents if search_term in doc.filename.lower()
        ]

        if matching_docs:
            doc_list = "\n".join(
                [f"- {doc.filename} (ID: {doc.id})" for doc in matching_docs[:5]]
            )
            response = f"I found {len(matching_docs)} matching documents:\n{doc_list}"
        else:
            response = f"No documents found matching '{search_term}'."

        return {
            "response": response,
            "documents": [
                {"id": str(doc.id), "name": doc.filename} for doc in matching_docs[:5]
            ],
        }

    async def _handle_document_operation(self, user_message: str) -> Dict[str, Any]:
        """Handle document management operations."""
        # This would integrate with document upload/delete/reprocess endpoints
        return {
            "response": "Document operations are currently handled through the main interface. Please use the upload or manage buttons."
        }

    async def _handle_insights_query(self, user_message: str) -> Dict[str, Any]:
        """Handle data analysis queries (NL-to-SQL from Phase 10)."""
        # This would integrate with the Insights API from Phase 10
        return {
            "response": "Data analysis queries will be integrated with the Insights feature. This is coming soon!"
        }
