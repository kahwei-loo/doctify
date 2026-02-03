"""
Embedding Service for RAG

Handles text chunking and embedding generation for document processing.
Phase 11 - RAG Implementation
"""

import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession

import tiktoken
from openai import AsyncOpenAI

from app.core.config import settings
from app.db.repositories.document import DocumentRepository
from app.db.repositories.rag import DocumentEmbeddingRepository
from app.db.models.rag import DocumentEmbedding
from app.core.exceptions import ValidationError, DatabaseError


class EmbeddingService:
    """
    Service for generating and managing document embeddings.

    Uses OpenAI's text-embedding-3-small model (1536 dimensions).
    """

    EMBEDDING_MODEL = "text-embedding-3-small"
    EMBEDDING_DIMENSION = 1536
    DEFAULT_CHUNK_SIZE = 1000  # tokens
    DEFAULT_CHUNK_OVERLAP = 200  # tokens

    def __init__(self, session: AsyncSession):
        """Initialize service with database session."""
        self.session = session
        self.document_repo = DocumentRepository(session)
        self.embedding_repo = DocumentEmbeddingRepository(session)

        # Initialize OpenAI client
        if not settings.OPENAI_API_KEY:
            raise ValidationError("OPENAI_API_KEY not configured")

        self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

        # Initialize tokenizer for text chunking
        self.encoding = tiktoken.get_encoding("cl100k_base")

    def chunk_text(
        self,
        text: str,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        chunk_overlap: int = DEFAULT_CHUNK_OVERLAP
    ) -> List[str]:
        """
        Split text into overlapping chunks based on token count.

        Args:
            text: Source text to chunk
            chunk_size: Target tokens per chunk
            chunk_overlap: Overlap tokens between chunks

        Returns:
            List of text chunks

        Raises:
            ValidationError: If text is empty or parameters are invalid
        """
        if not text or not text.strip():
            return []

        if chunk_size <= 0 or chunk_overlap < 0 or chunk_overlap >= chunk_size:
            raise ValidationError("Invalid chunk parameters")

        # Tokenize the text
        tokens = self.encoding.encode(text)

        if not tokens:
            return []

        chunks = []
        start = 0

        while start < len(tokens):
            # Define chunk end
            end = start + chunk_size
            chunk_tokens = tokens[start:end]

            # Decode back to text
            chunk_text = self.encoding.decode(chunk_tokens)
            chunks.append(chunk_text)

            # Move start position with overlap
            start = end - chunk_overlap

            # Prevent infinite loop on very small texts
            if start >= len(tokens) - chunk_overlap:
                break

        return chunks

    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding vector for text using OpenAI.

        Args:
            text: Text to embed

        Returns:
            Embedding vector (1536 dimensions)

        Raises:
            ValidationError: If text is empty
            DatabaseError: If OpenAI API call fails
        """
        if not text or not text.strip():
            raise ValidationError("Cannot generate embedding for empty text")

        try:
            response = await self.openai_client.embeddings.create(
                model=self.EMBEDDING_MODEL,
                input=text,
                encoding_format="float"
            )

            embedding = response.data[0].embedding

            # Validate dimension
            if len(embedding) != self.EMBEDDING_DIMENSION:
                raise DatabaseError(
                    f"Unexpected embedding dimension: {len(embedding)} "
                    f"(expected {self.EMBEDDING_DIMENSION})"
                )

            return embedding

        except Exception as e:
            raise DatabaseError(f"Failed to generate embedding: {str(e)}")

    async def generate_embeddings_for_document(
        self,
        document_id: uuid.UUID | str,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
        force_regenerate: bool = False
    ) -> List[DocumentEmbedding]:
        """
        Generate embeddings for all chunks of a document.

        Workflow:
        1. Retrieve document.extracted_text
        2. Chunk text with overlap
        3. Generate embeddings for each chunk
        4. Store in document_embeddings table

        Args:
            document_id: Document UUID
            chunk_size: Tokens per chunk
            chunk_overlap: Overlap tokens between chunks
            force_regenerate: Delete existing embeddings and regenerate

        Returns:
            List of created DocumentEmbedding objects

        Raises:
            ValidationError: If document not found or has no text
            DatabaseError: If embedding generation or storage fails
        """
        try:
            # Convert string ID to UUID if needed
            if isinstance(document_id, str):
                document_id = uuid.UUID(document_id)

            # Get document
            document = await self.document_repo.get_by_id(document_id)
            if not document:
                raise ValidationError(f"Document {document_id} not found")

            if not document.extracted_text:
                raise ValidationError(
                    f"Document {document_id} has no extracted text. "
                    "Please process the document first."
                )

            # Delete existing embeddings if force regenerate
            if force_regenerate:
                existing_count = await self.embedding_repo.count_by_document_id(document_id)
                if existing_count > 0:
                    await self.embedding_repo.delete_by_document_id(document_id)

            # Check if embeddings already exist
            existing_embeddings = await self.embedding_repo.get_by_document_id(document_id)
            if existing_embeddings and not force_regenerate:
                return existing_embeddings

            # Chunk the text
            chunks = self.chunk_text(
                document.extracted_text,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap
            )

            if not chunks:
                raise ValidationError(f"No text chunks generated for document {document_id}")

            # Generate embeddings for all chunks
            embeddings = []
            for i, chunk in enumerate(chunks):
                # Generate embedding vector
                embedding_vector = await self.generate_embedding(chunk)

                # Create DocumentEmbedding object
                doc_embedding = DocumentEmbedding(
                    document_id=document_id,
                    chunk_index=i,
                    chunk_text=chunk,
                    embedding=embedding_vector,
                    chunk_metadata={
                        "token_count": len(self.encoding.encode(chunk)),
                        "document_name": document.original_filename,
                        "chunk_size": chunk_size,
                        "chunk_overlap": chunk_overlap,
                    }
                )
                embeddings.append(doc_embedding)

            # Bulk insert all embeddings
            created_embeddings = await self.embedding_repo.create_bulk(embeddings)

            return created_embeddings

        except Exception as e:
            await self.session.rollback()
            if isinstance(e, (ValidationError, DatabaseError)):
                raise
            raise DatabaseError(f"Failed to generate embeddings for document: {str(e)}")

    async def get_embeddings_for_document(
        self,
        document_id: uuid.UUID | str
    ) -> List[DocumentEmbedding]:
        """
        Get all embeddings for a document.

        Args:
            document_id: Document UUID

        Returns:
            List of DocumentEmbedding objects ordered by chunk_index
        """
        if isinstance(document_id, str):
            document_id = uuid.UUID(document_id)

        return await self.embedding_repo.get_by_document_id(document_id)

    async def delete_embeddings_for_document(
        self,
        document_id: uuid.UUID | str
    ) -> int:
        """
        Delete all embeddings for a document.

        Args:
            document_id: Document UUID

        Returns:
            Number of embeddings deleted
        """
        if isinstance(document_id, str):
            document_id = uuid.UUID(document_id)

        return await self.embedding_repo.delete_by_document_id(document_id)

    def count_tokens(self, text: str) -> int:
        """
        Count tokens in text.

        Args:
            text: Text to count

        Returns:
            Token count
        """
        return len(self.encoding.encode(text))
