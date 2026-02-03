#!/usr/bin/env python3
"""
RAG Implementation Verification Script

Checks the status of Phase 11 (RAG) implementation:
1. Database schema (migrations, tables, indexes)
2. Backend services (embedding, retrieval, generation)
3. API endpoints
4. Dependencies
5. Configuration

Usage:
    python scripts/verify_rag_implementation.py
"""

import sys
import os
import asyncio
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

async def verify_database_schema():
    """Verify database schema and pgvector extension."""
    print("\n" + "="*70)
    print("1. DATABASE SCHEMA VERIFICATION")
    print("="*70)

    try:
        from sqlalchemy import text
        from app.db.database import AsyncSessionLocal, engine

        async with AsyncSessionLocal() as session:
            # Check pgvector extension
            result = await session.execute(
                text("SELECT * FROM pg_extension WHERE extname = 'vector'")
            )
            extension = result.fetchone()
            if extension:
                print("✅ pgvector extension installed")
            else:
                print("❌ pgvector extension NOT installed")
                print("   Run: CREATE EXTENSION IF NOT EXISTS vector;")

            # Check document_embeddings table
            result = await session.execute(
                text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = 'document_embeddings'
                    )
                """)
            )
            if result.scalar():
                print("✅ document_embeddings table exists")

                # Check vector index
                result = await session.execute(
                    text("""
                        SELECT indexname
                        FROM pg_indexes
                        WHERE tablename = 'document_embeddings'
                        AND indexname = 'ix_embeddings_vector'
                    """)
                )
                if result.fetchone():
                    print("✅ Vector similarity index (ix_embeddings_vector) exists")
                else:
                    print("⚠️  Vector similarity index missing")
            else:
                print("❌ document_embeddings table NOT found")
                print("   Run: alembic upgrade head")

            # Check rag_queries table
            result = await session.execute(
                text("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables
                        WHERE table_name = 'rag_queries'
                    )
                """)
            )
            if result.scalar():
                print("✅ rag_queries table exists")
            else:
                print("❌ rag_queries table NOT found")

        return True

    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


def verify_dependencies():
    """Verify required dependencies are installed."""
    print("\n" + "="*70)
    print("2. DEPENDENCIES VERIFICATION")
    print("="*70)

    dependencies = {
        "langchain": "RAG orchestration",
        "langchain_openai": "OpenAI integration",
        "tiktoken": "Token counting",
        "pgvector": "Vector database support",
        "openai": "OpenAI API client",
        "bleach": "Input sanitization",
    }

    all_installed = True
    for package, description in dependencies.items():
        try:
            __import__(package)
            print(f"✅ {package:20s} - {description}")
        except ImportError:
            print(f"❌ {package:20s} - NOT INSTALLED")
            all_installed = False

    return all_installed


def verify_configuration():
    """Verify required configuration."""
    print("\n" + "="*70)
    print("3. CONFIGURATION VERIFICATION")
    print("="*70)

    try:
        from app.core.config import get_settings
        settings = get_settings()

        checks = {
            "OPENAI_API_KEY": settings.OPENAI_API_KEY is not None,
            "DATABASE_URL": settings.DATABASE_URL is not None,
            "REDIS_URL": settings.REDIS_URL is not None,
        }

        all_configured = True
        for key, is_set in checks.items():
            if is_set:
                print(f"✅ {key:20s} configured")
            else:
                print(f"❌ {key:20s} NOT configured")
                all_configured = False

        return all_configured

    except Exception as e:
        print(f"❌ Configuration error: {e}")
        return False


def verify_services():
    """Verify service implementations exist."""
    print("\n" + "="*70)
    print("4. SERVICE IMPLEMENTATION VERIFICATION")
    print("="*70)

    services = [
        ("app.services.rag.embedding_service", "EmbeddingService"),
        ("app.services.rag.retrieval_service", "RetrievalService"),
        ("app.services.rag.generation_service", "GenerationService"),
        ("app.services.rag.security", "RAGSecurityValidator"),
    ]

    all_exist = True
    for module_path, class_name in services:
        try:
            module = __import__(module_path, fromlist=[class_name])
            service_class = getattr(module, class_name)
            print(f"✅ {class_name:30s} - {module_path}")
        except (ImportError, AttributeError) as e:
            print(f"❌ {class_name:30s} - NOT FOUND: {e}")
            all_exist = False

    return all_exist


