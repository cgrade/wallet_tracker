// app/api/list-wallets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Fallback to local storage when webhook is not available
const getLocalWallets = () => {
  const dataPath = path.join(process.cwd(), 'data');
  const walletsPath = path.join(dataPath, 'wallets.json');
  
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  
  if (!fs.existsSync(walletsPath)) {
    fs.writeFileSync(walletsPath, JSON.stringify({ wallets: [] }));
    return [];
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(walletsPath, 'utf8'));
    return data.wallets || [];
  } catch (error) {
    console.error('Error reading local wallets file:', error);
    return [];
  }
};

export async function GET() {
  try {
    // Try to get wallets from Helius webhook first
    try {
      const response = await axios.get(
        `https://api.helius.xyz/v0/webhooks/${process.env.HELIUS_WEBHOOK_ID}?api-key=${process.env.HELIUS_API_KEY}`
      );
      return NextResponse.json({ wallets: response.data.accountAddresses || [] });
    } catch (fetchError) {
      console.log('Failed to get wallets from Helius, falling back to local storage');
      // Fall back to local storage if Helius fails
      const wallets = getLocalWallets();
      return NextResponse.json({ wallets });
    }
  } catch (outerError) {
    console.error('Error listing wallets:', outerError);
    return NextResponse.json({ error: 'Failed to list wallets' }, { status: 500 });
  }
}