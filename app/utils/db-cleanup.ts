import { getWallets, removeWallet, addWallet } from './db';
import fs from 'fs';
import path from 'path';

/**
 * Clean up the wallet database by fixing malformed wallet entries and removing duplicates
 */
export function cleanupWalletDatabase() {
  try {
    // Get all wallets
    const wallets = getWallets();
    console.log(`Found ${wallets.length} wallets to check`);
    
    // Track which wallets need fixing
    const walletsToFix: any[] = [];
    
    // Track duplicates
    const seenAddresses = new Map<string, any>();
    const duplicates: any[] = [];
    
    // Check each wallet for issues
    wallets.forEach((wallet, index) => {
      if (typeof wallet !== 'object') {
        console.log(`Wallet ${index} is not an object:`, wallet);
        return;
      }
      
      // Check for malformed address
      if (typeof wallet.address !== 'string') {
        console.log(`Wallet ${index} has non-string address:`, wallet);
        
        // Try to extract a valid address
        let validAddress = '';
        if (wallet.address && typeof wallet.address === 'object' && 'address' in wallet.address) {
          validAddress = wallet.address.address;
        }
        
        if (validAddress) {
          walletsToFix.push({
            original: wallet,
            fixed: {
              address: validAddress,
              nickname: wallet.nickname || `Fixed Wallet ${index}`
            }
          });
        } else {
          // If we can't fix it, mark for removal
          walletsToFix.push({
            original: wallet,
            remove: true
          });
        }
      }
      
      // Check for duplicates
      const normalizedAddress = typeof wallet.address === 'string' 
        ? wallet.address 
        : (wallet.address?.address || '');
      
      if (normalizedAddress) {
        if (seenAddresses.has(normalizedAddress)) {
          // This is a duplicate
          console.log(`Wallet ${index} is a duplicate of address ${normalizedAddress}`);
          duplicates.push(wallet);
        } else {
          // First time seeing this address
          seenAddresses.set(normalizedAddress, wallet);
        }
      }
    });
    
    // Fix the problematic wallets
    let changes = false;
    
    if (walletsToFix.length > 0) {
      console.log(`Found ${walletsToFix.length} wallets with formatting issues`);
      
      // Process each wallet that needs fixing
      walletsToFix.forEach(item => {
        // Remove the original problematic entry
        try {
          const addressToRemove = item.original.address?.toString() || JSON.stringify(item.original);
          removeWallet(addressToRemove);
          console.log(`Removed problematic wallet: ${addressToRemove}`);
          
          // If we have fixed data, add it back
          if (!item.remove && item.fixed) {
            addWallet(item.fixed);
            console.log(`Added fixed wallet: ${item.fixed.address}`);
          }
          changes = true;
        } catch (err) {
          console.error(`Error fixing wallet:`, err);
        }
      });
    }
    
    // Remove duplicates
    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} duplicate wallet entries`);
      
      duplicates.forEach(duplicate => {
        try {
          const addressToRemove = duplicate.address?.toString() || JSON.stringify(duplicate);
          removeWallet(addressToRemove);
          console.log(`Removed duplicate wallet: ${addressToRemove}`);
          changes = true;
        } catch (err) {
          console.error(`Error removing duplicate:`, err);
        }
      });
    }
    
    if (changes) {
      console.log(`Database cleanup completed with changes`);
      return {
        fixed: walletsToFix.length,
        duplicates: duplicates.length
      };
    } else {
      console.log(`No wallet issues found`);
      return false;
    }
  } catch (error) {
    console.error(`Error during database cleanup:`, error);
    return false;
  }
}

/**
 * Specifically deduplicate wallet entries
 */
export function deduplicateWallets() {
  try {
    // Get all wallets
    const wallets = getWallets();
    console.log(`Found ${wallets.length} wallets to check for duplicates`);
    
    // Track unique addresses
    const uniqueAddresses = new Set<string>();
    const uniqueWallets: any[] = [];
    const duplicates: any[] = [];
    
    // First pass: collect all unique addresses
    wallets.forEach(wallet => {
      const normalizedAddress = typeof wallet.address === 'string'
        ? wallet.address
        : (wallet.address?.address || String(wallet.address));
      
      if (normalizedAddress) {
        if (uniqueAddresses.has(normalizedAddress)) {
          // This is a duplicate
          duplicates.push({
            wallet,
            addressToRemove: normalizedAddress
          });
        } else {
          // First time seeing this address
          uniqueAddresses.add(normalizedAddress);
          uniqueWallets.push(wallet);
        }
      }
    });
    
    // Remove duplicates one by one
    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} duplicate wallet entries`);
      
      // Clear out the old wallets file and write only unique wallets
      const dataPath = path.join(process.cwd(), 'data');
      const filePath = path.join(dataPath, 'wallets.json');
      
      // Ensure the directory exists
      if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath, { recursive: true });
      }
      
      // Write only the unique wallets back
      fs.writeFileSync(filePath, JSON.stringify(uniqueWallets, null, 2));
      
      console.log(`Removed ${duplicates.length} duplicates by rewriting database with ${uniqueWallets.length} unique wallets`);
      return duplicates.length;
    } else {
      console.log(`No duplicate wallets found`);
      return 0;
    }
  } catch (error) {
    console.error(`Error during deduplication:`, error);
    return -1;
  }
} 