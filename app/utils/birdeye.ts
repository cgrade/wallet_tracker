import axios from 'axios';

// Cache prices to avoid excessive API calls - extend cache to reduce API calls
const priceCache: Record<string, { price: number, timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache (increased from 1 minute)

// Keep track of failed requests to implement backoff
let failedRequests = 0;
let lastFailTime = 0;
const MAX_RETRY_DELAY = 30 * 1000; // 30 seconds maximum backoff

export async function getTokenPrice(tokenAddress: string): Promise<number> {
  // Check cache first
  const now = Date.now();
  if (priceCache[tokenAddress] && now - priceCache[tokenAddress].timestamp < CACHE_TTL) {
    return priceCache[tokenAddress].price;
  }

  // Check if we should backoff due to rate limiting
  if (failedRequests > 0) {
    const timeSinceLastFail = now - lastFailTime;
    const backoffTime = Math.min(Math.pow(2, failedRequests) * 1000, MAX_RETRY_DELAY);
    
    if (timeSinceLastFail < backoffTime) {
      console.log(`Backing off Birdeye API for ${backoffTime}ms due to rate limiting`);
      
      // Return cached value if available (even if expired)
      if (priceCache[tokenAddress]) {
        console.log(`Using stale cache for ${tokenAddress}`);
        return priceCache[tokenAddress].price;
      }
      return 0;
    }
  }

  try {
    const API_KEY = process.env.BIRDEYE_API_KEY;
    if (!API_KEY) {
      console.error('No Birdeye API key configured');
      return 0;
    }

    // Updated endpoint based on the Birdeye research
    const response = await axios.get(`https://public-api.birdeye.so/defi/price`, {
      params: { address: tokenAddress },
      headers: {
        'X-API-KEY': API_KEY,
        'x-chain': 'solana'
      },
      timeout: 5000
    });

    // Reset failed requests counter on success
    failedRequests = 0;

    if (response.data?.data?.value) {
      const price = response.data.data.value;
      // Update cache
      priceCache[tokenAddress] = { price, timestamp: now };
      return price;
    }
    return 0;
  } catch (error) {
    // Handle rate limiting specifically
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      failedRequests++;
      lastFailTime = now;
      console.log(`Rate limited by Birdeye API (attempt ${failedRequests})`);
      
      // Return cached value if available (even if expired)
      if (priceCache[tokenAddress]) {
        console.log(`Using stale cache for ${tokenAddress} due to rate limiting`);
        return priceCache[tokenAddress].price;
      }
    } else {
      console.error(`Error fetching price for ${tokenAddress}:`, error);
    }
    return 0;
  }
}

// Add new function to get market cap directly from Birdeye
const marketCapCache: Record<string, { value: number, timestamp: number }> = {};
const MARKETCAP_CACHE_TTL = 15 * 60 * 1000; // 15 minute cache (increased from 5 minutes)

export async function getTokenMarketCapBirdeye(tokenAddress: string): Promise<number | null> {
  // Check cache first
  const now = Date.now();
  if (marketCapCache[tokenAddress] && now - marketCapCache[tokenAddress].timestamp < MARKETCAP_CACHE_TTL) {
    return marketCapCache[tokenAddress].value;
  }

  // Check if we should backoff due to rate limiting
  if (failedRequests > 0) {
    const timeSinceLastFail = now - lastFailTime;
    const backoffTime = Math.min(Math.pow(2, failedRequests) * 1000, MAX_RETRY_DELAY);
    
    if (timeSinceLastFail < backoffTime) {
      console.log(`Backing off Birdeye API for market cap for ${backoffTime}ms due to rate limiting`);
      
      // Return cached value if available (even if expired)
      if (marketCapCache[tokenAddress]) {
        console.log(`Using stale market cap cache for ${tokenAddress}`);
        return marketCapCache[tokenAddress].value;
      }
      return null;
    }
  }

  try {
    const API_KEY = process.env.BIRDEYE_API_KEY;
    if (!API_KEY) {
      console.error('No Birdeye API key configured');
      return null;
    }

    // Use the token_overview endpoint for market cap data
    const response = await axios.get(`https://public-api.birdeye.so/defi/token_overview`, {
      params: { address: tokenAddress },
      headers: {
        'X-API-KEY': API_KEY,
        'x-chain': 'solana'
      },
      timeout: 5000
    });

    // Reset failed requests counter on success
    failedRequests = 0;

    if (response.data?.marketCap) {
      const marketCap = response.data.marketCap;
      // Update cache
      marketCapCache[tokenAddress] = { value: marketCap, timestamp: now };
      return marketCap;
    }
    return null;
  } catch (error) {
    // Handle rate limiting specifically
    if (axios.isAxiosError(error) && error.response?.status === 429) {
      failedRequests++;
      lastFailTime = now;
      console.log(`Rate limited by Birdeye API for market cap (attempt ${failedRequests})`);
      
      // Return cached value if available (even if expired)
      if (marketCapCache[tokenAddress]) {
        console.log(`Using stale market cap cache for ${tokenAddress} due to rate limiting`);
        return marketCapCache[tokenAddress].value;
      }
    } else {
      console.error(`Error fetching market cap for ${tokenAddress} from Birdeye:`, error);
    }
    return null;
  }
} 