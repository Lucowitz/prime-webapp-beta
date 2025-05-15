// src/auth-website/pages/UserWallet.tsx
import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { officialTokens, demoTokens } from "@/data/tokens";
import { Token as StaticTokenData } from "@/types/tokens"; // Assicurati che questo tipo includa imageUrl e currentPrice (numero)

//RICORDA DI RUNNARE IL SERVER NELLA CARTELLA server_express_solana -> node server.js DOPO AVER RUNNATO IL CLIENT npm run dev
const DEV_USER_PRIVATE_KEY = "METTI LA TUA PRIVATE KEY QUIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII";
const BACKEND_URL = "http://localhost:3000";
const COINGECKO_SOL_PRICE_API = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";

const knownTokensData: Record<string, StaticTokenData> = {};
[...officialTokens, ...demoTokens].forEach(token => {
  if (token.mint) { // Assicurati che l'id esista
    knownTokensData[token.mint] = token;
  }
});

interface BackendTokenInfo {
  name: string;
  symbol: string;
  balance: string;
  mint: string;
  isNativeSol: boolean;
  decimals: number;
}

interface PurchasedTokenInWallet {
  tokenId: string;
  tokenName: string;
  tokenSymbol: string;
  logoUrl?: string;
  amount: number;
  currentPricePerTokenUSD: number;
  currentValueUSD: number;
  isNativeSol: boolean;
  decimals: number;
  isKnown: boolean; // Per l'ordinamento
}

interface UserWalletData {
  solanaWalletAddress: string | null;
  solanaBalance: number;
  solanaPriceUSD: number | null;
  purchasedTokens: PurchasedTokenInWallet[];
  isLoading: boolean;
  error: string | null;
}

// Opzioni di ordinamento
type SortKey = "value" | "amount" | "name";
type SortDirection = "asc" | "desc";

interface SortOption {
  key: SortKey;
  direction: SortDirection;
}

// --- API FUNCTIONS ---
const fetchSolanaPriceUSD_API = async (): Promise<number> => {
  try {
    console.log("[API CALL] Fetching Solana price from CoinGecko...");
    const response = await fetch(COINGECKO_SOL_PRICE_API);
    if (!response.ok) {
      throw new Error(`CoinGecko API responded with ${response.status}`);
    }
    const data = await response.json();
    if (data.solana && data.solana.usd) {
      console.log("Solana price fetched:", data.solana.usd);
      return data.solana.usd;
    }
    throw new Error("Solana price not found in CoinGecko response");
  } catch (error) {
    console.warn("Failed to fetch Solana price from CoinGecko, using fallback. Error:", error);
    return 170; // Fallback price
  }
};

const fetchUserWalletData_API = async (privateKey: string): Promise<Omit<UserWalletData, 'isLoading' | 'error' | 'solanaPriceUSD'>> => {
  console.log(`[API CALL] Fetching wallet data from backend: ${BACKEND_URL}/wallet-info`);
  const response = await fetch(`${BACKEND_URL}/wallet-info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ privateKey }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch wallet data from backend');
  }
  const backendData: { walletAddress: string; tokens: BackendTokenInfo[] } = await response.json();
  
  let solBalance = 0;
  const processedTokens: PurchasedTokenInWallet[] = [];

  for (const backendToken of backendData.tokens) {
    const amount = parseFloat(backendToken.balance);
    const decimals = backendToken.decimals;

    if (backendToken.isNativeSol) {
      solBalance = amount;
    } else {
      const staticData = knownTokensData[backendToken.mint];
      
      const tokenName = staticData?.name || backendToken.name;
      const tokenSymbol = staticData?.symbol || backendToken.symbol;
      const logoUrl = staticData?.imageUrl;
      const currentPricePerTokenUSD = staticData?.currentPrice !== undefined ? staticData.currentPrice : 0;

      processedTokens.push({
        tokenId: backendToken.mint,
        tokenName: tokenName,
        tokenSymbol: tokenSymbol,
        logoUrl: logoUrl,
        amount: amount,
        currentPricePerTokenUSD: currentPricePerTokenUSD,
        currentValueUSD: amount * currentPricePerTokenUSD,
        isNativeSol: false,
        decimals: decimals,
        isKnown: !!staticData, // Flag per token conosciuti
      });
    }
  }

  return {
    solanaWalletAddress: backendData.walletAddress,
    solanaBalance: solBalance,
    purchasedTokens: processedTokens,
  };
};

const sendTransaction_API = async ( privateKey: string, recipient: string, amount: number, mint: string | undefined, isNativeSol: boolean ): Promise<{ success: boolean; message: string; transactionId?: string }> => {
  const body: any = { privateKey, recipient, amount, isNativeSol };
  if (mint && !isNativeSol) body.mint = mint;
  const response = await fetch(`${BACKEND_URL}/send-token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.error || 'Transaction failed');
  return { success: true, message: `Tx successful: ${data.signature}`, transactionId: data.signature };
};

