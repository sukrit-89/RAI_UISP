'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { SOROBAN_CONFIG } from './contract-config';

// Dynamic import to handle Freighter API
let freighterApi: {
    isConnected: () => Promise<{ isConnected: boolean }>;
    requestAccess: () => Promise<{ address: string }>;
    signTransaction: (xdr: string, opts: { networkPassphrase: string }) => Promise<{ signedTxXdr: string }>;
} | null = null;

// Only load Freighter in browser
if (typeof window !== 'undefined') {
    import('@stellar/freighter-api').then((api) => {
        freighterApi = api;
    }).catch(() => {
        console.log('Freighter API not available');
    });
}

interface WalletContextType {
    isConnected: boolean;
    isConnecting: boolean;
    address: string | null;
    balance: number; // INR balance (converted from XLM)
    xlmBalance: number; // Real XLM balance from network
    isLoadingBalance: boolean;
    pendingCount: number;
    connect: () => Promise<void>;
    disconnect: () => void;
    updateBalance: (newBalance: number) => void;
    refreshBalance: () => Promise<void>;
    signTx: (xdr: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Demo balance for showcase (fallback)
const INITIAL_BALANCE = 8000; // ₹8,000 - low to show AI warning

// Fetch XLM balance from Stellar network using Horizon API
async function fetchXlmBalance(address: string): Promise<number> {
    try {
        const horizonUrl = SOROBAN_CONFIG.HORIZON_URL;
        const response = await fetch(`${horizonUrl}/accounts/${address}`);
        
        if (!response.ok) {
            // Account doesn't exist or has no balance
            if (response.status === 404) {
                return 0;
            }
            throw new Error(`Failed to fetch account: ${response.statusText}`);
        }
        
        const account = await response.json();
        
        // Find XLM balance (native asset)
        const xlmBalance = account.balances?.find(
            (balance: any) => balance.asset_type === 'native'
        );
        
        if (xlmBalance && xlmBalance.balance) {
            return parseFloat(xlmBalance.balance);
        }
        return 0;
    } catch (error) {
        console.error('Failed to fetch XLM balance:', error);
        // If account doesn't exist or has no balance, return 0
        return 0;
    }
}

export function WalletProvider({ children }: { children: ReactNode }) {
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [address, setAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState(INITIAL_BALANCE);
    const [xlmBalance, setXlmBalance] = useState(0);
    const [isLoadingBalance, setIsLoadingBalance] = useState(false);
    const [pendingCount] = useState(0);

    // Fetch real XLM balance from network
    const fetchBalance = useCallback(async (walletAddress: string) => {
        setIsLoadingBalance(true);
        try {
            const xlm = await fetchXlmBalance(walletAddress);
            setXlmBalance(xlm);
            
            // Convert XLM to INR for display (approximate rate: 1 XLM ≈ ₹16)
            // You can update this rate or fetch from an API
            const XLM_TO_INR_RATE = 16;
            const inrBalance = xlm * XLM_TO_INR_RATE;
            setBalance(inrBalance);
            
            // Save to localStorage for offline access
            localStorage.setItem(`xlm_balance_${walletAddress}`, xlm.toString());
            localStorage.setItem(`balance_${walletAddress}`, inrBalance.toString());
        } catch (error) {
            console.error('Failed to fetch balance:', error);
            // Fallback to localStorage if available
            const savedXlm = localStorage.getItem(`xlm_balance_${walletAddress}`);
            if (savedXlm) {
                const xlm = parseFloat(savedXlm);
                setXlmBalance(xlm);
                setBalance(xlm * 16); // Approximate conversion
            }
        } finally {
            setIsLoadingBalance(false);
        }
    }, []);

    // Check if already connected on mount
    useEffect(() => {
        const checkConnection = async () => {
            // Wait for Freighter API to load
            await new Promise(resolve => setTimeout(resolve, 500));

            try {
                if (freighterApi) {
                    const result = await freighterApi.isConnected();
                    if (result.isConnected) {
                        // Try to get address via requestAccess
                        const accessResult = await freighterApi.requestAccess();
                        if (accessResult.address) {
                            setAddress(accessResult.address);
                            setConnected(true);
                            // Fetch real balance
                            await fetchBalance(accessResult.address);
                        }
                    }
                }
            } catch {
                console.log('Freighter not available or user denied access');
            }
        };
        checkConnection();
    }, [fetchBalance]);

    // Refresh balance periodically when connected
    useEffect(() => {
        if (!connected || !address) return;

        // Fetch balance immediately
        fetchBalance(address);

        // Refresh balance every 30 seconds
        const interval = setInterval(() => {
            fetchBalance(address);
        }, 30000);

        return () => clearInterval(interval);
    }, [connected, address, fetchBalance]);

    const connect = useCallback(async () => {
        setConnecting(true);
        try {
            if (freighterApi) {
                const connectionResult = await freighterApi.isConnected();

                if (!connectionResult.isConnected) {
                    throw new Error('Please install Freighter wallet extension');
                }

                const accessResult = await freighterApi.requestAccess();

                if (accessResult.address) {
                    setAddress(accessResult.address);
                    setConnected(true);
                    
                    // Fetch real balance from network
                    await fetchBalance(accessResult.address);
                }
            } else {
                throw new Error('Freighter API not loaded');
            }
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            // For demo purposes, simulate connection if Freighter not available
            const demoAddress = 'GDEMO' + Math.random().toString(36).substring(2, 15).toUpperCase() + 'STELLAR';
            setAddress(demoAddress);
            setConnected(true);
            // Use demo balance for fallback
            setXlmBalance(0);
            setBalance(INITIAL_BALANCE);
            localStorage.setItem(`balance_${demoAddress}`, INITIAL_BALANCE.toString());
        } finally {
            setConnecting(false);
        }
    }, [fetchBalance]);

    const disconnect = useCallback(() => {
        setConnected(false);
        setAddress(null);
        setBalance(INITIAL_BALANCE);
        setXlmBalance(0);
    }, []);

    const updateBalance = useCallback((newBalance: number) => {
        setBalance(newBalance);
        if (address) {
            localStorage.setItem(`balance_${address}`, newBalance.toString());
            // Also update XLM balance (reverse conversion)
            const XLM_TO_INR_RATE = 16;
            const xlm = newBalance / XLM_TO_INR_RATE;
            setXlmBalance(xlm);
            localStorage.setItem(`xlm_balance_${address}`, xlm.toString());
        }
    }, [address]);

    // Refresh balance manually
    const refreshBalance = useCallback(async () => {
        if (address) {
            await fetchBalance(address);
        }
    }, [address, fetchBalance]);

    const signTx = useCallback(async (xdr: string): Promise<string> => {
        try {
            if (!freighterApi) throw new Error('Freighter not available');
            const result = await freighterApi.signTransaction(xdr, {
                networkPassphrase: 'Test SDF Network ; September 2015',
            });
            return result.signedTxXdr || '';
        } catch (error) {
            console.error('Failed to sign transaction:', error);
            throw error;
        }
    }, []);

    return (
        <WalletContext.Provider
            value={{
                isConnected: connected,
                isConnecting: connecting,
                address,
                balance,
                xlmBalance,
                isLoadingBalance,
                pendingCount,
                connect,
                disconnect,
                updateBalance,
                refreshBalance,
                signTx,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet() {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
}
