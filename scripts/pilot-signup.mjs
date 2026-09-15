// Throwaway pilot-user bootstrap. Uses anon key from .env (never logged).
// Delete after Phase 1 smoke. Rotate password before customer handover.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = readFileSync(new URL('../apps/web/.env', import.meta.url), 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim();

const supabase = createClient(url, key);
const EMAIL = 'flow-manager-pilot@ifmphk.com';
const PASSWORD = process.env.PILOT_PW;

const { data, error } = await supabase.auth.signUp({ email: EMAIL, password: PASSWORD });
if (error) {
  console.error('SIGNUP_ERROR:', error.message);
  process.exit(1);
}
console.log('OK user:', data.user?.id ?? '(null — email confirmation may be required)');
console.log('session:', data.session ? 'yes' : 'no');
