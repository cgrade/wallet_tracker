// app/api/list-wallets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getWallets } from '../../utils/db';

export async function GET(req: NextRequest) {
  try {
    const wallets = getWallets();
    return NextResponse.json({ wallets });
  } catch (error) {
    console.error('Error listing wallets:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve wallets' },
      { status: 500 }
    );
  }
}