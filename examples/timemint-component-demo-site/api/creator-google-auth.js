// Vercel serverless function: /api/creator-google-auth
// Handles Google OAuth for site creator and stores access token securely (for demo: in-memory)

import { google } from 'googleapis';

let creatorToken = null; // In-memory for demo; production should use a DB

export default async function handler(req, res) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/creator-google-auth` : 'http://localhost:3000/api/creator-google-auth'
  );

  if (req.method === 'GET' && req.query.code) {
    // OAuth callback
    const { tokens } = await oauth2Client.getToken(req.query.code);
    creatorToken = tokens;
    res.redirect('/admin');
  } else if (req.method === 'GET') {
    // Start OAuth flow
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.events.readonly'],
      prompt: 'consent',
    });
    res.redirect(url);
  } else if (req.method === 'POST') {
    // For demo: return token
    res.status(200).json({ token: creatorToken });
  } else {
    res.status(405).end();
  }
}
