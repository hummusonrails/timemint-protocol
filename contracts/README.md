# TimeMint Stylus Smart Contract

This crate implements the TimeMint Protocol booking contract as a Stylus smart contract for Arbitrum. It provides onchain booking of time slots as NFTs, site creator registration, booking fee management, and Google Calendar-style slot logic.

## Overview

- **ERC-721 compatible:** Each booked slot is minted as an NFT.
- **Site registration:** Creators register a unique site ID (e.g., domain) to offer bookable slots.
- **Booking:** Users can book available slots for a fee, split between the creator and protocol admin.
- **Admin controls:** Admin can set the global booking fee.
- **Withdrawals:** Creators and admin can withdraw their accumulated balances.

## Storage Structure

The contract uses Stylus's `sol_storage!` macro to define:
- ERC-721 NFT storage for slots
- Mappings for creators, owners, slot times, balances, and site IDs
- Booking fee and admin key

## Key Functions

All public functions are documented with Rust doc comments in the source code (`src/lib.rs`). See below for an overview:

- `init(admin: Address)`: Initialize the contract with the admin address. Can only be called once.
- `register_site(site_id: String, creator: Address)`: Register a creator for a unique site ID. Only callable by the creator.
- `book_slot(site_id: String, start: U256, end: U256)`: Book a slot for a site. Checks registration, time validity, and splits fee.
- `set_booking_fee(new_fee: U256)`: Admin-only. Set the global booking fee.
- `withdraw()`: Withdraw accumulated balance (for creators and admin).
- `slot_metadata(token_id: U256)`: Get metadata for a booked slot (creator, start, end).
- `slots_of_creator(creator: Address)`: List all slot token IDs created by a given address.
- `slots_of_owner(owner: Address)`: List all slot token IDs owned by a given address.
- ERC-721 methods: `transfer`, `approve`, `mint`, `burn`, etc.

## Building & Deployment

You need [Stylus CLI](https://docs.arbitrum.io/stylus/) installed. From the repo root:

```sh
cd contracts
cargo stylus check       # Check contract for ability to be deployed
cargo stylus deploy      # Deploy the contract
```

Read more about the CLI on [the docs](https://docs.arbitrum.io/stylus/) or by outputting the `--help` flag:

```sh
cargo stylus --help
```

## License

This project is licensed under the MIT License. See the root LICENSE file for details.