import React from 'react';
import { Card } from '@/components/ui/card';
import { useDemo } from '@/context/DemoContext';

const Wallet = () => {
  const { demoUserWallet, demoCompanyToken } = useDemo();
  const SOLANA_PRICE_USD = 102.45; // Mock price
  const solanaValueUSD = demoUserWallet.solanaBalance * SOLANA_PRICE_USD;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-heading font-bold">
          Wallet <span className="bg-gradient-to-r from-[#00FFD1] to-[#A45BF0] bg-clip-text text-transparent">Overview</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-[#1A1A1A] border-[#00FFD1] border-opacity-20">
          <h3 className="font-medium text-xl mb-4">SOL Balance</h3>
          <div className="text-3xl font-mono">{demoUserWallet.solanaBalance} SOL</div>
          <div className="text-sm text-gray-400">${solanaValueUSD.toFixed(2)} USD</div>
        </Card>

        <Card className="p-6 bg-[#1A1A1A] border-[#00FFD1] border-opacity-20">
          <h3 className="font-medium text-xl mb-4">Token Holdings</h3>
          {demoUserWallet.purchasedTokens.map((token) => (
            <div key={token.tokenId} className="flex justify-between items-center mt-2">
              <span>{demoCompanyToken?.symbol}</span>
              <span className="font-mono">{token.amount}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

export default Wallet;
