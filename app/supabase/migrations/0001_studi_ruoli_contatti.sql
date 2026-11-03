-- Prima migrazione: studi, persone, ruoli, contatti (Interessati).
-- Regola di fondo: uno studio non vede mai i dati dell'altro. Le regole di sicurezza per riga
-- sono qui nel database, non nelle schermate. Vedi docs/decisioni-app.md.
-- Si esegue una volta sola da Supabase, SQL Editor (o con la CLI: supabase db push).

create type public.ruolo as enum ('allievo', 'insegnante', 'amministrazione', 'gestione');
create type public.fase_contatto as enum ('interessato', 'prova_fissata', 'prova_fatta', 'iscritto', 'non_prosegue');
create type public.motivo_chiusura as enum ('troppo_lontano', 'prezzo', 'orari_non_adatti', 'non_risponde', 'altro');

create table public.studios (
  id text primary key check (id ~ '^[a-z]+$'),
  nome text not null
);

insert into public.studios (id, nome) values ('tribu', 'Yoga Tribù'), ('pozzo', 'Pozzo dell''Eternità');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text,
  cognome text,
  telefono text,
  creato_il timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  studio_id text not null references public.studios (id),
  ruolo public.ruolo not null default 'allievo',
  creato_il timestamptz not null default now(),
  unique (user_id, studio_id)
);

create index memberships_studio_idx on public.memberships (studio_id);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  studio_id text not null references public.studios (id),
  nome text not null check (length(trim(nome)) > 0),
  telefono text,
  fonte text,
  cerca text,
  nota text,
  fase public.fase_contatto not null default 'interessato',
  richiamo_il date,
  prova_il timestamptz,
  motivo_chiusura public.motivo_chiusura,
  creato_da uuid references auth.users (id),
  creato_il timestamptz not null default now(),
  aggiornato_il timestamptz not null default now(),
  -- chiudere un contatto richiede il motivo
  constraint motivo_se_chiuso check (fase <> 'non_prosegue' or motivo_chiusura is not null)
);

create index leads_studio_fase_idx on public.leads (studio_id, fase);
create index leads_richiamo_idx on public.leads (studio_id, richiamo_il);

-- Cronologia di ogni contatto: si può solo aggiungere, mai modificare o togliere.
create table public.lead_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  studio_id text not null references public.studios (id),
  tipo text not null check (tipo in ('nota', 'messaggio_inviato', 'risposta', 'cambio_fase', 'richiamo')),
  testo text,
  autore uuid references auth.users (id),
  creato_il timestamptz not null default now()
);

create index lead_events_lead_idx on public.lead_events (lead_id, creato_il);

-- Funzioni di appoggio per le regole di sicurezza.
-- security definer + search_path vuoto: leggono memberships senza rientrare nelle sue stesse regole.
create function public.ruolo_in(p_studio text) returns public.ruolo
language sql stable security definer set search_path = ''
as $$
  select m.ruolo from public.memberships m
  where m.user_id = auth.uid() and m.studio_id = p_studio
$$;

create function public.e_staff(p_studio text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.ruolo_in(p_studio) in ('insegnante', 'amministrazione', 'gestione'), false)
$$;

create function public.e_responsabile(p_studio text) returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.ruolo_in(p_studio) in ('amministrazione', 'gestione'), false)
$$;

-- Vero se la persona è iscritta a uno studio in cui chi chiede è staff.
-- Serve una funzione a parte: dentro la regola dei profili la tabella memberships mostrerebbe
-- a un insegnante solo le proprie righe, e non vedrebbe mai gli allievi.
create function public.e_staff_di_persona(p_persona uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = p_persona and public.e_staff(m.studio_id)
  )
$$;

-- Alla creazione dell'account (primo accesso con il codice) nasce il profilo vuoto.
-- Nessuna appartenenza a uno studio: la assegna un responsabile.
create function public.nuovo_profilo() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end
$$;

create trigger alla_creazione_utente after insert on auth.users
for each row execute function public.nuovo_profilo();

create function public.aggiorna_data() returns trigger
language plpgsql
as $$
begin
  new.aggiornato_il = now();
  return new;
end
$$;

create trigger leads_aggiornato before update on public.leads
for each row execute function public.aggiorna_data();

-- Sicurezza per riga: tutto chiuso, poi si apre solo quello che serve.
alter table public.studios enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.leads enable row level security;
alter table public.lead_events enable row level security;

create policy studios_lettura on public.studios
  for select to authenticated using (true);

-- Profili: ognuno il proprio; lo staff vede le persone iscritte al proprio studio.
create policy profiles_proprio on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_staff_lettura on public.profiles
  for select to authenticated using (public.e_staff_di_persona(id));
create policy profiles_modifica_proprio on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Appartenenze: ognuno vede le proprie; i responsabili quelle del loro studio.
-- Solo i responsabili assegnano ruoli, e il ruolo "gestione" lo assegna solo chi è già gestione.
create policy memberships_proprie on public.memberships
  for select to authenticated using (user_id = auth.uid());
create policy memberships_responsabile_lettura on public.memberships
  for select to authenticated using (public.e_responsabile(studio_id));
create policy memberships_responsabile_inserimento on public.memberships
  for insert to authenticated with check (
    public.e_responsabile(studio_id)
    and (ruolo <> 'gestione' or public.ruolo_in(studio_id) = 'gestione')
  );
create policy memberships_responsabile_modifica on public.memberships
  for update to authenticated
  using (public.e_responsabile(studio_id))
  with check (
    public.e_responsabile(studio_id)
    and (ruolo <> 'gestione' or public.ruolo_in(studio_id) = 'gestione')
  );

-- Contatti: tutto lo staff dello studio li vede e li gestisce; solo i responsabili li eliminano.
create policy leads_lettura on public.leads
  for select to authenticated using (public.e_staff(studio_id));
create policy leads_inserimento on public.leads
  for insert to authenticated with check (public.e_staff(studio_id) and creato_da = auth.uid());
create policy leads_modifica on public.leads
  for update to authenticated using (public.e_staff(studio_id)) with check (public.e_staff(studio_id));
create policy leads_eliminazione on public.leads
  for delete to authenticated using (public.e_responsabile(studio_id));

-- Cronologia: si legge e si aggiunge, non si modifica né si toglie (nessuna regola per update/delete).
create policy lead_events_lettura on public.lead_events
  for select to authenticated using (public.e_staff(studio_id));
create policy lead_events_inserimento on public.lead_events
  for insert to authenticated with check (
    public.e_staff(studio_id)
    and autore = auth.uid()
    and exists (select 1 from public.leads l where l.id = lead_id and l.studio_id = lead_events.studio_id)
  );

-- Nessun accesso senza accesso: chi non ha fatto il login non vede niente.
revoke all on all tables in schema public from anon;
