const express = require('express');
const cors = require('cors');
const { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { 
  TOKEN_PROGRAM_ID,
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction
} = require('@solana/spl-token');

const bs58 = require('bs58');
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Solana connection
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Token Extension Program ID for Token-2022
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

// Associated Token Account Program ID
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

// Route to get wallet information
app.post('/wallet-info', async (req, res) => {
    try {
        const { privateKey } = req.body;
        
        if (!privateKey) {
            return res.status(400).json({ error: 'Private key is required' });
        }
        
        // Create keypair from private key
        const secretKey = bs58.decode(privateKey);
        const keypair = Keypair.fromSecretKey(secretKey);
        const walletAddress = keypair.publicKey.toString();
        
        // Get SOL balance
        const solBalance = await connection.getBalance(keypair.publicKey);
        const solBalanceInSOL = solBalance / LAMPORTS_PER_SOL;
        
        // Initialize tokens array with SOL
        const tokens = [
            {
                name: 'Solana',
                symbol: 'SOL',
                balance: solBalanceInSOL.toFixed(9),
                mint: 'Native SOL',
                isNativeSol: true
            }
        ];
        
        // Get all token accounts for this owner using SPL token program
        const tokenAccounts = await connection.getTokenAccountsByOwner(
            keypair.publicKey,
            {
                programId: TOKEN_PROGRAM_ID,
            }
        );
        
        // Get all token accounts for this owner using Token-2022 program
        const token2022Accounts = await connection.getTokenAccountsByOwner(
            keypair.publicKey,
            {
                programId: TOKEN_2022_PROGRAM_ID,
            }
        );
        
        // Combine the results
        const allTokenAccounts = [...tokenAccounts.value, ...token2022Accounts.value];
        
        // Process each token account
        for (const tokenAccount of allTokenAccounts) {
            const accountInfo = tokenAccount.account;
            const data = accountInfo.data;
            
            // Decode the token account data
            const accountData = Buffer.from(data);
            
            // Token mint starts at byte 0 and is 32 bytes long
            const mintAddress = new PublicKey(accountData.slice(0, 32));
            
            // Amount starts at byte 64 and is 8 bytes
            const amountData = accountData.slice(64, 72);
            const amount = amountData.readBigUInt64LE(0);
            
            try {
                // Try to get token metadata
                let tokenInfo = {
                    name: mintAddress.toString().slice(0, 6) + '...',
                    symbol: '???',
                    decimals: 9 // Default to 9 decimals
                };
                
                try {
                    // Try to get token supply which includes decimals
                    const tokenMintInfo = await connection.getTokenSupply(mintAddress);
                    tokenInfo.decimals = tokenMintInfo.value.decimals;
                    
                    // In a real app, you would use a token registry to get name and symbol
                    // For this example, we'll use placeholders
                } catch (e) {
                    console.error("Error fetching token info for mint", mintAddress.toString(), e);
                }
                
                // Calculate actual balance using decimals
                const tokenBalance = Number(amount) / Math.pow(10, tokenInfo.decimals);
                
                // Only add tokens with non-zero balance
                if (tokenBalance > 0) {
                    tokens.push({
                        name: tokenInfo.name,
                        symbol: tokenInfo.symbol,
                        balance: tokenBalance.toFixed(tokenInfo.decimals),
                        mint: mintAddress.toString(),
                        decimals: tokenInfo.decimals,
                        isNativeSol: false
                    });
                }
            } catch (e) {
                console.error("Error processing token:", e);
            }
        }
        
        // Send response
        res.json({
            walletAddress,
            tokens
        });
        
    } catch (error) {
        console.error("Error getting wallet info:", error);
        res.status(500).json({ error: error.message });
    }
});

// Route to send tokens
app.post('/send-token', async (req, res) => {
    try {
        const { privateKey, recipient, amount, mint, isNativeSol } = req.body;
        
        if (!privateKey || !recipient || amount === undefined) {
            return res.status(400).json({ error: 'Private key, recipient, and amount are required' });
        }
        
        // Create keypair from private key
        const secretKey = bs58.decode(privateKey);
        const keypair = Keypair.fromSecretKey(secretKey);
        
        // Create recipient public key
        const recipientPubkey = new PublicKey(recipient);
        
        let transaction = new Transaction();
        let signature;
        
        if (isNativeSol) {
    // Send SOL
    transaction.add(
        SystemProgram.transfer({
            fromPubkey: keypair.publicKey,
            toPubkey: recipientPubkey,
            lamports: Math.floor(amount * LAMPORTS_PER_SOL)
        })
    );
    
    // Set fee payer
    transaction.feePayer = keypair.publicKey;
    
    // Get recent blockhash
    const {blockhash} = await connection.getRecentBlockhash();
    transaction.recentBlockhash = blockhash;
    
    // Sign transaction - Fixed method
    transaction.sign(keypair);
    
    // Send transaction
    const rawTransaction = transaction.serialize();
    signature = await connection.sendRawTransaction(rawTransaction);
    
    // Confirm transaction
    await connection.confirmTransaction(signature);
} else {
    // Send SPL Token
    const mintPubkey = new PublicKey(mint);
    
    // First determine if this is a Token-2022 or regular SPL token
    const mintInfo = await connection.getAccountInfo(mintPubkey);
    const programId = mintInfo.owner.equals(TOKEN_2022_PROGRAM_ID) ? 
        TOKEN_2022_PROGRAM_ID : 
        TOKEN_PROGRAM_ID;
    
    // Get sender token account
    const fromTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        keypair.publicKey,
        false,
        programId,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    // Get recipient token account
    const toTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        recipientPubkey,
        false,
        programId,
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    // Check if recipient token account exists
    const recipientAccountInfo = await connection.getAccountInfo(toTokenAccount);
    
    // If recipient account doesn't exist, create it first
    if (!recipientAccountInfo) {
        transaction.add(
            createAssociatedTokenAccountInstruction(
                keypair.publicKey,
                toTokenAccount,
                recipientPubkey,
                mintPubkey,
                programId,
                ASSOCIATED_TOKEN_PROGRAM_ID
            )
        );
    }
    
    // Get token info to determine decimals
    let decimals = 9; // Default
    try {
        const tokenSupply = await connection.getTokenSupply(mintPubkey);
        decimals = tokenSupply.value.decimals;
    } catch (error) {
        console.log("Could not get token decimals, using default 9");
    }
    
    // Calculate token amount with proper decimals
    const tokenAmount = Math.floor(amount * Math.pow(10, decimals));
    
    // Add transfer instruction
    transaction.add(
        createTransferInstruction(
            fromTokenAccount,
            toTokenAccount,
            keypair.publicKey,
            tokenAmount,
            [],
            programId
        )
    );
    
    // Sign and send transaction
    transaction.feePayer = keypair.publicKey;
    const {blockhash} = await connection.getRecentBlockhash();
    transaction.recentBlockhash = blockhash;
    
    // Sign transaction
    transaction.sign(keypair);
    
    // Send transaction
    const rawTransaction = transaction.serialize();
    signature = await connection.sendRawTransaction(rawTransaction);
    
    // Confirm transaction
    await connection.confirmTransaction(signature);
}
        
        // Send response
        res.json({
            success: true,
            signature
        });
        
    } catch (error) {
        console.error("Error sending tokens:", error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Solana Wallet Server running at http://localhost:${port}`);
});