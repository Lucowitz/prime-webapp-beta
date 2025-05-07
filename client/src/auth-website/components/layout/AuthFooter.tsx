import React from 'react';

const AuthFooter = () => {
  return (
    <footer className="bg-[#1a0f2e] border-t border-[#00FFD1] border-opacity-20 py-4">
      <div className="container mx-auto text-center text-sm text-gray-400">
        © {new Date().getFullYear()} Prime Genesis Authenticated Interface
      </div>
    </footer>
  );
};

export default AuthFooter;
