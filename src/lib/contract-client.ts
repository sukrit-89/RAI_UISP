'use client';

// Simplified contract client for demo mode
// When DEMO_MODE is false, this will use real Soroban RPC calls

import { SOROBAN_CONFIG } from './contract-config';
import type { Invoice } from './types';

export interface ContractClient {
    mint: (seller: string, buyer: string, amount: number, dueDate: number) => Promise<{ txXdr: string; invoiceId?: number }>;
    verify: (invoiceId: number, buyer: string) => Promise<{ txXdr: string }>;
    list: (invoiceId: number, seller: string, price: number) => Promise<{ txXdr: string }>;
    buy: (invoiceId: number, buyer: string) => Promise<{ txXdr: string }>;
    getInvoice: (invoiceId: number) => Promise<Invoice | null>;
    getInvoicesBySeller: (seller: string) => Promise<Invoice[]>;
    getAllListings: () => Promise<{ invoiceId: number; seller: string; price: number; listedAt: number }[]>;
}

// Demo mode contract client - returns mock transactions
// In production, replace with real Soroban SDK calls
export function createContractClient(): ContractClient {
    if (SOROBAN_CONFIG.DEMO_MODE) {
        console.log('Contract client running in DEMO mode - using localStorage');
    }

    return {
        async mint(seller: string, buyer: string, amount: number, dueDate: number) {
            // In production, this would build a Soroban transaction
            console.log('Contract mint called:', { seller, buyer, amount, dueDate });
            return { txXdr: 'DEMO_TX_' + Date.now(), invoiceId: Date.now() };
        },

        async verify(invoiceId: number, buyer: string) {
            console.log('Contract verify called:', { invoiceId, buyer });
            return { txXdr: 'DEMO_TX_' + Date.now() };
        },

        async list(invoiceId: number, seller: string, price: number) {
            console.log('Contract list called:', { invoiceId, seller, price });
            return { txXdr: 'DEMO_TX_' + Date.now() };
        },

        async buy(invoiceId: number, buyer: string) {
            console.log('Contract buy called:', { invoiceId, buyer });
            return { txXdr: 'DEMO_TX_' + Date.now() };
        },

        async getInvoice(invoiceId: number): Promise<Invoice | null> {
            console.log('Contract getInvoice called:', { invoiceId });
            return null;
        },

        async getInvoicesBySeller(seller: string): Promise<Invoice[]> {
            console.log('Contract getInvoicesBySeller called:', { seller });
            return [];
        },

        async getAllListings() {
            console.log('Contract getAllListings called');
            return [];
        },
    };
}

// Submit signed transaction
export async function submitTransaction(signedXdr: string): Promise<boolean> {
    if (SOROBAN_CONFIG.DEMO_MODE) {
        console.log('Demo mode: Transaction submitted:', signedXdr);
        return true;
    }

    // In production, use Stellar SDK to submit
    // const server = new SorobanRpc.Server(SOROBAN_CONFIG.SOROBAN_RPC_URL);
    // const tx = TransactionBuilder.fromXDR(signedXdr, SOROBAN_CONFIG.NETWORK_PASSPHRASE);
    // const result = await server.sendTransaction(tx);
    // return result.status === 'SUCCESS';

    return true;
}

/* 
=================================================
PRODUCTION IMPLEMENTATION (After Contract Deploy)
=================================================

To enable real contract calls:
1. Deploy the UISP contract to testnet
2. Update UISP_CONTRACT_ID in contract-config.ts
3. Set DEMO_MODE to false
4. Uncomment and use the Stellar SDK code below:

import * as StellarSdk from '@stellar/stellar-sdk';

function getRpcServer() {
  return new StellarSdk.SorobanRpc.Server(SOROBAN_CONFIG.SOROBAN_RPC_URL);
}

async function prepareTransaction(sourceAddress: string, operation: StellarSdk.xdr.Operation) {
  const server = getRpcServer();
  const account = await server.getAccount(sourceAddress);
  
  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: '100000',
    networkPassphrase: SOROBAN_CONFIG.NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(300)
    .build();
  
  return await server.prepareTransaction(tx);
}

// Then update each method to call the contract
async mint(seller, buyer, amount, dueDate) {
  const contract = new StellarSdk.Contract(SOROBAN_CONFIG.UISP_CONTRACT_ID);
  const op = contract.call(
    'mint',
    new StellarSdk.Address(seller).toScVal(),
    new StellarSdk.Address(buyer).toScVal(),
    StellarSdk.nativeToScVal(BigInt(amount * 10000000), { type: 'i128' }),
    StellarSdk.nativeToScVal(dueDate, { type: 'u64' })
  );
  const tx = await prepareTransaction(seller, op);
  return { txXdr: tx.toXDR() };
}

=================================================
*/
