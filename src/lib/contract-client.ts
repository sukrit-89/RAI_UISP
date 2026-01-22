'use client';

import {
    Contract,
    TransactionBuilder,
    Address,
    nativeToScVal,
    scValToNative,
    xdr
} from '@stellar/stellar-sdk';
import { Server } from '@stellar/stellar-sdk/rpc';
import { SOROBAN_CONFIG } from './contract-config';
import type { Invoice, InvoiceStatus } from './types';

// Soroban RPC client
let rpcServer: Server | null = null;

function getRpcServer(): Server {
    if (!rpcServer) {
        rpcServer = new Server(SOROBAN_CONFIG.SOROBAN_RPC_URL);
    }
    return rpcServer;
}

function getContract(): Contract {
    return new Contract(SOROBAN_CONFIG.UISP_CONTRACT_ID);
}

// Prepare a transaction for signing
async function prepareTransaction(
    sourceAddress: string,
    operation: xdr.Operation
): Promise<string> {
    const server = getRpcServer();

    try {
        const account = await server.getAccount(sourceAddress);

        const transaction = new TransactionBuilder(account, {
            fee: '100000',
            networkPassphrase: SOROBAN_CONFIG.NETWORK_PASSPHRASE,
        })
            .addOperation(operation)
            .setTimeout(300)
            .build();

        const preparedTx = await server.prepareTransaction(transaction);
        return preparedTx.toXDR();
    } catch (error) {
        console.error('Failed to prepare transaction:', error);
        throw error;
    }
}

// Submit a signed transaction
export async function submitTransaction(signedXdr: string): Promise<boolean> {
    if (SOROBAN_CONFIG.DEMO_MODE) {
        console.log('Demo mode: Simulating transaction submission');
        return true;
    }

    const server = getRpcServer();

    try {
        const tx = TransactionBuilder.fromXDR(
            signedXdr,
            SOROBAN_CONFIG.NETWORK_PASSPHRASE
        );

        const result = await server.sendTransaction(tx);
        console.log('Transaction sent:', result.hash);

        if (result.status === 'PENDING') {
            // Wait for transaction to complete
            let attempts = 0;
            while (attempts < 30) {
                const getResponse = await server.getTransaction(result.hash);

                if (getResponse.status === 'SUCCESS') {
                    console.log('Transaction successful!');
                    return true;
                } else if (getResponse.status === 'FAILED') {
                    console.error('Transaction failed');
                    return false;
                }

                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
            }

            console.error('Transaction timeout');
            return false;
        }

        return false; // Non-PENDING status means immediate failure
    } catch (error) {
        console.error('Failed to submit transaction:', error);
        throw error;
    }
}

export interface ContractClient {
    mint: (seller: string, buyer: string, amount: number, dueDate: number) => Promise<{ txXdr: string }>;
    verify: (invoiceId: number, buyer: string) => Promise<{ txXdr: string }>;
    list: (invoiceId: number, seller: string, price: number) => Promise<{ txXdr: string }>;
    buy: (invoiceId: number, buyer: string) => Promise<{ txXdr: string }>;
    settle: (invoiceId: number, payer: string) => Promise<{ txXdr: string }>;
    getInvoice: (invoiceId: number) => Promise<Invoice | null>;
    getInvoicesBySeller: (seller: string) => Promise<Invoice[]>;
    getAllListings: () => Promise<{ invoiceId: number; seller: string; price: number; listedAt: number }[]>;
}

