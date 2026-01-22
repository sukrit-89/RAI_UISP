#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, Map, String, Symbol, Vec,
};

/// Invoice status enum
#[derive(Clone, Copy, PartialEq, Eq)]
#[contracttype]
#[repr(u32)]
pub enum InvoiceStatus {
    Pending = 0,
    Verified = 1,
    Listed = 2,
    Sold = 3,
    Settled = 4,
}

/// Invoice data structure
#[derive(Clone)]
#[contracttype]
pub struct Invoice {
    pub id: u64,
    pub seller: Address,
    pub buyer: Address,
    pub amount: i128,
    pub due_date: u64,
    pub status: InvoiceStatus,
    pub created_at: u64,
    pub verified_at: u64,
    pub listing_price: i128,
    pub current_holder: Address,
}

/// Marketplace listing
#[derive(Clone)]
#[contracttype]
pub struct Listing {
    pub invoice_id: u64,
    pub seller: Address,
    pub price: i128,
    pub listed_at: u64,
}

// Storage keys
const INVOICES: Symbol = symbol_short!("INVOICES");
const LISTINGS: Symbol = symbol_short!("LISTINGS");
const COUNTER: Symbol = symbol_short!("COUNTER");
const ADMIN: Symbol = symbol_short!("ADMIN");

#[contract]
pub struct UISPContract;

#[contractimpl]
impl UISPContract {
    /// Initialize the contract
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("Already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&COUNTER, &0u64);
    }

    /// Mint a new invoice NFT
    pub fn mint(
        env: Env,
        seller: Address,
        buyer: Address,
        amount: i128,
        due_date: u64,
    ) -> u64 {
        // Require seller authorization
        seller.require_auth();

        // Get and increment counter
        let mut counter: u64 = env.storage().instance().get(&COUNTER).unwrap_or(0);
        counter += 1;

        let invoice = Invoice {
            id: counter,
            seller: seller.clone(),
            buyer: buyer.clone(),
            amount,
            due_date,
            status: InvoiceStatus::Pending,
            created_at: env.ledger().timestamp(),
            verified_at: 0,
            listing_price: 0,
            current_holder: seller.clone(),
        };

        // Store invoice
        let mut invoices: Map<u64, Invoice> = env
            .storage()
            .persistent()
            .get(&INVOICES)
            .unwrap_or(Map::new(&env));
        invoices.set(counter, invoice.clone());
        env.storage().persistent().set(&INVOICES, &invoices);
        env.storage().instance().set(&COUNTER, &counter);

        // Emit event
        env.events().publish(
            (symbol_short!("mint"), seller),
            (counter, amount, due_date),
        );

        counter
    }

    /// Buyer verifies the invoice
    pub fn verify(env: Env, invoice_id: u64, buyer: Address) -> bool {
        buyer.require_auth();

        let mut invoices: Map<u64, Invoice> = env
            .storage()
            .persistent()
            .get(&INVOICES)
            .unwrap_or(Map::new(&env));

        let mut invoice = invoices.get(invoice_id).expect("Invoice not found");

        // Only the designated buyer can verify
        if invoice.buyer != buyer {
            panic!("Only designated buyer can verify");
        }

        // Must be pending
        if invoice.status != InvoiceStatus::Pending {
            panic!("Invoice not pending");
        }

        invoice.status = InvoiceStatus::Verified;
        invoice.verified_at = env.ledger().timestamp();
        invoices.set(invoice_id, invoice.clone());
        env.storage().persistent().set(&INVOICES, &invoices);

        // Emit event
        env.events().publish(
            (symbol_short!("verify"), buyer),
            invoice_id,
        );

        true
    }

    /// List invoice on marketplace
    pub fn list(env: Env, invoice_id: u64, seller: Address, price: i128) -> bool {
        seller.require_auth();

        let mut invoices: Map<u64, Invoice> = env
            .storage()
            .persistent()
            .get(&INVOICES)
            .unwrap_or(Map::new(&env));

        let mut invoice = invoices.get(invoice_id).expect("Invoice not found");

        // Verify ownership
        if invoice.current_holder != seller {
            panic!("Not the owner");
        }

        // Must be verified
        if invoice.status != InvoiceStatus::Verified {
            panic!("Invoice not verified");
        }

        invoice.status = InvoiceStatus::Listed;
        invoice.listing_price = price;
        invoices.set(invoice_id, invoice.clone());
        env.storage().persistent().set(&INVOICES, &invoices);

        // Create listing
        let listing = Listing {
            invoice_id,
            seller: seller.clone(),
            price,
            listed_at: env.ledger().timestamp(),
        };

        let mut listings: Map<u64, Listing> = env
            .storage()
            .persistent()
            .get(&LISTINGS)
            .unwrap_or(Map::new(&env));
        listings.set(invoice_id, listing);
        env.storage().persistent().set(&LISTINGS, &listings);

        // Emit event
        env.events().publish(
            (symbol_short!("list"), seller),
            (invoice_id, price),
        );

        true
    }

