'use client';

import type { AIRecommendation, Invoice } from '@/lib/types';
import { Bot, AlertTriangle, TrendingUp, Gift, Lightbulb, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency } from '@/lib/types';

interface AIAgentPanelProps {
    recommendations: AIRecommendation[];
    onApprove: (recommendation: AIRecommendation) => void;
    onDismiss: (recommendationId: string) => void;
}

const iconMap = {
    sell: TrendingUp,
    discount: Gift,
    warning: AlertTriangle,
    insight: Lightbulb,
};

const colorMap = {
    sell: 'text-teal-600 bg-teal-50 border-teal-200',
    discount: 'text-purple-600 bg-purple-50 border-purple-200',
    warning: 'text-red-600 bg-red-50 border-red-200',
    insight: 'text-blue-600 bg-blue-50 border-blue-200',
};

const priorityColors = {
    high: 'border-l-4 border-l-red-500',
    medium: 'border-l-4 border-l-amber-500',
    low: 'border-l-4 border-l-gray-300',
};

export function AIAgentPanel({ recommendations, onApprove, onDismiss }: AIAgentPanelProps) {
    if (recommendations.length === 0) {
        return (
            <div className="card p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                        <Bot size={20} className="text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">AI Finance Agent</h3>
                        <p className="text-sm text-gray-500">Your smart assistant</p>
                    </div>
                </div>
                <div className="text-center py-8 text-gray-500">
                    <Bot size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No recommendations right now</p>
                    <p className="text-xs text-gray-400 mt-1">I&apos;ll notify you when I spot opportunities</p>
                </div>
            </div>
        );
    }

    return (
        <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center animate-pulse">
                    <Bot size={20} className="text-white" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">AI Finance Agent</h3>
                    <p className="text-sm text-gray-500">{recommendations.length} suggestion{recommendations.length > 1 ? 's' : ''}</p>
                </div>
            </div>

            <div className="space-y-3">
                <AnimatePresence>
                    {recommendations.slice(0, 3).map((rec) => {
                        const Icon = iconMap[rec.type];
                        const colors = colorMap[rec.type];
                        const priority = priorityColors[rec.priority];

                        return (
                            <motion.div
                                key={rec.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className={`rounded-lg border p-4 ${priority}`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg ${colors}`}>
                                        <Icon size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-gray-900 text-sm">{rec.title}</h4>
                                        <p className="text-xs text-gray-600 mt-1">{rec.description}</p>

                                        {rec.suggestedValue && rec.type === 'sell' && (
                                            <div className="mt-2 text-sm font-semibold text-teal-600">
                                                Suggested: {formatCurrency(rec.suggestedValue)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-3 ml-11">
                                    <button
                                        onClick={() => onApprove(rec)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 text-white text-xs font-semibold rounded-lg hover:bg-teal-700 transition-colors"
                                    >
                                        <Check size={14} />
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => onDismiss(rec.id)}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        <X size={14} />
                                        Dismiss
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 text-center">
                    🔒 AI never auto-executes. You approve every action.
                </p>
            </div>
        </div>
    );
}
