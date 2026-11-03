-- Da contattare: due nuovi motivi per i messaggi, "A rischio abbandono" e "Da recuperare".
-- Il registro dei messaggi (contact_log) li accetta, così chi è già stato contattato non ricompare per qualche giorno.
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0013.

alter table public.contact_log drop constraint if exists contact_log_motivo_check;
alter table public.contact_log add constraint contact_log_motivo_check
  check (motivo in ('scadenza', 'pagamento', 'dati', 'compleanno', 'anniversario', 'libero', 'rischio', 'recupero'));
