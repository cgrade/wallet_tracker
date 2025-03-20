"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { Connection, PublicKey } from "@solana/web3.js";

interface Wallet {
  address: string;
  nickname?: string;
}

interface WalletData {
  address: string;
  nickname: string;
  balance: number;
  lastTransaction: string;
}

// Update the connection initialization to be more robust
const getConnection = () => {
  if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
    // Client-side with API key
    return new Connection(
      `https://rpc.helius.xyz/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
    );
  }
  // Fallback to public endpoint
  return new Connection("https://api.mainnet-beta.solana.com");
};

const connection = getConnection();

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

  const loadWallets = async () => {
    setLoading(true);
    try {
      const walletList = await fetchWallets();

      // Fetch additional data for each wallet
      const walletsWithData = await Promise.all(
        walletList.map(async (wallet: string | Wallet) => {
          let address: string;
          let nickname: string;

          if (typeof wallet === "string") {
            address = wallet;
            nickname = `Wallet ${address.slice(0, 6)}...`;
          } else {
            address = wallet.address;
            nickname = wallet.nickname || `Wallet ${address.slice(0, 6)}...`;
          }

          try {
            // Get balance
            const publicKey = new PublicKey(address);
            let balance = 0;

            try {
              balance = await connection.getBalance(publicKey);
            } catch (balanceError) {
              console.error(
                `Error fetching balance for ${address}:`,
                balanceError
              );
              // Just continue with 0 balance
            }

            // Get last transaction
            let lastTransaction = "No transactions";
            try {
              const signatures = await connection.getSignaturesForAddress(
                publicKey,
                { limit: 1 }
              );
              if (signatures.length > 0) {
                lastTransaction = signatures[0].signature;
              }
            } catch (txError) {
              console.error(
                `Error fetching transactions for ${address}:`,
                txError
              );
            }

            return {
              address,
              nickname,
              balance: balance / 1e9, // Convert lamports to SOL
              lastTransaction,
            };
          } catch (error) {
            console.error(`Error fetching data for wallet ${address}:`, error);
            return {
              address,
              nickname,
              balance: 0,
              lastTransaction: "Error fetching data",
            };
          }
        })
      );

      setWallets(walletsWithData);
    } catch (error) {
      console.error("Error loading wallets:", error);
      toast.error("Failed to load wallets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWallets();
  }, []);

  const handleRemove = async (address: string) => {
    try {
      await axios.post("/api/remove-wallet", { address });
      toast.success("Wallet removed successfully");
      setWallets(wallets.filter((w) => w.address !== address));
    } catch (error) {
      console.error("Error removing wallet:", error);
      toast.error("Failed to remove wallet");
    }
  };

  if (loading) {
    return <div className="loading">Loading wallets...</div>;
  }

  return (
    <div className="wallet-container">
      <h2>Your Wallets</h2>
      {wallets.length === 0 ? (
        <p className="no-wallets">No wallets tracked yet. Add one above!</p>
      ) : (
        <div className="wallet-grid">
          {wallets.map((wallet) => (
            <div key={wallet.address} className="wallet-card">
              <h3 className="wallet-nickname">{wallet.nickname}</h3>
              <div className="wallet-address">{wallet.address}</div>
              <div className="wallet-balance">
                {wallet.balance.toFixed(4)} SOL
              </div>
              <div className="wallet-transaction-label">Last Transaction:</div>
              <div className="wallet-transaction">
                <a
                  href={`https://solscan.io/tx/${wallet.lastTransaction}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {wallet.lastTransaction}
                </a>
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
