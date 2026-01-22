'use client';

import type { MarketplaceListing } from '@/lib/types';
import { formatCurrency, getDaysUntilDue } from '@/lib/types';
import { Clock, TrendingUp, User, ShoppingCart, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

interface MarketplaceTabProps {
    listings: MarketplaceListing[];
    onBuy: (listing: MarketplaceListing) => void;
    currentWallet: string | null;
}

export function MarketplaceTab({ listings, onBuy, currentWallet }: MarketplaceTabProps) {
    // For demo, show all listings (including own) so you can test buying
    const availableListings = listings; // Allow buying own invoices for demo
    const myListings: MarketplaceListing[] = []; // Hide "your listings" section in demo

    if (listings.length === 0) {
        return (
            <div className="text-center py-16">
                <ShoppingCart size={48} className="mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No invoices listed yet</h3>
                <p className="text-gray-500">When verified invoices are listed for sale, they&apos;ll appear here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Available for purchase */}
            {availableListings.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <ShoppingCart size={20} className="text-teal-600" />
                        Available Invoices
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {availableListings.map((listing, index) => (
                            <motion.div
                                key={listing.invoiceId}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="card p-6 hover:shadow-lg transition-shadow"
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <span className="text-xs text-gray-500 font-medium">{listing.invoiceId}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <User size={14} className="text-gray-400" />
                                            <span className="font-semibold text-gray-900">{listing.invoice.buyerName}</span>
                                        </div>
                                    </div>
                                    <span className="status-badge status-listed">
                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                        For Sale
                                    </span>
                                </div>

                                {/* Value comparison */}
                                <div className="space-y-2 mb-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Face Value</span>
                                        <span className="text-gray-700">{formatCurrency(listing.invoice.amount)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500">Price</span>
                                        <span className="text-2xl font-bold text-teal-600">{formatCurrency(listing.price)}</span>
                                    </div>
                                </div>

                                {/* Yield badge */}
                                <div className="flex items-center justify-between bg-green-50 rounded-lg p-3 mb-4">
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={16} className="text-green-600" />
                                        <span className="text-sm text-green-700">Expected Yield</span>
                                    </div>
                                    <span className="font-bold text-green-700">{listing.yield.toFixed(1)}% APY</span>
                                </div>

                                {/* Due date */}
                                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                    <Clock size={14} />
                                    <span>Due in {getDaysUntilDue(listing.invoice.dueDate)} days</span>
                                </div>

                                {/* Buy button */}
                                <button
                                    onClick={() => onBuy(listing)}
                                    className="btn-primary w-full justify-center"
                                >
                                    <TrendingUp size={16} />
                                    Buy Invoice
                                </button>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* My listings */}
            {myListings.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <TrendingUp size={20} className="text-blue-600" />
                        Your Listed Invoices
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {myListings.map((listing) => (
                            <div key={listing.invoiceId} className="card p-6 border-2 border-blue-100">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <span className="text-xs text-gray-500 font-medium">{listing.invoiceId}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                            <User size={14} className="text-gray-400" />
                                            <span className="font-semibold text-gray-900">{listing.invoice.buyerName}</span>
                                        </div>
                                    </div>
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                                        YOUR LISTING
                                    </span>
                                </div>

                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm text-gray-500">Listed at</span>
                                    <span className="text-xl font-bold text-gray-900">{formatCurrency(listing.price)}</span>
                                </div>

                                <div className="text-sm text-gray-500">
                                    Waiting for buyers...
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
