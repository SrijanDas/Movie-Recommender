// Account field rules shared by the sign-in/sign-up forms and their Server
// Actions. Pure — safe on server and client.

// Supabase enforces its own minimum; keep the dashboard value ≤ this.
export const MIN_PASSWORD = 8;
export const MAX_NAME = 80;
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
