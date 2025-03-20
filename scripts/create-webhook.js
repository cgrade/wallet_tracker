require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function createWebhook() {
  try {
    console.log('Creating new webhook...');
    
    const response = await axios.post(
      `https://api.helius.xyz/v0/webhooks?api-key=${process.env.HELIUS_API_KEY}`,
      {
        webhookURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/helius-webhook`,
        transactionTypes: ['TOKEN_TRANSFER', 'SWAP'],
        accountAddresses: ['XPNukQAZLpDJtTC5qsQv7k9ijz5A5AGacFAceH2S8tX'], // Default test address
        webhookType: 'enhanced',
        txnStatus: 'success'
      }
    );
    
    console.log('✅ New webhook created successfully!');
    console.log('Webhook ID:', response.data.webhookID);
    console.log('\nIMPORTANT: Add this webhook ID to your .env.local file as:');
    console.log(`HELIUS_WEBHOOK_ID=${response.data.webhookID}`);
    
  } catch (error) {
    console.error('❌ Error creating webhook:');
    if (error.response) {
      console.error('  API responded with:', error.response.status, error.response.data);
    } else {
      console.error('  Error:', error.message);
    }
  }
}

createWebhook(); 