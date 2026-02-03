#!/usr/bin/env python3
"""
Test Data Setup Script

Creates test users and sample data for performance testing.
Run this script before executing performance tests.

Usage:
    python scripts/setup-test-data.py

Environment Variables:
    DATABASE_URL: MongoDB connection URL (default: mongodb://localhost:27017)
    DATABASE_NAME: Database name (default: doctify)
"""

import asyncio
import os
import sys
from datetime import datetime
from typing import List

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext


# Configuration
DATABASE_URL = os.getenv('MONGODB_URL', 'mongodb://localhost:27017')
DATABASE_NAME = os.getenv('MONGODB_DB_NAME', 'doctify')

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ============================================================================
# Test Data Definitions
# ============================================================================

TEST_USERS = [
    {
        "email": f"test_user_{i}@example.com",
        "password": "TestPassword123!",
        "full_name": f"Test User {i}",
        "is_active": True,
        "is_verified": True,
        "role": "user",
    }
    for i in range(1, 11)
]

SAMPLE_DOCUMENTS = [
    {
        "title": "Invoice 2024-001",
        "category": "invoice",
        "description": "Q1 Invoice for services",
        "status": "processed",
        "file_type": "application/pdf",
        "file_size": 245678,
        "page_count": 3,
    },
    {
        "title": "Contract Agreement 2024",
        "category": "contract",
        "description": "Annual service contract",
        "status": "processed",
        "file_type": "application/pdf",
        "file_size": 876543,
        "page_count": 12,
    },
    {
        "title": "Receipt 2024-Q1-001",
        "category": "receipt",
        "description": "Equipment purchase receipt",
        "status": "processed",
        "file_type": "application/pdf",
        "file_size": 123456,
        "page_count": 1,
    },
    {
        "title": "Business Proposal",
        "category": "proposal",
        "description": "New project proposal document",
        "status": "pending",
        "file_type": "application/pdf",
        "file_size": 456789,
        "page_count": 8,
    },
    {
        "title": "Meeting Notes 2024-01",
        "category": "notes",
        "description": "January team meeting notes",
        "status": "processed",
        "file_type": "application/pdf",
        "file_size": 234567,
        "page_count": 4,
    },
]

SAMPLE_PROJECTS = [
    {
        "name": "Q1 Financial Documents",
        "description": "All Q1 2024 invoices and receipts",
        "status": "active",
    },
    {
        "name": "Legal Contracts",
        "description": "Contract repository for 2024",
        "status": "active",
    },
    {
        "name": "Client Projects",
        "description": "Client-related documents and proposals",
        "status": "active",
    },
]


# ============================================================================
# Database Operations
# ============================================================================

