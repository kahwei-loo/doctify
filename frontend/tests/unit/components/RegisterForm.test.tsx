import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegisterForm from '@/features/auth/components/RegisterForm';
import { renderWithProviders } from '../../utils/renderWithProviders';

// --- Mocks ---

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUnwrap = vi.fn();
const mockRegisterTrigger = vi.fn(() => ({ unwrap: mockUnwrap }));
let mockIsLoading = false;

vi.mock('@/store/api/authApi', async () => {
  const actual = await vi.importActual('@/store/api/authApi');
  return {
    ...actual,
    useRegisterMutation: () => [mockRegisterTrigger, { isLoading: mockIsLoading }],
  };
});

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import toast from 'react-hot-toast';

// --- Helpers ---

function renderRegisterForm() {
  return renderWithProviders(<RegisterForm />);
}

function fillForm(
  name: string,
  email: string,
  password: string,
  confirmPassword: string
) {
  fireEvent.change(screen.getByLabelText(/full name/i), {
    target: { name: 'full_name', value: name },
  });
  fireEvent.change(screen.getByLabelText(/^email$/i), {
    target: { name: 'email', value: email },
  });
  fireEvent.change(screen.getByLabelText('Password'), {
    target: { name: 'password', value: password },
  });
  fireEvent.change(screen.getByLabelText('Confirm Password'), {
    target: { name: 'confirmPassword', value: confirmPassword },
  });
}

function submitForm() {
  const form = screen.getByRole('button', { name: /create account/i }).closest('form')!;
  fireEvent.submit(form);
}

const VALID_PASSWORD = 'StrongPass1';

