import React, { useState,useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { v4 as uuidv4 } from 'uuid';

import Cookies from 'js-cookie';


const DEV_LOGIN_KEYWORD = 'devlogin';

// Define the URL of the secondary server
const SECONDARY_SERVER_URL = 'http://localhost:3001'; // Replace with your secondary server URL

interface AuthPageProps {
    onLogin: (token: string) => void;
}

const AuthPage = ({ onLogin }: AuthPageProps) => {
    const location = useLocation();
    const [isBusiness, setIsBusiness] = useState(false);
    const [isLogin, setIsLogin] = useState(location.hash !== '#register'); // Check if the URL hash is '#register'
    const [registrationStep, setRegistrationStep] = useState<'form' | 'success'>('form'); // ADD THIS LINE BACK
    const [validationUrl, setValidationUrl] = useState('');
    const [userData, setUserData] = useState<any>(null);
    const [totpSecret, setTotpSecret] = useState<string | null>(null);

    
    useEffect(() => {
        if (location.hash === '#register') {
            setIsLogin(false);
        } 
        // Potresti aggiungere un else if (location.hash === '#login' || !location.hash) per tornare al login
        else if (location.hash === '#login' || !location.hash) {
            setIsLogin(true);
        }
    }, [location.hash]); // Esegui quando l'hash cambia

    
    const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const data: any = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });
        

        if (!isBusiness) {
            if (!data.Nome || !data.Cognome || !data.Indirizzo || !data["Codice Fiscale"] || !data.Email) {
                alert("Please fill in all required fields (Name, Surname, Address, Fiscal Code, and Email).");
                return;
            }
            if (typeof data["Codice Fiscale"] === 'string' && data["Codice Fiscale"].length !== 16) {
                alert("Invalid Fiscal Code format.  It should be 16 characters.");
                return;
            }
        } else {
            if (!data["Nome Azienda"] || !data["P.IVA"] || !data["Email Commerciale"]) {
                alert("Please fill in all required fields for Business registration.");
                return;
            }
        }

        setUserData(data);

        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    isBusiness: isBusiness,
                    ...data,
                }),
            });

            if (response.ok) {
                const result = await response.json();
                console.log("Registration initiated:", result);
                setTotpSecret(result.secret);
                setRegistrationStep('success');
                setUserData(data);
                // localStorage.setItem('token', result.token);
                // navigate('/protected');

            } else {
                const error = await response.json();
                console.error("Registration failed:", error);
                alert("Registration failed: " + (error.message || "An error occurred."));
                setRegistrationStep('form');
            }
        } catch (error) {
            console.error("Error during registration:", error);
            alert("Network error: Could not connect to the server.");
            setRegistrationStep('form');
        }
    };

    const handleAdminLogin = () => {
        Cookies.set('authToken', 'admin_token', { expires: Infinity }); // Infinite session
        onLogin('admin_token');
    };

    const LoginForm = ({ isBusiness }: { isBusiness: boolean }) => {
        const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const data: any = {};
            formData.forEach((value, key) => {
                data[key] = value;
            });

            if ((isBusiness && data["P.IVA"] === DEV_LOGIN_KEYWORD) || (!isBusiness && data["Codice fiscale"] === DEV_LOGIN_KEYWORD)) {
                Cookies.set('authToken', 'dummy_token', { expires: 7 }); // Set a dummy token
                onLogin('dummy_token');
                return;
            }

            const payload = {
                isBusiness: isBusiness,
                ...(isBusiness
                    ? {
                        piva: data["P.IVA"],
                        password: data.Password,
                        totp: data["Codice TOTP"],
                    }
                    : {
                        codiceFiscale: data["Codice fiscale"],
                        password: data.Password,
                        totp: data["Codice TOTP"],
                    }),
            };

            try {
                const response = await fetch("/api/login", { //  Adjust the route
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                });

                if (response.ok) {
                    const result = await response.json();
                    console.log("Login successful:", result);
                    Cookies.set('authToken', result.token, { expires: 7 });
                    onLogin(result.token);
                    // Handle successful login (e.g., redirect)
                } else {
                    const error = await response.json();
                    console.error("Login failed:", error);
                    alert("Login failed: " + (error.message || (isBusiness ? "Invalid Codice Fiscale/P.IVA" : "Codice Fiscale/P.IVA not found")));
                    // Handle login error
                }
            } catch (error) {
                console.error("Error during login:", error);
                alert("Network error: Could not connect to server.");
            }
        };

        return (
            <form className="space-y-4" onSubmit={handleSubmit}>
                {isBusiness ? (
                    <>
                        <Input label="P.IVA" type="text" placeholder="P.IVA" name="P.IVA" required />
                        <Input label="Password" type="password" placeholder="Password" name="Password" required />
                        <Input label="Codice TOTP" type="text" placeholder="Inserisci codice a 6 cifre" name="Codice TOTP" required />
                    </>
                ) : (
                    <>
                        <Input label="Codice fiscale" type="text" placeholder="Codice fiscale" name="Codice fiscale" required />
                        <Input label="Password" type="password" placeholder="Password" name="Password" required />
                        <Input label="Codice TOTP" type="text" placeholder="Inserisci codice a 6 cifre" name="Codice TOTP" required />
                    </>
                )}
                <Button className="w-full" type="submit">Accedi</Button>
                <button
                    className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none"
                    onClick={handleAdminLogin}
                >
                    Admin
                </button>
            </form>
        );
    };

    const RegisterForm = ({ isBusiness }: { isBusiness: boolean }) => {
        return (
            <form  className="space-y-4" onSubmit={handleRegister}>
                {!isBusiness ? (
                    <>
                        <Input label="Nome" type="text" placeholder="Nome" name="Nome" required />
                        <Input label="Cognome" type="text" placeholder="Cognome" name="Cognome" required />
                        <Input label="Indirizzo" type="text" placeholder="Indirizzo" name="Indirizzo" required />
                        <Input label="Codice Fiscale" type="text" placeholder="Codice Fiscale" name="Codice Fiscale" required />
                        <Input label="Email" type="email" placeholder="Email" name="Email" required />
                        <Input label="Numero di Telefono" type="text" placeholder="Numero di Telefono" name="Numero di Telefono" />
                        <Input label="Password" type="password" placeholder="Password" name="Password" required />
                    </>
                ) : (
                    <>
                        <Input label="Nome Azienda" type="text" placeholder="Nome Azienda" name="Nome Azienda" required />
                        <Input label="P.IVA" type="text" placeholder="Partita Iva" name="P.IVA" required />
                        <Input label="Email Commerciale" type="email" placeholder="Email Commerciale" name="Email Commerciale" required />
                        <Input label="Password" type="password" placeholder="Password" name="Password" required />
                    </>
                )}
                <Button className="w-full" type="submit">Registrati</Button>
            </form>
        );
    };

    if (registrationStep === 'form') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#121212] text-white px-4">
                <Card className="w-full max-w-md p-6 space-y-4">
                    <div className="flex justify-between border-b pb-2">
                        <button
                            className={`text-lg font-semibold ${!isLogin ? "text-gray-400" : "text-white"}`}
                            onClick={() => setIsLogin(true)}
                        >
                            Login
                        </button>
                        <button
                            className={`text-lg font-semibold ${isLogin ? "text-gray-400" : "text-white"}`}
                            onClick={() => setIsLogin(false)}
                        >
                            Registrati
                        </button>
                    </div>
                    <div className="flex justify-center gap-4">
                        <Button
                            variant={isBusiness ? "outline" : "default"}
                            onClick={() => setIsBusiness(false)}
                        >
                            Utente
                        </Button>
                        <Button
                            variant={isBusiness ? "default" : "outline"}
                            onClick={() => setIsBusiness(true)}
                        >
                            Business
                        </Button>
                    </div>
                    {isLogin ? (
                        <LoginForm isBusiness={isBusiness} />
                    ) : (
                        <RegisterForm isBusiness={isBusiness} />
                    )}
                </Card>
            </div>
        );
    }  else if (registrationStep === 'success') { //  success
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#121212] text-white px-4">
                <Card className="w-full max-w-md p-6 space-y-4">
                    <h2 className="text-2xl font-semibold text-center">Registration Completed</h2>
                    <p className="text-gray-400 text-center">
                        Your registration has been initiated successfully. Check your email to complete the setup.
                    </p>
                    {totpSecret && validationUrl && (
                        <>
                            <p>Scan the QR code below with your authenticator app:</p>
                            {userData && (
                                <img
                                    src={`https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(
                                        `otpauth://totp/YourApp:${
                                            userData.Email ? userData.Email : userData["Email Commerciale"] ? userData["Email Commerciale"] : 'user'
                                        }?secret=${totpSecret}&issuer=YourApp`
                                    )}`}
                                    alt="QR Code"
                                />
                            )}
                            <p>Or, enter this key manually:</p>
                            <p><strong>{totpSecret}</strong></p>
                        </>
                    )}
                    {/* You might want to show a link to the login page here. */}
                </Card>
            </div>
        );
    }

    return null;
};

export default AuthPage;