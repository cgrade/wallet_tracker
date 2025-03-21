import { EmbedBuilder } from 'discord.js';

// Colors
export const COLORS = {
  SUCCESS: 0x2ecc71,  // Green
  ERROR: 0xe74c3c,    // Red
  INFO: 0x3498db,     // Blue
  WARNING: 0xf39c12,  // Yellow
  NEUTRAL: 0x95a5a6   // Gray
};

// Format wallet address for display
export function formatWalletAddress(address: string): string {
  if (!address || address.length < 8) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// Format SOL amount
export function formatSOL(lamports: number): string {
  const sol = lamports / 1e9;
  return sol.toLocaleString('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}

// Create a transaction URL
export function getExplorerUrl(type: 'tx' | 'address', value: string): string {
  return `https://solscan.io/${type}/${value}`;
}

// Create wallet added embed
export function createWalletAddedEmbed(address: string, nickname: string, balance: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(COLORS.SUCCESS)
    .setTitle('✅ Wallet Added Successfully')
    .setDescription(`Now tracking wallet with nickname: **${nickname}**`)
    .addFields(
      { name: 'Address', value: `\`${address}\``, inline: false },
      { name: 'Balance', value: balance, inline: true },
      { name: 'Explorer', value: `[View on Solscan](${getExplorerUrl('address', address)})`, inline: true }
    )
    .setTimestamp();
}

// Create wallet list embed
export function createWalletListEmbed(wallets: any[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(COLORS.INFO)
    .setTitle(`🔍 Tracked Wallets (${wallets.length})`)
    .setDescription('Here are all the wallets currently being tracked:')
    .setTimestamp();
  
  // Add each wallet as a field
  wallets.forEach((wallet, index) => {
    embed.addFields({
      name: `${index + 1}. ${wallet.nickname || formatWalletAddress(wallet.address)}`,
      value: `Address: \`${wallet.address}\`\nBalance: ${wallet.balance}\n[View on Solscan](${getExplorerUrl('address', wallet.address)})`,
      inline: false
    });
  });
  
  return embed;
} 