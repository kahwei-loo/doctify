/**
 * Application Router
 *
 * React Router configuration with lazy loading and code splitting.
 */

import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Loading } from '../shared/components';
import { useAppSelector } from '../store';
import { selectIsAuthenticated, selectAuthLoading } from '../store/selectors/authSelectors';
import { useGetCurrentUserQuery } from '../store/api/authApi';

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('../pages/LoginPage'));
const RegisterPage = lazy(() => import('../pages/RegisterPage'));
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const DocumentsPage = lazy(() => import('../pages/DocumentsPage'));
const DocumentDetailPage = lazy(() => import('../pages/DocumentDetailPage'));
const ProjectsPage = lazy(() => import('../pages/ProjectsPage'));
const ProjectDetailPage = lazy(() => import('../pages/ProjectDetailPage'));
const InsightsPage = lazy(() => import('../pages/InsightsPage'));
const KnowledgeBasePage = lazy(() => import('../pages/KnowledgeBasePage'));
const RAGPage = lazy(() => import('../pages/RAGPage'));
const ChatPage = lazy(() => import('../pages/ChatPage'));
const AssistantsPage = lazy(() => import('../pages/AssistantsPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const TemplatesPage = lazy(() => import('../pages/TemplatesPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));
const PublicChatDemo = lazy(() => import('../pages/PublicChatDemo'));

// Layouts
const AuthLayout = lazy(() => import('../layouts/AuthLayout'));
const MainLayout = lazy(() => import('../layouts/MainLayout'));

/**
 * Loading fallback component
 */
const PageLoader: React.FC = () => (
  <Loading size="large" message="Loading page..." fullScreen />
);

/**
 * Protected route wrapper
 * Uses Redux auth state with backend verification for security
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const authLoading = useAppSelector(selectAuthLoading);
  const hasToken = localStorage.getItem('access_token') !== null;

  // Verify token with backend when we have a token but not authenticated in Redux
  const { isLoading: isVerifying, isError } = useGetCurrentUserQuery(undefined, {
    skip: isAuthenticated || !hasToken,
  });

  // Show loading while verifying authentication
  if (authLoading || (hasToken && isVerifying && !isAuthenticated)) {
    return <Loading size="large" message="Verifying authentication..." fullScreen />;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated && (!hasToken || isError)) {
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
};

/**
 * Router configuration
 */
const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={<PageLoader />}>
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      </Suspense>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<PageLoader />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: 'documents',
        element: (
          <Suspense fallback={<PageLoader />}>
            <DocumentsPage />
          </Suspense>
        ),
      },
      {
        path: 'documents/:documentId',
        element: (
          <Suspense fallback={<PageLoader />}>
            <DocumentDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'projects',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProjectsPage />
          </Suspense>
        ),
      },
      {
        path: 'projects/:projectId',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProjectDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'insights',
        element: (
          <Suspense fallback={<PageLoader />}>
            <InsightsPage />
          </Suspense>
        ),
      },
      {
        path: 'knowledge-base',
        element: (
          <Suspense fallback={<PageLoader />}>
            <KnowledgeBasePage />
          </Suspense>
        ),
      },
      {
        path: 'knowledge-base/:kbId',
        element: (
          <Suspense fallback={<PageLoader />}>
            <KnowledgeBasePage />
          </Suspense>
        ),
      },
      {
        path: 'rag',
        element: (
          <Suspense fallback={<PageLoader />}>
            <RAGPage />
          </Suspense>
        ),
      },
      {
        path: 'chat',
        element: (
          <Suspense fallback={<PageLoader />}>
            <ChatPage />
          </Suspense>
        ),
      },
      {
        path: 'assistants',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AssistantsPage />
          </Suspense>
        ),
      },
      {
        path: 'assistants/:assistantId',
        element: (
          <Suspense fallback={<PageLoader />}>
            <AssistantsPage />
          </Suspense>
        ),
      },
      {
        path: 'settings',
        element: (
          <Suspense fallback={<PageLoader />}>
            <SettingsPage />
          </Suspense>
        ),
      },
      {
        path: 'templates',
        element: (
          <Suspense fallback={<PageLoader />}>
            <TemplatesPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/auth',
    element: (
      <Suspense fallback={<PageLoader />}>
        <AuthLayout />
      </Suspense>
    ),
    children: [
      {
        path: 'login',
        element: (
          <Suspense fallback={<PageLoader />}>
            <LoginPage />
          </Suspense>
        ),
      },
      {
        path: 'register',
        element: (
          <Suspense fallback={<PageLoader />}>
            <RegisterPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/login',
    element: <Navigate to="/auth/login" replace />,
  },
  {
    path: '/register',
    element: <Navigate to="/auth/register" replace />,
  },
  // Public chat widget demo (no authentication required)
  {
    path: '/public-chat-demo',
    element: (
      <Suspense fallback={<PageLoader />}>
        <PublicChatDemo />
      </Suspense>
    ),
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<PageLoader />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
]);

/**
 * Router provider component
 */
export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};
