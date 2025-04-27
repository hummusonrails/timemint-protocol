import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI!;

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { access_token, slot, email } = req.body;
  if (!access_token || !slot || !email) return res.status(400).json({ error: 'Missing required fields' });
  try {
    oauth2Client.setCredentials({ access_token });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const event = {
      summary: 'TimeMint Booking',
      description: 'Booking made via TimeMint',
      start: { dateTime: new Date(slot.start * 1000).toISOString() },
      end: { dateTime: new Date(slot.end * 1000).toISOString() },
      attendees: [{ email }],
      guestsCanSeeOtherGuests: false,
    };
    const resp = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all',
    });
    res.status(200).json({ eventId: resp.data.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
