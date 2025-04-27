# @timemint/react-timemint-component

This package provides a plug-and-play React component for decentralized calendar bookings using the TimeMint Protocol. Integrate Web3 calendar bookings and Google Calendar invites into your React app with minimal setup.

## Features

- Book and manage time slots onchain as NFTs
- Wallet connection (MetaMask or any EVM-compatible wallet)
- Google Calendar integration (optional, via OAuth)
- Support for simulated slots when Google Calendar is disabled
- Site creator registration and admin panel
- Customizable booking parameters (days, hours, slot length, etc.)
- Works with any TimeMint-compatible smart contract

## Installation

Install the package using npm or pnpm:

```bash
npm install @timemint/react-timemint-component ethers
# or
pnpm add @timemint/react-timemint-component ethers
```

## Usage

Import and render the booking component in your React app:

```jsx
import { TimeMintBooking } from '@timemint/react-timemint-component';

function App() {
  return (
    <TimeMintBooking
      contractAddress={import.meta.env.VITE_CONTRACT_ADDRESS}
      siteId={import.meta.env.VITE_SITE_ID}
      googleClientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
      useGoogleCalendar={import.meta.env.VITE_USE_GOOGLE_CALENDAR === 'true'}
      bookingStartHour={9}
      bookingEndHour={17}
      bookingDays="weekdays"
      maxBookingSlots={10}
    />
  );
}
```

## Environment Variables

You must set the following environment variables to configure the booking component. The required prefix depends on your build tool:

- **For Vite apps:** use the `VITE_` prefix (e.g., `VITE_CONTRACT_ADDRESS`)
- **For Create React App:** use the `REACT_APP_` prefix (e.g., `REACT_APP_CONTRACT_ADDRESS`)

| Variable Name                                         | Description                                               |
|------------------------------------------------------|----------------------------------------------------------|
| VITE_CONTRACT_ADDRESS / REACT_APP_CONTRACT_ADDRESS    | Address of the deployed TimeMint smart contract           |
| VITE_SITE_ID / REACT_APP_SITE_ID                      | Unique site identifier (e.g., domain or project name)     |
| VITE_GOOGLE_CLIENT_ID / REACT_APP_GOOGLE_CLIENT_ID    | Google OAuth client ID for Calendar integration (optional)|
| VITE_USE_GOOGLE_CALENDAR / REACT_APP_USE_GOOGLE_CALENDAR | `true` to enable Google Calendar integration, `false` for simulated slots |

How to use in code:
- In Vite: `import.meta.env.VITE_CONTRACT_ADDRESS`
- In CRA: `process.env.REACT_APP_CONTRACT_ADDRESS`

If you pass these values directly as props to the component, you can use any variable name you want.

Example for Vite `.env`:
```
VITE_CONTRACT_ADDRESS=0x...
VITE_SITE_ID=mysite.com
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_USE_GOOGLE_CALENDAR=true
```

Example for Create React App `.env`:
```
REACT_APP_CONTRACT_ADDRESS=0x...
REACT_APP_SITE_ID=mysite.com
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
REACT_APP_USE_GOOGLE_CALENDAR=true
```

## Smart Contract Usage

### Registering a Site Creator
Before any bookings, the creator must register their wallet address for a unique `site_id`:

```js
await contract.register_site("mysite.com", creatorWallet.address);
```

### Booking a Slot
Bookings require the `site_id` and payment of the booking fee:

```js
await contract.book_slot(
  "mysite.com",
  startTimestamp,
  endTimestamp,
  { value: ethers.utils.parseEther("0.0005") }
);
```

### Withdrawing Earnings
Creators and admin can withdraw their balances:

```js
await contract.withdraw();
```

## Customization

You can customize the booking widget by passing additional props or styling it with CSS. Refer to the component source or the demo site for advanced usage examples.

## Example Demo Site

See `examples/timemint-component-demo-site` in this monorepo for a full working demo and integration reference.

## License

This package is licensed under the MIT License. See the root LICENSE file for details.