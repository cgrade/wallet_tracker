import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function updateWebhook() {
  const webhookId = process.env.HELIUS_WEBHOOK_ID;
  const apiKey = process.env.HELIUS_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  
  if (!webhookId || !apiKey || !appUrl) {
    console.error('Missing required environment variables');
    return;
  }
  
  // Remove any trailing slashes to prevent double slash
  const baseUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;
  
  try {
    // Log what we're trying to update
    console.log(`Updating webhook to: ${baseUrl}/api/helius-webhook`);
    
    const response = await axios.put(
      `https://api.helius.xyz/v0/webhooks/${webhookId}?api-key=${apiKey}`,
      {
        webhookURL: `${baseUrl}/api/helius-webhook`,
        transactionTypes: ["ANY"],
        accountAddresses: [],
        webhookType: "enhanced"
      }
    );
    
    console.log('Webhook updated successfully:', response.data);
  } catch (error) {
    console.error('Error updating webhook:', error);
    
    // Add more details for troubleshooting
    if (axios.isAxiosError(error) && error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status code:', error.response.status);
    }
  }
}

updateWebhook(); 