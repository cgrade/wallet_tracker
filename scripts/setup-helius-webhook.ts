import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

async function setupHeliusWebhook() {
  const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
  const WEBHOOK_URL = process.env.WEBHOOK_URL; // Your webhook URL
  
  if (!HELIUS_API_KEY || !WEBHOOK_URL) {
    console.error('Missing HELIUS_API_KEY or WEBHOOK_URL in environment variables');
    return;
  }
  
  try {
    const response = await axios.post(
      `https://api.helius.xyz/v0/webhooks?api-key=${HELIUS_API_KEY}`,
      {
        "webhookURL": WEBHOOK_URL,
        "transactionTypes": ["TOKEN_MINT", "SWAP", "NFT_SALE"],
        "accountAddresses": [], // Add your tracked wallet addresses here
        "webhookType": "enhanced"
      }
    );
    
    console.log('Webhook configured successfully:', response.data);
  } catch (error) {
    console.error('Error configuring webhook:', error);
  }
}

setupHeliusWebhook(); 