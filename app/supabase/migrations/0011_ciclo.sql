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
