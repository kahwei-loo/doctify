/**
 * E2E Tests for Authentication Flows
 *
 * Tests user registration, login, logout, and password management
 */

import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test.describe("User Registration", () => {
    test("should register a new user successfully", async ({ page }) => {
      // Navigate to registration page
      await page.click("text=Sign Up");
      await expect(page).toHaveURL(/.*register/);

      // Fill registration form
      const timestamp = Date.now();
      const email = `test${timestamp}@example.com`;

      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', "StrongPassword123!");
      await page.fill('input[name="confirmPassword"]', "StrongPassword123!");
      await page.fill('input[name="fullName"]', "Test User");

      // Accept terms
      await page.check('input[name="acceptTerms"]');

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to dashboard or email verification page
      await expect(page).toHaveURL(/.*dashboard|verify-email/);

      // Should see welcome message or verification prompt
      await expect(page.locator("text=/Welcome|Verify your email/i")).toBeVisible();
    });

    test("should show validation errors for invalid email", async ({ page }) => {
      await page.click("text=Sign Up");

      await page.fill('input[name="email"]', "invalid-email");
      await page.fill('input[name="password"]', "StrongPassword123!");
      await page.click('button[type="submit"]');

      // Should show email validation error
      await expect(page.locator("text=/Invalid email|valid email address/i")).toBeVisible();
    });

    test("should show validation errors for weak password", async ({ page }) => {
      await page.click("text=Sign Up");

      await page.fill('input[name="email"]', "test@example.com");
      await page.fill('input[name="password"]', "weak");
      await page.click('button[type="submit"]');

      // Should show password strength error
      await expect(
        page.locator("text=/at least 8 characters|uppercase|number|special character/i")
      ).toBeVisible();
    });

    test("should show error for password mismatch", async ({ page }) => {
      await page.click("text=Sign Up");

      await page.fill('input[name="email"]', "test@example.com");
      await page.fill('input[name="password"]', "StrongPassword123!");
      await page.fill('input[name="confirmPassword"]', "DifferentPassword123!");
      await page.click('button[type="submit"]');

      // Should show password mismatch error
      await expect(page.locator("text=/Passwords do not match|must match/i")).toBeVisible();
    });

    test("should show error for existing email", async ({ page }) => {
      await page.click("text=Sign Up");

      // Try to register with existing email
      await page.fill('input[name="email"]', "existing@example.com");
      await page.fill('input[name="password"]', "StrongPassword123!");
      await page.fill('input[name="confirmPassword"]', "StrongPassword123!");
      await page.fill('input[name="fullName"]', "Test User");
      await page.check('input[name="acceptTerms"]');
      await page.click('button[type="submit"]');

      // Should show error that email already exists
      await expect(page.locator("text=/already exists|already registered/i")).toBeVisible();
    });
  });

  test.describe("User Login", () => {
    test("should login successfully with valid credentials", async ({ page }) => {
      // Navigate to login page
      await page.click("text=Sign In");
      await expect(page).toHaveURL(/.*login/);

      // Fill login form
      await page.fill('input[name="email"]', "test@example.com");
      await page.fill('input[name="password"]', "Password123!");

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*dashboard/);

      // Should see user info in header
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.click("text=Sign In");

      await page.fill('input[name="email"]', "test@example.com");
      await page.fill('input[name="password"]', "WrongPassword123!");
      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator("text=/Invalid credentials|incorrect/i")).toBeVisible();

      // Should remain on login page
      await expect(page).toHaveURL(/.*login/);
    });

    test("should show error for non-existent user", async ({ page }) => {
      await page.click("text=Sign In");

      await page.fill('input[name="email"]', "nonexistent@example.com");
      await page.fill('input[name="password"]', "Password123!");
      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator("text=/not found|does not exist/i")).toBeVisible();
    });

    test("should remember me on login", async ({ page }) => {
      await page.click("text=Sign In");

      await page.fill('input[name="email"]', "test@example.com");
      await page.fill('input[name="password"]', "Password123!");
      await page.check('input[name="rememberMe"]');
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL(/.*dashboard/);

      // Reload page
      await page.reload();

      // Should still be logged in
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });
  });

  test.describe("User Logout", () => {
    test.beforeEach(async ({ page }) => {
      // Login first
      await page.goto("/login");
      await page.fill('input[name="email"]', "test@example.com");
      await page.fill('input[name="password"]', "Password123!");
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test("should logout successfully", async ({ page }) => {
      // Click user menu
      await page.click('[data-testid="user-menu"]');

      // Click logout
      await page.click("text=Logout");

      // Should redirect to home or login page
      await expect(page).toHaveURL(/.*\/|login/);

      // Should not see user menu
      await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible();
    });

    test("should clear session after logout", async ({ page }) => {
      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click("text=Logout");

      // Try to navigate to protected route
      await page.goto("/dashboard");

      // Should redirect to login
      await expect(page).toHaveURL(/.*login/);
    });
  });

  test.describe("Password Reset", () => {
    test("should request password reset", async ({ page }) => {
      await page.goto("/login");

      // Click forgot password link
      await page.click("text=Forgot Password");
      await expect(page).toHaveURL(/.*forgot-password|reset-password/);

      // Enter email
      await page.fill('input[name="email"]', "test@example.com");
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator("text=/email sent|check your email/i")).toBeVisible();
    });

    test("should show error for non-existent email", async ({ page }) => {
      await page.goto("/forgot-password");

      await page.fill('input[name="email"]', "nonexistent@example.com");
      await page.click('button[type="submit"]');

      // Should show error
      await expect(page.locator("text=/not found|no account/i")).toBeVisible();
    });

    test("should reset password with valid token", async ({ page }) => {
      // Navigate to reset page with token
      await page.goto("/reset-password?token=valid-reset-token");

      // Enter new password
      await page.fill('input[name="password"]', "NewPassword123!");
      await page.fill('input[name="confirmPassword"]', "NewPassword123!");
      await page.click('button[type="submit"]');

      // Should show success and redirect to login
      await expect(page.locator("text=/password reset|successfully changed/i")).toBeVisible();
      await expect(page).toHaveURL(/.*login/);
    });

    test("should show error for invalid reset token", async ({ page }) => {
      await page.goto("/reset-password?token=invalid-token");

      await page.fill('input[name="password"]', "NewPassword123!");
      await page.fill('input[name="confirmPassword"]', "NewPassword123!");
      await page.click('button[type="submit"]');

      // Should show error
      await expect(page.locator("text=/invalid|expired/i")).toBeVisible();
    });
  });

  test.describe("Email Verification", () => {
    test("should verify email with valid token", async ({ page }) => {
      await page.goto("/verify-email?token=valid-verification-token");

      // Should show success message
      await expect(page.locator("text=/verified|success/i")).toBeVisible();

      // Should have button to continue to dashboard
      await page.click("text=Continue to Dashboard");
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test("should show error for invalid verification token", async ({ page }) => {
      await page.goto("/verify-email?token=invalid-token");

      // Should show error
      await expect(page.locator("text=/invalid|expired/i")).toBeVisible();
    });

    test("should resend verification email", async ({ page }) => {
      // Login with unverified account
      await page.goto("/login");
      await page.fill('input[name="email"]', "unverified@example.com");
      await page.fill('input[name="password"]', "Password123!");
      await page.click('button[type="submit"]');

      // Should see verification banner
      await expect(page.locator("text=/verify your email/i")).toBeVisible();

      // Click resend button
      await page.click("text=Resend Email");

      // Should show success message
      await expect(page.locator("text=/email sent/i")).toBeVisible();
    });
  });

  test.describe("Protected Routes", () => {
    test("should redirect to login for unauthenticated access", async ({ page }) => {
      // Try to access protected route
      await page.goto("/dashboard");

      // Should redirect to login
      await expect(page).toHaveURL(/.*login/);
    });

    test("should allow access to protected routes when authenticated", async ({ page }) => {
      // Login
      await page.goto("/login");
      await page.fill('input[name="email"]', "test@example.com");
      await page.fill('input[name="password"]', "Password123!");
      await page.click('button[type="submit"]');

      // Navigate to protected route
      await page.goto("/documents");
      await expect(page).toHaveURL(/.*documents/);

      // Should see content
      await expect(page.locator("h1")).toBeVisible();
    });

    test("should preserve redirect URL after login", async ({ page }) => {
      // Try to access specific protected route
      await page.goto("/documents/abc123");

      // Should redirect to login with return URL
      await expect(page).toHaveURL(/.*login/);

      // Login
      await page.fill('input[name="email"]', "test@example.com");
      await page.fill('input[name="password"]', "Password123!");
      await page.click('button[type="submit"]');

      // Should redirect back to original URL
      await expect(page).toHaveURL(/.*documents\/abc123/);
    });
  });

  test.describe("Session Management", () => {
    test("should maintain session across page reloads", async ({ page }) => {
      // Login
      await page.goto("/login");
      await page.fill('input[name="email"]', "test@example.com");
      await page.fill('input[name="password"]', "Password123!");
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/.*dashboard/);

      // Reload page
      await page.reload();

      // Should still be authenticated
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test("should handle expired token", async ({ page, context }) => {
      // Login
      await page.goto("/login");
      await page.fill('input[name="email"]', "test@example.com");
      await page.fill('input[name="password"]', "Password123!");
      await page.click('button[type="submit"]');

      // Simulate token expiration by clearing cookies
      await context.clearCookies();
      localStorage.clear();

      // Try to make authenticated request
      await page.goto("/documents");

      // Should redirect to login
      await expect(page).toHaveURL(/.*login/);
    });
  });
});
