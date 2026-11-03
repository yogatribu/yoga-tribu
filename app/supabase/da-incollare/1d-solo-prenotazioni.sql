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
