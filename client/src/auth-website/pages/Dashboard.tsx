import React from 'react';
import { Card } from '@/components/ui/card';

const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-heading font-bold">
          Control <span className="bg-gradient-to-r from-[#00FFD1] to-[#A45BF0] bg-clip-text text-transparent">Panel</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-[#1A1A1A] border-[#00FFD1] border-opacity-20">
          <h3 className="font-medium text-xl mb-4">Token Overview</h3>
          {/* Add token stats and charts */}
        </Card>
        
        <Card className="p-6 bg-[#1A1A1A] border-[#00FFD1] border-opacity-20">
          <h3 className="font-medium text-xl mb-4">Recent Transactions</h3>
          {/* Add transaction list */}
        </Card>
        
        <Card className="p-6 bg-[#1A1A1A] border-[#00FFD1] border-opacity-20">
          <h3 className="font-medium text-xl mb-4">Quick Actions</h3>
          {/* Add action buttons */}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
