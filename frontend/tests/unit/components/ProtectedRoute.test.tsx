import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { ProtectedRoute, LandingGuard } from '@/app/Router';
import { renderWithProviders } from '../../utils/renderWithProviders';

// --- Mocks ---

// Mock Navigate to capture redirect props
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => (
      <div data-testid="navigate" data-to={to}>
        Redirecting to {to}
      </div>
    ),
  };
});

// Mock useGetCurrentUserQuery — return controlled state
let mockCurrentUserState = {
  isLoading: false,
  isError: false,
  data: undefined as any,
};

vi.mock('@/store/api/authApi', async () => {
  const actual = await vi.importActual('@/store/api/authApi');
  return {
    ...actual,
    useGetCurrentUserQuery: () => mockCurrentUserState,
  };
});

// Mock lazy-loaded LandingPage for LandingGuard tests
vi.mock('@/pages/landing', () => ({
  default: () => <div data-testid="landing-page">Landing Page</div>,
}));

// Mock Loading component used by ProtectedRoute and PageLoader
vi.mock('@/shared/components', () => ({
  Loading: ({ message }: { message?: string }) => (
    <div data-testid="loading">{message}</div>
  ),
}));

// --- Helpers ---

function renderProtectedRoute(preloadedState = {}) {
  return renderWithProviders(
    <ProtectedRoute>
      <div data-testid="protected-content">Protected Content</div>
    </ProtectedRoute>,
    { preloadedState }
  );
}

const authenticatedState = {
  auth: {
    user: { user_id: '1', email: 'test@test.com', full_name: 'Test' },
    tokens: { access_token: 'token', refresh_token: 'refresh', token_type: 'bearer' },
    isAuthenticated: true,
    isLoading: false,
    error: null,
  },
  demo: { isActive: false, enteredAt: null },
};

const demoState = {
  auth: {
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  },
  demo: { isActive: true, enteredAt: '2026-01-01T00:00:00Z' },
};

const unauthenticatedState = {
  auth: {
    user: null,
    tokens: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  },
  demo: { isActive: false, enteredAt: null },
};

// --- Tests ---

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockCurrentUserState = {
      isLoading: false,
      isError: false,
      data: undefined,
    };
  });

  describe('Demo Mode', () => {
    it('renders children when demo mode is active', () => {
      renderProtectedRoute(demoState);
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('renders children in demo mode regardless of auth state', () => {
      renderProtectedRoute({
        ...demoState,
        auth: {
          ...unauthenticatedState.auth,
        },
      });
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('does not redirect in demo mode', () => {
      renderProtectedRoute(demoState);
      expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated User', () => {
    it('renders children when user is authenticated', () => {
      renderProtectedRoute(authenticatedState);
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('does not redirect authenticated users', () => {
      renderProtectedRoute(authenticatedState);
      expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });
  });

  describe('Token Verification', () => {
    it('shows loading state while verifying token', () => {
      localStorage.setItem('access_token', 'some-token');
      mockCurrentUserState = { isLoading: true, isError: false, data: undefined };

      renderProtectedRoute(unauthenticatedState);
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      expect(screen.getByText(/verifying authentication/i)).toBeInTheDocument();
    });

    it('redirects to / when token verification fails', () => {
      localStorage.setItem('access_token', 'expired-token');
      mockCurrentUserState = { isLoading: false, isError: true, data: undefined };

      renderProtectedRoute(unauthenticatedState);
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
    });
  });

  describe('Unauthenticated User', () => {
    it('redirects to / when not authenticated and no token', () => {
      renderProtectedRoute(unauthenticatedState);
      expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
    });

    it('does not render protected content when unauthenticated', () => {
      renderProtectedRoute(unauthenticatedState);
      expect(
        screen.queryByTestId('protected-content')
      ).not.toBeInTheDocument();
    });
  });

  describe('Auth Loading State', () => {
    it('shows loading when authLoading is true', () => {
      renderProtectedRoute({
        auth: {
          ...unauthenticatedState.auth,
          isLoading: true,
        },
        demo: { isActive: false, enteredAt: null },
      });
      expect(screen.getByTestId('loading')).toBeInTheDocument();
    });
  });
});

describe('LandingGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Redirect When Authenticated', () => {
    it('redirects to /dashboard when user is authenticated', () => {
      renderWithProviders(<LandingGuard />, {
        preloadedState: authenticatedState,
      });
      expect(screen.getByTestId('navigate')).toHaveAttribute(
        'data-to',
        '/dashboard'
      );
    });

    it('redirects to /dashboard when demo mode is active', () => {
      renderWithProviders(<LandingGuard />, { preloadedState: demoState });
      expect(screen.getByTestId('navigate')).toHaveAttribute(
        'data-to',
        '/dashboard'
      );
    });

    it('redirects to /dashboard when access_token exists in localStorage', () => {
      localStorage.setItem('access_token', 'some-token');
      renderWithProviders(<LandingGuard />, {
        preloadedState: unauthenticatedState,
      });
      expect(screen.getByTestId('navigate')).toHaveAttribute(
        'data-to',
        '/dashboard'
      );
    });
  });

  describe('Show Landing Page', () => {
    it('does not redirect when fully unauthenticated', () => {
      renderWithProviders(<LandingGuard />, {
        preloadedState: unauthenticatedState,
      });
      expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    });

    it('renders landing page content when unauthenticated', async () => {
      renderWithProviders(<LandingGuard />, {
        preloadedState: unauthenticatedState,
      });
      // The lazy-loaded LandingPage is mocked to render a div
      expect(
        await screen.findByTestId('landing-page')
      ).toBeInTheDocument();
    });
  });
});
