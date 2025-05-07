import React from 'react';
import { Link } from 'react-router-dom';
import PrimeGenesisLogo from "@/assets/icons/PrimeGenesisLogo";
import { Button } from "@/components/ui/button";

interface AuthHeaderProps {
  onLogout: () => void;
}

const AuthHeader = ({ onLogout }: AuthHeaderProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-[#1a0f2e] border-b border-[#00FFD1] border-opacity-20 z-50">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center space-x-3">
          <PrimeGenesisLogo />
          <div className="flex items-center">
            <span className="font-heading font-bold text-xl text-white">Prime Genesis</span>
            <span className="ml-2 px-2 py-1 bg-[#00FFD1] text-black text-sm font-medium rounded">Authenticated</span>
          </div>
        </div>
        <Button onClick={onLogout} variant="destructive">Logout</Button>
      </div>
    </header>
  );
};

export default AuthHeader;
