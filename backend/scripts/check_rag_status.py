#!/usr/bin/env python3
"""
Simple RAG Status Check Script - Windows Compatible

Checks implementation status without database connection.
"""

import sys
import os
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

def check_dependencies():
    """Check required dependencies."""
    print("\n" + "="*70)
    print("1. DEPENDENCIES CHECK")
    print("="*70)

    dependencies = {
        "litellm": "Unified AI gateway",
        "tiktoken": "Token counting",
        "pgvector": "Vector database support",
        "openai": "OpenAI API client",
        "bleach": "Input sanitization",
    }

    missing = []
    for package, description in dependencies.items():
        try:
            __import__(package)
            print(f"[OK] {package:20s} - {description}")
        except ImportError:
            print(f"[MISSING] {package:20s} - {description}")
            missing.append(package)

    return len(missing) == 0


def check_configuration():
    """Check required configuration."""
    print("\n" + "="*70)
    print("2. CONFIGURATION CHECK")
    print("="*70)

    try:
        from app.core.config import get_settings
        settings = get_settings()

        checks = {
            "OPENAI_API_KEY": settings.OPENAI_API_KEY is not None,
            "DATABASE_URL": settings.DATABASE_URL is not None,
            "REDIS_URL": settings.REDIS_URL is not None,
        }

        missing = []
        for key, is_set in checks.items():
            if is_set:
                print(f"[OK] {key:20s} configured")
            else:
                print(f"[MISSING] {key:20s} NOT configured")
                missing.append(key)

        return len(missing) == 0

    except Exception as e:
        print(f"[ERROR] Configuration error: {e}")
        return False


def check_models():
    """Check database models."""
    print("\n" + "="*70)
    print("3. DATABASE MODELS CHECK")
    print("="*70)

    models = [
        ("app.db.models.rag", "DocumentEmbedding"),
        ("app.db.models.rag", "RAGQuery"),
    ]

    missing = []
    for module_path, class_name in models:
        try:
            module = __import__(module_path, fromlist=[class_name])
            model_class = getattr(module, class_name)
            table_name = getattr(model_class, '__tablename__', 'unknown')
            print(f"[OK] {class_name:25s} (table: {table_name})")
        except (ImportError, AttributeError) as e:
            print(f"[MISSING] {class_name:25s} - {e}")
            missing.append(class_name)

    return len(missing) == 0


def check_repositories():
    """Check repository implementations."""
    print("\n" + "="*70)
    print("4. REPOSITORIES CHECK")
    print("="*70)

    repositories = [
        ("app.db.repositories.rag", "DocumentEmbeddingRepository"),
        ("app.db.repositories.rag", "RAGQueryRepository"),
    ]

    missing = []
    for module_path, class_name in repositories:
        try:
            module = __import__(module_path, fromlist=[class_name])
            repo_class = getattr(module, class_name)
            print(f"[OK] {class_name:35s}")
        except (ImportError, AttributeError) as e:
            print(f"[MISSING] {class_name:35s} - {e}")
            missing.append(class_name)

    return len(missing) == 0


def check_services():
    """Check service implementations."""
    print("\n" + "="*70)
    print("5. SERVICES CHECK")
    print("="*70)

    services = [
        ("app.services.rag.embedding_service", "EmbeddingService"),
        ("app.services.rag.retrieval_service", "RetrievalService"),
        ("app.services.rag.generation_service", "GenerationService"),
        ("app.services.rag.security", "RAGSecurityValidator"),
    ]

    missing = []
    for module_path, class_name in services:
        try:
            module = __import__(module_path, fromlist=[class_name])
            service_class = getattr(module, class_name)
            print(f"[OK] {class_name:30s}")
        except (ImportError, AttributeError) as e:
            print(f"[MISSING] {class_name:30s} - {e}")
            missing.append(class_name)

    return len(missing) == 0


def check_api_endpoints():
    """Check API endpoints."""
    print("\n" + "="*70)
    print("6. API ENDPOINTS CHECK")
    print("="*70)

    try:
        from app.api.v1.endpoints import rag

        endpoints = []
        for route in rag.router.routes:
            if hasattr(route, 'path') and hasattr(route, 'methods'):
                methods = ', '.join(sorted(route.methods))
                endpoints.append((methods, route.path))

        if endpoints:
            print(f"[OK] Found {len(endpoints)} RAG endpoints:")
            for methods, path in sorted(endpoints, key=lambda x: x[1]):
                print(f"     {methods:15s} {path}")
        else:
            print("[WARNING] No endpoints found")

        return len(endpoints) > 0

    except Exception as e:
        print(f"[ERROR] Failed to load endpoints: {e}")
        return False


def check_migrations():
    """Check migration files exist."""
    print("\n" + "="*70)
    print("7. MIGRATIONS CHECK")
    print("="*70)

    migration_dir = Path(__file__).parent.parent / "alembic" / "versions"

    if not migration_dir.exists():
        print(f"[ERROR] Migration directory not found: {migration_dir}")
        return False

    rag_migrations = list(migration_dir.glob("*rag*.py"))

    if rag_migrations:
        print(f"[OK] Found {len(rag_migrations)} RAG migration(s):")
        for migration in rag_migrations:
            print(f"     {migration.name}")
        return True
    else:
        print("[WARNING] No RAG migrations found")
        return False


def print_summary(results):
    """Print summary."""
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)

    checks = [
        ("Dependencies", results.get("dependencies", False)),
        ("Configuration", results.get("configuration", False)),
        ("Database Models", results.get("models", False)),
        ("Repositories", results.get("repositories", False)),
        ("Services", results.get("services", False)),
        ("API Endpoints", results.get("endpoints", False)),
        ("Migrations", results.get("migrations", False)),
    ]

    all_passed = all(result for _, result in checks)

    for check_name, passed in checks:
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status:10s} {check_name}")

    print("="*70)

    if all_passed:
        print("\nSTATUS: Implementation appears COMPLETE!")
        print("\nNext steps:")
        print("1. Ensure PostgreSQL is running")
        print("2. Run: alembic upgrade head")
        print("3. Start backend: uvicorn app.main:app --reload --port 8008")
        print("4. Test endpoint: POST http://localhost:8008/api/v1/rag/query")
    else:
        print("\nSTATUS: Some components missing or configuration needed")
        print("\nPlease review the failures above.")

    print("="*70)

    return all_passed


def main():
    """Run all checks."""
    print("""
========================================================================
           RAG Implementation Status Check - Phase 11
========================================================================
    """)

    results = {}
    results["dependencies"] = check_dependencies()
    results["configuration"] = check_configuration()
    results["models"] = check_models()
    results["repositories"] = check_repositories()
    results["services"] = check_services()
    results["endpoints"] = check_api_endpoints()
    results["migrations"] = check_migrations()

    all_passed = print_summary(results)

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
