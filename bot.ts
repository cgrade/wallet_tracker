// bot.ts
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.bot', override: true });


// Add near the top of bot.ts
console.log("DISCORD_BOT_TOKEN length:", process.env.DISCORD_BOT_TOKEN?.length);
console.log("First 5 chars:", process.env.DISCORD_BOT_TOKEN?.substring(0, 5));

import { Client, GatewayIntentBits, Events, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { getWallets, addWallet, removeWallet } from './app/utils/db';
import axios from 'axios';
import { Connection, PublicKey } from '@solana/web3.js';
import { 
  COLORS, 
  formatWalletAddress, 
  createWalletAddedEmbed, 
  createWalletListEmbed 
} from './app/utils/ui-helpers';

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Create a Solana connection
const connection = new Connection(
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  { commitment: 'confirmed' }
);

// Command prefix
const PREFIX = '!';

// Format SOL balance with commas and fixed decimals
function formatSOL(lamports: number): string {
  const sol = lamports / 1e9;
  return sol.toLocaleString('en-US', { 
    minimumFractionDigits: 4,
    maximumFractionDigits: 4 
  });
}

// Helper to format wallet address for display
function formatAddress(address: string | any): string {
  // Handle case where address might be an object
  if (typeof address !== 'string') {
    // Check if it's a wallet object
    if (address && typeof address === 'object' && 'address' in address) {
      address = address.address;
    } else {
      return 'Invalid Address';
    }
  }
  
  if (!address || address.length <= 12) return address;
  return address.slice(0, 6) + '...' + address.slice(-4);
}

// Check if an address is a valid Solana address
async function isValidSolanaAddress(address: string): Promise<boolean> {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}

// Get wallet balance and format it
async function getWalletBalance(address: string | any): Promise<string> {
  try {
    // Check if address is actually a wallet object
    if (typeof address !== 'string' && typeof address === 'object' && 'address' in address) {
      address = address.address;
    }
    
    // Ensure we have a string address
    if (typeof address !== 'string') {
      return 'Invalid Address';
    }
    
    // Validate the address format before creating PublicKey
    if (!address.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
      return 'Invalid Address Format';
    }
    
    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    return formatSOL(balance) + ' SOL';
  } catch (error) {
    console.error('Error getting balance:', error);
    return 'Unknown';
  }
}

client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  // Ignore messages from bots or messages not starting with our prefix
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  // Parse command and arguments
  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  if (command === 'ping') {
    await message.reply('🏓 Pong! Bot is operational.');
  }
  
  // Help command
  else if (command === 'help') {
    const helpEmbed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle('🦊 Wallet Tracker Bot Commands')
      .setDescription('Here are the commands you can use with the Wallet Tracker bot:')
      .addFields(
        { name: '`!add <wallet> [nickname]`', value: 'Add a wallet to track. Optional nickname makes it easier to identify.', inline: false },
        { name: '`!remove <wallet>`', value: 'Stop tracking a wallet.', inline: false },
        { name: '`!list`', value: 'Show all wallets currently being tracked.', inline: false },
        { name: '`!info <wallet>`', value: 'Get detailed information about a tracked wallet.', inline: false },
        { name: '`!help`', value: 'Show this help message.', inline: false },
        { name: '`!cleanup`', value: 'Clean up the wallet database.', inline: false },
        { name: '`!deduplicate`', value: 'Remove duplicate wallet entries from the database.', inline: false },
        { name: '`!reset`', value: 'Reset the wallet database.', inline: false }
      )
      .setFooter({ text: 'You\'ll receive notifications in this channel when transactions occur on tracked wallets.' });
    
    await message.reply({ embeds: [helpEmbed] });
  }
  
  // Add a wallet
  else if (command === 'add') {
    if (args.length < 1) {
      await message.reply('❌ Please provide a wallet address to track. Usage: `!add <wallet_address> [nickname]`');
      return;
    }
    
    const address = args[0];
    const nickname = args.slice(1).join(' ') || `Wallet ${formatAddress(address)}`;
    
    // Validate the Solana address
    if (!await isValidSolanaAddress(address)) {
      await message.reply('❌ Invalid Solana wallet address. Please check the address and try again.');
      return;
    }
    
    try {
      // Check if wallet already exists
      const wallets = getWallets();
      if (wallets.some(wallet => wallet.address === address)) {
        await message.reply(`⚠️ Wallet \`${formatAddress(address)}\` is already being tracked.`);
        return;
      }
      
      // Add the wallet (with nickname if provided)
      const wallet = { address, ...(nickname ? { nickname } : {}) };
      console.log(`Adding wallet with data:`, wallet);
      addWallet(wallet);
      
      // Log wallet list after adding
      const currentWallets = getWallets();
      console.log(`Current wallets (after adding):`, currentWallets.slice(0, 3));
      
      // Get wallet balance for the confirmation message
      const balance = await getWalletBalance(address);
      
      // Create confirmation embed using the helper
      const confirmEmbed = createWalletAddedEmbed(address, nickname, balance);
      
      await message.reply({ embeds: [confirmEmbed] });
      
    } catch (error) {
      console.error('Error adding wallet:', error);
      await message.reply('❌ Failed to add wallet. Please try again later.');
    }
  }
  
  // Remove a wallet
  else if (command === 'remove') {
    if (args.length < 1) {
      await message.reply('❌ Please provide a wallet address to remove. Usage: `!remove <wallet_address>`');
      return;
    }
    
    const address = args[0];
    
    try {
      // Check if wallet exists
      const wallets = getWallets();
      const wallet = wallets.find(w => w.address === address);
      
      if (!wallet) {
        await message.reply(`❌ Wallet \`${formatAddress(address)}\` is not being tracked.`);
        return;
      }
      
      // Remove the wallet
      removeWallet(address);
      
      // Create removal confirmation embed
      const removeEmbed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('🗑️ Wallet Removed')
        .setDescription(`Successfully stopped tracking wallet: **${wallet.nickname || formatAddress(address)}**`)
        .addFields(
          { name: 'Address', value: `\`${address}\``, inline: false }
        )
        .setTimestamp();
      
      await message.reply({ embeds: [removeEmbed] });
      
    } catch (error) {
      console.error('Error removing wallet:', error);
      await message.reply('❌ Failed to remove wallet. Please try again later.');
    }
  }
  
  // List all wallets
  else if (command === 'list') {
    try {
      // Get all wallets
      const wallets = getWallets();
      
      if (wallets.length === 0) {
        await message.reply('No wallets are currently being tracked.');
        return;
      }
      
      // Get balances for each wallet (with safety checks)
      const walletsWithBalance = await Promise.all(
        wallets.map(async (wallet) => {
          const address = wallet.address || "";
          // Safely access wallet data
          const balance = await getWalletBalance(address);
          
          return {
            ...wallet,
            balance,
            shortAddress: formatAddress(address)
          };
        })
      );
      
      // Create a list embed
      const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`🔍 Tracked Wallets (${walletsWithBalance.length})`)
        .setDescription('Here are all the wallets currently being tracked:')
        .setTimestamp();
      
      // Add each wallet as a field, with error protection and proper debugging
      walletsWithBalance.forEach((wallet, index) => {
        const nickname = wallet.nickname || `Wallet ${index + 1}`;
        
        // Check what type of data we're dealing with and log it for debugging
        console.log(`Wallet ${index + 1} data:`, JSON.stringify(wallet, null, 2));
        
        // Get the address safely
        let address = '';
        if (typeof wallet === 'string') {
          address = wallet;
        } else if (wallet && typeof wallet === 'object') {
          if (typeof wallet.address === 'string') {
            address = wallet.address;
          } else if (wallet.address && typeof wallet.address === 'object') {
            // Handle nested address objects
            address = wallet.address || JSON.stringify(wallet.address);
          } else {
            // Handle other cases
            address = String(wallet.address || '');
          }
        }
        
        const addressText = address ? `\`${address}\`` : 'Invalid Address';
        const explorerLink = address ? 
          `[View on Solscan](https://solscan.io/account/${address})` : 
          'Not available';
        
        embed.addFields({
          name: `${index + 1}. ${nickname}`,
          value: `Address: ${addressText}\nBalance: ${wallet.balance}\n${explorerLink}`,
          inline: false
        });
      });
      
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error listing wallets:', error);
      await message.reply('❌ Failed to list wallets. Please try again later.');
    }
  }
  
  // Get detailed info about a wallet
  else if (command === 'info') {
    if (args.length < 1) {
      await message.reply('❌ Please provide a wallet address. Usage: `!info <wallet_address>`');
      return;
    }
    
    const address = args[0];
    
    try {
      // Validate the address
      if (!await isValidSolanaAddress(address)) {
        await message.reply('❌ Invalid Solana wallet address.');
        return;
      }
      
      // Create PublicKey for the address
      const publicKey = new PublicKey(address);
      
      // Get wallet balance
      const balance = await connection.getBalance(publicKey);
      
      // Get recent transactions
      const signatures = await connection.getSignaturesForAddress(publicKey, { limit: 5 });
      
      // Check if this wallet is being tracked
      const wallets = getWallets();
      const isTracked = wallets.some(wallet => wallet.address === address);
      const nickname = wallets.find(wallet => wallet.address === address)?.nickname;
      
      // Create wallet info embed
      const infoEmbed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle(`${isTracked ? '✅' : '❓'} Wallet Info: ${nickname || formatAddress(address)}`)
        .setDescription(`Status: ${isTracked ? 'Currently Tracked' : 'Not Tracked'}`)
        .addFields(
          { name: 'Address', value: `\`${address}\``, inline: false },
          { name: 'Balance', value: `${formatSOL(balance)} SOL`, inline: true },
          { name: 'Explorer', value: `[View on Solscan](https://solscan.io/account/${address})`, inline: true }
        )
        .setTimestamp();
      
      // Add recent transactions if any
      if (signatures.length > 0) {
        infoEmbed.addFields({
          name: '📜 Recent Transactions',
          value: signatures.map((sig, i) => 
            `${i + 1}. [${sig.signature.slice(0, 8)}...](https://solscan.io/tx/${sig.signature}) - ${new Date(sig.blockTime! * 1000).toLocaleString()}`
          ).join('\n'),
          inline: false
        });
      } else {
        infoEmbed.addFields({
          name: '📜 Recent Transactions',
          value: 'No recent transactions found',
          inline: false
        });
      }
      
      // Add a button to add/remove tracking if not already tracked
      const row = new ActionRowBuilder<ButtonBuilder>();
      
      if (!isTracked) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`track_${address}`)
            .setLabel('Track This Wallet')
            .setStyle(ButtonStyle.Success)
        );
      } else {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`untrack_${address}`)
            .setLabel('Stop Tracking')
            .setStyle(ButtonStyle.Danger)
        );
      }
      
      await message.reply({ 
        embeds: [infoEmbed],
        components: [row]
      });
      
    } catch (error) {
      console.error('Error getting wallet info:', error);
      await message.reply('❌ Failed to retrieve wallet information. Please try again later.');
    }
  }

  // Add this inside your client.on(Events.MessageCreate) handler, with other commands
  else if (command === 'test') {
    // Super simple response to check if new code is running
    const testEmbed = new EmbedBuilder()
      .setColor(0xff00ff) // Bright purple - very noticeable
      .setTitle('🚀 New Bot Version Running!')
      .setDescription('This confirms your updated code is working.')
      .setTimestamp();
    
    await message.reply({ embeds: [testEmbed] });
  }

  // Add this to your bot commands
  else if (command === 'cleanup') {
    // Check if user has admin permissions
    if (!message.member?.permissions.has('Administrator')) {
      await message.reply('❌ You need administrator permissions to use this command.');
      return;
    }
    
    try {
      // Import the cleanup function
      const { cleanupWalletDatabase } = require('./app/utils/db-cleanup');
      
      // Run cleanup
      await message.reply('🧹 Starting wallet database cleanup... this may take a moment.');
      const result = cleanupWalletDatabase();
      
      if (typeof result === 'object' && result) {
        await message.reply(`✅ Wallet database cleanup completed:
• Fixed ${result.fixed} problematic wallet entries
• Removed ${result.duplicates} duplicate wallet entries`);
      } else if (result === false) {
        await message.reply('✅ No issues found in wallet database.');
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
      await message.reply('❌ Error while cleaning up wallet database.');
    }
  }

  // Add a dedicated deduplicate command
  else if (command === 'deduplicate') {
    try {
      // Import the deduplication function
      const { deduplicateWallets } = require('./app/utils/db-cleanup');
      
      // Run deduplication
      await message.reply('🔍 Checking for duplicate wallet entries...');
      const removed = deduplicateWallets();
      
      if (removed > 0) {
        await message.reply(`✅ Removed ${removed} duplicate wallet entries.`);
      } else if (removed === 0) {
        await message.reply('✅ No duplicate wallets found.');
      } else {
        throw new Error('Deduplication failed');
      }
    } catch (error) {
      console.error('Error during deduplication:', error);
      await message.reply('❌ Error while deduplicating wallet database.');
    }
  }

  // Add this to your bot commands
  else if (command === 'reset') {
    // Check if user has admin permissions
    if (!message.member?.permissions.has('Administrator')) {
      await message.reply('❌ You need administrator permissions to use this command.');
      return;
    }
    
    try {
      // Import fs and path
      const fs = require('fs');
      const path = require('path');
      
      // Path to the wallets file
      const dataPath = path.join(process.cwd(), 'data');
      const filePath = path.join(dataPath, 'wallets.json');
      
      // Write an empty array to reset the wallets
      fs.writeFileSync(filePath, JSON.stringify([], null, 2));
      
      await message.reply('✅ Wallet database has been reset. All wallets have been removed.');
    } catch (error) {
      console.error('Error resetting wallet database:', error);
      await message.reply('❌ Failed to reset wallet database.');
    }
  }
});

