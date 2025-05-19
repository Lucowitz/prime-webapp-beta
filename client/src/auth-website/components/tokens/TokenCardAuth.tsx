// TokenCardAuthUser.tsx
import { Token as AppToken } from "@/types/tokens"; // Usa lo stesso tipo di Token
import { useLanguage } from "@/hooks/useLanguage";
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { officialTokens } from "@/data/tokens"; // Required for buyCustomToken_API logic

// --- START: COPIED/ADAPTED FROM UserWallet.tsx (RECOMMEND MOVING TO A SHARED API UTIL FILE) ---
// These constants and functions are copied here for demonstration.
// In a real application, they should be in a shared module.

const DEV_USER_PRIVATE_KEY = "4xeiYMA4yzNyyrDesgTsLwCRRNh4CKD1LixTNMLz1g4hxMSTudKUVUp8AmtGNjQfkA5EGF3SvcXuDb7qvzNfBumz"; // !!! IMPORTANT: HANDLE SECURELY IN PRODUCTION !!!
const BACKEND_URL_RAYDIUM = "http://localhost:3001";
const COINGECKO_SOL_PRICE_API = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";

const fetchSolanaPriceUSD_API = async (): Promise<number> => {
  try {
    const response = await fetch(COINGECKO_SOL_PRICE_API);
    if (!response.ok) throw new Error(`CoinGecko API responded with ${response.status}`);
    const data = await response.json();
    if (data.solana && data.solana.usd) return data.solana.usd;
    throw new Error("Solana price not found in CoinGecko response");
  } catch (error) {
    console.warn("Failed to fetch Solana price from CoinGecko, using fallback. Error:", error);
    return 170; // Fallback price
  }
};

