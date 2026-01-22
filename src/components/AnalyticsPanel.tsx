'use client';

import type { Invoice } from '@/lib/types';
import { formatCurrency, getDaysUntilDue } from '@/lib/types';
import { TrendingUp, TrendingDown, DollarSign, Clock, FileText } from 'lucide-react';
import { useMemo } from 'react';

interface AnalyticsPanelProps {
    invoices: Invoice[];
}

export function AnalyticsPanel({ invoices }: AnalyticsPanelProps) {
    const analytics = useMemo(() => {
        const totalInvoices = invoices.length;
        const totalValue = invoices.reduce((sum, inv) => sum + inv.amount, 0);
        
        const pendingInvoices = invoices.filter(inv => inv.status === 'pending');
        const pendingValue = pendingInvoices.reduce((sum, inv) => sum + inv.amount, 0);
        
        const verifiedInvoices = invoices.filter(inv => inv.status === 'verified');
        const verifiedValue = verifiedInvoices.reduce((sum, inv) => sum + inv.amount, 0);
        
        const listedInvoices = invoices.filter(inv => inv.status === 'listed');
        const listedValue = listedInvoices.reduce((sum, inv) => sum + (inv.listingPrice || 0), 0);
        
        const soldInvoices = invoices.filter(inv => inv.status === 'sold');
        const soldValue = soldInvoices.reduce((sum, inv) => sum + (inv.soldPrice || 0), 0);
        
        const settledInvoices = invoices.filter(inv => inv.status === 'settled');
        const settledValue = settledInvoices.reduce((sum, inv) => sum + inv.amount, 0);
        
        // Calculate average days until due for pending/verified invoices
        const activeInvoices = invoices.filter(inv => 
            inv.status === 'pending' || inv.status === 'verified'
        );
        const avgDaysUntilDue = activeInvoices.length > 0
            ? activeInvoices.reduce((sum, inv) => {
                const days = getDaysUntilDue(inv.dueDate);
                return sum + (days > 0 ? days : 0);
            }, 0) / activeInvoices.length
            : 0;
        
        // Calculate conversion rate (verified / total)
        const conversionRate = totalInvoices > 0
            ? (verifiedInvoices.length / totalInvoices) * 100
            : 0;
        
        // Calculate cash flow (sold + settled - pending)
        const cashFlow = soldValue + settledValue - pendingValue;
        
        return {
            totalInvoices,
            totalValue,
            pendingValue,
            verifiedValue,
            listedValue,
            soldValue,
            settledValue,
            avgDaysUntilDue: Math.round(avgDaysUntilDue),
            conversionRate: Math.round(conversionRate * 10) / 10,
            cashFlow,
        };
    }, [invoices]);

    if (invoices.length === 0) {
        return (
            <div className="card p-6">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp size={20} />
                    Analytics
                </h3>
                <div className="text-center py-8 text-gray-500">
                    <FileText size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No data available</p>
                    <p className="text-xs text-gray-400 mt-1">Create invoices to see analytics</p>
                </div>
            </div>
        );
    }

    return (
        <div className="card p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp size={20} />
                Analytics
            </h3>

            <div className="space-y-4">
                {/* Total Value */}
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-teal-700 font-medium">Total Invoice Value</span>
                        <DollarSign size={18} className="text-teal-600" />
                    </div>
                    <div className="text-2xl font-bold text-teal-900">
                        {formatCurrency(analytics.totalValue)}
                    </div>
                </div>

                {/* Cash Flow */}
                <div className={`rounded-lg p-4 ${
                    analytics.cashFlow >= 0 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                }`}>
                    <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${
                            analytics.cashFlow >= 0 ? 'text-green-700' : 'text-red-700'
                        }`}>
                            Net Cash Flow
                        </span>
                        {analytics.cashFlow >= 0 ? (
                            <TrendingUp size={18} className="text-green-600" />
                        ) : (
                            <TrendingDown size={18} className="text-red-600" />
                        )}
                    </div>
                    <div className={`text-xl font-bold ${
                        analytics.cashFlow >= 0 ? 'text-green-900' : 'text-red-900'
                    }`}>
                        {formatCurrency(analytics.cashFlow)}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">Pending</div>
                        <div className="text-lg font-semibold text-gray-900">
                            {formatCurrency(analytics.pendingValue)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                            {invoices.filter(i => i.status === 'pending').length} invoices
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">Sold</div>
                        <div className="text-lg font-semibold text-gray-900">
                            {formatCurrency(analytics.soldValue)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                            {invoices.filter(i => i.status === 'sold').length} invoices
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">Settled</div>
                        <div className="text-lg font-semibold text-gray-900">
                            {formatCurrency(analytics.settledValue)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                            {invoices.filter(i => i.status === 'settled').length} invoices
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">Conversion</div>
                        <div className="text-lg font-semibold text-gray-900">
                            {analytics.conversionRate}%
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                            Verified rate
                        </div>
                    </div>
                </div>

                {/* Average Days */}
                {analytics.avgDaysUntilDue > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock size={16} className="text-blue-600" />
                            <span className="text-sm text-blue-700 font-medium">Avg. Days Until Due</span>
                        </div>
                        <span className="text-lg font-bold text-blue-900">
                            {analytics.avgDaysUntilDue} days
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
