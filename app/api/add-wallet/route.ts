// app/api/add-wallet/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { addWallet } from '../../utils/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { address, nickname } = body;
    
    if (!address) {
      return NextResponse.json({ success: false, error: 'Address is required' }, { status: 400 });
    }
    
    addWallet({ address, nickname: nickname || '' });
    
    return NextResponse.json({
      success: true,
      message: 'Wallet added successfully'
    });
  } catch (error) {
    console.error('Error adding wallet:', error);
    return NextResponse.json({ success: false, error: 'Failed to add wallet' }, { status: 500 });
  }
}