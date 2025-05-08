import React from 'react';
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Wallet from "@/pages/Wallet";
import TokenExplorer from "@/pages/TokenExplorer";
import { useDemo } from "@/context/DemoContext";
import NotFound from "@/pages/not-found";
import { useEffect } from 'react';
import Cookies from 'js-cookie';
import { Routes, Route, useNavigate, BrowserRouter, useLocation } from 'react-router-dom';
import ProtectedPage from '@/pages/ProtectedPage';

function ScrollToTop() {
    const location = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location]);

    return null;
}

const AuthedApp = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const token = Cookies.get('authToken');
        if (!token) {
            navigate('/auth-page');
        }
    }, [navigate]);

    const handleLogout = () => {
        Cookies.remove('authToken');
        navigate('/auth-page');
    };

    const { isDemoMode, demoUserType } = useDemo();

    return (
        <>
            <Header />
            <main className="flex-grow pt-16 md:pt-20">
                <ScrollToTop />
                <Routes>
                    <Route path="/authed" element={<ProtectedPage />} />
                    <Route path="/authed/wallet" element={<Wallet />} />
                    <Route path="/authed/token-explorer" element={<TokenExplorer />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </main>
            <Footer />
        </>
    );
};

export default AuthedApp;