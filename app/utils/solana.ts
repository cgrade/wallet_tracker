import { Connection, PublicKey } from '@solana/web3.js';

// Function to get transaction details
export async function getTransaction(signature: string, connection?: Connection) {
  try {
    // Use provided connection or create a new one
    const conn = connection || new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
    );
    
    // Get transaction details
    const transaction = await conn.getTransaction(signature, {
      maxSupportedTransactionVersion: 0
    });
    
    return transaction;
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return null;
  }
} 