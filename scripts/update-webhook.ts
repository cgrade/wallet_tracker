import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config({ path: '.env.local' });

async function updateWebhookAddresses() {
  try {
    // Get current wallets from your API
    const walletResponse = await axios.get(`${process.env.NEXT_PUBLIC_APP_URL}/api/list-wallets`);
    const wallets = walletResponse.data.wallets;
    
    if (!wallets || wallets.length === 0) {
      console.log('No wallets to monitor yet');
      return;
    }
    
    // Convert to address strings if needed
    const addresses = wallets.map(wallet => 
      typeof wallet === 'string' ? wallet : wallet.address
    );
    
    // Update the webhook with these addresses
    const response = await axios.put(
      `https://api.helius.xyz/v0/webhooks/${process.env.HELIUS_WEBHOOK_ID}?api-key=${process.env.HELIUS_API_KEY}`,
      {
        accountAddresses: addresses
      }
    );
    
    console.log('Updated webhook addresses:', addresses);
  } catch (error) {
    const err = error as any;
    console.error('Error updating webhook addresses:', 
      axios.isAxiosError(err) ? err.response?.data || err.message : String(err));
  }
}

updateWebhookAddresses(); 