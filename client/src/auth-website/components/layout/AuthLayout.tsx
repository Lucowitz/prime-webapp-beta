import React from 'react';
import AuthHeader from './AuthHeader';
import AuthSidebar from './AuthSidebar';
import AuthFooter from './AuthFooter';

interface AuthLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const AuthLayout = ({ children, onLogout }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      <AuthHeader onLogout={onLogout} />
      <div className="flex min-h-screen pt-16">
        <AuthSidebar />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
      <AuthFooter />
    </div>
  );
};

export default AuthLayout;
