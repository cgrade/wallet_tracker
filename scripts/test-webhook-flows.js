const axios = require('axios');

// Get configuration from environment or use defaults
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const WALLET_ADDRESS = process.env.WALLET_ADDRESS || '6PxSicrsqtuDznoUVCZJXDSSCHU6jDw5WJx7t5kSjPH';

// Create a sample transaction payload that mimics what Helius would send
const createSamplePayload = (walletAddress) => {
  return [
    {
      signature: `test-transaction-${Date.now()}`,
      feePayer: walletAddress,
      type: 'SWAP',
      source: 'Jupiter',
      timestamp: Math.floor(Date.now() / 1000),
      fee: 5000,
      nativeTransfers: [
        {
          fromUserAccount: walletAddress,
          toUserAccount: 'SomeRandomAddress123456789',
          amount: 100000000 // 0.1 SOL in lamports
        }
      ],
      tokenTransfers: [
        {
          fromUserAccount: 'SomeRandomAddress123456789',
          toUserAccount: walletAddress,
          mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK token
          tokenAmount: 10000000
        }
      ],
      swaps: [
        {
          inputMint: 'So11111111111111111111111111111111111111112', // SOL
          outputMint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
          inputAmount: 100000000, // 0.1 SOL in lamports
          outputAmount: 10000000,
          fromUserAccount: walletAddress,
          source: 'Jupiter'
        }
      ]
    }
  ];
};

// Main test function
async function testWebhookFlow() {
  const webhookUrl = `${SERVER_URL}/api/helius-webhook`;
  const testPayload = createSamplePayload(WALLET_ADDRESS);
  
  console.log(`🧪 Testing webhook flow with server: ${SERVER_URL}`);
  console.log(`👛 Using wallet address: ${WALLET_ADDRESS}`);
  console.log(`🔗 Sending request to: ${webhookUrl}`);
  console.log(`📦 Payload: ${JSON.stringify(testPayload, null, 2)}`);
  
  try {
    console.log('⏳ Sending webhook request...');
    const response = await axios.post(webhookUrl, testPayload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout to allow for processing
    });
    
    console.log('✅ Response received:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Data: ${JSON.stringify(response.data)}`);
    
    if (response.status === 200 && response.data.success) {
      console.log('🎉 Test completed successfully! The webhook was processed.');
      console.log('👉 Check your Discord channel to see if the message was received.');
    } else {
      console.error('❌ Test failed. The webhook was not processed correctly.');
    }
  } catch (error) {
    console.error('❌ Error during test:');
    if (error.response) {
      console.error(`   Status: ${error.response.status || 'unknown'}`);
      console.error(`   Response: ${JSON.stringify(error.response.data || {})}`);
      console.error(`   Message: ${error.message}`);
    } else {
      console.error(error);
    }
  }
}

// Run the test
testWebhookFlow(); 
