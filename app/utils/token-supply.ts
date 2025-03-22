import { Connection, PublicKey } from '@solana/web3.js';

// Create a connection to Solana
const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  'confirmed'
);

export async function getTokenSupply(tokenAddress: string): Promise<number> {
  try {
    const tokenMint = new PublicKey(tokenAddress);
    const supply = await connection.getTokenSupply(tokenMint);
    
    // Convert to actual number using decimals
    return supply.value.uiAmount || 0;
  } catch (error) {
    console.error(`Error fetching token supply for ${tokenAddress}:`, error);
    return 0;
  }
} 