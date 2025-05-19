// src/auth-website/components/tokens/TokenCardAuth.tsx
import { Token as AppToken } from "@/types/tokens";
import { useLanguage } from "@/hooks/useLanguage";
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  DEV_USER_PRIVATE_KEY, // Imported but used implicitly by buyCustomToken_API
  fetchSolanaPriceUSD_API,
  fetchTokenPriceInSol_API,
  buyCustomToken_API
} from "../services/apiService.ts"; // Adjust the relative path if your file structure is different

interface TokenCardProps {
  token: AppToken;
  // onPurchaseSuccess?: () => void; // Optional: callback to refresh global state e.g. wallet balance
}

const TokenCard = ({ token /*, onPurchaseSuccess */ }: TokenCardProps) => {
  const { t } = useLanguage();

  const [solanaPriceUSD, setSolanaPriceUSD] = useState<number | null>(null);
  const [tokenPriceInSOL, setTokenPriceInSOL] = useState<number | null>(null);
  const [liveTokenPriceUSD, setLiveTokenPriceUSD] = useState<number | null>(token.currentPrice ?? null);
  const [isLoadingPrice, setIsLoadingPrice] = useState<boolean>(false);

  const [solAmountToSpend, setSolAmountToSpend] = useState("");
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [isSubmittingPurchase, setIsSubmittingPurchase] = useState(false);

  useEffect(() => {
    const fetchPrices = async () => {
      if (!token.LPmint) {
        setLiveTokenPriceUSD(token.currentPrice ?? 0); // Use static price if no LP
        return;
      }
      setIsLoadingPrice(true);
      try {
        // Using imported API functions
        const fetchedSolPrice = await fetchSolanaPriceUSD_API();
        setSolanaPriceUSD(fetchedSolPrice);

        if (token.LPmint) { // Check again, though outer if already checks
          const fetchedTokenPriceSOL = await fetchTokenPriceInSol_API(token.LPmint);
          setTokenPriceInSOL(fetchedTokenPriceSOL);

          if (fetchedSolPrice && fetchedTokenPriceSOL) {
            setLiveTokenPriceUSD(fetchedTokenPriceSOL * fetchedSolPrice);
          } else {
            setLiveTokenPriceUSD(token.currentPrice ?? null); // Fallback if anything fails
          }
        } else {
           setLiveTokenPriceUSD(token.currentPrice ?? null); // Fallback if no LPmint
        }
      } catch (error) {
        console.error(`Error fetching prices for ${token.name}:`, error);
        setLiveTokenPriceUSD(token.currentPrice ?? null); // Fallback to static price on error
      } finally {
        setIsLoadingPrice(false);
      }
    };

    fetchPrices();
  }, [token.LPmint, token.name, token.currentPrice]);

  const handleInitiatePurchase = () => {
    if (isLoadingPrice || solanaPriceUSD === null || tokenPriceInSOL === null) {
      alert("Price information is still loading or unavailable. Please try again in a moment.");
      return;
    }
    // DEV_USER_PRIVATE_KEY is imported. If it's a placeholder, this check might be useful.
    // Assuming DEV_USER_PRIVATE_KEY from apiService is the actual key for now.
    // if (DEV_USER_PRIVATE_KEY === "YOUR_PLACEHOLDER_PRIVATE_KEY") {
    //   alert("Developer private key is not configured. Purchase disabled.");
    //   return;
    // }
    setSolAmountToSpend(""); // Reset amount
    setShowPurchaseDialog(true);
  };
  
  const handleConfirmPurchase = async () => {
    const amountSOL = Number(solAmountToSpend);

    if (isNaN(amountSOL) || amountSOL <= 0) {
      alert("Please enter a valid amount of SOL to spend.");
      return;
    }
    if (!token.mint) {
        alert("Token mint ID is missing. Cannot proceed with purchase.");
        return;
    }
    // DEV_USER_PRIVATE_KEY is imported and will be passed to buyCustomToken_API
    // No need for an explicit check for its existence here if apiService handles it,
    // or if we assume it's always configured.
    // The buyCustomToken_API will use the imported DEV_USER_PRIVATE_KEY.

    setIsSubmittingPurchase(true);
    try {
      // Using imported API function
      const result = await buyCustomToken_API(token.mint, amountSOL, DEV_USER_PRIVATE_KEY, 10); 
      alert(result.message);
      if (result.success) {
        setShowPurchaseDialog(false);
        setSolAmountToSpend("");
        // if (onPurchaseSuccess) onPurchaseSuccess();
      }
    } catch (error) {
      alert(`Purchase Error: ${error instanceof Error ? error.message : "An unknown error occurred."}`);
    } finally {
      setIsSubmittingPurchase(false);
    }
  };

  const sectorLabel = t(`tokens.sectors.${token.sector || 'unknown'}`);

  const estimatedTokensToReceive = (solAmountToSpend && tokenPriceInSOL && Number(solAmountToSpend) > 0 && tokenPriceInSOL > 0)
    ? (Number(solAmountToSpend) / tokenPriceInSOL).toFixed(token.decimals ?? 6)
    : "0.00";
  
  const costInUSD = (solAmountToSpend && solanaPriceUSD && Number(solAmountToSpend) > 0)
    ? (Number(solAmountToSpend) * solanaPriceUSD).toFixed(2)
    : "0.00";

  const displayPrice = liveTokenPriceUSD ?? token.currentPrice;

  // Helper for buy button text - assumes DEV_USER_PRIVATE_KEY is the actual key
  // If DEV_USER_PRIVATE_KEY could be a placeholder like "YOUR_KEY_HERE", this logic would change
  const buyButtonTextHelper = () => {
    if (isSubmittingPurchase) return "Processing...";
    let text = t("tokens.card.buy");
    if (isLoadingPrice || (!solanaPriceUSD && token.LPmint)) { // Show loading only if LPmint exists and price is expected
        text += " (Loading Price...)";
    }
    // Example: if DEV_USER_PRIVATE_KEY was a placeholder
    // if (DEV_USER_PRIVATE_KEY === "YOUR_PLACEHOLDER_PRIVATE_KEY" && token.LPmint) {
    //    text += " (Configure Key)";
    // }
    return text;
  };


  return (
    <div className="token-card bg-[#1E1E1E] border border-gray-700 rounded-xl overflow-hidden hover:border-[#00FFD1]/70 transition-all duration-300 flex flex-col shadow-lg">
      <div className="h-48 w-full relative">
        {token.imageUrl ? (
          <img 
            src={token.imageUrl} 
            alt={token.name} 
            className="w-full h-full object-cover opacity-70" 
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
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
            <span className="font-medium font-mono text-gray-300">{token.supply !== undefined ? Number(token.supply).toLocaleString() : "N/A"}</span>
          </div>
          <div>
            <span className="text-gray-500 block uppercase tracking-wider">{t("tokens.card.price")}</span>
            <span className="font-medium font-mono text-white">
              {isLoadingPrice && token.LPmint ? "Loading..." : (displayPrice !== undefined && displayPrice !== null ? `$${displayPrice.toFixed(Math.max(2, (displayPrice < 1 ? (displayPrice < 0.0001 ? 6 : 4) : 2)))}` : "N/A")}
            </span>
          </div>
        </div>

        <div className="mt-auto flex space-x-2">
          <Button
            variant="outline"
            onClick={() => alert(`Details for ${token.name}`)}
            className="flex-1 text-gray-300 border-gray-600 hover:bg-gray-700/50"
          >
            {t("tokens.card.details")}
          </Button>
          
          {token.LPmint && token.mint && (
            <Button
              onClick={handleInitiatePurchase}
              className="flex-1 bg-gradient-to-r from-[#00FFD1] to-[#00c0a0] text-black hover:opacity-90"
              disabled={isLoadingPrice || isSubmittingPurchase || !solanaPriceUSD || !tokenPriceInSOL || !token.LPmint } // Added !token.LPmint for safety, though outer if covers it
            >
              {buyButtonTextHelper()}
            </Button>
          )}
        </div>
      </div>

      {showPurchaseDialog && token.LPmint && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1E1E] p-6 rounded-lg w-full max-w-md shadow-xl text-white">
            <h3 className="text-xl mb-4 font-semibold">Buy {token.name} ({token.symbol})</h3>
            
            <div className="mb-4 space-y-1 text-sm">
                {solanaPriceUSD && <p className="text-gray-400">Current SOL Price: <span className="font-mono text-white">${solanaPriceUSD.toFixed(2)}/SOL</span></p>}
                {tokenPriceInSOL && liveTokenPriceUSD && (
                    <p className="text-gray-400">
                        Current {token.symbol} Price: 
                        <span className="font-mono text-white"> {tokenPriceInSOL.toFixed(Math.max(4, token.decimals || 6))} SOL</span> / 
                        <span className="font-mono text-white"> ${liveTokenPriceUSD.toFixed(4)}</span>
                    </p>
                )}
                 {!tokenPriceInSOL && isLoadingPrice && <p className="text-gray-400">Loading token price...</p>}
                 {!tokenPriceInSOL && !isLoadingPrice && <p className="text-red-400">Could not load token price.</p>}
            </div>

            <div className="mb-4">
                <label htmlFor={`solAmount-${token.id}`} className="block text-sm font-medium text-gray-400 mb-1">Amount of SOL to spend</label>
                <input
                    id={`solAmount-${token.id}`}
                    type="number"
                    value={solAmountToSpend}
                    onChange={(e) => setSolAmountToSpend(e.target.value)}
                    className="w-full p-2 bg-[#2A2A2A] rounded mt-1 text-white border border-gray-600 focus:border-[#00FFD1] outline-none"
                    placeholder="0.00 SOL"
                    min="0.000001" // Smallest reasonable SOL amount
                    step="any"
                    disabled={isSubmittingPurchase || isLoadingPrice || !tokenPriceInSOL}
                />
            </div>

            {(Number(solAmountToSpend) > 0 && tokenPriceInSOL && solanaPriceUSD && tokenPriceInSOL > 0) && (
                <div className="mb-6 text-sm text-gray-400 bg-[#2A2A2A]/50 p-3 rounded-md">
                    <p>You are spending: <span className="font-mono text-white">{Number(solAmountToSpend).toFixed(4)} SOL</span> (approx. <span className="font-mono text-white">${costInUSD} USD</span>)</p>
                    <p>You will receive approx: <span className="font-mono text-white">{estimatedTokensToReceive} {token.symbol}</span></p>
                    <p className="text-xs mt-1 text-gray-500">(Slippage and transaction fees may apply)</p>
                </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button onClick={() => setShowPurchaseDialog(false)} variant="outline" className="flex-1 text-gray-300 border-gray-600 hover:bg-gray-700" disabled={isSubmittingPurchase}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmPurchase} 
                className="flex-1 bg-gradient-to-r from-[#00FFD1] to-[#00c0a0] text-black hover:opacity-90"
                disabled={isSubmittingPurchase || !solAmountToSpend || Number(solAmountToSpend) <= 0 || !tokenPriceInSOL || !solanaPriceUSD || isLoadingPrice || tokenPriceInSOL <= 0}
              >
                {isSubmittingPurchase ? "Processing..." : "Confirm Purchase"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenCard;