export interface Token {
  id: string;
  name: string;
  symbol: string;
  description: string;
  sector: TokenSector;
  marketCap: string;
  supply: string;
  price: string;
  currentPrice: number;
  imageUrl: string;
  mint?: string; // Optional property for demo tokens
  LPmint?: string; // Optional property for demo tokens
  decimals?: number; // Optional property for demo tokens
}

export type TokenSector = 
  | "retail" 
  | "hospitality" 
  | "technology" 
  | "entertainment" 
  | "health";
