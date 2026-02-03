#!/usr/bin/env python3
"""Create test data for RAG testing"""
import asyncio
import uuid
from datetime import datetime
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "backend"))

from app.db.database import init_db, get_db_session
from app.db.models.project import Project
from app.db.models.document import Document
from app.db.models.rag import DocumentEmbedding
from sqlalchemy import select
import openai
import os

# OpenRouter API configuration
os.environ["OPENAI_API_KEY"] = "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"
os.environ["OPENAI_BASE_URL"] = "https://openrouter.ai/api/v1"

async def create_test_data():
    """Create test project, document, and embeddings"""
    # Initialize database engine first
    await init_db()

    async with get_db_session() as session:
        try:
            # User ID from ragtest@example.com
            user_id = uuid.UUID("6dd46c4e-7ed0-4f62-b8c8-141e9498e168")
            
            # Create project
            project = Project(
                id=uuid.uuid4(),
                user_id=user_id,
                name="RAG Test Project",
                description="Project for RAG functionality testing",
                is_active=True
            )
            session.add(project)
            await session.flush()
            print(f"✓ Created project: {project.id}")
            
            # Create document
            document = Document(
                id=uuid.uuid4(),
                user_id=user_id,
                project_id=project.id,
                original_filename="doctify_info.txt",
                file_path=f"/uploads/{uuid.uuid4()}.txt",
                file_size=2500,
                file_type="text/plain",
                status="completed",
                ocr_status="completed"
            )
            session.add(document)
            await session.flush()
            print(f"✓ Created document: {document.id}")
            
            # Document content chunks
            chunks = [
                "DOCTIFY - AI-Powered Document Intelligence Platform. Doctify is an enterprise-grade AI-powered SaaS platform designed for intelligent document processing, OCR (Optical Character Recognition), and advanced document management.",
                "Core Features: 1. Intelligent OCR Processing with multi-language support and high accuracy. 2. RAG (Retrieval Augmented Generation) with semantic search and AI-powered question answering. 3. Multi-AI Provider Architecture with OpenAI, Anthropic, and Google AI support.",
                "Technical Architecture: Backend uses FastAPI with Python 3.11+, PostgreSQL 15 with pgvector extension, Redis 7 for caching, and Celery for async processing. Frontend uses React 18 with TypeScript and TailwindCSS.",
                "Security Features: JWT-based authentication, password validation, rate limiting, CORS protection, security headers middleware, and audit logging for compliance.",
                "Use Cases: Legal document analysis, medical records processing, financial compliance, research organization, and contract management. Project Status: Phase 11 (RAG Implementation) completed."
            ]
            
            # Generate embeddings for each chunk
            client = openai.OpenAI(
                api_key=os.environ["OPENAI_API_KEY"],
                base_url=os.environ["OPENAI_BASE_URL"]
            )
            
            for idx, chunk_text in enumerate(chunks):
                print(f"Generating embedding {idx+1}/{len(chunks)}...")
                
                # Generate embedding
                response = client.embeddings.create(
                    model="text-embedding-3-small",
                    input=chunk_text
                )
                embedding_vector = response.data[0].embedding
                
                # Create embedding record
                embedding = DocumentEmbedding(
                    id=uuid.uuid4(),
                    document_id=document.id,
                    chunk_text=chunk_text,
                    chunk_index=idx,
                    embedding=embedding_vector,
                    metadata={"source": "manual_test_data"}
                )
                session.add(embedding)
                print(f"✓ Created embedding {idx+1} ({len(embedding_vector)} dimensions)")
            
            await session.commit()
            print(f"\n✅ Test data created successfully!")
            print(f"   Project ID: {project.id}")
            print(f"   Document ID: {document.id}")
            print(f"   Embeddings: {len(chunks)} chunks")
            
            return project.id, document.id
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Error: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(create_test_data())
