// src/services/apiService.ts
import { officialTokens } from "@/data/tokens";
import { Token as StaticTokenData } from "@/types/tokens"; // Assicurati che questo tipo includa imageUrl e currentPrice (numero)

// --- CONSTANTS ---
export const DEV_USER_PRIVATE_KEY = "4xeiYMA4yzNyyrDesgTsLwCRRNh4CKD1LixTNMLz1g4hxMSTudKUVUp8AmtGNjQfkA5EGF3SvcXuDb7qvzNfBumz";
const BACKEND_URL = "http://localhost:3000";
const BACKEND_URL_RAYDIUM = "http://localhost:3001";
const COINGECKO_SOL_PRICE_API = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";

// --- TYPE DEFINITIONS (Ideally, move to a shared types file e.g. src/types/api.ts or src/types/wallet.ts) ---
interface BackendTokenInfo {
  name: string;
  symbol: string;
  balance: string;
  mint: string;
  LPmint: string | undefined; // This might not come from this specific backend endpoint, check UserWallet.tsx
  isNativeSol: boolean;
  decimals: number;
}

export interface PurchasedTokenInWallet { // Exporting if UserWallet will directly use this type for its state
  tokenId: string;
  tokenName: string;
  tokenSymbol: string;
  logoUrl?: string;
  amount: number;
  currentPricePerTokenUSD: number;
  currentValueUSD: number;
  isNativeSol: boolean;
  decimals: number;
  isKnown: boolean;
  LPmint: string | undefined;
}

// Helper for knownTokensData, used by fetchUserWalletData_API
const knownTokensData: Record<string, StaticTokenData> = {};
[...officialTokens].forEach(token => {
  if (token.mint) { // Assicurati che l'id esista
    knownTokensData[token.mint] = token;
  }
});

// --- API FUNCTIONS ---

export const fetchSolanaPriceUSD_API = async (): Promise<number> => {
  try {
    console.log("[API CALL][SERVICE] Fetching Solana price from CoinGecko...");
    const response = await fetch(COINGECKO_SOL_PRICE_API);
    if (!response.ok) {
      throw new Error(`CoinGecko API responded with ${response.status}`);
    }
    const data = await response.json();
    if (data.solana && data.solana.usd) {
      console.log("[SERVICE] Solana price fetched:", data.solana.usd);
      return data.solana.usd;
    }
    throw new Error("Solana price not found in CoinGecko response");
  } catch (error) {
    console.warn("[SERVICE] Failed to fetch Solana price from CoinGecko, using fallback. Error:", error);
    return 170; // Fallback price
  }
};

export const fetchTokenPriceInSol_API = async (poolId: string): Promise<number> => {
  if (!poolId) { // Added guard for missing poolId
    console.error("[API CALL FRONTEND][SERVICE] Pool ID is required.");
    throw new Error("Pool ID is required to fetch token price.");
  }
  console.log(`[API CALL FRONTEND][SERVICE] Fetching token price in SOL for pool ${poolId}`);
  const response = await fetch(`${BACKEND_URL_RAYDIUM}/token-price/${poolId}`);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
    console.error(`[API CALL FRONTEND][SERVICE] Failed to fetch token price for pool ${poolId}:`, errorData.error || response.statusText);
    throw new Error(errorData.error || `Failed to fetch token price for pool ${poolId} (status ${response.status})`);
  }
  
  const data = await response.json();
  if (typeof data.priceInSol !== 'number') {
    console.error(`[API CALL FRONTEND][SERVICE] Invalid price data received for pool ${poolId}:`, data);
    throw new Error(`Invalid price data received for pool ${poolId}`);
  }
  
  console.log(`[API CALL FRONTEND][SERVICE] Price for pool ${poolId}: ${data.priceInSol} SOL/token`);
  return data.priceInSol;
};

