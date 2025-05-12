// BusinessWalletDemo.tsx
import { useLanguage } from "@/hooks/useLanguage";
import { useDemo } from "@/context/DemoContext"; // Usa il contesto aggiornato
import { Helmet } from "react-helmet";
import { useState, useEffect } from "react"; // Aggiunto useEffect
import { Button } from "@/components/ui/button";
// import { Dialog } from "@/components/ui/dialog"; // Rimosso se non usato direttamente
import { Chart } from "@/components/ui/chart"; // Assumi che questo componente esista e funzioni
import { Input } from "@/components/ui/input";

export default function BusinessWalletDemo() {
  const { t } = useLanguage();
  // Ottieni demoCompanyTokenData, e il prezzo SOL dal contesto
  const { demoCompanyTokenData, demoUserWallet, solanaPriceUSD, fetchSolanaPrice, isDemoMode, demoUserType } = useDemo();
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [buyAmount, setBuyAmount] = useState("");

  useEffect(() => {
    if (isDemoMode && demoUserType === 'company' && solanaPriceUSD === null) {
      fetchSolanaPrice();
    }
  }, [isDemoMode, demoUserType, solanaPriceUSD, fetchSolanaPrice]);

  // Usiamo il solanaPriceUSD dal contesto. Se è null, il valore sarà 0 o un fallback.
  const solanaBalanceInWalletUSD = solanaPriceUSD 
    ? demoUserWallet.solanaBalance * solanaPriceUSD 
    : 0; // Potresti voler mostrare "Loading..." o un placeholder

  const TRANSACTION_FEE_PERCENTAGE = 0.5; 
  const accumulatedFees = {
    solana: 0.25, 
    tokens: 100 
  };

  const totalSupply = demoCompanyTokenData?.totalSupply || 0;
  const circulatingSupply = totalSupply * 0.85; 
  const companyHoldings = totalSupply - circulatingSupply;

  const chartData = {
    labels: ['Company Held', 'In Circulation'],
    datasets: [{
      label: 'Token Distribution',
      data: [companyHoldings, circulatingSupply],
      backgroundColor: ['#0047AB', '#8A2BE2'],
      borderColor: ['#003B8D', '#7322B3'],
      borderWidth: 1
    }]
  };
  const chartOptions = { // Opzioni per Chart.js
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'top' as const,
            labels: { color: 'white'}
        },
        title: {
            display: true,
            text: 'Token Supply Distribution',
            color: 'white',
            font: { size: 16}
        }
    }
  };


  const handleCollectFees = () => {
    alert(`Simulated fee collection: ${accumulatedFees.solana} SOL and ${accumulatedFees.tokens} ${demoCompanyTokenData?.symbol}`);
  };

  const handleBuyTokenAction = () => { // Rinomino per chiarezza
    const amount = Number(buyAmount);
    if (amount > 0) {
      // Questa logica è solo un placeholder.
      // Se la compagnia compra i propri token, dovrebbe influenzare la supply o le holdings della compagnia.
      // Se compra altri token, sarebbe simile all'acquisto utente.
      alert(`Simulated purchase of ${amount} ${demoCompanyTokenData?.symbol} tokens for the company.`);
      setShowBuyDialog(false);
      setBuyAmount("");
    }
  };

  if (demoUserType !== 'company' || !demoCompanyTokenData) {
    return (
        <div className="flex justify-center items-center h-screen bg-[#121212] text-white">
            <p>Loading Business Demo or Access Denied...</p>
        </div>
    );
  }


  return (
    <>
      <Helmet>
        <title>Business Token Dashboard - {demoCompanyTokenData?.name || "Demo"} - Prime Genesis</title>
        <meta name="description" content={`Manage your business token ${demoCompanyTokenData?.name || ""} with Prime Genesis`} />
      </Helmet>

      <section className="py-12 sm:py-20 bg-[#121212] text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <header className="mb-10 text-center">
                <img src={demoCompanyTokenData.logoUrl} alt={`${demoCompanyTokenData.name} logo`} className="w-20 h-20 mx-auto mb-4 rounded-full border-2 border-[#00FFD1]" />
                <h1 className="text-3xl sm:text-4xl font-bold font-heading mb-2">{demoCompanyTokenData.name} ({demoCompanyTokenData.symbol})</h1>
                <p className="text-lg text-gray-400">{demoCompanyTokenData.description}</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-[#1E1E1E] p-6 rounded-xl shadow-lg">
                    <h3 className="text-sm font-medium text-gray-400 mb-1">Current Token Price</h3>
                    <p className="text-2xl font-bold font-mono text-[#00FFD1]">${demoCompanyTokenData.currentValue.toFixed(2)}</p>
                </div>
                <div className="bg-[#1E1E1E] p-6 rounded-xl shadow-lg">
                    <h3 className="text-sm font-medium text-gray-400 mb-1">Market Cap</h3>
                    <p className="text-2xl font-bold font-mono">${(demoCompanyTokenData.marketCap || 0).toLocaleString()}</p>
                </div>
                 <div className="bg-[#1E1E1E] p-6 rounded-xl shadow-lg">
                    <h3 className="text-sm font-medium text-gray-400 mb-1">Total Holders</h3>
                    <p className="text-2xl font-bold font-mono">{(demoCompanyTokenData.holders || 0).toLocaleString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Token Info & Supply */}
                <div className="bg-[#1E1E1E] p-6 rounded-xl shadow-lg space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold mb-3">Tokenomics</h2>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div><span className="text-gray-400">Total Supply:</span> {(demoCompanyTokenData.totalSupply || 0).toLocaleString()} {demoCompanyTokenData.symbol}</div>
                            <div><span className="text-gray-400">Circulating:</span> {circulatingSupply.toLocaleString()} {demoCompanyTokenData.symbol}</div>
                            <div><span className="text-gray-400">Company Held:</span> {companyHoldings.toLocaleString()} {demoCompanyTokenData.symbol}</div>
                            <div><span className="text-gray-400">Creation Date:</span> {new Date(demoCompanyTokenData.creationDate).toLocaleDateString()}</div>
                        </div>
                    </div>
                     <div className="mb-6">
                        <h3 className="text-lg font-medium mb-2">Token Distribution</h3>
                        <div className="bg-[#2A2A2A] p-4 rounded-lg" style={{ height: '250px', position: 'relative' }}> {/* Ensure Chart.js can calculate size */}
                          {/* Chart.js canvas needs a parent with defined size and position:relative */}
                          <Chart type="doughnut" data={chartData} options={chartOptions} />
                        </div>
                      </div>
                </div>

                {/* Right Column: Wallet & Actions */}
                <div className="bg-[#1E1E1E] p-6 rounded-xl shadow-lg space-y-6">
                     <div>
                        <h2 className="text-xl font-semibold mb-3">Company Wallet (SOL)</h2>
                         <div className="flex items-center">
                            <img src="/solana-logo.svg" alt="SOL" className="w-7 h-7 mr-3"/>
                            <span className="font-mono text-2xl text-[#00FFD1]">{demoUserWallet.solanaBalance.toFixed(4)} SOL</span>
                        </div>
                        <p className="text-xs text-gray-500 ml-10">~${solanaBalanceInWalletUSD.toFixed(2)} USD</p>
                    </div>
                    
                    <div className="bg-[#2A2A2A] p-4 rounded-lg">
                        <h3 className="text-lg font-medium mb-2">Transaction Fee Management</h3>
                        <p className="text-xs text-gray-400 mb-2">Platform Fee Rate: {TRANSACTION_FEE_PERCENTAGE}% (Example)</p>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                            <p className="text-xs text-gray-400">Accrued SOL Fees</p>
                            <p className="font-mono text-sm">{accumulatedFees.solana.toFixed(4)} SOL</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400">Accrued Token Fees</p>
                            <p className="font-mono text-sm">{accumulatedFees.tokens.toLocaleString()} {demoCompanyTokenData.symbol}</p>
                        </div>
                        </div>
                        <Button 
                            onClick={handleCollectFees}
                            className="w-full bg-gradient-to-r from-[#0047AB] to-[#8A2BE2] hover:opacity-90"
                        >
                        Collect Accrued Fees
                        </Button>
                    </div>

                    <div>
                        <Button 
                        onClick={() => setShowBuyDialog(true)}
                        className="w-full bg-[#2A2A2A] hover:bg-[#3A3A3A] border border-gray-600"
                        >
                        Manage Company Token Holdings (e.g., Buy Back)
                        </Button>
                    </div>
                </div>
            </div>
          </div>
        </div>
      </section>

      {showBuyDialog && (
         <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E1E1E] p-6 rounded-lg w-full max-w-md shadow-xl text-white">
            <h3 className="text-xl mb-6 font-semibold">Manage {demoCompanyTokenData?.symbol} Holdings</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Amount of {demoCompanyTokenData.symbol} to Buy Back</label>
                <Input
                  type="number"
                  value={buyAmount}
                  onChange={(e) => setBuyAmount(e.target.value)}
                  className="w-full p-2 bg-[#2A2A2A] rounded mt-1 text-white border border-gray-600 focus:border-[#00FFD1] outline-none"
                  placeholder={`Enter amount in ${demoCompanyTokenData.symbol}`}
                />
                 <p className="text-xs text-gray-500 mt-1">This is a simulated action for demo purposes.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={() => setShowBuyDialog(false)} variant="outline" className="flex-1 text-gray-300 border-gray-600 hover:bg-gray-700">
                  Cancel
                </Button>
                <Button onClick={handleBuyTokenAction} className="flex-1 bg-sky-600 hover:bg-sky-700">
                  Confirm Action
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}