// test-bot.ts - A minimal Discord bot to verify your token works
import { Client, Events, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env.bot', override: true });

// Log token info
console.log("Bot token length:", process.env.DISCORD_BOT_TOKEN?.length);
console.log("Bot token first 5 chars:", process.env.DISCORD_BOT_TOKEN?.substring(0, 5));

// Create a new client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

// When the client is ready, run this code
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Simple message handler
client.on(Events.MessageCreate, async (message) => {
  if (message.content === '!ping') {
    await message.reply('Pong from test bot!');
  }
});

// Login to Discord
client.login(process.env.DISCORD_BOT_TOKEN)
  .then(() => console.log("Login successful"))
  .catch(error => console.error("Login failed:", error)); 