-- Quarta migrazione: insegnanti (elenco dello studio) e campi su misura dei contatti.
-- L'elenco degli insegnanti serve a scegliere chi tiene una lezione e a mostrare chi insegna.
-- Non dà permessi: i permessi restano i ruoli di memberships, che per ora si assegnano da Supabase
-- finché non c'è l'invito dall'app (richiede una funzione sul server con la chiave riservata).

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  studio_id text not null references public.studios (id),
  nome text not null check (length(trim(nome)) > 0),
  email text,
  stili text[] not null default '{}',
  fa_private boolean not null default false,
  responsabile boolean not null default false,   -- dicitura mostrata nelle Impostazioni, non un permesso
  attivo boolean not null default true,
  creato_il timestamptz not null default now(),
  unique (studio_id, nome)
);

create table public.lead_fields (
  id uuid primary key default gen_random_uuid(),
  studio_id text not null references public.studios (id),
  nome text not null check (length(trim(nome)) > 0),
  tipo text not null check (tipo in ('scelta', 'testo', 'si')),
  opzioni text[] not null default '{}',
  ordine smallint not null default 0,
  attivo boolean not null default true,
  creato_il timestamptz not null default now()
);

-- Le risposte ai campi su misura stanno sul contatto: { "<id del campo>": "risposta" }.
alter table public.leads add column campi jsonb not null default '{}'::jsonb;

alter table public.teachers enable row level security;
alter table public.lead_fields enable row level security;

create policy teachers_lettura on public.teachers for select to authenticated using (public.e_staff(studio_id));
create policy teachers_inserimento on public.teachers for insert to authenticated with check (public.e_responsabile(studio_id));
create policy teachers_modifica on public.teachers for update to authenticated
  using (public.e_responsabile(studio_id)) with check (public.e_responsabile(studio_id));

create policy lead_fields_lettura on public.lead_fields for select to authenticated using (public.e_staff(studio_id));
create policy lead_fields_inserimento on public.lead_fields for insert to authenticated with check (public.e_responsabile(studio_id));
create policy lead_fields_modifica on public.lead_fields for update to authenticated
  using (public.e_responsabile(studio_id)) with check (public.e_responsabile(studio_id));

revoke all on all tables in schema public from anon;

-- Insegnanti di partenza (da src/config/studi.ts): chi compare negli orari.
insert into public.teachers (studio_id, nome, stili, fa_private, responsabile) values
  ('tribu', 'Glenda', '{iyengar,workshop}', true, true),
  ('tribu', 'Victor', '{ashtanga}', true, false),
  ('tribu', 'Giulia', '{flow}', false, false),
  ('tribu', 'Daniela', '{ashtanga}', false, false),
  ('tribu', 'Giorgia', '{kundalini}', false, false),
  ('tribu', 'Asia', '{teen}', false, false),
  ('tribu', 'Mattia', '{workshop}', false, false),
  ('tribu', 'Sara', '{}', false, false),
  ('pozzo', 'Mattia', '{livello-1,livello-2,restorative}', true, true),
  ('pozzo', 'Glenda', '{}', false, true);

-- Domande di partenza sui contatti (come nel prototipo).
insert into public.lead_fields (studio_id, nome, tipo, opzioni, ordine) values
  ('tribu', 'Obiettivo', 'scelta', '{Schiena,Stress,Forza,Flessibilità}', 1),
  ('pozzo', 'Obiettivo', 'scelta', '{Schiena,Stress,Forza,Flessibilità}', 1);
