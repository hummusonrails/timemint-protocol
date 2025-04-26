import { useState } from 'react';
import { getProvider, getContract } from './web3';
import { useGoogleLogin } from '@react-oauth/google';
import { Link } from 'react-router-dom';

const SITE_ID = import.meta.env.VITE_TIMEMINT_SITE_ID || "mysite.com";

export default function AdminPanel() {
  const [account, setAccount] = useState('');
  const [registerStatus, setRegisterStatus] = useState('');
  const [googleToken, setGoogleToken] = useState(localStorage.getItem('creator_google_token') || '');
  const [calendarStatus, setCalendarStatus] = useState('');

  // Wallet connect
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

  // Site registration
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

  // Google OAuth login for site creator
  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/calendar.events',
    onSuccess: tokenResponse => {
      setGoogleToken(tokenResponse.access_token);
      localStorage.setItem('creator_google_token', tokenResponse.access_token);
      setCalendarStatus('Google Calendar connected!');
    },
    onError: () => setCalendarStatus('Google login failed'),
    flow: 'implicit',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800 font-sans">
      <header className="backdrop-blur-md bg-gradient-to-r from-blue-900/80 via-blue-800/80 to-blue-900/80 border-b border-blue-700/50 shadow-xl py-6 px-8 rounded-b-3xl flex items-center justify-between">
        <span className="text-blue-100 font-semibold text-xl tracking-widest uppercase drop-shadow">Tokenizing Time</span>
        <Link to="/" className="text-blue-300 underline font-semibold hover:text-blue-100 transition">Back to Main</Link>
      </header>
      <main className="max-w-xl mx-auto mt-10 bg-gradient-to-br from-blue-900/80 to-gray-900/90 rounded-2xl shadow-xl p-8 border border-blue-700/80">
        <h2 className="text-2xl font-bold text-blue-200 mb-6">Admin Panel</h2>
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-blue-300 mb-2">Site Registration</h3>
          {!account && (
            <button
              onClick={connectWallet}
              className="mb-2 px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-400 text-white rounded-lg font-bold shadow hover:from-blue-400 hover:to-blue-600 border border-blue-600 text-lg"
            >
              Connect Wallet
            </button>
          )}
          {account && (
            <>
              <div className="mb-2 text-blue-300 font-mono text-base">Connected as: <span className="text-blue-100">{account}</span></div>
              <button
                onClick={registerSite}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-400 text-white rounded-lg font-bold shadow hover:from-blue-400 hover:to-blue-600 border border-blue-600 text-lg"
              >
                Register Site ID <span className="font-mono">{SITE_ID}</span>
              </button>
            </>
          )}
          {registerStatus && <div className="mt-2 text-blue-200 text-sm">{registerStatus}</div>}
        </div>
        <div className="mb-2">
          <h3 className="text-lg font-semibold text-blue-300 mb-2">Google Calendar (Site Creator)</h3>
          {!googleToken && (
            <button
              onClick={() => login()}
              className="mb-2 px-6 py-2 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-lg font-bold shadow hover:from-blue-400 hover:to-blue-600 border border-blue-600 text-lg"
            >
              Connect Google Calendar
            </button>
          )}
          {googleToken && (
            <div className="mb-2 text-blue-300 font-mono text-base">Calendar connected!</div>
          )}
          {calendarStatus && <div className="mt-2 text-blue-200 text-sm">{calendarStatus}</div>}
        </div>
      </main>
      <footer className="text-blue-300 text-xs text-center mt-16 mb-4 opacity-70">
        &copy; {new Date().getFullYear()} TimeMint Demo
      </footer>
    </div>
  );
}
