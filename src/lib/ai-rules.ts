import type { Invoice, AIRecommendation } from './types';
import { getDaysUntilDue } from './types';

// AI rule engine - no LLMs, just smart logic
export function generateRecommendations(
    invoices: Invoice[],
    balance: number
): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];

    // Rule 1: Low balance warning
    if (balance < 10000) {
        recommendations.push({
            id: 'low-balance',
            type: 'warning',
            title: 'Low Cash Balance!',
            description: `Your balance is only ₹${balance.toLocaleString('en-IN')}. Consider selling a verified invoice to boost liquidity.`,
            priority: 'high',
        });
    }

    // Rule 2: Suggest selling verified invoices
    const verifiedInvoices = invoices.filter(inv => inv.status === 'verified');
    verifiedInvoices.forEach(invoice => {
        const daysUntilDue = getDaysUntilDue(invoice.dueDate);
        let discount = 3; // Base discount

        // Adjust discount based on time to due date
        if (daysUntilDue > 60) {
            discount = 5;
        } else if (daysUntilDue > 45) {
            discount = 4;
        } else if (daysUntilDue < 15) {
            discount = 1;
        }

        const suggestedPrice = Math.round(invoice.amount * (1 - discount / 100));

        recommendations.push({
            id: `sell-${invoice.id}`,
            type: 'sell',
            title: `Sell Invoice ${invoice.id}`,
            description: `Convert ₹${invoice.amount.toLocaleString('en-IN')} invoice from ${invoice.buyerName} to instant cash at ${discount}% discount.`,
            invoiceId: invoice.id,
            suggestedAction: 'sell',
            suggestedValue: suggestedPrice,
            priority: balance < 20000 ? 'high' : 'medium',
        });
    });

    // Rule 3: Pending invoice reminder
    const pendingInvoices = invoices.filter(inv => inv.status === 'pending');
    if (pendingInvoices.length > 0) {
        const oldestPending = pendingInvoices.reduce((oldest, inv) =>
            new Date(inv.createdAt) < new Date(oldest.createdAt) ? inv : oldest
        );

        const daysSinceCreated = Math.floor(
            (Date.now() - new Date(oldestPending.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceCreated > 3) {
            recommendations.push({
                id: `reminder-${oldestPending.id}`,
                type: 'insight',
                title: 'Pending Verification',
                description: `Invoice ${oldestPending.id} for ${oldestPending.buyerName} has been pending for ${daysSinceCreated} days. Send a reminder to verify.`,
                invoiceId: oldestPending.id,
                priority: 'low',
            });
        }
    }

    // Rule 4: Offer early payment discount suggestion
    const longDueInvoices = invoices.filter(inv => {
        if (inv.status !== 'pending') return false;
        return getDaysUntilDue(inv.dueDate) > 45;
    });

    longDueInvoices.forEach(invoice => {
        recommendations.push({
            id: `early-discount-${invoice.id}`,
            type: 'discount',
            title: 'Offer Early Payment Discount',
            description: `Offer ${invoice.buyerName} a 2% discount for early payment on ${invoice.id}. This could speed up your cash flow.`,
            invoiceId: invoice.id,
            suggestedValue: 2,
            priority: 'low',
        });
    });

    // Sort by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
}

// Get AI-suggested price for an invoice
export function getSuggestedPrice(invoice: Invoice): {
    price: number;
    discount: number;
    yield: number;
} {
    const daysUntilDue = getDaysUntilDue(invoice.dueDate);

    // Base discount calculation
    let discount: number;
    if (daysUntilDue <= 14) {
        discount = 1;
    } else if (daysUntilDue <= 30) {
        discount = 2;
    } else if (daysUntilDue <= 45) {
        discount = 3;
    } else if (daysUntilDue <= 60) {
        discount = 4;
    } else {
        discount = 5;
    }

    const price = Math.round(invoice.amount * (1 - discount / 100));
    const yieldPercent = (discount / daysUntilDue) * 365; // Annualized

    return {
        price,
        discount,
        yield: Math.round(yieldPercent * 10) / 10,
    };
}
