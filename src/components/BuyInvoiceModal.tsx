'use client';

import type { MarketplaceListing } from '@/lib/types';
import { formatCurrency, getDaysUntilDue } from '@/lib/types';
import { X, Sparkles, Clock, User, ArrowRight, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useState } from 'react';
import { useWallet } from '@/lib/wallet-context';

interface BuyInvoiceModalProps {
    isOpen: boolean;
    listing: MarketplaceListing | null;
    onClose: () => void;
    onConfirm: (listing: MarketplaceListing) => void;
}

export function BuyInvoiceModal({ isOpen, listing, onClose, onConfirm }: BuyInvoiceModalProps) {
    const { balance } = useWallet();
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [isComplete, setIsComplete] = useState(false);

    if (!listing) return null;

    const daysUntilDue = getDaysUntilDue(listing.invoice.dueDate);
    const profit = listing.invoice.amount - listing.price;
    const hasEnoughBalance = balance >= listing.price;

    const handlePurchase = async () => {
        setIsPurchasing(true);

        // Simulate transaction delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Show success state
        setIsComplete(true);

        // Trigger confetti
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#0d9488', '#10b981', '#3b82f6', '#8b5cf6'],
        });

        // Call the confirm handler
        onConfirm(listing);

        // Close after animation
        setTimeout(() => {
            setIsComplete(false);
            setIsPurchasing(false);
            onClose();
        }, 2000);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="modal-overlay" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="modal-content max-w-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {isComplete ? (
                            // Success state
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-8"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', delay: 0.2 }}
                                    className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center"
                                >
                                    <CheckCircle size={40} className="text-green-600" />
                                </motion.div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Invoice Purchased!</h2>
                                <p className="text-gray-600">
                                    You now own this invoice. Settlement will occur automatically on the due date.
                                </p>
                            </motion.div>
                        ) : (
                            <>
                                {/* Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900">Buy Invoice</h2>
                                        <p className="text-sm text-gray-500">Confirm your purchase</p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* Invoice details */}
                                <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-600">Invoice ID</span>
                                            <span className="font-medium text-gray-900">{listing.invoiceId}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <User size={14} />
                                                <span>Buyer (Debtor)</span>
                                            </div>
                                            <span className="font-medium text-gray-900">{listing.invoice.buyerName}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Clock size={14} />
                                                <span>Due Date</span>
                                            </div>
                                            <span className="font-medium text-gray-900">{daysUntilDue} days</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Financial summary */}
                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">You Pay Now</span>
                                        <span className="text-2xl font-bold text-gray-900">{formatCurrency(listing.price)}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">You Receive on Due Date</span>
                                        <span className="text-xl font-semibold text-green-600">{formatCurrency(listing.invoice.amount)}</span>
                                    </div>
                                    <div className="border-t pt-3 flex justify-between items-center">
                                        <span className="text-gray-700 font-medium">Your Profit</span>
                                        <span className="text-xl font-bold text-teal-600">+{formatCurrency(profit)}</span>
                                    </div>
                                </div>

                                {/* Yield highlight */}
                                <div className="bg-green-50 border border-green-100 rounded-lg p-4 mb-6 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={18} className="text-green-600" />
                                        <span className="text-green-700 font-medium">Annual Yield</span>
                                    </div>
                                    <span className="text-2xl font-bold text-green-700">{listing.yield.toFixed(1)}%</span>
                                </div>

                                {/* Balance check */}
                                {!hasEnoughBalance && (
                                    <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-6 text-red-700 text-sm">
                                        Insufficient balance. You need {formatCurrency(listing.price)} but have {formatCurrency(balance)}.
                                    </div>
                                )}

                                {/* CTA */}
                                <button
                                    onClick={handlePurchase}
                                    disabled={isPurchasing || !hasEnoughBalance}
                                    className="btn-primary w-full py-4 text-lg justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isPurchasing ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            Confirm Purchase
                                            <ArrowRight size={20} />
                                        </>
                                    )}
                                </button>

                                <p className="text-xs text-gray-500 text-center mt-4">
                                    By purchasing, you agree to receive the face value on the due date.
                                </p>
                            </>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
