// TokenExplorerAuthUser.tsx
import { useState, useEffect } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import TokenCard from "@/auth-website/components/tokens/TokenCardAuth"; // Assicurati che il percorso sia corretto
import TokenListFilter from "@/auth-website/components/tokens/TokenListFilterAuth"; // Assicurati che il percorso sia corretto
import { demoTokens as actualDemoTokens, officialTokens } from "@/data/tokens"; // Rinomina per chiarezza
import { useDemo } from "@/context/DemoContext";
import { Token as AppToken } from "@/types/tokens"; // Usa lo stesso tipo di Token definito altrove
import { Helmet } from "react-helmet";

export default function TokenExplorer() {
  const { t } = useLanguage();
  const { isDemoMode } = useDemo();

  // Usa actualDemoTokens che hai definito in data/tokens.ts
  // Assicurati che actualDemoTokens sia un array di AppToken
  const initialTokensToDisplay = isDemoMode ? actualDemoTokens : officialTokens;

  const [filteredTokens, setFilteredTokens] = useState<AppToken[]>(initialTokensToDisplay);
  const [sector, setSector] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Aggiorna i token da visualizzare se la modalità demo cambia
  useEffect(() => {
    const currentSet = isDemoMode ? actualDemoTokens : officialTokens;
    setFilteredTokens(currentSet);
    // Resetta i filtri quando cambi modalità per evitare stati inconsistenti
    setSector("all");
    setSearchTerm("");
  }, [isDemoMode]);
  
  useEffect(() => {
    let newFiltered = isDemoMode ? actualDemoTokens : officialTokens;
    
    if (sector !== "all") {
      newFiltered = newFiltered.filter(token => token.sector === sector);
    }
    
    if (searchTerm) {
      newFiltered = newFiltered.filter(token => 
        token.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        token.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (token.description && token.description.toLowerCase().includes(searchTerm.toLowerCase())) // Aggiungi controllo per description undefined
      );
    }
    
    setFilteredTokens(newFiltered);
  }, [sector, searchTerm, isDemoMode]); // Aggiungi isDemoMode alle dipendenze
  
  const handleSectorChange = (newSector: string) => {
    setSector(newSector);
  };
  
  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
  };
  
  return (
    <>
      <Helmet>
        <title>Token Explorer - Prime Genesis</title>
        <meta name="description" content="Explore business tokens created on the Prime Genesis platform. Each token has transparent documentation and real utility for businesses." />
      </Helmet>
      
      <section className="py-20 bg-[#121212] text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h1 className="font-heading text-3xl md:text-4xl font-bold mb-6">
              <span className="bg-gradient-to-r from-[#00FFD1] to-[#A45BF0] bg-clip-text text-transparent">
                {t("tokens.title")}
              </span>
            </h1>
            <p className="text-lg text-gray-300">
              {t("tokens.subtitle")}
            </p>
          </div>
          
          <TokenListFilter onSectorChange={handleSectorChange} onSearchChange={handleSearchChange} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {filteredTokens.length > 0 ? (
              filteredTokens.map((tokenItem) => ( // Rinomina token a tokenItem per evitare shadowing
                <TokenCard key={tokenItem.id} token={tokenItem} /> // Passa tokenItem
              ))
            ) : (
              <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-10">
                <p className="text-gray-400">No tokens found matching your criteria.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}