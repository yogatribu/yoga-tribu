-- "Responsabile" nelle Impostazioni diventa un permesso vero.
-- Un insegnante con "Responsabile" acceso ha il ruolo amministrazione (programma, insegnanti, prezzi, statistiche);
-- spento, ha il ruolo insegnante. Il titolare (gestione) non cambia mai, e chi ha un ruolo dato a mano resta com'è
-- finché non si cambia l'interruttore. Solo il titolare può cambiare i responsabili.
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0011.

-- Chi entra per la prima volta riceve il ruolo che ha l'interruttore.
create or replace function public.assegna_accessi(p_utente uuid, p_email text) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  e text := lower(trim(coalesce(p_email, '')));
begin
  if e = '' then return; end if;
  -- prima i ruoli extra, così un ruolo più alto non viene mai sostituito
  insert into public.memberships (user_id, studio_id, ruolo)
    select p_utente, studio_id, ruolo from public.accessi_extra where email = e
  on conflict (user_id, studio_id) do nothing;
  insert into public.memberships (user_id, studio_id, ruolo)
    select p_utente, studio_id, case when responsabile then 'amministrazione'::public.ruolo else 'insegnante'::public.ruolo end
    from public.teachers where attivo and lower(trim(email)) = e
  on conflict (user_id, studio_id) do nothing;
  update public.teachers set user_id = p_utente where attivo and lower(trim(email)) = e;
end
$$;

revoke execute on function public.assegna_accessi(uuid, text) from public, anon, authenticated;

-- Solo il titolare accende o spegne "Responsabile". Dal SQL Editor (nessun utente collegato) si può sempre.
create function public.solo_titolare_cambia_responsabili() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then return new; end if;
  if (tg_op = 'INSERT' and new.responsabile) or (tg_op = 'UPDATE' and new.responsabile is distinct from old.responsabile) then
    if public.ruolo_in(new.studio_id) is distinct from 'gestione' then
      raise exception 'Solo il titolare può cambiare i responsabili';
    end if;
  end if;
  return new;
end
$$;

create trigger insegnanti_0_solo_titolare before insert or update on public.teachers
for each row execute function public.solo_titolare_cambia_responsabili();

-- Come prima (collega l'account all'email e toglie l'accesso a chi esce dall'elenco), e in più il ruolo segue l'interruttore.
create or replace function public.aggiorna_accessi_insegnante() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  e text := lower(trim(coalesce(new.email, '')));
  u uuid;
  vuole public.ruolo := case when new.responsabile then 'amministrazione'::public.ruolo else 'insegnante'::public.ruolo end;
begin
  if tg_op = 'UPDATE' and old.user_id is not null
     and (not new.attivo or lower(trim(coalesce(old.email, ''))) <> e) then
    -- toglie il ruolo che veniva da qui, ma non quello che viene da accessi_extra e mai quello del titolare
    delete from public.memberships m where m.user_id = old.user_id and m.studio_id = old.studio_id and m.ruolo in ('insegnante', 'amministrazione')
      and not exists (select 1 from public.accessi_extra x where x.email = lower(trim(coalesce(old.email, ''))) and x.studio_id = old.studio_id);
  end if;
  new.user_id := null;
  if new.attivo and e <> '' then
    select id into u from auth.users where lower(trim(email)) = e limit 1;
    if u is not null then
      new.user_id := u;
      insert into public.memberships (user_id, studio_id, ruolo) values (u, new.studio_id, vuole)
      on conflict (user_id, studio_id) do nothing;
      -- se l'interruttore è cambiato, il ruolo lo segue (tranne il titolare e chi ha un ruolo da accessi_extra)
      if tg_op = 'UPDATE' and new.responsabile is distinct from old.responsabile then
        update public.memberships set ruolo = vuole
        where user_id = u and studio_id = new.studio_id and ruolo in ('insegnante', 'amministrazione')
          and not exists (select 1 from public.accessi_extra x where x.email = e and x.studio_id = new.studio_id and x.ruolo = 'amministrazione' and vuole = 'insegnante');
      end if;
    end if;
  end if;
  return new;
end
$$;

-- Chi è già entrato e ha l'interruttore acceso (Glenda e Mattia di partenza) diventa responsabile adesso.
update public.memberships m set ruolo = 'amministrazione'
from public.teachers t
where t.user_id = m.user_id and t.studio_id = m.studio_id and t.responsabile and t.attivo and m.ruolo = 'insegnante';


-- Regalo automatico: se è acceso (Ricorrenze), ogni mattina il database regala una lezione a chi compie gli anni
-- o a chi festeggia un anno (o più) dall'iscrizione. Un omaggio per ricorrenza e per anno, come quello dato a mano.
-- Chi ha i crediti illimitati non riceve nulla. Le due impostazioni stanno in studio_settings:
--   regalo_compleanni e regalo_anniversari (true o false).
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0012.

create function public.regali_automatici() returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  oggi date := (now() at time zone 'Europe/Rome')::date;
  anno text := to_char((now() at time zone 'Europe/Rome')::date, 'YYYY');
  fatti integer := 0;
  n integer;
