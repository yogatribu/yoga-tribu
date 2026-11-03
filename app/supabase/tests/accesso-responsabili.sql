-- Controllo del permesso "Responsabile" (migrazione 0012).
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0012 e si preme Run.
--   "Success" = tutti i controlli passati; un errore dice quale controllo è fallito.
-- Crea account e insegnanti finti e annulla tutto alla fine (rollback): non lascia nulla.

begin;

do $$
declare
  u_ges uuid := gen_random_uuid();   -- titolare
  u_adm uuid := gen_random_uuid();   -- responsabile, non titolare
  u_r uuid := gen_random_uuid();     -- insegnante che diventa responsabile
  u_s uuid := gen_random_uuid();     -- segreteria, da accessi_extra
  bloccato boolean;
  r text;
  n int;
begin
  insert into auth.users (id, email) values (u_ges, 'ges@prova.invalid'), (u_adm, 'adm@prova.invalid'), (u_r, 'resp@prova.invalid'), (u_s, 'seg@prova.invalid');
  insert into public.memberships (user_id, studio_id, ruolo) values (u_ges, 'tribu', 'gestione'), (u_adm, 'tribu', 'amministrazione');

  -- 1. Un insegnante con l'interruttore acceso riceve il ruolo amministrazione, spento il ruolo insegnante
  insert into public.teachers (studio_id, nome, email, responsabile) values ('tribu', 'Prova Resp', 'resp@prova.invalid', true);
  select ruolo::text into r from public.memberships where user_id = u_r and studio_id = 'tribu';
  if r is distinct from 'amministrazione' then raise exception 'Controllo 1: con Responsabile acceso il ruolo è amministrazione, è %', coalesce(r, 'nulla'); end if;

  update public.teachers set responsabile = false where studio_id = 'tribu' and nome = 'Prova Resp';
  select ruolo::text into r from public.memberships where user_id = u_r and studio_id = 'tribu';
  if r is distinct from 'insegnante' then raise exception 'Controllo 2: spento, il ruolo torna insegnante, è %', coalesce(r, 'nulla'); end if;

  update public.teachers set responsabile = true where studio_id = 'tribu' and nome = 'Prova Resp';
  select ruolo::text into r from public.memberships where user_id = u_r and studio_id = 'tribu';
  if r is distinct from 'amministrazione' then raise exception 'Controllo 3: riacceso, il ruolo è amministrazione, è %', coalesce(r, 'nulla'); end if;

  -- 2. Chi entra per la prima volta dopo che l'interruttore è già acceso riceve subito il ruolo giusto
  insert into public.teachers (studio_id, nome, email, responsabile) values ('tribu', 'Prova Nuovo', 'nuovo@prova.invalid', true);
  insert into auth.users (id, email) values (gen_random_uuid(), 'nuovo@prova.invalid');
  select count(*) into n from public.memberships m join auth.users a on a.id = m.user_id where a.email = 'nuovo@prova.invalid' and m.ruolo = 'amministrazione';
  if n <> 1 then raise exception 'Controllo 4: chi entra con Responsabile acceso deve avere amministrazione'; end if;

  -- 3. Il titolare non viene mai abbassato, nemmeno se è tra gli insegnanti con l'interruttore spento
  insert into public.teachers (studio_id, nome, email, responsabile) values ('tribu', 'Prova Titolare', 'ges@prova.invalid', true);
  update public.teachers set responsabile = false where studio_id = 'tribu' and nome = 'Prova Titolare';
  select ruolo::text into r from public.memberships where user_id = u_ges and studio_id = 'tribu';
  if r is distinct from 'gestione' then raise exception 'Controllo 5: il titolare resta gestione, è %', coalesce(r, 'nulla'); end if;

  -- 4. Chi ha il ruolo da accessi_extra non lo perde spegnendo l'interruttore
  insert into public.accessi_extra (email, studio_id, ruolo) values ('seg@prova.invalid', 'tribu', 'amministrazione');
  insert into public.memberships (user_id, studio_id, ruolo) values (u_s, 'tribu', 'amministrazione') on conflict do nothing;
  insert into public.teachers (studio_id, nome, email, responsabile) values ('tribu', 'Prova Segreteria', 'seg@prova.invalid', true);
  update public.teachers set responsabile = false where studio_id = 'tribu' and nome = 'Prova Segreteria';
  select ruolo::text into r from public.memberships where user_id = u_s and studio_id = 'tribu';
  if r is distinct from 'amministrazione' then raise exception 'Controllo 6: il ruolo da accessi_extra resta, è %', coalesce(r, 'nulla'); end if;

  -- 5. Toglierlo dall'elenco toglie anche il ruolo di responsabile
  update public.teachers set attivo = false where studio_id = 'tribu' and nome = 'Prova Resp';
  select count(*) into n from public.memberships where user_id = u_r and studio_id = 'tribu';
  if n <> 0 then raise exception 'Controllo 7: un insegnante tolto dall''elenco non deve avere più accesso'; end if;

  -- 6. Un responsabile che non è il titolare non può cambiare i responsabili
  perform set_config('request.jwt.claims', json_build_object('sub', u_adm, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  bloccato := false;
  begin
    update public.teachers set responsabile = true where studio_id = 'tribu' and nome = 'Prova Nuovo';
    update public.teachers set responsabile = false where studio_id = 'tribu' and nome = 'Prova Nuovo';
  exception when raise_exception then bloccato := true; end;
  if not bloccato then raise exception 'Controllo 8: solo il titolare può cambiare un responsabile'; end if;
  bloccato := false;
  begin
    insert into public.teachers (studio_id, nome, responsabile) values ('tribu', 'Prova Abusivo', true);
  exception when raise_exception then bloccato := true; end;
  if not bloccato then raise exception 'Controllo 9: un responsabile non può aggiungere un altro responsabile'; end if;
  -- ma può aggiungere un insegnante normale e cambiarne altri dati
  insert into public.teachers (studio_id, nome, responsabile) values ('tribu', 'Prova Normale', false);
  update public.teachers set fa_private = true where studio_id = 'tribu' and nome = 'Prova Normale';
  execute 'reset role';

  -- 7. Il titolare può
  perform set_config('request.jwt.claims', json_build_object('sub', u_ges, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.teachers set responsabile = true where studio_id = 'tribu' and nome = 'Prova Normale';
  execute 'reset role';
  select responsabile::int into n from public.teachers where studio_id = 'tribu' and nome = 'Prova Normale';
  if n <> 1 then raise exception 'Controllo 10: il titolare deve poter nominare un responsabile'; end if;
end
$$;

rollback;
