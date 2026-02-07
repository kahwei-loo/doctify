"""
Knowledge Base Celery Tasks

Background tasks for knowledge base operations:
- Embedding generation
- Website crawling

Phase 1 - Knowledge Base Feature (Week 2-3)
"""

import uuid
import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from app.tasks.celery_app import celery_app
from app.db.database import get_async_session
from app.db.repositories.knowledge_base import KnowledgeBaseRepository, DataSourceRepository
from app.db.repositories.rag import DocumentEmbeddingRepository
from app.db.models.rag import DocumentEmbedding
from app.services.rag.embedding_service import EmbeddingService
from app.core.config import get_settings

logger = logging.getLogger(__name__)
config = get_settings()


async def _extract_text_from_data_source(ds, db) -> str:
    """
    Extract text content based on data source type.

    Args:
        ds: Data source entity
        db: Database session

    Returns:
        Extracted text content as string
    """
    ds_type = ds.type

    if ds_type == "text":
        # Plain text content stored directly in config
        return ds.config.get("content", "")

    elif ds_type == "qa_pairs":
        # Q&A pairs formatted as conversational text
        qa_pairs = ds.config.get("pairs", [])
        if not qa_pairs:
            return ""
        text_parts = []
        for pair in qa_pairs:
            question = pair.get("question", "")
            answer = pair.get("answer", "")
            if question and answer:
                text_parts.append(f"Question: {question}\nAnswer: {answer}")
        return "\n\n".join(text_parts)

    elif ds_type == "uploaded_docs":
        # Extract text from uploaded document references
        # Documents are linked via config["document_ids"]
        from app.db.repositories.document import DocumentRepository
        doc_repo = DocumentRepository(db)

        document_ids = ds.config.get("document_ids", [])
        text_parts = []

        for doc_id in document_ids:
            try:
                doc = await doc_repo.get_by_id(doc_id)
                if doc and doc.extracted_text:
                    text_parts.append(doc.extracted_text)
            except Exception as e:
                logger.warning(f"Failed to extract text from document {doc_id}: {e}")
                continue

        return "\n\n".join(text_parts)

    elif ds_type == "website":
        # Use already crawled pages stored in config
        crawled_pages = ds.config.get("crawled_pages", [])
        if not crawled_pages:
            return ""
        text_parts = []
        for page in crawled_pages:
            title = page.get("title", "")
            content = page.get("content", "")
            url = page.get("url", "")
            if content:
                page_text = f"Page: {title}\nURL: {url}\n\n{content}" if title else content
                text_parts.append(page_text)
        return "\n\n---\n\n".join(text_parts)

    else:
        raise ValueError(f"Unsupported data source type: {ds_type}")


