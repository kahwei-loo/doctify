/**
 * E2E Tests for Document Management Workflows
 *
 * Tests document upload, processing, viewing, export, and deletion flows
 */

import { test, expect } from "@playwright/test";

test.describe("Document Management", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.fill('input[name="email"]', "test@example.com");
    await page.fill('input[name="password"]', "Password123!");
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test.describe("Document Upload", () => {
    test("should upload single document successfully", async ({ page }) => {
      await page.goto("/documents");

      // Click upload button
      await page.click('button:has-text("Upload Document")');

      // Fill upload form
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles("tests/fixtures/sample.pdf");

      await page.fill('input[name="title"]', "Test Document");
      await page.selectOption('select[name="projectId"]', { index: 0 });

      // Submit upload
      await page.click('button[type="submit"]');

      // Should see success message
      await expect(page.locator("text=/Successfully uploaded|Upload complete/i")).toBeVisible();

      // Should see document in list
      await expect(page.locator("text=Test Document")).toBeVisible();
    });

    test("should upload multiple documents", async ({ page }) => {
      await page.goto("/documents");

      await page.click('button:has-text("Upload Document")');

      // Upload multiple files
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles([
        "tests/fixtures/sample1.pdf",
        "tests/fixtures/sample2.pdf",
        "tests/fixtures/sample3.pdf",
      ]);

      await page.selectOption('select[name="projectId"]', { index: 0 });
      await page.click('button[type="submit"]');

      // Should see success for multiple uploads
      await expect(
        page.locator("text=/3 documents uploaded|uploaded successfully/i")
      ).toBeVisible();
    });

    test("should show upload progress", async ({ page }) => {
      await page.goto("/documents");

      await page.click('button:has-text("Upload Document")');

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles("tests/fixtures/large-sample.pdf");

      await page.click('button[type="submit"]');

      // Should show progress bar
      await expect(page.locator('[role="progressbar"]')).toBeVisible();

      // Wait for completion
      await expect(page.locator("text=/Successfully uploaded/i")).toBeVisible({ timeout: 30000 });
    });

    test("should validate file type", async ({ page }) => {
      await page.goto("/documents");

      await page.click('button:has-text("Upload Document")');

      // Try to upload invalid file type
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles("tests/fixtures/invalid.txt");

      await page.click('button[type="submit"]');

      // Should show error
      await expect(page.locator("text=/Invalid file type|Only PDF files/i")).toBeVisible();
    });

    test("should validate file size", async ({ page }) => {
      await page.goto("/documents");

      await page.click('button:has-text("Upload Document")');

      // Try to upload oversized file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles("tests/fixtures/oversized.pdf");

      await page.click('button[type="submit"]');

      // Should show error
      await expect(page.locator("text=/File too large|exceeds maximum/i")).toBeVisible();
    });

    test("should support drag and drop upload", async ({ page }) => {
      await page.goto("/documents");

      // Get drop zone
      const dropZone = page.locator('[data-testid="drop-zone"]');

      // Simulate drag and drop
      const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
      await dropZone.dispatchEvent("drop", { dataTransfer });

      await expect(page.locator("text=/Drop files here|Drag files/i")).toBeVisible();
    });

    test("should cancel upload", async ({ page }) => {
      await page.goto("/documents");

      await page.click('button:has-text("Upload Document")');

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles("tests/fixtures/sample.pdf");

      await page.click('button[type="submit"]');

      // Cancel upload
      await page.click('button:has-text("Cancel")');

      // Should not see document in list
      await expect(page.locator("text=Test Document")).not.toBeVisible();
    });
  });

  test.describe("Document List and Filters", () => {
    test("should display document list", async ({ page }) => {
      await page.goto("/documents");

      // Should see table with documents
      await expect(page.locator("table")).toBeVisible();
      await expect(page.locator("tbody tr")).toHaveCount.toBeGreaterThan(0);
    });

    test("should filter by status", async ({ page }) => {
      await page.goto("/documents");

      // Filter by processing status
      await page.selectOption('select[name="status"]', "processing");

      // Should only show processing documents
      const rows = page.locator("tbody tr");
      await expect(rows).toHaveCount.toBeGreaterThan(0);

      for (let i = 0; i < (await rows.count()); i++) {
        await expect(rows.nth(i).locator("text=/Processing|In Progress/i")).toBeVisible();
      }
    });

    test("should filter by date range", async ({ page }) => {
      await page.goto("/documents");

      // Set date range filter
      await page.fill('input[name="startDate"]', "2024-01-01");
      await page.fill('input[name="endDate"]', "2024-12-31");
      await page.click('button:has-text("Apply Filters")');

      // Should filter results
      await expect(page.locator("tbody tr")).toHaveCount.toBeGreaterThan(0);
    });

    test("should search documents", async ({ page }) => {
      await page.goto("/documents");

      // Search for document
      await page.fill('input[placeholder*="Search"]', "test document");
      await page.press('input[placeholder*="Search"]', "Enter");

      // Should show matching results
      await expect(page.locator("tbody tr")).toHaveCount.toBeGreaterThan(0);
      await expect(page.locator("text=/test document/i")).toBeVisible();
    });

    test("should sort documents", async ({ page }) => {
      await page.goto("/documents");

      // Click column header to sort
      await page.click('th:has-text("Date")');

      // Should sort ascending
      const firstRow = page.locator("tbody tr").first();
      const firstDate = await firstRow.locator("td").nth(2).textContent();

      await page.click('th:has-text("Date")');

      // Should sort descending
      const newFirstRow = page.locator("tbody tr").first();
      const newFirstDate = await newFirstRow.locator("td").nth(2).textContent();

      expect(firstDate).not.toBe(newFirstDate);
    });

    test("should paginate results", async ({ page }) => {
      await page.goto("/documents");

      // Should see pagination controls
      await expect(page.locator('[data-testid="pagination"]')).toBeVisible();

      // Click next page
      await page.click('button:has-text("Next")');

      // URL should update
      await expect(page).toHaveURL(/.*page=2/);

      // Should see different results
      await expect(page.locator("tbody tr")).toHaveCount.toBeGreaterThan(0);
    });

    test("should select documents for bulk actions", async ({ page }) => {
      await page.goto("/documents");

      // Select multiple documents
      await page.check('tbody tr:nth-child(1) input[type="checkbox"]');
      await page.check('tbody tr:nth-child(2) input[type="checkbox"]');

      // Should show bulk actions
      await expect(page.locator("text=/2 selected/i")).toBeVisible();
      await expect(page.locator('button:has-text("Delete Selected")')).toBeVisible();
    });
  });

  test.describe("Document Detail and Processing", () => {
    test("should view document details", async ({ page }) => {
      await page.goto("/documents");

      // Click on document
      await page.click("tbody tr:first-child");

      // Should navigate to detail page
      await expect(page).toHaveURL(/.*documents\/[a-f0-9]+/);

      // Should see document details
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("text=/Status:|File Size:|Upload Date:/i")).toBeVisible();
    });

    test("should view document preview", async ({ page }) => {
      await page.goto("/documents");
      await page.click("tbody tr:first-child");

      // Should see preview
      await expect(page.locator('[data-testid="document-preview"]')).toBeVisible();

      // Should be able to navigate pages
      await page.click('button:has-text("Next Page")');
      await expect(page.locator("text=/Page 2/i")).toBeVisible();
    });

    test("should start document processing", async ({ page }) => {
      await page.goto("/documents");
      await page.click("tbody tr:first-child");

      // Click process button
      await page.click('button:has-text("Process Document")');

      // Should show processing options
      await expect(page.locator("text=/OCR Options|Processing Settings/i")).toBeVisible();

      // Configure and start
      await page.check('input[name="detectTables"]');
      await page.selectOption('select[name="language"]', "en");
      await page.click('button:has-text("Start Processing")');

      // Should see processing status
      await expect(page.locator("text=/Processing started|In queue/i")).toBeVisible();
    });

    test("should receive real-time processing updates", async ({ page }) => {
      await page.goto("/documents");
      await page.click("tbody tr:first-child");

      // Start processing
      await page.click('button:has-text("Process Document")');
      await page.click('button:has-text("Start Processing")');

      // Should receive WebSocket updates
      await expect(page.locator("text=/Processing: [0-9]+%/i")).toBeVisible({ timeout: 10000 });

      // Wait for completion
      await expect(page.locator("text=/Complete|Finished/i")).toBeVisible({ timeout: 60000 });
    });

    test("should view extracted text", async ({ page }) => {
      await page.goto("/documents");

      // Find processed document
      await page.click('tbody tr:has-text("Complete"):first-child');

      // Should see extracted text
      await expect(page.locator('[data-testid="extracted-text"]')).toBeVisible();

      // Should be able to search within text
      await page.fill('input[placeholder*="Search in document"]', "keyword");
      await expect(page.locator('mark:has-text("keyword")')).toBeVisible();
    });

    test("should edit document metadata", async ({ page }) => {
      await page.goto("/documents");
      await page.click("tbody tr:first-child");

      // Click edit button
      await page.click('button:has-text("Edit")');

      // Update metadata
      await page.fill('input[name="title"]', "Updated Title");
      await page.fill('textarea[name="description"]', "Updated description");
      await page.click('button:has-text("Save")');

      // Should see success message
      await expect(page.locator("text=/Updated successfully/i")).toBeVisible();
      await expect(page.locator('h1:has-text("Updated Title")')).toBeVisible();
    });
  });

  test.describe("Document Export", () => {
    test("should export document as PDF", async ({ page }) => {
      await page.goto("/documents");
      await page.click('tbody tr:has-text("Complete"):first-child');

      // Click export button
      await page.click('button:has-text("Export")');

      // Select PDF format
      await page.selectOption('select[name="format"]', "pdf");
      await page.click('button:has-text("Export")');

      // Should start download
      const downloadPromise = page.waitForEvent("download");
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    });

    test("should export document as DOCX", async ({ page }) => {
      await page.goto("/documents");
      await page.click('tbody tr:has-text("Complete"):first-child');

      await page.click('button:has-text("Export")');

      // Select DOCX format with options
      await page.selectOption('select[name="format"]', "docx");
      await page.check('input[name="includeImages"]');
      await page.check('input[name="preserveFormatting"]');
      await page.click('button:has-text("Export")');

      const downloadPromise = page.waitForEvent("download");
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/\.docx$/);
    });

    test("should export document as JSON", async ({ page }) => {
      await page.goto("/documents");
      await page.click('tbody tr:has-text("Complete"):first-child');

      await page.click('button:has-text("Export")');

      // Select JSON format
      await page.selectOption('select[name="format"]', "json");
      await page.click('button:has-text("Export")');

      const downloadPromise = page.waitForEvent("download");
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/\.json$/);
    });

    test("should show export progress", async ({ page }) => {
      await page.goto("/documents");
      await page.click('tbody tr:has-text("Complete"):first-child');

      await page.click('button:has-text("Export")');
      await page.selectOption('select[name="format"]', "pdf");
      await page.click('button:has-text("Export")');

      // Should show progress
      await expect(page.locator("text=/Preparing export|Generating/i")).toBeVisible();
    });

    test("should export multiple documents", async ({ page }) => {
      await page.goto("/documents");

      // Select multiple documents
      await page.check('tbody tr:has-text("Complete"):nth-child(1) input[type="checkbox"]');
      await page.check('tbody tr:has-text("Complete"):nth-child(2) input[type="checkbox"]');

      // Click bulk export
      await page.click('button:has-text("Export Selected")');

      await page.selectOption('select[name="format"]', "pdf");
      await page.click('button:has-text("Export All")');

      // Should download zip file
      const downloadPromise = page.waitForEvent("download");
      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/\.zip$/);
    });

    test("should handle export errors", async ({ page }) => {
      await page.goto("/documents");
      await page.click("tbody tr:first-child");

      await page.click('button:has-text("Export")');

      // Select unsupported format or trigger error
      await page.selectOption('select[name="format"]', "invalid");
      await page.click('button:has-text("Export")');

      // Should show error message
      await expect(page.locator("text=/Export failed|Error/i")).toBeVisible();
    });
  });

  test.describe("Document Deletion", () => {
    test("should delete single document", async ({ page }) => {
      await page.goto("/documents");
      await page.click("tbody tr:first-child");

      // Click delete button
      await page.click('button:has-text("Delete")');

      // Confirm deletion
      await expect(page.locator("text=/Are you sure|Confirm deletion/i")).toBeVisible();
      await page.click('button:has-text("Confirm")');

      // Should redirect to list
      await expect(page).toHaveURL(/.*\/documents$/);

      // Should see success message
      await expect(page.locator("text=/Deleted successfully/i")).toBeVisible();
    });

    test("should cancel deletion", async ({ page }) => {
      await page.goto("/documents");
      await page.click("tbody tr:first-child");

      const title = await page.locator("h1").textContent();

      await page.click('button:has-text("Delete")');
      await page.click('button:has-text("Cancel")');

      // Should remain on page
      await expect(page.locator(`h1:has-text("${title}")`)).toBeVisible();
    });

    test("should delete multiple documents", async ({ page }) => {
      await page.goto("/documents");

      // Select multiple documents
      await page.check('tbody tr:nth-child(1) input[type="checkbox"]');
      await page.check('tbody tr:nth-child(2) input[type="checkbox"]');

      // Click bulk delete
      await page.click('button:has-text("Delete Selected")');

      // Confirm
      await expect(page.locator("text=/Delete 2 documents/i")).toBeVisible();
      await page.click('button:has-text("Confirm")');

      // Should see success message
      await expect(page.locator("text=/2 documents deleted/i")).toBeVisible();
    });

    test("should prevent deletion of processing documents", async ({ page }) => {
      await page.goto("/documents");

      // Try to delete processing document
      await page.check('tbody tr:has-text("Processing") input[type="checkbox"]');
      await page.click('button:has-text("Delete Selected")');

      // Should show warning
      await expect(page.locator("text=/Cannot delete processing|in progress/i")).toBeVisible();
    });
  });

  test.describe("Document Sharing and Permissions", () => {
    test("should share document with user", async ({ page }) => {
      await page.goto("/documents");
      await page.click("tbody tr:first-child");

      // Click share button
      await page.click('button:has-text("Share")');

      // Add user
      await page.fill('input[name="email"]', "colleague@example.com");
      await page.selectOption('select[name="permission"]', "view");
      await page.click('button:has-text("Add")');

      // Should see user in list
      await expect(page.locator("text=colleague@example.com")).toBeVisible();
      await expect(page.locator("text=/View only/i")).toBeVisible();
    });

    test("should remove shared access", async ({ page }) => {
      await page.goto("/documents");
      await page.click("tbody tr:first-child");

      await page.click('button:has-text("Share")');

      // Remove user
      await page.click('button[aria-label="Remove colleague@example.com"]');

      // Should be removed from list
      await expect(page.locator("text=colleague@example.com")).not.toBeVisible();
    });

    test("should generate share link", async ({ page }) => {
      await page.goto("/documents");
      await page.click("tbody tr:first-child");

      await page.click('button:has-text("Share")');

      // Generate link
      await page.click('button:has-text("Generate Link")');

      // Should show link
      await expect(page.locator('input[readonly][value*="share/"]')).toBeVisible();

      // Copy link
      await page.click('button:has-text("Copy Link")');
      await expect(page.locator("text=/Copied/i")).toBeVisible();
    });
  });

  test.describe("Error Handling", () => {
    test("should handle network errors during upload", async ({ page }) => {
      await page.goto("/documents");

      // Simulate network failure
      await page.route("**/api/v1/documents/upload", (route) => route.abort());

      await page.click('button:has-text("Upload Document")');
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles("tests/fixtures/sample.pdf");
      await page.click('button[type="submit"]');

      // Should show error
      await expect(page.locator("text=/Network error|Failed to upload/i")).toBeVisible();
    });

    test("should handle processing failures", async ({ page }) => {
      await page.goto("/documents");
      await page.click("tbody tr:first-child");

      // Simulate processing failure
      await page.route("**/api/v1/documents/*/process", (route) =>
        route.fulfill({ status: 500, body: "Processing failed" })
      );

      await page.click('button:has-text("Process Document")');
      await page.click('button:has-text("Start Processing")');

      // Should show error
      await expect(page.locator("text=/Processing failed|Error/i")).toBeVisible();
    });

    test("should handle document not found", async ({ page }) => {
      // Try to access non-existent document
      await page.goto("/documents/invalid-id-12345");

      // Should show error page
      await expect(page.locator("text=/Document not found|404/i")).toBeVisible();
    });
  });
});
