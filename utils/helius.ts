// utils/helius.ts
import axios from 'axios';

const HELIUS_API_URL = 'https://api.helius.xyz/v0';

// Create a new webhook
export async function createWebhook() {
  const response = await axios.post(
    `${HELIUS_API_URL}/webhooks?api-key=${process.env.HELIUS_API_KEY}`,
    {
      webhookURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/helius-webhook`,
      transactionTypes: ['TOKEN_TRANSFER', 'SWAP'],
      accountAddresses: [],
      webhookType: 'enhanced',
    }
  );
  console.log('Webhook ID:', response.data.webhookID);
  return response.data.webhookID;
}

// Add a wallet address to the Helius webhook
export async function addWalletToWebhook(address: string) {
  try {
    const webhookID = process.env.HELIUS_WEBHOOK_ID;
    
    if (!webhookID) {
      console.error("No webhook ID found - run npm run create-webhook first");
      throw new Error("Webhook ID not configured");
    }
    
    try {
      // 1. Get current webhook config
      const response = await axios.get(
        `${HELIUS_API_URL}/webhooks/${webhookID}?api-key=${process.env.HELIUS_API_KEY}`
      );
      const currentAddresses = response.data.accountAddresses || [];
      
      // Check if address is already in the list
      if (currentAddresses.includes(address)) {
        console.log(`Address ${address} already being tracked`);
        return;
      }
      
      // 2. Add the new address to the list
      const updatedAddresses = [...currentAddresses, address];
      
      // 3. Update the webhook with ALL properties
      await axios.put(
        `${HELIUS_API_URL}/webhooks/${webhookID}?api-key=${process.env.HELIUS_API_KEY}`,
        {
          // Include all original properties
          webhookURL: response.data.webhookURL,
          transactionTypes: response.data.transactionTypes,
          webhookType: response.data.webhookType,
          txnStatus: response.data.txnStatus,
          // Update just the addresses
          accountAddresses: updatedAddresses
        }
      );
      
      console.log(`Added ${address} to webhook monitoring`);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.error("Webhook not found. Please run 'npm run create-webhook' to create a new webhook");
        throw new Error("Webhook not found");
      }
      throw error;
    }
  } catch (error) {
    console.error("Error adding wallet to webhook:", error);
    throw error;
  }
}

// Remove a wallet address from the Helius webhook
export async function removeWalletFromWebhook(address: string) {
  try {
    const webhookID = process.env.HELIUS_WEBHOOK_ID;
    
    if (!webhookID) {
      console.error("No webhook ID found - run npm run register-webhook first");
      throw new Error("Webhook ID not configured");
    }
    
    try {
      const response = await axios.get(
        `${HELIUS_API_URL}/webhooks/${webhookID}?api-key=${process.env.HELIUS_API_KEY}`
      );
      const currentAddresses = response.data.accountAddresses || [];
      
      // Filter out the address to remove
      const updatedAddresses = currentAddresses.filter(
        (addr: string) => addr !== address
      );
      
      // Update the webhook with the new list
      await axios.put(
        `${HELIUS_API_URL}/webhooks/${webhookID}?api-key=${process.env.HELIUS_API_KEY}`,
        { accountAddresses: updatedAddresses }
      );
      
      console.log(`Removed ${address} from webhook monitoring`);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.error("Webhook not found. Please run 'npm run register-webhook' to create a new webhook");
        throw new Error("Webhook not found");
      }
      throw error;
    }
  } catch (error) {
    console.error("Error removing wallet from webhook:", error);
    throw error;
  }
}

// Get token metadata for better alert formatting
export async function getTokenMetadata(mint: string) {
  try {
    const response = await axios.get(
      `${HELIUS_API_URL}/tokens?api-key=${process.env.HELIUS_API_KEY}`,
      { params: { mintAccounts: [mint] } }
    );
    return response.data[0] || { symbol: mint.slice(0, 4) };
  } catch (error) {
    console.error('Error fetching token metadata:', error);
    return { symbol: mint.slice(0, 4) };
  }
}