const fetchTokenPriceInSol_API = async (poolId: string): Promise<number> => {
  if (!poolId) throw new Error("Pool ID is required to fetch token price.");
  const response = await fetch(`${BACKEND_URL_RAYDIUM}/token-price/${poolId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
    throw new Error(errorData.error || `Failed to fetch token price for pool ${poolId} (status ${response.status})`);
  }
  const data = await response.json();
  if (typeof data.priceInSol !== 'number') throw new Error(`Invalid price data received for pool ${poolId}`);
  return data.priceInSol;
};

const buyCustomToken_API = async (
  tokenId: string, // This is the token.mint
  amountSOLToSpend: number,
  privateKey: string,
  slippage: number = 10
): Promise<{ success: boolean; message: string; txId?: string }> => {
  const logPrefix = "[buyCustomToken_API_TokenCard]";

  const tokenInfo = officialTokens.find(t => t.mint === tokenId);
  if (!tokenInfo) {
    return { success: false, message: `Token with mint ${tokenId} not found in officialTokens list.` };
  }

  if (!tokenInfo.LPmint) {
    return { success: false, message: `LPmint missing for the token ${tokenInfo.symbol}.` };
  }

  // Amount is in SOL, needs to be converted to lamports (SOL's base unit)
  const amountInBaseUnits = Math.round(amountSOLToSpend * Math.pow(10, 9)); // SOL has 9 decimals
  if (amountInBaseUnits <= 0) {
    return { success: false, message: "Amount of SOL to spend is too small." };
  }

  const payload = {
    action: 'buy',
    privateKey,
    poolId: tokenInfo.LPmint,
    amount: amountInBaseUnits, // This is amount of SOL in lamports
    slippage
  };

  console.log(`${logPrefix} Payload:`, payload);

  try {
    const res = await fetch(`${BACKEND_URL_RAYDIUM}/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const resText = await res.text();
    const data = JSON.parse(resText); // Try to parse JSON regardless of res.ok
    if (!res.ok || data.error) {
      return { success: false, message: data.error || `Error ${res.status}: ${data.message || resText}` };
    }
    return {
      success: true,
      message: data.message || "Purchase completed successfully.",
      txId: data.txId
    };
  } catch (err) {
    console.error(`${logPrefix} Network error or JSON parsing error:`, err);
    let message = "Network error or unexpected issue during purchase.";
    if (err instanceof Error) message = err.message;
    return { success: false, message };
  }
};
// --- END: COPIED/ADAPTED FROM UserWallet.tsx ---


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
        const fetchedSolPrice = await fetchSolanaPriceUSD_API();
        setSolanaPriceUSD(fetchedSolPrice);

        if (token.LPmint) {
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
    // You might want to add a check for DEV_USER_PRIVATE_KEY presence here
    // if (DEV_USER_PRIVATE_KEY === "METTI PRIVATE KEY QUI") {
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
    if (!DEV_USER_PRIVATE_KEY) {
        alert("Private key not configured. Please configure it in the source code."); // Or use a more secure method
        return;
    }


    setIsSubmittingPurchase(true);
    try {
      // Default slippage, or you can add a field for it in the dialog
      const result = await buyCustomToken_API(token.mint, amountSOL, DEV_USER_PRIVATE_KEY, 10); 
      alert(result.message);
      if (result.success) {
        setShowPurchaseDialog(false);
        setSolAmountToSpend("");
        // if (onPurchaseSuccess) onPurchaseSuccess(); // Call parent callback if provided
        // Optionally, you could trigger a wallet balance refresh here or rely on UserWallet's auto-refresh
      }
    } catch (error) {
      alert(`Purchase Error: ${error instanceof Error ? error.message : "An unknown error occurred."}`);
    } finally {
      setIsSubmittingPurchase(false);
    }
  };

  const sectorLabel = t(`tokens.sectors.${token.sector || 'unknown'}`);

  const estimatedTokensToReceive = (solAmountToSpend && tokenPriceInSOL && Number(solAmountToSpend) > 0)
    ? (Number(solAmountToSpend) / tokenPriceInSOL).toFixed(token.decimals || 6) // Use token specific decimals
    : "0.00";
  
  const costInUSD = (solAmountToSpend && solanaPriceUSD && Number(solAmountToSpend) > 0)
    ? (Number(solAmountToSpend) * solanaPriceUSD).toFixed(2)
    : "0.00";

  const displayPrice = liveTokenPriceUSD ?? token.currentPrice;

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
              {isLoadingPrice ? "Loading..." : (displayPrice !== undefined && displayPrice !== null ? `$${displayPrice.toFixed(Math.max(2, (displayPrice < 1 ? 4 : 2)))}` : "N/A")}
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
          
          {token.LPmint && token.mint && ( // Show Buy button only if LPmint and token.mint exist
            <Button
              onClick={handleInitiatePurchase}
              className="flex-1 bg-gradient-to-r from-[#00FFD1] to-[#00c0a0] text-black hover:opacity-90"
              disabled={isLoadingPrice || isSubmittingPurchase || !solanaPriceUSD || !tokenPriceInSOL }
            >
              {isSubmittingPurchase ? "Processing..." : t("tokens.card.buy")}
              {(isLoadingPrice || (!solanaPriceUSD && !token.LPmint)) && " (Loading Price...)"}
              {(DEV_USER_PRIVATE_KEY && token.LPmint) && " (Configure Key)"}
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
                        <span className="font-mono text-white"> {tokenPriceInSOL.toFixed(6)} SOL</span> / 
                        <span className="font-mono text-white"> ${liveTokenPriceUSD.toFixed(4)}</span>
                    </p>
                )}
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
                    min="0.000001"
                    step="any"
                    disabled={isSubmittingPurchase}
                />
            </div>

            {(Number(solAmountToSpend) > 0 && tokenPriceInSOL && solanaPriceUSD) && (
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
                disabled={isSubmittingPurchase || !solAmountToSpend || Number(solAmountToSpend) <= 0 || !tokenPriceInSOL || !solanaPriceUSD }
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