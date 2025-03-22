import axios from 'axios';

// Queue for pending Discord messages
const messageQueue: any[] = [];
let isProcessing = false;
let lastSentTime = 0;

// Minimum delay between messages in ms (1000ms = 1 second)
const MIN_DELAY = 1000;

/**
 * Add message to queue and process queue if not already processing
 */
export async function sendDiscordWebhook(url: string, message: any): Promise<void> {
  try {
    console.log('======= SENDING DISCORD WEBHOOK =======');
    console.log('Webhook URL:', url.substring(0, 30) + '...');
    
    // Safe stringify of the webhook content
    let messagePreview = '';
    try {
      messagePreview = JSON.stringify(message).slice(0, 300) + '...';
    } catch (e: any) {
      messagePreview = 'Error stringifying message: ' + e.message;
    }
    console.log('Message preview:', messagePreview);
    
    // Ensure the webhook URL is valid
    if (!url.startsWith('https://discord.com/api/webhooks/')) {
      throw new Error('Invalid Discord webhook URL format');
    }
    
    // Add debug logging before making the request
    console.log('Making request to Discord webhook URL...');
    
    // Add timeout and better error handling
    const response = await axios.post(url, message, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Discord response status:', response.status, response.statusText);
    
    if (response.status >= 200 && response.status < 300) {
      console.log('Discord webhook sent successfully! ✅');
    } else {
      console.error('Discord webhook returned non-success status:', response.status, response.statusText);
      console.error('Response data:', response.data);
    }
    console.log('======= END DISCORD WEBHOOK =======');
  } catch (error) {
    console.error('======= DISCORD WEBHOOK ERROR =======');
    console.error('Error sending Discord webhook:');
    
    if (axios.isAxiosError(error)) {
      console.error('Status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      console.error('Error message:', error.message);
      
      // More detailed diagnostics based on error type
      if (error.response?.status === 404) {
        console.error('CRITICAL ERROR: Discord webhook URL not found (404) - check the URL');
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('CRITICAL ERROR: Discord webhook authentication failed - check permissions');
      } else if (error.code === 'ECONNABORTED') {
        console.error('CRITICAL ERROR: Discord webhook request timed out');
      } else if (error.code === 'ENOTFOUND') {
        console.error('CRITICAL ERROR: DNS lookup failed - check internet connection or webhook URL');
      }
    } else {
      console.error('Unknown error type:', error);
    }
    console.error('======= END DISCORD WEBHOOK ERROR =======');
    
    // Rethrow to allow caller to handle
    throw error;
  }
}

/**
 * Process messages in queue one by one with rate limiting
 */
async function processQueue() {
  if (messageQueue.length === 0) {
    isProcessing = false;
    return;
  }
  
  isProcessing = true;
  
  // Calculate delay needed to respect rate limits
  const now = Date.now();
  const timeElapsed = now - lastSentTime;
  const delay = Math.max(0, MIN_DELAY - timeElapsed);
  
  if (delay > 0) {
    // Wait to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  // Get next message
  const { webhookUrl, message } = messageQueue.shift();
  
  try {
    console.log('Sending message to Discord webhook (queued)');
    const response = await axios.post(webhookUrl, message);
    console.log('Discord response:', response.status, response.statusText);
    lastSentTime = Date.now();
  } catch (error: any) {
    console.error('Error sending to Discord:', error.message);
    
    // If rate limited, get retry-after header and wait accordingly
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'] || 5;
      console.log(`Rate limited. Waiting ${retryAfter}s before retrying...`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      
      // Put message back in queue
      messageQueue.unshift({ webhookUrl, message });
    }
  }
  
  // Continue processing queue
  processQueue();
}

export function isValidWebhookUrl(url: string): boolean {
  // Discord webhook URLs follow this pattern:
  // https://discord.com/api/webhooks/webhook_id/webhook_token
  // Relaxed pattern to handle potential variations
  const pattern = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w\-]+$/;
  console.log("Validating webhook URL:", url);
  console.log("Is valid:", pattern.test(url));
  return pattern.test(url);
} 