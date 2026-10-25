// The web app is served same-origin through nginx; CORS only matters for the
// Capacitor Android app (http://localhost) and local dev servers.
const DEFAULT_ORIGINS = [
  'https://prompterest.sinanakcan.com',
  'https://www.sinanakcan.com',
  'http://localhost',
  'http://localhost:5173',
  'http://localhost:5174',
];

export const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : DEFAULT_ORIGINS;