export function createContractClient(): ContractClient {
    const contract = getContract();

    return {
        // Mint a new invoice
        async mint(seller: string, buyer: string, amount: number, dueDate: number) {
            console.log('Contract mint:', { seller, buyer, amount, dueDate });

            if (SOROBAN_CONFIG.DEMO_MODE) {
                return { txXdr: 'DEMO_TX_' + Date.now() };
            }

            const sellerAddr = new Address(seller);
            const buyerAddr = new Address(buyer);

            // Convert amount to stroops (7 decimal places)
            const amountStroops = BigInt(Math.floor(amount * 10_000_000));

            const operation = contract.call(
                'mint',
                sellerAddr.toScVal(),
                buyerAddr.toScVal(),
                nativeToScVal(amountStroops, { type: 'i128' }),
                nativeToScVal(BigInt(dueDate), { type: 'u64' })
            );

            const txXdr = await prepareTransaction(seller, operation);
            return { txXdr };
        },

        // Verify an invoice
        async verify(invoiceId: number, buyer: string) {
            console.log('Contract verify:', { invoiceId, buyer });

            if (SOROBAN_CONFIG.DEMO_MODE) {
                return { txXdr: 'DEMO_TX_' + Date.now() };
            }

            const buyerAddr = new Address(buyer);

            const operation = contract.call(
                'verify',
                nativeToScVal(BigInt(invoiceId), { type: 'u64' }),
                buyerAddr.toScVal()
            );

            const txXdr = await prepareTransaction(buyer, operation);
            return { txXdr };
        },

        // List invoice on marketplace
        async list(invoiceId: number, seller: string, price: number) {
            console.log('Contract list:', { invoiceId, seller, price });

            if (SOROBAN_CONFIG.DEMO_MODE) {
                return { txXdr: 'DEMO_TX_' + Date.now() };
            }

            const sellerAddr = new Address(seller);
            const priceStroops = BigInt(Math.floor(price * 10_000_000));

            const operation = contract.call(
                'list',
                nativeToScVal(BigInt(invoiceId), { type: 'u64' }),
                sellerAddr.toScVal(),
                nativeToScVal(priceStroops, { type: 'i128' })
            );

            const txXdr = await prepareTransaction(seller, operation);
            return { txXdr };
        },

        // Buy invoice from marketplace
        async buy(invoiceId: number, buyer: string) {
            console.log('Contract buy:', { invoiceId, buyer });

            if (SOROBAN_CONFIG.DEMO_MODE) {
                return { txXdr: 'DEMO_TX_' + Date.now() };
            }

            const buyerAddr = new Address(buyer);
            const paymentToken = new Address(SOROBAN_CONFIG.PAYMENT_TOKEN);

            const operation = contract.call(
                'buy',
                nativeToScVal(BigInt(invoiceId), { type: 'u64' }),
                buyerAddr.toScVal(),
                paymentToken.toScVal()
            );

            const txXdr = await prepareTransaction(buyer, operation);
            return { txXdr };
        },

        // Settle invoice (pay the current holder)
        async settle(invoiceId: number, payer: string) {
            console.log('Contract settle:', { invoiceId, payer });

            if (SOROBAN_CONFIG.DEMO_MODE) {
                return { txXdr: 'DEMO_TX_' + Date.now() };
            }

            const payerAddr = new Address(payer);
            const paymentToken = new Address(SOROBAN_CONFIG.PAYMENT_TOKEN);

            const operation = contract.call(
                'settle',
                nativeToScVal(BigInt(invoiceId), { type: 'u64' }),
                payerAddr.toScVal(),
                paymentToken.toScVal()
            );

            const txXdr = await prepareTransaction(payer, operation);
            return { txXdr };
        },

        // Get invoice by ID (read-only)
        async getInvoice(invoiceId: number): Promise<Invoice | null> {
            if (SOROBAN_CONFIG.DEMO_MODE) {
                return null;
            }

            try {
                const server = getRpcServer();

                const operation = contract.call(
                    'get_invoice',
                    nativeToScVal(BigInt(invoiceId), { type: 'u64' })
                );

                // Simulate with dummy account
                const dummyKeypair = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
                const account = await server.getAccount(dummyKeypair).catch(() => null);

                if (!account) {
                    return null;
                }

                const tx = new TransactionBuilder(account, {
                    fee: '0',
                    networkPassphrase: SOROBAN_CONFIG.NETWORK_PASSPHRASE,
                })
                    .addOperation(operation)
                    .setTimeout(0)
                    .build();

                const result = await server.simulateTransaction(tx);

                if ('result' in result && result.result) {
                    return parseInvoiceResult(result.result.retval, invoiceId);
                }
                return null;
            } catch (error) {
                console.error('Failed to get invoice:', error);
                return null;
            }
        },

        // Get all invoices for a seller
        async getInvoicesBySeller(seller: string): Promise<Invoice[]> {
            if (SOROBAN_CONFIG.DEMO_MODE) {
                return [];
            }

            try {
                const server = getRpcServer();
                const sellerAddr = new Address(seller);

                const operation = contract.call(
                    'get_invoices_by_seller',
                    sellerAddr.toScVal()
                );

                // Use dummy account for simulation
                const dummyKeypair = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
                let account;
                try {
                    account = await server.getAccount(dummyKeypair);
                } catch {
                    // Account doesn't exist, create a minimal transaction
                    account = {
                        accountId: dummyKeypair,
                        sequenceNumber: () => '0',
                    } as any;
                }

                const tx = new TransactionBuilder(account as any, {
                    fee: '0',
                    networkPassphrase: SOROBAN_CONFIG.NETWORK_PASSPHRASE,
                })
                    .addOperation(operation)
                    .setTimeout(0)
                    .build();

                const result = await server.simulateTransaction(tx);

                if ('result' in result && result.result && result.result.retval) {
                    const invoices = parseInvoiceVec(result.result.retval);
                    return invoices;
                }
                return [];
            } catch (error) {
                console.error('Failed to get invoices by seller:', error);
                return [];
            }
        },

        // Get all active marketplace listings
        async getAllListings() {
            if (SOROBAN_CONFIG.DEMO_MODE) {
                return [];
            }

            try {
                const server = getRpcServer();

                const operation = contract.call('get_all_listings');

                const dummyKeypair = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
                let account;
                try {
                    account = await server.getAccount(dummyKeypair);
                } catch {
                    account = {
                        accountId: dummyKeypair,
                        sequenceNumber: () => '0',
                    } as any;
                }

                const tx = new TransactionBuilder(account as any, {
                    fee: '0',
                    networkPassphrase: SOROBAN_CONFIG.NETWORK_PASSPHRASE,
                })
                    .addOperation(operation)
                    .setTimeout(0)
                    .build();

                const result = await server.simulateTransaction(tx);

                if ('result' in result && result.result && result.result.retval) {
                    const listings = parseListingVec(result.result.retval);
                    return listings;
                }
                return [];
            } catch (error) {
                console.error('Failed to get all listings:', error);
                return [];
            }
        },
    };
}

