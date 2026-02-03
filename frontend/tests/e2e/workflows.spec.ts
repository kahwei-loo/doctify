/**
 * E2E Tests for Complete User Journeys
 *
 * Tests end-to-end workflows spanning multiple features and pages
 */

import { test, expect } from '@playwright/test';

test.describe('Complete User Journeys', () => {
  test.describe('New User Onboarding Journey', () => {
    test('should complete full onboarding workflow', async ({ page }) => {
      // 1. Registration
      await page.goto('/');
      await page.click('text=Sign Up');

      const timestamp = Date.now();
      const email = `newuser${timestamp}@example.com`;

      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', 'StrongPassword123!');
      await page.fill('input[name="confirmPassword"]', 'StrongPassword123!');
      await page.fill('input[name="fullName"]', 'New Test User');
      await page.check('input[name="acceptTerms"]');
      await page.click('button[type="submit"]');

      // 2. Email verification (simulated)
      await expect(page).toHaveURL(/.*verify-email|dashboard/);

      if ((await page.url()).includes('verify-email')) {
        await page.click('button:has-text("Continue to Dashboard")');
      }

      // 3. Welcome tour
      await expect(page).toHaveURL(/.*dashboard/);
      await expect(page.locator('text=/Welcome|Get Started/i')).toBeVisible();

      // Skip or complete tour
      if (await page.locator('button:has-text("Start Tour")').isVisible()) {
        await page.click('button:has-text("Skip Tour")');
      }

      // 4. Create first project
      await page.click('button:has-text("Create Your First Project")');
      await page.fill('input[name="name"]', 'My First Project');
      await page.fill('textarea[name="description"]', 'Getting started with Doctify');
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/.*projects\/[a-f0-9]+/);
      await expect(page.locator('text=/Project created/i')).toBeVisible();

      // 5. Upload first document
      await page.click('button:has-text("Add Documents")');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/sample.pdf');
      await page.click('button:has-text("Upload")');

      await expect(page.locator('text=/Successfully uploaded/i')).toBeVisible();

      // 6. Complete profile
      await page.click('[data-testid="user-menu"]');
      await page.click('text=Profile');

      await page.fill('input[name="organization"]', 'Test Organization');
      await page.selectOption('select[name="industry"]', 'technology');
      await page.click('button:has-text("Save Profile")');

      await expect(page.locator('text=/Profile updated/i')).toBeVisible();
    });
  });

  test.describe('Document Processing Workflow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test('should complete full document processing workflow', async ({ page }) => {
      // 1. Navigate to project
      await page.goto('/projects');
      await page.click('[data-testid="project-card"]:first-child');

      // 2. Upload document
      await page.click('button:has-text("Add Documents")');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/contract.pdf');
      await page.fill('input[name="title"]', 'Contract Document');
      await page.click('button:has-text("Upload")');

      await expect(page.locator('text=/Successfully uploaded/i')).toBeVisible();

      // 3. View document details
      await page.click('text=Contract Document');
      await expect(page).toHaveURL(/.*documents\/[a-f0-9]+/);

      // 4. Configure processing options
      await page.click('button:has-text("Process Document")');
      await page.check('input[name="detectTables"]');
      await page.check('input[name="extractImages"]');
      await page.selectOption('select[name="language"]', 'en');
      await page.click('button:has-text("Start Processing")');

      // 5. Monitor processing progress
      await expect(page.locator('text=/Processing started/i')).toBeVisible();
      await expect(page.locator('text=/Processing: [0-9]+%/i')).toBeVisible({ timeout: 10000 });

      // 6. Wait for completion
      await expect(page.locator('text=/Complete|Finished/i')).toBeVisible({ timeout: 60000 });

      // 7. Review extracted text
      await expect(page.locator('[data-testid="extracted-text"]')).toBeVisible();

      // 8. Export processed document
      await page.click('button:has-text("Export")');
      await page.selectOption('select[name="format"]', 'docx');
      await page.check('input[name="includeImages"]');
      await page.click('button:has-text("Export")');

      const downloadPromise = page.waitForEvent('download');
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.docx$/);

      // 9. Share document
      await page.click('button:has-text("Share")');
      await page.fill('input[name="email"]', 'colleague@example.com');
      await page.selectOption('select[name="permission"]', 'view');
      await page.click('button:has-text("Add")');

      await expect(page.locator('text=colleague@example.com')).toBeVisible();
    });
  });

  test.describe('Batch Processing Workflow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test('should process multiple documents in batch', async ({ page }) => {
      // 1. Create new project for batch processing
      await page.goto('/projects');
      await page.click('button:has-text("New Project")');
      await page.fill('input[name="name"]', 'Batch Processing Project');
      await page.click('button[type="submit"]');

      // 2. Upload multiple documents
      await page.click('button:has-text("Add Documents")');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles([
        'tests/fixtures/doc1.pdf',
        'tests/fixtures/doc2.pdf',
        'tests/fixtures/doc3.pdf',
        'tests/fixtures/doc4.pdf',
        'tests/fixtures/doc5.pdf',
      ]);
      await page.click('button:has-text("Upload")');

      await expect(page.locator('text=/5 documents uploaded/i')).toBeVisible();

      // 3. Navigate to documents page
      await page.goto('/documents');

      // 4. Select all uploaded documents
      await page.click('button:has-text("Filter")');
      await page.selectOption('select[name="status"]', 'pending');
      await page.click('button:has-text("Apply")');

      // Select all pending documents
      await page.check('thead input[type="checkbox"]'); // Select all checkbox

      // 5. Start batch processing
      await page.click('button:has-text("Process Selected")');
      await page.check('input[name="detectTables"]');
      await page.selectOption('select[name="language"]', 'en');
      await page.click('button:has-text("Process All")');

      // 6. Monitor batch progress
      await expect(page.locator('text=/Processing 5 documents/i')).toBeVisible();

      // 7. Wait for batch completion
      await expect(page.locator('text=/Batch processing complete/i')).toBeVisible({ timeout: 120000 });

      // 8. Verify all documents processed
      await page.selectOption('select[name="status"]', 'complete');
      await expect(page.locator('tbody tr')).toHaveCount(5);

      // 9. Batch export
      await page.check('thead input[type="checkbox"]');
      await page.click('button:has-text("Export Selected")');
      await page.selectOption('select[name="format"]', 'pdf');
      await page.click('button:has-text("Export All")');

      const downloadPromise = page.waitForEvent('download');
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/\.zip$/);
    });
  });

  test.describe('Collaboration Workflow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test('should collaborate on project with team', async ({ page }) => {
      // 1. Create shared project
      await page.goto('/projects');
      await page.click('button:has-text("New Project")');
      await page.fill('input[name="name"]', 'Team Collaboration Project');
      await page.fill('textarea[name="description"]', 'Shared project for team collaboration');
      await page.click('button[type="submit"]');

      // 2. Add team members
      await page.click('button:has-text("Team")');
      await page.click('button:has-text("Add Member")');

      await page.fill('input[name="email"]', 'teammate1@example.com');
      await page.selectOption('select[name="role"]', 'editor');
      await page.click('button:has-text("Send Invitation")');

      await page.fill('input[name="email"]', 'teammate2@example.com');
      await page.selectOption('select[name="role"]', 'viewer');
      await page.click('button:has-text("Send Invitation")');

      await expect(page.locator('text=teammate1@example.com')).toBeVisible();
      await expect(page.locator('text=teammate2@example.com')).toBeVisible();

      // 3. Upload documents to shared project
      await page.click('button:has-text("Documents")');
      await page.click('button:has-text("Add Documents")');

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/shared-doc.pdf');
      await page.click('button:has-text("Upload")');

      // 4. Process shared document
      await page.click('text=shared-doc.pdf');
      await page.click('button:has-text("Process Document")');
      await page.click('button:has-text("Start Processing")');

      await expect(page.locator('text=/Processing started/i')).toBeVisible();

      // 5. Add comments/annotations
      await expect(page.locator('text=/Complete/i')).toBeVisible({ timeout: 60000 });
      await page.click('button:has-text("Add Comment")');
      await page.fill('textarea[name="comment"]', 'Review this section for accuracy');
      await page.click('button:has-text("Post Comment")');

      await expect(page.locator('text=Review this section for accuracy')).toBeVisible();

      // 6. View activity log
      await page.click('button:has-text("Activity")');
      await expect(page.locator('text=/uploaded|processed|commented/i')).toBeVisible();

      // 7. Share specific document
      await page.click('button:has-text("Documents")');
      await page.click('text=shared-doc.pdf');
      await page.click('button:has-text("Share")');

      await page.click('button:has-text("Generate Link")');
      await expect(page.locator('input[readonly][value*="share/"]')).toBeVisible();
    });
  });

  test.describe('Project Migration Workflow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test('should migrate documents between projects', async ({ page }) => {
      // 1. Create source project with documents
      await page.goto('/projects');
      await page.click('button:has-text("New Project")');
      await page.fill('input[name="name"]', 'Source Project');
      await page.click('button[type="submit"]');

      await page.click('button:has-text("Add Documents")');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles([
        'tests/fixtures/doc1.pdf',
        'tests/fixtures/doc2.pdf',
      ]);
      await page.click('button:has-text("Upload")');

      // 2. Create target project
      await page.goto('/projects');
      await page.click('button:has-text("New Project")');
      await page.fill('input[name="name"]', 'Target Project');
      await page.click('button[type="submit"]');

      const targetProjectUrl = page.url();

      // 3. Go back to source project
      await page.goto('/projects');
      await page.click('text=Source Project');

      // 4. Select documents to migrate
      await page.check('tbody tr:nth-child(1) input[type="checkbox"]');
      await page.check('tbody tr:nth-child(2) input[type="checkbox"]');

      // 5. Move documents to target project
      await page.click('button:has-text("Move")');
      await page.selectOption('select[name="targetProject"]', { label: 'Target Project' });
      await page.click('button:has-text("Confirm Move")');

      await expect(page.locator('text=/2 documents moved/i')).toBeVisible();

      // 6. Verify documents in target project
      await page.goto(targetProjectUrl);
      await expect(page.locator('tbody tr')).toHaveCount(2);

      // 7. Verify documents removed from source
      await page.goto('/projects');
      await page.click('text=Source Project');
      await expect(page.locator('text=/No documents|Empty/i')).toBeVisible();
    });
  });

  test.describe('Error Recovery Workflow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test('should handle and recover from processing errors', async ({ page }) => {
      // 1. Upload document
      await page.goto('/projects');
      await page.click('[data-testid="project-card"]:first-child');
      await page.click('button:has-text("Add Documents")');

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/corrupted.pdf');
      await page.click('button:has-text("Upload")');

      // 2. Attempt to process
      await page.click('text=corrupted.pdf');
      await page.click('button:has-text("Process Document")');
      await page.click('button:has-text("Start Processing")');

      // 3. Detect error
      await expect(page.locator('text=/Processing failed|Error/i')).toBeVisible({ timeout: 30000 });

      // 4. View error details
      await page.click('button:has-text("View Error Details")');
      await expect(page.locator('text=/Corrupted file|Invalid format/i')).toBeVisible();

      // 5. Retry with different settings
      await page.click('button:has-text("Retry")');
      await page.check('input[name="skipValidation"]');
      await page.click('button:has-text("Start Processing")');

      // 6. If still fails, delete and re-upload
      if (await page.locator('text=/Processing failed/i').isVisible({ timeout: 30000 })) {
        await page.click('button:has-text("Delete")');
        await page.click('button:has-text("Confirm")');

        await page.click('button:has-text("Add Documents")');
        await fileInput.setInputFiles('tests/fixtures/valid.pdf');
        await page.click('button:has-text("Upload")');

        // 7. Process successfully
        await page.click('text=valid.pdf');
        await page.click('button:has-text("Process Document")');
        await page.click('button:has-text("Start Processing")');

        await expect(page.locator('text=/Complete/i')).toBeVisible({ timeout: 60000 });
      }
    });
  });

  test.describe('Search and Navigation Workflow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test('should search and navigate across the application', async ({ page }) => {
      // 1. Global search from dashboard
      await page.goto('/dashboard');

      await page.fill('[data-testid="global-search"]', 'contract');
      await page.press('[data-testid="global-search"]', 'Enter');

      // 2. Should see search results
      await expect(page).toHaveURL(/.*search\?q=contract/);
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();

      // 3. Filter results by type
      await page.click('button:has-text("Filter")');
      await page.check('input[value="documents"]');
      await page.click('button:has-text("Apply")');

      // 4. Navigate to document from search
      await page.click('[data-testid="search-result"]:first-child');
      await expect(page).toHaveURL(/.*documents\/[a-f0-9]+/);

      // 5. Use breadcrumb navigation
      await page.click('[data-testid="breadcrumb"] >> text=Projects');
      await expect(page).toHaveURL(/.*\/projects/);

      // 6. Navigate to specific project
      await page.click('[data-testid="project-card"]:first-child');

      // 7. Use sidebar navigation
      await page.click('[data-testid="sidebar"] >> text=Documents');
      await expect(page).toHaveURL(/.*\/documents/);

      // 8. Use quick actions
      await page.press('body', 'Control+K'); // Command palette
      await page.fill('[data-testid="command-palette"]', 'new project');
      await page.click('text=Create New Project');

      await expect(page.locator('input[name="name"]')).toBeFocused();
    });
  });

  test.describe('Settings and Configuration Workflow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test('should configure account and preferences', async ({ page }) => {
      // 1. Navigate to settings
      await page.click('[data-testid="user-menu"]');
      await page.click('text=Settings');

      await expect(page).toHaveURL(/.*settings/);

      // 2. Update profile information
      await page.click('text=Profile');
      await page.fill('input[name="fullName"]', 'Updated Test User');
      await page.fill('input[name="organization"]', 'Updated Organization');
      await page.click('button:has-text("Save Profile")');

      await expect(page.locator('text=/Profile updated/i')).toBeVisible();

      // 3. Change password
      await page.click('text=Security');
      await page.fill('input[name="currentPassword"]', 'Password123!');
      await page.fill('input[name="newPassword"]', 'NewPassword123!');
      await page.fill('input[name="confirmPassword"]', 'NewPassword123!');
      await page.click('button:has-text("Change Password")');

      await expect(page.locator('text=/Password changed/i')).toBeVisible();

      // 4. Configure notification preferences
      await page.click('text=Notifications');
      await page.check('input[name="emailNotifications"]');
      await page.check('input[name="documentProcessed"]');
      await page.check('input[name="projectActivity"]');
      await page.click('button:has-text("Save Preferences")');

      await expect(page.locator('text=/Preferences saved/i')).toBeVisible();

      // 5. Set default processing options
      await page.click('text=Processing');
      await page.selectOption('select[name="defaultLanguage"]', 'en');
      await page.check('input[name="autoProcess"]');
      await page.check('input[name="detectTables"]');
      await page.click('button:has-text("Save Defaults")');

      await expect(page.locator('text=/Defaults saved/i')).toBeVisible();

      // 6. Manage API keys
      await page.click('text=API Keys');
      await page.click('button:has-text("Generate New Key")');
      await page.fill('input[name="keyName"]', 'Development Key');
      await page.click('button:has-text("Generate")');

      await expect(page.locator('[data-testid="api-key"]')).toBeVisible();
      await page.click('button:has-text("Copy Key")');

      // 7. Configure billing (if applicable)
      if (await page.locator('text=Billing').isVisible()) {
        await page.click('text=Billing');
        await expect(page.locator('text=/Current Plan|Usage/i')).toBeVisible();
      }
    });
  });

  test.describe('Mobile Responsiveness Workflow', () => {
    test('should work correctly on mobile devices', async ({ page, viewport }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // 1. Login
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.click('button[type="submit"]');

      // 2. Should see mobile navigation
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

      // 3. Open mobile menu
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();

      // 4. Navigate to projects
      await page.click('[data-testid="mobile-menu"] >> text=Projects');
      await expect(page).toHaveURL(/.*projects/);

      // 5. View project on mobile
      await page.click('[data-testid="project-card"]:first-child');

      // 6. Mobile-optimized document upload
      await page.click('button:has-text("Add")'); // Mobile uses shorter labels
      await expect(page.locator('[data-testid="mobile-upload-sheet"]')).toBeVisible();
    });
  });
});
