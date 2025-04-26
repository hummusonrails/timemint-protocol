import { useState, useEffect } from 'react'
import { getProvider, getContract } from './web3'
import { TimeMintBooking } from '@timemint/react-timemint-component';

function App() {
  // Add a constant for the siteId (should match what was registered on-chain)
  const SITE_ID = import.meta.env.VITE_TIMEMINT_SITE_ID || "mysite.com";

  // State for wallet/account and registration status
  const [account, setAccount] = useState('');
  const [registerStatus, setRegisterStatus] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);

  // Connect wallet helper
  async function connectWallet() {
    setRegisterStatus('Connecting wallet...');
    try {
      const provider = getProvider();
      const accounts = await provider.send('eth_requestAccounts', []);
      setAccount(accounts[0]);
      setRegisterStatus('Wallet connected: ' + accounts[0]);
    } catch (err) {
      setRegisterStatus('Wallet connection failed');
    }
  }

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

    fetch('/api/creator-available-slots')
      .then(resp => resp.json())
      .then(data => setAvailableSlots(data.slots))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800 font-sans">
      {/* Header */}
      <header className="backdrop-blur-md bg-gradient-to-r from-blue-500/80 to-blue-900/80 border-b border-blue-700 shadow-2xl flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-4">
          <img src="/logo.svg" alt="TimeMint Logo" className="h-12 w-12 rounded-lg bg-white/10 p-2 border-2 border-blue-400 shadow-lg" />
          <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-blue-400 to-blue-600 drop-shadow-glow animate-pulse">TimeMint</h1>
        </div>
        <span className="text-blue-100 font-semibold text-xl tracking-widest uppercase drop-shadow">Tokenizing Time</span>
      </header>
      <main className="relative max-w-2xl mx-auto mt-12 bg-gradient-to-br from-blue-900/90 to-gray-900/90 rounded-3xl shadow-2xl p-10 border border-blue-700/80 backdrop-blur-md overflow-hidden">
        {/* Admin Panel link */}
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
            <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-blue-400 to-blue-600 drop-shadow-glow mb-2">TimeMint Booking Widget Demo</h2>
            <p className="text-blue-200 text-lg mb-2 max-w-2xl">This site demonstrates the <span className="font-bold text-blue-300">@timemint/react-timemint-component</span>—a reusable React component for building decentralized, calendar-powered booking dApps. Connect your wallet, register your site, and try out real Google Calendar integration!</p>
          </div>
        </section>
        {/* HERO BOX */}
        <section className="mb-10 relative z-10">
          <div className="w-full bg-gradient-to-r from-blue-800/80 via-blue-700/80 to-blue-900/80 rounded-2xl border border-blue-500/70 shadow-xl p-6 md:p-8 backdrop-blur-md flex flex-col items-start gap-2 animate-fade-in">
            <h2 className="text-2xl md:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-200 via-blue-400 to-blue-600 drop-shadow-glow mb-2">
              TimeMint React Component Demo
            </h2>
            <p className="text-blue-100 text-base md:text-lg font-medium leading-relaxed">
              This demo shows how to use the <span className="font-bold text-blue-300">@timemint/react-timemint-component</span> to tokenize Google Calendar bookings on-chain using Arbitrum Stylus. The widget below is a reusable React component you can drop into your own dApp.
            </p>
            <p className="text-blue-200 text-sm md:text-base">
              {/* This demo now uses secure OAuth and does not expose Google Calendar tokens in the browser. */}
            </p>
            <p className="text-blue-200 text-sm md:text-base mt-2">
              <span className="font-semibold text-blue-300">Booking Widget:</span> The booking widget below will only work if the site ID is registered. All bookings are routed through the TimeMint smart contract and require the global booking fee.
            </p>
          </div>
        </section>
        <TimeMintBooking
          contractAddress={import.meta.env.VITE_TIMEMINT_CONTRACT_ADDRESS}
          siteId={SITE_ID}
          useGoogleCalendar={String(import.meta.env.VITE_USE_GOOGLE_CALENDAR).toLowerCase() === 'true'}
          maxBookingSlots={Number(import.meta.env.VITE_MAX_BOOKING_SLOTS) || 10}
          bookingStartHour={Number(import.meta.env.VITE_BOOKING_START_HOUR) || 9}
          bookingEndHour={Number(import.meta.env.VITE_BOOKING_END_HOUR) || 17}
          bookingDays={(import.meta.env.VITE_BOOKING_DAYS || 'weekdays').toLowerCase()}
          availableSlots={availableSlots}
        />
      </main>
      {/* Footer */}
      <footer className="max-w-2xl mx-auto mt-8 mb-4 px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-900/80 via-blue-800/80 to-blue-900/80 border border-blue-700/60 shadow-xl backdrop-blur-md flex flex-col md:flex-row items-center justify-between text-blue-300 text-sm font-medium">
        <span>
          &copy; {new Date().getFullYear()} <a href="https://www.hummusonrails.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-200 transition">hummusonrails</a>
        </span>
        <span className="flex items-center gap-4 mt-2 md:mt-0">
          <a href="#" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-200 transition" aria-label="GitHub Repository">
            {/* GitHub SVG icon */}
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

export default App
