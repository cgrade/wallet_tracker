import dotenv from 'dotenv';
import axios from 'axios';


dotenv.config({ path: '.env.local' });

async function registerWebhook() {
  try {
    // Delete existing webhook if it exists
    if (process.env.HELIUS_WEBHOOK_ID) {
      try {
        await axios.delete(
          `https://api.helius.xyz/v0/webhooks/${process.env.HELIUS_WEBHOOK_ID}?api-key=${process.env.HELIUS_API_KEY}`
        );
        console.log('Deleted existing webhook');
      } catch (error) {
        const err = error as any;
        console.log('No existing webhook to delete or error deleting');
      }
    }
    
    // Create a new webhook with required parameters
    const response = await axios.post(
      `https://api.helius.xyz/v0/webhooks?api-key=${process.env.HELIUS_API_KEY}`,
      {
        webhookURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/helius-webhook`,
        transactionTypes: ['TOKEN_TRANSFER', 'SWAP'],
        accountAddresses: ['XPNukQAZLpDJtTC5qsQv7k9ijz5A5AGacFAceH2S8tX'], // Add a default wallet to monitor
        webhookType: 'enhanced',
        txnStatus: 'success' // Changed from 'all' to 'success'
      }
    );
    
    console.log('New webhook registered:', response.data);
    console.log('IMPORTANT: Add this webhook ID to your .env.local file as HELIUS_WEBHOOK_ID');
  } catch (error) {
    const err = error as any;
    if (axios.isAxiosError(err)) {
      console.error('Error registering webhook:', err.response?.data || err.message);
    } else {
      console.error('Error registering webhook:', err instanceof Error ? err.message : String(err));
    }
  }
}

registerWebhook(); 