// TokenCard.tsx
import { Token as AppToken } from "@/types/tokens"; // Usa lo stesso tipo di Token
import { useLanguage } from "@/hooks/useLanguage";
import { useState, useEffect } from 'react';
import { useDemo } from "@/context/DemoContext";
import { Button } from "@/components/ui/button";

interface TokenCardProps {
  token: AppToken; // Assicurati che questo tipo includa imageUrl, currentPrice, etc.
}

const TokenCard = ({ token }: TokenCardProps) => {
  const { t } = useLanguage();
  const { 
    purchaseToken, 
    demoUserWallet, 
    solanaPriceUSD, 
    fetchSolanaPrice, 
    isDemoMode, 
    demoUserType 
  } = useDemo();

  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);

  // Fetch del prezzo SOL se necessario
  useEffect(() => {
    if (isDemoMode && demoUserType === 'user' && solanaPriceUSD === null) {
      console.log(`TokenCard (${token.name}): Solana price is null, attempting to fetch.`);
      fetchSolanaPrice();
    }
  }, [isDemoMode, demoUserType, solanaPriceUSD, fetchSolanaPrice, token.name]);

  const handlePurchase = () => {
    const amount = Number(purchaseAmount);

    if (!isDemoMode || demoUserType !== 'user') {
      alert("Purchase is only available in user demo mode.");
      return;
    }

    if (!solanaPriceUSD || solanaPriceUSD <= 0) {
      alert("Solana price is not available. Please try again shortly.");
      console.warn(`TokenCard (${token.name}): Purchase attempt failed, Solana price not available or invalid: ${solanaPriceUSD}`);
      fetchSolanaPrice(); // Tentativo di recupero
      return;
    }

    if (amount > 0 && token.currentPrice !== undefined) { // Aggiunto controllo per token.currentPrice
      const displayCostUSD = amount * token.currentPrice;
      const displayCostSOL = displayCostUSD / solanaPriceUSD;
      
      console.log(`TokenCard (${token.name}): Attempting purchase. Amount: ${amount}, Est. Cost SOL: ${displayCostSOL.toFixed(6)}`);

      // Il controllo di bilancio qui è solo una stima. Quello vero è in DemoContext
      if (displayCostSOL <= demoUserWallet.solanaBalance) {
        purchaseToken(token.id, amount);
        setShowPurchaseDialog(false);
        setPurchaseAmount("");
      } else {
         alert(`Insufficient SOL balance (preliminary check).\nRequired: ~${displayCostSOL.toFixed(4)} SOL\nAvailable: ${demoUserWallet.solanaBalance.toFixed(4)} SOL`);
      }
    } else {
        if (token.currentPrice === undefined) {
            alert("Token price information is missing.");
            console.error(`TokenCard (${token.name}): token.currentPrice is undefined.`);
        } else if (amount <= 0) {
            alert("Purchase amount must be greater than zero.");
        }
    }
  };

  const sectorLabel = t(`tokens.sectors.${token.sector || 'unknown'}`); // Fallback per sector

  // Calcoli per il display nel dialog
  const costDisplaySOL = (purchaseAmount && token.currentPrice !== undefined && solanaPriceUSD)
    ? (Number(purchaseAmount) * token.currentPrice / solanaPriceUSD).toFixed(4)
    : "0.0000";
  const costDisplayUSD = (purchaseAmount && token.currentPrice !== undefined)
    ? (Number(purchaseAmount) * token.currentPrice).toFixed(2)
    : "0.00";

  // Determina se il pulsante "Buy" deve essere mostrato
  // Solo in demo mode, per utenti 'user'
  const canShowBuyButton = isDemoMode && demoUserType === 'user';

  return (
    <div className="token-card bg-[#1E1E1E] border border-gray-700 rounded-xl overflow-hidden hover:border-[#00FFD1]/70 transition-all duration-300 flex flex-col shadow-lg">
      {/* Immagine del Token */}
      <div className="h-48 w-full relative">
        {token.imageUrl ? (
          <img 
            src={token.imageUrl} 
            alt={token.name} 
            className="w-full h-full object-cover opacity-70" 
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; /* Nascondi se l'immagine non carica */ }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
            <span className="text-gray-500 text-sm">No Image</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E1E1E] via-transparent to-transparent"></div>
        {token.sector && (
            <div className="absolute bottom-3 left-3">
            <span className="bg-[#00FFD1] bg-opacity-20 text-[#00FFD1] px-2.5 py-1 rounded-full text-xs font-semibold border border-[#00FFD1]/50">
                {sectorLabel}
            </span>
            </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-heading font-bold text-xl text-white">{token.name || "Unnamed Token"}</h3>
          <div className="bg-sky-500/20 px-2 py-0.5 rounded-full border border-sky-500/50">
            <span className="text-sky-400 font-mono text-xs font-medium">{token.symbol || "N/A"}</span>
          </div>
        </div>

        <p className="text-gray-400 text-sm mb-5 flex-grow min-h-[60px]">
          {token.description || "No description available."}
        </p>

        <div className="grid grid-cols-3 gap-3 text-xs mb-5 border-t border-b border-gray-700 py-3">
          <div>
            <span className="text-gray-500 block uppercase tracking-wider">{t("tokens.card.marketcap")}</span>
            <span className="font-medium font-mono text-gray-300">{token.marketCap || "N/A"}</span>
          </div>
          <div>
            <span className="text-gray-500 block uppercase tracking-wider">{t("tokens.card.supply")}</span>
            <span className="font-medium font-mono text-gray-300">{token.supply || "N/A"}</span>
          </div>
          <div>
            <span className="text-gray-500 block uppercase tracking-wider">{t("tokens.card.price")}</span>
            <span className="font-medium font-mono text-white">
              {token.currentPrice !== undefined ? `$${token.currentPrice.toFixed(2)}` : "N/A"}
            </span>
          </div>
        </div>

        <div className="mt-auto flex space-x-2"> {/* mt-auto spinge i bottoni in basso se flex-grow è usato sopra */}
          <Button
            variant="outline"
            onClick={() => alert(`Details for ${token.name}`)} // Sostituire con navigazione reale o modal
            className="flex-1 text-gray-300 border-gray-600 hover:bg-gray-700/50"
          >
            {t("tokens.card.details")}
          </Button>
          
          {/* Mostra il pulsante "Buy" solo se le condizioni sono soddisfatte */}
          {canShowBuyButton && (
            <Button
              onClick={() => {
                if (!solanaPriceUSD) {
                    alert("Solana price is still loading. Please wait a moment.");
                    fetchSolanaPrice(); // Incoraggia il fetch se non è ancora pronto
                    return;
                }
                setShowPurchaseDialog(true);
              }}
              className="flex-1 bg-gradient-to-r from-[#00FFD1] to-[#00c0a0] text-black hover:opacity-90"
              disabled={solanaPriceUSD === null} // Disabilita se il prezzo SOL non è ancora caricato
            >
              {t("tokens.card.buy")}
              {solanaPriceUSD === null && " (Loading Price...)"}
            </Button>
          )}
        </div>
      </div>

      {/* Dialogo di acquisto */}
      {showPurchaseDialog && canShowBuyButton && ( // Assicurati che il dialog si apra solo se il pulsante può essere mostrato
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1E1E] p-6 rounded-lg w-full max-w-md shadow-xl text-white">
            <h3 className="text-xl mb-6 font-semibold">Purchase {token.name}</h3>
            <div className="mb-4 space-y-1">
              <p className="text-sm text-gray-400">Your SOL balance: <span className="font-mono text-[#00FFD1]">{demoUserWallet.solanaBalance.toFixed(4)} SOL</span></p>
              {solanaPriceUSD && <p className="text-xs text-gray-500">1 SOL = ${solanaPriceUSD.toFixed(2)} USD</p>}
            </div>
            <div className="mb-4">
                <label htmlFor={`purchaseAmount-${token.id}`} className="block text-sm font-medium text-gray-400 mb-1">Amount of {token.symbol} to purchase</label>
                <input
                    id={`purchaseAmount-${token.id}`}
                    type="number"
                    value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(e.target.value)}
                    className="w-full p-2 bg-[#2A2A2A] rounded mt-1 text-white border border-gray-600 focus:border-[#00FFD1] outline-none"
                    placeholder="0.00"
                    min="0.000001" // Un minimo molto piccolo
                    step="any"
                />
            </div>
            {(purchaseAmount && Number(purchaseAmount) > 0 && token.currentPrice !== undefined && solanaPriceUSD) && (
                <div className="mb-6 text-sm text-gray-400 bg-[#2A2A2A]/50 p-3 rounded-md">
                    <p>Estimated Cost:</p>
                    <p><span className="font-mono text-white">{costDisplaySOL} SOL</span> (approx. <span className="font-mono text-white">${costDisplayUSD} USD</span>)</p>
                </div>
            )}
            <div className="flex gap-3">
              <Button onClick={() => setShowPurchaseDialog(false)} variant="outline" className="flex-1 text-gray-300 border-gray-600 hover:bg-gray-700">
                Cancel
              </Button>
              <Button 
                onClick={handlePurchase} 
                className="flex-1 bg-gradient-to-r from-[#00FFD1] to-[#00c0a0] text-black hover:opacity-90"
                disabled={!purchaseAmount || Number(purchaseAmount) <= 0 || !solanaPriceUSD || token.currentPrice === undefined}
              >
                Confirm Purchase
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenCard;