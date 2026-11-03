-- Aggiornamento della tabella dei blocchi (0002) alla versione con i blocchi per periodo. La tabella è vuota: si rifà.
drop table if exists public.lesson_blocks cascade;

create table public.lesson_blocks (
  id uuid primary key default gen_random_uuid(),
  gruppo_id uuid not null,                       -- le righe create insieme da un solo "Blocca" hanno lo stesso gruppo
  template_id uuid not null references public.lesson_templates (id) on delete cascade,
  studio_id text not null references public.studios (id),
  data date not null,                            -- il giorno della lezione ferma
  scope text not null,                           -- 'tutti', il nome di un insegnante, oppure 'lezione' per una lezione singola
  da date not null,                              -- periodo scelto da chi ha bloccato
  a date not null,
  motivo text,
  creato_da uuid references auth.users (id),
  creato_il timestamptz not null default now(),
  unique (template_id, data),
  check (a >= da)
);

create index lesson_blocks_studio_data_idx on public.lesson_blocks (studio_id, data);

alter table public.lesson_blocks enable row level security;

create policy blocks_lettura on public.lesson_blocks
  for select to authenticated using (public.e_staff(studio_id));
create policy blocks_inserimento on public.lesson_blocks
  for insert to authenticated with check (
    public.e_responsabile(studio_id)
    and creato_da = auth.uid()
    and exists (select 1 from public.lesson_templates t where t.id = template_id and t.studio_id = lesson_blocks.studio_id)
  );
create policy blocks_eliminazione on public.lesson_blocks
  for delete to authenticated using (public.e_responsabile(studio_id));


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

-- Quinta migrazione: eventi condivisi tra i due studi (workshop, seminari, incontri, ritiri) e percorsi di Sara.
-- Un evento è uno solo per entrambi gli studi, con un solo numero di posti. Ogni studio vede le iscrizioni delle
-- proprie persone; dell'altro studio vede solo i numeri (funzione posti_occupati). Un evento con solo_studio compilato
-- è visibile solo a quello studio (i percorsi di Sara sono solo di Yoga Tribù).

create table public.events (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('workshop', 'seminario', 'incontro', 'ritiro', 'percorso')),
  titolo text not null check (length(trim(titolo)) > 0),
  descrizione text,
  da date not null,
  a date,                                          -- ultimo giorno (ritiri e percorsi)
  date_incontri date[],                            -- le date degli incontri di un percorso
  ora text check (ora is null or ora ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'),
  orario text,                                     -- testo mostrato, per esempio "Giovedì 20:00 · 4 incontri"
  luogo text not null,
  prezzo_cent integer check (prezzo_cent is null or prezzo_cent >= 0),
  su_richiesta boolean not null default false,     -- senza prezzo: si iscrive chiedendo, conferma l'insegnante
  posti integer not null check (posti >= 1),
  iscritti_fissi integer not null default 0 check (iscritti_fissi >= 0), -- persone già iscritte fuori dall'app
  lista_fissa integer not null default 0 check (lista_fissa >= 0),
  studio_origine text not null references public.studios (id),
  solo_studio text references public.studios (id),
  insegnanti text[] not null default '{}',
  passo text check (passo is null or passo in ('gravidanza', 'neonatale', 'postparto', 'pertutti')),
  chiuso boolean not null default false,           -- iscrizioni chiuse a mano
  creato_da uuid references auth.users (id),
  creato_il timestamptz not null default now(),
  check (tipo <> 'percorso' or passo is not null)
);

create index events_da_idx on public.events (da);

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  studio_id text not null references public.studios (id),   -- lo studio della persona iscritta
  person_id uuid references public.people (id),
  nome text not null check (length(trim(nome)) > 0),
  stato text not null default 'confermata' check (stato in ('in_attesa', 'confermata', 'lista')),
  messaggio text check (messaggio is null or messaggio in ('proposto', 'rimandato')), -- percorsi: passo successivo proposto
  creato_da uuid references auth.users (id),
  creato_il timestamptz not null default now()
);

create index event_registrations_event_idx on public.event_registrations (event_id, stato);

-- Chi lavora in almeno uno studio.
create function public.e_staff_ovunque() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid() and m.ruolo in ('insegnante', 'amministrazione', 'gestione')
  )
$$;

-- Posti presi da un evento, sommando le iscrizioni di tutti e due gli studi: solo il numero, mai i nomi.
create function public.posti_occupati(p_evento uuid) returns integer
language sql stable security definer set search_path = ''
as $$
  select e.iscritti_fissi + (
    select count(*)::integer from public.event_registrations r
    where r.event_id = e.id and r.stato in ('in_attesa', 'confermata')
  )
  from public.events e
  where e.id = p_evento
    and ((e.solo_studio is null and public.e_staff_ovunque()) or (e.solo_studio is not null and public.e_staff(e.solo_studio)))
$$;

alter table public.events enable row level security;
alter table public.event_registrations enable row level security;

create policy events_lettura on public.events for select to authenticated using (
  (solo_studio is null and public.e_staff_ovunque()) or (solo_studio is not null and public.e_staff(solo_studio))
);
-- Li crea e li modifica chi è responsabile dello studio di origine. I percorsi li può creare anche chi insegna.
create policy events_inserimento on public.events for insert to authenticated with check (
  creato_da = auth.uid()
  and (public.e_responsabile(studio_origine) or (tipo = 'percorso' and public.e_staff(studio_origine)))
  and (solo_studio is null or solo_studio = studio_origine)
);
create policy events_modifica on public.events for update to authenticated
  using (public.e_responsabile(studio_origine) or (tipo = 'percorso' and public.e_staff(studio_origine)))
  with check (public.e_responsabile(studio_origine) or (tipo = 'percorso' and public.e_staff(studio_origine)));
create policy events_eliminazione on public.events for delete to authenticated
  using (public.e_responsabile(studio_origine) or (tipo = 'percorso' and public.e_staff(studio_origine)));

create policy registrations_lettura on public.event_registrations for select to authenticated using (public.e_staff(studio_id));
create policy registrations_inserimento on public.event_registrations for insert to authenticated with check (
  public.e_staff(studio_id) and creato_da = auth.uid()
  and exists (select 1 from public.events e where e.id = event_id
              and ((e.solo_studio is null) or (e.solo_studio = event_registrations.studio_id)))
  and (person_id is null or exists (select 1 from public.people p where p.id = person_id and p.studio_id = event_registrations.studio_id))
);
create policy registrations_modifica on public.event_registrations for update to authenticated
  using (public.e_staff(studio_id)) with check (public.e_staff(studio_id));
create policy registrations_eliminazione on public.event_registrations for delete to authenticated using (public.e_staff(studio_id));

revoke all on all tables in schema public from anon;
