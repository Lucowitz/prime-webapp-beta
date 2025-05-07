import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AuthLayout from './components/layout/AuthLayout';
import Dashboard from './pages/Dashboard';
import Wallet from './pages/Wallet';
import TokenManager from './pages/TokenManager';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

interface AuthRootProps {
  onLogout: () => void;
}

const AuthRoot = ({ onLogout }: AuthRootProps) => {
  return (
    <AuthLayout onLogout={onLogout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/tokens" element={<TokenManager />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </AuthLayout>
  );
};

export default AuthRoot;
