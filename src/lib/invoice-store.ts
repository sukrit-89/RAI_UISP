'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Invoice, InvoiceStatus, MarketplaceListing } from './types';
import { generateInvoiceId, canTransition } from './types';
import { SOROBAN_CONFIG } from './contract-config';
import { createContractClient, submitTransaction } from './contract-client';

const STORAGE_KEY = 'receivai_invoices';
const MARKETPLACE_KEY = 'receivai_marketplace';

// Get contract client (only created once)
let contractClient: ReturnType<typeof createContractClient> | null = null;
function getContractClient() {
    if (!contractClient && !SOROBAN_CONFIG.DEMO_MODE) {
        contractClient = createContractClient();
    }
    return contractClient;
}

// No demo data - all invoices come from contract or localStorage

export interface InvoiceStoreHook {
    invoices: Invoice[];
    listings: MarketplaceListing[];
    isLoading: boolean;
    createInvoice: (buyerName: string, amount: number, dueDate: Date, buyerAddress?: string) => Promise<Invoice | null>;
    updateStatus: (invoiceId: string, newStatus: InvoiceStatus) => void;
    listInvoice: (invoiceId: string, price: number) => Promise<boolean>;
    buyInvoice: (invoiceId: string, buyerAddress: string) => Promise<MarketplaceListing | null>;
    settleInvoice: (invoiceId: string, payerAddress: string) => Promise<boolean>;
    verifyInvoice: (invoiceId: string, buyerAddress: string) => Promise<boolean>;
    refreshData: () => Promise<void>;
    getInvoice: (invoiceId: string) => Invoice | undefined;
    getByStatus: (status: InvoiceStatus) => Invoice[];
    signAndSubmit: (txXdr: string) => Promise<boolean>;
}

