-- Terza migrazione: persone (allievi), pacchetti, acquisti, registro dei crediti, richiami fatti.
-- Il registro dei crediti si può solo aggiungere: ogni credito dato o tolto ha un motivo e un autore.
-- Il saldo è la somma delle righe. Si paga solo in studio: l'acquisto nasce "da incassare".
-- Tutte le tabelle hanno lo studio e le stesse regole degli altri: uno studio non vede l'altro.

create table public.people (
  id uuid primary key default gen_random_uuid(),
  studio_id text not null references public.studios (id),
  user_id uuid references auth.users (id),           -- vuoto finché la persona non entra nell'app
  nome text not null check (length(trim(nome)) > 0),
  cognome text,
  telefono text,
  email text,
  data_nascita date,
  fonte text,
  tag text[] not null default '{}',
  crediti_illimitati boolean not null default false,
  consenso_novita boolean not null default false,
  consenso_foto text not null default 'da_chiedere' check (consenso_foto in ('si', 'no', 'da_chiedere')),
  informativa_presa boolean not null default false,  -- ha preso visione dell'informativa privacy (la consegna lo studio)
  lead_id uuid references public.leads (id),         -- se arriva da Interessati
  iscritto_il date not null default current_date,
  attivo boolean not null default true,
  creato_da uuid references auth.users (id),
  creato_il timestamptz not null default now(),
  unique (studio_id, user_id)
);

create index people_studio_idx on public.people (studio_id, attivo);

-- Note sulla persona. Le note di salute servono solo a chi insegna per adattare la lezione e non guidano mai messaggi.
create table public.person_notes (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  studio_id text not null references public.studios (id),
  tipo text not null check (tipo in ('nota', 'salute')),
  testo text not null check (length(trim(testo)) > 0),
  autore uuid references auth.users (id),
  creato_il timestamptz not null default now()
);

create index person_notes_person_idx on public.person_notes (person_id, creato_il);

create table public.packages (
  id uuid primary key default gen_random_uuid(),
  studio_id text not null references public.studios (id),
  nome text not null,
  prezzo_cent integer not null check (prezzo_cent >= 0),
  crediti integer not null check (crediti > 0),
  validita_giorni integer check (validita_giorni is null or validita_giorni > 0), -- vuoto = senza scadenza
  ordine smallint not null default 0,
  attivo boolean not null default true
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  studio_id text not null references public.studios (id),
  person_id uuid not null references public.people (id),
  package_id uuid references public.packages (id),
  nome text not null,
  crediti integer not null check (crediti > 0),
  prezzo_cent integer not null check (prezzo_cent >= 0),
  scade_il date,
  incassato boolean not null default false,
  incassato_il timestamptz,
  creato_da uuid references auth.users (id),
  creato_il timestamptz not null default now()
);

create index purchases_person_idx on public.purchases (person_id);
create index purchases_studio_idx on public.purchases (studio_id, incassato);

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  studio_id text not null references public.studios (id),
  person_id uuid not null references public.people (id),
  purchase_id uuid references public.purchases (id),
  delta integer not null check (delta <> 0),
  motivo text not null check (length(trim(motivo)) > 0),
  creato_da uuid references auth.users (id),
  creato_il timestamptz not null default now()
);

create index credit_ledger_person_idx on public.credit_ledger (person_id);

-- Quando lo studio ha già scritto a una persona per un motivo (scadenza, pagamento, dati...), per qualche giorno non si ripropone.
create table public.contact_log (
  id uuid primary key default gen_random_uuid(),
  studio_id text not null references public.studios (id),
  person_id uuid not null references public.people (id),
  motivo text not null check (motivo in ('scadenza', 'pagamento', 'dati', 'compleanno', 'anniversario', 'libero')),
  creato_da uuid references auth.users (id),
  creato_il timestamptz not null default now()
);

create index contact_log_person_idx on public.contact_log (person_id, motivo, creato_il);

