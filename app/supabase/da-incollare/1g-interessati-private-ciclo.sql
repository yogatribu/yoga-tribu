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
