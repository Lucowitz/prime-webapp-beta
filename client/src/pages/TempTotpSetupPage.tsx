import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authenticator } from 'otplib';

const TempTotpSetupPage = () => {
    const [totpSecret, setTotpSecret] = useState<string | null>(null);
    const [totp, setTotp] = useState<string>('');
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [email, setEmail] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const totpSecretParam = searchParams.get('totpSecret');
        const userIdParam = searchParams.get('userId');
        const emailParam = searchParams.get('email');

        if (totpSecretParam) {
            setTotpSecret(totpSecretParam);
        }
        if (userIdParam) {
            setUserId(userIdParam);
        }
        if (emailParam) {
            setEmail(emailParam);
        }
    }, [searchParams]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!totpSecret) {
            alert("TOTP secret is missing.");
            return;
        }
        if (!userId) {
            alert("User ID is missing.");
            return;
        }

        try {
            const response = await fetch(`/api/validate-totp?userId=${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ totp }),
            });

            if (response.ok) {
                const result = await response.json();
                alert("TOTP validation successful!");
                localStorage.setItem('token', result.token);
                navigate('/protected');
            } else {
                const error = await response.json();
                console.error("TOTP validation failed:", error);
                alert("TOTP validation failed: " + (error.message || "An error occurred."));
            }
        } catch (error) {
            console.error("Error during TOTP validation:", error);
            alert("Network error: Could not connect to the server.");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#121212] text-white px-4">
            <Card className="w-full max-w-md p-6 space-y-4">
                <h2 className="text-2xl font-semibold text-center">TOTP Setup</h2>
                {totpSecret && email && (
                    <>
                        <p>Scan the QR code below with your authenticator app:</p>
                        <img
                            src={`https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(`otpauth://totp/YourApp:${email}?secret=${totpSecret}&issuer=YourApp`)}`}
                            alt="QR Code"
                            onError={(e: any) => {
                                console.error("Error loading QR code", e);
                                e.target.onerror = null;
                                e.target.src = ""; // Prevent further attempts
                            }}
                        />
                        <form className="space-y-4" onSubmit={handleSubmit}>
                            <Input
                                label="TOTP Code"
                                type="text"
                                placeholder="Enter 6-digit code"
                                value={totp}
                                onChange={(e) => setTotp(e.target.value)}
                                required
                            />
                            <Button className="w-full" type="submit">Validate TOTP</Button>
                        </form>
                    </>
                )}
                {!totpSecret && (
                    <p className="text-gray-400 text-center">
                        TOTP secret not found. Please return to the registration page and try again.
                    </p>
                )}
            </Card>
        </div>
    );
};

export default TempTotpSetupPage;
