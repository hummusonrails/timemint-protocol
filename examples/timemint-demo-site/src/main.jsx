import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import Router from './router.jsx';
import GoogleAuthProviderWrapper from './GoogleAuthProviderWrapper';

createRoot(document.getElementById('root')).render(
  <GoogleAuthProviderWrapper>
    <StrictMode>
      <Router />
    </StrictMode>
  </GoogleAuthProviderWrapper>,
);
