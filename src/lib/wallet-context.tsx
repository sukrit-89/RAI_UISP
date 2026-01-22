'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

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
    balance: number;
    xlmBalance: number;
    pendingCount: number;
    connect: () => Promise<void>;
    disconnect: () => void;
    updateBalance: (newBalance: number) => void;
    signTx: (xdr: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Demo balance for showcase
const INITIAL_BALANCE = 8000; // ₹8,000 - low to show AI warning

export function WalletProvider({ children }: { children: ReactNode }) {
    const [connected, setConnected] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [address, setAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState(INITIAL_BALANCE);
    const [xlmBalance, setXlmBalance] = useState(500);
    const [pendingCount] = useState(0);

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
                        }
                    }
                }
            } catch {
                console.log('Freighter not available or user denied access');
            }
        };
        checkConnection();
    }, []);

    // Load balance from localStorage
    useEffect(() => {
        if (connected && address) {
            const savedBalance = localStorage.getItem(`balance_${address}`);
            if (savedBalance) {
                setBalance(parseFloat(savedBalance));
            }
        }
    }, [connected, address]);

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

                    // Load saved balance or use initial
                    const savedBalance = localStorage.getItem(`balance_${accessResult.address}`);
                    if (savedBalance) {
                        setBalance(parseFloat(savedBalance));
                    } else {
                        setBalance(INITIAL_BALANCE);
                        localStorage.setItem(`balance_${accessResult.address}`, INITIAL_BALANCE.toString());
                    }
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
            setBalance(INITIAL_BALANCE);
            localStorage.setItem(`balance_${demoAddress}`, INITIAL_BALANCE.toString());
        } finally {
            setConnecting(false);
        }
    }, []);

    const disconnect = useCallback(() => {
        setConnected(false);
        setAddress(null);
        setBalance(INITIAL_BALANCE);
    }, []);

    const updateBalance = useCallback((newBalance: number) => {
        setBalance(newBalance);
        if (address) {
            localStorage.setItem(`balance_${address}`, newBalance.toString());
        }
    }, [address]);

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
                pendingCount,
                connect,
                disconnect,
                updateBalance,
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
