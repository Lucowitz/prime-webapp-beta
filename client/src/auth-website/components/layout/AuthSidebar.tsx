import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Wallet,
  Coins,
  Settings,
  User
} from 'lucide-react';
import path from 'path';

const AuthSidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/authed', icon: <LayoutDashboard />, label: 'Dashboard' },
    { path: '/authed/wallet', icon: <Wallet />, label: 'Wallet' },
    { path: '/authed/settings', icon: <Settings />, label: 'Settings' },
    { path: '/authed/profile', icon: <User />, label: 'Profile' },
    {path: '/authed/explorer', icon: <Coins />, label: 'Token Explorer' },
  ];

  return (
    <aside className="w-64 min-h-screen bg-[#1a0f2e] border-r border-[#00FFD1] border-opacity-20 pt-16">
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-[#00FFD1] bg-opacity-10 text-[#00FFD1]'
                    : 'text-gray-400 hover:bg-[#00FFD1] hover:bg-opacity-5 hover:text-[#00FFD1]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default AuthSidebar;
