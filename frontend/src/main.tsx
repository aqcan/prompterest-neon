import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const base = import.meta.env.BASE_URL;
if (base !== '/') {
  const validBase = base.replace(/\/$/, '');
  const isValid =
    window.location.pathname === validBase ||
    window.location.pathname === validBase + '/';
  if (!isValid) {
    document.body.innerHTML = '<h1 style="color:white;font-family:sans-serif;padding:2rem">404</h1>';
    throw new Error('404: invalid path');
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
