// app/api/helius-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { sendDiscordWebhook } from '../../utils/discord';
import { getWallets } from '../../utils/db';
import axios from 'axios';
import { getTokenPrice, getTokenMarketCapBirdeye } from '../../utils/birdeye';
import { getTokenMarketCap } from '../../utils/dexscreener';
import { getTokenSupply } from '../../utils/token-supply';

// Define interfaces
interface SwapData {
  inputMint: string;
  outputMint: string;
  inputAmount: number;
  outputAmount: number;
  fromUserAccount: string;
  source: string;
  [key: string]: unknown;
}
      
interface TransactionData {
  accountData?: unknown[];
  description?: string;
  events?: Record<string, unknown>;
  fee?: number;
  feePayer?: string;
  nativeTransfers?: any[];
  signature?: string;
  type?: string;
  swaps?: SwapData[];
  tokenTransfers?: any[];
  timestamp?: number;
  [key: string]: unknown;
}

interface NativeTransfer {
  amount: number;
  fromUserAccount: string;
  toUserAccount: string;
}

interface TokenTransfer {
  mint: string;
  tokenAmount: number;
  fromUserAccount: string;
  toUserAccount: string;
  symbol?: string;
  name?: string;
}

// Token information cache to reduce API calls
const tokenInfoCache: Record<string, TokenInfo> = {};

interface TokenInfo {
  symbol: string;
  name: string;
  price: number;
  marketCap: number | null;
  createdAt: number | null;
  lastUpdated: number;
}

// Format currency with commas and fixed decimals
function formatCurrency(amount: number, decimals = 2): string {
  return amount.toLocaleString('en-US', { 
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals 
  });
}

// Update formatUSD function to handle small token prices better
function formatUSD(amount: number, forTokenPrice = false): string {
  if (forTokenPrice) {
    // For token prices, use scientific notation for very small values
    if (amount < 0.00000001) {
      return `$${amount.toExponential(4)}`;
    } 
    // For small token prices (like BONK), show more decimals
    else if (amount < 0.0001) {
      return `$${amount.toFixed(8)}`;
    }
    // For medium token prices
    else if (amount < 0.01) {
      return `$${amount.toFixed(6)}`;
    }
    // For larger token prices
    else if (amount < 1) {
      return `$${amount.toFixed(4)}`;
    }
    // For normal token prices
    else {
      return `$${formatCurrency(amount, 2)}`;
    }
  }
  
  // For amount displays (not prices)
  return `$${formatCurrency(amount, 2)}`;
}

// Format age of token
function formatTokenAge(timestampMs: number | null): string {
  if (!timestampMs) return 'Unknown';
  
  const now = Date.now();
  const ageMs = now - timestampMs;
  const days = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  
  if (days < 1) {
    const hours = Math.floor(ageMs / (1000 * 60 * 60));
    return `${hours} hours`;
  } else if (days < 30) {
    return `${days} days`;
  } else if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} months`;
  } else {
    const years = Math.floor(days / 365);
    const remainingMonths = Math.floor((days % 365) / 30);
    return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years} years`;
  }
}

// Enhanced DEX name mapping
function formatDexName(source: string): string {
  if (!source) return 'Unknown DEX';
  
  // Normalize the source string
  const normalizedSource = source.toUpperCase();
  
  const dexMap: Record<string, string> = {
    'RAYDIUM': 'Raydium',
    'ORCA': 'Orca',
    'JUPITER': 'Jupiter',
    'OPENBOOK': 'OpenBook',
    'METEORA': 'Meteora',
    'UNKNOWN DEX': 'Unknown DEX',
    'PHOENIX': 'Phoenix',
    'DRIFT': 'Drift',
    'MANGO': 'Mango Markets',
    'ZETA': 'Zeta Markets',
    'LIFINITY': 'Lifinity',
    'SABER': 'Saber',
    'ALDRIN': 'Aldrin', 
    'CREMA': 'Crema',
    'INVARIANT': 'Invariant',
    'MERCURIAL': 'Mercurial',
    'BALANSOL': 'Balansol',
    'DRADEX': 'DraDEX'
  };
  
  // Check for partial matches
  for (const [key, value] of Object.entries(dexMap)) {
    if (normalizedSource.includes(key)) {
      return value;
    }
  }
  
  // Extract potential DEX name from transaction description
  if (source.includes(':')) {
    const parts = source.split(':');
    if (parts.length > 0 && parts[0].trim().length > 0) {
      return parts[0].trim();
    }
  }
  
  return source; // Return original if no match
}

