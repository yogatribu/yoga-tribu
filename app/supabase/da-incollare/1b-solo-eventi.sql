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
