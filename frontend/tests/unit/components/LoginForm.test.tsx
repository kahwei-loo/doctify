import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "@/features/auth/components/LoginForm";
import { renderWithProviders } from "../../utils/renderWithProviders";

// --- Mocks ---

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      pathname: "/auth/login",
      state: null,
      search: "",
      hash: "",
      key: "test",
    }),
  };
});

const mockUnwrap = vi.fn();
const mockLoginTrigger = vi.fn(() => ({ unwrap: mockUnwrap }));
let mockIsLoading = false;

vi.mock("@/store/api/authApi", async () => {
  const actual = await vi.importActual("@/store/api/authApi");
  return {
    ...actual,
    useLoginMutation: () => [mockLoginTrigger, { isLoading: mockIsLoading }],
  };
});

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import toast from "react-hot-toast";

// --- Helpers ---

function renderLoginForm() {
  return renderWithProviders(<LoginForm />);
}

function fillForm(email: string, password: string) {
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { name: "email", value: email },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { name: "password", value: password },
  });
}

function submitForm() {
  const form = screen.getByRole("button", { name: /sign in/i }).closest("form")!;
  fireEvent.submit(form);
}

// --- Tests ---

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockUnwrap.mockReset();
    mockLoginTrigger.mockImplementation(() => ({ unwrap: mockUnwrap }));
  });

  describe("Initial Rendering", () => {
    it("renders email input", () => {
      renderLoginForm();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it("renders password input", () => {
      renderLoginForm();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
    });

    it("renders Sign in button", () => {
      renderLoginForm();
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });

    it("renders demo mode button", () => {
      renderLoginForm();
      expect(screen.getByRole("button", { name: /try demo/i })).toBeInTheDocument();
    });

    it("renders register link", () => {
      renderLoginForm();
      expect(screen.getByText(/create an account/i)).toBeInTheDocument();
    });

    it("renders forgot password link", () => {
      renderLoginForm();
      expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    });

    it("starts with empty email and password fields", () => {
      renderLoginForm();
      expect(screen.getByLabelText(/email/i)).toHaveValue("");
      expect(screen.getByLabelText("Password")).toHaveValue("");
    });

    it("password field has type password by default", () => {
      renderLoginForm();
      expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    });
  });

  describe("Form Input", () => {
    it("updates email value on change", () => {
      renderLoginForm();
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { name: "email", value: "test@example.com" },
      });
      expect(screen.getByLabelText(/email/i)).toHaveValue("test@example.com");
    });

    it("updates password value on change", () => {
      renderLoginForm();
      fireEvent.change(screen.getByLabelText("Password"), {
        target: { name: "password", value: "secret123" },
      });
      expect(screen.getByLabelText("Password")).toHaveValue("secret123");
    });
  });

  describe("Password Visibility Toggle", () => {
    it("toggles password input type to text when show password is clicked", async () => {
      renderLoginForm();
      const toggleBtn = screen.getByRole("button", {
        name: /show password/i,
      });
      await userEvent.click(toggleBtn);
      expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
    });

    it("toggles back to password type on second click", async () => {
      renderLoginForm();
      const toggleBtn = screen.getByRole("button", {
        name: /show password/i,
      });
      await userEvent.click(toggleBtn);
      const hideBtn = screen.getByRole("button", { name: /hide password/i });
      await userEvent.click(hideBtn);
      expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    });

    it("has correct aria-label for show state", () => {
      renderLoginForm();
      expect(screen.getByRole("button", { name: /show password/i })).toHaveAttribute(
        "aria-pressed",
        "false"
      );
    });

    it("has correct aria-pressed when password is visible", async () => {
      renderLoginForm();
      const toggleBtn = screen.getByRole("button", {
        name: /show password/i,
      });
      await userEvent.click(toggleBtn);
      expect(screen.getByRole("button", { name: /hide password/i })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });
  });

  describe("Zod Validation", () => {
    it("shows error for invalid email format", async () => {
      renderLoginForm();
      fillForm("not-an-email", "password123");
      submitForm();

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });
    });

    it("shows error for empty password", async () => {
      renderLoginForm();
      fillForm("test@example.com", "");
      submitForm();

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it("does not call login mutation on invalid form", async () => {
      renderLoginForm();
      fillForm("bad-email", "");
      submitForm();

      await waitFor(() => {
        expect(mockLoginTrigger).not.toHaveBeenCalled();
      });
    });

    it("clears field error when user starts typing", async () => {
      renderLoginForm();
      fillForm("bad-email", "pass");
      submitForm();

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email/i)).toBeInTheDocument();
      });

      // Start typing in email field — error should clear
      fireEvent.change(screen.getByLabelText(/email/i), {
        target: { name: "email", value: "f" },
      });

      expect(screen.queryByText(/please enter a valid email/i)).not.toBeInTheDocument();
    });
  });

  describe("Successful Login", () => {
    it("calls login mutation with form data", async () => {
      mockUnwrap.mockResolvedValue({
        data: {
          user: { user_id: "1", email: "test@example.com" },
          access_token: "token",
          refresh_token: "refresh",
        },
      });

      renderLoginForm();
      fillForm("test@example.com", "Password1");
      submitForm();

      await waitFor(() => {
        expect(mockLoginTrigger).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "Password1",
        });
      });
    });

    it("shows success toast on login", async () => {
      mockUnwrap.mockResolvedValue({});
      renderLoginForm();
      fillForm("test@example.com", "Password1");
      submitForm();

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith("Welcome back!");
      });
    });

    it("navigates to /dashboard by default on success", async () => {
      mockUnwrap.mockResolvedValue({});
      renderLoginForm();
      fillForm("test@example.com", "Password1");
      submitForm();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard", {
          replace: true,
        });
      });
    });
  });

  describe("Error Handling", () => {
    it("shows error toast on API error", async () => {
      mockUnwrap.mockRejectedValue({
        data: { detail: "Invalid credentials" },
      });

      renderLoginForm();
      fillForm("test@example.com", "wrongpass");
      submitForm();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Invalid credentials");
      });
    });

    it('sets email field error when error contains "email"', async () => {
      mockUnwrap.mockRejectedValue({
        data: { detail: "Email not found" },
      });

      renderLoginForm();
      fillForm("test@example.com", "password");
      submitForm();

      await waitFor(() => {
        expect(screen.getByText("Email not found")).toBeInTheDocument();
      });
    });

    it('sets password field error when error contains "password"', async () => {
      mockUnwrap.mockRejectedValue({
        data: { detail: "Incorrect password" },
      });

      renderLoginForm();
      fillForm("test@example.com", "wrongpass");
      submitForm();

      await waitFor(() => {
        expect(screen.getByText("Incorrect password")).toBeInTheDocument();
      });
    });

    it("shows generic error message when no detail provided", async () => {
      mockUnwrap.mockRejectedValue({});

      renderLoginForm();
      fillForm("test@example.com", "password");
      submitForm();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Login failed. Please try again.");
      });
    });
  });

  describe("Loading State", () => {
    it("disables email input when loading", () => {
      mockIsLoading = true;
      renderLoginForm();
      expect(screen.getByLabelText(/email/i)).toBeDisabled();
    });

    it("disables password input when loading", () => {
      mockIsLoading = true;
      renderLoginForm();
      expect(screen.getByLabelText("Password")).toBeDisabled();
    });

    it("disables submit button when loading", () => {
      mockIsLoading = true;
      renderLoginForm();
      expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
    });

    it('shows "Signing in..." text when loading', () => {
      mockIsLoading = true;
      renderLoginForm();
      expect(screen.getByText(/signing in/i)).toBeInTheDocument();
    });

    it("disables demo button when loading", () => {
      mockIsLoading = true;
      renderLoginForm();
      expect(screen.getByRole("button", { name: /try demo/i })).toBeDisabled();
    });
  });

  describe("Demo Mode", () => {
    it("navigates to /dashboard when demo button is clicked", async () => {
      renderLoginForm();
      await userEvent.click(screen.getByRole("button", { name: /try demo/i }));

      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    it("shows success toast when entering demo mode", async () => {
      renderLoginForm();
      await userEvent.click(screen.getByRole("button", { name: /try demo/i }));

      expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Demo Mode Active"));
    });
  });
});