// Helper: Parse invoice from ScVal
function parseInvoiceResult(scVal: xdr.ScVal, id: number): Invoice | null {
    try {
        const obj = scValToNative(scVal) as Record<string, unknown>;
        return {
            id: `INV-${id.toString().padStart(6, '0')}`,
            buyerName: 'Buyer',
            sellerAddress: String(obj.seller || ''),
            buyerAddress: String(obj.buyer || ''),
            amount: Number(obj.amount || 0) / 10_000_000,
            dueDate: new Date(Number(obj.due_date || 0) * 1000),
            status: mapStatus(Number(obj.status || 0)),
            createdAt: new Date(Number(obj.created_at || 0) * 1000),
        };
    } catch {
        return null;
    }
}

// Map contract status to frontend status
function mapStatus(status: number): InvoiceStatus {
    switch (status) {
        case 0: return 'pending';
        case 1: return 'verified';
        case 2: return 'listed';
        case 3: return 'sold';
        case 4: return 'settled';
        default: return 'pending';
    }
}

// Helper: Parse invoice Vec from ScVal
function parseInvoiceVec(scVal: xdr.ScVal): Invoice[] {
    try {
        const vec = scValToNative(scVal) as any[];
        if (!Array.isArray(vec)) return [];

        const invoices: Invoice[] = [];
        for (const item of vec) {
            try {
                const buyerAddress = String(item.buyer || '');
                if (!buyerAddress) continue; // Skip if no buyer address
                
                const invoice: Invoice = {
                    id: `INV-${(item.id || invoices.length + 1).toString().padStart(6, '0')}`,
                    buyerName: `Buyer ${item.buyer?.toString().slice(0, 8) || 'Unknown'}`,
                    sellerAddress: String(item.seller || ''),
                    buyerAddress: buyerAddress,
                    amount: Number(item.amount || 0) / 10_000_000,
                    dueDate: new Date(Number(item.due_date || 0) * 1000),
                    status: mapStatus(Number(item.status || 0)),
                    createdAt: new Date(Number(item.created_at || 0) * 1000),
                    verifiedAt: item.verified_at ? new Date(Number(item.verified_at) * 1000) : undefined,
                    listingPrice: item.listing_price ? Number(item.listing_price) / 10_000_000 : undefined,
                };
                invoices.push(invoice);
            } catch (e) {
                console.error('Error parsing invoice item:', e, item);
            }
        }
        return invoices;
    } catch (error) {
        console.error('Failed to parse invoice Vec:', error);
        return [];
    }
}

// Helper: Parse listing Vec from ScVal
function parseListingVec(scVal: xdr.ScVal): { invoiceId: number; seller: string; price: number; listedAt: number }[] {
    try {
        const vec = scValToNative(scVal) as any[];
        if (!Array.isArray(vec)) return [];

        return vec.map((item: any) => ({
            invoiceId: Number(item.invoice_id || 0),
            seller: String(item.seller || ''),
            price: Number(item.price || 0) / 10_000_000,
            listedAt: Number(item.listed_at || 0),
        })).filter(l => l.invoiceId > 0);
    } catch (error) {
        console.error('Failed to parse listing Vec:', error);
        return [];
    }
}
