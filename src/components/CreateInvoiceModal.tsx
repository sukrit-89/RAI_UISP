'use client';

import { useState } from 'react';
import { validateInvoiceData, handleError } from '@/lib/error-handler';
import { X, Calendar, User, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

interface CreateInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: { buyerName: string; amount: number; dueDate: Date }) => void;
}

export function CreateInvoiceModal({ isOpen, onClose, onSubmit }: CreateInvoiceModalProps) {
    const [buyerName, setBuyerName] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDays, setDueDays] = useState('30');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + parseInt(dueDays));

        const validation = validateInvoiceData({
            buyerName,
            amount: parseFloat(amount),
            dueDate,
        });

        if (!validation.valid && validation.error) {
            toast.error(validation.error.userMessage);
            return;
        }

        onSubmit({
            buyerName,
            amount: parseFloat(amount),
            dueDate,
        });

        // Reset form
        setBuyerName('');
        setAmount('');
        setDueDays('30');
        onClose();
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
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-gray-900">Create New Invoice</h2>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Buyer Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Buyer Name
                                </label>
                                <div className="relative">
                                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={buyerName}
                                        onChange={(e) => setBuyerName(e.target.value)}
                                        placeholder="e.g., Mumbai Hotel"
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Invoice Amount (₹)
                                </label>
                                <div className="relative">
                                    <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="100000"
                                        min="1000"
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Due Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Payment Due In
                                </label>
                                <div className="relative">
                                    <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <select
                                        value={dueDays}
                                        onChange={(e) => setDueDays(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent appearance-none bg-white"
                                    >
                                        <option value="15">15 days</option>
                                        <option value="30">30 days</option>
                                        <option value="45">45 days</option>
                                        <option value="60">60 days</option>
                                        <option value="90">90 days</option>
                                    </select>
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Preview</div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700">{buyerName || 'Buyer Name'}</span>
                                    <span className="text-xl font-bold text-gray-900">
                                        ₹{amount ? parseFloat(amount).toLocaleString('en-IN') : '0'}
                                    </span>
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                className="btn-primary w-full py-3 text-center justify-center"
                            >
                                Create Invoice
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
