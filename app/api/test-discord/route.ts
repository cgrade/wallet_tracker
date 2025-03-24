import { NextRequest, NextResponse } from 'next/server';
import { sendDiscordWebhook } from '../../utils/discord';

export async function GET(req: NextRequest): Promise<NextResponse> {
  console.log("Testing Discord webhook...");
  
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    console.error("Discord webhook URL not configured");
    return NextResponse.json({ 
      success: false, 
      message: "Discord webhook URL not configured" 
    }, { status: 500 });
  }
  
  try {
    const message = {
      embeds: [{
        title: "Test Message",
        description: "This is a test message from your wallet tracker application.",
        color: 0x00FF00,
        timestamp: new Date().toISOString()
      }]
    };
    
    console.log("Sending test message to Discord...");
    await sendDiscordWebhook(webhookUrl, message);
    
    return NextResponse.json({ 
      success: true, 
      message: "Test message sent to Discord webhook",
      webhookConfigured: true,
      webhookUrl: webhookUrl.substring(0, 30) + "..." // For security, don't show the full URL
    });
  } catch (error) {
    console.error("Error sending test message to Discord:", (error as Error).message);
    return NextResponse.json({ 
      success: false, 
      message: "Error sending test message to Discord: " + (error as Error).message 
    }, { status: 500 });
  }
}
