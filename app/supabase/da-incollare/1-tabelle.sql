-- Seconda migrazione: orari delle lezioni (Programma).
-- Un "modello" è una lezione che si ripete ogni settimana. Fermare una lezione di un giorno preciso
-- si registra in lesson_blocks, senza toccare il modello. Gli orari di partenza arrivano da src/config/studi.ts.
-- Per ora li modificano solo amministrazione e gestione: collegare gli insegnanti alle proprie lezioni
-- richiede di sapere quale persona è quale insegnante, e si fa dopo.

create table public.lesson_templates (
  id uuid primary key default gen_random_uuid(),
  studio_id text not null references public.studios (id),
  giorno smallint not null check (giorno between 0 and 6), -- 0 = domenica, come in JavaScript
  ora text not null check (ora ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  stile text not null,
  tipo text not null check (length(trim(tipo)) > 0),
  insegnante text not null check (length(trim(insegnante)) > 0),
  durata_min smallint check (durata_min is null or durata_min between 15 and 480),
  posti smallint not null default 15 check (posti between 1 and 200),
  attivo boolean not null default true,
  aggiunto_a_mano boolean not null default false,
  creato_il timestamptz not null default now()
);

create index lesson_templates_studio_idx on public.lesson_templates (studio_id, attivo, giorno, ora);

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

alter table public.lesson_templates enable row level security;
alter table public.lesson_blocks enable row level security;

create policy templates_lettura on public.lesson_templates
  for select to authenticated using (public.e_staff(studio_id));
create policy templates_inserimento on public.lesson_templates
  for insert to authenticated with check (public.e_responsabile(studio_id));
create policy templates_modifica on public.lesson_templates
  for update to authenticated using (public.e_responsabile(studio_id)) with check (public.e_responsabile(studio_id));
-- Nessuna regola di eliminazione: una lezione si disattiva (attivo = false), così lo storico resta.

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

revoke all on all tables in schema public from anon;

-- Orari di partenza dei due studi.
insert into public.lesson_templates (studio_id, giorno, ora, stile, tipo, insegnante, durata_min) values
  ('tribu', 1, '07:00', 'iyengar', 'Flessibilità', 'Glenda', null),
  ('tribu', 1, '08:45', 'iyengar', 'Flessibilità', 'Glenda', null),
  ('tribu', 1, '17:45', 'iyengar', 'Flessibilità', 'Glenda', null),
  ('tribu', 1, '19:15', 'iyengar', 'Flessibilità', 'Glenda', null),
  ('tribu', 2, '08:45', 'iyengar', 'Restorative', 'Glenda', null),
  ('tribu', 2, '13:00', 'iyengar', 'Avanzato · Flessibilità', 'Glenda', null),
  ('tribu', 2, '17:30', 'ashtanga', 'Mysore', 'Victor', null),
  ('tribu', 2, '19:00', 'ashtanga', 'Guidata', 'Victor', null),
  ('tribu', 3, '07:30', 'flow', 'Vinyasa', 'Giulia', null),
  ('tribu', 3, '08:45', 'iyengar', 'Forza', 'Glenda', null),
  ('tribu', 3, '17:45', 'iyengar', 'Forza', 'Glenda', null),
  ('tribu', 3, '19:15', 'iyengar', 'Forza', 'Glenda', null),
  ('tribu', 4, '07:00', 'ashtanga', 'Respiro & Movimento', 'Daniela', null),
  ('tribu', 4, '08:45', 'iyengar', 'SOS Dolori', 'Glenda', null),
  ('tribu', 4, '13:00', 'iyengar', 'Avanzato · Forza', 'Glenda', null),
  ('tribu', 4, '17:30', 'ashtanga', 'Mysore', 'Victor', null),
  ('tribu', 4, '19:00', 'ashtanga', 'Guidata', 'Victor', null),
  ('tribu', 5, '07:00', 'ashtanga', 'Mysore', 'Victor', null),
  ('tribu', 5, '17:00', 'teen', 'Teen Yoga', 'Asia', null),
  ('tribu', 6, '08:30', 'ashtanga', 'Mysore', 'Victor', null),
  ('tribu', 6, '10:30', 'flow', 'Vinyasa', 'Giulia', null),
  ('tribu', 6, '17:00', 'kundalini', 'Meditazione e Respiro', 'Giorgia', null),
  ('tribu', 0, '09:00', 'workshop', 'Approfondimenti', 'Glenda e Mattia', null),
  ('tribu', 0, '17:30', 'flow', 'Vinyasa', 'Giulia', null),
  ('pozzo', 1, '17:45', 'livello-1', 'Livello 1', 'Mattia', 75),
  ('pozzo', 1, '19:30', 'livello-2', 'Livello 2', 'Mattia', 75),
  ('pozzo', 2, '06:30', 'livello-2', 'Livello 2', 'Mattia', 75),
  ('pozzo', 2, '17:45', 'restorative', 'Restorative', 'Mattia', 75),
  ('pozzo', 2, '19:30', 'livello-2', 'Livello 2', 'Mattia', 75),
  ('pozzo', 3, '17:45', 'livello-1', 'Livello 1', 'Mattia', 75),
  ('pozzo', 3, '19:30', 'livello-2', 'Livello 2', 'Mattia', 75),
  ('pozzo', 4, '06:30', 'livello-2', 'Livello 2', 'Mattia', 75),
  ('pozzo', 4, '09:00', 'livello-1', 'Livello 1', 'Mattia', 75),
  ('pozzo', 4, '17:45', 'restorative', 'Restorative', 'Mattia', 75),
  ('pozzo', 4, '19:30', 'livello-2', 'Livello 2', 'Mattia', 75);
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
-- Sesta migrazione: planner dei contenuti (cosa pubblicare e quando).
-- Le righe del piano si calcolano da sole dagli eventi: nel database si salva solo quello che decide una persona
-- (confermato, preparato, pubblicato, spostato, risultati) e gli eventi che non vengono dal Programma.

create table public.content_posts (
  studio_id text not null references public.studios (id),
  riga_id text not null,                       -- "<evento>~<numero>", come nel prototipo
  stato text not null default 'proposto' check (stato in ('proposto', 'confermato', 'creato', 'pubblicato', 'annullato')),
  data date,                                   -- il giorno in cui resta (da quando è confermato)
  formato text check (formato is null or formato in ('carosello', 'reel', 'post', 'storie', 'a4')),
  data_evento date,                            -- la data dell'evento al momento della conferma
  sposta date,                                 -- spostamento proposto e accettato, finché non è confermato
  istantanea jsonb,                            -- titolo, tipo, fase, obiettivo al momento della conferma
  ok boolean not null default false,           -- l'avviso "l'evento è cambiato" è stato visto
  risultati jsonb,                             -- persone raggiunte, salvataggi, messaggi, note
  aggiornato_il timestamptz not null default now(),
  aggiornato_da uuid references auth.users (id),
  primary key (studio_id, riga_id)
);

create table public.content_events (
  id text primary key,
  studio_id text not null references public.studios (id),
  tipo text not null,
  titolo text not null check (length(trim(titolo)) > 0),
  data date not null,
  luogo text,
  prezzo_cent integer,
  posti integer,
  con text,
  extra jsonb not null default '{}'::jsonb,    -- scadenza iscrizioni, pubblico, link
  creato_da uuid references auth.users (id),
  creato_il timestamptz not null default now()
);

-- Le informazioni in più (scadenza, pubblico, link) anche sugli eventi che vengono dal Programma.
create table public.content_event_extra (
  studio_id text not null references public.studios (id),
  evento_id text not null,
  extra jsonb not null default '{}'::jsonb,
  primary key (studio_id, evento_id)
);

alter table public.content_posts enable row level security;
alter table public.content_events enable row level security;
alter table public.content_event_extra enable row level security;

create policy posts_lettura on public.content_posts for select to authenticated using (public.e_staff(studio_id));
create policy posts_inserimento on public.content_posts for insert to authenticated with check (public.e_staff(studio_id));
create policy posts_modifica on public.content_posts for update to authenticated
  using (public.e_staff(studio_id)) with check (public.e_staff(studio_id));

create policy cev_lettura on public.content_events for select to authenticated using (public.e_staff(studio_id));
create policy cev_inserimento on public.content_events for insert to authenticated with check (public.e_responsabile(studio_id));
create policy cev_modifica on public.content_events for update to authenticated
  using (public.e_responsabile(studio_id)) with check (public.e_responsabile(studio_id));
create policy cev_eliminazione on public.content_events for delete to authenticated using (public.e_responsabile(studio_id));

create policy cextra_lettura on public.content_event_extra for select to authenticated using (public.e_staff(studio_id));
create policy cextra_inserimento on public.content_event_extra for insert to authenticated with check (public.e_responsabile(studio_id));
create policy cextra_modifica on public.content_event_extra for update to authenticated
  using (public.e_responsabile(studio_id)) with check (public.e_responsabile(studio_id));

revoke all on all tables in schema public from anon;
-- Settima migrazione: prenotazioni delle lezioni.
-- Per ora le inserisce lo studio per conto delle persone (gli allievi non hanno ancora l'app).
-- Regole (regole-di-business.md): disdetta oltre 2 ore prima, il credito torna; meno di 2 ore, il credito non torna
-- e lo studio lo vede in "Disdette last minute" e può restituirlo. Ogni credito mosso passa dal registro (credit_ledger).

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  studio_id text not null references public.studios (id),
  template_id uuid not null references public.lesson_templates (id),
  data date not null,                          -- il giorno della lezione
  person_id uuid not null references public.people (id),
  stato text not null default 'prenotata' check (stato in ('prenotata', 'lista', 'annullata', 'tardiva', 'restituita')),
  -- prenotata: ha il posto · lista: in lista d'attesa · annullata: disdetta in tempo, credito tornato
  -- tardiva: disdetta tardi, credito perso · restituita: disdetta tardi, credito restituito dallo studio
  disdetta_il timestamptz,
  minuti_prima integer,                        -- quanti minuti prima della lezione è stata disdetta
  creato_da uuid references auth.users (id),
  creato_il timestamptz not null default now()
);

-- Una persona non ha due prenotazioni attive per la stessa lezione dello stesso giorno.
create unique index bookings_attiva_idx on public.bookings (template_id, data, person_id) where stato in ('prenotata', 'lista');
create index bookings_studio_data_idx on public.bookings (studio_id, data);
create index bookings_person_idx on public.bookings (person_id, data);

alter table public.bookings enable row level security;

create policy bookings_lettura on public.bookings for select to authenticated using (public.e_staff(studio_id));
-- Muovono crediti, quindi solo amministrazione e gestione le creano e le modificano.
create policy bookings_inserimento on public.bookings for insert to authenticated with check (
  public.e_responsabile(studio_id) and creato_da = auth.uid()
  and exists (select 1 from public.people p where p.id = person_id and p.studio_id = bookings.studio_id)
  and exists (select 1 from public.lesson_templates t where t.id = template_id and t.studio_id = bookings.studio_id)
);
create policy bookings_modifica on public.bookings for update to authenticated
  using (public.e_responsabile(studio_id)) with check (public.e_responsabile(studio_id));

revoke all on all tables in schema public from anon;


-- Accesso riservato: nell'app entra solo chi ha l'email nell'elenco degli insegnanti (Impostazioni)
-- o in `accessi_extra` (segreteria e altre persone dello studio che non insegnano).
-- Chi non è in elenco non riesce nemmeno a creare l'account: il database rifiuta la registrazione.
-- Quando una persona dell'elenco entra per la prima volta, riceve da sola il ruolo e viene collegata al suo nome.
-- Quando si apre l'app agli allievi (vedi docs/decisioni-app.md) si sostituisce `controlla_nuovo_utente`.
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0007.

alter table public.teachers
  add column user_id uuid references auth.users (id) on delete set null,   -- calcolato dal database, mai scritto a mano
  add column fa_percorsi boolean not null default false;                    -- chi vede i Percorsi (oggi solo Sara)

create index teachers_email_idx on public.teachers (lower(trim(email)));

update public.teachers set fa_percorsi = true where studio_id = 'tribu' and nome = 'Sara';

create table public.accessi_extra (
  email text not null check (email = lower(trim(email)) and email like '%@%'),
  studio_id text not null references public.studios (id),
  ruolo public.ruolo not null check (ruolo in ('insegnante', 'amministrazione', 'gestione')),
  nota text,
  primary key (email, studio_id)
);

-- Si gestisce solo da SQL Editor: nessun accesso dall'app.
alter table public.accessi_extra enable row level security;
revoke all on public.accessi_extra from anon, authenticated;

-- Dà il ruolo a un account appena nato. Non è chiamabile dall'app: lo usa solo il trigger qui sotto.
create function public.assegna_accessi(p_utente uuid, p_email text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  e text := lower(trim(coalesce(p_email, '')));
begin
  if e = '' then return; end if;
  -- prima i ruoli extra, così un ruolo più alto non viene mai sostituito da "insegnante"
  insert into public.memberships (user_id, studio_id, ruolo)
    select p_utente, studio_id, ruolo from public.accessi_extra where email = e
  on conflict (user_id, studio_id) do nothing;
  insert into public.memberships (user_id, studio_id, ruolo)
    select p_utente, studio_id, 'insegnante' from public.teachers where attivo and lower(trim(email)) = e
  on conflict (user_id, studio_id) do nothing;
  update public.teachers set user_id = p_utente where attivo and lower(trim(email)) = e;
end
$$;

revoke execute on function public.assegna_accessi(uuid, text) from public, anon, authenticated;

-- Prima che l'account nasca: l'email deve essere abilitata.
-- Gli indirizzi che finiscono in .invalid non esistono davvero (riservati dalla regola RFC 2606):
-- li usano i controlli automatici, nessuno può riceverci posta.
create function public.controlla_nuovo_utente() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  e text := lower(trim(coalesce(new.email, '')));
begin
  if e like '%.invalid' then return new; end if;
  if e = '' or not (
    exists (select 1 from public.teachers where attivo and lower(trim(email)) = e)
    or exists (select 1 from public.accessi_extra where email = e)
  ) then
    raise exception 'Email non abilitata';
  end if;
  return new;
end
$$;

create trigger prima_della_creazione_utente before insert on auth.users
for each row execute function public.controlla_nuovo_utente();

-- Dopo che l'account è nato: ruolo e collegamento al nome.
create function public.dopo_creazione_utente() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  perform public.assegna_accessi(new.id, new.email);
  return new;
end
$$;

create trigger zz_accessi_alla_creazione after insert on auth.users
for each row execute function public.dopo_creazione_utente();

-- Quando cambia l'elenco degli insegnanti: chi ha già un account lo ottiene o lo perde subito.
-- user_id si ricalcola dall'email a ogni modifica, quello inviato dall'app viene ignorato.
create function public.aggiorna_accessi_insegnante() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  e text := lower(trim(coalesce(new.email, '')));
  u uuid;
begin
  if tg_op = 'UPDATE' and old.user_id is not null
     and (not new.attivo or lower(trim(coalesce(old.email, ''))) <> e) then
    delete from public.memberships where user_id = old.user_id and studio_id = old.studio_id and ruolo = 'insegnante';
  end if;
  new.user_id := null;
  if new.attivo and e <> '' then
    select id into u from auth.users where lower(trim(email)) = e limit 1;
    if u is not null then
      new.user_id := u;
      insert into public.memberships (user_id, studio_id, ruolo) values (u, new.studio_id, 'insegnante')
      on conflict (user_id, studio_id) do nothing;
    end if;
  end if;
  return new;
end
$$;

create trigger insegnanti_accessi before insert or update on public.teachers
for each row execute function public.aggiorna_accessi_insegnante();


-- Interessati completi come nel prototipo: giorno e ora della prova, assenze, importazione, promemoria automatici.
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0008.

-- prova_il esiste già dalla prima migrazione come data e ora: qui diventa solo il giorno ("AAAA-MM-GG"), come il resto dell'app.
alter table public.leads alter column prova_il type date using prova_il::date;

alter table public.leads
  add column if not exists prova_ora text,
  add column if not exists prova_tipo text,
  add column if not exists assenze int not null default 0,
  add column if not exists importato boolean not null default false,       -- contatto arrivato da un elenco: niente promozioni senza consenso
  add column if not exists avvisato_il date,                                -- giorno della prova per cui è già stato mandato il promemoria
  add column if not exists ha_avuto_prova boolean not null default false,
  add column if not exists persona_id uuid references public.people (id) on delete set null;   -- chi è diventato allievo

-- Impostazioni semplici di ogni studio (per ora: i quattro promemoria degli Interessati).
create table public.studio_settings (
  studio_id text not null references public.studios (id),
  chiave text not null,
  valore jsonb not null,
  primary key (studio_id, chiave)
);

alter table public.studio_settings enable row level security;
create policy studio_settings_lettura on public.studio_settings for select to authenticated using (public.e_staff(studio_id));
create policy studio_settings_inserimento on public.studio_settings for insert to authenticated with check (public.e_responsabile(studio_id));
create policy studio_settings_modifica on public.studio_settings for update to authenticated
  using (public.e_responsabile(studio_id)) with check (public.e_responsabile(studio_id));

revoke all on public.studio_settings from anon;


-- Lezioni private (disponibilità e richieste), richieste degli allievi e avvisi a un gruppo.
-- Per ora li inserisce lo studio per conto delle persone: gli allievi non hanno ancora l'app.
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0009.

alter table public.teachers add column private_auto boolean not null default false;   -- conferma automatica delle private

-- Vero se chi ha fatto l'accesso è quell'insegnante (collegata dall'email, migrazione 0008).
create function public.e_insegnante_di(p_insegnante uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.teachers t where t.id = p_insegnante and t.user_id = (select auth.uid())) $$;

-- Orari in cui un'insegnante accetta lezioni private: ogni settimana (giorno 0-6, 0 = domenica) oppure solo una data.
create table public.private_availability (
  id uuid primary key default gen_random_uuid(),
  studio_id text not null references public.studios (id),
  teacher_id uuid not null references public.teachers (id) on delete cascade,
  giorno smallint check (giorno between 0 and 6),
  data date,
  ore smallint[] not null default '{}',                      -- ogni orario è un'ora, a partire da quel numero
  check ((giorno is null) <> (data is null))
);
create unique index private_availability_giorno on public.private_availability (teacher_id, giorno) where giorno is not null;
create unique index private_availability_data on public.private_availability (teacher_id, data) where data is not null;

create table public.private_lessons (
  id uuid primary key default gen_random_uuid(),
  studio_id text not null references public.studios (id),
  person_id uuid not null references public.people (id),
  teacher_id uuid not null references public.teachers (id),
  n smallint not null check (n between 1 and 4),            -- persone: 1 individuale, 2 duo, 3 trio, 4 di gruppo
  stile text not null,
  data date not null,
  ora text not null,
  note text,
  prezzo_cent integer check (prezzo_cent >= 0),             -- vuoto: da concordare
  stato text not null default 'attesa' check (stato in ('attesa', 'confermata', 'rifiutata', 'annullata')),
  creato_da uuid references auth.users (id),
  creato_il timestamptz not null default now()
);
create index private_lessons_studio_idx on public.private_lessons (studio_id, data);

create table public.student_requests (
  id uuid primary key default gen_random_uuid(),
  studio_id text not null references public.studios (id),
  person_id uuid not null references public.people (id),
  categoria text not null,
  lezione text,
  testo text not null check (length(trim(testo)) > 0),
  risposta text,
  risposta_il timestamptz,
  creato_da uuid references auth.users (id),
  creato_il timestamptz not null default now()
);
create index student_requests_studio_idx on public.student_requests (studio_id, creato_il desc);

-- Avvisi a un gruppo. Per ora si salvano: arriveranno agli allievi quando potranno entrare nell'app.
create table public.group_notices (
  id uuid primary key default gen_random_uuid(),
  studio_id text not null references public.studios (id),
  titolo text not null check (length(trim(titolo)) > 0),
  testo text not null check (length(trim(testo)) > 0),
  tipo text not null check (tipo in ('novita', 'importante')),
  quando text not null check (quando in ('ora', 'domani')),
  gruppi text not null,
  esclusi integer not null default 0,                       -- senza consenso alle comunicazioni (solo per le novità)
  creato_da uuid references auth.users (id),
  creato_il timestamptz not null default now()
);

create table public.group_notice_recipients (
  notice_id uuid not null references public.group_notices (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  primary key (notice_id, person_id)
);

alter table public.private_availability enable row level security;
alter table public.private_lessons enable row level security;
alter table public.student_requests enable row level security;
alter table public.group_notices enable row level security;
alter table public.group_notice_recipients enable row level security;

create policy private_availability_lettura on public.private_availability for select to authenticated using (public.e_staff(studio_id));
create policy private_availability_inserimento on public.private_availability for insert to authenticated
  with check (public.e_responsabile(studio_id) or public.e_insegnante_di(teacher_id));
create policy private_availability_modifica on public.private_availability for update to authenticated
  using (public.e_responsabile(studio_id) or public.e_insegnante_di(teacher_id))
  with check (public.e_responsabile(studio_id) or public.e_insegnante_di(teacher_id));
create policy private_availability_cancella on public.private_availability for delete to authenticated
  using (public.e_responsabile(studio_id) or public.e_insegnante_di(teacher_id));

create policy private_lessons_lettura on public.private_lessons for select to authenticated using (public.e_staff(studio_id));
create policy private_lessons_inserimento on public.private_lessons for insert to authenticated with check (public.e_staff(studio_id));
create policy private_lessons_modifica on public.private_lessons for update to authenticated
  using (public.e_responsabile(studio_id) or public.e_insegnante_di(teacher_id))
  with check (public.e_responsabile(studio_id) or public.e_insegnante_di(teacher_id));

create policy student_requests_lettura on public.student_requests for select to authenticated using (public.e_staff(studio_id));
create policy student_requests_inserimento on public.student_requests for insert to authenticated with check (public.e_staff(studio_id));
create policy student_requests_modifica on public.student_requests for update to authenticated
  using (public.e_staff(studio_id)) with check (public.e_staff(studio_id));

create policy group_notices_lettura on public.group_notices for select to authenticated using (public.e_staff(studio_id));
create policy group_notices_inserimento on public.group_notices for insert to authenticated with check (public.e_staff(studio_id));
create policy group_notice_recipients_lettura on public.group_notice_recipients for select to authenticated
  using (exists (select 1 from public.group_notices g where g.id = notice_id and public.e_staff(g.studio_id)));
create policy group_notice_recipients_inserimento on public.group_notice_recipients for insert to authenticated
  with check (exists (select 1 from public.group_notices g where g.id = notice_id and public.e_staff(g.studio_id)));

revoke all on public.private_availability, public.private_lessons, public.student_requests, public.group_notices, public.group_notice_recipients from anon;


-- Ciclo editoriale: il tema di ogni mese (una parola, due righe, libro consigliato, articolo).
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0010.

create table public.monthly_themes (
  studio_id text not null references public.studios (id),
  mese text not null check (mese ~ '^\d{4}-(0[1-9]|1[0-2])$'),     -- "AAAA-MM"
  tema text not null default '',
  testo text not null default '',
  libro text not null default '',
  autore text not null default '',
  articolo text not null default '',
  primary key (studio_id, mese)
);

alter table public.monthly_themes enable row level security;
create policy monthly_themes_lettura on public.monthly_themes for select to authenticated using (public.e_staff(studio_id));
create policy monthly_themes_inserimento on public.monthly_themes for insert to authenticated with check (public.e_responsabile(studio_id));
create policy monthly_themes_modifica on public.monthly_themes for update to authenticated
  using (public.e_responsabile(studio_id)) with check (public.e_responsabile(studio_id));

revoke all on public.monthly_themes from anon;


-- "Responsabile" nelle Impostazioni diventa un permesso vero.
-- Un insegnante con "Responsabile" acceso ha il ruolo amministrazione (programma, insegnanti, prezzi, statistiche);
-- spento, ha il ruolo insegnante. Il titolare (gestione) non cambia mai, e chi ha un ruolo dato a mano resta com'è
-- finché non si cambia l'interruttore. Solo il titolare può cambiare i responsabili.
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0011.

-- Chi entra per la prima volta riceve il ruolo che ha l'interruttore.
create or replace function public.assegna_accessi(p_utente uuid, p_email text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  e text := lower(trim(coalesce(p_email, '')));
begin
  if e = '' then return; end if;
  -- prima i ruoli extra, così un ruolo più alto non viene mai sostituito
  insert into public.memberships (user_id, studio_id, ruolo)
    select p_utente, studio_id, ruolo from public.accessi_extra where email = e
  on conflict (user_id, studio_id) do nothing;
  insert into public.memberships (user_id, studio_id, ruolo)
    select p_utente, studio_id, case when responsabile then 'amministrazione'::public.ruolo else 'insegnante'::public.ruolo end
    from public.teachers where attivo and lower(trim(email)) = e
  on conflict (user_id, studio_id) do nothing;
  update public.teachers set user_id = p_utente where attivo and lower(trim(email)) = e;
end
$$;

revoke execute on function public.assegna_accessi(uuid, text) from public, anon, authenticated;

-- Solo il titolare accende o spegne "Responsabile". Dal SQL Editor (nessun utente collegato) si può sempre.
create function public.solo_titolare_cambia_responsabili() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then return new; end if;
  if (tg_op = 'INSERT' and new.responsabile) or (tg_op = 'UPDATE' and new.responsabile is distinct from old.responsabile) then
    if public.ruolo_in(new.studio_id) is distinct from 'gestione' then
      raise exception 'Solo il titolare può cambiare i responsabili';
    end if;
  end if;
  return new;
end
$$;

create trigger insegnanti_0_solo_titolare before insert or update on public.teachers
for each row execute function public.solo_titolare_cambia_responsabili();

-- Come prima (collega l'account all'email e toglie l'accesso a chi esce dall'elenco), e in più il ruolo segue l'interruttore.
create or replace function public.aggiorna_accessi_insegnante() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  e text := lower(trim(coalesce(new.email, '')));
  u uuid;
  vuole public.ruolo := case when new.responsabile then 'amministrazione'::public.ruolo else 'insegnante'::public.ruolo end;
begin
  if tg_op = 'UPDATE' and old.user_id is not null
     and (not new.attivo or lower(trim(coalesce(old.email, ''))) <> e) then
    -- toglie il ruolo che veniva da qui, ma non quello che viene da accessi_extra e mai quello del titolare
    delete from public.memberships m where m.user_id = old.user_id and m.studio_id = old.studio_id and m.ruolo in ('insegnante', 'amministrazione')
      and not exists (select 1 from public.accessi_extra x where x.email = lower(trim(coalesce(old.email, ''))) and x.studio_id = old.studio_id);
  end if;
  new.user_id := null;
  if new.attivo and e <> '' then
    select id into u from auth.users where lower(trim(email)) = e limit 1;
    if u is not null then
      new.user_id := u;
      insert into public.memberships (user_id, studio_id, ruolo) values (u, new.studio_id, vuole)
      on conflict (user_id, studio_id) do nothing;
      -- se l'interruttore è cambiato, il ruolo lo segue (tranne il titolare e chi ha un ruolo da accessi_extra)
      if tg_op = 'UPDATE' and new.responsabile is distinct from old.responsabile then
        update public.memberships set ruolo = vuole
        where user_id = u and studio_id = new.studio_id and ruolo in ('insegnante', 'amministrazione')
          and not exists (select 1 from public.accessi_extra x where x.email = e and x.studio_id = new.studio_id and x.ruolo = 'amministrazione' and vuole = 'insegnante');
      end if;
    end if;
  end if;
  return new;
end
$$;

-- Chi è già entrato e ha l'interruttore acceso (Glenda e Mattia di partenza) diventa responsabile adesso.
update public.memberships m set ruolo = 'amministrazione'
from public.teachers t
where t.user_id = m.user_id and t.studio_id = m.studio_id and t.responsabile and t.attivo and m.ruolo = 'insegnante';


-- Regalo automatico: se è acceso (Ricorrenze), ogni mattina il database regala una lezione a chi compie gli anni
-- o a chi festeggia un anno (o più) dall'iscrizione. Un omaggio per ricorrenza e per anno, come quello dato a mano.
-- Chi ha i crediti illimitati non riceve nulla. Le due impostazioni stanno in studio_settings:
--   regalo_compleanni e regalo_anniversari (true o false).
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0012.

create function public.regali_automatici() returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  oggi date := (now() at time zone 'Europe/Rome')::date;
  anno text := to_char((now() at time zone 'Europe/Rome')::date, 'YYYY');
  fatti integer := 0;
  n integer;
begin
  insert into public.credit_ledger (studio_id, person_id, delta, motivo)
  select p.studio_id, p.id, 1, 'Omaggio compleanno ' || anno
  from public.people p
  join public.studio_settings s on s.studio_id = p.studio_id and s.chiave = 'regalo_compleanni' and s.valore = 'true'::jsonb
  where p.attivo and not p.crediti_illimitati and p.data_nascita is not null
    and to_char(p.data_nascita, 'MM-DD') = to_char(oggi, 'MM-DD')
    and not exists (select 1 from public.credit_ledger l where l.person_id = p.id and l.motivo = 'Omaggio compleanno ' || anno);
  get diagnostics n = row_count;
  fatti := fatti + n;

  insert into public.credit_ledger (studio_id, person_id, delta, motivo)
  select p.studio_id, p.id, 1, 'Omaggio anniversario ' || anno
  from public.people p
  join public.studio_settings s on s.studio_id = p.studio_id and s.chiave = 'regalo_anniversari' and s.valore = 'true'::jsonb
  where p.attivo and not p.crediti_illimitati
    and p.iscritto_il <= oggi - interval '1 year'
    and to_char(p.iscritto_il, 'MM-DD') = to_char(oggi, 'MM-DD')
    and not exists (select 1 from public.credit_ledger l where l.person_id = p.id and l.motivo = 'Omaggio anniversario ' || anno);
  get diagnostics n = row_count;
  return fatti + n;
end
$$;

-- Lo lancia solo la pianificazione del database, non l'app.
revoke execute on function public.regali_automatici() from public, anon, authenticated;

-- Ogni giorno alle 5:30 UTC (le 6:30 o le 7:30 in Italia). Serve l'estensione pg_cron: se non si riesce ad attivarla da qui,
-- si accende da Database → Extensions e si rilancia solo questo blocco.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('regali-automatici', '30 5 * * *', 'select public.regali_automatici()');
exception when others then
  raise notice 'Regalo automatico non pianificato (pg_cron non disponibile): %', sqlerrm;
end
$$;


-- Da contattare: due nuovi motivi per i messaggi, "A rischio abbandono" e "Da recuperare".
-- Il registro dei messaggi (contact_log) li accetta, così chi è già stato contattato non ricompare per qualche giorno.
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0013.

alter table public.contact_log drop constraint if exists contact_log_motivo_check;
alter table public.contact_log add constraint contact_log_motivo_check
  check (motivo in ('scadenza', 'pagamento', 'dati', 'compleanno', 'anniversario', 'libero', 'rischio', 'recupero'));


-- Ogni insegnante vede i suoi allievi, blocca le sue lezioni e chiede il permesso per aggiungerne.
-- "I suoi allievi" sono: chi ha prenotato una sua lezione, chi ha aggiunto lui stesso e, per Sara, chi è iscritto a un percorso.
-- Chi gestisce lo studio (amministrazione e gestione) vede tutti. Le regole stanno nel database, non solo nelle schermate.
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0014.

-- Il nome di un insegnante dentro il testo di una lezione ("Glenda e Mattia", "Giulia, Victor").
create function public.insegnante_in_testo(p_testo text, p_nome text) returns boolean
language sql immutable set search_path = ''
as $$
  select exists (
    select 1 from unnest(regexp_split_to_array(coalesce(p_testo, ''), '\s+e\s+|\s*,\s*')) t
    where lower(trim(t)) = lower(trim(p_nome))
  )
$$;

-- La lezione (orario fisso) è di chi sta chiedendo?
create function public.e_mia_lezione(p_template uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.lesson_templates t
    join public.teachers x on x.studio_id = t.studio_id and x.user_id = auth.uid() and x.attivo
    where t.id = p_template and public.insegnante_in_testo(t.insegnante, x.nome)
  )
$$;

-- Chi chiede è l'insegnante dei percorsi (Sara) di questo studio?
create function public.e_insegnante_percorsi(p_studio text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.teachers x where x.user_id = auth.uid() and x.studio_id = p_studio and x.attivo and x.fa_percorsi)
$$;

create function public.evento_e_percorso(p_evento uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select e.tipo = 'percorso' from public.events e where e.id = p_evento), false)
$$;

-- La persona è di chi sta chiedendo?
create function public.e_mia_persona(p_persona uuid, p_studio text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.e_responsabile(p_studio) or (public.e_staff(p_studio) and (
    exists (select 1 from public.people p where p.id = p_persona and p.creato_da = auth.uid())
    or exists (
      select 1 from public.bookings b
      join public.lesson_templates t on t.id = b.template_id
      join public.teachers x on x.studio_id = t.studio_id and x.user_id = auth.uid() and x.attivo
      where b.person_id = p_persona and public.insegnante_in_testo(t.insegnante, x.nome)
    )
    or (public.e_insegnante_percorsi(p_studio) and exists (
      select 1 from public.event_registrations r
      where r.person_id = p_persona and public.evento_e_percorso(r.event_id)
    ))
  ))
$$;

-- Chi è iscritto a un percorso è "di Sara": i messaggi per lei li manda Sara, non il profilo ufficiale dello studio.
-- La funzione dà solo gli identificativi (nessun nome, nessun percorso), a tutto lo staff, così ogni schermata sa a chi non scrivere.
create function public.persone_di_sara(p_studio text) returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select distinct r.person_id from public.event_registrations r
  where public.e_staff(p_studio) and r.studio_id = p_studio and r.person_id is not null and public.evento_e_percorso(r.event_id)
$$;

-- Persone e tutto ciò che le riguarda: ognuno vede le sue, i responsabili tutte.
drop policy people_lettura on public.people;
create policy people_lettura on public.people for select to authenticated using (public.e_mia_persona(id, studio_id));
drop policy people_modifica on public.people;
create policy people_modifica on public.people for update to authenticated
  using (public.e_mia_persona(id, studio_id)) with check (public.e_staff(studio_id));

drop policy notes_lettura on public.person_notes;
create policy notes_lettura on public.person_notes for select to authenticated using (public.e_mia_persona(person_id, studio_id));
drop policy purchases_lettura on public.purchases;
create policy purchases_lettura on public.purchases for select to authenticated using (public.e_mia_persona(person_id, studio_id));
drop policy ledger_lettura on public.credit_ledger;
create policy ledger_lettura on public.credit_ledger for select to authenticated using (public.e_mia_persona(person_id, studio_id));
drop policy contact_log_lettura on public.contact_log;
create policy contact_log_lettura on public.contact_log for select to authenticated using (public.e_mia_persona(person_id, studio_id));
drop policy bookings_lettura on public.bookings;
create policy bookings_lettura on public.bookings for select to authenticated using (public.e_mia_persona(person_id, studio_id));

-- Le iscrizioni ai percorsi (salute femminile) le vedono i responsabili e Sara, non gli altri insegnanti.
drop policy registrations_lettura on public.event_registrations;
create policy registrations_lettura on public.event_registrations for select to authenticated using (
  public.e_staff(studio_id)
  and (public.e_responsabile(studio_id) or not public.evento_e_percorso(event_id) or public.e_insegnante_percorsi(studio_id))
);

-- Un insegnante può fermare e riattivare le sue lezioni; le lezioni di tutti restano ai responsabili.
drop policy blocks_inserimento on public.lesson_blocks;
create policy blocks_inserimento on public.lesson_blocks for insert to authenticated with check (
  creato_da = auth.uid()
  and exists (select 1 from public.lesson_templates t where t.id = template_id and t.studio_id = lesson_blocks.studio_id)
  and (public.e_responsabile(studio_id) or (public.e_staff(studio_id) and public.e_mia_lezione(template_id)))
);
drop policy blocks_eliminazione on public.lesson_blocks;
create policy blocks_eliminazione on public.lesson_blocks for delete to authenticated using (
  public.e_responsabile(studio_id) or (public.e_staff(studio_id) and public.e_mia_lezione(template_id))
);

-- Per aggiungere una lezione un insegnante fa una richiesta: la decide un responsabile (Andrea o Glenda).
create table public.lesson_requests (
  id uuid primary key default gen_random_uuid(),
  studio_id text not null references public.studios (id),
  richiedente uuid not null references auth.users (id),
  richiedente_nome text not null check (length(trim(richiedente_nome)) > 0),
  giorno smallint not null check (giorno between 0 and 6),
  ora text not null check (ora ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  stile text not null,
  tipo text not null check (length(trim(tipo)) > 0),
  posti smallint not null default 15 check (posti between 1 and 200),
  durata_min smallint check (durata_min is null or durata_min between 15 and 480),
  nota text,
  stato text not null default 'attesa' check (stato in ('attesa', 'approvata', 'rifiutata')),
  creato_il timestamptz not null default now(),
  deciso_da uuid references auth.users (id),
  deciso_il timestamptz
);

create index lesson_requests_studio_idx on public.lesson_requests (studio_id, stato);

alter table public.lesson_requests enable row level security;

create policy lesson_requests_lettura on public.lesson_requests for select to authenticated
  using (public.e_responsabile(studio_id) or richiedente = auth.uid());
create policy lesson_requests_inserimento on public.lesson_requests for insert to authenticated with check (
  public.e_staff(studio_id) and richiedente = auth.uid() and stato = 'attesa'
  and exists (select 1 from public.teachers x where x.user_id = auth.uid() and x.studio_id = lesson_requests.studio_id and x.attivo and x.nome = richiedente_nome)
);
-- Nessuna modifica dall'app: si decide con la funzione qui sotto.

revoke all on public.lesson_requests from anon;

-- Un responsabile approva (la lezione nasce nell'orario, con quell'insegnante) o rifiuta. Tutto in un passo.
create function public.decidi_richiesta_lezione(p_id uuid, p_approva boolean) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  r public.lesson_requests;
begin
  select * into r from public.lesson_requests where id = p_id and stato = 'attesa' for update;
  if not found then raise exception 'Richiesta non trovata o già decisa'; end if;
  if not public.e_responsabile(r.studio_id) then raise exception 'Solo un responsabile può decidere'; end if;
  if p_approva then
    insert into public.lesson_templates (studio_id, giorno, ora, stile, tipo, insegnante, durata_min, posti, aggiunto_a_mano)
    values (r.studio_id, r.giorno, r.ora, r.stile, r.tipo, r.richiedente_nome, r.durata_min, r.posti, true);
  end if;
  update public.lesson_requests set stato = case when p_approva then 'approvata' else 'rifiutata' end, deciso_da = auth.uid(), deciso_il = now() where id = p_id;
end
$$;

revoke execute on function public.decidi_richiesta_lezione(uuid, boolean) from public, anon;
grant execute on function public.decidi_richiesta_lezione(uuid, boolean) to authenticated;


-- Prima del lancio: le funzioni del database non devono essere chiamabili da chi non è entrato (anon),
-- e quelle che servono solo ai trigger non devono essere chiamabili da nessuno dall'app.
-- Inoltre gli indirizzi ".invalid" (usati solo dai controlli automatici) non possono più creare un account dal servizio di accesso.
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0015.

-- Servono alle regole di accesso, che le chiamano come utente collegato: restano a chi è entrato.
revoke execute on function
  public.ruolo_in(text), public.e_staff(text), public.e_responsabile(text), public.e_staff_di_persona(uuid), public.e_staff_ovunque(),
  public.e_insegnante_di(uuid), public.e_insegnante_percorsi(text), public.e_mia_lezione(uuid), public.e_mia_persona(uuid, text),
  public.evento_e_percorso(uuid), public.insegnante_in_testo(text, text), public.posti_occupati(uuid), public.persone_di_sara(text)
from public, anon;
grant execute on function
  public.ruolo_in(text), public.e_staff(text), public.e_responsabile(text), public.e_staff_di_persona(uuid), public.e_staff_ovunque(),
  public.e_insegnante_di(uuid), public.e_insegnante_percorsi(text), public.e_mia_lezione(uuid), public.e_mia_persona(uuid, text),
  public.evento_e_percorso(uuid), public.insegnante_in_testo(text, text), public.posti_occupati(uuid), public.persone_di_sara(text)
to authenticated;

-- Funzioni dei trigger: scattano da sole, nessuno le chiama a mano.
revoke execute on function
  public.aggiorna_accessi_insegnante(), public.aggiorna_data(), public.controlla_nuovo_utente(), public.dopo_creazione_utente(),
  public.nuovo_profilo(), public.solo_titolare_cambia_responsabili()
from public, anon, authenticated;

-- Gli indirizzi .invalid non esistono: li usano solo i controlli, lanciati dal SQL Editor. Il servizio di accesso (supabase_auth_admin) non li ammette.
create or replace function public.controlla_nuovo_utente() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  e text := lower(trim(coalesce(new.email, '')));
begin
  if e like '%.invalid' and session_user <> 'supabase_auth_admin' then return new; end if;
  if e = '' or not (
    exists (select 1 from public.teachers where attivo and lower(trim(email)) = e)
    or exists (select 1 from public.accessi_extra where email = e)
  ) then
    raise exception 'Email non abilitata';
  end if;
  return new;
end
$$;

revoke execute on function public.controlla_nuovo_utente() from public, anon, authenticated;
