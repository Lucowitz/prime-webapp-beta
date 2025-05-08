import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from "@/hooks/useLanguage";
import { useDemo } from "@/context/DemoContext";
import PrimeGenesisLogo from "@/assets/icons/PrimeGenesisLogo";

interface AuthedLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const AuthedLayout = ({ children, onLogout }: AuthedLayoutProps) => {
  const { t } = useLanguage();
  const { isDemoMode, demoUserType } = useDemo();

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Authenticated Header */}
      <header className="fixed w-full bg-[#1a0f2e] bg-opacity-95 backdrop-blur-sm z-50 border-b border-[#00FFD1] border-opacity-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link to="/authed" className="flex items-center">
              <div className="flex items-center space-x-2">
                <PrimeGenesisLogo />
                <div className="flex items-center">
                  <span className="font-heading font-bold text-xl md:text-2xl text-white">Prime Genesis</span>
                  <span className="ml-2 px-2 py-1 bg-[#00FFD1] text-black text-sm font-medium rounded">Authenticated</span>
                </div>
              </div>
            </Link>

            <div className="flex items-center space-x-4">
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
              >
                {t("nav.logout")}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20">
        {children}
      </main>
    </div>
  );
};

export default AuthedLayout;