async def create_test_users(db) -> List[str]:
    """
    Create test users in the database.

    Returns:
        List of created user IDs
    """
    print("Creating test users...")

    user_ids = []
    users_collection = db.users

    for user_data in TEST_USERS:
        # Check if user already exists
        existing = await users_collection.find_one({"email": user_data["email"]})

        if existing:
            print(f"  ✓ User {user_data['email']} already exists")
            user_ids.append(str(existing["_id"]))
            continue

        # Hash password
        hashed_password = pwd_context.hash(user_data["password"])

        # Create user document
        user_doc = {
            "email": user_data["email"],
            "hashed_password": hashed_password,
            "full_name": user_data["full_name"],
            "is_active": user_data["is_active"],
            "is_verified": user_data["is_verified"],
            "role": user_data["role"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        # Insert user
        result = await users_collection.insert_one(user_doc)
        user_ids.append(str(result.inserted_id))

        print(f"  ✓ Created user: {user_data['email']}")

    print(f"\nCreated {len(user_ids)} test users")
    return user_ids


async def create_sample_documents(db, user_ids: List[str]) -> List[str]:
    """
    Create sample documents for each user.

    Args:
        user_ids: List of user IDs to assign documents to

    Returns:
        List of created document IDs
    """
    print("\nCreating sample documents...")

    document_ids = []
    documents_collection = db.documents

    for user_id in user_ids[:5]:  # Create documents for first 5 users
        for doc_template in SAMPLE_DOCUMENTS:
            # Create document
            doc = {
                **doc_template,
                "user_id": user_id,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "file_path": f"/uploads/{user_id}/{doc_template['title']}.pdf",
            }

            result = await documents_collection.insert_one(doc)
            document_ids.append(str(result.inserted_id))

        print(f"  ✓ Created {len(SAMPLE_DOCUMENTS)} documents for user {user_id}")

    print(f"\nCreated {len(document_ids)} sample documents")
    return document_ids


async def create_sample_projects(db, user_ids: List[str], document_ids: List[str]) -> List[str]:
    """
    Create sample projects for each user.

    Args:
        user_ids: List of user IDs to assign projects to
        document_ids: List of document IDs to add to projects

    Returns:
        List of created project IDs
    """
    print("\nCreating sample projects...")

    project_ids = []
    projects_collection = db.projects

    for user_id in user_ids[:3]:  # Create projects for first 3 users
        for project_template in SAMPLE_PROJECTS:
            # Create project
            project = {
                **project_template,
                "user_id": user_id,
                "document_ids": document_ids[:3],  # Add first 3 documents
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }

            result = await projects_collection.insert_one(project)
            project_ids.append(str(result.inserted_id))

        print(f"  ✓ Created {len(SAMPLE_PROJECTS)} projects for user {user_id}")

    print(f"\nCreated {len(project_ids)} sample projects")
    return project_ids


async def create_indexes(db):
    """Create necessary indexes for performance."""
    print("\nCreating database indexes...")

    # Users collection indexes
    await db.users.create_index([("email", 1)], unique=True)
    print("  ✓ Created index: users.email")

    # Documents collection indexes
    await db.documents.create_index([("user_id", 1), ("created_at", -1)])
    print("  ✓ Created index: documents.user_id + created_at")

    await db.documents.create_index([("category", 1), ("status", 1)])
    print("  ✓ Created index: documents.category + status")

    await db.documents.create_index([("title", "text"), ("description", "text")])
    print("  ✓ Created index: documents.text (title + description)")

    # Projects collection indexes
    await db.projects.create_index([("user_id", 1), ("created_at", -1)])
    print("  ✓ Created index: projects.user_id + created_at")

    await db.projects.create_index([("status", 1)])
    print("  ✓ Created index: projects.status")

    print("\nIndexes created successfully")


async def cleanup_test_data(db):
    """Remove all test data (optional)."""
    print("\nCleaning up existing test data...")

    # Delete test users
    result = await db.users.delete_many({"email": {"$regex": "^test_user_.*@example.com"}})
    print(f"  ✓ Deleted {result.deleted_count} test users")

    # Delete test documents (owned by test users)
    # Note: In production, you'd use proper user references
    # For now, we'll delete all sample documents
    result = await db.documents.delete_many({"title": {"$in": [d["title"] for d in SAMPLE_DOCUMENTS]}})
    print(f"  ✓ Deleted {result.deleted_count} test documents")

    # Delete test projects
    result = await db.projects.delete_many({"name": {"$in": [p["name"] for p in SAMPLE_PROJECTS]}})
    print(f"  ✓ Deleted {result.deleted_count} test projects")

    print("\nCleanup complete")


# ============================================================================
# Main Execution
# ============================================================================

async def main():
    """Main setup function."""
    print("=" * 60)
    print("Doctify Test Data Setup")
    print("=" * 60)

    # Connect to database
    print(f"\nConnecting to database: {DATABASE_URL}")
    client = AsyncIOMotorClient(DATABASE_URL)
    db = client[DATABASE_NAME]

    try:
        # Test connection
        await client.server_info()
        print("✓ Database connection successful\n")

        # Optional: Cleanup existing test data
        cleanup = input("Clean up existing test data? (y/N): ").lower() == 'y'
        if cleanup:
            await cleanup_test_data(db)

        # Create test data
        user_ids = await create_test_users(db)
        document_ids = await create_sample_documents(db, user_ids)
        project_ids = await create_sample_projects(db, user_ids, document_ids)

        # Create indexes
        await create_indexes(db)

        # Summary
        print("\n" + "=" * 60)
        print("Setup Complete!")
        print("=" * 60)
        print(f"Test Users Created: {len(user_ids)}")
        print(f"Sample Documents Created: {len(document_ids)}")
        print(f"Sample Projects Created: {len(project_ids)}")
        print("\nTest Credentials:")
        print("  Email: test_user_1@example.com")
        print("  Password: TestPassword123!")
        print("\nYou can now run performance tests!")
        print("=" * 60)

    except Exception as e:
        print(f"\n✗ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    finally:
        client.close()


if __name__ == "__main__":
    # Check for required dependencies
    try:
        import motor
        import passlib
    except ImportError as e:
        print(f"Error: Missing required dependency - {e}")
        print("\nInstall dependencies:")
        print("  pip install motor passlib[bcrypt]")
        sys.exit(1)

    # Run setup
    asyncio.run(main())