// --- Tests ---

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockUnwrap.mockReset();
    mockRegisterTrigger.mockImplementation(() => ({ unwrap: mockUnwrap }));
  });

  describe('Initial Rendering', () => {
    it('renders full name input', () => {
      renderRegisterForm();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    });

    it('renders email input', () => {
      renderRegisterForm();
      expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    });

    it('renders password input', () => {
      renderRegisterForm();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('renders confirm password input', () => {
      renderRegisterForm();
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    });

    it('renders Create account button', () => {
      renderRegisterForm();
      expect(
        screen.getByRole('button', { name: /create account/i })
      ).toBeInTheDocument();
    });

    it('renders sign in link', () => {
      renderRegisterForm();
      expect(screen.getByText(/sign in/i)).toBeInTheDocument();
    });

    it('renders terms and privacy links', () => {
      renderRegisterForm();
      expect(screen.getByText(/terms of service/i)).toBeInTheDocument();
      expect(screen.getByText(/privacy policy/i)).toBeInTheDocument();
    });

    it('starts with all fields empty', () => {
      renderRegisterForm();
      expect(screen.getByLabelText(/full name/i)).toHaveValue('');
      expect(screen.getByLabelText(/^email$/i)).toHaveValue('');
      expect(screen.getByLabelText('Password')).toHaveValue('');
      expect(screen.getByLabelText('Confirm Password')).toHaveValue('');
    });
  });

  describe('Form Input', () => {
    it('updates full name value on change', () => {
      renderRegisterForm();
      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { name: 'full_name', value: 'John Doe' },
      });
      expect(screen.getByLabelText(/full name/i)).toHaveValue('John Doe');
    });

    it('updates email value on change', () => {
      renderRegisterForm();
      fireEvent.change(screen.getByLabelText(/^email$/i), {
        target: { name: 'email', value: 'john@test.com' },
      });
      expect(screen.getByLabelText(/^email$/i)).toHaveValue('john@test.com');
    });

    it('clears field error when user starts typing', async () => {
      renderRegisterForm();
      fillForm('', 'test@test.com', VALID_PASSWORD, VALID_PASSWORD);
      submitForm();

      await waitFor(() => {
        expect(
          screen.getByText(/name must be at least 2 characters/i)
        ).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/full name/i), {
        target: { name: 'full_name', value: 'J' },
      });

      expect(
        screen.queryByText(/name must be at least 2 characters/i)
      ).not.toBeInTheDocument();
    });
  });

  describe('Password Visibility', () => {
    it('toggles password visibility independently', async () => {
      renderRegisterForm();
      const [showPwd] = screen.getAllByRole('button', {
        name: /show password/i,
      });
      await userEvent.click(showPwd);
      expect(screen.getByLabelText('Password')).toHaveAttribute(
        'type',
        'text'
      );
      // Confirm password should still be hidden
      expect(screen.getByLabelText('Confirm Password')).toHaveAttribute(
        'type',
        'password'
      );
    });

    it('toggles confirm password visibility independently', async () => {
      renderRegisterForm();
      const showBtns = screen.getAllByRole('button', {
        name: /show.*password/i,
      });
      // Click the second toggle (confirm password)
      await userEvent.click(showBtns[1]);
      expect(screen.getByLabelText('Confirm Password')).toHaveAttribute(
        'type',
        'text'
      );
      // Password should still be hidden
      expect(screen.getByLabelText('Password')).toHaveAttribute(
        'type',
        'password'
      );
    });

    it('sets aria-pressed correctly for password toggle', async () => {
      renderRegisterForm();
      const [showPwd] = screen.getAllByRole('button', {
        name: /show password/i,
      });
      expect(showPwd).toHaveAttribute('aria-pressed', 'false');
      await userEvent.click(showPwd);
      expect(
        screen.getByRole('button', { name: /hide password$/i })
      ).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('Password Strength Indicator', () => {
    it('does not show strength indicator when password is empty', () => {
      renderRegisterForm();
      expect(screen.queryByText(/password strength/i)).not.toBeInTheDocument();
    });

    it('shows Weak for a short lowercase-only password', () => {
      renderRegisterForm();
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { name: 'password', value: 'abcd' },
      });
      expect(screen.getByText('Weak')).toBeInTheDocument();
    });

    it('shows Fair for an 8-char password with lowercase and number', () => {
      renderRegisterForm();
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { name: 'password', value: 'abcdefg1' },
      });
      expect(screen.getByText('Fair')).toBeInTheDocument();
    });

    it('shows Good for a 12-char password with mixed case and number', () => {
      renderRegisterForm();
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { name: 'password', value: 'Abcdefghij1k' },
      });
      expect(screen.getByText('Good')).toBeInTheDocument();
    });

    it('shows Strong for a long password with all character types', () => {
      renderRegisterForm();
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { name: 'password', value: 'MyP@ssw0rd123' },
      });
      expect(screen.getByText('Strong')).toBeInTheDocument();
    });

    it('updates dynamically as password changes', () => {
      renderRegisterForm();
      const pwdInput = screen.getByLabelText('Password');

      fireEvent.change(pwdInput, {
        target: { name: 'password', value: 'ab' },
      });
      expect(screen.getByText('Weak')).toBeInTheDocument();

      fireEvent.change(pwdInput, {
        target: { name: 'password', value: 'MyP@ssw0rd123' },
      });
      expect(screen.getByText('Strong')).toBeInTheDocument();
    });
  });

  describe('Zod Validation', () => {
    it('shows error for name shorter than 2 characters', async () => {
      renderRegisterForm();
      fillForm('A', 'test@test.com', VALID_PASSWORD, VALID_PASSWORD);
      submitForm();

      await waitFor(() => {
        expect(
          screen.getByText(/name must be at least 2 characters/i)
        ).toBeInTheDocument();
      });
    });

    it('shows error for invalid email format', async () => {
      renderRegisterForm();
      fillForm('John Doe', 'not-email', VALID_PASSWORD, VALID_PASSWORD);
      submitForm();

      await waitFor(() => {
        expect(
          screen.getByText(/please enter a valid email/i)
        ).toBeInTheDocument();
      });
    });

    it('shows error for password shorter than 8 characters', async () => {
      renderRegisterForm();
      fillForm('John Doe', 'test@test.com', 'Ab1', 'Ab1');
      submitForm();

      await waitFor(() => {
        expect(
          screen.getByText(/password must be at least 8 characters/i)
        ).toBeInTheDocument();
      });
    });

    it('shows error for password without uppercase letter', async () => {
      renderRegisterForm();
      fillForm('John Doe', 'test@test.com', 'abcdefg1', 'abcdefg1');
      submitForm();

      await waitFor(() => {
        expect(
          screen.getByText(/must contain at least one uppercase/i)
        ).toBeInTheDocument();
      });
    });

    it('shows error for password without lowercase letter', async () => {
      renderRegisterForm();
      fillForm('John Doe', 'test@test.com', 'ABCDEFG1', 'ABCDEFG1');
      submitForm();

      await waitFor(() => {
        expect(
          screen.getByText(/must contain at least one lowercase/i)
        ).toBeInTheDocument();
      });
    });

    it('shows error for password without number', async () => {
      renderRegisterForm();
      fillForm('John Doe', 'test@test.com', 'Abcdefgh', 'Abcdefgh');
      submitForm();

      await waitFor(() => {
        expect(
          screen.getByText(/must contain at least one number/i)
        ).toBeInTheDocument();
      });
    });

    it('shows error when passwords do not match', async () => {
      renderRegisterForm();
      fillForm('John Doe', 'test@test.com', VALID_PASSWORD, 'DifferentPass1');
      submitForm();

      await waitFor(() => {
        expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
      });
    });

    it('does not call register mutation on invalid form', async () => {
      renderRegisterForm();
      fillForm('', '', '', '');
      submitForm();

      await waitFor(() => {
        expect(mockRegisterTrigger).not.toHaveBeenCalled();
      });
    });

    it('shows only the first error per field', async () => {
      renderRegisterForm();
      // Password "ab" violates min length, uppercase, and number rules
      fillForm('John Doe', 'test@test.com', 'ab', 'ab');
      submitForm();

      await waitFor(() => {
        // Should show min-length error first, not all three
        expect(
          screen.getByText(/password must be at least 8 characters/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Successful Registration', () => {
    it('calls register mutation without confirmPassword', async () => {
      mockUnwrap.mockResolvedValue({});
      renderRegisterForm();
      fillForm('John Doe', 'john@test.com', VALID_PASSWORD, VALID_PASSWORD);
      submitForm();

      await waitFor(() => {
        expect(mockRegisterTrigger).toHaveBeenCalledWith({
          email: 'john@test.com',
          password: VALID_PASSWORD,
          full_name: 'John Doe',
        });
      });
    });

    it('shows success toast on registration', async () => {
      mockUnwrap.mockResolvedValue({});
      renderRegisterForm();
      fillForm('John Doe', 'john@test.com', VALID_PASSWORD, VALID_PASSWORD);
      submitForm();

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Account created successfully!'
        );
      });
    });

    it('navigates to /dashboard on success', async () => {
      mockUnwrap.mockResolvedValue({});
      renderRegisterForm();
      fillForm('John Doe', 'john@test.com', VALID_PASSWORD, VALID_PASSWORD);
      submitForm();

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
          replace: true,
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error toast on API error', async () => {
      mockUnwrap.mockRejectedValue({
        data: { detail: 'Registration failed' },
      });

      renderRegisterForm();
      fillForm('John Doe', 'john@test.com', VALID_PASSWORD, VALID_PASSWORD);
      submitForm();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Registration failed');
      });
    });

    it('sets email field error when error message contains "email"', async () => {
      mockUnwrap.mockRejectedValue({
        data: { detail: 'Email already registered' },
      });

      renderRegisterForm();
      fillForm('John Doe', 'john@test.com', VALID_PASSWORD, VALID_PASSWORD);
      submitForm();

      await waitFor(() => {
        expect(
          screen.getByText('Email already registered')
        ).toBeInTheDocument();
      });
    });

    it('shows generic error when no detail is provided', async () => {
      mockUnwrap.mockRejectedValue({});

      renderRegisterForm();
      fillForm('John Doe', 'john@test.com', VALID_PASSWORD, VALID_PASSWORD);
      submitForm();

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Registration failed. Please try again.'
        );
      });
    });
  });

  describe('Loading State', () => {
    it('disables all inputs when loading', () => {
      mockIsLoading = true;
      renderRegisterForm();
      expect(screen.getByLabelText(/full name/i)).toBeDisabled();
      expect(screen.getByLabelText(/^email$/i)).toBeDisabled();
      expect(screen.getByLabelText('Password')).toBeDisabled();
      expect(screen.getByLabelText('Confirm Password')).toBeDisabled();
    });

    it('disables submit button when loading', () => {
      mockIsLoading = true;
      renderRegisterForm();
      expect(
        screen.getByRole('button', { name: /creating account/i })
      ).toBeDisabled();
    });

    it('shows "Creating account..." text when loading', () => {
      mockIsLoading = true;
      renderRegisterForm();
      expect(screen.getByText(/creating account/i)).toBeInTheDocument();
    });
  });
});