// Helper to truncate addresses
function formatAddress(address: string): string {
  return address.slice(0, 4) + '...' + address.slice(-4);
}

// 1. Add this well-known tokens map to help with display
const KNOWN_TOKENS: Record<string, {symbol: string, name: string}> = {
  'So11111111111111111111111111111111111111112': { symbol: 'SOL', name: 'Solana' },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin' },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', name: 'Tether USD' },
  '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj': { symbol: 'stSOL', name: 'Lido Staked SOL' },
  'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': { symbol: 'mSOL', name: 'Marinade Staked SOL' },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK', name: 'BONK' },
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': { symbol: 'JUP', name: 'Jupiter' }
};

// Near the top of the file, add a price cache for token lookups
const priceCache: Record<string, {price: number, timestamp: number}> = {};
const CACHE_TTL = 30 * 1000; // 30 seconds

// Then update your getTokenPrice function call in createDiscordMessageForTransaction:
const getTokenPriceWithCache = async (tokenMint: string): Promise<number> => {
  const now = Date.now();
  if (priceCache[tokenMint] && now - priceCache[tokenMint].timestamp < CACHE_TTL) {
    return priceCache[tokenMint].price;
  }
  
  const price = await getTokenPrice(tokenMint);
  priceCache[tokenMint] = { price, timestamp: now };
  return price;
};

