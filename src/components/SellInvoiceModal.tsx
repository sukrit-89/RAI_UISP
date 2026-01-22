'use client';

import type { Invoice } from '@/lib/types';
import { formatCurrency, getDaysUntilDue } from '@/lib/types';
import { getSuggestedPrice } from '@/lib/ai-rules';
import { X, TrendingUp, Clock, User, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

interface SellInvoiceModalProps {
    isOpen: boolean;
    invoice: Invoice | null;
    onClose: () => void;
    onList: (invoiceId: string, price: number) => void;
}

export function SellInvoiceModal({ isOpen, invoice, onClose, onList }: SellInvoiceModalProps) {
    const [customPrice, setCustomPrice] = useState<number | null>(null);

    const suggestion = invoice ? getSuggestedPrice(invoice) : null;
    const price = customPrice ?? suggestion?.price ?? 0;
    const discount = invoice ? ((invoice.amount - price) / invoice.amount) * 100 : 0;
    const daysUntilDue = invoice ? getDaysUntilDue(invoice.dueDate) : 0;
    const annualizedYield = daysUntilDue > 0 ? (discount / daysUntilDue) * 365 : 0;

    // Reset custom price when modal opens with new invoice
    useEffect(() => {
        if (isOpen && invoice) {
            setCustomPrice(null);
        }
    }, [isOpen, invoice?.id]);

    const handleList = () => {
        if (!invoice) return;
        onList(invoice.id, price);
        onClose();
    };

    if (!invoice || !suggestion) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="modal-overlay" onClick={onClose}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="modal-content max-w-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Sell Invoice</h2>
                                <p className="text-sm text-gray-500">List on marketplace for instant cash</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Invoice Summary */}
                        <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">Invoice Summary</div>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <User size={16} />
                                        <span>Buyer</span>
                                    </div>
                                    <span className="font-semibold text-gray-900">{invoice.buyerName}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <TrendingUp size={16} />
                                        <span>Face Value</span>
                                    </div>
                                    <span className="font-semibold text-gray-900">{formatCurrency(invoice.amount)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Clock size={16} />
                                        <span>Due In</span>
                                    </div>
                                    <span className="font-semibold text-gray-900">{daysUntilDue} days</span>
                                </div>
                            </div>
                        </div>

                        {/* AI Pricing Suggestion */}
                        <div className="ai-suggestion mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles size={18} className="text-amber-600" />
                                <span className="font-semibold text-amber-800">AI-Suggested Pricing</span>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-gray-900">
                                        {formatCurrency(suggestion.price)}
                                    </div>
                                    <div className="text-xs text-gray-600">Ask Price</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-red-600">
                                        {suggestion.discount.toFixed(1)}%
                                    </div>
                                    <div className="text-xs text-gray-600">Discount</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        {suggestion.yield.toFixed(1)}%
                                    </div>
                                    <div className="text-xs text-gray-600">Annual Yield</div>
                                </div>
                            </div>
                        </div>

                        {/* Custom Price Input */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Or set custom price
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                                <input
                                    type="number"
                                    value={customPrice ?? ''}
                                    onChange={(e) => setCustomPrice(e.target.value ? parseFloat(e.target.value) : null)}
                                    placeholder={suggestion.price.toString()}
                                    className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                />
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-2">
                                <span>Your discount: {discount.toFixed(1)}%</span>
                                <span>Buyer yield: {annualizedYield.toFixed(1)}% annually</span>
                            </div>
                        </div>

                        {/* What happens next */}
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
                            <div className="text-sm text-blue-800">
                                <strong>What happens next?</strong>
                                <ul className="mt-2 space-y-1 text-blue-700">
                                    <li>• Invoice NFT transfers to marketplace escrow</li>
                                    <li>• Investors can browse and buy your invoice</li>
                                    <li>• You receive {formatCurrency(price)} instantly on sale</li>
                                </ul>
                            </div>
                        </div>

                        {/* CTA */}
                        <button
                            onClick={handleList}
                            className="btn-primary w-full py-4 text-lg justify-center"
                        >
                            <TrendingUp size={20} />
                            List on Marketplace
                            <ArrowRight size={20} />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
