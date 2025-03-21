import fs from 'fs';
import path from 'path';

// Path to data directory and files
const DATA_DIR = path.join(process.cwd(), 'data');
const WALLETS_FILE = path.join(DATA_DIR, 'wallets.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create data directory:', error);
  }
}

// Initialize wallets file if it doesn't exist
if (!fs.existsSync(WALLETS_FILE)) {
  try {
    fs.writeFileSync(WALLETS_FILE, JSON.stringify([], null, 2));
  } catch (error) {
    console.error('Failed to create wallets file:', error);
  }
}

// Debug file operations
function debugFileOp(operation: string, path: string, error?: any) {
  console.log(`[DB] ${operation} ${path} - ${error ? 'ERROR: ' + error.message : 'SUCCESS'}`);
}

// Add this interface at the top
interface WalletEntry {
  address: string;
  nickname?: string;
}

// Update the wallets file structure
if (!fs.existsSync(WALLETS_FILE)) {
  try {
    fs.writeFileSync(WALLETS_FILE, JSON.stringify([], null, 2));
  } catch (error) {
    console.error('Failed to create wallets file:', error);
  }
}

// Update getWallets to return WalletEntry objects
export function getWallets(): WalletEntry[] {
  try {
    if (fs.existsSync(WALLETS_FILE)) {
      const data = fs.readFileSync(WALLETS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      
      // Support both old format (string[]) and new format (WalletEntry[])
      if (Array.isArray(parsed)) {
        if (parsed.length > 0 && typeof parsed[0] === 'string') {
          // Convert old format to new format
          const wallets = parsed.map(address => ({ address }));
          // Save in new format
          fs.writeFileSync(WALLETS_FILE, JSON.stringify(wallets, null, 2));
          return wallets;
        }
        return parsed;
      }
      return [];
    }
    return [];
  } catch (error) {
    console.error('Error reading wallets:', error);
    return [];
  }
}

// Update addWallet to support nicknames
export function addWallet(walletData: string | { address: string; nickname?: string }): void {
  try {
    // Get existing wallets
    const wallets = getWallets();
    
    // Handle different input formats
    let walletToAdd;
    if (typeof walletData === 'string') {
      // If just an address string was passed
      walletToAdd = {
        address: walletData,
        nickname: `Wallet ${walletData.slice(0, 4)}...${walletData.slice(-4)}`
      };
    } else {
      // If an object with address and nickname was passed
      walletToAdd = {
        address: walletData.address,
        nickname: walletData.nickname || `Wallet ${walletData.address.slice(0, 4)}...${walletData.address.slice(-4)}`
      };
    }
    
    // Add the wallet to the list if it doesn't exist
    if (!wallets.some(wallet => 
      typeof wallet === 'object' && 
      wallet.address === walletToAdd.address
    )) {
      wallets.push(walletToAdd);
      
      // Save the updated list
      const dataPath = path.join(process.cwd(), 'data');
      const filePath = path.join(dataPath, 'wallets.json');
      
      // Ensure the directory exists
      if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath, { recursive: true });
      }
      
      fs.writeFileSync(filePath, JSON.stringify(wallets, null, 2));
    }
  } catch (error) {
    console.error('Error adding wallet:', error);
  }
}

// Update removeWallet
export function removeWallet(address: string): WalletEntry[] {
  try {
    let wallets = getWallets();
    wallets = wallets.filter(wallet => wallet.address !== address);
    fs.writeFileSync(WALLETS_FILE, JSON.stringify(wallets, null, 2));
    return wallets;
  } catch (error) {
    console.error('Error removing wallet:', error);
    return getWallets();
  }
} 