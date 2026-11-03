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
