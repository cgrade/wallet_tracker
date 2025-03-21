// app/components/AddWalletForm.tsx
"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

interface AddWalletFormProps {
  onWalletAdded: () => void; // Callback to refresh wallet list
}

export default function AddWalletForm({ onWalletAdded }: AddWalletFormProps) {
  const [address, setAddress] = useState("");
  const [nickname, setNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!address) {
      toast.error("Please enter a wallet address");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log(
        `Submitting wallet: address=${address}, nickname=${nickname}`
      );

      const response = await axios.post("/api/add-wallet", {
        address,
        nickname: nickname.trim() || `Wallet ${address.slice(0, 6)}...`,
      });

      if (response.data.success) {
        toast.success("Wallet added successfully");
        setAddress("");
        setNickname("");
        onWalletAdded();
      } else {
        toast.error(response.data.error || "Failed to add wallet");
      }
    } catch (error) {
      console.error("Error adding wallet:", error);
      toast.error("Failed to add wallet");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-wallet-container">
      <h2>Add Wallet to Track</h2>
      <form onSubmit={handleSubmit} className="add-wallet-form">
        <div className="form-group">
          <label htmlFor="address">Solana Wallet Address</label>
          <input
            id="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter Solana wallet address"
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="nickname">Nickname (optional)</label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter a nickname for this wallet"
            disabled={isSubmitting}
          />
        </div>

        <button type="submit" className="add-btn" disabled={isSubmitting}>
          {isSubmitting ? "Adding..." : "Add Wallet"}
        </button>
      </form>
    </div>
  );
}
