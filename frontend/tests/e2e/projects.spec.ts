/**
 * E2E Tests for Project Management Workflows
 *
 * Tests project creation, editing, document organization, and deletion
 */

import { test, expect } from '@playwright/test';

test.describe('Project Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test.describe('Project Creation', () => {
    test('should create new project successfully', async ({ page }) => {
      await page.goto('/projects');

      // Click create project button
      await page.click('button:has-text("New Project")');

      // Fill project form
      await page.fill('input[name="name"]', 'Test Project');
      await page.fill('textarea[name="description"]', 'This is a test project for E2E testing');
      await page.selectOption('select[name="category"]', 'research');

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to project page
      await expect(page).toHaveURL(/.*projects\/[a-f0-9]+/);

      // Should see success message
      await expect(page.locator('text=/Project created|Successfully created/i')).toBeVisible();

      // Should see project details
      await expect(page.locator('h1:has-text("Test Project")')).toBeVisible();
    });

    test('should show validation errors for invalid input', async ({ page }) => {
      await page.goto('/projects');

      await page.click('button:has-text("New Project")');

      // Try to submit empty form
      await page.click('button[type="submit"]');

      // Should show validation errors
      await expect(page.locator('text=/Name is required|Please enter a name/i')).toBeVisible();
    });

    test('should create project with custom settings', async ({ page }) => {
      await page.goto('/projects');

      await page.click('button:has-text("New Project")');

      // Fill form with custom settings
      await page.fill('input[name="name"]', 'Advanced Project');
      await page.fill('textarea[name="description"]', 'Project with custom settings');

      // Configure advanced settings
      await page.click('button:has-text("Advanced Settings")');
      await page.check('input[name="enableOCR"]');
      await page.check('input[name="autoProcess"]');
      await page.selectOption('select[name="defaultLanguage"]', 'en');
      await page.fill('input[name="retentionDays"]', '90');

      await page.click('button[type="submit"]');

      // Should create with settings
      await expect(page).toHaveURL(/.*projects\/[a-f0-9]+/);
      await expect(page.locator('text=/Project created/i')).toBeVisible();
    });

    test('should show project template selection', async ({ page }) => {
      await page.goto('/projects');

      await page.click('button:has-text("New Project")');

      // Click templates
      await page.click('button:has-text("Use Template")');

      // Should show template options
      await expect(page.locator('text=/Contract Analysis|Financial Reports|Legal Documents/i')).toBeVisible();

      // Select template
      await page.click('button:has-text("Contract Analysis")');

      // Should pre-fill settings
      await expect(page.locator('input[name="name"]')).toHaveValue(/Contract/i);
    });
  });

  test.describe('Project List and Filters', () => {
    test('should display project list', async ({ page }) => {
      await page.goto('/projects');

      // Should see project cards or table
      await expect(page.locator('[data-testid="project-list"]')).toBeVisible();
      await expect(page.locator('[data-testid="project-card"]')).toHaveCount.toBeGreaterThan(0);
    });

    test('should filter projects by category', async ({ page }) => {
      await page.goto('/projects');

      // Filter by category
      await page.selectOption('select[name="category"]', 'research');

      // Should only show research projects
      const cards = page.locator('[data-testid="project-card"]');
      await expect(cards).toHaveCount.toBeGreaterThan(0);

      for (let i = 0; i < await cards.count(); i++) {
        await expect(cards.nth(i).locator('text=/Research/i')).toBeVisible();
      }
    });

    test('should search projects', async ({ page }) => {
      await page.goto('/projects');

      // Search for project
      await page.fill('input[placeholder*="Search"]', 'test project');
      await page.press('input[placeholder*="Search"]', 'Enter');

      // Should show matching results
      await expect(page.locator('text=/test project/i')).toBeVisible();
    });

    test('should sort projects', async ({ page }) => {
      await page.goto('/projects');

      // Sort by name
      await page.click('button:has-text("Sort")');
      await page.click('text=Name');

      // Verify sorting
      const firstCard = page.locator('[data-testid="project-card"]').first();
      const firstName = await firstCard.locator('h3').textContent();

      // Sort descending
      await page.click('button:has-text("Sort")');
      await page.click('text=Name (Z-A)');

      const newFirstCard = page.locator('[data-testid="project-card"]').first();
      const newFirstName = await newFirstCard.locator('h3').textContent();

      expect(firstName).not.toBe(newFirstName);
    });

    test('should show project statistics', async ({ page }) => {
      await page.goto('/projects');

      // Click on project card
      await page.click('[data-testid="project-card"]:first-child');

      // Should see statistics
      await expect(page.locator('text=/Total Documents:|Processed:|Pending:/i')).toBeVisible();
      await expect(page.locator('[data-testid="document-count"]')).toBeVisible();
    });
  });

  test.describe('Project Details and Management', () => {
    test('should view project details', async ({ page }) => {
      await page.goto('/projects');

      // Click on project
      await page.click('[data-testid="project-card"]:first-child');

      // Should navigate to project page
      await expect(page).toHaveURL(/.*projects\/[a-f0-9]+/);

      // Should see project information
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('text=/Description:|Category:|Created:/i')).toBeVisible();
    });

    test('should edit project details', async ({ page }) => {
      await page.goto('/projects');
      await page.click('[data-testid="project-card"]:first-child');

      // Click edit button
      await page.click('button:has-text("Edit")');

      // Update details
      await page.fill('input[name="name"]', 'Updated Project Name');
      await page.fill('textarea[name="description"]', 'Updated description');
      await page.click('button:has-text("Save")');

      // Should see success message
      await expect(page.locator('text=/Updated successfully/i')).toBeVisible();
      await expect(page.locator('h1:has-text("Updated Project Name")')).toBeVisible();
    });

    test('should view project documents', async ({ page }) => {
      await page.goto('/projects');
      await page.click('[data-testid="project-card"]:first-child');

      // Click documents tab
      await page.click('button:has-text("Documents")');

      // Should see document list
      await expect(page.locator('[data-testid="document-table"]')).toBeVisible();
      await expect(page.locator('tbody tr')).toHaveCount.toBeGreaterThan(0);
    });

    test('should add documents to project', async ({ page }) => {
      await page.goto('/projects');
      await page.click('[data-testid="project-card"]:first-child');

      // Click add documents
      await page.click('button:has-text("Add Documents")');

      // Upload files
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles([
        'tests/fixtures/sample1.pdf',
        'tests/fixtures/sample2.pdf',
      ]);

      await page.click('button:has-text("Upload")');

      // Should see success message
      await expect(page.locator('text=/2 documents added/i')).toBeVisible();
    });

    test('should move documents between projects', async ({ page }) => {
      await page.goto('/projects');
      await page.click('[data-testid="project-card"]:first-child');

      // Select documents
      await page.check('tbody tr:nth-child(1) input[type="checkbox"]');
      await page.check('tbody tr:nth-child(2) input[type="checkbox"]');

      // Move to another project
      await page.click('button:has-text("Move")');
      await page.selectOption('select[name="targetProject"]', { index: 1 });
      await page.click('button:has-text("Confirm Move")');

      // Should see success message
      await expect(page.locator('text=/2 documents moved/i')).toBeVisible();
    });

    test('should configure project settings', async ({ page }) => {
      await page.goto('/projects');
      await page.click('[data-testid="project-card"]:first-child');

      // Click settings tab
      await page.click('button:has-text("Settings")');

      // Update settings
      await page.check('input[name="autoProcess"]');
      await page.selectOption('select[name="defaultLanguage"]', 'es');
      await page.fill('input[name="retentionDays"]', '120');

      await page.click('button:has-text("Save Settings")');

      // Should see success message
      await expect(page.locator('text=/Settings updated/i')).toBeVisible();
    });
  });

  test.describe('Project Collaboration', () => {
    test('should add team member to project', async ({ page }) => {
      await page.goto('/projects');
      await page.click('[data-testid="project-card"]:first-child');

      // Click team tab
      await page.click('button:has-text("Team")');

      // Add member
      await page.click('button:has-text("Add Member")');
      await page.fill('input[name="email"]', 'teammate@example.com');
      await page.selectOption('select[name="role"]', 'editor');
      await page.click('button:has-text("Send Invitation")');

      // Should see member in list
      await expect(page.locator('text=teammate@example.com')).toBeVisible();
      await expect(page.locator('text=/Editor/i')).toBeVisible();
    });

    test('should change team member role', async ({ page }) => {
      await page.goto('/projects');
      await page.click('[data-testid="project-card"]:first-child');

      await page.click('button:has-text("Team")');

      // Click on member row
      await page.click('[data-testid="member-row"]:has-text("teammate@example.com")');

      // Change role
      await page.selectOption('select[name="role"]', 'admin');
      await page.click('button:has-text("Update Role")');

      // Should see updated role
      await expect(page.locator('text=teammate@example.com')).toBeVisible();
      await expect(page.locator('text=/Admin/i')).toBeVisible();
    });

    test('should remove team member', async ({ page }) => {
      await page.goto('/projects');
      await page.click('[data-testid="project-card"]:first-child');

      await page.click('button:has-text("Team")');

      // Remove member
      await page.click('button[aria-label="Remove teammate@example.com"]');
      await page.click('button:has-text("Confirm")');

      // Should be removed from list
      await expect(page.locator('text=teammate@example.com')).not.toBeVisible();
    });

    test('should view project activity log', async ({ page }) => {
      await page.goto('/projects');
      await page.click('[data-testid="project-card"]:first-child');

      // Click activity tab
      await page.click('button:has-text("Activity")');

      // Should see activity feed
      await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();
      await expect(page.locator('[data-testid="activity-item"]')).toHaveCount.toBeGreaterThan(0);

      // Should show recent activities
      await expect(page.locator('text=/uploaded|processed|edited|shared/i')).toBeVisible();
    });
  });

  test.describe('Project Analytics', () => {
    test('should view project analytics dashboard', async ({ page }) => {
      await page.goto('/projects');
      await page.click('[data-testid="project-card"]:first-child');

      // Click analytics tab
      await page.click('button:has-text("Analytics")');

      // Should see charts and metrics
      await expect(page.locator('[data-testid="analytics-dashboard"]')).toBeVisible();
      await expect(page.locator('text=/Total Documents|Processing Rate|Success Rate/i')).toBeVisible();
    });

    test('should filter analytics by date range', async ({ page }) => {
      await page.goto('/projects');
      await page.click('[data-testid="project-card"]:first-child');

      await page.click('button:has-text("Analytics")');

      // Set date range
      await page.fill('input[name="startDate"]', '2024-01-01');
      await page.fill('input[name="endDate"]', '2024-12-31');
      await page.click('button:has-text("Apply")');

      // Should update charts
      await expect(page.locator('[data-testid="chart"]')).toBeVisible();
    });

    test('should export analytics report', async ({ page }) => {
      await page.goto('/projects');
      await page.click('[data-testid="project-card"]:first-child');

      await page.click('button:has-text("Analytics")');

      // Export report
      await page.click('button:has-text("Export Report")');

      const downloadPromise = page.waitForEvent('download');
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/analytics.*\.(pdf|xlsx)$/);
    });
  });

  test.describe('Project Archiving and Deletion', () => {
    test('should archive project', async ({ page }) => {
      await page.goto('/projects');
      await page.click('[data-testid="project-card"]:first-child');

      // Click archive button
      await page.click('button:has-text("Archive")');

      // Confirm
      await expect(page.locator('text=/Archive this project/i')).toBeVisible();
      await page.click('button:has-text("Confirm")');

      // Should redirect to projects list
      await expect(page).toHaveURL(/.*\/projects$/);

      // Should see success message
      await expect(page.locator('text=/Project archived/i')).toBeVisible();
    });

    test('should restore archived project', async ({ page }) => {
      await page.goto('/projects');

      // Show archived projects
      await page.click('button:has-text("Show Archived")');

      // Click on archived project
      await page.click('[data-testid="project-card"]:has-text("Archived"):first-child');

      // Restore
      await page.click('button:has-text("Restore")');
      await page.click('button:has-text("Confirm")');

      // Should see success message
      await expect(page.locator('text=/Project restored/i')).toBeVisible();
    });

    test('should delete project', async ({ page }) => {
      await page.goto('/projects');
      await page.click('[data-testid="project-card"]:first-child');

      // Click delete button
      await page.click('button:has-text("Delete")');

      // Confirm deletion
      await expect(page.locator('text=/permanently delete|cannot be undone/i')).toBeVisible();
      await page.fill('input[name="confirmation"]', 'DELETE');
      await page.click('button:has-text("Delete Permanently")');

      // Should redirect to projects list
      await expect(page).toHaveURL(/.*\/projects$/);

      // Should see success message
      await expect(page.locator('text=/Project deleted/i')).toBeVisible();
    });

    test('should prevent deletion of non-empty project', async ({ page }) => {
      await page.goto('/projects');
      await page.click('[data-testid="project-card"]:has-text("Documents:"):first-child');

      await page.click('button:has-text("Delete")');

      // Should show warning
      await expect(page.locator('text=/contains documents|must be empty/i')).toBeVisible();

      // Delete button should be disabled
      await expect(page.locator('button:has-text("Delete Permanently")')).toBeDisabled();
    });
  });

  test.describe('Project Templates', () => {
    test('should save project as template', async ({ page }) => {
      await page.goto('/projects');
      await page.click('[data-testid="project-card"]:first-child');

      // Click save as template
      await page.click('button:has-text("Save as Template")');

      // Fill template details
      await page.fill('input[name="templateName"]', 'My Custom Template');
      await page.fill('textarea[name="templateDescription"]', 'Template for similar projects');
      await page.click('button:has-text("Save Template")');

      // Should see success message
      await expect(page.locator('text=/Template saved/i')).toBeVisible();
    });

    test('should create project from template', async ({ page }) => {
      await page.goto('/projects');

      await page.click('button:has-text("New Project")');
      await page.click('button:has-text("Use Template")');

      // Select custom template
      await page.click('button:has-text("My Custom Template")');

      // Should pre-fill with template settings
      await page.fill('input[name="name"]', 'Project from Template');
      await page.click('button[type="submit"]');

      // Should create project with template settings
      await expect(page).toHaveURL(/.*projects\/[a-f0-9]+/);
      await expect(page.locator('text=/Project created/i')).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors', async ({ page }) => {
      await page.goto('/projects');

      // Simulate network failure
      await page.route('**/api/v1/projects', route => route.abort());

      await page.click('button:has-text("New Project")');
      await page.fill('input[name="name"]', 'Test Project');
      await page.click('button[type="submit"]');

      // Should show error
      await expect(page.locator('text=/Network error|Failed to create/i')).toBeVisible();
    });

    test('should handle project not found', async ({ page }) => {
      // Try to access non-existent project
      await page.goto('/projects/invalid-id-12345');

      // Should show error page
      await expect(page.locator('text=/Project not found|404/i')).toBeVisible();
    });

    test('should handle permission errors', async ({ page }) => {
      await page.goto('/projects');

      // Simulate 403 error
      await page.route('**/api/v1/projects/*', route =>
        route.fulfill({ status: 403, body: 'Forbidden' })
      );

      await page.click('[data-testid="project-card"]:first-child');

      // Should show permission error
      await expect(page.locator('text=/Access denied|No permission/i')).toBeVisible();
    });
  });
});
