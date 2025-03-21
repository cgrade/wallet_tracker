// app/api/remove-wallet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { removeWallet } from '../../utils/db';

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();
    
    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    const wallets = removeWallet(address);
    
    return NextResponse.json({
      success: true,
      message: 'Wallet removed successfully',
      wallets
    });
  } catch (error) {
    console.error('Error removing wallet:', error);
    return NextResponse.json(
      { error: 'Failed to remove wallet' },
      { status: 500 }
    );
  }
}