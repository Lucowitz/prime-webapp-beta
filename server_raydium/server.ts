// server.ts
import express, { Request, Response, NextFunction } from 'express'; // Keep NextFunction, good practice
import cors from 'cors';
import { handleSwap,getTokenPriceInSol  } from './services/swapService'; // Assicurati che il percorso sia corretto

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

// Explicitly type the async handler's return as Promise<void>
app.post('/swap', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { action, privateKey, poolId, amount, slippage } = req.body;

  console.log("✅ Richiesta ricevuta dal client:", req.body);

  // Validazione di base
  if (!action || !privateKey || !poolId || typeof amount !== 'number' ) { // Consider making slippage optional here if it has a default in handleSwap
    // Send response and return to stop further execution
    res.status(400).json({ error: 'Parametri mancanti o invalidi. Required: action, privateKey, poolId, amount.' });
    return;
  }
  // More specific validation for slippage if provided
  if (slippage !== undefined && (typeof slippage !== 'number' || slippage < 0 || slippage > 100)) {
    res.status(400).json({ error: "Slippage must be a number between 0 and 100 if provided." });
    return;
  }


  try {
    // Pass slippage, handleSwap should have a default if it's not provided
    const result = await handleSwap(action, privateKey, poolId, amount, slippage);
    res.status(200).json(result); // No 'return' needed before res.status().json()
  } catch (err: any) {
    console.error("❌ Errore durante lo swap:", err);
    // Pass the error to an error-handling middleware, or handle it directly
    // For now, handling directly:
    res.status(500).json({
      error: err?.message || 'Errore interno durante lo swap'
    });
    // next(err); // Alternative: if you have a dedicated error handling middleware
  }
});

app.get('/token-price/:poolId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { poolId } = req.params;

  if (!poolId) {
    res.status(400).json({ error: 'Pool ID (poolId) is required in path.' });
    return;
  }

  console.log(`✅ Richiesta prezzo token per pool ID: ${poolId}`);

  try {
    const priceInSol = await getTokenPriceInSol(poolId);
    res.status(200).json({ poolId, priceInSol });
  } catch (err: any) {
    console.error(`❌ Errore durante il fetch del prezzo per pool ${poolId}:`, err);
    res.status(500).json({
      error: err?.message || `Errore interno durante il fetch del prezzo per pool ${poolId}`
    });
    // next(err); // Alternative for centralized error handling
  }
});

app.listen(port, () => {
  console.log(`🚀 Server in esecuzione su http://localhost:${port}`);
});