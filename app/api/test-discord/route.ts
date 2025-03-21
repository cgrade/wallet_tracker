import { NextResponse } from 'next/server';
import axios from 'axios';
import { getWallets } from '../../utils/db';

export async function GET() {
  try {
    // Get webhook URL from environment
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.error('DISCORD_WEBHOOK_URL is not defined in environment variables');
      return NextResponse.json({ error: 'Discord webhook URL not configured' }, { status: 500 });
    }
    
    console.log('Using webhook URL:', webhookUrl.substring(0, 20) + '...');
    
    // Get a wallet for the test message
    const wallets = getWallets();
    const walletDisplay = wallets.length > 0 
      ? `${wallets[0].nickname || wallets[0].address.slice(0, 8) + '...'} (${wallets[0].address})` 
      : 'No wallets configured';
    
    // Create a simple test message
    const message = {
      content: `🧪 **Test Notification from Wallet Tracker** (${new Date().toISOString()})\n\nTracking wallet: ${walletDisplay}\n\nIf you see this message, your webhook is working correctly!`
    };
    
    // Send directly with axios instead of using the utility function
    console.log('Sending test message to Discord...');
    const response = await axios.post(webhookUrl, message, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('Discord response:', response.status, response.statusText);
    
    return NextResponse.json({ 
      success: true, 
      status: response.status,
      message: 'Test notification sent to Discord' 
    });
    
  } catch (error) {
    console.error('Failed to send test message to Discord:', error);
    
    // Provide detailed error info
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      status: axios.isAxiosError(error) ? error.response?.status : undefined,
      data: axios.isAxiosError(error) ? error.response?.data : undefined
    };
    
    return NextResponse.json({ 
      error: 'Failed to send test notification',
      details: errorDetails
    }, { status: 500 });
  }
} 