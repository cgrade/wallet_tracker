"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Connection, PublicKey } from "@solana/web3.js";
import { getTransaction } from "../utils/solana";

interface Wallet {
  address: string;
  nickname?: string;
}

interface WalletData {
  address: string;
  nickname: string;
  balance: number;
  lastTransaction: string;
  transactionType?: string;
}

// Update the connection initialization to be more robust
const getConnection = () => {
  const rpcUrl =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    "https://api.mainnet-beta.solana.com";
  console.log("Using RPC URL:", rpcUrl); // For debugging

  try {
    return new Connection(rpcUrl);
  } catch (error) {
    console.error("Error creating connection:", error);
    // Fallback to public endpoint
    return new Connection("https://api.mainnet-beta.solana.com");
  }
};

const connection = getConnection();

// Get wallet balance
async function getBalance(address: string): Promise<number> {
  try {
    if (!address) return 0;

    const publicKey = new PublicKey(address);
    const balance = await connection.getBalance(publicKey);
    return balance / 1e9; // Convert lamports to SOL
  } catch (error) {
    console.error(`Error getting balance for ${address}:`, error);
    return 0;
  }
}

// Get recent transactions (simplified)
async function getRecentTransactions(address: string): Promise<string> {
  try {
    if (!address) return "N/A";

    const publicKey = new PublicKey(address);
    const signatures = await connection.getSignaturesForAddress(publicKey, {
      limit: 1,
    });

    if (signatures.length > 0) {
      return signatures[0].signature;
    }
    return "N/A";
  } catch (error) {
    console.error(`Error getting transactions for ${address}:`, error);
    return "N/A";
  }
}

// Export the fetchWallets function for parent component
export const fetchWallets = async () => {
  try {
    const response = await axios.get("/api/list-wallets");
    return response.data.wallets;
  } catch (error) {
    console.error("Error fetching wallets:", error);
    toast.error("Failed to load wallets");
    return [];
  }
};

