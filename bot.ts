// bot.ts
require('dotenv').config({ path: '.env.local' });

import { Client, GatewayIntentBits, Events } from 'discord.js';
import axios from 'axios';

// Debug logs to see what's happening
console.log("Starting bot...");
console.log("Bot token loaded:", !!process.env.DISCORD_BOT_TOKEN);
console.log("API URL:", process.env.NEXT_PUBLIC_APP_URL);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  // Debug log to see if messages are being received
  console.log(`Received message: "${message.content}" from ${message.author.tag}`);
  
  if (message.author.bot || !message.content.startsWith('!')) return;

  const [command, ...args] = message.content.slice(1).split(' ');
  console.log(`Processing command: ${command}, args: ${args.join(', ')}`);

  try {
    if (command === 'addwallet') {
      const address = args[0];
      if (!address) return message.channel.send('Please provide a wallet address');
      try {
        await axios.post(`${process.env.NEXT_PUBLIC_APP_URL}/api/add-wallet`, { address });
        await message.channel.send('Wallet added successfully');
      } catch (error) {
        console.error('Error adding wallet via bot:', error);
        await message.channel.send('Failed to add wallet');
      }
    } else if (command === 'removewallet') {
      const address = args[0];
      if (!address) return message.channel.send('Please provide a wallet address');
      try {
        await axios.post(`${process.env.NEXT_PUBLIC_APP_URL}/api/remove-wallet`, { address });
        await message.channel.send('Wallet removed successfully');
      } catch (error) {
        console.error('Error removing wallet via bot:', error);
        await message.channel.send('Failed to remove wallet');
      }
    } else if (command === 'listwallets') {
      try {
        await message.channel.send('Fetching wallets... please wait.');
        
        // Add timeout to axios request
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/list-wallets`, 
          { timeout: 5000 } // 5 second timeout
        );
        
        console.log('API response received:', response.data);
        
        const wallets = response.data.wallets && response.data.wallets.length
          ? response.data.wallets.join(', ')
          : 'No wallets tracked';
        
        await message.channel.send(`Tracked Wallets: ${wallets}`);
      } catch (error) {
        console.error('Error listing wallets via bot:', error);
        
        // More detailed error message
        if (axios.isAxiosError(error)) {
          if (error.code === 'ECONNREFUSED') {
            await message.channel.send('Failed to connect to API server. Is your web server running?');
          } else if (error.code === 'ETIMEDOUT') {
            await message.channel.send('Request timed out. API server might be slow or unreachable.');
          } else {
            await message.channel.send(`Failed to list wallets: ${error.message || 'Unknown error'}`);
          }
        } else {
          await message.channel.send('Failed to list wallets due to an unknown error');
        }
      }
    } else if (command === 'help') {
      await message.channel.send(`
**Available Commands:**
- \`!addwallet [address]\`: Add a wallet to track
- \`!removewallet [address]\`: Remove a tracked wallet
- \`!listwallets\`: List all tracked wallets
- \`!help\`: Show this help message
      `);
    }
  } catch (error) {
    console.error('Error processing command:', error);
  }
});

// Add error handling
client.on(Events.Error, (error) => {
  console.error('Discord client error:', error);
});

client.login(process.env.DISCORD_BOT_TOKEN)
  .then(() => console.log('Bot login successful'))
  .catch(error => console.error('Failed to login:', error));