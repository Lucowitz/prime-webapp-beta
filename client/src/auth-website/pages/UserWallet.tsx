// src/auth-website/pages/UserWallet.tsx
import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import {
  DEV_USER_PRIVATE_KEY,
  fetchSolanaPriceUSD_API,
  fetchTokenPriceInSol_API,
  fetchUserWalletData_API,
  sendTransaction_API,
  sellCustomToken_API,
  buyCustomToken_API,
  PurchasedTokenInWallet
} from "../components/services/apiService";

interface UserWalletData {
  solanaWalletAddress: string | null;
  solanaBalance: number;
  solanaPriceUSD: number | null;
  purchasedTokens: PurchasedTokenInWallet[];
  isLoading: boolean;
  error: string | null;
}

type SortKey = "value" | "amount" | "name";
type SortDirection = "asc" | "desc";

interface SortOption {
  key: SortKey;
  direction: SortDirection;
}

export default function UserWallet() {
  const [walletData, setWalletData] = useState<UserWalletData>({
    solanaWalletAddress: null, solanaBalance: 0, solanaPriceUSD: null,
    purchasedTokens: [], isLoading: true, error: null,
  });
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendForm, setSendForm] = useState({ amount: "", recipientAddress: "", selectedTokenId: "SOL" });
  
  // --- Nuovi stati per i dialoghi di acquisto/vendita ---
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [showSellDialog, setShowSellDialog] = useState(false);
  const [selectedTokenForOperation, setSelectedTokenForOperation] = useState<PurchasedTokenInWallet | null>(null);
  const [operationAmount, setOperationAmount] = useState(""); // Per vendita: importo token; Per acquisto: importo SOL
  const [operationSlippage, setOperationSlippage] = useState("10"); // Slippage di default 10%

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>({ key: "value", direction: "desc" });

  const fetchAppData = useCallback(async () => {
    // ... (fetchAppData rimane invariato, assicurati che popoli correttamente currentPricePerTokenUSD)
    setWalletData(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const [initialWalletInfo, solPriceUSD] = await Promise.all([
        fetchUserWalletData_API(DEV_USER_PRIVATE_KEY),
        fetchSolanaPriceUSD_API()
      ]);
  
      const enrichedPurchasedTokens: PurchasedTokenInWallet[] = [];
  
      for (const token of initialWalletInfo.purchasedTokens) {
        let livePricePerTokenUSD = token.currentPricePerTokenUSD; 
  
        if (token.LPmint && !token.isNativeSol && solPriceUSD != null && solPriceUSD > 0) {
          try {
            const priceInSol = await fetchTokenPriceInSol_API(token.LPmint);
            if (typeof priceInSol === 'number' && priceInSol > 0) { 
               livePricePerTokenUSD = priceInSol * solPriceUSD;
            } else {
              console.warn(`[fetchAppData] Received invalid or zero priceInSol for ${token.tokenSymbol} (LP: ${token.LPmint}). Using fallback/static price.`);
            }
          } catch (priceError) {
            console.warn(`[fetchAppData] Failed to fetch live price for ${token.tokenSymbol} (LP: ${token.LPmint}). Using fallback/static price. Error:`, priceError);
          }
        } else if (token.LPmint && (solPriceUSD == null || solPriceUSD <= 0)) {
            console.warn(`[fetchAppData] Cannot calculate live USD price for ${token.tokenSymbol} because SOL price is unavailable or invalid ($${solPriceUSD}).`);
        }
  
        enrichedPurchasedTokens.push({
          ...token,
          currentPricePerTokenUSD: livePricePerTokenUSD,
          currentValueUSD: token.amount * livePricePerTokenUSD,
        });
      }
  
      setWalletData({
        solanaWalletAddress: initialWalletInfo.solanaWalletAddress,
        solanaBalance: initialWalletInfo.solanaBalance,
        purchasedTokens: enrichedPurchasedTokens,
        solanaPriceUSD: solPriceUSD,
        isLoading: false,
        error: null
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error during app data fetch";
      console.error("[fetchAppData] Error:", err);
      setWalletData(prev => ({ ...prev, isLoading: false, error: `Failed to load data: ${errorMsg}` }));
    }
  }, []);

  useEffect(() => { fetchAppData(); }, [fetchAppData]);

  const sortedTokens = useCallback(() => {
    // ... (sortedTokens rimane invariato)
    return [...walletData.purchasedTokens].sort((a, b) => {
      if (sortOption.key !== "amount") {
        if (a.isKnown && !b.isKnown) return -1;
        if (!a.isKnown && b.isKnown) return 1;
      }
      let comparison = 0;
      if (sortOption.key === "value") {
        comparison = b.currentValueUSD - a.currentValueUSD;
      } else if (sortOption.key === "amount") {
        comparison = b.amount - a.amount;
      } else if (sortOption.key === "name") {
        comparison = a.tokenName.localeCompare(b.tokenName); // default asc
      }
      if (comparison === 0 && sortOption.key !== "amount") {
          comparison = b.amount - a.amount;
      }
      if (comparison === 0 && sortOption.key !== "value") {
          comparison = b.currentValueUSD - a.currentValueUSD;
      }
      return sortOption.direction === "desc" ? comparison : -comparison;
    });
  }, [walletData.purchasedTokens, sortOption]);

  const solanaBalanceValueUSD = walletData.solanaPriceUSD ? walletData.solanaBalance * walletData.solanaPriceUSD : 0;
  const totalCustomTokenValueUSD = walletData.purchasedTokens.reduce((acc, t) => acc + t.currentValueUSD, 0);
  const totalBalanceUSD = solanaBalanceValueUSD + totalCustomTokenValueUSD;

  const handleInitiateSend = (tokenId: string | "SOL") => { 
    setSendForm({ amount: "", recipientAddress: "", selectedTokenId: tokenId });
    setShowSendDialog(true);
  };
  const handleConfirmSend = async () => {
    // ... (handleConfirmSend rimane invariato)
    const amountNum = Number(sendForm.amount);
    if (amountNum <= 0 || !sendForm.recipientAddress.trim()) {
      alert("Please enter a valid amount and recipient address.");
      return;
    }
    setIsSubmitting(true);
    try {
      const isSendingSol = sendForm.selectedTokenId === "SOL";
      const tokenMint = isSendingSol ? undefined : sendForm.selectedTokenId;

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

  // --- Funzioni modificate per usare i dialoghi ---
  const handleInitiateSellWithDialog = (token: PurchasedTokenInWallet) => {
    setSelectedTokenForOperation(token);
    setOperationAmount("");
    setOperationSlippage("10");
    setShowSellDialog(true);
  };
  
  const handleInitiateBuyWithDialog = (token: PurchasedTokenInWallet) => {
    setSelectedTokenForOperation(token);
    setOperationAmount("");
    setOperationSlippage("10");
    setShowBuyDialog(true);
  };

  const handleConfirmSell = async () => {
    if (!selectedTokenForOperation) return;
    
    const amountToSell = Number(operationAmount);
    if (isNaN(amountToSell) || amountToSell <= 0 || amountToSell > selectedTokenForOperation.amount) {
      alert("Invalid amount to sell.");
      return;
    }
    
    let slippage = Number(operationSlippage);
    if (isNaN(slippage) || slippage <= 0 || slippage > 100) {
      alert("Invalid slippage percentage. Using default 10%.");
      slippage = 10;
    }
    
    setIsSubmitting(true);
    try {
      const result = await sellCustomToken_API(selectedTokenForOperation.tokenId, amountToSell, DEV_USER_PRIVATE_KEY, slippage);
      alert(result.message);
      if (result.success) {
        setShowSellDialog(false);
        await fetchAppData();
      }
    } catch (error) {
      alert(`Sell Error: ${error instanceof Error ? error.message : "Unknown."}`);
    } finally {
      setIsSubmitting(false);
      setSelectedTokenForOperation(null);
      setOperationAmount("");
    }
  };
  
  const handleConfirmBuy = async () => {
    if (!selectedTokenForOperation) return;

    const amountSOLToSpend = Number(operationAmount);
    if (isNaN(amountSOLToSpend) || amountSOLToSpend <= 0) {
      alert("Invalid amount of SOL to spend.");
      return;
    }
    if (amountSOLToSpend > walletData.solanaBalance) {
      alert(`Insufficient SOL balance. You have ${walletData.solanaBalance.toFixed(4)} SOL.`);
      return;
    }
        
    let slippage = Number(operationSlippage);
    if (isNaN(slippage) || slippage <= 0 || slippage > 100) {
      alert("Invalid slippage percentage. Using default 10%.");
      slippage = 10;
    }
    
    setIsSubmitting(true);
    try {
      const result = await buyCustomToken_API(selectedTokenForOperation.tokenId, amountSOLToSpend, DEV_USER_PRIVATE_KEY, slippage);
      alert(result.message);
      if (result.success) {
        setShowBuyDialog(false);
        await fetchAppData();
      }
    } catch (error) {
      alert(`Buy Error: ${error instanceof Error ? error.message : "Unknown."}`);
    } finally {
      setIsSubmitting(false);
      setSelectedTokenForOperation(null);
      setOperationAmount("");
    }
  };

  const handleReceive = () => {
    // ... (handleReceive rimane invariato)
    if (walletData.solanaWalletAddress) {
      alert(`Your Solana Wallet Address:\n${walletData.solanaWalletAddress}`);
      navigator.clipboard.writeText(walletData.solanaWalletAddress).then(() => alert("Address copied!"))
        .catch(err => console.warn("Copy failed: ", err));
    } else {
      alert("Wallet address not loaded.");
    }
  };
  const handleSortChange = (key: SortKey) => {
    // ... (handleSortChange rimane invariato)
    setSortOption(prev => ({
        key,
        direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc"
    }));
  };

  // Calcoli per i dialoghi (da usare dentro il JSX dei dialoghi)
  const getTokenPriceInSolForDialog = (token: PurchasedTokenInWallet | null): number | null => {
    if (!token || !token.currentPricePerTokenUSD || !walletData.solanaPriceUSD || walletData.solanaPriceUSD === 0) {
      return null;
    }
    return token.currentPricePerTokenUSD / walletData.solanaPriceUSD;
  };


  if (walletData.isLoading && !walletData.solanaWalletAddress) { 
    return <div className="py-20 bg-[#121212] text-white text-center">Loading Wallet...</div>;
  }
  if (walletData.error) {
    return <div className="py-20 bg-[#121212] text-white text-center text-red-500">Error: {walletData.error} <Button onClick={fetchAppData} className="ml-2">Retry</Button></div>;
  }

  const currentSortedTokens = sortedTokens();

  return (
    <>
      <Helmet><title>My Wallet</title></Helmet>
      <section className="py-10 sm:py-20 bg-[#121212] text-white min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {isSubmitting && <div className="fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg z-[100] animate-pulse">Processing...</div>}
            
            <div className="bg-[#1E1E1E] rounded-xl p-6 mb-8 shadow-xl">
              {/* Header del Wallet (invariato) */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-6 border-b border-gray-700">
                <div>
                  <h2 className="text-gray-400 text-sm mb-1">Total Estimated Balance</h2>
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold font-heading mr-2">${totalBalanceUSD.toFixed(2)}</span>
                    {walletData.isLoading && <span className="text-xs text-yellow-400 animate-pulse">(Updating...)</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate" title={walletData.solanaWalletAddress || ""}>
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
                <Button variant="outline" className="border-[#00FFD1] text-[#00FFD1] hover:bg-[#00FFD1]/10 py-3 col-span-2 sm:col-span-1" onClick={() => window.location.href = '/authed/explorer'}><span className="flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>Buy Tokens</span></Button>
              </div>

              {/* Header Lista Token e Ordinamento (invariato) */}
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-300">Your Tokens</h3>
                <div className="flex gap-2 text-xs">
                    Sort by:
                    <button onClick={() => handleSortChange("value")} className={`hover:text-white px-1 rounded ${sortOption.key === "value" ? "text-white font-bold bg-gray-700" : "text-gray-400"}`}>Value {sortOption.key === "value" && (sortOption.direction === "desc" ? "↓" : "↑")}</button>
                    <button onClick={() => handleSortChange("amount")} className={`hover:text-white px-1 rounded ${sortOption.key === "amount" ? "text-white font-bold bg-gray-700" : "text-gray-400"}`}>Amount {sortOption.key === "amount" && (sortOption.direction === "desc" ? "↓" : "↑")}</button>
                    <button onClick={() => handleSortChange("name")} className={`hover:text-white px-1 rounded ${sortOption.key === "name" ? "text-white font-bold bg-gray-700" : "text-gray-400"}`}>Name {sortOption.key === "name" && (sortOption.direction === "asc" ? "↑" : "↓")}</button>
                </div>
              </div>
              
              {/* Lista Token */}
              <div className="space-y-3">
                {currentSortedTokens.length > 0 ? currentSortedTokens.map((token) => {
                  const tokenCardStyle: React.CSSProperties = token.logoUrl
                    ? { backgroundImage: `linear-gradient(to right, rgba(10,10,10,0.99) 0%, rgba(15,15,15,0.9) 15%, rgba(25,25,25,0.7) 50%, rgba(15,15,15,0.9) 85%, rgba(10,10,10,0.99) 100%), url(${token.logoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : { background: 'linear-gradient(135deg, #2D3748 0%, #1A202C 100%)' };
                  const displayDecimals = token.decimals ?? 2;
                  const priceDisplayPrecision = token.currentPricePerTokenUSD > 0 ? (token.currentPricePerTokenUSD < 0.0001 ? 8 : (token.currentPricePerTokenUSD < 0.01 ? 6 : 4)) : 2;

                  return (
                    <div key={token.tokenId} style={tokenCardStyle}
                         className="p-4 rounded-lg flex flex-col sm:flex-row items-stretch justify-between relative overflow-hidden shadow-md hover:shadow-lg transition-shadow min-h-[130px]">
                        <div className="z-10 flex flex-col justify-center flex-grow mb-3 sm:mb-0 sm:mr-4">
                            <h5 className="font-medium text-white text-lg truncate" title={`${token.tokenName} (${token.tokenSymbol})`}>
                                {token.tokenName} <span className="text-gray-300">({token.tokenSymbol})</span>
                            </h5>
                            <span className="block text-base text-gray-200">
                                {token.amount.toLocaleString(undefined, { minimumFractionDigits: displayDecimals, maximumFractionDigits: displayDecimals })}
                            </span>
                            <span className="block text-xs text-gray-400 font-mono_custom truncate" title={token.tokenId}>
                                Mint: {token.tokenId.substring(0,10)}...{token.tokenId.slice(-4)}
                            </span>
                        </div>
                        <div className="z-10 flex flex-col items-end justify-between text-right sm:w-auto w-full">
                            <div>
                                <div className="font-mono text-white text-lg">${token.currentValueUSD.toFixed(2)}</div>
                                <div className="text-xs text-gray-300">(${token.currentPricePerTokenUSD.toFixed(priceDisplayPrecision)}/token)</div>
                            </div>
                            <div className="mt-2 flex gap-2 flex-wrap justify-end">
                                <Button size="sm" variant="outline" className="text-xs border-sky-400 text-sky-400 hover:bg-sky-400/20 backdrop-blur-sm bg-slate-700/30" onClick={() => handleInitiateSend(token.tokenId)} disabled={isSubmitting}>Send</Button>
                                {token.LPmint && <Button size="sm" variant="outline" className="text-xs border-red-400 text-red-400 hover:bg-red-400/20 backdrop-blur-sm bg-slate-700/30" onClick={() => handleInitiateSellWithDialog(token)} disabled={isSubmitting}>Sell</Button>}
                                {token.LPmint && <Button size="sm" variant="outline" className="text-xs border-emerald-400 text-emerald-400 hover:bg-emerald-400/20 backdrop-blur-sm bg-slate-700/30" onClick={() => handleInitiateBuyWithDialog(token)} disabled={isSubmitting}>Buy</Button>}
                            </div>
                        </div>
                    </div>
                  );
                }) : (
                  !walletData.isLoading && <div className="text-center py-10 text-gray-500">No SPL tokens found. You can buy some from the <a href="/authed/explorer" className="text-[#00FFD1] hover:underline">Token Explorer</a>.</div>
                )}
              </div>
            </div>
            
            {/* Dialogo di Invio (invariato) */}
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

            {/* --- Nuovo Dialogo di Acquisto --- */}
            {showBuyDialog && selectedTokenForOperation && (
              <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-[#1E1E1E] p-6 rounded-lg w-full max-w-md shadow-xl text-white">
                  <h3 className="text-xl mb-4 font-semibold">Buy {selectedTokenForOperation.tokenSymbol}</h3>
                  
                  <div className="mb-4 space-y-1 text-sm">
                    {walletData.solanaPriceUSD && <p className="text-gray-400">Current SOL Price: <span className="font-mono text-white">${walletData.solanaPriceUSD.toFixed(2)}/SOL</span></p>}
                    {walletData.solanaPriceUSD && selectedTokenForOperation.currentPricePerTokenUSD > 0 && (
                        <p className="text-gray-400">
                            Current {selectedTokenForOperation.tokenSymbol} Price: 
                            <span className="font-mono text-white"> {(selectedTokenForOperation.currentPricePerTokenUSD / walletData.solanaPriceUSD).toFixed(Math.max(4, selectedTokenForOperation.decimals || 6))} SOL</span> / 
                            <span className="font-mono text-white"> ${selectedTokenForOperation.currentPricePerTokenUSD.toFixed(4)}</span>
                        </p>
                    )}
                     <p className="text-gray-400">Your SOL Balance: <span className="font-mono text-white">{walletData.solanaBalance.toFixed(4)} SOL</span></p>
                  </div>

                  <div className="mb-4">
                      <label htmlFor="buyAmountSOL" className="block text-sm font-medium text-gray-400 mb-1">Amount of SOL to spend</label>
                      <input
                          id="buyAmountSOL" type="number" value={operationAmount}
                          onChange={(e) => setOperationAmount(e.target.value)}
                          className="w-full p-2 bg-[#2A2A2A] rounded mt-1 text-white border border-gray-600 focus:border-[#00FFD1] outline-none"
                          placeholder="0.00 SOL" min="0.000001" step="any" disabled={isSubmitting}
                      />
                  </div>

                  <div className="mb-4">
                      <label htmlFor="buySlippage" className="block text-sm font-medium text-gray-400 mb-1">Slippage (%)</label>
                      <input
                          id="buySlippage" type="number" value={operationSlippage}
                          onChange={(e) => setOperationSlippage(e.target.value)}
                          className="w-full p-2 bg-[#2A2A2A] rounded mt-1 text-white border border-gray-600 focus:border-[#00FFD1] outline-none"
                          placeholder="10" min="0.1" max="100" step="0.1" disabled={isSubmitting}
                      />
                  </div>
                  
                  {Number(operationAmount) > 0 && walletData.solanaPriceUSD && selectedTokenForOperation.currentPricePerTokenUSD > 0 && getTokenPriceInSolForDialog(selectedTokenForOperation) && getTokenPriceInSolForDialog(selectedTokenForOperation)! > 0 && (
                      <div className="mb-6 text-sm text-gray-400 bg-[#2A2A2A]/50 p-3 rounded-md">
                          <p>You are spending: <span className="font-mono text-white">{Number(operationAmount).toFixed(4)} SOL</span> (approx. <span className="font-mono text-white">${(Number(operationAmount) * walletData.solanaPriceUSD).toFixed(2)} USD</span>)</p>
                          <p>You will receive approx: <span className="font-mono text-white">{(Number(operationAmount) / getTokenPriceInSolForDialog(selectedTokenForOperation)!).toFixed(selectedTokenForOperation.decimals || 6)} {selectedTokenForOperation.tokenSymbol}</span></p>
                          <p className="text-xs mt-1 text-gray-500">(Slippage and transaction fees may apply)</p>
                      </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button onClick={() => { setShowBuyDialog(false); setSelectedTokenForOperation(null); }} variant="outline" className="flex-1 text-gray-300 border-gray-600 hover:bg-gray-700" disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleConfirmBuy} className="flex-1 bg-gradient-to-r from-[#00FFD1] to-[#00c0a0] text-black hover:opacity-90" 
                            disabled={isSubmitting || !operationAmount || Number(operationAmount) <= 0 || !operationSlippage || Number(operationSlippage) <= 0 || Number(operationAmount) > walletData.solanaBalance}>
                      {isSubmitting ? "Processing..." : "Confirm Buy"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* --- Nuovo Dialogo di Vendita --- */}
            {showSellDialog && selectedTokenForOperation && (
              <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-[#1E1E1E] p-6 rounded-lg w-full max-w-md shadow-xl text-white">
                  <h3 className="text-xl mb-4 font-semibold">Sell {selectedTokenForOperation.tokenSymbol}</h3>
                  
                  <div className="mb-4 space-y-1 text-sm">
                    {walletData.solanaPriceUSD && selectedTokenForOperation.currentPricePerTokenUSD > 0 && (
                        <p className="text-gray-400">
                            Current {selectedTokenForOperation.tokenSymbol} Price: 
                            <span className="font-mono text-white"> {(selectedTokenForOperation.currentPricePerTokenUSD / walletData.solanaPriceUSD!).toFixed(Math.max(4, selectedTokenForOperation.decimals || 6))} SOL</span> / 
                            <span className="font-mono text-white"> ${selectedTokenForOperation.currentPricePerTokenUSD.toFixed(4)}</span>
                        </p>
                    )}
                     <p className="text-gray-400">Your {selectedTokenForOperation.tokenSymbol} Balance: <span className="font-mono text-white">{selectedTokenForOperation.amount.toLocaleString(undefined, {minimumFractionDigits:selectedTokenForOperation.decimals, maximumFractionDigits:selectedTokenForOperation.decimals})}</span></p>
                  </div>

                  <div className="mb-4">
                      <label htmlFor="sellAmountToken" className="block text-sm font-medium text-gray-400 mb-1">Amount of {selectedTokenForOperation.tokenSymbol} to sell</label>
                      <input
                          id="sellAmountToken" type="number" value={operationAmount}
                          onChange={(e) => setOperationAmount(e.target.value)}
                          className="w-full p-2 bg-[#2A2A2A] rounded mt-1 text-white border border-gray-600 focus:border-[#00FFD1] outline-none"
                          placeholder={`0.00 ${selectedTokenForOperation.tokenSymbol}`} min="0" step="any" disabled={isSubmitting}
                      />
                  </div>

                  <div className="mb-4">
                      <label htmlFor="sellSlippage" className="block text-sm font-medium text-gray-400 mb-1">Slippage (%)</label>
                      <input
                          id="sellSlippage" type="number" value={operationSlippage}
                          onChange={(e) => setOperationSlippage(e.target.value)}
                          className="w-full p-2 bg-[#2A2A2A] rounded mt-1 text-white border border-gray-600 focus:border-[#00FFD1] outline-none"
                          placeholder="10" min="0.1" max="100" step="0.1" disabled={isSubmitting}
                      />
                  </div>
                  
                   {Number(operationAmount) > 0 && walletData.solanaPriceUSD && selectedTokenForOperation.currentPricePerTokenUSD > 0 && getTokenPriceInSolForDialog(selectedTokenForOperation) && (
                      <div className="mb-6 text-sm text-gray-400 bg-[#2A2A2A]/50 p-3 rounded-md">
                          <p>You are selling: <span className="font-mono text-white">{Number(operationAmount).toFixed(selectedTokenForOperation.decimals || 6)} {selectedTokenForOperation.tokenSymbol}</span></p>
                          <p>You will receive approx: <span className="font-mono text-white">{(Number(operationAmount) * getTokenPriceInSolForDialog(selectedTokenForOperation)!).toFixed(4)} SOL</span></p>
                          <p>(approx. <span className="font-mono text-white">${(Number(operationAmount) * selectedTokenForOperation.currentPricePerTokenUSD).toFixed(2)} USD</span>)</p>
                          <p className="text-xs mt-1 text-gray-500">(Slippage and transaction fees may apply)</p>
                      </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button onClick={() => { setShowSellDialog(false); setSelectedTokenForOperation(null); }} variant="outline" className="flex-1 text-gray-300 border-gray-600 hover:bg-gray-700" disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleConfirmSell} className="flex-1 bg-gradient-to-r from-[#FF4136] to-[#c00000] text-white hover:opacity-90" // Colore rosso per la vendita
                            disabled={isSubmitting || !operationAmount || Number(operationAmount) <= 0 || !operationSlippage || Number(operationSlippage) <= 0 || Number(operationAmount) > selectedTokenForOperation.amount}>
                      {isSubmitting ? "Processing..." : "Confirm Sell"}
                    </Button>
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