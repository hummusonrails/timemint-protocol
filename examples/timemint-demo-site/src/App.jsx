import { useState, useEffect } from 'react';
import { getProvider, getContract } from './web3';
import { useGoogleLogin } from '@react-oauth/google';

const SITE_ID = import.meta.env.VITE_TIMEMINT_SITE_ID || "mysite.com";

function App() {
  // Wallet and account state
  const [account, setAccount] = useState('');
  const [registerStatus, setRegisterStatus] = useState('');
  const [txStatus, setTxStatus] = useState('');

  // Slots state
  const [availableSlots, setAvailableSlots] = useState([]); // slots to book (simulate or from calendar)
  const [mySlots, setMySlots] = useState([]); // slots user owns (from contract)
  const [slotDetails, setSlotDetails] = useState({}); // slotId -> {creator, start, end}
  const [expandedSlot, setExpandedSlot] = useState(null);

  // Booking input
  const [bookingEmail, setBookingEmail] = useState('');

  // Wallet connect
  async function connectWallet() {
    setRegisterStatus('Connecting wallet...');
    try {
      const provider = getProvider();
      const accounts = await provider.send('eth_requestAccounts', []);
      setAccount(accounts[0]);
      setRegisterStatus('Wallet connected: ' + accounts[0]);
      fetchMySlots(accounts[0]);
    } catch (err) {
      setRegisterStatus('Wallet connection failed');
    }
  }

  // Site registration helper (new contract feature)
  async function registerSite() {
    setRegisterStatus('Registering site...');
    try {
      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = await getContract(signer);
      const tx = await contract.registerSite(SITE_ID, account);
      await tx.wait();
      setRegisterStatus('Site registered successfully!');
    } catch (err) {
      setRegisterStatus('Site registration failed: ' + (err?.message || err));
    }
  }

  // Fetch user's slots from contract (new ABI)
  async function fetchMySlots(addr) {
    try {
      const contract = await getContract();
      const slotIds = await contract.slotsOfOwner(addr);
      setMySlots(slotIds.map(id => id.toString()));
      fetchSlotDetails(slotIds);
    } catch (err) {
      setTxStatus('Failed to fetch slots');
    }
  }

  // Fetch slot metadata for each slot
  async function fetchSlotDetails(slotIds) {
    const contract = await getContract();
    const details = {};
    for (const id of slotIds) {
      try {
        const [creator, start, end] = await contract.slotMetadata(id);
        details[id] = { creator, start: start.toString(), end: end.toString() };
      } catch (err) {
        details[id] = { creator: '', start: '', end: '' };
      }
    }
    setSlotDetails(details);
  }

  // Fetch available slots using site creator's Google Calendar token from localStorage
  useEffect(() => {
    const USE_GOOGLE = String(import.meta.env.VITE_USE_GOOGLE_CALENDAR).toLowerCase() === 'true';
    const MAX_SLOTS = Number(import.meta.env.VITE_MAX_BOOKING_SLOTS) || 10;
    const START_HOUR = Number(import.meta.env.VITE_BOOKING_START_HOUR) || 9;
    const END_HOUR = Number(import.meta.env.VITE_BOOKING_END_HOUR) || 17;
    const BOOKING_DAYS = (import.meta.env.VITE_BOOKING_DAYS || 'weekdays').toLowerCase();
    const allowedDays = BOOKING_DAYS === 'weekdays' ? [1,2,3,4,5] : BOOKING_DAYS === 'weekends' ? [0,6] : [0,1,2,3,4,5,6];
    const now = new Date();
    const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    if (!USE_GOOGLE) {
      // Simulated slots: generate as if calendar is empty
      const slots = [];
      outer: for (let d = new Date(now); d <= twoWeeksLater; d.setDate(d.getDate() + 1)) {
        if (!allowedDays.includes(d.getDay())) continue;
        for (let h = START_HOUR; h < END_HOUR; h++) {
          for (let m = 0; m < 60; m += 30) {
            const slotStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0);
            const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);
            if (slotEnd > twoWeeksLater) break outer;
            if (slotStart > now) {
              slots.push({
                start: Math.floor(slotStart.getTime() / 1000),
                end: Math.floor(slotEnd.getTime() / 1000)
              });
              if (slots.length >= MAX_SLOTS) break outer;
            }
          }
        }
      }
      setAvailableSlots(slots);
      return;
    }

    // Google Calendar logic (as before)
    const creatorGoogleToken = localStorage.getItem('creator_google_token') || import.meta.env.VITE_CREATOR_GOOGLE_TOKEN;
    if (!creatorGoogleToken) return;
    fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${twoWeeksLater.toISOString()}&singleEvents=true&orderBy=startTime`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${creatorGoogleToken}`,
        'Content-Type': 'application/json',
      },
    })
      .then(resp => resp.json())
      .then(data => {
        const events = (data.items || []).filter(ev => ev.start && ev.end && ev.start.dateTime && ev.end.dateTime);
        const busy = events.map(ev => [
          new Date(ev.start.dateTime).getTime(),
          new Date(ev.end.dateTime).getTime()
        ]);
        const slots = [];
        outer: for (let d = new Date(now); d <= twoWeeksLater; d.setDate(d.getDate() + 1)) {
          if (!allowedDays.includes(d.getDay())) continue;
          for (let h = START_HOUR; h < END_HOUR; h++) {
            for (let m = 0; m < 60; m += 30) {
              const slotStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0);
              const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);
              if (slotEnd > twoWeeksLater) break outer;
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
        setAvailableSlots(slots);
      })
      .catch(err => console.error(err));
  }, []);

  // Book a slot (new contract feature)
  async function bookSlot(slot, email) {
    setTxStatus('Booking...');
    try {
      const provider = getProvider();
      const signer = await provider.getSigner();
      const contract = await getContract(signer);
      const fee = await contract.bookingFee();
      const tx = await contract.bookSlot(SITE_ID, slot.start, slot.end, { value: fee });
      await tx.wait();
      setTxStatus('Slot booked!');
      fetchMySlots(account);
      setAvailableSlots(availableSlots.filter(s => s.start !== slot.start || s.end !== slot.end));
    } catch (err) {
      setTxStatus('Booking failed: ' + (err?.message || err));
    }
  }

  function formatTimestamp(ts) {
    if (!ts) return '';
    const date = new Date(Number(ts) * 1000);
    return date.toLocaleString();
  }

  function getGoogleCalendarLink(slot) {
    if (!slot || !slot.start || !slot.end) return '#';
    const start = new Date(Number(slot.start) * 1000).toISOString().replace(/[-:]|\.\d{3}/g, '').slice(0, 15);
    const end = new Date(Number(slot.end) * 1000).toISOString().replace(/[-:]|\.\d{3}/g, '').slice(0, 15);
    const text = encodeURIComponent('TimeMint Slot');
    const details = encodeURIComponent('Booked via TimeMint');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}`;
  }

  function handleDetailsClick(tokenId) {
    if (expandedSlot === tokenId) {
      setExpandedSlot(null);
      return;
    }
    setExpandedSlot(tokenId);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800 font-sans">
      <header className="backdrop-blur-md bg-gradient-to-r from-blue-500/80 to-blue-900/80 border-b border-blue-700 shadow-2xl flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-4">
          <img src="/logo.svg" alt="TimeMint Logo" className="h-12 w-12 rounded-lg bg-white/10 p-2 border-2 border-blue-400 shadow-lg" />
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-blue-400 to-blue-600 drop-shadow-glow animate-pulse">TimeMint</h1>
        </div>
        <span className="text-blue-100 font-semibold text-xl tracking-widest uppercase drop-shadow">Tokenizing Time</span>
      </header>
      <main className="relative max-w-2xl mx-auto mt-12 bg-gradient-to-br from-blue-900/90 to-gray-900/90 rounded-3xl shadow-2xl p-10 border border-blue-700/80 backdrop-blur-md overflow-hidden">
        <div className="flex justify-end mb-4">
          <a href="/admin" className="text-blue-300 underline font-semibold hover:text-blue-100 transition">Admin Panel</a>
        </div>
        {/* Wallet connect for site user */}
        {!account && (
          <button
            onClick={connectWallet}
            className="mb-4 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-400 text-white rounded-lg font-bold shadow hover:from-blue-400 hover:to-blue-600 hover:scale-105 active:scale-95 transition-all border border-blue-600 text-lg"
          >
            Connect Wallet
          </button>
        )}
        {/* HERO SECTION */}
        <section className="mb-10 relative z-10">
          <div className="w-full bg-gradient-to-r from-blue-800/80 via-blue-700/80 to-blue-900/80 rounded-2xl border border-blue-500/70 shadow-xl p-6 md:p-8 backdrop-blur-md flex flex-col items-start gap-2 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-blue-400 to-blue-600 drop-shadow-glow mb-2">TimeMint: Tokenizing Time</h2>
            <p className="text-blue-200 text-lg mb-2 max-w-2xl">TimeMint is a decentralized protocol for tokenizing Google Calendar bookings on chain using Arbitrum Stylus. This demo lets you connect your wallet, view and book available slots all powered by your calendar.</p>
            <div className="bg-yellow-900/70 border border-yellow-400/70 text-yellow-200 font-semibold rounded-lg px-4 py-2 mt-2 shadow-md animate-pulse">
              <strong>⚠️ Security Warning:</strong> This demo is for demonstration purposes only. All Google Calendar OAuth tokens are handled client-side and exposed in the browser. <span className="underline">Do not use with sensitive or production Google accounts.</span>
            </div>
          </div>
        </section>
        <div className="mb-10">
          <h2 className="text-2xl font-black text-blue-300 mb-4 tracking-wide uppercase">Available Slots</h2>
          <div className="text-blue-400 text-sm mb-2">
            All times shown are in your local time zone: <span className="font-bold">{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
          </div>
          <ul className="space-y-4">
            {availableSlots.map((slot, idx) => (
              <li key={idx} className="flex flex-col md:flex-row md:items-center md:justify-between bg-gradient-to-r from-blue-800/80 to-blue-700/80 rounded-xl p-4 border border-blue-500/60 shadow-lg hover:shadow-blue-500/30 transition-shadow">
                <span className="text-blue-100 font-mono text-base">
                  {formatTimestamp(slot.start)} → {formatTimestamp(slot.end)}
                </span>
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-3 md:mt-0 md:ml-6">
                  <input
                    type="email"
                    placeholder="Your email for invite"
                    value={bookingEmail}
                    onChange={e => setBookingEmail(e.target.value)}
                    className="px-3 py-2 rounded-md border border-blue-500 bg-gray-900/60 text-blue-100 placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/70 transition text-sm"
                    required
                  />
                  <button
                    onClick={() => bookSlot(slot, bookingEmail)}
                    disabled={!account || !bookingEmail}
                    className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-400 text-white rounded-lg font-bold shadow hover:from-blue-400 hover:to-blue-600 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-blue-600"
                  >
                    Book
                  </button>
                </div>
              </li>
            ))}
            {availableSlots.length === 0 && <li className="text-blue-300">No available slots</li>}
          </ul>
        </div>
        <div>
          <h2 className="text-2xl font-black text-blue-300 mb-4 tracking-wide uppercase">Your Slots</h2>
          <ul className="space-y-4">
            {mySlots.map(id => (
              <li key={id} className="bg-gradient-to-r from-blue-900/80 to-blue-800/70 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between border border-blue-700/70 shadow-lg relative">
                <div className="mb-3 md:mb-0">
                  <span className="font-bold text-blue-400">Slot:</span>
                  <span className="ml-2 text-blue-100 font-mono">{formatTimestamp(slotDetails[id]?.start)} - {formatTimestamp(slotDetails[id]?.end)}</span>
                </div>
                {expandedSlot !== id && (
                  <button
                    className="ml-0 md:ml-4 px-5 py-2 rounded-lg font-bold transition-all border border-blue-600 shadow bg-blue-500 text-white hover:bg-blue-700 hover:scale-105 active:scale-95"
                    onClick={() => handleDetailsClick(id)}
                  >
                    Details
                  </button>
                )}
                {expandedSlot === id && slotDetails[id] && (
                  <div className="mt-5 md:mt-0 w-full break-words relative">
                    <button
                      className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full font-bold text-lg shadow hover:bg-blue-800 hover:bg-opacity-80 hover:scale-110 transition-all z-10 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      onClick={() => handleDetailsClick(id)}
                      aria-label="Hide Details"
                    >
                      &times;
                    </button>
                    <h3 className="text-lg font-bold text-blue-300 mb-2">Slot Details</h3>
                    <div className="mb-1 text-blue-200"><span className="font-semibold">Creator:</span> <span className="break-all font-mono">{slotDetails[id].creator}</span></div>
                    <div className="mb-1 text-blue-200"><span className="font-semibold">Start:</span> {formatTimestamp(slotDetails[id].start)}</div>
                    <div className="mb-1 text-blue-200"><span className="font-semibold">End:</span> {formatTimestamp(slotDetails[id].end)}</div>
                    <div className="mt-2">
                      <a href={getGoogleCalendarLink(slotDetails[id])} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline font-semibold hover:text-blue-200">
                        View on Google Calendar
                      </a>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-8 text-blue-300 font-bold text-center drop-shadow animate-pulse">{txStatus}</div>
      </main>
      <footer className="max-w-2xl mx-auto mt-8 mb-4 px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-900/80 via-blue-800/80 to-blue-900/80 border border-blue-700/60 shadow-xl backdrop-blur-md flex flex-col md:flex-row items-center justify-between text-blue-300 text-sm font-medium">
        <span>
          &copy; {new Date().getFullYear()} <a href="https://www.hummusonrails.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-200 transition">hummusonrails</a>
        </span>
        <span className="flex items-center gap-4 mt-2 md:mt-0">
          <a href="#" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-200 transition" aria-label="GitHub Repository">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
              <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.207 11.387.6.113.793-.258.793-.577v-2.234c-3.338.726-4.033-1.415-4.033-1.415-.546-1.387-1.333-1.757-1.333-1.757-1.089-.745.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.809 1.304 3.495.997.108-.775.418-1.305.76-1.605-2.665-.305-5.466-1.334-5.466-5.932 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23a11.5 11.5 0 0 1 3.003-.404c1.018.005 2.045.138 3.003.404 2.291-1.553 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.61-2.803 5.624-5.475 5.921.43.371.813 1.102.813 2.222v3.293c0 .322.192.694.801.576C20.565 21.796 24 17.299 24 12c0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          <span>All rights reserved.</span>
        </span>
      </footer>
    </div>
  );
}

export default App;
