# TimeMint Component Demo Site

This site demonstrates the usage of the TimeMintBooking React component in isolation. It is intended for developers who want to test or integrate the booking widget into their own dApps with minimal setup and no extra protocol demo logic.

## Purpose

The component demo site allows you to:
- Register your site as a creator on-chain using a simple UI helper
- Book and manage slots via the TimeMintBooking React component
- Optionally connect Google Calendar for real-time slot availability
- Connect with MetaMask or any EVM-compatible wallet

All booking and Google Calendar logic is encapsulated in the component itself. This site is focused on demonstrating the booking widget and does not include protocol admin panels or extra UI found in the full demo site.

## Features

- Site registration helper for on-chain creator setup
- Fully interactive booking widget using the published React component
- Google Calendar integration (optional, via OAuth)
- Wallet connect for EVM-compatible wallets
- Minimal UI for easy integration reference

## Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or pnpm

### Installation and Running

Install dependencies and start the local dev server:

```bash
npm install
npm run dev
```

Or with pnpm:

```bash
pnpm install
pnpm dev
```

The app will be available at `http://localhost:5173` (default Vite port).

## Environment Variables

This demo site is built with Vite. You must set the following variables in a `.env` file at the project root:

```
VITE_CONTRACT_ADDRESS=0x...
VITE_SITE_ID=mysite.com
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_USE_GOOGLE_CALENDAR=true
VITE_MAX_BOOKING_SLOTS=5
VITE_BOOKING_START_HOUR=9
VITE_BOOKING_END_HOUR=17
VITE_BOOKING_DAYS=weekdays
```

- `VITE_CONTRACT_ADDRESS`: Address of the deployed TimeMint smart contract
- `VITE_SITE_ID`: Unique site identifier (e.g., domain or project name)
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth client ID for Calendar integration (optional)
- `VITE_USE_GOOGLE_CALENDAR`: `true` to enable Google Calendar integration, `false` for simulated slots
- `VITE_MAX_BOOKING_SLOTS`: Maximum number of booking slots to display
- `VITE_BOOKING_START_HOUR`: Start hour (24h, local time) for bookable slots
- `VITE_BOOKING_END_HOUR`: End hour (24h, local time) for bookable slots
- `VITE_BOOKING_DAYS`: `weekdays` for Mon-Fri only, `all` to include weekends

## Usage

After starting the app, use the UI to register your site ID as a creator, connect your wallet, and test the booking widget. You can enable or disable Google Calendar integration via the environment variable above.

## Reference

This site uses the `@timemint/react-timemint-component` package from the monorepo. For advanced usage or integration details, see the package's README or the full protocol demo site for a complete user flow.

## License

This project is licensed under the MIT License. See the root LICENSE file for details.
