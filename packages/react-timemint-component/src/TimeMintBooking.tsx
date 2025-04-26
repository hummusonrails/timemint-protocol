import React, { useState, useEffect } from 'react';
import { getProvider, getContract, requestAccount } from './web3';

export interface TimeMintBookingProps {
  contractAddress: string;
  siteId: string; // NEW: required for secure booking
  useGoogleCalendar?: boolean;
  maxBookingSlots?: number;
  bookingStartHour?: number;
  bookingEndHour?: number;
  bookingDays?: 'weekdays' | 'all';
  className?: string;
  style?: React.CSSProperties;
}

interface Slot {
  start: number; // unix timestamp (seconds)
  end: number;   // unix timestamp (seconds)
  summary?: string;
}

const getBrowserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function TimeMintBooking({
  contractAddress,
  siteId,
  useGoogleCalendar = false,
  maxBookingSlots = 5,
  bookingStartHour = 9,
  bookingEndHour = 17,
  bookingDays = 'weekdays',
  className = '',
  style = {},
}: TimeMintBookingProps) {
  const [account, setAccount] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [userEmail, setUserEmail] = useState<string>('');
  const [txStatus, setTxStatus] = useState<string>('');
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  // Secure OAuth: redirect to backend for Google login
  async function startGoogleOAuth() {
    window.location.href = '/api/google-oauth';
  }

  // Secure booking: call backend to create calendar event
  async function createCalendarEvent(slot: Slot, email: string, accessToken: string) {
    try {
      const resp = await fetch('/api/book-slot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken, slot, email }),
      });
      if (!resp.ok) throw new Error((await resp.json()).error || 'Failed to create event');
      return await resp.json();
    } catch (err: any) {
      throw new Error('Failed to create event: ' + (err?.message || err));
    }
  }

  // Wallet connect handler
  async function connectWallet() {
    try {
      const addr = await requestAccount();
      setAccount(addr);
      setTxStatus('Wallet connected');
      fetchUserSlots(addr);
    } catch (err: any) {
      setTxStatus('Wallet connection failed: ' + (err?.message || err));
    }
  }

  // Fetch slots owned by user (after connect or booking)
  async function fetchUserSlots(addr: string) {
    try {
      const contract = await getContract(undefined, contractAddress);
      const slotIds: any[] = await contract.slotsOfOwner(addr);
      // Optionally: fetch slotMetadata for each slot
      // const slots = await Promise.all(slotIds.map(async (id) => ... ))
      // setUserSlots(slots)
    } catch (err: any) {
      setTxStatus('Failed to fetch your slots: ' + (err?.message || err));
    }
  }

  useEffect(() => {
    if (!useGoogleCalendar || !googleToken) {
      const now = new Date();
      const slots: Slot[] = [];
      let start = new Date(now);
      start.setHours(bookingStartHour, 0, 0, 0);
      for (let i = 0; i < maxBookingSlots; i++) {
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + 30);
        slots.push({
          start: start.getTime() / 1000,
          end: end.getTime() / 1000,
          summary: 'Available',
        });
        start.setMinutes(start.getMinutes() + 30);
      }
      setAvailableSlots(slots);
      return;
    }
    async function fetchGoogleCalendarSlots() {
      setTxStatus('Loading calendar events...');
      try {
        const minTime = new Date();
        minTime.setMinutes(minTime.getMinutes() + 5);
        const maxTime = new Date(minTime.getTime() + 7 * 24 * 60 * 60 * 1000);
        const resp = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${minTime.toISOString()}&timeMax=${maxTime.toISOString()}&singleEvents=true&orderBy=startTime`, {
          headers: { Authorization: `Bearer ${googleToken}` },
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error?.message || 'Failed to fetch events');
        const events = (data.items || [])
          .filter((event: any) => event.start && event.end)
          .sort((a: any, b: any) => new Date(a.start.dateTime || a.start.date).getTime() - new Date(b.start.dateTime || b.start.date).getTime());
        const slots: Slot[] = [];
        let current = new Date(minTime);
        while (slots.length < maxBookingSlots && current < maxTime) {
          const slotStart = new Date(current);
          slotStart.setSeconds(0, 0);
          slotStart.setMinutes(slotStart.getMinutes() - (slotStart.getMinutes() % 30));
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + 30);
          const isWeekday = slotStart.getDay() >= 1 && slotStart.getDay() <= 5;
          const isAllowedDay = bookingDays === 'all' || (bookingDays === 'weekdays' && isWeekday);
          const crossesMidnight = slotEnd.getDate() !== slotStart.getDate();
          if (
            slotStart.getHours() >= bookingStartHour &&
            slotEnd.getHours() <= bookingEndHour &&
            slotEnd > slotStart &&
            slotEnd <= maxTime &&
            isAllowedDay &&
            !crossesMidnight
          ) {
            const overlaps = events.some((event: any) => {
              const eventStart = new Date(event.start.dateTime || event.start.date);
              const eventEnd = new Date(event.end.dateTime || event.end.date);
              return slotStart < eventEnd && slotEnd > eventStart;
            });
            if (!overlaps) {
              slots.push({
                start: slotStart.getTime() / 1000,
                end: slotEnd.getTime() / 1000,
                summary: 'Available',
              });
            }
          }
          current.setMinutes(current.getMinutes() + 30);
        }
        setAvailableSlots(slots.slice(0, maxBookingSlots));
        setTxStatus('');
      } catch (err: any) {
        setTxStatus('Failed to load calendar events: ' + err.message);
        setAvailableSlots([]);
      }
    }
    fetchGoogleCalendarSlots();
  }, [useGoogleCalendar, googleToken, maxBookingSlots, bookingStartHour, bookingEndHour, bookingDays]);

  // Book slot using contract (now uses siteId)
  async function bookSlot(slot: Slot, email: string) {
    setTxStatus('Booking...');
    try {
      if (!account) {
        setTxStatus('Please connect your wallet');
        return;
      }
      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = await getContract(signer, contractAddress);
      // NEW: call book_slot(siteId, start, end) with fee
      const fee = await contract.booking_fee();
      const tx = await contract.book_slot(siteId, slot.start, slot.end, { value: fee });
      await tx.wait();
      setTxStatus('Slot booked!');
      setAvailableSlots(availableSlots.filter(s => s.start !== slot.start || s.end !== slot.end));
      fetchUserSlots(account);
      if (useGoogleCalendar && googleToken) {
        setTxStatus('Creating calendar event...');
        await createCalendarEvent(slot, email, googleToken);
        setTxStatus('Calendar event created and invite sent!');
      }
    } catch (err: any) {
      setTxStatus('Booking failed: ' + (err?.message || err));
    }
  }

  return (
    <div className={className} style={style}>
      <h2 style={{ fontWeight: 800, fontSize: 24, color: '#38bdf8', marginBottom: 12 }}>TimeMint Booking Widget</h2>
      {!account && (
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={connectWallet}
            style={{ padding: '10px 24px', borderRadius: 8, background: 'linear-gradient(90deg,#38bdf8,#2563eb)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 16 }}
          >
            Connect Wallet
          </button>
        </div>
      )}
      {useGoogleCalendar && !googleToken && (
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={startGoogleOAuth}
            style={{ padding: '10px 24px', borderRadius: 8, background: 'linear-gradient(90deg,#38bdf8,#2563eb)', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 16 }}
          >
            Connect Google Calendar
          </button>
        </div>
      )}
      <div style={{ color: '#38bdf8', fontSize: 14, marginBottom: 8 }}>
        All times shown are in your local time zone: <b>{getBrowserTimeZone()}</b>
      </div>
      {txStatus && <div style={{ marginBottom: 12, color: '#facc15', fontWeight: 600 }}>{txStatus}</div>}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {availableSlots.map((slot, idx) => (
          <li key={idx} style={{ display: 'flex', alignItems: 'center', background: '#1e293b', borderRadius: 8, padding: 14, marginBottom: 10 }}>
            <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 15, color: '#e0e7ef' }}>
              {new Date(slot.start * 1000).toLocaleString()} → {new Date(slot.end * 1000).toLocaleString()}
            </span>
            <input
              type="email"
              placeholder="Your email for invite"
              value={userEmail}
              onChange={e => setUserEmail(e.target.value)}
              style={{ marginRight: 10, padding: 6, borderRadius: 4, border: '1px solid #38bdf8', background: '#22223b', color: '#fff' }}
              required
            />
            <button
              onClick={() => bookSlot(slot, userEmail)}
              disabled={!userEmail || !account}
              style={{ padding: '6px 18px', borderRadius: 6, background: '#38bdf8', color: '#14213d', fontWeight: 700, border: 'none', cursor: !userEmail || !account ? 'not-allowed' : 'pointer', opacity: !userEmail || !account ? 0.5 : 1 }}
            >
              Book
            </button>
          </li>
        ))}
        {availableSlots.length === 0 && <li style={{ color: '#38bdf8' }}>No available slots</li>}
      </ul>
    </div>
  );
}

export function TimeMintBookingProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
