# TimeMint Demo Site

A React + Vite demo frontend for the TimeMint protocol.

## Smart Contract Usage

### Registering a Site Creator
```js
await contract.register_site("mysite.com", creatorWallet.address);
```

### Booking a Slot
```js
await contract.book_slot(
  "mysite.com",
  startTimestamp,
  endTimestamp,
  { value: ethers.utils.parseEther("0.0005") }
);
```

### Withdrawing Earnings
```js
await contract.withdraw();
```

## ⚠️ Security Warning

This demo site is for demonstration purposes only. All Google Calendar OAuth tokens are handled client-side and exposed in the browser. **Do not use with sensitive or production Google accounts.**

## What is TimeMint?

TimeMint is a decentralized protocol for tokenizing Google Calendar bookings on chain using Arbitrum Stylus. This demo site lets you:

- Connect your wallet
- View simulated available time slots
- Simulate booking slots securely using a smart contract deployed on Arbitrum
- Manage your bookings

## Features

- **Connect Wallet:** Securely connect with MetaMask or any EVM-compatible wallet
- **Available Slots:** View and book simulated time slots
- **Your Slots:** See your booked slots and slot details

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- pnpm

### Install & Run

```bash
pnpm install
pnpm dev
```

Or with npm:
```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Google OAuth Setup Instructions

To enable Google Calendar integration for the demo, follow these steps:

1. **Create a Google Cloud Project:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials) and create a new project or select an existing one.

2. **Enable Google Calendar API:**
   - In the left sidebar, navigate to "APIs & Services" > "Library".
   - Search for "Google Calendar API" and click "Enable".

3. **Create OAuth 2.0 Credentials:**
   - Go to "APIs & Services" > "Credentials".
   - Click "+ Create Credentials" > "OAuth client ID".
   - Choose "Web application".
   - Set the authorized JavaScript origin to your dev environment (e.g., `http://localhost:5173`).
   - Set the redirect URI if required (for implicit flow, only the origin is needed).
   - Click "Create" and copy your Client ID.

4. **Set OAuth Consent Screen to Testing:**
   - In the left sidebar, click "OAuth consent screen".
   - Set the app to "Testing" mode.
   - Add your Google account(s) under "Test users" (only these users can use OAuth while in testing mode, up to 100 users).

5. **Configure Scopes:**
   - When creating the OAuth client, select the following scope:
     - `.../auth/calendar.events` ("View and edit events on all your calendars")
   - This scope is required to read free/busy slots and create events.

6. **Add Your Client ID to the .env File:**
   - In your `.env` file, set:
     ```
     VITE_GOOGLE_CLIENT_ID=your-client-id-here
     ```

7. **Restart the dev server** after updating `.env`.

## 🛠️ Admin Panel & Site Creator Setup

### New Admin Panel
- The demo site includes an **Admin Panel** accessible from the main page.
- Site creators can:
  - Connect their wallet
  - Connect their Google Calendar via OAuth
  - Register their site (site ID + wallet address) on chain
  - Navigate back to the main booking page easily

### Associating a Site Creator with a Site ID
- Each site must be registered on chain by the creator using a unique `site_id` (e.g., domain name or project name).
- To register:
```js
await contract.register_site("mysite.com", creatorWallet.address);
```
- This is a one-time, immutable operation. Bookings require the correct `site_id`.

### Slot Availability Logic
- The site fetches events from the creator's Google Calendar for the next 2 weeks.
- Only **30-minute slots** within allowed booking days/hours (`VITE_BOOKING_DAYS`, `VITE_BOOKING_START_HOUR`, `VITE_BOOKING_END_HOUR`) are shown.
- Slots that overlap with existing calendar events are excluded.
- Up to `VITE_MAX_BOOKING_SLOTS` are displayed.

### Environment Variables
Add these to your `.env`:
```
VITE_TIMEMINT_CONTRACT_ADDRESS=...
VITE_GOOGLE_CLIENT_ID=...
VITE_USE_GOOGLE_CALENDAR=true
VITE_MAX_BOOKING_SLOTS=10
VITE_BOOKING_START_HOUR=9
VITE_BOOKING_END_HOUR=17
VITE_BOOKING_DAYS=weekdays
VITE_TIMEMINT_SITE_ID=your-site-id
```

> **Note:**
> - If `VITE_USE_GOOGLE_CALENDAR` is set to `false`, the site displays simulated 30-minute slots for the next 2 weeks (demo mode, not synced to Google Calendar).
> - If set to `true`, the site will show real-time Google Calendar availability and exclude busy times.

## 🗒️ Usage Summary
- **Main Page:** Users can connect their wallet and book available slots.
- **Admin Panel:** Site creators manage their calendar, connect Google, and register their site.
- **Wallet Connection:** Both users and site creators can connect their wallet for booking or admin actions.

## Environment Variables

| Variable Name              | Example Value | Description |
|---------------------------|---------------|-------------|
| `VITE_CONTRACT_ADDRESS` | `0x...` | Address of the TimeMint smart contract on Arbitrum |
| `VITE_GOOGLE_CLIENT_ID`   | *(see above)* | Google OAuth client ID for Calendar integration |
| `VITE_USE_GOOGLE_CALENDAR`| `true` or `false` | Enable (true) or disable (false) Google Calendar integration |
| `VITE_MAX_BOOKING_SLOTS`  | `5`           | Maximum number of booking slots to display |
| `VITE_BOOKING_START_HOUR` | `9`           | Start hour (24h, local time) for bookable slots (e.g., 9 for 9am) |
| `VITE_BOOKING_END_HOUR`   | `17`          | End hour (24h, local time) for bookable slots (e.g., 17 for 5pm) |
| `VITE_BOOKING_DAYS`       | `weekdays` or `all` | `weekdays` for Mon-Fri only, `all` to include weekends |
| `VITE_TIMEMINT_SITE_ID`   | `your-site-id` | Unique site ID for site creator registration |

**Notes:**
- All times shown in the UI are in the site visitor's local browser time zone (displayed above the slots).
- Slots are generated in 30-minute increments, within the defined hours and days, and do not overlap with existing calendar events.
- Insecure demo: All OAuth tokens are handled client-side. Do not use with sensitive accounts.
- If your OAuth app is in testing mode, only users added as test users in the Google Cloud Console can log in.

## Project Structure

- `src/App.jsx` — Main application UI and logic
- `src/index.css` — Tailwind CSS imports
- `tailwind.config.cjs` — Tailwind configuration
