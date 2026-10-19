import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../ui';
import type { Role } from '../../types/auth';

export const FullPageLoader: React.FC<{ label?: string }> = ({ label = 'Loading your workspace…' }) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#FAF5E5]">
    <Spinner className="h-8 w-8 text-[#D09A40]" />
    <p className="text-sm font-medium text-slate-600">{label}</p>
  </div>
);

export const ProtectedRoute: React.FC<{ role?: Role; children: React.ReactNode }> = ({ role, children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'super_admin' ? '/admin' : '/dashboard'} replace />;
  }
  return <>{children}</>;
};