async def _generate_embeddings_async(data_source_id: str, force_regenerate: bool, task_instance):
    """
    Async implementation of embedding generation.

    Args:
        data_source_id: Data source UUID string
        force_regenerate: If True, delete existing embeddings first
        task_instance: Celery task instance for progress updates
    """
    ds_id = uuid.UUID(data_source_id)
    logger.info(f"Starting embedding generation for data source {ds_id}")

    async with get_async_session() as db:
        ds_repo = DataSourceRepository(db)
        kb_repo = KnowledgeBaseRepository(db)
        embedding_repo = DocumentEmbeddingRepository(db)

        # Get data source
        ds = await ds_repo.get_by_id(ds_id)
        if not ds:
            raise ValueError(f"Data source {ds_id} not found")

        # Update status to syncing
        await ds_repo.update_status(ds_id, "syncing")
        await db.commit()

        # Get knowledge base config
        kb = await kb_repo.get_by_id(ds.knowledge_base_id)
        if not kb:
            raise ValueError(f"Knowledge base {ds.knowledge_base_id} not found")

        chunk_size = kb.config.get("chunk_size", 1024)
        chunk_overlap = kb.config.get("chunk_overlap", 128)
        embedding_model = kb.config.get("embedding_model", "text-embedding-3-small")
        chunk_strategy = kb.config.get("chunk_strategy", "semantic")

        # Delete existing embeddings if force regenerate
        if force_regenerate:
            existing = await embedding_repo.get_by_data_source_id(ds_id)
            if existing:
                await embedding_repo.delete_by_data_source_id(ds_id)
                await db.commit()
                logger.info(f"Deleted {len(existing)} existing embeddings for data source {ds_id}")

        # Extract text based on data source type
        text_content = await _extract_text_from_data_source(ds, db)

        if not text_content or not text_content.strip():
            logger.warning(f"No text content extracted from data source {ds_id}")
            await ds_repo.update_status(ds_id, "active")
            await ds_repo.update_sync_timestamp(ds_id)
            await db.commit()
            return {
                "status": "completed",
                "data_source_id": str(ds_id),
                "processed": 0,
                "message": "No text content to process",
                "error": None,
            }

        # Initialize embedding service for chunking and embedding
        embedding_service = EmbeddingService(db)

        # Chunk text using the embedding service with configured strategy
        chunks = embedding_service.chunk_text(
            text_content,
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            strategy=chunk_strategy,
        )

        if not chunks:
            logger.warning(f"No chunks generated from data source {ds_id}")
            await ds_repo.update_status(ds_id, "active")
            await ds_repo.update_sync_timestamp(ds_id)
            await db.commit()
            return {
                "status": "completed",
                "data_source_id": str(ds_id),
                "processed": 0,
                "message": "No chunks generated from text",
                "error": None,
            }

        # Generate embeddings in batches of 50
        batch_size = 50
        total_chunks = len(chunks)
        processed_count = 0
        embeddings_created = []

        for i in range(0, total_chunks, batch_size):
            batch_chunks = chunks[i:i + batch_size]

            for idx, chunk_text in enumerate(batch_chunks):
                chunk_index = i + idx

                try:
                    # Generate embedding vector
                    embedding_vector = await embedding_service.generate_embedding(chunk_text)

                    # Create embedding record
                    embedding_data = DocumentEmbedding(
                        data_source_id=ds_id,
                        chunk_index=chunk_index,
                        chunk_text=chunk_text,
                        embedding=embedding_vector,
                        chunk_metadata={
                            "model": embedding_model,
                            "chunk_size": chunk_size,
                            "chunk_overlap": chunk_overlap,
                            "chunk_strategy": chunk_strategy,
                            "token_count": embedding_service.count_tokens(chunk_text),
                        }
                    )
                    db.add(embedding_data)
                    embeddings_created.append(embedding_data)
                    processed_count += 1

                except Exception as e:
                    logger.error(f"Failed to generate embedding for chunk {chunk_index}: {e}")
                    continue

            # Commit batch
            await db.commit()

            # Update progress
            progress = ((i + len(batch_chunks)) / total_chunks) * 100
            if task_instance:
                task_instance.update_state(
                    state='PROGRESS',
                    meta={
                        'processed': i + len(batch_chunks),
                        'total': total_chunks,
                        'progress': round(progress, 1)
                    }
                )

            logger.info(f"Processed batch {i // batch_size + 1}, total processed: {processed_count}/{total_chunks}")

        # Update data source status to active
        await ds_repo.update_status(ds_id, "active")
        await ds_repo.update_sync_timestamp(ds_id)

        # Update embedding count in data source config
        current_config = ds.config or {}
        current_config["embedding_count"] = processed_count
        current_config["last_embedding_at"] = datetime.utcnow().isoformat()
        await ds_repo.update(ds_id, {"config": current_config})

        await db.commit()

        logger.info(f"Embedding generation completed for data source {ds_id}: {processed_count} embeddings")

        return {
            "status": "completed",
            "data_source_id": str(ds_id),
            "processed": processed_count,
            "total_chunks": total_chunks,
            "error": None,
        }


