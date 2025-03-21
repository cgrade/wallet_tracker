import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    return NextResponse.json({ error: 'No webhook URL configured' });
  }
  
  try {
    // Simplest possible message
    const message = { content: `Simple test message: ${Date.now()}` };
    
    const response = await axios.post(webhookUrl, message);
    
    return NextResponse.json({
      success: true,
      status: response.status,
      webhookUrl: webhookUrl.substring(0, 30) + '...'
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({
      error: 'Failed to send',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 