export default function WalletCard() {
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWallets = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/list-wallets");
      const data = await response.json();

      console.log("Raw wallet data:", data.wallets);

      // Simplified processing without async calls
      const walletsWithData = data.wallets.map((entry: any) => {
        const address = typeof entry === "string" ? entry : entry.address || "";
        const nickname =
          typeof entry === "object" && entry.nickname
            ? entry.nickname
            : `Wallet ${
                typeof address === "string"
                  ? address.slice(0, 6) + "..."
                  : "Unknown"
              }`;

        console.log(
          `Processing wallet: address=${address}, nickname=${nickname}`
        );

        return {
          address,
          nickname,
          balance: 0, // Default value until loaded separately
          lastTransaction: "Loading...", // Default value
        };
      });

      setWallets(walletsWithData);

      // Optionally load balances in the background
      loadBalancesInBackground(walletsWithData);
    } catch (error) {
      console.error("Error loading wallets:", error);
      setError("Failed to load wallets");
    } finally {
      setLoading(false);
    }
  };

  // Add this helper function
  const loadBalancesInBackground = async (walletList: any[]) => {
    try {
      const updatedWallets = [...walletList];

      for (let i = 0; i < updatedWallets.length; i++) {
        try {
          const wallet = updatedWallets[i];
          const publicKey = new PublicKey(wallet.address);
          const balance = await connection.getBalance(publicKey);

          updatedWallets[i] = {
            ...wallet,
            balance: balance / 1e9,
          };

          // Update UI after every few wallets
          if (i % 3 === 0 || i === updatedWallets.length - 1) {
            setWallets([...updatedWallets]);
          }
        } catch (err) {
          console.error(
            `Error loading balance for wallet ${updatedWallets[i].address}:`,
            err
          );
        }
      }
    } catch (err) {
      console.error("Error in background loading:", err);
    }
  };

  // Function to load actual wallet data
  const loadWalletData = async (basicWallets: WalletData[]) => {
    try {
      // Process wallets in batches to avoid rate limiting
      const updatedWallets = [...basicWallets];

      // Process each wallet
      for (let i = 0; i < updatedWallets.length; i++) {
        const wallet = updatedWallets[i];
        try {
          // Create a PublicKey for the wallet
          const publicKey = new PublicKey(wallet.address);

          // Get balance
          const balance = await connection.getBalance(publicKey);
          updatedWallets[i] = {
            ...wallet,
            balance: balance / 1e9, // Convert lamports to SOL
          };

          // Get last transaction (optional)
          try {
            const signatures = await connection.getSignaturesForAddress(
              publicKey,
              { limit: 1 }
            );
            if (signatures.length > 0) {
              const txSignature = signatures[0].signature;
              const txDescription = await getTransactionDescription(
                txSignature
              );

              updatedWallets[i] = {
                ...updatedWallets[i],
                lastTransaction: txSignature,
                transactionType: txDescription,
              };
            }
          } catch (txError) {
            console.log(`Couldn't fetch transactions for ${wallet.address}`);
            // Keep existing lastTransaction value
          }
        } catch (err) {
          console.log(`Error processing wallet ${wallet.address}:`, err);
          // Keep default values for this wallet
        }

        // Update UI after each wallet is processed
        if (i % 3 === 0 || i === updatedWallets.length - 1) {
          setWallets([...updatedWallets]);
        }
      }

      // Final update
      setWallets(updatedWallets);
    } catch (error) {
      console.error("Error loading wallet data:", error);
    }
  };

  // Format transaction description based on type
  async function getTransactionDescription(signature: string) {
    try {
      // Use the utility function that properly handles transaction versions
      const transaction = await getTransaction(signature);

      if (!transaction) {
        return "Unknown transaction";
      }

      // Try to identify transaction type
      if (transaction.meta?.logMessages?.some((log) => log.includes("swap"))) {
        return "Token Swap";
      } else if (
        transaction.meta?.logMessages?.some((log) => log.includes("transfer"))
      ) {
        return "Token Transfer";
      } else if (
        transaction.meta?.logMessages?.some((log) =>
          log.includes("createAccount")
        )
      ) {
        return "Account Creation";
      } else if (
        transaction.meta?.logMessages?.some((log) => log.includes("stake"))
      ) {
        return "Staking Transaction";
      }

      return "Transaction";
    } catch (error) {
      console.error("Error getting transaction description:", error);
      return "Error fetching transaction";
    }
  }

  useEffect(() => {
    loadWallets();
  }, []);

  const handleRemove = async (address: string) => {
    try {
      await axios.post("/api/remove-wallet", { address });
      toast.success("Wallet removed successfully");
      // After removing, reload the whole list
      loadWallets();
    } catch (error) {
      console.error("Error removing wallet:", error);
      toast.error("Failed to remove wallet");
    }
  };

  const handleRefresh = () => {
    loadWallets();
  };

  if (loading) {
    return <div className="loading">Loading wallets...</div>;
  }

  return (
    <div className="wallet-container">
      <div className="wallet-header">
        <h2>Your Wallets</h2>
        <button className="refresh-btn" onClick={handleRefresh}>
          Refresh Data
        </button>
      </div>
      {wallets.length === 0 ? (
        <p className="no-wallets">No wallets tracked yet. Add one above!</p>
      ) : (
        <div className="wallet-grid">
          {wallets.map((wallet) => (
            <div key={wallet.address} className="wallet-card">
              <h3 className="wallet-nickname">
                {wallet.nickname || `Wallet ${wallet.address.slice(0, 6)}...`}
              </h3>
              <div className="wallet-address">{wallet.address}</div>
              <div className="wallet-balance">
                {wallet.balance !== undefined ? (
                  `${wallet.balance.toFixed(4)} SOL`
                ) : (
                  <span className="loading-data">Loading balance...</span>
                )}
              </div>
              <div className="wallet-transaction-label">Last Transaction:</div>
              <div className="wallet-transaction">
                {wallet.lastTransaction && wallet.lastTransaction !== "N/A" ? (
                  <a
                    href={`https://solscan.io/tx/${wallet.lastTransaction}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {wallet.lastTransaction}
                  </a>
                ) : (
                  "No transactions"
                )}
              </div>
              <button
                className="remove-btn"
                onClick={() => handleRemove(wallet.address)}
              >
                Remove Wallet
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
