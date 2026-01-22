// Soroban Contract Configuration
// Deploy to testnet and update this contract ID

export const SOROBAN_CONFIG = {
    // Contract ID - update after deployment
    UISP_CONTRACT_ID: 'PLACEHOLDER_CONTRACT_ID_DEPLOY_FIRST',

    // Network configuration
    NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
    SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
    HORIZON_URL: 'https://horizon-testnet.stellar.org',

    // Token for payments (USDC on testnet or native XLM)
    PAYMENT_TOKEN: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC', // Testnet USDC

    // Demo mode - use localStorage instead of real contract
    // Set to false when contract is deployed
    DEMO_MODE: true,
};

// Invoice status enum matching contract
export enum ContractInvoiceStatus {
    Pending = 0,
    Verified = 1,
    Listed = 2,
    Sold = 3,
    Settled = 4,
}

// Map contract status to frontend status
export function mapContractStatus(status: number): 'pending' | 'verified' | 'listed' | 'sold' | 'settled' {
    switch (status) {
        case 0: return 'pending';
        case 1: return 'verified';
        case 2: return 'listed';
        case 3: return 'sold';
        case 4: return 'settled';
        default: return 'pending';
    }
}

// Amount conversion (Stellar uses 7 decimals)
export function toStroops(amount: number): bigint {
    return BigInt(Math.floor(amount * 10_000_000));
}

export function fromStroops(stroops: bigint | number): number {
    return Number(stroops) / 10_000_000;
}
