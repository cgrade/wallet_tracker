// app/api/remove-wallet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { removeWalletFromWebhook } from '../../../utils/helius';

export async function POST(req: NextRequest) {
  const { address } = await req.json();
  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }
  try {
    await removeWalletFromWebhook(address);
    return NextResponse.json({ message: 'Wallet removed successfully' });
  } catch (error) {
    console.error('Error removing wallet:', error);
    return NextResponse.json({ error: 'Failed to remove wallet' }, { status: 500 });
  }
}