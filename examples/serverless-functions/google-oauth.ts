import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!; // e.g. https://yourdomain.com/api/google-oauth

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    // Step 1: Redirect to Google for consent
    const scopes = [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
    ];
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
    });
    res.redirect(url);
    return;
  }
  if (req.method === 'POST') {
    // Step 2: Exchange code for tokens
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Missing code' });
    try {
      const { tokens } = await oauth2Client.getToken(code);
      // Store tokens securely, or send a session token to the client
      // For demo: just return access_token (do NOT do this in production)
      res.status(200).json({ access_token: tokens.access_token, refresh_token: tokens.refresh_token });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