async def _crawl_website_async(data_source_id: str, task_instance):
    """
    Async implementation of website crawling.

    Args:
        data_source_id: Data source UUID string
        task_instance: Celery task instance for progress updates
    """
    ds_id = uuid.UUID(data_source_id)
    logger.info(f"Starting website crawl for data source {ds_id}")

    async with get_async_session() as db:
        ds_repo = DataSourceRepository(db)

        # Get data source
        ds = await ds_repo.get_by_id(ds_id)
        if not ds:
            raise ValueError(f"Data source {ds_id} not found")

        if ds.type != "website":
            raise ValueError(f"Data source {ds_id} is not a website type")

        # Update status to syncing
        await ds_repo.update_status(ds_id, "syncing")
        await db.commit()

        # Extract config
        base_url = ds.config.get("url")
        max_depth = min(ds.config.get("max_depth", 2), 2)  # Hard limit: 2
        max_pages = min(ds.config.get("max_pages", 100), 100)  # Hard limit: 100
        include_patterns = ds.config.get("include_patterns", [])
        exclude_patterns = ds.config.get("exclude_patterns", [])

        if not base_url:
            raise ValueError("Website URL not provided in config")

        # Parse base domain for same-domain restriction
        base_domain = urlparse(base_url).netloc

        # BFS crawl
        visited_urls = set()
        crawled_pages = []
        queue = [(base_url, 0)]  # (url, depth)

        while queue and len(crawled_pages) < max_pages:
            url, depth = queue.pop(0)

            # Skip if already visited or too deep
            if url in visited_urls or depth > max_depth:
                continue

            # Normalize URL
            url = url.rstrip("/")

            # Check exclude patterns
            if exclude_patterns:
                if any(pattern in url for pattern in exclude_patterns):
                    continue

            # Check include patterns (if specified, URL must match at least one)
            if include_patterns:
                if not any(pattern in url for pattern in include_patterns):
                    continue

            visited_urls.add(url)

            try:
                # Fetch page with timeout
                headers = {
                    "User-Agent": "DoctifyBot/1.0 (Knowledge Base Crawler)"
                }
                response = requests.get(url, timeout=30, headers=headers, allow_redirects=True)
                response.raise_for_status()

                # Skip non-HTML content
                content_type = response.headers.get("Content-Type", "")
                if "text/html" not in content_type:
                    continue

                # Parse HTML
                soup = BeautifulSoup(response.content, "lxml")

                # Remove script and style elements
                for script in soup(["script", "style", "nav", "footer", "header"]):
                    script.decompose()

                # Extract text
                text_content = soup.get_text(separator="\n", strip=True)

                # Clean up excessive whitespace
                lines = [line.strip() for line in text_content.split("\n") if line.strip()]
                text_content = "\n".join(lines)

                # Get title
                title = ""
                if soup.title and soup.title.string:
                    title = soup.title.string.strip()

                # Store page
                if text_content:
                    crawled_pages.append({
                        "url": url,
                        "title": title,
                        "content": text_content[:50000],  # Limit content size per page
                        "depth": depth,
                        "crawled_at": datetime.utcnow().isoformat(),
                    })

                # Find links for next depth
                if depth < max_depth:
                    for link in soup.find_all("a", href=True):
                        href = link["href"]
                        next_url = urljoin(url, href)

                        # Parse next URL
                        parsed_next = urlparse(next_url)

                        # Only follow same-domain links
                        if parsed_next.netloc != base_domain:
                            continue

                        # Skip fragments and query params for simplicity
                        clean_url = f"{parsed_next.scheme}://{parsed_next.netloc}{parsed_next.path}"

                        # Skip common non-content URLs
                        skip_extensions = [".pdf", ".jpg", ".jpeg", ".png", ".gif", ".css", ".js", ".xml"]
                        if any(clean_url.lower().endswith(ext) for ext in skip_extensions):
                            continue

                        if clean_url not in visited_urls:
                            queue.append((clean_url, depth + 1))

                # Update progress
                if task_instance:
                    task_instance.update_state(
                        state='PROGRESS',
                        meta={
                            'pages_crawled': len(crawled_pages),
                            'total_pages': max_pages,
                            'current_url': url
                        }
                    )

                logger.info(f"Crawled page {len(crawled_pages)}/{max_pages}: {url}")

            except requests.exceptions.RequestException as page_error:
                logger.warning(f"Failed to crawl {url}: {str(page_error)}")
                continue
            except Exception as page_error:
                logger.warning(f"Error processing {url}: {str(page_error)}")
                continue

        # Store crawled content in data source config
        current_config = ds.config or {}
        current_config["crawled_pages"] = crawled_pages
        current_config["crawl_completed_at"] = datetime.utcnow().isoformat()
        current_config["pages_crawled"] = len(crawled_pages)

        await ds_repo.update(ds_id, {
            "config": current_config,
            "document_count": len(crawled_pages)
        })

        # Update status to active
        await ds_repo.update_status(ds_id, "active")
        await ds_repo.update_sync_timestamp(ds_id)
        await db.commit()

        logger.info(f"Website crawl completed for data source {ds_id}: {len(crawled_pages)} pages")

        return {
            "status": "completed",
            "data_source_id": str(ds_id),
            "pages_crawled": len(crawled_pages),
            "total_pages": max_pages,
            "error": None,
        }


