require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function testDiscord() {
  try {
    const message = {
      embeds: [
        {
          title: 'Test Notification',
          description: 'This is a test notification from the Solana Wallet Tracker',
          color: 0x00ff00
        }
      ]
    };
    
    console.log('Sending test message to Discord...');
    await axios.post(process.env.DISCORD_WEBHOOK_URL, message);
    console.log('Test message sent successfully');
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error sending to Discord:', error.response?.data || error.message);
    } else {
      console.error('Error sending to Discord:', error instanceof Error ? error.message : String(error));
    }
  }
}

testDiscord(); 