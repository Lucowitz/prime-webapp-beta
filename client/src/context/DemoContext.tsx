// DemoContext.tsx
import { createContext, useState, useContext, ReactNode, useEffect, useCallback, useRef } from "react";
import { Token as AppToken } from "@/types/tokens"; // Rinomino per evitare collisioni
import { demoTokens as allDemoAppTokens } from "@/data/tokens"; // Importa i tuoi token demo

const SOLANA_PRICE_CACHE_DURATION_MS = 50 * 1000;

interface SolanaPriceCache {
    price: number;
    timestamp: number; // Timestamp dell'ultimo fetch (Date.now())
}

// Interfacce (rimangono per lo più invariate, ma il loro uso cambia)
export interface DemoCompanyToken { // Questo può rimanere per la vista "company" se diversa
    id: string;
    name: string;
    symbol: string;
    totalSupply: number;
    initialValue: number; // Assumiamo USD
    currentValue: number; // Assumiamo USD
    holders: number;
    marketCap: number;
    creationDate: string;
    description: string;
    logoUrl: string;
}

export interface DemoUserWallet {
    solanaBalance: number;
    purchasedTokens: {
        tokenId: string;
        amount: number;
        purchaseValueUSD: number; // Valore totale di acquisto in USD
        currentValueUSD: number;  // Valore corrente totale in USD
        logoUrl?: string;         // Aggiungiamo per la UI
        tokenName?: string;       // Aggiungiamo per la UI
        tokenSymbol?: string;     // Aggiungiamo per la UI
    }[];
}

export interface DemoTransaction {
    id: string;
    type: "purchase" | "sale" | "payment" | "reward";
    tokenId: string;
    tokenName: string;
    tokenSymbol: string;
    amount: number;
    valueUSD: number; // Valore della transazione in USD
    timestamp: string;
    status: "completed" | "pending" | "cancelled";
    merchant?: string;
    description?: string;
    recipientWallet?: string;
}

interface DemoContextType {
    isDemoMode: boolean;
    toggleDemoMode: () => void;
    demoUserType: "company" | "user" | null;
    setDemoUserType: (type: "company" | "user" | null) => void;
    demoCompanyTokenData: DemoCompanyToken | null; // Rinomino per chiarezza, è per la vista company
    demoUserWallet: DemoUserWallet;
    demoTransactions: DemoTransaction[];
    lastPurchaseNotification: { tokenName: string; amount: number } | null; // Stato per notifica
    solanaPriceUSD: number | null; // Prezzo di 1 SOL in USD
    fetchSolanaPrice: () => Promise<number | null>; // CORREZIONE: Cambiato tipo ritorno
    allDemoTokensForContext: AppToken[]; // Rendiamo disponibili i token demo al contesto

    sendDemoSol: (recipient: string, amount: number) => void;
    sendDemoCustomToken: (tokenId: string, recipient: string, amount: number) => void;

    purchaseToken: (tokenId: string, amountToPurchase: number) => void;
    sellToken: (tokenId: string, amountToSell: number) => void;
    approveTransaction: (transactionId: string) => void;
    rejectTransaction: (transactionId: string) => void;
    addPendingTransaction: (tokenId: string, amount: number, merchant: string, description: string) => void;
    rewardWallet: (recipientWallet: string, amount: number) => void; // Da rivedere se necessario
    clearPurchaseNotification: () => void; // Funzione per pulire notifica
}

const DEFAULT_COMPANY_TOKEN_DATA: DemoCompanyToken = {
    id: "prime-genesis-demo-token",
    name: "PrimeGen Coffee Demo Corp",
    symbol: "PGCC",
    totalSupply: 1000000,
    initialValue: 0.05,
    currentValue: 0.12,
    holders: 427,
    marketCap: 120000,
    creationDate: "2024-01-15",
    description: "Token dimostrativo per una catena di caffè fittizia.",
    logoUrl: "/coffee-token-logo.svg",
};

