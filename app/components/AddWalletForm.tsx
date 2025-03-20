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
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    setIsLoading(true);
    try {
      await axios.post("/api/add-wallet", {
        address,
        nickname: nickname || `Wallet ${address.slice(0, 6)}...`,
      });
      toast.success("Wallet added successfully");
      setAddress("");
      setNickname("");
      onWalletAdded(); // Trigger refresh
    } catch (error) {
      console.error("Error adding wallet:", error);
      toast.error("Failed to add wallet");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-container">
      <form className="wallet-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter wallet address"
          required
          disabled={isLoading}
        />
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Nickname (optional)"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Adding..." : "Add Wallet"}
        </button>
      </form>
    </div>
  );
}
