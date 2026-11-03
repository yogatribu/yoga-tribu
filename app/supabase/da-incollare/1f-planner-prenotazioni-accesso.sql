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
