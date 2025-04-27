# Examples

This directory contains demo sites and serverless functions to help you integrate and test the TimeMint Protocol.

## Demo Sites

- **timemint-demo-site/**: Full protocol demo with admin panel, wallet connect, Google Calendar integration (or simulated slots), and extra UI for a complete user flow.
- **timemint-component-demo-site/**: Full demo using the React booking component, with admin panel and registration, focused on isolated component usage. Minimal UI, ideal for integration in your own dApp.

Both demo sites support:
- Wallet connection (MetaMask or EVM-compatible wallets)
- Booking and managing slots (real or simulated, depending on env config)
- Site creator registration and admin panel
- Google Calendar integration (with `VITE_USE_GOOGLE_CALENDAR=true`) or simulated slots for demo/testing

**Choose the one that matches your use case:**
- For a full protocol and user flow demo: use `timemint-demo-site`.
- For minimal, embeddable booking UI: use `timemint-component-demo-site`.

## Serverless Functions (`serverless-functions`)

- Example Vercel-compatible serverless functions for secure Google OAuth and Google Calendar event creation.
- Use these as a template for production-grade, backend-secured integrations.
- See `google-oauth.ts` and `book-slot.ts` for reference implementations.
