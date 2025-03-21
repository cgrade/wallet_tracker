import { NextResponse } from 'next/server';
import { getWallets } from '../../utils/db';

export async function GET() {
  try {
    const wallets = getWallets();
    return NextResponse.json({ 
      count: wallets.length,
      wallets: wallets.map(w => ({
        address: w.address,
        nickname: w.nickname || null,
        shortAddress: w.address.slice(0, 6) + '...' + w.address.slice(-6)
      }))
    });
  } catch (error) {
    console.error('Error getting wallets:', error);
    return NextResponse.json({ error: 'Failed to get wallets' }, { status: 500 });
  }
} 