def verify_repositories():
    """Verify repository implementations exist."""
    print("\n" + "="*70)
    print("5. REPOSITORY IMPLEMENTATION VERIFICATION")
    print("="*70)

    repositories = [
        ("app.db.repositories.rag", "DocumentEmbeddingRepository"),
        ("app.db.repositories.rag", "RAGQueryRepository"),
    ]

    all_exist = True
    for module_path, class_name in repositories:
        try:
            module = __import__(module_path, fromlist=[class_name])
            repo_class = getattr(module, class_name)
            print(f"✅ {class_name:35s} - {module_path}")
        except (ImportError, AttributeError) as e:
            print(f"❌ {class_name:35s} - NOT FOUND: {e}")
            all_exist = False

    return all_exist


def verify_api_endpoints():
    """Verify API endpoints exist."""
    print("\n" + "="*70)
    print("6. API ENDPOINTS VERIFICATION")
    print("="*70)

    try:
        from app.api.v1.endpoints import rag

        endpoints = []
        for route in rag.router.routes:
            if hasattr(route, 'path') and hasattr(route, 'methods'):
                methods = ', '.join(route.methods)
                endpoints.append(f"{methods:10s} {route.path}")

        if endpoints:
            print(f"✅ Found {len(endpoints)} RAG endpoints:")
            for endpoint in endpoints:
                print(f"   - {endpoint}")
        else:
            print("⚠️  No endpoints found")

        return len(endpoints) > 0

    except Exception as e:
        print(f"❌ Error loading endpoints: {e}")
        return False


def verify_models():
    """Verify database models exist."""
    print("\n" + "="*70)
    print("7. DATABASE MODELS VERIFICATION")
    print("="*70)

    models = [
        ("app.db.models.rag", "DocumentEmbedding"),
        ("app.db.models.rag", "RAGQuery"),
    ]

    all_exist = True
    for module_path, class_name in models:
        try:
            module = __import__(module_path, fromlist=[class_name])
            model_class = getattr(module, class_name)
            print(f"✅ {class_name:25s} - {module_path}")

            # Check table name
            if hasattr(model_class, '__tablename__'):
                print(f"   Table: {model_class.__tablename__}")
        except (ImportError, AttributeError) as e:
            print(f"❌ {class_name:25s} - NOT FOUND: {e}")
            all_exist = False

    return all_exist


def print_summary(results):
    """Print verification summary."""
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)

    checks = [
        ("Database Schema", results.get("database", False)),
        ("Dependencies", results.get("dependencies", False)),
        ("Configuration", results.get("configuration", False)),
        ("Services", results.get("services", False)),
        ("Repositories", results.get("repositories", False)),
        ("API Endpoints", results.get("endpoints", False)),
        ("Database Models", results.get("models", False)),
    ]

    all_passed = all(result for _, result in checks)

    for check_name, passed in checks:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status:10s} - {check_name}")

    print("="*70)

    if all_passed:
        print("🎉 ALL CHECKS PASSED!")
        print("\nNext steps:")
        print("1. Run migrations: alembic upgrade head")
        print("2. Start backend: uvicorn app.main:app --reload")
        print("3. Test RAG endpoint: POST /api/v1/rag/query")
    else:
        print("⚠️  SOME CHECKS FAILED")
        print("\nPlease review the errors above and fix before deploying.")

    print("="*70)

    return all_passed


async def main():
    """Run all verification checks."""
    print("""
========================================================================

            RAG Implementation Verification Script
                     Phase 11 - Doctify

========================================================================
    """)

    results = {}

    # Run async checks
    results["database"] = await verify_database_schema()

    # Run sync checks
    results["dependencies"] = verify_dependencies()
    results["configuration"] = verify_configuration()
    results["services"] = verify_services()
    results["repositories"] = verify_repositories()
    results["endpoints"] = verify_api_endpoints()
    results["models"] = verify_models()

    # Print summary
    all_passed = print_summary(results)

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    asyncio.run(main())
