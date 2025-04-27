# Serverless Functions for Secure Google Calendar Integration

## ⚡️ TimeMint Smart Contract Usage

### Registering a Site Creator
Register a unique site_id and wallet address (immutable):
```js
await contract.register_site("mysite.com", creatorWallet.address);
```

### Booking a Slot
Book a slot for a site and split the fee:
```js
await contract.book_slot(
  "mysite.com",
  startTimestamp,
  endTimestamp,
  { value: ethers.utils.parseEther("0.0005") }
);
```

### Withdrawing Earnings
Creators and admin can withdraw:
```js
await contract.withdraw();
```

---

This folder contains example Vercel-compatible serverless functions for securely handling Google OAuth and Calendar event creation. Use these as a backend for your TimeMintBooking React widget or any similar integration.

## Files

### 1. `google-oauth.ts`
- **Purpose:** Handles Google OAuth2 authentication securely on the backend.
- **How it works:**
  - `GET` requests redirect the user to Google's OAuth consent screen.
  - `POST` requests exchange the returned authorization code for access/refresh tokens (never exposes your client secret to the browser).
- **Environment variables required:**
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI` (must match your OAuth app settings)

### 2. `book-slot.ts`
- **Purpose:** Creates a Google Calendar event on behalf of an authenticated user.
- **How it works:**
  - Expects a `POST` request with `{ access_token, slot, email }` in the body.
  - Uses the access token to create a calendar event with the booking details and sends an invite to the specified email.
- **Environment variables required:**
  - Same as above: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

## Usage

1. **Deploy these files to `/api` in your Vercel (or similar) project.**
2. **Set the required environment variables in your deployment platform.**
3. **Update your frontend to call these endpoints for Google login and booking.**
   - For example, in TimeMintBooking, use `/api/google-oauth` for OAuth and `/api/book-slot` for event creation.

**Note:**
- Never expose your Google client secret or refresh tokens in the frontend.
- You may want to add session management or wallet signature verification for extra security in production.