begin
  insert into public.credit_ledger (studio_id, person_id, delta, motivo)
  select p.studio_id, p.id, 1, 'Omaggio compleanno ' || anno
  from public.people p
  join public.studio_settings s on s.studio_id = p.studio_id and s.chiave = 'regalo_compleanni' and s.valore = 'true'::jsonb
  where p.attivo and not p.crediti_illimitati and p.data_nascita is not null
    and to_char(p.data_nascita, 'MM-DD') = to_char(oggi, 'MM-DD')
    and not exists (select 1 from public.credit_ledger l where l.person_id = p.id and l.motivo = 'Omaggio compleanno ' || anno);
  get diagnostics n = row_count;
  fatti := fatti + n;

  insert into public.credit_ledger (studio_id, person_id, delta, motivo)
  select p.studio_id, p.id, 1, 'Omaggio anniversario ' || anno
  from public.people p
  join public.studio_settings s on s.studio_id = p.studio_id and s.chiave = 'regalo_anniversari' and s.valore = 'true'::jsonb
  where p.attivo and not p.crediti_illimitati
    and p.iscritto_il <= oggi - interval '1 year'
    and to_char(p.iscritto_il, 'MM-DD') = to_char(oggi, 'MM-DD')
    and not exists (select 1 from public.credit_ledger l where l.person_id = p.id and l.motivo = 'Omaggio anniversario ' || anno);
  get diagnostics n = row_count;
  return fatti + n;
end
$$;

-- Lo lancia solo la pianificazione del database, non l'app.
revoke execute on function public.regali_automatici() from public, anon, authenticated;

-- Ogni giorno alle 5:30 UTC (le 6:30 o le 7:30 in Italia). Serve l'estensione pg_cron: se non si riesce ad attivarla da qui,
-- si accende da Database → Extensions e si rilancia solo questo blocco.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('regali-automatici', '30 5 * * *', 'select public.regali_automatici()');
exception when others then
  raise notice 'Regalo automatico non pianificato (pg_cron non disponibile): %', sqlerrm;
end
$$;


-- Da contattare: due nuovi motivi per i messaggi, "A rischio abbandono" e "Da recuperare".
-- Il registro dei messaggi (contact_log) li accetta, così chi è già stato contattato non ricompare per qualche giorno.
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0013.

alter table public.contact_log drop constraint if exists contact_log_motivo_check;
alter table public.contact_log add constraint contact_log_motivo_check
  check (motivo in ('scadenza', 'pagamento', 'dati', 'compleanno', 'anniversario', 'libero', 'rischio', 'recupero'));


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


-- Prima del lancio: le funzioni del database non devono essere chiamabili da chi non è entrato (anon),
-- e quelle che servono solo ai trigger non devono essere chiamabili da nessuno dall'app.
-- Inoltre gli indirizzi ".invalid" (usati solo dai controlli automatici) non possono più creare un account dal servizio di accesso.
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0015.

-- Servono alle regole di accesso, che le chiamano come utente collegato: restano a chi è entrato.
revoke execute on function
  public.ruolo_in(text), public.e_staff(text), public.e_responsabile(text), public.e_staff_di_persona(uuid), public.e_staff_ovunque(),
  public.e_insegnante_di(uuid), public.e_insegnante_percorsi(text), public.e_mia_lezione(uuid), public.e_mia_persona(uuid, text),
  public.evento_e_percorso(uuid), public.insegnante_in_testo(text, text), public.posti_occupati(uuid), public.persone_di_sara(text)
from public, anon;
grant execute on function
  public.ruolo_in(text), public.e_staff(text), public.e_responsabile(text), public.e_staff_di_persona(uuid), public.e_staff_ovunque(),
  public.e_insegnante_di(uuid), public.e_insegnante_percorsi(text), public.e_mia_lezione(uuid), public.e_mia_persona(uuid, text),
  public.evento_e_percorso(uuid), public.insegnante_in_testo(text, text), public.posti_occupati(uuid), public.persone_di_sara(text)
to authenticated;

-- Funzioni dei trigger: scattano da sole, nessuno le chiama a mano.
revoke execute on function
  public.aggiorna_accessi_insegnante(), public.aggiorna_data(), public.controlla_nuovo_utente(), public.dopo_creazione_utente(),
  public.nuovo_profilo(), public.solo_titolare_cambia_responsabili()
from public, anon, authenticated;

-- Gli indirizzi .invalid non esistono: li usano solo i controlli, lanciati dal SQL Editor. Il servizio di accesso (supabase_auth_admin) non li ammette.
create or replace function public.controlla_nuovo_utente() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  e text := lower(trim(coalesce(new.email, '')));
begin
  if e like '%.invalid' and session_user <> 'supabase_auth_admin' then return new; end if;
  if e = '' or not (
    exists (select 1 from public.teachers where attivo and lower(trim(email)) = e)
    or exists (select 1 from public.accessi_extra where email = e)
  ) then
    raise exception 'Email non abilitata';
  end if;
  return new;
end
$$;

revoke execute on function public.controlla_nuovo_utente() from public, anon, authenticated;
