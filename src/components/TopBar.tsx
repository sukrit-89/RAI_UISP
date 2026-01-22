'use client';

import { useWallet } from '@/lib/wallet-context';
import { formatCurrency, formatAddress } from '@/lib/types';
import { Wallet, LogOut, Bell, ChevronDown, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';

interface TopBarProps {
    pendingCount?: number;
}

export function TopBar({ pendingCount = 0 }: TopBarProps) {
    const { isConnected, isConnecting, address, balance, xlmBalance, isLoadingBalance, connect, disconnect, refreshBalance } = useWallet();
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
        <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 px-8 py-5 shadow-sm sticky top-0 z-40">
            <div className="flex items-center justify-between">
                {/* Left side - Page title area */}
                <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                        Dashboard
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Manage your invoices and cash flow</p>
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
                            <div className="text-right px-4 py-3 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-xl border border-teal-100 relative group">
                                <button
                                    onClick={refreshBalance}
                                    disabled={isLoadingBalance}
                                    className="absolute top-2 right-2 p-1 rounded-lg hover:bg-teal-100 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Refresh balance"
                                >
                                    <RefreshCw size={14} className={`text-teal-600 ${isLoadingBalance ? 'animate-spin' : ''}`} />
                                </button>
                                <div className="text-xs text-teal-600 uppercase tracking-wide font-semibold mb-1">Balance</div>
                                {isLoadingBalance ? (
                                    <div className="text-lg text-teal-600 font-semibold">Loading...</div>
                                ) : (
                                    <>
                                        <div
                                            className={`text-2xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent transition-all duration-300 ${
                                                animateBalance ? 'balance-animate scale-110' : ''
                                            }`}
                                        >
                                            {formatCurrency(balance)}
                                        </div>
                                        <div className="text-xs text-teal-500 mt-1 font-medium">
                                            {xlmBalance.toFixed(2)} XLM
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Wallet info */}
                            <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:border-teal-300 transition-all duration-200 hover:shadow-md cursor-pointer group">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 via-teal-500 to-teal-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                    <Wallet size={18} className="text-white" />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-gray-900">
                                        {formatAddress(address)}
                                    </div>
                                    <div className="text-xs text-gray-500 font-medium">Testnet</div>
                                </div>
                                <ChevronDown size={16} className="text-gray-400 group-hover:text-teal-600 transition-colors" />
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
