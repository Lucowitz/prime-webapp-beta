// client/src/components/layout/Header.tsx

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom"; // Importato useNavigate
import PrimeGenesisLogo from "@/assets/icons/PrimeGenesisLogo";
import { useLanguage } from "@/hooks/useLanguage";
import { useDemo } from "@/context/DemoContext";
import { Button as ShadCNButton } from "@/components/ui/button"; // Assumendo che questo sia il tuo bottone UI

interface HeaderProps {
  onLogout?: () => void;
  isAuthenticated: boolean;
}

const Header = ({ onLogout, isAuthenticated }: HeaderProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation(); // CORRETTO: useLocation restituisce un oggetto
  const navigate = useNavigate(); // AGGIUNTO: per la navigazione programmatica
  const { t, language, setLanguage } = useLanguage();
  const { isDemoMode, demoUserType, toggleDemoMode } = useDemo();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const navigationLinks = isDemoMode && demoUserType === "company"
    ? [
        { path: "/about", text: t("nav.about") },
        { path: "/services", text: t("nav.services") },
        { path: "/compliance", text: t("nav.compliance") },
      ]
    : [
        { path: "/about", text: t("nav.about") },
        { path: "/services", text: t("nav.services") },
        { path: "/token-explorer", text: t("nav.token-explorer") },
        { path: "/compliance", text: t("nav.compliance") },
        !isDemoMode && { path: "/demo", text: t("nav.demo") || "Demo" },
      ].filter(Boolean);

  const isActive = (path: string) => {
    return location.pathname === path ? "text-white" : "text-gray-300 hover:text-white"; // CORRETTO: usa location.pathname
  };

  const headerBgClass = isDemoMode
    ? demoUserType === "company"
      ? "bg-[#1a0f2e]"
      : "bg-[#0f1a2e]"
    : "bg-[#121212]";

  const handleExitDemo = () => {
    toggleDemoMode();
    navigate("/"); // AGGIUNTO: usa navigate da react-router-dom
  }

  return (
    <header className={`fixed w-full ${headerBgClass} bg-opacity-95 backdrop-blur-sm z-50 transition-all duration-300 border-b border-opacity-20 border-white`}>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <div className="flex items-center space-x-2">
              <PrimeGenesisLogo />
              <span className="font-heading font-bold text-xl md:text-2xl text-white">Prime Genesis</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:block">
            <ul className="flex space-x-8">
              {navigationLinks.map((linkItem) => ( // Rinominato link in linkItem per evitare conflitto
                <li key={linkItem.path}>
                  <Link
                    to={linkItem.path}
                    className={`${isActive(linkItem.path)} font-medium transition-colors`}
                  >
                    {linkItem.text}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* CTA Buttons & Language Selector */}
          <div className="flex items-center space-x-4">
            <div className="relative hidden md:block">
              <select
                className="appearance-none bg-transparent border border-secondary rounded-md px-2 py-1 text-sm font-medium text-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00FFD1]"
                value={language}
                onChange={(e) => setLanguage(e.target.value as "en" | "it")}
              >
                <option value="en">EN</option>
                <option value="it">IT</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                <svg className="fill-current h-4 w-4 text-[#8A2BE2]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>

            <Link
              to="/wallet"
              className="hidden md:inline-block px-4 py-2 border border-[#00FFD1] text-[#00FFD1] hover:bg-[#00FFD1] hover:bg-opacity-10 rounded-md font-medium text-sm transition-colors"
            >
              {t("nav.wallet")}
            </Link>

            {isDemoMode ? (
              <div className="hidden md:flex items-center space-x-2 px-4 py-2 bg-[#2A2A2A] rounded-md">
                <div className="text-sm text-gray-300">
                  Demo: {demoUserType === "company" ? "Company" : "User"} {/* Semplificato testo */}
                </div>
                <ShadCNButton // CORRETTO: Usa il tuo componente Button UI
                  variant="outline"
                  size="sm"
                  onClick={handleExitDemo} // Usa la funzione corretta
                >
                  Exit Demo
                </ShadCNButton>
              </div>
            ) : (
              !isAuthenticated && <Link
                to="/auth-page"
                className="hidden md:inline-block bg-gradient-to-r from-[#0047AB] to-[#8A2BE2] hover:from-[#3373C4] hover:to-[#A45BF0] px-5 py-2 rounded-md font-medium text-sm transition-all"
              >
                {t("nav.login")}
              </Link>
            )}
            {isAuthenticated && onLogout && <ShadCNButton onClick={onLogout} variant="destructive">Logout</ShadCNButton>} {/* CORRETTO: Usa il tuo componente Button UI e aggiunto check per onLogout */}


            {/* Mobile menu button */}
            <button
              className="md:hidden text-gray-300 hover:text-white focus:outline-none"
              onClick={toggleMobileMenu}
              aria-label="Toggle mobile menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className={`md:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`} id="mobile-menu">
        <div className="px-4 sm:px-6 lg:px-8 py-4 space-y-3 bg-[#1E1E1E] border-t border-white border-opacity-10">
          {navigationLinks.map((linkItem) => ( // Rinominato link in linkItem
            <Link
              key={linkItem.path}
              to={linkItem.path}
              className="block text-gray-300 hover:text-white font-medium"
              onClick={closeMobileMenu}
            >
              {linkItem.text}
            </Link>
          ))}
          <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
            <Link
              to="/wallet"
              className="px-4 py-2 border border-[#00FFD1] text-[#00FFD1] hover:bg-[#00FFD1] hover:bg-opacity-10 rounded-md font-medium text-sm transition-colors"
              onClick={closeMobileMenu}
            >
              {t("nav.wallet")}
            </Link>
            {isDemoMode ? (
              <ShadCNButton // CORRETTO: Usa il tuo componente Button UI
                onClick={() => {
                  handleExitDemo(); // Usa la funzione corretta
                  closeMobileMenu();
                }}
                variant="outline" // Stile di default, puoi personalizzarlo
                className="border-red-500 text-red-500 hover:bg-red-500 hover:bg-opacity-10 hover:text-red-500" // Mantenuto stile custom per exit demo
              >
                Exit Demo
              </ShadCNButton>
            ) : (
              !isAuthenticated && <Link // CORRETTO: Usato Link e aggiunto check !isAuthenticated
                to="/auth-page"
                className="bg-gradient-to-r from-[#0047AB] to-[#8A2BE2] hover:from-[#3373C4] hover:to-[#A45BF0] px-5 py-2 rounded-md font-medium text-sm transition-all"
                onClick={closeMobileMenu}
              >
                {t("nav.login")}
              </Link>
            )}
            <select
              className="appearance-none bg-transparent border border-secondary rounded-md px-2 py-1 text-sm font-medium text-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00FFD1]"
              value={language}
              onChange={(e) => setLanguage(e.target.value as "en" | "it")}
            >
              <option value="en">EN</option>
              <option value="it">IT</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;