import { useState } from 'react';
import { getProvider, getContract } from './web3';
import { Link } from 'react-router-dom';

const SITE_ID = import.meta.env.VITE_TIMEMINT_SITE_ID || "mysite.com";

export default function AdminPanel({ onAuth }) {
  const [account, setAccount] = useState('');
  const [registerStatus, setRegisterStatus] = useState('');
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

  // Google OAuth for site creator (calls backend API to store token)
  async function handleGoogleAuth() {
    setCalendarStatus('Authenticating with Google...');
    try {
      // Redirect to Vercel serverless function for OAuth
      window.location.href = '/api/creator-google-auth';
    } catch (err) {
      setCalendarStatus('Google authentication failed');
    }
  }

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
          <button
            onClick={handleGoogleAuth}
            className="mb-2 px-6 py-2 bg-gradient-to-r from-blue-400 to-blue-500 text-white rounded-lg font-bold shadow hover:from-blue-400 hover:to-blue-600 border border-blue-600 text-lg"
          >
            Connect Google Calendar
          </button>
          {calendarStatus && <div className="mt-2 text-blue-200 text-sm">{calendarStatus}</div>}
        </div>
      </main>
      <footer className="text-blue-300 text-xs text-center mt-16 mb-4 opacity-70">
        &copy; {new Date().getFullYear()} TimeMint Demo
        <a
          href="https://github.com/hummusonrails/timemint-protocol"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block ml-2 align-middle"
          aria-label="GitHub Repository"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="currentColor"
            viewBox="0 0 24 24"
            className="inline align-middle"
          >
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.262.82-.58 0-.287-.012-1.243-.017-2.25-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.418-1.305.762-1.605-2.665-.3-5.466-1.334-5.466-5.931 0-1.31.468-2.381 1.235-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.289-1.552 3.295-1.23 3.295-1.23.653 1.653.242 2.873.12 3.176.77.84 1.233 1.911 1.233 3.221 0 4.609-2.804 5.628-5.475 5.921.43.372.823 1.104.823 2.226 0 1.606-.014 2.898-.014 3.293 0 .321.216.698.825.58C20.565 21.796 24 17.297 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        </a>
      </footer>
    </div>
  );
}
