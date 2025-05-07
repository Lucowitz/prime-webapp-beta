import React from 'react';
import { Card } from '@/components/ui/card';
import { useDemo } from '@/context/DemoContext';

const TokenManager = () => {
  const { demoCompanyToken } = useDemo();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-heading font-bold">
          Token <span className="bg-gradient-to-r from-[#00FFD1] to-[#A45BF0] bg-clip-text text-transparent">Management</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 bg-[#1A1A1A] border-[#00FFD1] border-opacity-20">
          <h3 className="font-medium text-xl mb-4">Token Info</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Name</span>
              <span>{demoCompanyToken?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Symbol</span>
              <span>{demoCompanyToken?.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Supply</span>
              <span>{demoCompanyToken?.totalSupply}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TokenManager;
