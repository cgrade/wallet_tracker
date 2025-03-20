// app/api/add-wallet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { addWalletToWebhook } from '../../../utils/helius';

export async function POST(req: NextRequest) {
  const { address } = await req.json();
  if (!address) {
    return NextResponse.json({ error: 'Address is required' }, { status: 400 });
  }
  try {
    await addWalletToWebhook(address);
    return NextResponse.json({ message: 'Wallet added successfully' });
  } catch (error) {
    console.error('Error adding wallet:', error);
    return NextResponse.json({ error: 'Failed to add wallet' }, { status: 500 });
  }
}