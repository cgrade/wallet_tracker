// app/api/helius-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getTokenMetadata } from '../../../utils/helius';
import fs from 'fs';
import path from 'path';

// Create a logging function - fix any type
function logWebhookEvent(event: Record<string, unknown>) {
  const logDir = path.join(process.cwd(), 'logs');
  
  // Create logs directory if it doesn't exist
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const logFile = path.join(logDir, 'webhook-events.log');
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${JSON.stringify(event)}\n`;
  
  fs.appendFileSync(logFile, logEntry);
}

// Define interface for swap data
interface SwapData {
  inputMint: string;
  outputMint: string;
  inputAmount: number;
  outputAmount: number;
  fromUserAccount: string;
  source: string;
  [key: string]: unknown;
}

// Define a proper type for the transaction data
interface TransactionData {
  accountData?: unknown[];
  description?: string;
  events?: Record<string, unknown>;
  fee?: number;
  feePayer?: string;
  nativeTransfers?: unknown[];
  signature?: string;
  type?: string;
  swaps?: SwapData[]; // Define swaps as an array of SwapData
  // Add other fields as needed
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  console.log('Helius webhook received a request');
  try {
    // Replace 'any' with our interface
    const data = await req.json() as TransactionData[];
    console.log('Webhook payload received:', JSON.stringify(data).slice(0, 200) + '...');
    
    // Log all events for debugging
    if (Array.isArray(data)) {
      data.forEach(event => logWebhookEvent(event as Record<string, unknown>));
    } else {
      logWebhookEvent(data as unknown as Record<string, unknown>);
    }
    
    for (const event of data) {
      console.log(`Processing event of type: ${event.type}`);
      
      if (event.type === 'SWAP' && event.swaps && event.swaps.length > 0) {
        console.log('Found SWAP event, preparing Discord notification');
        const swap = event.swaps[0];
        const inputMint = swap.inputMint;
        const outputMint = swap.outputMint;
        const inputData = await getTokenMetadata(inputMint);
        const outputData = await getTokenMetadata(outputMint);
        const inputSymbol = inputData.symbol || inputMint.slice(0, 8);
        const outputSymbol = outputData.symbol || outputMint.slice(0, 8);
        const inputAmount = swap.inputAmount / 1e9;
        const outputAmount = swap.outputAmount / 1e9;
        const action =
          inputMint === 'So11111111111111111111111111111111111111112'
            ? `BUY ${outputSymbol}`
            : outputMint === 'So11111111111111111111111111111111111111112'
            ? `SELL ${inputSymbol}`
            : `SWAP ${inputSymbol} for ${outputSymbol}`;
        
        // Format the message to match the example
        const message = {
          embeds: [
            {
              title: `${action} on ${swap.source.toUpperCase()}`,
              description: `Transaction: [${event.signature}](${`https://solscan.io/tx/${event.signature}`})`,
              fields: [
                {
                  name: `${swap.fromUserAccount.slice(0, 8)}`,
                  value: `SOL: ${inputMint === 'So11111111111111111111111111111111111111112' ? `-${inputAmount}` : `+${outputAmount}`}\n${outputSymbol}: ${inputMint === 'So11111111111111111111111111111111111111112' ? `+${outputAmount}` : `-${inputAmount}`}`,
                  inline: true,
                },
              ],
              color: action.startsWith('BUY') ? 0x00ff00 : 0xff0000, // Green for buy, red for sell
              footer: { text: `#${outputSymbol} | Seen: 5h 0m` },
            },
          ],
        };
        
        try {
          const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
          if (!webhookUrl) {
            throw new Error('Discord webhook URL not configured');
          }
          
          console.log('Sending to Discord webhook:', webhookUrl);
          await axios.post(webhookUrl, message);
          console.log('Successfully sent to Discord');
        } catch (discordError) {
          console.error('Error sending to Discord:', discordError);
        }
      } else if (event.type === 'TOKEN_TRANSFER') {
        console.log('Found TOKEN_TRANSFER event');
        // Handle token transfer similarly if needed
      }
    }
    
    return NextResponse.json({ message: 'Webhook processed' });
  } catch (error) {
    console.error('Error processing webhook:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
}