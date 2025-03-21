import { NextResponse } from 'next/server';
import { getWallets } from '../../utils/db';

export async function GET() {
  try {
    const wallets = getWallets();
    
    if (wallets.length === 0) {
      return NextResponse.json({ error: 'No tracked wallets' }, { status: 400 });
    }
    
    // Get the first wallet from your database
    const testWallet = wallets[0].address;
    
    // Create a test SWAP payload with this wallet
    const testPayload = [
      {
        "type": "SWAP",
        "signature": "test_signature_" + Date.now(),
        "timestamp": Date.now(),
        "fee": 5000,
        "feePayer": testWallet,
        "nativeTransfers": [
          {
            "fromUserAccount": testWallet,
            "toUserAccount": "someotheraddress1234567890123456789012",
            "amount": 12500000
          }
        ],
        "swaps": [
          {
            "inputMint": "So11111111111111111111111111111111111111112",
            "outputMint": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
            "inputAmount": 0.0125,
            "outputAmount": 125000,
            "fromUserAccount": testWallet,
            "source": "Jupiter"
          }
        ]
      }
    ];
    
    // Call your own webhook endpoint with this payload
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/helius-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload)
    });
    
    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      webhookResult: result,
      testPayload: {
        walletUsed: testWallet,
        signature: testPayload[0].signature
      }
    });
  } catch (error) {
    console.error('Error in test-helius:', error);
    return NextResponse.json({
      error: 'Failed to run test',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 