# TimeMint Protocol

<p align="center">
  <img src="images/logo-light.png#gh-light-mode-only" width="320" height="80" alt="Project Logo"/>
  <img src="images/logo-dark.png#gh-dark-mode-only" width="320" height="80" alt="Project Logo"/>
</p>

Tokenize your time. Book meetings onchain.

TimeMint Protocol enables developers and creators to offer tokenized calendar bookings using Arbitrum Stylus smart contracts and Google Calendar integrations. The protocol is fully open source and includes:
- A Stylus smart contract in Rust
- A React component for embeddable booking UIs
- Two example frontend demo sites
- Serverless functions

## Features

- ERC-721 NFTs representing booked calendar slots
- Platform fee support for creators and operators
- Booking availability based on Google Calendar
- React component for simple drop-in integration
- Example sites for protocol and component usage
- Fully open source, modular, and composable

## Monorepo Structure

| Path                                      | Description                                                        |
|--------------------------------------------|--------------------------------------------------------------------|
| `contracts/`                              | Stylus (Rust) smart contract source code                           |
| `packages/react-timemint-component/`      | Reusable React booking widget/component                            |
| `examples/timemint-demo-site/`            | Full-featured demo site (protocol + Google Calendar integration)   |
| `examples/timemint-component-demo-site/`  | Minimal demo for the React component in isolation                  |
| `serverless-functions/`                   | Example backend/serverless API endpoints (Google Calendar, etc.)   |

## Getting Started

### Prerequisites

- Rust toolchain
- cargo stylus
- pnpm
- Nitro Devnode

### Local Dev Workflow

1. **Start Nitro Devnode**

   Follow the [Nitro Devnode docs](https://docs.arbitrum.io/run-arbitrum-node/run-nitro-dev-node) to start the node locally.

2. **Deploy Contract with Cargo Stylus**

   ```bash
   cargo stylus deploy \
     --endpoint='http://localhost:8547' \
     --private-key='YOUR_DEVNODE_PRIVATE_KEY'
   ```
   Copy the deployed contract address from the output (e.g. 0xabc...123) and use it in the frontend config (`examples/timemint-demo-site/.env`).

3. **Run a Demo Frontend**

   - For the protocol demo site:
     ```bash
     pnpm install
     pnpm --filter timemint-demo-site dev
     ```
     Then open http://localhost:5173

   - For the component demo site:
     ```bash
     pnpm install
     pnpm --filter timemint-component-demo-site dev
     ```
     Then open http://localhost:5173

4. **Google Calendar Integration**

   - See the README in each demo site for Google OAuth setup instructions.
   - If you set `VITE_USE_GOOGLE_CALENDAR=false` in your `.env`, the demo will show simulated slots for booking.

## Key Packages & Examples

- **Smart Contract:**  
  See `contracts/` for the Rust Stylus contract.

- **React Component:**  
  See `packages/react-timemint-component/` for the reusable booking widget.

- **Demo Sites:**  
  - `examples/timemint-demo-site/`: Full protocol demo with admin panel, wallet connect, Google Calendar integration (or simulated slots), and extra UI for a complete user flow.
  - `examples/timemint-component-demo-site/`: Full demo using the React booking component, with admin panel and registration, focused on isolated component usage.

- **Serverless Functions:**  
  See `serverless-functions/` for backend integration examples.

## Contract Usage Examples

### 1. Registering a Site Creator (One-Time, Immutable)

Site creators must register their wallet for a unique `site_id` before any bookings can be made for their site. This can only be done once per `site_id` and cannot be changed.

```rust
// Only the creator wallet can register itself
register_site(site_id: String, creator: Address)
```

Example (using ethers.js):
```js
await contract.register_site("mysite.com", creatorWallet.address);
```

### 2. Setting the Booking Fee (Admin Only)

```rust
set_booking_fee(new_fee: U256)
```

### 3. Booking a Slot

```js
await contract.book_slot(
  "mysite.com",
  startTimestamp,
  endTimestamp,
  { value: ethers.utils.parseEther("0.0005") }
);
```

### 4. Withdrawing Earnings

```js
await contract.withdraw();
```

## Where to Go Next?

- **Want to build your own booking dApp?** Start with the React component.
- **Want to see the protocol in action?** Try the demo sites.
- **Want to hack on the smart contract?** Head to the `contracts/` directory.
- **Need a backend?** Check out the serverless functions.

For detailed instructions, see the README in each subdirectory.

## Project Structure

```bash
timemint-protocol/
├── contracts/                     # Stylus contract
├── packages/
│   └── react-timemint-component/  # React booking widget
└── examples/
    └── timemint-demo-site/        # Demo app without React component
    └── timemint-component-demo-site/        # Demo app with React component
```

## License
This project is licensed under the [MIT License](LICENSE).