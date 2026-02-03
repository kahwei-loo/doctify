"""
Integration Tests for Project API Endpoints

Tests project management API endpoints.
"""

import pytest
from httpx import AsyncClient
from uuid import uuid4


@pytest.mark.integration
@pytest.mark.asyncio
class TestProjectCreationEndpoints:
    """Test project creation endpoints."""

    async def test_create_project_success(self, async_client: AsyncClient, auth_headers: dict):
        """Test successful project creation."""
        # Arrange
        project_data = {
            "name": "Test Project",
            "description": "A test project for integration testing",
        }

        # Act
        response = await async_client.post(
            "/api/v1/projects",
            json=project_data,
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 201
        result = response.json()
        assert result["success"] is True
        assert result["data"]["name"] == project_data["name"]
        assert result["data"]["description"] == project_data["description"]
        assert "id" in result["data"]

    async def test_create_project_without_auth(self, async_client: AsyncClient):
        """Test project creation without authentication."""
        # Arrange
        project_data = {"name": "Test Project"}

        # Act
        response = await async_client.post("/api/v1/projects", json=project_data)

        # Assert
        assert response.status_code == 401

    async def test_create_project_missing_name(self, async_client: AsyncClient, auth_headers: dict):
        """Test project creation without required name field."""
        # Arrange
        project_data = {"description": "Project without name"}

        # Act
        response = await async_client.post(
            "/api/v1/projects",
            json=project_data,
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 422
        result = response.json()
        assert result["success"] is False

    async def test_create_project_duplicate_name(self, async_client: AsyncClient, auth_headers: dict):
        """Test creating projects with duplicate names for same user."""
        # Arrange
        project_data = {"name": "Duplicate Project"}

        # Act - Create first project
        response1 = await async_client.post(
            "/api/v1/projects",
            json=project_data,
            headers=auth_headers,
        )

        # Act - Create second project with same name
        response2 = await async_client.post(
            "/api/v1/projects",
            json=project_data,
            headers=auth_headers,
        )

        # Assert
        assert response1.status_code == 201
        # Depending on business rules, duplicate names might be allowed or not
        # This assertion would need adjustment based on actual requirements
        assert response2.status_code in [201, 400]


@pytest.mark.integration
@pytest.mark.asyncio
class TestProjectListEndpoints:
    """Test project listing endpoints."""

    async def test_list_projects_empty(self, async_client: AsyncClient, auth_headers: dict):
        """Test listing projects when none exist."""
        # Act
        response = await async_client.get("/api/v1/projects", headers=auth_headers)

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert result["data"]["items"] == []
        assert result["data"]["total"] == 0

    async def test_list_projects_with_pagination(self, async_client: AsyncClient, auth_headers: dict):
        """Test listing projects with pagination."""
        # Arrange - Create multiple projects
        for i in range(15):
            await async_client.post(
                "/api/v1/projects",
                json={"name": f"Project {i}"},
                headers=auth_headers,
            )

        # Act - Get first page
        response = await async_client.get(
            "/api/v1/projects",
            params={"skip": 0, "limit": 10},
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert len(result["data"]["items"]) == 10
        assert result["data"]["total"] == 15

        # Act - Get second page
        response2 = await async_client.get(
            "/api/v1/projects",
            params={"skip": 10, "limit": 10},
            headers=auth_headers,
        )

        # Assert
        assert response2.status_code == 200
        result2 = response2.json()
        assert len(result2["data"]["items"]) == 5

    async def test_list_projects_unauthorized(self, async_client: AsyncClient):
        """Test listing projects without authentication."""
        # Act
        response = await async_client.get("/api/v1/projects")

        # Assert
        assert response.status_code == 401

    async def test_list_projects_user_isolation(self, async_client: AsyncClient):
        """Test that users only see their own projects."""
        # Arrange - Create two users
        user1_data = {"email": "user1@example.com", "password": "Password123!"}
        user2_data = {"email": "user2@example.com", "password": "Password123!"}

        # Register and login user1
        await async_client.post("/api/v1/auth/register", json=user1_data)
        login1_response = await async_client.post(
            "/api/v1/auth/login",
            data={"username": user1_data["email"], "password": user1_data["password"]},
        )
        user1_token = login1_response.json()["data"]["access_token"]
        user1_headers = {"Authorization": f"Bearer {user1_token}"}

        # Register and login user2
        await async_client.post("/api/v1/auth/register", json=user2_data)
        login2_response = await async_client.post(
            "/api/v1/auth/login",
            data={"username": user2_data["email"], "password": user2_data["password"]},
        )
        user2_token = login2_response.json()["data"]["access_token"]
        user2_headers = {"Authorization": f"Bearer {user2_token}"}

        # Create projects for each user
        await async_client.post(
            "/api/v1/projects",
            json={"name": "User 1 Project"},
            headers=user1_headers,
        )
        await async_client.post(
            "/api/v1/projects",
            json={"name": "User 2 Project"},
            headers=user2_headers,
        )

        # Act - Get projects for user1
        user1_projects = await async_client.get("/api/v1/projects", headers=user1_headers)

        # Act - Get projects for user2
        user2_projects = await async_client.get("/api/v1/projects", headers=user2_headers)

        # Assert - Each user sees only their project
        user1_result = user1_projects.json()
        user2_result = user2_projects.json()
        assert user1_result["data"]["total"] == 1
        assert user2_result["data"]["total"] == 1
        assert user1_result["data"]["items"][0]["name"] == "User 1 Project"
        assert user2_result["data"]["items"][0]["name"] == "User 2 Project"


@pytest.mark.integration
@pytest.mark.asyncio
class TestProjectDetailEndpoints:
    """Test project detail retrieval endpoints."""

    async def test_get_project_by_id_success(self, async_client: AsyncClient, auth_headers: dict):
        """Test retrieving project by ID."""
        # Arrange - Create a project
        create_response = await async_client.post(
            "/api/v1/projects",
            json={"name": "Detail Test Project"},
            headers=auth_headers,
        )
        project_id = create_response.json()["data"]["id"]

        # Act
        response = await async_client.get(
            f"/api/v1/projects/{project_id}",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert result["data"]["id"] == project_id
        assert result["data"]["name"] == "Detail Test Project"

    async def test_get_project_not_found(self, async_client: AsyncClient, auth_headers: dict):
        """Test retrieving non-existent project."""
        # Arrange
        non_existent_id = str(uuid4())

        # Act
        response = await async_client.get(
            f"/api/v1/projects/{non_existent_id}",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 404
        result = response.json()
        assert result["success"] is False

    async def test_get_project_invalid_id(self, async_client: AsyncClient, auth_headers: dict):
        """Test retrieving project with invalid ID format."""
        # Act
        response = await async_client.get(
            "/api/v1/projects/invalid_id",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 422
        result = response.json()
        assert result["success"] is False

    async def test_get_project_unauthorized(self, async_client: AsyncClient):
        """Test retrieving project without authentication."""
        # Arrange
        project_id = str(uuid4())

        # Act
        response = await async_client.get(f"/api/v1/projects/{project_id}")

        # Assert
        assert response.status_code == 401

    async def test_get_project_other_user(self, async_client: AsyncClient):
        """Test retrieving project owned by another user."""
        # Arrange - Create two users
        user1_data = {"email": "owner@example.com", "password": "Password123!"}
        user2_data = {"email": "other@example.com", "password": "Password123!"}

        # Register and login user1
        await async_client.post("/api/v1/auth/register", json=user1_data)
        login1_response = await async_client.post(
            "/api/v1/auth/login",
            data={"username": user1_data["email"], "password": user1_data["password"]},
        )
        user1_token = login1_response.json()["data"]["access_token"]
        user1_headers = {"Authorization": f"Bearer {user1_token}"}

        # Create project as user1
        create_response = await async_client.post(
            "/api/v1/projects",
            json={"name": "User 1 Project"},
            headers=user1_headers,
        )
        project_id = create_response.json()["data"]["id"]

        # Register and login user2
        await async_client.post("/api/v1/auth/register", json=user2_data)
        login2_response = await async_client.post(
            "/api/v1/auth/login",
            data={"username": user2_data["email"], "password": user2_data["password"]},
        )
        user2_token = login2_response.json()["data"]["access_token"]
        user2_headers = {"Authorization": f"Bearer {user2_token}"}

        # Act - Try to access project as user2
        response = await async_client.get(
            f"/api/v1/projects/{project_id}",
            headers=user2_headers,
        )

        # Assert
        assert response.status_code == 403
        result = response.json()
        assert result["success"] is False


@pytest.mark.integration
@pytest.mark.asyncio
class TestProjectUpdateEndpoints:
    """Test project update endpoints."""

    async def test_update_project_success(self, async_client: AsyncClient, auth_headers: dict):
        """Test successful project update."""
        # Arrange - Create a project
        create_response = await async_client.post(
            "/api/v1/projects",
            json={"name": "Original Name", "description": "Original Description"},
            headers=auth_headers,
        )
        project_id = create_response.json()["data"]["id"]

        # Act
        update_data = {
            "name": "Updated Name",
            "description": "Updated Description",
        }
        response = await async_client.patch(
            f"/api/v1/projects/{project_id}",
            json=update_data,
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert result["data"]["name"] == update_data["name"]
        assert result["data"]["description"] == update_data["description"]

    async def test_update_project_partial(self, async_client: AsyncClient, auth_headers: dict):
        """Test partial project update."""
        # Arrange - Create a project
        create_response = await async_client.post(
            "/api/v1/projects",
            json={"name": "Original Name", "description": "Original Description"},
            headers=auth_headers,
        )
        project_id = create_response.json()["data"]["id"]

        # Act - Update only description
        update_data = {"description": "Only Description Updated"}
        response = await async_client.patch(
            f"/api/v1/projects/{project_id}",
            json=update_data,
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["data"]["name"] == "Original Name"  # Unchanged
        assert result["data"]["description"] == "Only Description Updated"

    async def test_update_project_not_found(self, async_client: AsyncClient, auth_headers: dict):
        """Test updating non-existent project."""
        # Arrange
        non_existent_id = str(uuid4())
        update_data = {"name": "New Name"}

        # Act
        response = await async_client.patch(
            f"/api/v1/projects/{non_existent_id}",
            json=update_data,
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 404

    async def test_update_project_unauthorized(self, async_client: AsyncClient):
        """Test updating project without authentication."""
        # Arrange
        project_id = str(uuid4())
        update_data = {"name": "New Name"}

        # Act
        response = await async_client.patch(
            f"/api/v1/projects/{project_id}",
            json=update_data,
        )

        # Assert
        assert response.status_code == 401


@pytest.mark.integration
@pytest.mark.asyncio
class TestProjectDeletionEndpoints:
    """Test project deletion endpoints."""

    async def test_delete_project_success(self, async_client: AsyncClient, auth_headers: dict):
        """Test successful project deletion."""
        # Arrange - Create a project
        create_response = await async_client.post(
            "/api/v1/projects",
            json={"name": "Project to Delete"},
            headers=auth_headers,
        )
        project_id = create_response.json()["data"]["id"]

        # Act
        response = await async_client.delete(
            f"/api/v1/projects/{project_id}",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True

        # Verify project no longer exists
        get_response = await async_client.get(
            f"/api/v1/projects/{project_id}",
            headers=auth_headers,
        )
        assert get_response.status_code == 404

    async def test_delete_project_not_found(self, async_client: AsyncClient, auth_headers: dict):
        """Test deleting non-existent project."""
        # Arrange
        non_existent_id = str(uuid4())

        # Act
        response = await async_client.delete(
            f"/api/v1/projects/{non_existent_id}",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 404

    async def test_delete_project_unauthorized(self, async_client: AsyncClient):
        """Test deleting project without authentication."""
        # Arrange
        project_id = str(uuid4())

        # Act
        response = await async_client.delete(f"/api/v1/projects/{project_id}")

        # Assert
        assert response.status_code == 401

    async def test_delete_project_with_documents(self, async_client: AsyncClient, auth_headers: dict, test_pdf_file):
        """Test deleting project with associated documents."""
        # Arrange - Create project and upload document
        create_response = await async_client.post(
            "/api/v1/projects",
            json={"name": "Project with Documents"},
            headers=auth_headers,
        )
        project_id = create_response.json()["data"]["id"]

        # Upload document to project
        files = {"file": ("test.pdf", test_pdf_file, "application/pdf")}
        await async_client.post(
            "/api/v1/documents/upload",
            files=files,
            data={"project_id": project_id},
            headers=auth_headers,
        )

        # Act
        response = await async_client.delete(
            f"/api/v1/projects/{project_id}",
            headers=auth_headers,
        )

        # Assert - Depending on business rules:
        # Option 1: Cascade delete (deletes project and documents)
        # Option 2: Prevent delete if project has documents
        # This assertion would need adjustment based on actual requirements
        assert response.status_code in [200, 400]


@pytest.mark.integration
@pytest.mark.asyncio
class TestProjectDocumentsEndpoints:
    """Test project documents listing endpoints."""

    async def test_list_project_documents(self, async_client: AsyncClient, auth_headers: dict, test_pdf_file):
        """Test listing documents in a project."""
        # Arrange - Create project and upload documents
        create_response = await async_client.post(
            "/api/v1/projects",
            json={"name": "Project with Docs"},
            headers=auth_headers,
        )
        project_id = create_response.json()["data"]["id"]

        # Upload documents to project
        for i in range(5):
            test_pdf_file.seek(0)
            files = {"file": (f"doc_{i}.pdf", test_pdf_file, "application/pdf")}
            await async_client.post(
                "/api/v1/documents/upload",
                files=files,
                data={"project_id": project_id},
                headers=auth_headers,
            )

        # Act
        response = await async_client.get(
            f"/api/v1/projects/{project_id}/documents",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert result["data"]["total"] == 5

    async def test_list_project_documents_empty(self, async_client: AsyncClient, auth_headers: dict):
        """Test listing documents in empty project."""
        # Arrange - Create project without documents
        create_response = await async_client.post(
            "/api/v1/projects",
            json={"name": "Empty Project"},
            headers=auth_headers,
        )
        project_id = create_response.json()["data"]["id"]

        # Act
        response = await async_client.get(
            f"/api/v1/projects/{project_id}/documents",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["data"]["total"] == 0
        assert result["data"]["items"] == []


@pytest.mark.integration
@pytest.mark.asyncio
class TestProjectStatisticsEndpoints:
    """Test project statistics endpoints."""

    async def test_get_project_statistics(self, async_client: AsyncClient, auth_headers: dict, test_pdf_file):
        """Test retrieving project statistics."""
        # Arrange - Create project and upload documents
        create_response = await async_client.post(
            "/api/v1/projects",
            json={"name": "Stats Project"},
            headers=auth_headers,
        )
        project_id = create_response.json()["data"]["id"]

        # Upload documents
        for i in range(10):
            test_pdf_file.seek(0)
            files = {"file": (f"doc_{i}.pdf", test_pdf_file, "application/pdf")}
            await async_client.post(
                "/api/v1/documents/upload",
                files=files,
                data={"project_id": project_id},
                headers=auth_headers,
            )

        # Act
        response = await async_client.get(
            f"/api/v1/projects/{project_id}/statistics",
            headers=auth_headers,
        )

        # Assert
        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "data" in result
        assert result["data"]["total_documents"] == 10
        # Additional statistics assertions based on actual implementation
