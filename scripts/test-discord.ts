import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testDiscord() {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.error('DISCORD_WEBHOOK_URL not found in environment');
    process.exit(1);
  }
  
  try {
    const message = {
      content: 'This is a test message from the wallet tracker.',
      embeds: [
        {
          title: 'Test Notification',
          description: 'If you can see this, Discord notifications are working!',
          color: 0x00ff00,
          timestamp: new Date().toISOString()
        }
      ]
    };
    
    console.log('Sending test message to Discord...');
    const response = await axios.post(webhookUrl, message);
    console.log('Successfully sent message to Discord!', response.status);
  } catch (error) {
    console.error('Failed to send message to Discord:', error);
  }
}

testDiscord(); 