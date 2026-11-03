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
