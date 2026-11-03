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