// Simplified token info function without price API calls
async function getTokenInfoWithHelius(mint: string, heliusTokenData?: any): Promise<TokenInfo> {
  // Check for well-known tokens first
  if (KNOWN_TOKENS[mint]) {
    const knownToken = KNOWN_TOKENS[mint];
    return {
      symbol: knownToken.symbol,
      name: knownToken.name,
      price: 0,
      marketCap: null,
      createdAt: null,
      lastUpdated: Date.now()
    };
  }
  
  // Default values
  let info: TokenInfo = {
    symbol: mint.slice(0, 4) + '...' + mint.slice(-4),
    name: 'Unknown Token',
    price: 0,
    marketCap: null,
    createdAt: null,
    lastUpdated: Date.now()
  };
  
  // Use Helius token data directly if available
  if (heliusTokenData) {
    if (heliusTokenData.symbol) info.symbol = heliusTokenData.symbol;
    if (heliusTokenData.name) info.name = heliusTokenData.name;
    
    // Extract token metadata from the token transfer object if possible
    if (heliusTokenData.tokenStandard && heliusTokenData.tokenStandard === 'Fungible') {
      console.log('Found fungible token metadata in Helius data');
    }
  }
  
  // Try to get token metadata from Helius DAS API
  try {
    const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
    if (HELIUS_API_KEY) {
      console.log(`Fetching token metadata from Helius DAS API for ${mint}`);
      const response = await axios.post(
        `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
        {
          jsonrpc: "2.0",
          id: "my-id",
          method: "getAsset",
          params: {
            id: mint,
            displayOptions: {
              showFungible: true
            }
          }
        },
        { timeout: 5000 }
      );
      
      if (response.data?.result) {
        const asset = response.data.result;
        if (asset.content?.metadata?.name) info.name = asset.content.metadata.name;
        if (asset.content?.metadata?.symbol) info.symbol = asset.content.metadata.symbol;
        console.log(`Helius DAS returned metadata for ${mint}: ${info.name} (${info.symbol})`);
      }
    }
  } catch (error) {
    console.log(`Error fetching from Helius DAS API: ${(error as Error).message}`);
  }
  
  return info;
}

// Add this function to fix references to getTokenInfo
async function getTokenInfo(mint: string): Promise<TokenInfo> {
  // Call our enhanced function
  return getTokenInfoWithHelius(mint);
}

// Improved transaction classification function
function classifyTransaction(transaction: TransactionData, walletInvolved: string): {
  type: 'SWAP' | 'BUY' | 'SELL' | 'UNKNOWN';
  details: any;
} {
  // Check for SWAP
  if (transaction.type === 'SWAP' || (transaction.swaps && transaction.swaps.length > 0)) {
    return { type: 'SWAP', details: transaction.swaps?.[0] || {} };
  }
  
  // Check for BUY/SELL with token transfers
  if (transaction.tokenTransfers && transaction.tokenTransfers.length > 0) {
    const tokenTransfer = transaction.tokenTransfers.find((tt: any) => 
      tt.fromUserAccount === walletInvolved || tt.toUserAccount === walletInvolved
    ) as TokenTransfer;
    
    if (tokenTransfer) {
      const isTokenIncoming = tokenTransfer.toUserAccount === walletInvolved;
      return { 
        type: isTokenIncoming ? 'BUY' : 'SELL', 
        details: { tokenTransfer } 
      };
    }
  }
  
  return { type: 'UNKNOWN', details: null };
}

// Add this at the top of your file for debugging
const DEBUG = true; // Set to false in production

// Define SOL mint address constant
const SOL_MINT = 'So11111111111111111111111111111111111111112';

// Format time in a human-readable way
function formatTimeSince(timestamp: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestamp;
  const hours = Math.floor(diff / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  
  return `${hours}h ${minutes}m`;
}

// Format numbers with commas for thousands
function formatNumber(num: number, decimals = 2): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

// Format market cap in a readable way
function formatMarketCap(marketCap: number | null): string {
  if (marketCap === null || marketCap === 0) return 'Unknown';
  
  if (marketCap >= 1_000_000_000) {
    return `$${(marketCap / 1_000_000_000).toFixed(2)}B`;
  } else if (marketCap >= 1_000_000) {
    return `$${(marketCap / 1_000_000).toFixed(2)}M`;
  } else if (marketCap >= 1_000) {
    return `$${(marketCap / 1_000).toFixed(2)}K`;
  } else {
    return `$${marketCap.toFixed(2)}`;
  }
}

// Create a new function to format the Discord message according to the requested format
async function createDiscordMessageForTransaction(
  transaction: TransactionData, 
  walletInvolved: string,
  walletNickname: string,
  isBuy: boolean,
  tokenMint: string,
  tokenInfo: TokenInfo,
  tokenAmount: number,
  solAmount: number,
  source: string
): Promise<any> {
  const SOL_MINT = 'So11111111111111111111111111111111111111112';
  const walletDisplay = walletNickname || formatAddress(walletInvolved);
  
  // Use this optimized function instead of direct getTokenPrice calls
  const tokenPrice = await getTokenPriceWithCache(tokenMint);
  const solPrice = await getTokenPriceWithCache(SOL_MINT);
  
  // Calculate USD values
  const tokenUSD = tokenPrice * tokenAmount;
  const solUSD = solPrice * solAmount;
  
  // Calculate gas fee
  const gasFeeSOL = (transaction.fee || 0) / 1e9;
  
  // Get market cap - try Birdeye first, then DexScreener, then calculate
  let marketCap: string = 'Unknown';
  
  if (tokenMint !== SOL_MINT) {
    // First try Birdeye's token_overview endpoint
    const birdeyeMarketCap = await getTokenMarketCapBirdeye(tokenMint);
    
    if (birdeyeMarketCap !== null) {
      marketCap = formatMarketCap(birdeyeMarketCap);
    } else {
      // Fall back to DexScreener
      const dexMarketCap = await getTokenMarketCap(tokenMint);
      
      if (dexMarketCap !== null) {
        marketCap = formatMarketCap(dexMarketCap);
      } else {
        // Last resort: calculate using supply * price
        const tokenSupply = await getTokenSupply(tokenMint);
        if (tokenSupply > 0 && tokenPrice > 0) {
          marketCap = formatMarketCap(tokenSupply * tokenPrice);
        }
      }
    }
  }
  
  // Create links for token charts
  const birdeyeLink = `[BE](https://birdeye.so/token/${tokenMint}?chain=solana)`;
  const dexscreenerLink = `[DS](https://dexscreener.com/solana/${tokenMint})`;
  const photonLink = `[PH](https://photon.com/token/${tokenMint})`;
  
  // Format the message according to the requested format
  const emoji = isBuy ? '🟢' : '🔴';
  const action = isBuy ? 'BUY' : 'SELL';
  const color = isBuy ? 0x2ECC71 : 0xE74C3C; // Green for BUY, Red for SELL
  
  // Title format: [Green/Red Emoji] [BUY/SELL] on [Dex] [Wallet Address] [Wallet Nickname]
  const title = `${emoji} ${action} on ${source} ${formatAddress(walletInvolved)} (${walletNickname})`;
  
  // Description format: [Wallet Nickname] swapped [amount in] [token in] for [amount out] [token out] (USD) @ [price]
  let description: string;
  if (isBuy) {
    description = `${walletDisplay} swapped ${solAmount.toFixed(4)} SOL for ${formatCurrency(tokenAmount)} ${tokenInfo.symbol} (${formatUSD(tokenUSD)}) @ ${formatUSD(tokenPrice, true)}`;
  } else {
    description = `${walletDisplay} swapped ${formatCurrency(tokenAmount)} ${tokenInfo.symbol} for ${solAmount.toFixed(4)} SOL (${formatUSD(solUSD)}) @ ${formatUSD(tokenPrice, true)}`;
  }
  
  // Create embedded message
  const embed = {
    title,
    description,
    color,
    fields: [
      {
        // Transaction details field
        name: walletDisplay,
        value: isBuy ? 
          `SOL: -${solAmount.toFixed(4)} (-${formatUSD(solUSD)})\n${tokenInfo.symbol}: +${formatCurrency(tokenAmount)} (+${formatUSD(tokenUSD)})` :
          `${tokenInfo.symbol}: -${formatCurrency(tokenAmount)} (-${formatUSD(tokenUSD)})\nSOL: +${solAmount.toFixed(4)} (+${formatUSD(solUSD)})`,
        inline: false
      },
      {
        // Token metrics field
        name: 'Token Metrics',
        value: `MC: ${marketCap}\nSeen: ${formatTimeSince(transaction.timestamp || Math.floor(Date.now() / 1000))}\n${birdeyeLink} | ${dexscreenerLink} | ${photonLink}\nToken Address: ${tokenMint}`,
        inline: false
      }
    ],
    timestamp: new Date().toISOString()
  };
  
  return { embeds: [embed] };
}

// Add this function to get formatted market cap
async function getTokenMarketCapFormatted(tokenMint: string): Promise<string> {
  // Try Birdeye first
  const birdeyeMarketCap = await getTokenMarketCapBirdeye(tokenMint);
  
  if (birdeyeMarketCap !== null) {
    return formatMarketCap(birdeyeMarketCap);
  }
  
  // Fall back to DexScreener
  const dexMarketCap = await getTokenMarketCap(tokenMint);
  
  if (dexMarketCap !== null) {
    return formatMarketCap(dexMarketCap);
  }
  
  // Last resort: calculate using supply * price
  const tokenSupply = await getTokenSupply(tokenMint);
  const tokenPrice = await getTokenPrice(tokenMint);
  
  if (tokenSupply > 0 && tokenPrice > 0) {
    return formatMarketCap(tokenSupply * tokenPrice);
  }
  
  return 'Unknown';
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  console.log("======= WEBHOOK RECEIVED =======");
  console.log("Time:", new Date().toISOString());
  console.log("Headers:", JSON.stringify(Object.fromEntries([...req.headers.entries()]), null, 2));
  console.log("Discord URL configured:", !!process.env.DISCORD_WEBHOOK_URL);
  
  try {
    // Get tracked wallets
    const wallets = getWallets();
    const walletAddresses = wallets.map(wallet => wallet.address);
    
    console.log('Tracked wallet addresses:', walletAddresses);
    console.log('Tracked wallet addresses (exact format):', JSON.stringify(walletAddresses));
    
    // IMPORTANT CHANGE: Read the body once and use it for both logging and processing
    const payload = await req.json();
    console.log('Received webhook payload:', JSON.stringify(payload, null, 2));
    
    // Validate test payloads
    if (req.headers.get('x-test-event') === 'true') {
      return NextResponse.json({ success: true, message: 'Test event received' });
    }
    
    // Validate webhook payload
    if (!Array.isArray(payload)) {
      return NextResponse.json(
        { error: 'Invalid payload format' },
        { status: 400 }
      );
    }
    
    // Process each transaction in the payload
    for (const transaction of payload) {
      try {
        console.log(`\n======= PROCESSING TX ${transaction.signature} =======`);
        
        // Extract all addresses from the transaction
        const addressesInTransaction = new Set<string>();
        
        // Add fee payer
        if (transaction.feePayer) {
          addressesInTransaction.add(transaction.feePayer);
        }
        
        // Add native transfer addresses
        if (transaction.nativeTransfers) {
          transaction.nativeTransfers.forEach((transfer: any) => {
            if (transfer.fromUserAccount) addressesInTransaction.add(transfer.fromUserAccount);
            if (transfer.toUserAccount) addressesInTransaction.add(transfer.toUserAccount);
          });
        }
        
        // Add token transfer addresses
        if (transaction.tokenTransfers) {
          transaction.tokenTransfers.forEach((transfer: any) => {
            if (transfer.fromUserAccount) addressesInTransaction.add(transfer.fromUserAccount);
            if (transfer.toUserAccount) addressesInTransaction.add(transfer.toUserAccount);
          });
        }
        
        // Find matching wallets
        const matchingWallets = [...addressesInTransaction].filter(address => 
          walletAddresses.includes(address)
        );
        
        if (matchingWallets.length === 0) {
          console.log(`❌ No matching wallets found for transaction: ${transaction.signature}`);
          console.log('Addresses in transaction:', [...addressesInTransaction]);
          console.log('Looking for wallets:', walletAddresses);
          continue;
        }
        
        console.log(`✅ Found ${matchingWallets.length} matching wallet(s): ${matchingWallets.join(', ')}`);
        
        // Process each matching wallet
        for (const walletInvolved of matchingWallets) {
          console.log(`Looking for wallet: ${walletInvolved}`);
          console.log(`Available wallets: ${JSON.stringify(wallets).substring(0, 100)}...`);
          
          // Find wallet object to get nickname
          const walletObj = wallets.find((w: any) => 
            (typeof w === 'string' && w === walletInvolved) || 
            (typeof w === 'object' && w.address === walletInvolved)
          );
          
          console.log(`Found wallet object:`, walletObj);
          
          let walletNickname = '';
          
          if (typeof walletObj === 'object' && walletObj?.nickname) {
            walletNickname = walletObj.nickname;
          }
          
          const walletDisplay = walletNickname 
            ? `${walletNickname} (${walletInvolved.slice(0, 4)}...${walletInvolved.slice(-4)})`
            : `${walletInvolved.slice(0, 4)}...${walletInvolved.slice(-4)}`;
          
          console.log(`Using display name: ${walletDisplay}`);
          
          // Classify the transaction
          const classification = classifyTransaction(transaction, walletInvolved);
          console.log(`Transaction ${transaction.signature} classified as: ${classification.type}`);
          
          // Add SWAP handling right after classification but before BUY/SELL handling

          // SWAP transaction handling
          if (classification.type === 'SWAP') {
            console.log(`⭐ Processing SWAP transaction`);
            try {
              // Extract swap details
              const swap = transaction.swaps?.[0];
              
              if (!swap) {
                console.log('No swap data found in transaction object');
                
                // CRITICAL FIX: Instead of skipping with continue, reconstruct swap data from token transfers
                console.log('Attempting to build swap data from token transfers...');
                
                // Find incoming and outgoing token transfers
                const incomingTransfers = transaction.tokenTransfers?.filter((tt: any) => 
                  tt.toUserAccount === walletInvolved
                ) || [];
                
                const outgoingTransfers = transaction.tokenTransfers?.filter((tt: any) => 
                  tt.fromUserAccount === walletInvolved
                ) || [];
                
                if (incomingTransfers.length === 0 && outgoingTransfers.length === 0) {
                  console.log('Cannot reconstruct swap - no relevant token transfers found');
                  // Only continue if we truly can't process this
                  continue;
                }
                
                // Create synthetic swap data
                const syntheticSwap = {
                  inputMint: outgoingTransfers.length > 0 ? outgoingTransfers[0].mint : 'Unknown',
                  outputMint: incomingTransfers.length > 0 ? incomingTransfers[0].mint : 'Unknown',
                  inputAmount: outgoingTransfers.length > 0 ? outgoingTransfers[0].tokenAmount : 0,
                  outputAmount: incomingTransfers.length > 0 ? incomingTransfers[0].tokenAmount : 0,
                  source: transaction.source || 'Unknown DEX',
                  fromUserAccount: walletInvolved
                };
                
                console.log('Synthetic swap data created:', syntheticSwap);
                
                // Add this BEFORE using inputTokenInfo and outputTokenInfo in your message
                const [inputTokenInfo, outputTokenInfo] = await Promise.all([
                  getTokenInfoWithHelius(syntheticSwap.inputMint, outgoingTransfers[0]),
                  getTokenInfoWithHelius(syntheticSwap.outputMint, incomingTransfers[0])
                ]);
                
                // Calculate USD values if price available
                const inputUSD = inputTokenInfo.price * (syntheticSwap.inputAmount || 0);
                const outputUSD = outputTokenInfo.price * (syntheticSwap.outputAmount || 0);
                
                // Format amounts
                const inputAmount = formatCurrency(syntheticSwap.inputAmount || 0);
                const outputAmount = formatCurrency(syntheticSwap.outputAmount || 0);
                
                // Gas fee calculation
                const gasFeeSOL = (transaction.fee || 0) / 1e9;
                const gasFeeUSD = gasFeeSOL * (await getTokenInfo('So11111111111111111111111111111111111111112')).price;
                
                // Determine source/exchange
                const source = formatDexName(syntheticSwap.source || transaction.source || 'Unknown DEX');
                
                // Get market cap of the relevant token (not SOL)
                let marketCap = 'Unknown';
                if (syntheticSwap.inputMint !== SOL_MINT && syntheticSwap.outputMint !== SOL_MINT) {
                  // Try DexScreener first
                  const dexMarketCap = await getTokenMarketCap(syntheticSwap.inputMint);
                  
                  if (dexMarketCap !== null) {
                    marketCap = formatMarketCap(dexMarketCap);
                  } else {
                    // Fallback to calculation using supply × price
                    const tokenSupply = await getTokenSupply(syntheticSwap.inputMint);
                    const tokenPrice = syntheticSwap.inputMint === SOL_MINT ? outputTokenInfo.price : inputTokenInfo.price;
                    
                    if (tokenSupply > 0 && tokenPrice > 0) {
                      const calculatedCap = tokenSupply * tokenPrice;
                      marketCap = formatMarketCap(calculatedCap);
                    }
                  }
                }
                
                // Determine transaction type (BUY, SELL, or SWAP)
                let isBuy, isSell, isSwap;
                isBuy = syntheticSwap.inputMint === SOL_MINT && syntheticSwap.outputMint !== SOL_MINT;
                isSell = syntheticSwap.inputMint !== SOL_MINT && syntheticSwap.outputMint === SOL_MINT;
                isSwap = syntheticSwap.inputMint !== SOL_MINT && syntheticSwap.outputMint !== SOL_MINT;

                // Get token prices from Birdeye
                const inputPrice = await getTokenPrice(syntheticSwap.inputMint);
                const outputPrice = await getTokenPrice(syntheticSwap.outputMint);
                inputTokenInfo.price = inputPrice;
                outputTokenInfo.price = outputPrice;

                let transactionType, relevantTokenMint, relevantTokenInfo, tokenAmount, solAmount;

                if (isBuy) {
                  transactionType = 'BUY';
                  relevantTokenMint = syntheticSwap.outputMint;
                  relevantTokenInfo = outputTokenInfo;
                  tokenAmount = syntheticSwap.outputAmount;
                  solAmount = syntheticSwap.inputAmount / 1e9; // Convert lamports to SOL
                } else if (isSell) {
                  transactionType = 'SELL';
                  relevantTokenMint = syntheticSwap.inputMint;
                  relevantTokenInfo = inputTokenInfo;
                  tokenAmount = syntheticSwap.inputAmount;
                  solAmount = syntheticSwap.outputAmount / 1e9; // Convert lamports to SOL
                } else {
                  transactionType = 'SWAP';
                  // For swaps, use the output token as relevant
                  relevantTokenMint = syntheticSwap.outputMint;
                  relevantTokenInfo = outputTokenInfo;
                  tokenAmount = syntheticSwap.outputAmount;
                  solAmount = 0;
                }

                // Use the enhanced message formatter for all transaction types
                if (isBuy || isSell) {
                  const message = await createDiscordMessageForTransaction(
                    transaction,
                    walletInvolved,
                    walletNickname || formatAddress(walletInvolved),
                    isBuy,
                    relevantTokenMint,
                    relevantTokenInfo,
                    tokenAmount,
                    solAmount,
                    source
                  );
                  
                  // Send to Discord webhook
                  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
                  if (webhookUrl) {
                    try {
                      await sendDiscordWebhook(webhookUrl, message);
                      console.log(`✅ Successfully sent ${transactionType} notification to Discord!`);
                    } catch (error) {
                      console.error('❌ Failed to send to Discord:', (error as Error).message);
                    }
                  }
                } else {
                  // For token-to-token swaps, create a simplified message for speed
                  const message = {
                    embeds: [{
                      title: `🔄 SWAP on ${source}`,
                      description: `${walletNickname || formatAddress(walletInvolved)} swapped ${formatCurrency(syntheticSwap.inputAmount)} ${inputTokenInfo.symbol} for ${formatCurrency(syntheticSwap.outputAmount)} ${outputTokenInfo.symbol}`,
                      color: 0x3498DB,
                      fields: [
                        {
                          name: walletNickname || formatAddress(walletInvolved),
                          value: `${inputTokenInfo.symbol}: -${formatCurrency(syntheticSwap.inputAmount)}\n` +
                                 `${outputTokenInfo.symbol}: +${formatCurrency(syntheticSwap.outputAmount)}`,
                          inline: false
                        },
                        {
                          name: 'Links',
                          value: `[View Transaction](https://solscan.io/tx/${transaction.signature})\n` +
                                 `[${outputTokenInfo.symbol} Chart](https://dexscreener.com/solana/${syntheticSwap.outputMint})`,
                          inline: false
                        }
                      ],
                      footer: {
                        text: source
                      },
                      timestamp: new Date().toISOString()
                    }]
                  };
                  
                  // Send to Discord webhook
                  console.log('Sending SWAP notification');
                  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
                  if (webhookUrl) {
                    try {
                      await sendDiscordWebhook(webhookUrl, message);
                      console.log('✅ Successfully sent SWAP notification to Discord!');
                    } catch (error) {
                      console.error('❌ Failed to send to Discord:', (error as Error).message);
                    }
                  } else {
                    console.error('Discord webhook URL not configured');
                  }
                }
              } catch (error) {
                console.error('Error processing SWAP transaction:', (error as Error).message);
              }
            }
          }
          
          // Define classification explicitly for BUY/SELL
          // If we're here, we've already classified the transaction earlier
          // but it may be out of scope, so classify again
          const buySellClassification = classifyTransaction(transaction, walletInvolved);
          
          // BUY/SELL handling with new classification variable
          if (buySellClassification.type === 'BUY' || buySellClassification.type === 'SELL') {
            const isBuy = buySellClassification.type === 'BUY';
            console.log(`⭐ Processing ${isBuy ? 'BUY' : 'SELL'} transaction`);
            
            if (transaction.tokenTransfers && transaction.tokenTransfers.length > 0) {
              try {
                // Get the relevant token transfer
                const relevantTransfers = transaction.tokenTransfers.filter((tt: any) => {
                  const transfer = tt as TokenTransfer;
                  return transfer.fromUserAccount === walletInvolved || transfer.toUserAccount === walletInvolved;
                });
                
                if (relevantTransfers.length === 0) {
                  console.log('No relevant token transfers found');
                  continue;
                }
                
                const tokenTransfer = relevantTransfers[0];
                
                // Get token information
                const tokenInfo = await getTokenInfoWithHelius(
                  tokenTransfer.mint,
                  tokenTransfer
                );
                
                // Find matching SOL transfer
                let solAmount = 0;
                if (transaction.nativeTransfers && transaction.nativeTransfers.length > 0) {
                  const solTransfers = transaction.nativeTransfers
                    .filter((nt: any) => {
                      const transfer = nt as NativeTransfer;
                      return transfer.amount > 5000 && 
                        (transfer.fromUserAccount === walletInvolved || transfer.toUserAccount === walletInvolved);
                    });
                  
                  if (solTransfers.length > 0) {
                    const solTransfer = solTransfers.sort((a: NativeTransfer, b: NativeTransfer) => b.amount - a.amount)[0];
                    solAmount = solTransfer.amount / 1e9;
                  }
                }
                
                // Calculate amounts
                const tokenAmount = tokenTransfer.tokenAmount;
                
                // Determine exchange
                const source = formatDexName(
                  transaction.description?.includes(':') ? 
                  transaction.description.split(':')[0] : 
                  transaction.source || 'Unknown DEX'
                );
                
                // Format and send Discord message using the new function
                const message = await createDiscordMessageForTransaction(
                  transaction,
                  walletInvolved,
                  walletNickname || formatAddress(walletInvolved),
                  isBuy,
                  tokenTransfer.mint,
                  tokenInfo,
                  tokenAmount,
                  solAmount,
                  source
                );
                
                // Send to Discord webhook
                console.log(`Sending ${isBuy ? 'BUY' : 'SELL'} Discord notification`);
                const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
                if (webhookUrl) {
                  try {
                    await sendDiscordWebhook(webhookUrl, message);
                    console.log(`✅ Successfully sent ${isBuy ? 'BUY' : 'SELL'} notification to Discord!`);
                  } catch (error) {
                    console.error('❌ Failed to send to Discord:', (error as Error).message);
                  }
                } else {
                  console.error('Discord webhook URL not configured');
                }
              } catch (error) {
                console.error('Error processing BUY/SELL transaction:', (error as Error).message);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error processing transaction:', (error as Error).message);
      }
    }
    
    return new NextResponse(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '1'
      },
    });
  } catch (error) {
    console.error('Error processing webhook:', (error as Error).message);
    return new NextResponse(JSON.stringify({ error: 'Failed to process webhook' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '1'
      },
    });
  }
}