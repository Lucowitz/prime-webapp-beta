import { ApiV3PoolInfoStandardItemCpmm, Raydium, TxVersion, CurveCalculator } from '@raydium-io/raydium-sdk-v2'
import BN from 'bn.js'
import bs58 from 'bs58'
import { Connection, Keypair, clusterApiUrl, PublicKey } from '@solana/web3.js'
import { NATIVE_MINT } from '@solana/spl-token'

const connection = new Connection(clusterApiUrl('devnet'))
const txVersion = TxVersion.V0
const cluster = 'devnet'
// Keep existing connection, txVersion, cluster, raydium, initSdk

//LA PARTE RELATIVA AI DECIMLAS VIENE RELEGATA A USER WALLET QUINDI QUI NON HO BISOGNO DEI DECIMALS PER FARE L'AMOUNT CORRETTO
let raydium: Raydium | undefined

const initSdk = async (owner: Keypair, loadToken = false) => {
  if (raydium) return raydium
  raydium = await Raydium.load({
    owner,
    connection,
    cluster,
    disableFeatureCheck: true,
    disableLoadToken: !loadToken,
    blockhashCommitment: 'finalized',
  })
  return raydium
}
export const handleSwap = async (action: 'buy' | 'sell', privateKey: string, poolId: string, amount: number, slippage: number) => {
  const owner = Keypair.fromSecretKey(bs58.decode(privateKey))
  const raydium = await initSdk(owner, true) // Load tokens for proper balance detection

  const { poolInfo, poolKeys, rpcData } = await raydium.cpmm.getPoolInfoFromRpc(poolId)
  
  // When buying: SOL is input, token is output
  // When selling: token is input, SOL is output
  const solanaMint = NATIVE_MINT.toBase58()
  const tokenMint = poolInfo.mintA.address === solanaMint ? poolInfo.mintB.address : poolInfo.mintA.address
  
  // Determine input amount and mint based on action
  const inputMint = action === 'buy' ? solanaMint : tokenMint
  const inputAmount = action === 'buy' 
    ? new BN(amount) // Amount of SOL to spend (with decimals)
    : new BN(amount) // Amount of token to sell (with decimals)
  
  // Calculate baseIn parameter - true when input is mintA, false when input is mintB
  const baseIn = inputMint === poolInfo.mintA.address
  
  // Calculate swap results
  const swapResult = CurveCalculator.swap(
    inputAmount,
    baseIn ? rpcData.baseReserve : rpcData.quoteReserve,
    baseIn ? rpcData.quoteReserve : rpcData.baseReserve,
    rpcData.configInfo!.tradeFeeRate
  )

  console.log(`${action.toUpperCase()} swap:`)
  console.log(`Input: ${inputAmount} ${action === 'buy' ? 'SOL' : 'tokens'}`)
  console.log(`Expected output: ${swapResult.destinationAmountSwapped} ${action === 'buy' ? 'tokens' : 'SOL'}`)

  const { execute } = await raydium.cpmm.swap({
    poolInfo,
    poolKeys,
    inputAmount,
    swapResult,
    slippage: slippage/100, // 10% slippage backup
    baseIn,     // true when input is mintA, false when input is mintB
    fixedOut: false, // We're providing input amount, not output
  })

  const { txId } = await execute({ sendAndConfirm: true })
  const link = `https://explorer.solana.com/tx/${txId}?cluster=devnet`

  return {
    status: 'success',
    action,
    txId,
    explorer: link,
    timestamp: Date.now()
  }
}

export const getTokenPriceInSol = async (poolId: string): Promise<number> => {
  console.log(`[swapService] Fetching price for pool: ${poolId}`);

  // Create a temporary, read-only Raydium instance for this function.
  // This avoids conflict with the potentially user-specific global `raydium` instance
  // managed by initSdk for swap operations.
  const localRaydium = await Raydium.load({
    connection, // Assumes 'connection' is defined in the module scope
    cluster,    // Assumes 'cluster' is defined in the module scope
    disableFeatureCheck: true,
    disableLoadToken: false, // We need token metadata for decimals
    owner: Keypair.generate(), // A dummy keypair, as owner is required by Raydium.load
    blockhashCommitment: 'finalized',
  });

  const { poolInfo, rpcData } = await localRaydium.cpmm.getPoolInfoFromRpc(poolId);

  const solMint = NATIVE_MINT.toBase58();

  let tokenReserveBN: BN;
  let solReserveBN: BN;
  let tokenDecimals: number;
  let solDecimals: number;

  if (poolInfo.mintA.address === solMint) {
    solReserveBN = rpcData.baseReserve;
    solDecimals = poolInfo.mintA.decimals;
    tokenReserveBN = rpcData.quoteReserve;
    tokenDecimals = poolInfo.mintB.decimals;
  } else if (poolInfo.mintB.address === solMint) {
    solReserveBN = rpcData.quoteReserve;
    solDecimals = poolInfo.mintB.decimals;
    tokenReserveBN = rpcData.baseReserve;
    tokenDecimals = poolInfo.mintA.decimals;
  } else {
    throw new Error(`Pool ${poolId} does not appear to contain SOL (${solMint}). mintA: ${poolInfo.mintA.address}, mintB: ${poolInfo.mintB.address}`);
  }

  if (tokenReserveBN.isZero()) {
    console.warn(`[swapService] Token reserve in pool ${poolId} is zero. Price cannot be determined.`);
    return 0; // Or throw an error if preferred
  }
  if (solReserveBN.isZero()) {
    console.warn(`[swapService] SOL reserve in pool ${poolId} is zero. Price cannot be determined.`);
    return 0; // Or throw an error if preferred
  }

  // Convert BN reserves to numbers, accounting for decimals
  // amount = reserve_in_smallest_units / (10 ^ decimals)
  const tokenReserve = tokenReserveBN.toNumber() / Math.pow(10, tokenDecimals);
  const solReserve = solReserveBN.toNumber() / Math.pow(10, solDecimals);

  // Price of 1 unit of Token in SOL = SOL_Reserve_In_Pool / Token_Reserve_In_Pool
  const priceInSol = solReserve / tokenReserve;

  console.log(`[swapService] Price for pool ${poolId}: ${priceInSol} SOL per token. (SOL Reserve: ${solReserve}, Token Reserve: ${tokenReserve})`);
  return priceInSol;
};