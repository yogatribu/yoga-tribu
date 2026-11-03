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
