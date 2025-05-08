// client/src/App.tsx - AppContent

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
import { DemoProvider } from "./context/DemoContext"; // Rimosso useDemo che non era usato qui
import AuthPage from "@/pages/AuthPage";
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import TempTotpSetupPage from "@/pages/TempTotpSetupPage";
import Cookies from 'js-cookie';
import AuthedIndex from "./authed";

// This component will handle scrolling to top on navigation
function ScrollToTop() {
  const location = useLocation();
  
  useEffect(() => {
    // Se c'è un hash nell'URL, lascia che il browser gestisca lo scroll
    if (location.hash) {
      const element = document.getElementById(location.hash.substring(1)); // Rimuovi '#' dall'hash
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' }); // O 'auto' se preferisci
        return; // Non fare lo scroll a 0,0
      }
    }
    // Altrimenti, scrolla all'inizio
    window.scrollTo(0, 0);
  }, [location.pathname, location.hash]); // Ascolta sia pathname che hash
  
  return null;
}

// Definisci qui le tue rotte pubbliche
const PUBLIC_ROUTES = [
  "/",
  "/token-explorer",
  "/wallet", // Se /wallet può essere vista anche da non autenticati (es. per info o demo)
  "/compliance",
  "/about",
  "/services",
  "/demo",
  "/auth-page",
  "/temp-totp-setup"
];

// This component contains all the logic that requires router hooks
function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(Cookies.get('authToken') || null);
  const navigate = useNavigate();
  const location = useLocation(); // Usiamo location da react-router-dom

  useEffect(() => {
    setIsAuthenticated(!!token);
  }, [token]);

  useEffect(() => {
    const currentPath = location.pathname;

    if (isAuthenticated && currentPath === '/auth-page') {
      navigate('/authed'); 
    } else if (!isAuthenticated && !PUBLIC_ROUTES.includes(currentPath)) {
      // Se non è autenticato E il percorso attuale NON è una delle rotte pubbliche,
      // allora reindirizza a auth-page.
      // Questo protegge le rotte "/authed/*" e qualsiasi altra rotta non definita come pubblica.
      if (!currentPath.startsWith('/authed/')) { // Evita loop se /authed/* è già gestito sotto
         navigate('/auth-page');
      }
    }
  }, [isAuthenticated, navigate, location.pathname]);

  const handleLogin = (newToken: string) => {
    Cookies.set('authToken', newToken, { expires: 1/24 }); // Scade in 1 ora, per esempio
    setToken(newToken);
    // Dopo il login, potresti voler reindirizzare a /authed
    navigate('/authed');
  };

  const handleLogout = () => {
    Cookies.remove('authToken');
    setToken(null);
    // setIsAuthenticated(false); // Verrà aggiornato dall'useEffect che dipende da token
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
                  {/* La protezione per /authed/* è già gestita dalla condizione ternaria */}
                  <Route 
                    path="/authed/*" 
                    element={
                      isAuthenticated ? (
                        <AuthedIndex onLogout={handleLogout} />
                      ) : (
                        // Se non autenticato, non serve un elemento qui perché l'useEffect sopra reindirizzerà
                        // Ma per sicurezza, potremmo reindirizzare anche qui o mostrare AuthPage
                        <AuthPage onLogin={handleLogin} />
                      )
                    } 
                  />
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