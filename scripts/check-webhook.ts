require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function checkWebhook() {
  try {
    const webhookID = process.env.HELIUS_WEBHOOK_ID;
    const response = await axios.get(
      `https://api.helius.xyz/v0/webhooks/${webhookID}?api-key=${process.env.HELIUS_API_KEY}`
    );
    console.log('Webhook status:', response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error checking webhook:', error.response?.data || error.message);
    } else {
      console.error('Error checking webhook:', error instanceof Error ? error.message : String(error));
    }
  }
}

checkWebhook(); 