// Handle button interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;
  
  const customId = interaction.customId;
  
  // Handle track button
  if (customId.startsWith('track_')) {
    const address = customId.split('_')[1];
    
    try {
      // Add the wallet
      addWallet({ address, nickname: `Wallet ${formatAddress(address)}` });
      
      // Get wallet balance
      const balance = await getWalletBalance(address);
      
      // Create confirmation embed
      const confirmEmbed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle('✅ Wallet Added Successfully')
        .setDescription(`Now tracking wallet: **${formatAddress(address)}**`)
        .addFields(
          { name: 'Address', value: `\`${address}\``, inline: false },
          { name: 'Balance', value: balance, inline: true }
        )
        .setTimestamp();
      
      await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
      
    } catch (error) {
      console.error('Error adding wallet:', error);
      await interaction.reply({ content: '❌ Failed to add wallet.', ephemeral: true });
    }
  }
  
  // Handle untrack button
  else if (customId.startsWith('untrack_')) {
    const address = customId.split('_')[1];
    
    try {
      // Remove the wallet
      removeWallet(address);
      
      // Create removal confirmation embed
      const removeEmbed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle('🗑️ Wallet Removed')
        .setDescription(`Successfully stopped tracking wallet: **${formatAddress(address)}**`)
        .setTimestamp();
      
      await interaction.reply({ embeds: [removeEmbed], ephemeral: true });
      
    } catch (error) {
      console.error('Error removing wallet:', error);
      await interaction.reply({ content: '❌ Failed to remove wallet.', ephemeral: true });
    }
  }
});

// Log in to Discord
client.login(process.env.DISCORD_BOT_TOKEN);

console.log('Bot is starting up...');