@celery_app.task(bind=True, queue="ocr_queue", name="tasks.generate_embeddings")
def generate_embeddings_task(self, data_source_id: str, force_regenerate: bool = False):
    """
    Generate embeddings for a data source.

    Process:
    1. Get data source and verify status
    2. Extract text based on type (uploaded_docs, text, qa_pairs, website)
    3. Chunk text using KB config (chunk_size, chunk_overlap)
    4. Generate embeddings via OpenAI (batch of 50)
    5. Store in document_embeddings table with data_source_id
    6. Update data source status and counts
    7. Broadcast progress via Redis or WebSocket

    Args:
        data_source_id: Data source UUID string
        force_regenerate: If True, delete existing embeddings first

    Returns:
        Dict with status, processed count, and error if any
    """
    try:
        # Run async function in event loop
        result = asyncio.run(_generate_embeddings_async(data_source_id, force_regenerate, self))
        return result

    except Exception as e:
        logger.error(f"Embedding generation failed for data source {data_source_id}: {str(e)}", exc_info=True)

        # Update data source status to error
        try:
            async def update_error_status():
                async with get_async_session() as db:
                    ds_repo = DataSourceRepository(db)
                    await ds_repo.update_status(uuid.UUID(data_source_id), "error", str(e))
                    await db.commit()

            asyncio.run(update_error_status())
        except Exception as update_error:
            logger.error(f"Failed to update error status: {str(update_error)}")

        return {
            "status": "failed",
            "data_source_id": data_source_id,
            "processed": 0,
            "error": str(e),
        }


@celery_app.task(bind=True, queue="ocr_queue", name="tasks.crawl_website")
def crawl_website_task(self, data_source_id: str):
    """
    Crawl a website data source.

    MVP Implementation (Phase 1):
    - Uses BeautifulSoup + requests (no JavaScript rendering)
    - Max depth: 2
    - Max pages: 100
    - Single domain only
    - 30-second timeout per page

    Process:
    1. Get data source and verify type='website'
    2. Extract config (url, max_depth, include_patterns, exclude_patterns)
    3. Crawl pages up to limits
    4. Extract text from HTML
    5. Store as text chunks in data source config
    6. Update crawl status and page count
    7. Broadcast progress

    Args:
        data_source_id: Data source UUID string

    Returns:
        Dict with status, pages crawled, and error if any
    """
    try:
        # Run async function in event loop
        result = asyncio.run(_crawl_website_async(data_source_id, self))
        return result

    except Exception as e:
        logger.error(f"Website crawl failed for data source {data_source_id}: {str(e)}", exc_info=True)

        # Update data source status to error
        try:
            async def update_error_status():
                async with get_async_session() as db:
                    ds_repo = DataSourceRepository(db)
                    await ds_repo.update_status(uuid.UUID(data_source_id), "error", str(e))
                    await db.commit()

            asyncio.run(update_error_status())
        except Exception as update_error:
            logger.error(f"Failed to update error status: {str(update_error)}")

        return {
            "status": "failed",
            "data_source_id": data_source_id,
            "pages_crawled": 0,
            "total_pages": 0,
            "error": str(e),
        }
