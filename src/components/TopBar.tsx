'use client';

import { useWallet } from '@/lib/wallet-context';
import { formatCurrency, formatAddress } from '@/lib/types';
import { Wallet, LogOut, Bell, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';

interface TopBarProps {
    pendingCount?: number;
}

export function TopBar({ pendingCount = 0 }: TopBarProps) {
    const { isConnected, isConnecting, address, balance, connect, disconnect } = useWallet();
    const [animateBalance, setAnimateBalance] = useState(false);
    const [prevBalance, setPrevBalance] = useState(balance);

    // Animate when balance changes
    useEffect(() => {
        if (balance !== prevBalance) {
            setAnimateBalance(true);
            const timer = setTimeout(() => setAnimateBalance(false), 1000);
            setPrevBalance(balance);
            return () => clearTimeout(timer);
        }
    }, [balance, prevBalance]);

    return (
        <header className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
                {/* Left side - Page title area */}
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
                    <p className="text-sm text-gray-500">Manage your invoices and cash flow</p>
                </div>

                {/* Right side - Wallet and notifications */}
                <div className="flex items-center gap-4">
                    {/* Pending invoices badge */}
                    {pendingCount > 0 && (
                        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
                            <Bell size={20} className="text-gray-600" />
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                                {pendingCount}
                            </span>
                        </button>
                    )}

                    {isConnected && address ? (
                        <div className="flex items-center gap-4">
                            {/* Balance display */}
                            <div className="text-right">
                                <div className="text-xs text-gray-500 uppercase tracking-wide">Balance</div>
                                <div
                                    className={`text-xl font-bold text-gray-900 ${animateBalance ? 'balance-animate text-green-600' : ''}`}
                                >
                                    {formatCurrency(balance)}
                                </div>
                            </div>

                            {/* Wallet info */}
                            <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                                    <Wallet size={16} className="text-white" />
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-gray-900">
                                        {formatAddress(address)}
                                    </div>
                                    <div className="text-xs text-gray-500">Testnet</div>
                                </div>
                                <ChevronDown size={16} className="text-gray-400" />
                            </div>

                            {/* Disconnect button */}
                            <button
                                onClick={disconnect}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-red-500"
                                title="Disconnect wallet"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={connect}
                            disabled={isConnecting}
                            className="btn-primary"
                        >
                            <Wallet size={18} />
                            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