const INITIAL_WALLET: DemoUserWallet = {
    solanaBalance: 5,
    purchasedTokens: []
};

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: ReactNode }) {
    // ----- STATI -----
    const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
        return localStorage.getItem("isDemoMode") === "true";
    });
    const [demoUserType, setDemoUserType] = useState<"company" | "user" | null>(() => {
        return localStorage.getItem("demoUserType") as "company" | "user" | null;
    });
    const [demoCompanyTokenData, setDemoCompanyTokenData] = useState<DemoCompanyToken | null>(() => {
        const saved = localStorage.getItem("demoCompanyTokenData");
        return saved ? JSON.parse(saved) : null; // Inizializza con null se non c'è nulla salvato
    });
    const [demoUserWallet, setDemoUserWallet] = useState<DemoUserWallet>(() => {
        const saved = localStorage.getItem("demoUserWallet");
        return saved ? JSON.parse(saved) : INITIAL_WALLET;
    });
    const [demoTransactions, setDemoTransactions] = useState<DemoTransaction[]>(() => {
        const saved = localStorage.getItem("demoTransactions");
        return saved ? JSON.parse(saved) : [];
    });
    // CORREZIONE: Aggiunto useState per lastPurchaseNotification
    const [lastPurchaseNotification, setLastPurchaseNotification] = useState<{ tokenName: string; amount: number } | null>(null);
    const [solanaPriceUSD, setSolanaPriceUSD] = useState<number | null>(null);
    // AGGIUNGI QUESTE RIGHE sotto gli altri useState (intorno alla linea 110):
    const isFetchingPriceRef = useRef<boolean>(false); // Ref per bloccare fetch multipli
    const currentPriceRef = useRef<number | null>(null); // Ref per tenere traccia del prezzo corrente senza causare re-run effetti

    useEffect(() => {
        currentPriceRef.current = solanaPriceUSD;
    }, [solanaPriceUSD]);
    // ----- FUNZIONI -----

    // Fetch Prezzo Solana con Cache
    // SOSTITUISCI l'intera funzione getSolanaPrice (dalla riga ~117 alla ~192) con questa:
    const getSolanaPrice = useCallback(async (forceRefresh = false): Promise<number | null> => {
        console.log(`getSolanaPrice called. forceRefresh=${forceRefresh}, isFetching=${isFetchingPriceRef.current}`);

        if (isFetchingPriceRef.current) {
            console.log("Price fetch already in progress (ref), skipping.");
            return currentPriceRef.current;
        }

        const cachedDataRaw = localStorage.getItem("solanaPriceCache");
        let cachedData: SolanaPriceCache | null = null;
        if (cachedDataRaw) { try { cachedData = JSON.parse(cachedDataRaw); } catch (e) { /*...*/ } }

        const now = Date.now();
        const isCacheValid = cachedData && (now - cachedData.timestamp < SOLANA_PRICE_CACHE_DURATION_MS);

        if (!forceRefresh && isCacheValid && cachedData) {
            console.log("Using cached Solana price:", cachedData.price);
            setSolanaPriceUSD(prev => prev === cachedData.price ? prev : cachedData.price);
            return cachedData.price;
        }

        console.log("Fetching new Solana price from API...");
        isFetchingPriceRef.current = true; // Blocca fetch futuri
        let fetchedPrice: number | null = null;
        let fetchSuccess = false; // Flag per indicare successo
        let wasRateLimited = false; // Flag per 429

        try {
            const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");

            if (response.status === 429) {
                wasRateLimited = true; // Imposta flag specifico per 429
                console.warn("Rate limited by CoinGecko (429). Will use cached/fallback. Fetch block remains active.");
                fetchedPrice = null; // Nessun nuovo prezzo ottenuto
                // Non lanciare errore qui, gestiamo nel finally
            } else if (!response.ok) {
                console.error("CoinGecko API error:", response.status, await response.text());
                fetchedPrice = null; // Errore API generico
            } else {
                const data = await response.json();
                fetchedPrice = data.solana?.usd ?? null;
                if (fetchedPrice !== null) {
                    fetchSuccess = true; // Il fetch è andato a buon fine con un prezzo valido
                    console.log("Fetched new Solana price:", fetchedPrice);
                    setSolanaPriceUSD(fetchedPrice);
                    const newCache: SolanaPriceCache = { price: fetchedPrice, timestamp: Date.now() };
                    localStorage.setItem("solanaPriceCache", JSON.stringify(newCache));
                } else {
                    console.warn("Failed to fetch new Solana price (API returned null).");
                }
            }
        } catch (error) {
            console.error("Network error during fetch Solana price:", error);
            // Considera l'errore di rete come non riuscito, ma non necessariamente 429
            fetchedPrice = null;
        } finally {
            // Resetta il blocco SOLO se il fetch ha avuto successo
            // O se l'errore NON era un rate limiting (429)
            if (fetchSuccess || !wasRateLimited) {
                isFetchingPriceRef.current = false;
                console.log(`Fetch attempt finished. Success=${fetchSuccess}, RateLimited=${wasRateLimited}. Resetting fetch block.`);
            } else {
                // Se wasRateLimited è true, il blocco rimane attivo
                console.log("Fetch attempt finished with Rate Limit (429). Fetch block remains active.");
            }
        }

        // Se il fetch non è andato a buon fine (per qualsiasi motivo), ritorna l'ultimo prezzo noto o il fallback
        if (!fetchSuccess) {
            setSolanaPriceUSD(prev => prev ?? 170); // Aggiorna allo stato di fallback se non c'era nulla
            return currentPriceRef.current ?? 170;
        }

        return fetchedPrice; // Ritorna il prezzo appena fetchato

    }, []); // Dipendenze vuote, funzione stabile
    // Funzione per forzare il refresh manuale
    const fetchSolanaPriceManual = useCallback(() => {
        return getSolanaPrice(true);
    }, [getSolanaPrice]);

    // Toggle Demo Mode
    const toggleDemoMode = () => {
        const newMode = !isDemoMode;
        setIsDemoMode(newMode);

        if (newMode) {
            console.log("Entering Demo Mode");
            setDemoCompanyTokenData(DEFAULT_COMPANY_TOKEN_DATA);
            if (localStorage.getItem("demoUserWallet") === null) setDemoUserWallet(INITIAL_WALLET);
            if (localStorage.getItem("demoTransactions") === null) setDemoTransactions([]);
            // CORREZIONE: Chiamata getSolanaPrice invece di fetchSolanaPrice
            if (solanaPriceUSD === null) getSolanaPrice();
        } else {
            console.log("Exiting Demo Mode - Clearing localStorage demo data");
            setDemoUserType(null);
            // CORREZIONE: Usa setLastPurchaseNotification definito da useState
            setLastPurchaseNotification(null);
            localStorage.removeItem("isDemoMode");
            localStorage.removeItem("demoUserType");
            localStorage.removeItem("demoCompanyTokenData");
            localStorage.removeItem("demoUserWallet");
            localStorage.removeItem("demoTransactions");
        }
    };

    // Purchase Token
    const purchaseToken = (tokenId: string, amountToPurchase: number) => {
        // ... (implementazione di purchaseToken rimane invariata ma assicurati che usi setLastPurchaseNotification correttamente) ...
        if (!isDemoMode || demoUserType !== 'user') { /*...*/ return; }
        if (!solanaPriceUSD || solanaPriceUSD <= 0) { /*...*/ return; }
        const tokenBeingPurchased = allDemoAppTokens.find(t => t.id === tokenId);
        if (!tokenBeingPurchased) { /*...*/ return; }
        const costPerTokenUSD = tokenBeingPurchased.currentPrice;
        const totalCostUSD = costPerTokenUSD * amountToPurchase;
        const totalCostSOL = totalCostUSD / solanaPriceUSD;
        console.log(`Attempting purchase: ${amountToPurchase} ${tokenBeingPurchased.symbol}...`);
        if (demoUserWallet.solanaBalance >= totalCostSOL) {
            const updatedWallet = JSON.parse(JSON.stringify(demoUserWallet));
            updatedWallet.solanaBalance -= totalCostSOL;
            const existingTokenIndex = updatedWallet.purchasedTokens.findIndex((t: any) => t.tokenId === tokenId);
            if (existingTokenIndex >= 0) {
                updatedWallet.purchasedTokens[existingTokenIndex].amount += amountToPurchase;
                updatedWallet.purchasedTokens[existingTokenIndex].purchaseValueUSD += totalCostUSD;
                updatedWallet.purchasedTokens[existingTokenIndex].currentValueUSD = updatedWallet.purchasedTokens[existingTokenIndex].amount * costPerTokenUSD;
            } else {
                updatedWallet.purchasedTokens.push({
                    tokenId: tokenBeingPurchased.id, amount: amountToPurchase, purchaseValueUSD: totalCostUSD, currentValueUSD: totalCostUSD,
                    logoUrl: tokenBeingPurchased.imageUrl, tokenName: tokenBeingPurchased.name, tokenSymbol: tokenBeingPurchased.symbol,
                });
            }
            setDemoUserWallet(updatedWallet);
            const newTransaction: DemoTransaction = {
                id: `tx-purchase-${Date.now()}`, type: "purchase", tokenId: tokenBeingPurchased.id, tokenName: tokenBeingPurchased.name,
                tokenSymbol: tokenBeingPurchased.symbol, amount: amountToPurchase, valueUSD: totalCostUSD, timestamp: new Date().toISOString(), status: "completed"
            };
            setDemoTransactions(prevTx => [newTransaction, ...prevTx]);
            // CORREZIONE: Usa setLastPurchaseNotification definito da useState
            setLastPurchaseNotification({ tokenName: tokenBeingPurchased.name, amount: amountToPurchase });
            console.log("Purchase successful.");
        } else {
            alert(`Fondi SOL insufficienti...`);
            console.warn("Insufficient SOL balance for purchase.");
        }
    };

    // Clear Purchase Notification
    const clearPurchaseNotification = () => {
        // CORREZIONE: Usa setLastPurchaseNotification definito da useState
        setLastPurchaseNotification(null);
    };

    // Sell Token
    const sellToken = (tokenId: string, amountToSell: number) => {
        // ... (implementazione di sellToken rimane invariata) ...
        if (!isDemoMode || demoUserType !== 'user' || !solanaPriceUSD || solanaPriceUSD <= 0) return;
        const tokenBeingSoldInfo = allDemoAppTokens.find(t => t.id === tokenId);
        const tokenInWalletIndex = demoUserWallet.purchasedTokens.findIndex(t => t.tokenId === tokenId);
        if (!tokenBeingSoldInfo || tokenInWalletIndex === -1) return;
        const tokenInWallet = demoUserWallet.purchasedTokens[tokenInWalletIndex];
        if (tokenInWallet.amount < amountToSell) return;
        const valueGainedUSD = tokenBeingSoldInfo.currentPrice * amountToSell;
        const valueGainedSOL = valueGainedUSD / solanaPriceUSD;
        const updatedWallet = JSON.parse(JSON.stringify(demoUserWallet));
        const anUpdatedTokenInWallet = updatedWallet.purchasedTokens[tokenInWalletIndex];
        updatedWallet.solanaBalance += valueGainedSOL;
        const averageCostPerTokenBeforeSale = anUpdatedTokenInWallet.purchaseValueUSD / anUpdatedTokenInWallet.amount;
        const costOfSoldTokens = averageCostPerTokenBeforeSale * amountToSell;
        anUpdatedTokenInWallet.purchaseValueUSD -= costOfSoldTokens;
        anUpdatedTokenInWallet.amount -= amountToSell;
        if (anUpdatedTokenInWallet.amount <= 0.000001) {
            updatedWallet.purchasedTokens.splice(tokenInWalletIndex, 1);
        } else {
            anUpdatedTokenInWallet.currentValueUSD = anUpdatedTokenInWallet.amount * tokenBeingSoldInfo.currentPrice;
            if (anUpdatedTokenInWallet.purchaseValueUSD < 0) anUpdatedTokenInWallet.purchaseValueUSD = 0;
        }
        setDemoUserWallet(updatedWallet);
        const newTransaction: DemoTransaction = {
            id: `tx-sale-${Date.now()}`, type: "sale", tokenId, tokenName: tokenBeingSoldInfo.name, tokenSymbol: tokenBeingSoldInfo.symbol,
            amount: amountToSell, valueUSD: valueGainedUSD, timestamp: new Date().toISOString(), status: "completed"
        };
        setDemoTransactions(prevTx => [newTransaction, ...prevTx]);
        console.log(`Sold ${amountToSell} ${tokenBeingSoldInfo.symbol}. Wallet updated.`);
    };

    // Send Demo SOL
    const sendDemoSol = (recipient: string, amount: number) => {
        // ... (implementazione di sendDemoSol rimane invariata) ...
        if (!isDemoMode || demoUserType !== 'user') return;
        if (amount <= 0 || amount > demoUserWallet.solanaBalance) return;
        const updatedWallet = JSON.parse(JSON.stringify(demoUserWallet));
        updatedWallet.solanaBalance -= amount;
        setDemoUserWallet(updatedWallet);
        const newTransaction: DemoTransaction = {
            id: `tx-send-sol-${Date.now()}`, type: "payment", tokenId: "SOL", tokenName: "Solana", tokenSymbol: "SOL",
            amount: amount, valueUSD: (solanaPriceUSD || 0) * amount, timestamp: new Date().toISOString(), status: "completed",
            recipientWallet: recipient, description: `Sent SOL to ${recipient}`
        };
        setDemoTransactions(prevTx => [newTransaction, ...prevTx]);
        alert(`Simulato invio di ${amount} SOL a ${recipient}. Saldo aggiornato.`);
        console.log(`Sent ${amount} SOL to ${recipient}. SOL Balance: ${updatedWallet.solanaBalance}`);
    };

    // Send Demo Custom Token
    const sendDemoCustomToken = (tokenId: string, recipient: string, amount: number) => {
        // ... (implementazione di sendDemoCustomToken rimane invariata) ...
        if (!isDemoMode || demoUserType !== 'user') return;
        const tokenInWalletIndex = demoUserWallet.purchasedTokens.findIndex(t => t.tokenId === tokenId);
        if (tokenInWalletIndex === -1) return;
        const tokenInWallet = demoUserWallet.purchasedTokens[tokenInWalletIndex];
        const tokenInfo = allDemoAppTokens.find(t => t.id === tokenId);
        if (!tokenInfo) return;
        if (amount <= 0 || amount > tokenInWallet.amount) return;
        const updatedWallet = JSON.parse(JSON.stringify(demoUserWallet));
        const anUpdatedTokenInWallet = updatedWallet.purchasedTokens[tokenInWalletIndex];
        const averageCostPerTokenBeforeSend = anUpdatedTokenInWallet.purchaseValueUSD / anUpdatedTokenInWallet.amount;
        const costOfSentTokens = averageCostPerTokenBeforeSend * amount;
        anUpdatedTokenInWallet.purchaseValueUSD -= costOfSentTokens;
        anUpdatedTokenInWallet.amount -= amount;
        if (anUpdatedTokenInWallet.amount <= 0.000001) {
            updatedWallet.purchasedTokens.splice(tokenInWalletIndex, 1);
        } else {
            anUpdatedTokenInWallet.currentValueUSD = anUpdatedTokenInWallet.amount * tokenInfo.currentPrice;
            if (anUpdatedTokenInWallet.purchaseValueUSD < 0) anUpdatedTokenInWallet.purchaseValueUSD = 0;
        }
        setDemoUserWallet(updatedWallet);
        const newTransaction: DemoTransaction = {
            id: `tx-send-${tokenId.substring(0, 3)}-${Date.now()}`, type: "payment", tokenId: tokenId,
            tokenName: tokenInWallet.tokenName || tokenInfo.name, tokenSymbol: tokenInWallet.tokenSymbol || tokenInfo.symbol,
            amount: amount, valueUSD: tokenInfo.currentPrice * amount, timestamp: new Date().toISOString(), status: "completed",
            recipientWallet: recipient, description: `Sent ${tokenInWallet.tokenSymbol || 'token'} to ${recipient}`
        };
        setDemoTransactions(prevTx => [newTransaction, ...prevTx]);
        alert(`Simulato invio di ${amount} ${tokenInWallet.tokenSymbol || 'tokens'} a ${recipient}. Saldo aggiornato.`);
        console.log(`Sent ${amount} ${tokenInWallet.tokenSymbol}. Remaining: ${anUpdatedTokenInWallet.amount}`);
    };

    // Placeholder per le altre funzioni
    const approveTransaction = (transactionId: string) => { console.warn("approveTransaction not fully implemented") };
    const rejectTransaction = (transactionId: string) => { console.warn("rejectTransaction not fully implemented") };
    const addPendingTransaction = (tokenId: string, amount: number, merchant: string, description: string) => { console.warn("addPendingTransaction not fully implemented") };
    const rewardWallet = (recipientWallet: string, amount: number) => { console.warn("rewardWallet not fully implemented") };

    // ----- EFFETTI -----

    // Effetto per caricare il prezzo iniziale quando si entra in demo mode
    useEffect(() => {
        if (isDemoMode) {
            console.log("Demo mode active, ensuring Solana price is loaded.");
            getSolanaPrice(); // Chiama la funzione che gestisce la cache
        }
    }, [isDemoMode, getSolanaPrice]); // Aggiungi getSolanaPrice alle dipendenze

    // Effetto per fetchare periodicamente (opzionale ma utile)
    useEffect(() => {
        let intervalId: NodeJS.Timeout | null = null;
        if (isDemoMode) {
            // Fetcha subito e poi imposta l'intervallo
            getSolanaPrice();
            intervalId = setInterval(() => {
                console.log("Periodic Solana price check/fetch initiated.");
                getSolanaPrice(); // Non forzare, lascialo decidere in base alla cache
            }, SOLANA_PRICE_CACHE_DURATION_MS + 1000); // Poco più della durata cache
        }

        // Cleanup function per rimuovere l'intervallo quando si esce dalla demo o il componente si smonta
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
                console.log("Cleared periodic Solana price fetch interval.");
            }
        };
    }, [isDemoMode, getSolanaPrice]); // Dipende da isDemoMode e dalla funzione memoizzata


    // Effetti per localStorage
    useEffect(() => { localStorage.setItem("isDemoMode", String(isDemoMode)); }, [isDemoMode]);
    useEffect(() => {
        if (demoUserType) localStorage.setItem("demoUserType", demoUserType);
        else localStorage.removeItem("demoUserType");
    }, [demoUserType]);
    useEffect(() => {
        // Solo salva se in demo mode e i dati esistono
        if (isDemoMode && demoCompanyTokenData) {
            localStorage.setItem("demoCompanyTokenData", JSON.stringify(demoCompanyTokenData));
        }
        // Non rimuovere all'uscita dalla demo, ma solo se toggleDemoMode lo fa esplicitamente
    }, [isDemoMode, demoCompanyTokenData]);
    useEffect(() => {
        if (isDemoMode) localStorage.setItem("demoUserWallet", JSON.stringify(demoUserWallet));
    }, [isDemoMode, demoUserWallet]);
    useEffect(() => {
        if (isDemoMode) localStorage.setItem("demoTransactions", JSON.stringify(demoTransactions));
    }, [isDemoMode, demoTransactions]);

    // ----- RITORNO PROVIDER -----
    return (
        <DemoContext.Provider
            value={{
                isDemoMode,
                toggleDemoMode,
                demoUserType,
                setDemoUserType,
                demoCompanyTokenData,
                demoUserWallet,
                demoTransactions,
                lastPurchaseNotification, // Stato per notifica
                solanaPriceUSD,
                fetchSolanaPrice: fetchSolanaPriceManual, // Funzione per refresh manuale
                allDemoTokensForContext: allDemoAppTokens,
                sendDemoSol,
                sendDemoCustomToken,
                purchaseToken,
                sellToken,
                approveTransaction,
                rejectTransaction,
                addPendingTransaction,
                rewardWallet,
                clearPurchaseNotification // Funzione per pulire notifica
            }}
        >
            {children}
        </DemoContext.Provider>
    );
}

export function useDemo() {
    const context = useContext(DemoContext);
    if (context === undefined) {
        throw new Error("useDemo must be used within a DemoProvider");
    }
    return context;
}