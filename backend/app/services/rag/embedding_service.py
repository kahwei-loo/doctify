"""
Embedding Service for RAG

Handles text chunking and embedding generation for document processing.
Phase 11 - RAG Implementation
Enhanced: Semantic chunking (P0.1)
"""

import re
import uuid
from enum import Enum
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

import tiktoken

from app.core.config import settings
from app.services.ai import get_ai_gateway, ModelPurpose
from app.db.repositories.document import DocumentRepository
from app.db.repositories.rag import DocumentEmbeddingRepository
from app.db.models.rag import DocumentEmbedding
from app.core.exceptions import ValidationError, DatabaseError


class ChunkStrategy(str, Enum):
    """Chunking strategy for text splitting."""

    FIXED = "fixed"  # Original fixed-token window
    SEMANTIC = "semantic"  # Sentence-boundary-aware chunking
    RECURSIVE = "recursive"  # Recursive character-based splitting


# Sentence boundary pattern: split after sentence-ending punctuation followed by whitespace
_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?。！？])\s+")
# Sub-sentence boundary: commas, semicolons, colons for splitting long sentences
_SUBSENTENCE_SPLIT_RE = re.compile(r"(?<=[,;:，；：])\s*")


class EmbeddingService:
    """
    Service for generating and managing document embeddings.

    Uses OpenAI's text-embedding-3-small model (1536 dimensions).
    """

    EMBEDDING_DIMENSION = 1536
    DEFAULT_CHUNK_SIZE = 1000  # tokens
    DEFAULT_CHUNK_OVERLAP = 200  # tokens

    def __init__(self, session: AsyncSession):
        """Initialize service with database session."""
        self.session = session
        self.document_repo = DocumentRepository(session)
        self.embedding_repo = DocumentEmbeddingRepository(session)

        # Initialize AI gateway
        self.gateway = get_ai_gateway()

        # Initialize tokenizer for text chunking
        self.encoding = tiktoken.get_encoding("cl100k_base")

    def chunk_text(
        self,
        text: str,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
        strategy: str = "semantic",
    ) -> List[str]:
        """
        Split text into overlapping chunks.

        Supports multiple strategies:
        - "fixed": Original token-window chunking (backward compatible)
        - "semantic": Sentence-boundary-aware chunking (default)
        - "recursive": Recursive character-based splitting

        Args:
            text: Source text to chunk
            chunk_size: Target tokens per chunk
            chunk_overlap: Overlap tokens between chunks
            strategy: Chunking strategy ("fixed", "semantic", "recursive")

        Returns:
            List of text chunks

        Raises:
            ValidationError: If text is empty or parameters are invalid
        """
        if not text or not text.strip():
            return []

        if chunk_size <= 0 or chunk_overlap < 0 or chunk_overlap >= chunk_size:
            raise ValidationError("Invalid chunk parameters")

        if strategy == ChunkStrategy.SEMANTIC:
            return self._chunk_semantic(text, chunk_size, chunk_overlap)
        elif strategy == ChunkStrategy.RECURSIVE:
            return self._chunk_recursive(text, chunk_size, chunk_overlap)
        else:
            return self._chunk_fixed(text, chunk_size, chunk_overlap)

    def chunk_text_with_positions(
        self,
        text: str,
        chunk_size: int = DEFAULT_CHUNK_SIZE,
        chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
        strategy: str = "semantic",
    ) -> List[Tuple[str, int, int]]:
        """
        Split text into chunks and track character positions in original text.

        Returns:
            List of (chunk_text, start_char, end_char) tuples
        """
        chunks = self.chunk_text(text, chunk_size, chunk_overlap, strategy)
        if not chunks:
            return []

        result: List[Tuple[str, int, int]] = []
        search_start = 0

        for chunk in chunks:
            # Find chunk position in original text
            # Use first 80 chars as search key to handle overlap edge cases
            search_key = chunk[:80] if len(chunk) > 80 else chunk
            idx = text.find(search_key, max(0, search_start - chunk_overlap * 4))
            if idx == -1:
                # Fallback: search from beginning
                idx = text.find(search_key)
            if idx == -1:
                # Last resort: use running position
                idx = search_start

            start_char = idx
            end_char = start_char + len(chunk)
            result.append((chunk, start_char, min(end_char, len(text))))
            search_start = start_char + 1

        return result

    def _chunk_fixed(self, text: str, chunk_size: int, chunk_overlap: int) -> List[str]:
        """Original fixed-token-window chunking."""
        tokens = self.encoding.encode(text)
        if not tokens:
            return []

        chunks = []
        start = 0

        while start < len(tokens):
            end = start + chunk_size
            chunk_tokens = tokens[start:end]
            chunk_text = self.encoding.decode(chunk_tokens)
            chunks.append(chunk_text)
            start = end - chunk_overlap
            if start >= len(tokens) - chunk_overlap:
                break

        return chunks

    def _chunk_semantic(
        self, text: str, chunk_size: int, chunk_overlap: int
    ) -> List[str]:
        """
        Sentence-boundary-aware chunking.

        Algorithm:
        1. Split text into sentences using regex
        2. Greedily merge sentences until approaching chunk_size
        3. If a single sentence exceeds chunk_size, split by sub-sentence boundaries
        4. Maintain overlap by prepending tail sentences from previous chunk
        """
        # Split into sentences
        sentences = _SENTENCE_SPLIT_RE.split(text.strip())
        sentences = [s.strip() for s in sentences if s.strip()]

        if not sentences:
            return []

        # If text is small enough, return as single chunk
        total_tokens = len(self.encoding.encode(text))
        if total_tokens <= chunk_size:
            return [text.strip()]

        # Break any sentence that exceeds chunk_size into sub-parts
        expanded_sentences: List[str] = []
        for sentence in sentences:
            sent_tokens = len(self.encoding.encode(sentence))
            if sent_tokens <= chunk_size:
                expanded_sentences.append(sentence)
            else:
                # Split by sub-sentence boundaries (commas, semicolons, etc.)
                sub_parts = _SUBSENTENCE_SPLIT_RE.split(sentence)
                sub_parts = [p.strip() for p in sub_parts if p.strip()]
                if sub_parts:
                    expanded_sentences.extend(sub_parts)
                else:
                    # Fallback: force-split by token window
                    expanded_sentences.extend(
                        self._chunk_fixed(sentence, chunk_size, chunk_overlap)
                    )

        # Greedy merge sentences into chunks with overlap
        chunks: List[str] = []
        current_parts: List[str] = []
        current_tokens = 0

        for sentence in expanded_sentences:
            sent_tokens = len(self.encoding.encode(sentence))

            if current_tokens + sent_tokens > chunk_size and current_parts:
                # Flush current chunk
                chunks.append(" ".join(current_parts))

                # Calculate overlap: keep tail sentences that fit within chunk_overlap
                if chunk_overlap > 0:
                    overlap_parts: List[str] = []
                    overlap_tokens = 0
                    for part in reversed(current_parts):
                        part_tokens = len(self.encoding.encode(part))
                        if overlap_tokens + part_tokens > chunk_overlap:
                            break
                        overlap_parts.insert(0, part)
                        overlap_tokens += part_tokens
                    current_parts = overlap_parts
                    current_tokens = overlap_tokens
                else:
                    current_parts = []
                    current_tokens = 0

            current_parts.append(sentence)
            current_tokens += sent_tokens

        # Don't forget the last chunk
        if current_parts:
            chunks.append(" ".join(current_parts))

        return chunks

    def _chunk_recursive(
        self, text: str, chunk_size: int, chunk_overlap: int
    ) -> List[str]:
        """
        Recursive character-based splitting.

        Tries splitting by paragraph, then sentence, then sub-sentence,
        then falls back to fixed-token splitting.
        """
        separators = ["\n\n", "\n", ". ", ", ", " "]
        return self._recursive_split(text, separators, chunk_size, chunk_overlap)

    def _recursive_split(
        self,
        text: str,
        separators: List[str],
        chunk_size: int,
        chunk_overlap: int,
    ) -> List[str]:
        """Recursively split text using a hierarchy of separators."""
        tokens = self.encoding.encode(text)
        if len(tokens) <= chunk_size:
            return [text.strip()] if text.strip() else []

        if not separators:
            return self._chunk_fixed(text, chunk_size, chunk_overlap)

        separator = separators[0]
        parts = text.split(separator)

        chunks: List[str] = []
        current_parts: List[str] = []
        current_tokens = 0

        for part in parts:
            part_text = part.strip()
            if not part_text:
                continue
            part_tokens = len(self.encoding.encode(part_text))

            if part_tokens > chunk_size:
                # This part is too big, flush current and recurse
                if current_parts:
                    chunks.append(separator.join(current_parts))
                    current_parts = []
                    current_tokens = 0
                chunks.extend(
                    self._recursive_split(
                        part_text, separators[1:], chunk_size, chunk_overlap
                    )
                )
                continue

            if current_tokens + part_tokens > chunk_size and current_parts:
                chunks.append(separator.join(current_parts))
                # Overlap
                if chunk_overlap > 0:
                    overlap_parts: List[str] = []
                    overlap_tokens = 0
                    for p in reversed(current_parts):
                        p_tokens = len(self.encoding.encode(p))
                        if overlap_tokens + p_tokens > chunk_overlap:
                            break
                        overlap_parts.insert(0, p)
                        overlap_tokens += p_tokens
                    current_parts = overlap_parts
                    current_tokens = overlap_tokens
                else:
                    current_parts = []
                    current_tokens = 0

            current_parts.append(part_text)
            current_tokens += part_tokens

        if current_parts:
            chunks.append(separator.join(current_parts))

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
            response = await self.gateway.aembedding(input_text=text)

            item = response.data[0]
            embedding = (
                item.embedding if hasattr(item, "embedding") else item["embedding"]
            )

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
        force_regenerate: bool = False,
        chunk_strategy: str = "semantic",
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
                existing_count = await self.embedding_repo.count_by_document_id(
                    document_id
                )
                if existing_count > 0:
                    await self.embedding_repo.delete_by_document_id(document_id)

            # Check if embeddings already exist
            existing_embeddings = await self.embedding_repo.get_by_document_id(
                document_id
            )
            if existing_embeddings and not force_regenerate:
                return existing_embeddings

            # Chunk the text with position tracking (P2.1)
            chunks_with_pos = self.chunk_text_with_positions(
                document.extracted_text,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                strategy=chunk_strategy,
            )

            if not chunks_with_pos:
                raise ValidationError(
                    f"No text chunks generated for document {document_id}"
                )

            # Generate embeddings for all chunks
            embeddings = []
            for i, (chunk, start_char, end_char) in enumerate(chunks_with_pos):
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
                        "chunk_strategy": chunk_strategy,
                        "start_char": start_char,
                        "end_char": end_char,
                    },
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
        self, document_id: uuid.UUID | str
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

    async def delete_embeddings_for_document(self, document_id: uuid.UUID | str) -> int:
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
