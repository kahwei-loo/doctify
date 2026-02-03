"""
Document Repository

Handles database operations for document entities using SQLAlchemy.
"""

import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime

from sqlalchemy import select, and_, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.base import BaseRepository
from app.db.models.document import Document
from app.core.exceptions import NotFoundError, DatabaseError


class DocumentRepository(BaseRepository[Document]):
    """Repository for document operations."""

    def __init__(self, session: AsyncSession):
        super().__init__(session, Document)

    async def get_by_user(
        self,
        user_id: str,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        is_archived: bool = False,
    ) -> List[Document]:
        """
        Get documents by user ID with optional filters.

        Args:
            user_id: User ID
            skip: Number of documents to skip
            limit: Maximum number of documents to return
            status: Optional status filter
            is_archived: Include archived documents

        Returns:
            List of documents

        Raises:
            DatabaseError: If database operation fails
        """
        filters = {"user_id": uuid.UUID(user_id) if isinstance(user_id, str) else user_id}

        if status:
            filters["status"] = status

        if not is_archived:
            filters["is_archived"] = False

        return await self.list(
            filters=filters,
            skip=skip,
            limit=limit,
            sort_by="created_at",
            sort_order="desc",
        )

    async def get_by_project(
        self,
        project_id: str,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
    ) -> List[Document]:
        """
        Get documents by project ID with optional status filter.

        Args:
            project_id: Project ID
            skip: Number of documents to skip
            limit: Maximum number of documents to return
            status: Optional status filter

        Returns:
            List of documents

        Raises:
            DatabaseError: If database operation fails
        """
        filters: Dict[str, Any] = {
            "project_id": uuid.UUID(project_id) if isinstance(project_id, str) else project_id,
            "is_archived": False,
        }

        if status:
            filters["status"] = status

        return await self.list(
            filters=filters,
            skip=skip,
            limit=limit,
            sort_by="created_at",
            sort_order="desc",
        )

    async def get_by_status(
        self,
        status: str,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Document]:
        """
        Get documents by status.

        Args:
            status: Document status
            skip: Number of documents to skip
            limit: Maximum number of documents to return

        Returns:
            List of documents

        Raises:
            DatabaseError: If database operation fails
        """
        return await self.list(
            filters={"status": status, "is_archived": False},
            skip=skip,
            limit=limit,
            sort_by="created_at",
            sort_order="desc",
        )

    async def get_by_file_hash(
        self,
        file_hash: str,
        user_id: Optional[str] = None,
    ) -> Optional[Document]:
        """
        Get document by file hash for duplicate detection.

        Args:
            file_hash: File hash
            user_id: Optional user ID to scope the search

        Returns:
            Document if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            stmt = select(Document).where(Document.file_hash == file_hash)

            if user_id:
                user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
                stmt = stmt.where(Document.user_id == user_uuid)

            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()

        except Exception as e:
            raise DatabaseError(f"Failed to get document by file hash: {str(e)}")

    async def update_status(
        self,
        document_id: str,
        status: str,
        error_message: Optional[str] = None,
    ) -> Optional[Document]:
        """
        Update document status.

        Args:
            document_id: Document ID
            status: New status
            error_message: Optional error message for failed status

        Returns:
            Updated document if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        update_data: Dict[str, Any] = {"status": status}

        if error_message:
            update_data["processing_error"] = error_message

        if status == "processing":
            update_data["processing_started_at"] = datetime.utcnow()
        elif status in ("completed", "processed"):
            update_data["processing_completed_at"] = datetime.utcnow()

        return await self.update(document_id, update_data)

    async def update_extraction_result(
        self,
        document_id: str,
        extracted_text: Optional[str] = None,
        extracted_data: Optional[Dict[str, Any]] = None,
        extraction_metadata: Optional[Dict[str, Any]] = None,
        tokens_used: Optional[int] = None,
    ) -> Optional[Document]:
        """
        Update document extraction results.

        Args:
            document_id: Document ID
            extracted_text: Extracted text content
            extracted_data: Structured extracted data
            extraction_metadata: Metadata about the extraction process
            tokens_used: Number of tokens used in processing

        Returns:
            Updated document if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        update_data: Dict[str, Any] = {
            "status": "processed",
            "processing_completed_at": datetime.utcnow(),
        }

        if extracted_text is not None:
            update_data["extracted_text"] = extracted_text
        if extracted_data is not None:
            update_data["extracted_data"] = extracted_data
        if extraction_metadata is not None:
            update_data["extraction_metadata"] = extraction_metadata
        if tokens_used is not None:
            update_data["tokens_used"] = tokens_used

        return await self.update(document_id, update_data)

    async def get_project_stats(self, project_id: str) -> Dict[str, int]:
        """
        Get document statistics for a project.

        Args:
            project_id: Project ID

        Returns:
            Dictionary with status counts

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            project_uuid = uuid.UUID(project_id) if isinstance(project_id, str) else project_id

            # Query for status counts
            stmt = (
                select(Document.status, func.count(Document.id).label("count"))
                .where(
                    and_(
                        Document.project_id == project_uuid,
                        Document.is_archived == False,
                    )
                )
                .group_by(Document.status)
            )

            result = await self.session.execute(stmt)
            rows = result.all()

            stats = {
                "total": 0,
                "pending": 0,
                "processing": 0,
                "processed": 0,
                "completed": 0,
                "failed": 0,
            }

            for row in rows:
                status, count = row
                if status in stats:
                    stats[status] = count
                stats["total"] += count

            return stats

        except Exception as e:
            raise DatabaseError(f"Failed to get project stats: {str(e)}")

    async def get_user_stats(self, user_id: str) -> Dict[str, int]:
        """
        Get document statistics for a user.

        Args:
            user_id: User ID

        Returns:
            Dictionary with status counts

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id

            stmt = (
                select(Document.status, func.count(Document.id).label("count"))
                .where(
                    and_(
                        Document.user_id == user_uuid,
                        Document.is_archived == False,
                    )
                )
                .group_by(Document.status)
            )

            result = await self.session.execute(stmt)
            rows = result.all()

            stats = {
                "total": 0,
                "pending": 0,
                "processing": 0,
                "processed": 0,
                "completed": 0,
                "failed": 0,
            }

            for row in rows:
                status, count = row
                if status in stats:
                    stats[status] = count
                stats["total"] += count

            return stats

        except Exception as e:
            raise DatabaseError(f"Failed to get user stats: {str(e)}")

    async def get_recent_documents(
        self,
        user_id: Optional[str] = None,
        limit: int = 10,
    ) -> List[Document]:
        """
        Get recently created documents.

        Args:
            user_id: Optional user ID filter
            limit: Maximum number of documents to return

        Returns:
            List of recent documents

        Raises:
            DatabaseError: If database operation fails
        """
        filters: Dict[str, Any] = {"is_archived": False}

        if user_id:
            filters["user_id"] = uuid.UUID(user_id) if isinstance(user_id, str) else user_id

        return await self.list(
            filters=filters,
            skip=0,
            limit=limit,
            sort_by="created_at",
            sort_order="desc",
        )

    async def delete_by_project(self, project_id: str) -> int:
        """
        Delete all documents for a project.

        Args:
            project_id: Project ID

        Returns:
            Number of documents deleted

        Raises:
            DatabaseError: If database operation fails
        """
        project_uuid = uuid.UUID(project_id) if isinstance(project_id, str) else project_id
        return await self.delete_many({"project_id": project_uuid})

    async def count_by_project(self, project_id: str) -> int:
        """
        Count documents in a project.

        Args:
            project_id: Project ID

        Returns:
            Number of documents

        Raises:
            DatabaseError: If database operation fails
        """
        project_uuid = uuid.UUID(project_id) if isinstance(project_id, str) else project_id
        return await self.count({"project_id": project_uuid, "is_archived": False})

    async def count_by_user(self, user_id: str, is_archived: bool = False) -> int:
        """
        Count documents for a user.

        Args:
            user_id: User ID
            is_archived: Include archived documents

        Returns:
            Number of documents

        Raises:
            DatabaseError: If database operation fails
        """
        user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
        filters: Dict[str, Any] = {"user_id": user_uuid}

        if not is_archived:
            filters["is_archived"] = False

        return await self.count(filters)

    async def search_documents(
        self,
        query: str,
        user_id: Optional[str] = None,
        project_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Document]:
        """
        Search documents by filename or title.

        Args:
            query: Search query
            user_id: Optional user ID filter
            project_id: Optional project ID filter
            skip: Number of documents to skip
            limit: Maximum number of documents to return

        Returns:
            List of matching documents

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            # Build search conditions with ILIKE for case-insensitive search
            search_pattern = f"%{query}%"
            search_conditions = or_(
                Document.original_filename.ilike(search_pattern),
                Document.title.ilike(search_pattern),
                Document.description.ilike(search_pattern),
            )

            stmt = select(Document).where(
                and_(
                    search_conditions,
                    Document.is_archived == False,
                )
            )

            if user_id:
                user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id
                stmt = stmt.where(Document.user_id == user_uuid)

            if project_id:
                project_uuid = uuid.UUID(project_id) if isinstance(project_id, str) else project_id
                stmt = stmt.where(Document.project_id == project_uuid)

            stmt = stmt.order_by(Document.created_at.desc()).offset(skip).limit(limit)

            result = await self.session.execute(stmt)
            return list(result.scalars().all())

        except Exception as e:
            raise DatabaseError(f"Failed to search documents: {str(e)}")

    async def archive_document(self, document_id: str) -> Optional[Document]:
        """
        Archive a document (soft delete).

        Args:
            document_id: Document ID

        Returns:
            Updated document if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        return await self.update(
            document_id,
            {
                "is_archived": True,
                "archived_at": datetime.utcnow(),
            },
        )

    async def restore_document(self, document_id: str) -> Optional[Document]:
        """
        Restore an archived document.

        Args:
            document_id: Document ID

        Returns:
            Updated document if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        return await self.update(
            document_id,
            {
                "is_archived": False,
                "archived_at": None,
            },
        )

    async def update_category(
        self,
        document_id: str,
        category: str,
        tags: Optional[List[str]] = None,
    ) -> Optional[Document]:
        """
        Update document category and tags.

        Args:
            document_id: Document ID
            category: New category
            tags: Optional list of tags

        Returns:
            Updated document if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        update_data: Dict[str, Any] = {"category": category}

        if tags is not None:
            update_data["tags"] = tags

        return await self.update(document_id, update_data)

    async def get_by_category(
        self,
        category: str,
        user_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Document]:
        """
        Get documents by category.

        Args:
            category: Document category
            user_id: Optional user ID filter
            skip: Number of documents to skip
            limit: Maximum number of documents to return

        Returns:
            List of documents

        Raises:
            DatabaseError: If database operation fails
        """
        filters: Dict[str, Any] = {"category": category, "is_archived": False}

        if user_id:
            filters["user_id"] = uuid.UUID(user_id) if isinstance(user_id, str) else user_id

        return await self.list(
            filters=filters,
            skip=skip,
            limit=limit,
            sort_by="created_at",
            sort_order="desc",
        )

    async def increment_tokens_used(
        self,
        document_id: str,
        tokens: int,
    ) -> Optional[Document]:
        """
        Increment tokens used count for a document.

        Args:
            document_id: Document ID
            tokens: Number of tokens to add

        Returns:
            Updated document if found, None otherwise

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            document = await self.get_by_id(document_id)
            if not document:
                return None

            new_tokens = document.tokens_used + tokens
            return await self.update(document_id, {"tokens_used": new_tokens})

        except Exception as e:
            raise DatabaseError(f"Failed to increment tokens used: {str(e)}")

    async def get_aggregate_stats_by_user(self, user_id: str) -> Dict[str, Any]:
        """
        Get aggregate statistics across all user's documents.

        Args:
            user_id: User ID

        Returns:
            Dictionary with aggregate statistics including:
            - total_documents: Total number of documents
            - status_breakdown: Counts by status
            - total_tokens: Total tokens used
            - token_by_project: Tokens grouped by project

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            from app.db.models.project import Project

            user_uuid = uuid.UUID(user_id) if isinstance(user_id, str) else user_id

            # Get status breakdown and total count
            status_stmt = (
                select(Document.status, func.count(Document.id).label("count"))
                .where(
                    and_(
                        Document.user_id == user_uuid,
                        Document.is_archived == False,
                    )
                )
                .group_by(Document.status)
            )

            status_result = await self.session.execute(status_stmt)
            status_rows = status_result.all()

            status_breakdown = {
                "completed": 0,
                "processing": 0,
                "pending": 0,
                "failed": 0,
            }
            total_documents = 0

            for row in status_rows:
                status, count = row
                # Normalize 'processed' to 'completed' for frontend consistency
                if status == "processed":
                    status_breakdown["completed"] = count
                elif status in status_breakdown:
                    status_breakdown[status] = count
                total_documents += count

            # Get total tokens
            tokens_stmt = (
                select(func.coalesce(func.sum(Document.tokens_used), 0))
                .where(
                    and_(
                        Document.user_id == user_uuid,
                        Document.is_archived == False,
                    )
                )
            )

            tokens_result = await self.session.execute(tokens_stmt)
            total_tokens = int(tokens_result.scalar() or 0)

            # Get tokens by project
            token_by_project_stmt = (
                select(
                    Document.project_id,
                    Project.name.label("project_name"),
                    func.coalesce(func.sum(Document.tokens_used), 0).label("tokens"),
                )
                .outerjoin(Project, Document.project_id == Project.id)
                .where(
                    and_(
                        Document.user_id == user_uuid,
                        Document.is_archived == False,
                    )
                )
                .group_by(Document.project_id, Project.name)
                .order_by(func.sum(Document.tokens_used).desc())
            )

            token_by_project_result = await self.session.execute(token_by_project_stmt)
            token_by_project_rows = token_by_project_result.all()

            token_by_project = []
            for row in token_by_project_rows:
                project_id, project_name, tokens = row
                if project_id is not None:
                    token_by_project.append({
                        "project_id": str(project_id),
                        "project_name": project_name or "Unknown",
                        "tokens": int(tokens),
                    })
                else:
                    # Documents without a project
                    token_by_project.append({
                        "project_id": None,
                        "project_name": "Unassigned",
                        "tokens": int(tokens),
                    })

            # Calculate success rate
            completed_count = status_breakdown["completed"]
            failed_count = status_breakdown["failed"]
            processed_total = completed_count + failed_count
            success_rate = (completed_count / processed_total * 100) if processed_total > 0 else 0.0

            return {
                "total_documents": total_documents,
                "status_breakdown": status_breakdown,
                "total_tokens": total_tokens,
                "token_by_project": token_by_project,
                "success_rate": round(success_rate, 1),
            }

        except Exception as e:
            raise DatabaseError(f"Failed to get aggregate stats: {str(e)}")

    async def get_failed_documents(
        self,
        project_id: Optional[str] = None,
        user_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Document]:
        """
        Get documents with failed status for retry processing.

        Args:
            project_id: Optional project ID to filter documents
            user_id: Optional user ID to filter documents
            skip: Number of documents to skip
            limit: Maximum number of documents to return

        Returns:
            List of failed documents

        Raises:
            DatabaseError: If database operation fails
        """
        try:
            filters: Dict[str, Any] = {"status": "failed", "is_archived": False}

            if project_id:
                filters["project_id"] = uuid.UUID(project_id) if isinstance(project_id, str) else project_id

            if user_id:
                filters["user_id"] = uuid.UUID(user_id) if isinstance(user_id, str) else user_id

            return await self.list(
                filters=filters,
                skip=skip,
                limit=limit,
                sort_by="created_at",
                sort_order="desc",
            )

        except Exception as e:
            raise DatabaseError(f"Failed to get failed documents: {str(e)}")