const sellCustomToken_API = async (tokenId: string, amount: number): Promise<{ success: boolean; message: string; receivedAmountSOL?: number }> => {
  const staticData = knownTokensData[tokenId];
  let estSOL = 0;
  if (staticData?.currentPrice) estSOL = (amount * staticData.currentPrice) / (await fetchSolanaPriceUSD_API()); // Usa prezzo SOL aggiornato
  return { success: true, message: `Simulated sell. Est. ~${estSOL.toFixed(4)} SOL.`, receivedAmountSOL: estSOL };
};

// --- COMPONENT ---
export default function UserWallet() {
  const [walletData, setWalletData] = useState<UserWalletData>({
    solanaWalletAddress: null, solanaBalance: 0, solanaPriceUSD: null,
    purchasedTokens: [], isLoading: true, error: null,
  });
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendForm, setSendForm] = useState({ amount: "", recipientAddress: "", selectedTokenId: "SOL" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>({ key: "value", direction: "desc" });

  const fetchAppData = useCallback(async () => {
    setWalletData(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const [walletInfo, solPrice] = await Promise.all([
        fetchUserWalletData_API(DEV_USER_PRIVATE_KEY),
        fetchSolanaPriceUSD_API()
      ]);
      setWalletData({ ...walletInfo, solanaPriceUSD: solPrice, isLoading: false, error: null });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setWalletData(prev => ({ ...prev, isLoading: false, error: `Failed to load data: ${errorMsg}` }));
    }
  }, []);

  useEffect(() => { fetchAppData(); }, [fetchAppData]);

  const sortedTokens = useCallback(() => {
    return [...walletData.purchasedTokens].sort((a, b) => {
      // Priorità ai token conosciuti se si ordina per valore o nome
      if (sortOption.key !== "amount") {
        if (a.isKnown && !b.isKnown) return -1;
        if (!a.isKnown && b.isKnown) return 1;
      }

      let comparison = 0;
      if (sortOption.key === "value") {
        comparison = b.currentValueUSD - a.currentValueUSD; // default desc
      } else if (sortOption.key === "amount") {
        comparison = b.amount - a.amount; // default desc
      } else if (sortOption.key === "name") {
        comparison = a.tokenName.localeCompare(b.tokenName); // default asc
      }
      
      // Se il valore primario è uguale, ordina per quantità (o altro criterio secondario)
      if (comparison === 0 && sortOption.key !== "amount") {
          comparison = b.amount - a.amount; // Secondario: quantità decrescente
      }
      if (comparison === 0 && sortOption.key !== "value") {
          comparison = b.currentValueUSD - a.currentValueUSD; // Secondario: valore decrescente
      }


      return sortOption.direction === "desc" ? comparison : -comparison;
    });
  }, [walletData.purchasedTokens, sortOption]);


  const solanaBalanceValueUSD = walletData.solanaPriceUSD ? walletData.solanaBalance * walletData.solanaPriceUSD : 0;
  const totalCustomTokenValueUSD = walletData.purchasedTokens.reduce((acc, t) => acc + t.currentValueUSD, 0);
  const totalBalanceUSD = solanaBalanceValueUSD + totalCustomTokenValueUSD;

  const handleInitiateSend = (tokenId: string | "SOL") => { /* ... (invariato) ... */ 
    setSendForm({ amount: "", recipientAddress: "", selectedTokenId: tokenId });
    setShowSendDialog(true);
  };
  const handleConfirmSend = async () => { /* ... (invariato, ma usa DEV_USER_PRIVATE_KEY) ... */
    const amountNum = Number(sendForm.amount);
    if (amountNum <= 0 || !sendForm.recipientAddress.trim()) {
      alert("Please enter a valid amount and recipient address.");
      return;
    }
    setIsSubmitting(true);
    try {
      const isSendingSol = sendForm.selectedTokenId === "SOL";
      const tokenMint = isSendingSol ? undefined : sendForm.selectedTokenId;

      // Validazione saldo
      if (isSendingSol) {
        if (amountNum > walletData.solanaBalance) throw new Error("Insufficient SOL balance.");
      } else {
        const token = walletData.purchasedTokens.find(t => t.tokenId === sendForm.selectedTokenId);
        if (!token || amountNum > token.amount) throw new Error(`Insufficient ${token?.tokenSymbol || "token"} balance.`);
      }
      
      const result = await sendTransaction_API(DEV_USER_PRIVATE_KEY, sendForm.recipientAddress, amountNum, tokenMint, isSendingSol);
      alert(result.message);
      setShowSendDialog(false);
      setSendForm({ amount: "", recipientAddress: "", selectedTokenId: "SOL" });
      await fetchAppData();
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "Unknown send error."}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleInitiateSell = async (tokenId: string, tokenSymbol: string) => { /* ... (invariato, ma usa DEV_USER_PRIVATE_KEY) ... */
    const token = walletData.purchasedTokens.find(t => t.tokenId === tokenId);
    if (!token) return;
    const amountStr = prompt(`Sell ${tokenSymbol} (Available: ${token.amount.toFixed(token.decimals)})?`);
    if (!amountStr) return;
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0 || amount > token.amount) {
      alert("Invalid amount."); return;
    }
    setIsSubmitting(true);
    try {
      const result = await sellCustomToken_API(tokenId, amount); // Non serve privateKey per la simulazione
      alert(result.message);
      await fetchAppData();
    } catch (error) {
      alert(`Sell Error: ${error instanceof Error ? error.message : "Unknown."}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleReceive = () => { /* ... (invariato) ... */
    if (walletData.solanaWalletAddress) {
      alert(`Your Solana Wallet Address:\n${walletData.solanaWalletAddress}`);
      navigator.clipboard.writeText(walletData.solanaWalletAddress).then(() => alert("Address copied!"))
        .catch(err => console.warn("Copy failed: ", err));
    } else {
      alert("Wallet address not loaded.");
    }
  };

  const handleSortChange = (key: SortKey) => {
    setSortOption(prev => ({
        key,
        direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc"
    }));
  };


  if (walletData.isLoading && !walletData.solanaWalletAddress) { 
    return <div className="py-20 bg-[#121212] text-white text-center">Loading Wallet...</div>;
  }
  if (walletData.error) {
    return <div className="py-20 bg-[#121212] text-white text-center text-red-500">Error: {walletData.error} <Button onClick={fetchAppData}>Retry</Button></div>;
  }

  const currentSortedTokens = sortedTokens(); // Chiama la funzione per ottenere l'array ordinato

  return (
    <>
      <Helmet><title>My Wallet</title></Helmet>
      <section className="py-10 sm:py-20 bg-[#121212] text-white min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {isSubmitting && <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg z-[100]">Processing...</div>}
            
            {/* Wallet Header */}
            <div className="bg-[#1E1E1E] rounded-xl p-6 mb-8 shadow-xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-6 border-b border-gray-700">
                <div>
                  <h2 className="text-gray-400 text-sm mb-1">Total Estimated Balance</h2>
                  <span className="text-3xl font-bold font-heading mr-2">${totalBalanceUSD.toFixed(2)}</span>
                  {walletData.isLoading && <span className="text-xs text-yellow-400">(Updating...)</span>}
                  <p className="text-xs text-gray-600 mt-1">
                    Wallet: {walletData.solanaWalletAddress ? `${walletData.solanaWalletAddress.substring(0,6)}...${walletData.solanaWalletAddress.slice(-4)}` : "N/A"}
                  </p>
                </div>
                <div className="mt-4 md:mt-0 text-right">
                  <p className="text-sm text-gray-400 mb-1">Solana Balance</p>
                  <div className="flex items-center justify-end">
                    <img src="/solana-logo.svg" alt="SOL" className="w-5 h-5 mr-2" />
                    <span className="font-mono text-[#00FFD1] text-lg">{walletData.solanaBalance.toLocaleString(undefined, {minimumFractionDigits: 4, maximumFractionDigits: 4})} SOL</span>
                  </div>
                  {walletData.solanaPriceUSD && <span className="text-xs text-gray-500 ml-2">(${solanaBalanceValueUSD.toFixed(2)} USD)</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                <Button onClick={() => handleInitiateSend("SOL")} className="bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white py-3"><span className="flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>Send SOL</span></Button>
                <Button onClick={handleReceive} className="bg-gradient-to-r from-[#0047AB] to-[#8A2BE2] hover:opacity-90 text-white py-3"><span className="flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>Receive</span></Button>
                <Button variant="outline" className="border-[#00FFD1] text-[#00FFD1] hover:bg-[#00FFD1]/10 py-3 col-span-2 sm:col-span-1" onClick={() => window.location.href = '/auth/token-explorer'}><span className="flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>Buy Tokens</span></Button>
              </div>

              {/* Token List Header & Sorting */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-300">Your Tokens</h3>
                <div className="flex gap-2 text-xs">
                    Sort by:
                    <button onClick={() => handleSortChange("value")} className={`hover:text-white ${sortOption.key === "value" ? "text-white font-bold" : "text-gray-400"}`}>Value {sortOption.key === "value" && (sortOption.direction === "desc" ? "↓" : "↑")}</button>
                    <button onClick={() => handleSortChange("amount")} className={`hover:text-white ${sortOption.key === "amount" ? "text-white font-bold" : "text-gray-400"}`}>Amount {sortOption.key === "amount" && (sortOption.direction === "desc" ? "↓" : "↑")}</button>
                    <button onClick={() => handleSortChange("name")} className={`hover:text-white ${sortOption.key === "name" ? "text-white font-bold" : "text-gray-400"}`}>Name {sortOption.key === "name" && (sortOption.direction === "desc" ? "↓" : "↑")}</button>
                </div>
              </div>
              
              {/* Token List */}
              <div className="space-y-3">
                {currentSortedTokens.length > 0 ? currentSortedTokens.map((token) => {
                  const tokenCardStyle: React.CSSProperties = token.logoUrl
                    ? { // Effetto per immagine di sfondo con overlay scuro per leggibilità
                        backgroundImage: `linear-gradient(to right, 
                        rgba(10, 10, 10, 0.99) 0%,       /* Quasi nero e opaco */
                        rgba(15, 15, 15, 0.9) 15%,       /* Transizione */
                        rgba(25, 25, 25, 0.7) 50%,       /* Centro */
                        rgba(15, 15, 15, 0.9) 85%,       /* Transizione */
                        rgba(10, 10, 10, 0.99) 100%      /* Quasi nero e opaco */
                      ), url(${token.logoUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }
                    : { // Fallback se non c'è logo
                        background: 'linear-gradient(135deg, #2D3748 0%, #1A202C 100%)', // Grigio scuro
                      };
                  return (
                    <div key={token.tokenId} style={tokenCardStyle}
                         className="p-4 rounded-lg flex flex-col sm:flex-row items-stretch justify-between relative overflow-hidden shadow-md hover:shadow-xl transition-shadow min-h-[130px]">
                        {/* Left Side: Token Info */}
                        <div className="z-10 flex flex-col justify-center flex-grow mb-3 sm:mb-0 sm:mr-4">
                            <h5 className="font-medium text-white text-lg truncate" title={`${token.tokenName} (${token.tokenSymbol})`}>
                                {token.tokenName} <span className="text-gray-300">({token.tokenSymbol})</span>
                            </h5>
                            <span className="block text-base text-gray-200">
                                {token.amount.toLocaleString(undefined, { minimumFractionDigits: token.decimals, maximumFractionDigits: token.decimals })}
                            </span>
                            <span className="block text-xs text-gray-400 font-mono_custom truncate" title={token.tokenId}>
                                Mint: {token.tokenId}
                            </span>
                        </div>
                        {/* Right Side: Value & Actions */}
                        <div className="z-10 flex flex-col items-end justify-between text-right sm:w-auto w-full">
                            <div>
                                <div className="font-mono text-white text-lg">${token.currentValueUSD.toFixed(2)}</div>
                                <div className="text-xs text-gray-300">(${token.currentPricePerTokenUSD.toFixed(token.currentPricePerTokenUSD > 0 ? 4 : 2)}/token)</div>
                            </div>
                            <div className="mt-2 flex gap-2">
                                <Button size="sm" variant="outline" className="text-xs border-sky-400 text-sky-400 hover:bg-sky-400/20 backdrop-blur-sm bg-slate-700/30" onClick={() => handleInitiateSend(token.tokenId)} disabled={isSubmitting}>Send</Button>
                                <Button size="sm" variant="outline" className="text-xs border-emerald-400 text-emerald-400 hover:bg-emerald-400/20 backdrop-blur-sm bg-slate-700/30" onClick={() => handleInitiateSell(token.tokenId, token.tokenSymbol)} disabled={isSubmitting}>Sell (Sim)</Button>
                            </div>
                        </div>
                    </div>
                  );
                }) : (
                  !walletData.isLoading && <div className="text-center py-10 text-gray-500">No SPL tokens found.</div>
                )}
              </div>
            </div>
            {/* Send Dialog (invariato) */}
            {showSendDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-[#1E1E1E] p-6 rounded-lg w-full max-w-md shadow-xl text-white">
                    <h3 className="text-xl mb-6 font-semibold">
                    Send { (walletData.purchasedTokens.find(t => t.tokenId === sendForm.selectedTokenId) || {tokenSymbol: "SOL"}).tokenSymbol }
                    </h3>
                    <div className="space-y-4">
                    <div>
                        <label htmlFor="recipientAddress" className="text-sm text-gray-400 block mb-1">Recipient Address</label>
                        <input id="recipientAddress" type="text" value={sendForm.recipientAddress}
                            onChange={(e) => setSendForm(prev => ({...prev, recipientAddress: e.target.value}))}
                            className="w-full p-2 bg-[#2A2A2A] rounded mt-1 text-white border border-gray-600 focus:border-[#00FFD1] outline-none"
                            placeholder="Enter recipient Solana address" disabled={isSubmitting} />
                    </div>
                    <div>
                        <label htmlFor="sendAmount" className="text-sm text-gray-400 block mb-1">Amount</label>
                        <input id="sendAmount" type="number" value={sendForm.amount}
                            onChange={(e) => setSendForm(prev => ({...prev, amount: e.target.value}))}
                            className="w-full p-2 bg-[#2A2A2A] rounded mt-1 text-white border border-gray-600 focus:border-[#00FFD1] outline-none"
                            placeholder="0.00" min="0" step="any" disabled={isSubmitting} />
                        <p className="text-xs text-gray-500 mt-1">
                        Available: {
                            (sendForm.selectedTokenId === "SOL" ? walletData.solanaBalance : (walletData.purchasedTokens.find(t => t.tokenId === sendForm.selectedTokenId)?.amount || 0))
                            .toLocaleString(undefined, {
                                minimumFractionDigits: (sendForm.selectedTokenId === "SOL" ? 4 : (walletData.purchasedTokens.find(t => t.tokenId === sendForm.selectedTokenId)?.decimals || 2)),
                                maximumFractionDigits: (sendForm.selectedTokenId === "SOL" ? 9 : (walletData.purchasedTokens.find(t => t.tokenId === sendForm.selectedTokenId)?.decimals || 8))
                            })
                        } { (walletData.purchasedTokens.find(t => t.tokenId === sendForm.selectedTokenId) || {tokenSymbol: "SOL"}).tokenSymbol }
                        </p>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button onClick={() => setShowSendDialog(false)} variant="outline" className="flex-1 text-gray-300 border-gray-600 hover:bg-gray-700" disabled={isSubmitting}>Cancel</Button>
                        <Button onClick={handleConfirmSend} className="flex-1 bg-gradient-to-r from-[#00FFD1] to-[#00c0a0] text-black hover:opacity-90" disabled={isSubmitting || !sendForm.amount || !sendForm.recipientAddress || parseFloat(sendForm.amount) <= 0}>
                        {isSubmitting ? "Sending..." : "Confirm Send"}
                        </Button>
                    </div>
                    </div>
                </div>
                </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}