/**
 * Central, typed view of environment configuration.
 *
 * Nothing here is required — every value is optional and the app runs in demo mode
 * without it. This module is the single place to see what's wired and to read
 * public config. Server-only secrets (service role, tokens, API keys) are read in
 * their respective lib modules, never exposed here to the client.
 */

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
} as const;

export const features = {
  supabase: Boolean(env.supabaseUrl && env.supabaseAnonKey),
  /** Server-only — these read process.env directly where used. */
  github: Boolean(process.env.GITHUB_TOKEN),
  ai: Boolean(process.env.GITHUB_API_MODEL_KEY || process.env.OPENAI_API_KEY),
} as const;