export function useInvoiceStore(
    walletAddress: string | null,
    signTx?: (xdr: string) => Promise<string>
): InvoiceStoreHook {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [listings, setListings] = useState<MarketplaceListing[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Load data function (reusable)
    const loadData = useCallback(async () => {
        if (!walletAddress) {
            setInvoices([]);
            setListings([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);

        // Try to load from contract first
        if (!SOROBAN_CONFIG.DEMO_MODE) {
            try {
                const client = getContractClient();
                if (client) {
                    const contractInvoices = await client.getInvoicesBySeller(walletAddress);
                    
                    // Always use contract data if available, even if empty
                    setInvoices(contractInvoices);

                    const contractListings = await client.getAllListings();
                    
                    // Fetch invoice details for each listing
                    const formattedListings: MarketplaceListing[] = [];
                    for (const listing of contractListings) {
                        const invoiceId = `INV-${listing.invoiceId.toString().padStart(6, '0')}`;
                        let invoice = contractInvoices.find(i => i.id === invoiceId);
                        
                        // If invoice not in seller's list, fetch it separately
                        if (!invoice) {
                            const fetchedInvoice = await client.getInvoice(listing.invoiceId);
                            if (fetchedInvoice) {
                                invoice = fetchedInvoice;
                            }
                        }

                        if (invoice) {
                            const discount = ((invoice.amount - listing.price) / invoice.amount) * 100;
                            const daysUntilDue = Math.ceil((new Date(invoice.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                            const yieldPercent = daysUntilDue > 0 ? (discount / daysUntilDue) * 365 : 0;

                            formattedListings.push({
                                invoiceId,
                                seller: listing.seller,
                                price: listing.price,
                                discount,
                                yield: yieldPercent,
                                listedAt: new Date(listing.listedAt * 1000),
                                invoice,
                            });
                        }
                    }
                    
                    setListings(formattedListings);
                    setIsLoading(false);
                    return;
                }
            } catch (error) {
                console.log('Contract load failed, falling back to localStorage', error);
            }
        }

        // Fall back to localStorage (demo mode)
        const savedInvoices = localStorage.getItem(`${STORAGE_KEY}_${walletAddress}`);
        const savedListings = localStorage.getItem(MARKETPLACE_KEY);

        if (savedInvoices) {
            const parsed = JSON.parse(savedInvoices);
            setInvoices(parsed.map((inv: Invoice) => ({
                ...inv,
                dueDate: new Date(inv.dueDate),
                createdAt: new Date(inv.createdAt),
                verifiedAt: inv.verifiedAt ? new Date(inv.verifiedAt) : undefined,
                listedAt: inv.listedAt ? new Date(inv.listedAt) : undefined,
                soldAt: inv.soldAt ? new Date(inv.soldAt) : undefined,
                settledAt: inv.settledAt ? new Date(inv.settledAt) : undefined,
            })));
        } else {
            setInvoices([]);
        }

        if (savedListings) {
            const parsed = JSON.parse(savedListings);
            setListings(parsed.map((listing: MarketplaceListing) => ({
                ...listing,
                listedAt: new Date(listing.listedAt),
                invoice: {
                    ...listing.invoice,
                    dueDate: new Date(listing.invoice.dueDate),
                    createdAt: new Date(listing.invoice.createdAt),
                },
            })));
        } else {
            setListings([]);
        }

        setIsLoading(false);
    }, [walletAddress]);

    // Load from localStorage or contract
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Save to localStorage
    const saveInvoices = useCallback((newInvoices: Invoice[]) => {
        if (walletAddress) {
            localStorage.setItem(`${STORAGE_KEY}_${walletAddress}`, JSON.stringify(newInvoices));
        }
    }, [walletAddress]);

    const saveListings = useCallback((newListings: MarketplaceListing[]) => {
        localStorage.setItem(MARKETPLACE_KEY, JSON.stringify(newListings));
    }, []);

    // Sign and submit transaction
    const signAndSubmit = useCallback(async (txXdr: string): Promise<boolean> => {
        if (!signTx) {
            console.error('No signing function available');
            return false;
        }

        try {
            const signedXdr = await signTx(txXdr);
            await submitTransaction(signedXdr);
            return true;
        } catch (error) {
            console.error('Transaction failed:', error);
            return false;
        }
    }, [signTx]);

    // Create new invoice
    const createInvoice = useCallback(async (
        buyerName: string,
        amount: number,
        dueDate: Date,
        buyerAddress?: string
    ): Promise<Invoice | null> => {
        if (!walletAddress) return null;

        // In demo mode or if no buyer address, use localStorage
        if (SOROBAN_CONFIG.DEMO_MODE || !buyerAddress) {
            const newInvoice: Invoice = {
                id: generateInvoiceId(),
                buyerName,
                buyerAddress: buyerAddress || 'GBUYER' + Math.random().toString(36).substring(2, 10).toUpperCase(),
                sellerAddress: walletAddress,
                amount,
                dueDate,
                status: 'pending',
                createdAt: new Date(),
            };

            const newInvoices = [...invoices, newInvoice];
            setInvoices(newInvoices);
            saveInvoices(newInvoices);
            return newInvoice;
        }

        // Use contract
        try {
            const client = getContractClient();
            if (!client) throw new Error('No contract client');

            const dueDateTimestamp = Math.floor(dueDate.getTime() / 1000);
            const { txXdr } = await client.mint(walletAddress, buyerAddress, amount, dueDateTimestamp);

            const success = await signAndSubmit(txXdr);
            if (!success) throw new Error('Transaction failed');

            // Reload from contract
            await loadData();
            
            // Return the newly created invoice (last one)
            const updatedInvoices = await client.getInvoicesBySeller(walletAddress);
            return updatedInvoices[updatedInvoices.length - 1] || null;
        } catch (error) {
            console.error('Contract mint failed:', error);

            // Fallback to localStorage
            const newInvoice: Invoice = {
                id: generateInvoiceId(),
                buyerName,
                buyerAddress,
                sellerAddress: walletAddress,
                amount,
                dueDate,
                status: 'pending',
                createdAt: new Date(),
            };
            const newInvoices = [...invoices, newInvoice];
            setInvoices(newInvoices);
            saveInvoices(newInvoices);
            return newInvoice;
        }
    }, [walletAddress, invoices, saveInvoices, signAndSubmit]);

    // Update invoice status (localStorage only - for demo)
    const updateStatus = useCallback((invoiceId: string, newStatus: InvoiceStatus) => {
        setInvoices(prev => {
            const updated = prev.map(inv => {
                if (inv.id !== invoiceId) return inv;

                if (!canTransition(inv.status, newStatus)) {
                    console.error(`Invalid transition: ${inv.status} -> ${newStatus}`);
                    return inv;
                }

                const now = new Date();
                const updatedInv = { ...inv, status: newStatus };

                switch (newStatus) {
                    case 'verified':
                        updatedInv.verifiedAt = now;
                        break;
                    case 'listed':
                        updatedInv.listedAt = now;
                        break;
                    case 'sold':
                        updatedInv.soldAt = now;
                        break;
                    case 'settled':
                        updatedInv.settledAt = now;
                        break;
                }

                return updatedInv;
            });

            saveInvoices(updated);
            return updated;
        });
    }, [saveInvoices]);

    // List invoice on marketplace
    const listInvoice = useCallback(async (invoiceId: string, price: number): Promise<boolean> => {
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (!invoice || invoice.status !== 'verified' || !walletAddress) return false;

        // In demo mode, use localStorage
        if (SOROBAN_CONFIG.DEMO_MODE) {
            const discount = ((invoice.amount - price) / invoice.amount) * 100;
            const daysUntilDue = Math.ceil((new Date(invoice.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            const yieldPercent = (discount / daysUntilDue) * 365;

            const listing: MarketplaceListing = {
                invoiceId,
                seller: walletAddress,
                price,
                discount,
                yield: yieldPercent,
                listedAt: new Date(),
                invoice: { ...invoice, status: 'listed' },
            };

            const newListings = [...listings, listing];
            setListings(newListings);
            saveListings(newListings);
            updateStatus(invoiceId, 'listed');
            return true;
        }

        // Use contract
        try {
            const client = getContractClient();
            if (!client) throw new Error('No contract client');

            // Extract numeric ID from invoice ID string
            const numericId = parseInt(invoiceId.replace(/\D/g, ''));

            const { txXdr } = await client.list(numericId, walletAddress, price);
            const success = await signAndSubmit(txXdr);

            if (success) {
                updateStatus(invoiceId, 'listed');
                await loadData();
            }

            return success;
        } catch (error) {
            console.error('Contract list failed:', error);
            return false;
        }
    }, [invoices, listings, walletAddress, saveListings, updateStatus, signAndSubmit]);

    // Buy invoice from marketplace
    const buyInvoice = useCallback(async (invoiceId: string, buyerAddress: string): Promise<MarketplaceListing | null> => {
        const listing = listings.find(l => l.invoiceId === invoiceId);
        if (!listing) return null;

        // In demo mode, use localStorage
        if (SOROBAN_CONFIG.DEMO_MODE) {
            // Update the invoice
            setInvoices(prev => {
                const updated = prev.map(inv => {
                    if (inv.id !== invoiceId) return inv;
                    return {
                        ...inv,
                        status: 'sold' as InvoiceStatus,
                        soldAt: new Date(),
                        soldPrice: listing.price,
                        buyerWallet: buyerAddress,
                    };
                });
                saveInvoices(updated);
                return updated;
            });

            // Remove from marketplace
            const newListings = listings.filter(l => l.invoiceId !== invoiceId);
            setListings(newListings);
            saveListings(newListings);

            return listing;
        }

        // Use contract
        try {
            const client = getContractClient();
            if (!client) throw new Error('No contract client');

            const numericId = parseInt(invoiceId.replace(/\D/g, ''));
            const { txXdr } = await client.buy(numericId, buyerAddress);
            const success = await signAndSubmit(txXdr);

            if (success) {
                updateStatus(invoiceId, 'sold');
                await loadData();
                return listing;
            }

            return null;
        } catch (error) {
            console.error('Contract buy failed:', error);
            return null;
        }
    }, [listings, updateStatus, saveInvoices, saveListings, signAndSubmit]);

    // Get invoice by ID
    const getInvoice = useCallback((invoiceId: string) => {
        return invoices.find(inv => inv.id === invoiceId);
    }, [invoices]);

    // Verify invoice (buyer verifies)
    const verifyInvoice = useCallback(async (invoiceId: string, buyerAddress: string): Promise<boolean> => {
        if (SOROBAN_CONFIG.DEMO_MODE) {
            updateStatus(invoiceId, 'verified');
            return true;
        }

        try {
            const client = getContractClient();
            if (!client) throw new Error('No contract client');

            const numericId = parseInt(invoiceId.replace(/\D/g, ''));
            const { txXdr } = await client.verify(numericId, buyerAddress);
            const success = await signAndSubmit(txXdr);

            if (success) {
                updateStatus(invoiceId, 'verified');
                await loadData();
            }

            return success;
        } catch (error) {
            console.error('Contract verify failed:', error);
            return false;
        }
    }, [updateStatus, signAndSubmit, loadData]);

    // Settle invoice (payer pays the current holder)
    const settleInvoice = useCallback(async (invoiceId: string, payerAddress: string): Promise<boolean> => {
        if (SOROBAN_CONFIG.DEMO_MODE) {
            updateStatus(invoiceId, 'settled');
            return true;
        }

        try {
            const client = getContractClient();
            if (!client) throw new Error('No contract client');

            const numericId = parseInt(invoiceId.replace(/\D/g, ''));
            const { txXdr } = await client.settle(numericId, payerAddress);
            const success = await signAndSubmit(txXdr);

            if (success) {
                updateStatus(invoiceId, 'settled');
                await loadData();
            }

            return success;
        } catch (error) {
            console.error('Contract settle failed:', error);
            return false;
        }
    }, [updateStatus, signAndSubmit, loadData]);

    // Refresh data from contract
    const refreshData = useCallback(async () => {
        await loadData();
    }, [loadData]);

    // Get invoices by status
    const getByStatus = useCallback((status: InvoiceStatus) => {
        return invoices.filter(inv => inv.status === status);
    }, [invoices]);

    return {
        invoices,
        listings,
        isLoading,
        createInvoice,
        updateStatus,
        listInvoice,
        buyInvoice,
        verifyInvoice,
        settleInvoice,
        refreshData,
        getInvoice,
        getByStatus,
        signAndSubmit,
    };
}
