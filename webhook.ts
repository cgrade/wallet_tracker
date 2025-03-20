(async () => {
  // Add the API key as a query parameter
  const apiKey = "f1ec396a-5ee2-453d-b335-16741378f95a";
  
  const response = await fetch(`https://api.helius.xyz/v0/webhooks?api-key=${apiKey}`, {
    method: 'POST',
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "webhookURL": "https://webhook.site/b068fef9-bad2-4fd2-9a46-13a7ce8fcec3",
      "transactionTypes": [
        "SWAP",
        "TOKEN_TRANSFER"
      ],
      "accountAddresses": [
        "XPNukQAZLpDJtTC5qsQv7k9ijz5A5AGacFAceH2S8tX"
      ],
      "webhookType": "enhanced",
      "txnStatus": "all",
      "authHeader": "text"
    })
  });

  const data = await response.json();
  console.log(data);
})();
