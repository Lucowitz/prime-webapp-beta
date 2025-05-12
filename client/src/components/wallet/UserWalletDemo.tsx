// UserWalletDemo.tsx
import { useLanguage } from "@/hooks/useLanguage";
import { useDemo } from "@/context/DemoContext";
import { Helmet } from "react-helmet";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
// Rimuovi fetchSolanaPriceUSD da qui

export default function UserWalletDemo() {
  const { t } = useLanguage();
  // Ottieni solanaPriceUSD e allDemoTokensForContext dal contesto
  const { demoUserWallet, solanaPriceUSD, fetchSolanaPrice, sellToken, isDemoMode, demoUserType, sendDemoSol,sendDemoCustomToken /* allDemoTokensForContext */ } = useDemo();
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendAmount, setSendAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [selectedTokenIdForSend, setSelectedTokenIdForSend] = useState<"SOL" | string>("SOL"); // Usa tokenId
  
  useEffect(() => {
    if (isDemoMode && demoUserType === 'user' && solanaPriceUSD === null) {
      fetchSolanaPrice();
    }
  }, [isDemoMode, demoUserType, solanaPriceUSD, fetchSolanaPrice]);

  // Calcolo del valore del saldo SOL in USD
  const solanaBalanceValueUSD = (solanaPriceUSD !== null && demoUserWallet.solanaBalance)
    ? demoUserWallet.solanaBalance * solanaPriceUSD
    : 0;

  // Il tipo PurchasedToken è già definito in DemoContext, ma se serve qui:
  // type PurchasedTokenInWallet = DemoUserWallet['purchasedTokens'][0];

  const totalCustomTokenValueUSD = demoUserWallet.purchasedTokens.reduce(
    (acc, token) => acc + token.currentValueUSD, // Usa currentValueUSD
    0
  );
  const totalBalanceUSD = solanaBalanceValueUSD + totalCustomTokenValueUSD;

  const handleInitiateSend = (tokenId: string | "SOL") => {
    setSelectedTokenIdForSend(tokenId);
    setShowSendDialog(true);
  }

  const handleConfirmSend = () => {
    const amountNum = Number(sendAmount);
    if (amountNum <= 0 || !recipientAddress) {
        alert("Inserisci un importo valido e un indirizzo destinatario.");
        return;
    }

    if (selectedTokenIdForSend === "SOL") {
      if (amountNum <= demoUserWallet.solanaBalance) {
        sendDemoSol(recipientAddress, amountNum);
        // TODO: Implementare `sendSol` nel contesto se si vuole che il saldo si aggiorni
        alert(`Simulated Send: ${amountNum} SOL to ${recipientAddress}. Balance NOT updated yet by this action.`);
        // setDemoUserWallet(prev => ({...prev, solanaBalance: prev.solanaBalance - amountNum})); // Esempio di aggiornamento locale
        setShowSendDialog(false);
        setSendAmount("");
        setRecipientAddress("");
      } else {
        alert("Saldo SOL insufficiente.");
      }
    } else {
      // È un custom token, selectedTokenIdForSend è il tokenId
      const tokenInWallet = demoUserWallet.purchasedTokens.find(t => t.tokenId === selectedTokenIdForSend);
      if (tokenInWallet && amountNum <= tokenInWallet.amount) {
        // TODO: Implementare `sendCustomToken` nel contesto
        sendDemoCustomToken(selectedTokenIdForSend, recipientAddress, amountNum);
        alert(`Simulated Send: ${amountNum} ${tokenInWallet.tokenSymbol || 'tokens'} to ${recipientAddress}. Balance NOT updated yet by this action.`);
        setShowSendDialog(false);
        setSendAmount("");
        setRecipientAddress("");
      } else {
        alert(`Saldo insufficiente per ${tokenInWallet?.tokenSymbol || 'questo token'}.`);
      }
    }
  };
  
  const handleInitiateSell = (tokenId: string) => {
    const amountToSell = prompt(`Quanti token vuoi vendere per ${tokenId}?`);
    if (amountToSell && Number(amountToSell) > 0) {
        sellToken(tokenId, Number(amountToSell));
    }
  };


  return (
    <>
      <Helmet>
        <title>Wallet Demo - Prime Genesis</title>
        <meta name="description" content="Experience Prime Genesis wallet features in demo mode" />
      </Helmet>

      <section className="py-20 bg-[#121212] text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-[#1E1E1E] rounded-xl p-6 mb-8 shadow-xl">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-6 border-b border-gray-700">
                <div>
                  <h2 className="text-gray-400 text-sm mb-1">Total Estimated Balance</h2>
                  <div className="flex items-baseline">
                    <span className="text-3xl font-bold font-heading mr-2">${totalBalanceUSD.toFixed(2)}</span>
                    {/* <span className="text-[#00D395] text-sm flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      +12.5% Placeholder
                    </span> */}
                  </div>
                </div>
                <div className="mt-4 md:mt-0 text-right">
                  <p className="text-sm text-gray-400 mb-1">Solana Balance</p>
                  <div className="flex items-center justify-end">
                    <img src="/solana-logo.svg" alt="SOL" className="w-5 h-5 mr-2"/> {/* Assicurati di avere un logo solana */}
                    <span className="font-mono text-[#00FFD1] text-lg">{demoUserWallet.solanaBalance.toFixed(4)} SOL</span>
                  </div>
                   <span className="text-xs text-gray-500 ml-2">(${solanaBalanceValueUSD.toFixed(2)} USD)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <Button 
                  onClick={() => handleInitiateSend("SOL")}
                  className="bg-[#2A2A2A] hover:bg-[#3A3A3A] transition-colors text-white py-3"
                >
                  <span className="flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>
                    Send SOL
                  </span>
                </Button>
                <Button 
                  className="bg-gradient-to-r from-[#0047AB] to-[#8A2BE2] hover:opacity-90 transition-opacity text-white py-3"
                  onClick={() => alert("Your receive address: demoWallet123.sol (simulated)")}
                >
                  <span className="flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                    Receive
                  </span>
                </Button>
                 <Button 
                  variant="outline"
                  className="border-[#00FFD1] text-[#00FFD1] hover:bg-[#00FFD1]/10 transition-colors py-3"
                  onClick={() => window.location.href = '/token-explorer'} // Assumendo che il token explorer sia a questo path
                >
                  <span className="flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-2"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>
                    Buy Tokens
                  </span>
                </Button>
              </div>
              
              <h3 className="text-lg font-semibold mb-4 text-gray-300">Your Tokens</h3>
              <div className="space-y-3">
                {demoUserWallet.purchasedTokens.length > 0 ? demoUserWallet.purchasedTokens.map((token) => (
                  <div key={token.tokenId} className="p-4 bg-[#2A2A2A] rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-[#3A3A3A] transition-colors">
                    <div className="flex items-center mb-3 sm:mb-0">
                      {token.logoUrl ? (
                        <img src={token.logoUrl} alt={token.tokenSymbol} className="w-10 h-10 rounded-full mr-3 object-cover"/>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-yellow-500 flex items-center justify-center mr-3">
                          <span className="text-white font-medium text-sm">{token.tokenSymbol?.substring(0,3) || "TKN"}</span>
                        </div>
                      )}
                      <div>
                        <h5 className="font-medium text-white">{token.tokenName || "Unknown Token"}</h5>
                        <span className="text-sm text-gray-400">{token.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} {token.tokenSymbol || ""}</span>
                      </div>
                    </div>
                    <div className="text-right w-full sm:w-auto">
                      <div className="font-mono text-white">${token.currentValueUSD.toFixed(2)}</div>
                      <div className="text-xs text-gray-500">
                        Avg. Cost: ${(token.purchaseValueUSD / token.amount).toFixed(2)}/token
                      </div>
                       <div className="mt-2 flex gap-2 justify-end">
                           <Button size="sm" variant="outline" className="text-xs border-sky-500 text-sky-500 hover:bg-sky-500/10" onClick={() => handleInitiateSend(token.tokenId)}>Send</Button>
                           <Button size="sm" variant="outline" className="text-xs border-emerald-500 text-emerald-500 hover:bg-emerald-500/10" onClick={() => handleInitiateSell(token.tokenId)}>Sell</Button>
                       </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-10 text-gray-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto mb-2 opacity-50"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" /></svg>
                    No tokens purchased yet. Explore and buy tokens!
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {showSendDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1E1E] p-6 rounded-lg w-full max-w-md shadow-xl">
            <h3 className="text-xl mb-6 font-semibold text-white">
                Send {selectedTokenIdForSend === "SOL" ? "SOL" : (demoUserWallet.purchasedTokens.find(t=>t.tokenId === selectedTokenIdForSend)?.tokenSymbol || "Token")}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Recipient Address</label>
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="w-full p-2 bg-[#2A2A2A] rounded mt-1 text-white border border-gray-600 focus:border-[#00FFD1] outline-none"
                  placeholder="Enter recipient address (e.g., demoRecipient.sol)"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Amount</label>
                <input
                  type="number"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                  className="w-full p-2 bg-[#2A2A2A] rounded mt-1 text-white border border-gray-600 focus:border-[#00FFD1] outline-none"
                  placeholder="0.00"
                  min="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available: {selectedTokenIdForSend === "SOL" 
                    ? `${demoUserWallet.solanaBalance.toFixed(4)} SOL`
                    : `${(demoUserWallet.purchasedTokens.find(t => t.tokenId === selectedTokenIdForSend)?.amount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 4})} ${demoUserWallet.purchasedTokens.find(t => t.tokenId === selectedTokenIdForSend)?.tokenSymbol || ""}`
                  }
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={() => setShowSendDialog(false)} variant="outline" className="flex-1 text-gray-300 border-gray-600 hover:bg-gray-700">
                  Cancel
                </Button>
                <Button onClick={handleConfirmSend} className="flex-1 bg-gradient-to-r from-[#00FFD1] to-[#00c0a0] text-black hover:opacity-90">
                  Confirm Send
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}