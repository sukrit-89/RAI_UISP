// Invoice Status State Machine
export type InvoiceStatus = 'pending' | 'verified' | 'listed' | 'sold' | 'settled';

export interface Invoice {
    id: string;
    buyerName: string;
    buyerAddress?: string;
    sellerAddress: string;
    amount: number; // in INR
    dueDate: Date;
    status: InvoiceStatus;
    createdAt: Date;
    verifiedAt?: Date;
    listedAt?: Date;
    soldAt?: Date;
    settledAt?: Date;
    listingPrice?: number;
    soldPrice?: number;
    buyerWallet?: string; // Who bought the invoice on marketplace
}

export interface MarketplaceListing {
    invoiceId: string;
    seller: string;
    price: number;
    discount: number; // percentage
    yield: number; // expected yield percentage
    listedAt: Date;
    invoice: Invoice;
}

export interface AIRecommendation {
    id: string;
    type: 'sell' | 'discount' | 'warning' | 'insight';
    title: string;
    description: string;
    invoiceId?: string;
    suggestedAction?: string;
    suggestedValue?: number;
    priority: 'low' | 'medium' | 'high';
}

// State machine transitions
export const VALID_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
    pending: ['verified'],
    verified: ['listed'],
    listed: ['sold'],
    sold: ['settled'],
    settled: [],
};

export function canTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
    return VALID_TRANSITIONS[from].includes(to);
}

export function getNextStatus(current: InvoiceStatus): InvoiceStatus | null {
    const next = VALID_TRANSITIONS[current];
    return next.length > 0 ? next[0] : null;
}

// Formatting helpers
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
    }).format(amount);
}

export function formatAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function getDaysUntilDue(dueDate: Date): number {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function generateInvoiceId(): string {
    const prefix = 'INV';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp.slice(-4)}${random}`;
}
