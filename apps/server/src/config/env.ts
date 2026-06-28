import 'dotenv/config';

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: parseInt(optional('PORT', '3000'), 10),
  DB_PATH: optional('DB_PATH', './data/poker.db'),
  ADMIN_SECRET: optional('ADMIN_SECRET', 'dev-secret-change-me'),
  CORS_ORIGINS: optional('CORS_ORIGINS', 'http://localhost:5173,chrome-extension://').split(','),
  ROOM_TTL_MINUTES: parseInt(optional('ROOM_TTL_MINUTES', '120'), 10),
  isDev: optional('NODE_ENV', 'development') === 'development',
} as const;

void required; // suppress unused warning — used for future required vars
