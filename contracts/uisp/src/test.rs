#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Env};

#[test]
fn test_mint() {
    let env = Env::default();
    let contract_id = env.register(UISPContract, ());
    let client = UISPContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);

    let invoice_id = client.mint(&seller, &buyer, &100_000_0000000, &1735689600);
    assert_eq!(invoice_id, 1);

    let invoice = client.get_invoice(&invoice_id);
    assert_eq!(invoice.amount, 100_000_0000000);
    assert_eq!(invoice.seller, seller);
    assert_eq!(invoice.buyer, buyer);
}

#[test]
fn test_verify() {
    let env = Env::default();
    let contract_id = env.register(UISPContract, ());
    let client = UISPContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);
    let invoice_id = client.mint(&seller, &buyer, &100_000_0000000, &1735689600);

    let result = client.verify(&invoice_id, &buyer);
    assert!(result);

    let invoice = client.get_invoice(&invoice_id);
    assert_eq!(invoice.status, InvoiceStatus::Verified);
}

#[test]
fn test_list() {
    let env = Env::default();
    let contract_id = env.register(UISPContract, ());
    let client = UISPContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);

    env.mock_all_auths();

    client.initialize(&admin);
    let invoice_id = client.mint(&seller, &buyer, &100_000_0000000, &1735689600);
    client.verify(&invoice_id, &buyer);

    let result = client.list(&invoice_id, &seller, &97_000_0000000);
    assert!(result);

    let invoice = client.get_invoice(&invoice_id);
    assert_eq!(invoice.status, InvoiceStatus::Listed);
    assert_eq!(invoice.listing_price, 97_000_0000000);
}
