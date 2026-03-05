"""
Intent Classifier Service

Classifies user message intent for routing to appropriate tools.
Phase 13 - Chatbot Implementation
"""

from typing import Literal, List

from app.services.ai import get_ai_gateway, ModelPurpose

IntentType = Literal[
    "rag_query",
    "document_search",
    "document_operation",
    "insights_query",
    "clarification",
    "greeting",
    "unknown",
]


class IntentClassifier:
    """Classify user intent for routing to appropriate tools."""

    def __init__(self):
        self.gateway = get_ai_gateway()

    async def classify_intent(
        self, user_message: str, conversation_context: dict = None
    ) -> IntentType:
        """
        Classify user message intent using GPT-4.

        Intents:
        - rag_query: Question about document content
        - document_search: Search for documents by name/metadata
        - document_operation: Upload, delete, or manage documents
        - insights_query: Data analysis or NL-to-SQL type queries
        - clarification: Follow-up or clarification on previous response
        - greeting: Hello, thanks, etc.
        - unknown: Unable to determine intent

        Args:
            user_message: The user's message to classify
            conversation_context: Optional conversation history context

        Returns:
            IntentType: The classified intent
        """
        system_prompt = """You are an intent classifier for a document management system.

Classify the user's message into ONE of these categories:

1. rag_query: User asks a question about document CONTENT (e.g., "What does the contract say about payment terms?")
2. document_search: User wants to FIND documents (e.g., "Show me invoices from January", "Find contracts with Company X")
3. document_operation: User wants to manage documents (e.g., "Delete this document", "Upload a file", "Reprocess document")
4. insights_query: User asks for DATA ANALYSIS across documents (e.g., "Total revenue from all invoices", "Count documents by type")
5. clarification: User asks follow-up question about previous response (e.g., "Can you elaborate?", "What about section 3?")
6. greeting: Social niceties (e.g., "Hello", "Thank you", "Goodbye")
7. unknown: Cannot determine intent

Respond with ONLY the intent category, no explanation."""

        try:
            response = await self.gateway.acompletion(
                purpose=ModelPurpose.CLASSIFIER,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"User message: {user_message}"},
                ],
                temperature=0.0,
                max_tokens=20,
            )

            intent = response.choices[0].message.content.strip().lower()

            # Validate and return
            valid_intents: List[IntentType] = [
                "rag_query",
                "document_search",
                "document_operation",
                "insights_query",
                "clarification",
                "greeting",
                "unknown",
            ]

            return intent if intent in valid_intents else "unknown"

        except Exception as e:
            print(f"Intent classification error: {e}")
            return "unknown"
