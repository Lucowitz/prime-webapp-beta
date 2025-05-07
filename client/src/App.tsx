import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useState } from "react";
import Demo from "@/pages/Demo";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import TokenExplorer from "@/pages/TokenExplorer";
import Wallet from "@/pages/Wallet";
import Compliance from "@/pages/Compliance";
import About from "@/pages/About";
import Services from "@/pages/Services";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { ThemeWrapper } from "@/components/ui/theme-wrapper";
import { LanguageProvider } from "./context/LanguageContext";
import { DemoProvider, useDemo } from "./context/DemoContext";
import AuthPage from "@/pages/AuthPage";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import TempTotpSetupPage from "@/pages/TempTotpSetupPage";
import Cookies from 'js-cookie';
import AuthedIndex from "./authed"; // Import the AuthedIndex component

// This component will handle scrolling to top on navigation
function ScrollToTop() {
  const location = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location]);
  
  return null;
}

// This component contains all the logic that requires router hooks
function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(Cookies.get('authToken') || null);
  const navigate = useNavigate();

  useEffect(() => {
    setIsAuthenticated(!!token); // Set authentication based on token existence
  }, [token]);

  useEffect(() => {
    if (isAuthenticated && window.location.pathname === '/auth-page') {
      navigate('/authed'); // Redirect to authed if authenticated and on auth page
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = (newToken: string) => {
    Cookies.set('authToken', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    Cookies.remove('authToken');
    setToken(null);
    setIsAuthenticated(false);
    navigate('/auth-page');
  };

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <DemoProvider>
          <ThemeWrapper>
            <div className="flex flex-col min-h-screen">
              <Header onLogout={handleLogout} isAuthenticated={isAuthenticated} />
              <main className="flex-grow pt-16 md:pt-20">
                <ScrollToTop />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/token-explorer" element={<TokenExplorer />} />
                  <Route path="/wallet" element={<Wallet />} />
                  <Route path="/compliance" element={<Compliance />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/demo" element={<Demo />} />
                  <Route path="/auth-page" element={<AuthPage onLogin={handleLogin} />} />
                  <Route path="/temp-totp-setup" element={<TempTotpSetupPage />} />
                  <Route path="/authed/*" element={isAuthenticated ? <AuthedIndex onLogout={handleLogout} /> : <AuthPage onLogin={handleLogin} />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
              <Toaster />
            </div>
          </ThemeWrapper>
        </DemoProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

// Main App component that provides the Router context
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;