    /// Buy invoice from marketplace (transfer ownership)
    pub fn buy(env: Env, invoice_id: u64, buyer: Address, payment_token: Address) -> bool {
        buyer.require_auth();

        let mut invoices: Map<u64, Invoice> = env
            .storage()
            .persistent()
            .get(&INVOICES)
            .unwrap_or(Map::new(&env));

        let mut listings: Map<u64, Listing> = env
            .storage()
            .persistent()
            .get(&LISTINGS)
            .unwrap_or(Map::new(&env));

        let invoice = invoices.get(invoice_id).expect("Invoice not found");
        let listing = listings.get(invoice_id).expect("Not listed");

        // Must be listed
        if invoice.status != InvoiceStatus::Listed {
            panic!("Invoice not listed");
        }

        // Transfer payment from buyer to seller
        let token_client = soroban_sdk::token::Client::new(&env, &payment_token);
        token_client.transfer(&buyer, &listing.seller, &listing.price);

        // Update invoice ownership
        let mut updated_invoice = invoice.clone();
        updated_invoice.status = InvoiceStatus::Sold;
        updated_invoice.current_holder = buyer.clone();
        invoices.set(invoice_id, updated_invoice);
        env.storage().persistent().set(&INVOICES, &invoices);

        // Remove listing
        listings.remove(invoice_id);
        env.storage().persistent().set(&LISTINGS, &listings);

        // Emit event
        env.events().publish(
            (symbol_short!("buy"), buyer.clone()),
            (invoice_id, listing.price),
        );

        true
    }

    /// Settle invoice - pay the current holder (called by original buyer/debtor)
    pub fn settle(env: Env, invoice_id: u64, payer: Address, payment_token: Address) -> bool {
        payer.require_auth();

        let mut invoices: Map<u64, Invoice> = env
            .storage()
            .persistent()
            .get(&INVOICES)
            .unwrap_or(Map::new(&env));

        let invoice = invoices.get(invoice_id).expect("Invoice not found");

        // Payer must be the original buyer (debtor)
        if invoice.buyer != payer {
            panic!("Only original buyer can settle");
        }

        // Must be sold
        if invoice.status != InvoiceStatus::Sold {
            panic!("Invoice not sold");
        }

        // Check due date
        if env.ledger().timestamp() < invoice.due_date {
            panic!("Not yet due");
        }

        // Transfer payment to current holder
        let token_client = soroban_sdk::token::Client::new(&env, &payment_token);
        token_client.transfer(&payer, &invoice.current_holder, &invoice.amount);

        // Update status
        let mut updated_invoice = invoice.clone();
        updated_invoice.status = InvoiceStatus::Settled;
        invoices.set(invoice_id, updated_invoice);
        env.storage().persistent().set(&INVOICES, &invoices);

        // Emit event
        env.events().publish(
            (symbol_short!("settle"), payer),
            (invoice_id, invoice.amount),
        );

        true
    }

    /// Get invoice by ID
    pub fn get_invoice(env: Env, invoice_id: u64) -> Invoice {
        let invoices: Map<u64, Invoice> = env
            .storage()
            .persistent()
            .get(&INVOICES)
            .unwrap_or(Map::new(&env));
        invoices.get(invoice_id).expect("Invoice not found")
    }

    /// Get listing by invoice ID
    pub fn get_listing(env: Env, invoice_id: u64) -> Listing {
        let listings: Map<u64, Listing> = env
            .storage()
            .persistent()
            .get(&LISTINGS)
            .unwrap_or(Map::new(&env));
        listings.get(invoice_id).expect("Listing not found")
    }

    /// Get all invoices for a seller
    pub fn get_invoices_by_seller(env: Env, seller: Address) -> Vec<Invoice> {
        let invoices: Map<u64, Invoice> = env
            .storage()
            .persistent()
            .get(&INVOICES)
            .unwrap_or(Map::new(&env));

        let mut result: Vec<Invoice> = Vec::new(&env);
        for (_, invoice) in invoices.iter() {
            if invoice.seller == seller || invoice.current_holder == seller {
                result.push_back(invoice);
            }
        }
        result
    }

    /// Get all active listings
    pub fn get_all_listings(env: Env) -> Vec<Listing> {
        let listings: Map<u64, Listing> = env
            .storage()
            .persistent()
            .get(&LISTINGS)
            .unwrap_or(Map::new(&env));

        let mut result: Vec<Listing> = Vec::new(&env);
        for (_, listing) in listings.iter() {
            result.push_back(listing);
        }
        result
    }

    /// Get invoice count
    pub fn get_invoice_count(env: Env) -> u64 {
        env.storage().instance().get(&COUNTER).unwrap_or(0)
    }
}

mod test;
