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
