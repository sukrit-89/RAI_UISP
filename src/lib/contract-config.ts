// Soroban Contract Configuration
// Deployed to Stellar Testnet!

export const SOROBAN_CONFIG = {
    // Contract ID - Deployed!
    UISP_CONTRACT_ID: 'CCHFONTRNCJ5RBA73GPPXEKKAUGV2Q5PMP2LZMNLDI45UHI3I5UTOHYE',

    // Network configuration
    NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
    SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
    HORIZON_URL: 'https://horizon-testnet.stellar.org',

    // Token for payments (USDC on testnet or native XLM)
    PAYMENT_TOKEN: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC', // Testnet USDC

    // Demo mode - use localStorage instead of real contract
    // Contract is deployed! Set to false to use real contract calls
    DEMO_MODE: false, // Keep true for hackathon demo (simpler UX)
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
