import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '.env.local' });

// Sample transaction payload (simplified swap event)
const testPayload = [{
  "accountData": [],
  "description": "Swap 0.1 SOL for 1.2 USDC on Jupiter",
  "events": {},
  "fee": 5000,
  "feePayer": "XPNukQAZLpDJtTC5qsQv7k9ijz5A5AGacFAceH2S8tX",
  "nativeTransfers": [],
  "signature": "5K1TnmYpgEj2MqM7n3LQH3PeYv6hsB7FGKnYF7YchuBhdzKXWH7XrHXZNv8QgqQEHtQJhmf3HJrXNPV6Fj5d6f74",
  "slot": 254624299,
  "source": "JUPITER",
  "swaps": [{
    "fromUserAccount": "XPNukQAZLpDJtTC5qsQv7k9ijz5A5AGacFAceH2S8tX",
    "inputMint": "So11111111111111111111111111111111111111112",
    "inputAmount": 100000000, // 0.1 SOL in lamports
    "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC mint
    "outputAmount": 1200000, // 1.2 USDC (6 decimals)
    "source": "jupiter"
  }],
  "timestamp": 1681849277,
  "tokenTransfers": [],
  "type": "SWAP"
}];

async function testWebhook() {
  try {
    console.log('Sending test payload to webhook...');
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/helius-webhook`, 
      testPayload
    );
    console.log('Response:', response.data);
  } catch (error) {
    const err = error as any; // Simple assertion
    if (axios.isAxiosError(err)) {
      console.error('Error:', err.response?.data || err.message);
    } else {
      console.error('Error:', err instanceof Error ? err.message : String(err));
    }
  }
}

testWebhook(); 