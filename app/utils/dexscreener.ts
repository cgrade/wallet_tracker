import axios from 'axios';

// Cache market cap to avoid excessive API calls
const marketCapCache: Record<string, { fdv: number, timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minute cache

export async function getTokenMarketCap(tokenAddress: string): Promise<number | null> {
  // Check cache first
  const now = Date.now();
  if (marketCapCache[tokenAddress] && now - marketCapCache[tokenAddress].timestamp < CACHE_TTL) {
    return marketCapCache[tokenAddress].fdv;
  }

  try {
    const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`, {
      timeout: 5000
    });

    if (response.data?.pairs && response.data.pairs.length > 0) {
      // Find the pair with the highest liquidity
      const pairs = response.data.pairs.sort((a: any, b: any) => 
        (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
      );
      
      if (pairs[0].fdv) {
        const fdv = parseFloat(pairs[0].fdv);
        // Update cache
        marketCapCache[tokenAddress] = { fdv, timestamp: now };
        return fdv;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error fetching market cap for ${tokenAddress}:`, error);
    return null;
  }
} 