-- Saldo dei crediti e importo da incassare per persona. security_invoker: valgono le regole di chi guarda.
create view public.person_totals with (security_invoker = true) as
select
  p.id as person_id,
  p.studio_id,
  coalesce((select sum(l.delta) from public.credit_ledger l where l.person_id = p.id), 0)::integer as saldo,
  coalesce((select sum(a.prezzo_cent) from public.purchases a where a.person_id = p.id and not a.incassato), 0)::integer as da_incassare_cent
from public.people p;

alter table public.people enable row level security;
alter table public.person_notes enable row level security;
alter table public.packages enable row level security;
alter table public.purchases enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.contact_log enable row level security;

-- Persone: tutto lo staff dello studio le vede, le aggiunge e le modifica. Nessuna eliminazione: si disattivano.
create policy people_lettura on public.people for select to authenticated using (public.e_staff(studio_id));
create policy people_inserimento on public.people for insert to authenticated
  with check (public.e_staff(studio_id) and creato_da = auth.uid());
create policy people_modifica on public.people for update to authenticated
  using (public.e_staff(studio_id)) with check (public.e_staff(studio_id));

create policy notes_lettura on public.person_notes for select to authenticated using (public.e_staff(studio_id));
create policy notes_inserimento on public.person_notes for insert to authenticated
  with check (
    public.e_staff(studio_id) and autore = auth.uid()
    and exists (select 1 from public.people p where p.id = person_id and p.studio_id = person_notes.studio_id)
  );

create policy packages_lettura on public.packages for select to authenticated using (public.e_staff(studio_id));
create policy packages_inserimento on public.packages for insert to authenticated with check (public.e_responsabile(studio_id));
create policy packages_modifica on public.packages for update to authenticated
  using (public.e_responsabile(studio_id)) with check (public.e_responsabile(studio_id));

-- Soldi e crediti: li muovono solo amministrazione e gestione.
create policy purchases_lettura on public.purchases for select to authenticated using (public.e_staff(studio_id));
create policy purchases_inserimento on public.purchases for insert to authenticated
  with check (
    public.e_responsabile(studio_id) and creato_da = auth.uid()
    and exists (select 1 from public.people p where p.id = person_id and p.studio_id = purchases.studio_id)
  );
create policy purchases_modifica on public.purchases for update to authenticated
  using (public.e_responsabile(studio_id)) with check (public.e_responsabile(studio_id));

create policy ledger_lettura on public.credit_ledger for select to authenticated using (public.e_staff(studio_id));
create policy ledger_inserimento on public.credit_ledger for insert to authenticated
  with check (
    public.e_responsabile(studio_id) and creato_da = auth.uid()
    and exists (select 1 from public.people p where p.id = person_id and p.studio_id = credit_ledger.studio_id)
  );
-- Nessuna regola di modifica o eliminazione: il registro dei crediti non si riscrive.

create policy contact_log_lettura on public.contact_log for select to authenticated using (public.e_staff(studio_id));
create policy contact_log_inserimento on public.contact_log for insert to authenticated
  with check (
    public.e_staff(studio_id) and creato_da = auth.uid()
    and exists (select 1 from public.people p where p.id = person_id and p.studio_id = contact_log.studio_id)
  );

revoke all on all tables in schema public from anon;

-- Listino di partenza (src/config/studi.ts). Prezzi in centesimi.
insert into public.packages (studio_id, nome, prezzo_cent, crediti, validita_giorni, ordine) values
  ('tribu', 'Lezione singola', 2000, 1, null, 1),
  ('tribu', '10 lezioni', 15000, 10, 90, 2),
  ('tribu', '20 lezioni', 24000, 20, 120, 3),
  ('tribu', '25 lezioni', 25000, 25, 60, 4),
  ('pozzo', '4 lezioni', 6000, 4, null, 1),
  ('pozzo', '8 lezioni', 9000, 8, null, 2),
  ('pozzo', '12 lezioni', 15000, 12, null, 3),
  ('pozzo', '24 lezioni', 24000, 24, null, 4);
