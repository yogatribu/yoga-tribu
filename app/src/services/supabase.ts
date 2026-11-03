import { createClient } from '@supabase/supabase-js';

// Unico punto di accesso al database e al login. Nessuna schermata importa
// @supabase/supabase-js direttamente: passa sempre da qui o da src/data/.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigurato = Boolean(url && anonKey);

export const supabase = supabaseConfigurato
  ? createClient(url, anonKey)
  : null;
