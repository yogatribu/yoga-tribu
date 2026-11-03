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