export const fetchUserWalletData_API = async (privateKey: string): Promise<{
  solanaWalletAddress: string | null; // Changed to match original UserWalletData type
  solanaBalance: number;
  purchasedTokens: PurchasedTokenInWallet[];
}> => {
  console.log(`[API CALL][SERVICE] Fetching wallet data from backend: ${BACKEND_URL}/wallet-info`);
  const response = await fetch(`${BACKEND_URL}/wallet-info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ privateKey }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Failed to parse error response" }));
    throw new Error(errorData.error || 'Failed to fetch wallet data from backend');
  }
  const backendData: { walletAddress: string; tokens: BackendTokenInfo[] } = await response.json();
  
  let solBalance = 0;
  const processedTokens: PurchasedTokenInWallet[] = [];

  for (const backendToken of backendData.tokens) {
    const amount = parseFloat(backendToken.balance); // Assuming balance is string
    const decimals = backendToken.decimals;

    if (backendToken.isNativeSol) {
      solBalance = amount;
    } else {
      const staticData = knownTokensData[backendToken.mint];
      
      const tokenName = staticData?.name || backendToken.name;
      const tokenSymbol = staticData?.symbol || backendToken.symbol;
      const logoUrl = staticData?.imageUrl;
      const currentPricePerTokenUSD = staticData?.currentPrice !== undefined ? staticData.currentPrice : 0;
      const lpMintFromStatic = staticData?.LPmint;

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
        isKnown: !!staticData,
        LPmint: lpMintFromStatic,
      });
    }
  }

  return {
    solanaWalletAddress: backendData.walletAddress,
    solanaBalance: solBalance,
    purchasedTokens: processedTokens,
  };
};

export const sendTransaction_API = async ( 
  privateKey: string, 
  recipient: string, 
  amount: number, 
  mint: string | undefined, 
  isNativeSol: boolean 
): Promise<{ success: boolean; message: string; transactionId?: string }> => {
  console.log(`[API CALL][SERVICE] Sending transaction via ${BACKEND_URL}/send-token`);
  const body: any = { privateKey, recipient, amount, isNativeSol };
  if (mint && !isNativeSol) body.mint = mint;
  
  const response = await fetch(`${BACKEND_URL}/send-token`, { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' }, 
    body: JSON.stringify(body) 
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    console.error("[SERVICE] Send transaction failed:", data.error || 'Unknown error');
    throw new Error(data.error || 'Transaction failed');
  }
  console.log("[SERVICE] Send transaction successful:", data.signature);
  return { success: true, message: `Tx successful: ${data.signature}`, transactionId: data.signature };
};

export const sellCustomToken_API = async (
  tokenId: string, // This is token.mint
  amount: number,  // Amount of token to sell
  privateKey: string,
  slippage: number = 10
): Promise<{ success: boolean; message: string; txId?: string }> => {
  const logPrefix = "[sellCustomToken_API][SERVICE]";

  const token = officialTokens.find(t => t.mint === tokenId);
  if (!token) {
    return { success: false, message: `Token with mint ${tokenId} not found in officialTokens list.` };
  }

  if (!token.LPmint) {
    return { success: false, message: `LPmint missing for the token ${token.symbol}.` };
  }

  if (typeof token.decimals !== 'number') {
    return { success: false, message: `Decimals missing for the token ${token.symbol}.` };
  }

  const amountInBaseUnits = Math.round(amount * Math.pow(10, token.decimals));
  if (amountInBaseUnits <= 0) {
    return { success: false, message: "The amount to sell is too small or zero." };
  }

  const payload = {
    action: 'sell',
    privateKey,
    poolId: token.LPmint,
    amount: amountInBaseUnits, // amount of token in its base units
    slippage
  };

  console.log(`${logPrefix} Payload:`, payload);

  try {
    const res = await fetch(`${BACKEND_URL_RAYDIUM}/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const resText = await res.text(); // Always get text first for better error diagnosis
    console.log(`${logPrefix} Raw response:`, resText);
    const data = JSON.parse(resText); // Try to parse JSON

    if (!res.ok || data.error) { // Check res.ok and also if data contains an error property
      console.error(`${logPrefix} Error:`, data.error || `HTTP ${res.status} - ${data.message || resText}`);
      return { success: false, message: data.error || data.message || `Error ${res.status}` };
    }

    return {
      success: true,
      message: data.message || "Sell operation completed successfully.",
      txId: data.txId
    };
  } catch (err) {
    console.error(`${logPrefix} Network or JSON parsing error:`, err);
    const message = err instanceof Error ? err.message : "Network error or unexpected issue during sell operation.";
    return { success: false, message };
  }
};

export const buyCustomToken_API = async (
  tokenId: string, // This is token.mint
  amountSOLToSpend: number,
  privateKey: string,
  slippage: number = 10
): Promise<{ success: boolean; message: string; txId?: string }> => {
  const logPrefix = "[buyCustomToken_API][SERVICE]";

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
    return { success: false, message: "Amount of SOL to spend is too small or zero." };
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
    console.log(`${logPrefix} Raw response:`, resText);
    const data = JSON.parse(resText); 

    if (!res.ok || data.error) {
      console.error(`${logPrefix} Error:`, data.error || `HTTP ${res.status} - ${data.message || resText}`);
      return { success: false, message: data.error || data.message || `Error ${res.status}` };
    }
    return {
      success: true,
      message: data.message || "Purchase completed successfully.",
      txId: data.txId
    };
  } catch (err) {
    console.error(`${logPrefix} Network or JSON parsing error:`, err);
    const message = err instanceof Error ? err.message : "Network error or unexpected issue during purchase.";
    return { success: false, message };
  }
};