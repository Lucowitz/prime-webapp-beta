import * as raydium from "@raydium-io/raydium-sdk-v2";

//////////////////////////////////////////////////

const RAYDIUM_CLMM_SOL_USDC_ID = "2QdhepnKRTLjjSqPL1PtKNwqrUkoLee5Gqs8bvZhRdMv";

function normalizeRaydiumBetaPoolInfoResponse(response: raydium.ApiV3PoolInfoItem[] | raydium.ApiV3PageIns<raydium.ApiV3PoolInfoItem>): raydium.ApiV3PoolInfoItem[] {
  if (response === null || typeof response !== "object") {
    return [];
  }

  const items = (Array.isArray(response) ? response
    : (!Array.isArray((response as any).data) ? []
      : (response as any).data)) as raydium.ApiV3PoolInfoItem[];

  return items.filter(p =>
    (p !== null && typeof p === "object")
    && (!!p.price && (!!p.mintAmountA && !!p.mintAmountB))
    && (p.mintA !== null && typeof p.mintA === "object")
    && (p.mintB !== null && typeof p.mintB === "object"));
}

//////////////////////////////////////////////////

(async () => {

  const raydiumApi = new raydium.Api({
    cluster: "mainnet",
    timeout: 5000, // (in milliseconds)
  });

  //////////////////////////////////////////////////

  const solUsdcPool = normalizeRaydiumBetaPoolInfoResponse(
    await raydiumApi.fetchPoolById({ ids: RAYDIUM_CLMM_SOL_USDC_ID }),
  ).find(p =>
    p.mintA.address === raydium.WSOLMint.toBase58() &&
    p.mintB.address === raydium.USDCMint.toBase58(),
  );

  const solPrice = !solUsdcPool ? 0 : solUsdcPool.price;

  //////////////////////////////////////////////////

  const tokenAddress = "DenNU9Qdknhh8EdYhDtwzc7RU9GVV3drTGLSugBVJ1MG";

  const tokenPool = normalizeRaydiumBetaPoolInfoResponse(
    await raydiumApi.fetchPoolByMints({
      mint1: tokenAddress,
      mint2: raydium.WSOLMint.toBase58(),
      type: raydium.PoolFetchType.Standard,
    }),
  ).find(p =>
    p.mintA.address === tokenAddress || p.mintB.address === tokenAddress,
  );

  const tokenPriceSol = !tokenPool ? 0 : (
    tokenPool.mintA.address === raydium.WSOLMint.toBase58()
      ? (tokenPool.mintAmountA / tokenPool.mintAmountB)
      : (tokenPool.mintAmountB / tokenPool.mintAmountA)
  );
  const tokenPriceUsdc = tokenPriceSol * solPrice;

  //////////////////////////////////////////////////

  console.log("Token price:");
  console.log(`  $${(tokenPriceUsdc.toFixed(10))} (${tokenPriceSol.toFixed(12)} SOL)`);

})();