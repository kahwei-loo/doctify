import React from 'react';
import { Outlet } from 'react-router-dom';

/**
 * AuthLayout - Layout for authentication pages (login, register)
 * Provides a clean, centered layout without sidebar/header
 */
const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  );
};

export default AuthLayout;
