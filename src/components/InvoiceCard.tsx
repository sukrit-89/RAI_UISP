'use client';

import type { Invoice } from '@/lib/types';
import { formatCurrency, getDaysUntilDue } from '@/lib/types';
import { Clock, User, Copy, ArrowRight, Eye, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface InvoiceCardProps {
    invoice: Invoice;
    onSell?: (invoice: Invoice) => void;
    onViewListing?: (invoice: Invoice) => void;
    onTrackSettlement?: (invoice: Invoice) => void;
}

const statusConfig = {
    pending: {
        label: 'Pending',
        className: 'status-pending',
        dot: 'bg-red-500',
    },
    verified: {
        label: 'Verified',
        className: 'status-verified',
        dot: 'bg-green-500',
    },
    listed: {
        label: 'Listed',
        className: 'status-listed',
        dot: 'bg-blue-500',
    },
    sold: {
        label: 'Sold',
        className: 'status-sold',
        dot: 'bg-purple-500',
    },
    settled: {
        label: 'Settled',
        className: 'status-settled',
        dot: 'bg-gray-500',
    },
};

export function InvoiceCard({ invoice, onSell, onViewListing, onTrackSettlement }: InvoiceCardProps) {
    const [copied, setCopied] = useState(false);
    const daysUntilDue = getDaysUntilDue(invoice.dueDate);
    const status = statusConfig[invoice.status];

    const copyVerificationLink = () => {
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        const link = `${baseUrl}/verify/${invoice.id}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        toast.success('Verification link copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    const renderAction = () => {
        switch (invoice.status) {
            case 'pending':
                return (
                    <button
                        onClick={copyVerificationLink}
                        className="btn-secondary w-full flex items-center justify-center gap-2"
                    >
                        <Copy size={16} />
                        {copied ? 'Copied!' : 'Share Verification Link'}
                    </button>
                );
            case 'verified':
                return (
                    <button
                        onClick={() => onSell?.(invoice)}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        <TrendingUp size={16} />
                        Sell Invoice
                        <ArrowRight size={16} />
                    </button>
                );
            case 'listed':
                return (
                    <button
                        onClick={() => onViewListing?.(invoice)}
                        className="btn-secondary w-full flex items-center justify-center gap-2"
                    >
                        <Eye size={16} />
                        View Listing
                    </button>
                );
            case 'sold':
                return (
                    <button
                        onClick={() => onTrackSettlement?.(invoice)}
                        className="btn-secondary w-full flex items-center justify-center gap-2 text-purple-600 border-purple-200 hover:bg-purple-50"
                    >
                        <Clock size={16} />
                        Track Settlement
                    </button>
                );
            case 'settled':
                return (
                    <div className="text-center text-sm text-gray-500 py-2">
                        ✅ Payment completed
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className={`card p-6 ${invoice.status === 'sold' ? 'success-glow' : ''}`}>
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div>
                    <span className="text-xs text-gray-500 font-medium">{invoice.id}</span>
                    <div className="flex items-center gap-2 mt-1">
                        <User size={14} className="text-gray-400" />
                        <span className="font-semibold text-gray-900">{invoice.buyerName}</span>
                    </div>
                </div>
                <span className={`status-badge ${status.className}`}>
                    <span className={`w-2 h-2 rounded-full ${status.dot}`}></span>
                    {status.label}
                </span>
            </div>

            {/* Amount */}
            <div className="mb-4">
                <div className="text-3xl font-bold text-gray-900">
                    {formatCurrency(invoice.amount)}
                </div>
                {invoice.soldPrice && invoice.status === 'sold' && (
                    <div className="text-sm text-green-600 mt-1">
                        Sold for {formatCurrency(invoice.soldPrice)}
                    </div>
                )}
            </div>

            {/* Due date */}
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                <Clock size={14} />
                <span>
                    {daysUntilDue > 0
                        ? `Due in ${daysUntilDue} days`
                        : daysUntilDue === 0
                            ? 'Due today'
                            : `Overdue by ${Math.abs(daysUntilDue)} days`
                    }
                </span>
            </div>

            {/* Settlement note for sold invoices */}
            {invoice.status === 'sold' && (
                <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 mb-4 text-sm text-purple-700">
                    Settlement occurs automatically on due date to the current invoice holder.
                </div>
            )}

            {/* Action */}
            {renderAction()}
        </div>
    );
}
