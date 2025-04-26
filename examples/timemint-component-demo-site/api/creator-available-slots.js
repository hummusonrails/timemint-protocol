// Vercel serverless function: /api/creator-available-slots
// Returns site creator's available slots from Google Calendar using stored token

import { google } from 'googleapis';

let creatorToken = null; // In-memory for demo; should be persisted in production

// Read env variables (Vercel provides process.env)
const MAX_SLOTS = Number(process.env.VITE_MAX_BOOKING_SLOTS) || 10;
const START_HOUR = Number(process.env.VITE_BOOKING_START_HOUR) || 9;
const END_HOUR = Number(process.env.VITE_BOOKING_END_HOUR) || 17;
const BOOKING_DAYS = (process.env.VITE_BOOKING_DAYS || 'weekdays').toLowerCase();
const allowedDays = BOOKING_DAYS === 'weekdays' ? [1,2,3,4,5] : BOOKING_DAYS === 'weekends' ? [0,6] : [0,1,2,3,4,5,6];

export default async function handler(req, res) {
  // For demo: POST to /api/creator-google-auth to set token first
  if (!creatorToken) {
    // Try to fetch from /api/creator-google-auth
    const resp = await fetch('http://localhost:3000/api/creator-google-auth', { method: 'POST' });
    const data = await resp.json();
    creatorToken = data.token;
  }

  if (!creatorToken) {
    res.status(401).json({ error: 'Site creator not authenticated with Google Calendar.' });
    return;
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials(creatorToken);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  try {
    const now = new Date();
    const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    // Fetch all events for the next 2 weeks
    const eventsResp = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: twoWeeksLater.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500,
    });
    const events = (eventsResp.data.items || []).filter(ev => ev.start && ev.end && ev.start.dateTime && ev.end.dateTime);
    // Build a list of busy intervals
    const busy = events.map(ev => [
      new Date(ev.start.dateTime).getTime(),
      new Date(ev.end.dateTime).getTime()
    ]);
    // Generate slots
    const slots = [];
    outer: for (let d = new Date(now); d <= twoWeeksLater; d.setDate(d.getDate() + 1)) {
      if (!allowedDays.includes(d.getDay())) continue;
      for (let h = START_HOUR; h < END_HOUR; h++) {
        for (let m = 0; m < 60; m += 30) {
          const slotStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0);
          const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);
          if (slotEnd > twoWeeksLater) break outer;
          // Check if slot overlaps with any busy interval
          const overlaps = busy.some(([bStart, bEnd]) =>
            (slotStart.getTime() < bEnd && slotEnd.getTime() > bStart)
          );
          if (!overlaps && slotStart > now) {
            slots.push({
              start: Math.floor(slotStart.getTime() / 1000),
              end: Math.floor(slotEnd.getTime() / 1000)
            });
            if (slots.length >= MAX_SLOTS) break outer;
          }
        }
      }
    }
    res.status(200).json({ slots });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
