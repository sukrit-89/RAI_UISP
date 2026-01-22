'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useWallet } from '@/lib/wallet-context';
import type { Invoice } from '@/lib/types';
import { formatCurrency, getDaysUntilDue } from '@/lib/types';
import { CheckCircle, Clock, User, FileText, ArrowLeft, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'receivai_invoices';

export default function VerifyInvoicePage() {
    const params = useParams();
    const router = useRouter();
    const invoiceId = params.invoice as string;

    const { isConnected, connect, address } = useWallet();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isVerified, setIsVerified] = useState(false);

    // Find the invoice in localStorage (we check all wallets since buyer might be different)
    useEffect(() => {
        const findInvoice = () => {
            // Search through all stored invoices
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(STORAGE_KEY)) {
                    try {
                        const invoices = JSON.parse(localStorage.getItem(key) || '[]');
                        const found = invoices.find((inv: Invoice) => inv.id === invoiceId);
                        if (found) {
                            setInvoice({
                                ...found,
                                dueDate: new Date(found.dueDate),
                                createdAt: new Date(found.createdAt),
                            });
                            setIsVerified(found.status === 'verified' || found.status === 'listed' || found.status === 'sold');
                            break;
                        }
                    } catch (e) {
                        console.error('Error parsing invoices:', e);
                    }
                }
            }
            setIsLoading(false);
        };

        findInvoice();
    }, [invoiceId]);

    const handleVerify = async () => {
        if (!invoice) return;

        setIsVerifying(true);

        // Simulate blockchain transaction
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Update the invoice in localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(STORAGE_KEY)) {
                try {
                    const invoices = JSON.parse(localStorage.getItem(key) || '[]');
                    const updatedInvoices = invoices.map((inv: Invoice) => {
                        if (inv.id === invoiceId) {
                            return { ...inv, status: 'verified', verifiedAt: new Date().toISOString() };
                        }
                        return inv;
                    });
                    localStorage.setItem(key, JSON.stringify(updatedInvoices));
                } catch (e) {
                    console.error('Error updating invoice:', e);
                }
            }
        }

        setIsVerified(true);
        setIsVerifying(false);
        toast.success('Invoice verified successfully!');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!invoice) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto px-6">
                    <FileText size={64} className="mx-auto mb-6 text-gray-300" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Invoice Not Found</h1>
                    <p className="text-gray-600 mb-6">
                        The invoice you&apos;re looking for doesn&apos;t exist or has been removed.
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        className="btn-primary"
                    >
                        <ArrowLeft size={18} />
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const daysUntilDue = getDaysUntilDue(invoice.dueDate);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-2xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center">
                            <span className="text-white font-bold text-lg">R</span>
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900">ReceivAI</h1>
                            <p className="text-xs text-gray-500">Invoice Verification</p>
                        </div>
                    </div>

                    {!isConnected && (
                        <button onClick={connect} className="btn-secondary flex items-center gap-2">
                            <Wallet size={16} />
                            Connect Wallet
                        </button>
                    )}
                </div>
            </header>

            {/* Main content */}
            <main className="max-w-2xl mx-auto px-6 py-12">
                {isVerified ? (
                    // Success state
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', delay: 0.2 }}
                            className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center"
                        >
                            <CheckCircle size={48} className="text-green-600" />
                        </motion.div>
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Invoice Verified!</h2>
                        <p className="text-gray-600 text-lg mb-8">
                            The invoice is now active and can be traded on the marketplace.
                        </p>
                        <div className="card p-6 text-left mb-8">
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Invoice ID</span>
                                    <span className="font-medium">{invoice.id}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Amount</span>
                                    <span className="font-bold text-xl">{formatCurrency(invoice.amount)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Status</span>
                                    <span className="status-badge status-verified">
                                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                        Verified
                                    </span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => router.push('/')}
                            className="btn-secondary"
                        >
                            <ArrowLeft size={18} />
                            Back to Dashboard
                        </button>
                    </motion.div>
                ) : (
                    // Verification form
                    <>
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">Verify Invoice</h2>
                            <p className="text-gray-600 text-lg">
                                Please confirm that you received the goods/services and the invoice details are correct.
                            </p>
                        </div>

                        <div className="card p-8 mb-8">
                            {/* Invoice details */}
                            <div className="space-y-4 mb-8">
                                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <FileText size={20} className="text-gray-400" />
                                        <span className="text-gray-600">Invoice ID</span>
                                    </div>
                                    <span className="font-semibold text-gray-900">{invoice.id}</span>
                                </div>

                                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <User size={20} className="text-gray-400" />
                                        <span className="text-gray-600">Seller</span>
                                    </div>
                                    <span className="font-semibold text-gray-900">
                                        {invoice.sellerAddress?.slice(0, 8)}...{invoice.sellerAddress?.slice(-4)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <Clock size={20} className="text-gray-400" />
                                        <span className="text-gray-600">Due Date</span>
                                    </div>
                                    <span className="font-semibold text-gray-900">
                                        {daysUntilDue} days from now
                                    </span>
                                </div>

                                <div className="flex items-center justify-between py-4">
                                    <span className="text-lg text-gray-600">Amount to Pay</span>
                                    <span className="text-3xl font-bold text-gray-900">
                                        {formatCurrency(invoice.amount)}
                                    </span>
                                </div>
                            </div>

                            {/* Confirmation checkbox */}
                            <div className="bg-gray-50 rounded-xl p-4 mb-6">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        defaultChecked
                                        className="mt-1 w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                                    />
                                    <span className="text-gray-700">
                                        I confirm that I received the goods/services described in this invoice and
                                        agree to pay {formatCurrency(invoice.amount)} by the due date.
                                    </span>
                                </label>
                            </div>

                            {/* Verify button */}
                            <button
                                onClick={handleVerify}
                                disabled={isVerifying}
                                className="btn-primary w-full py-4 text-lg justify-center"
                            >
                                {isVerifying ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={20} />
                                        Verify & Sign
                                    </>
                                )}
                            </button>
                        </div>

                        <p className="text-center text-sm text-gray-500">
                            By verifying, you confirm the legitimacy of this invoice.
                            This action will be recorded on the Stellar blockchain.
                        </p>
                    </>
                )}
            </main>
        </div>
    );
}
