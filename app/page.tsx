// app/page.tsx
import AddWalletForm from "./components/AddWalletForm";
import WalletCard, { fetchWallets } from "./components/WalletCard";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function Home() {
  return (
    <div className="container">
      <h1>Solana Wallet Tracker</h1>
      <AddWalletForm onWalletAdded={fetchWallets} />
      <WalletCard />
      <ToastContainer position="bottom-right" theme="dark" />
    </div>
  );
}
