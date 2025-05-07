import React from 'react';
import { Card } from '@/components/ui/card';

const Settings = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-heading font-bold">
          Account <span className="bg-gradient-to-r from-[#00FFD1] to-[#A45BF0] bg-clip-text text-transparent">Settings</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="p-6 bg-[#1A1A1A] border-[#00FFD1] border-opacity-20">
          <h3 className="font-medium text-xl mb-4">Security Settings</h3>
          {/* Add security settings */}
        </Card>
      </div>
    </div>
  );
};

export default Settings;
