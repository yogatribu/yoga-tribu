-- Controllo dell'accesso riservato agli insegnanti (migrazione 0008).
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0008 e si preme Run.
--   "Success" = tutti i controlli passati; un errore dice quale controllo è fallito.
-- Crea account e insegnanti finti e annulla tutto alla fine (rollback): non lascia nulla.

begin;

do $$
declare
  u_adm uuid := gen_random_uuid();     -- amministrazione di Yoga Tribù (indirizzo .invalid: ammesso dai controlli)
  u_prova uuid := gen_random_uuid();   -- insegnante che entra per la prima volta
  u_due uuid := gen_random_uuid();     -- insegnante scritto con le maiuscole diverse
  u_seg uuid := gen_random_uuid();     -- segreteria, da accessi_extra
  u_gia uuid := gen_random_uuid();     -- amministrazione che poi viene aggiunta anche tra gli insegnanti
  bloccato boolean;
  n int;
  r text;
  v uuid;
begin
  insert into auth.users (id, email) values (u_adm, 'adm-tribu@prova.invalid'), (u_gia, 'gia@prova.invalid');
  insert into public.memberships (user_id, studio_id, ruolo) values (u_adm, 'tribu', 'amministrazione'), (u_gia, 'tribu', 'amministrazione');

  -- 1. Un'email che nessuno ha abilitato non riesce a creare l'account
  bloccato := false;
  begin
    insert into auth.users (id, email) values (gen_random_uuid(), 'sconosciuto@esempio.test');
  exception when raise_exception then bloccato := true; end;
  if not bloccato then raise exception 'Controllo 1: un''email non in elenco non deve poter creare l''account'; end if;

  -- 2. Nemmeno senza email (accessi anonimi)
  bloccato := false;
  begin
    insert into auth.users (id) values (gen_random_uuid());
  exception when raise_exception then bloccato := true; end;
  if not bloccato then raise exception 'Controllo 2: un account senza email non deve poter nascere'; end if;

  -- 3. Un insegnante messo in elenco può entrare: ruolo e nome si collegano da soli
  insert into public.teachers (studio_id, nome, email) values ('tribu', 'Prova Uno', 'Prova.Uno@esempio.test');
  insert into auth.users (id, email) values (u_prova, 'prova.uno@esempio.test');
  select ruolo::text into r from public.memberships where user_id = u_prova and studio_id = 'tribu';
  if r is distinct from 'insegnante' then raise exception 'Controllo 3: l''insegnante deve ricevere il ruolo insegnante a Tribù, ha %', coalesce(r, 'nulla'); end if;
  select user_id into v from public.teachers where studio_id = 'tribu' and nome = 'Prova Uno';
  if v is distinct from u_prova then raise exception 'Controllo 4: l''insegnante deve risultare collegato al suo account'; end if;
  select count(*) into n from public.profiles where id = u_prova;
  if n <> 1 then raise exception 'Controllo 5: il profilo deve nascere insieme all''account'; end if;

  -- 4. Stessa email in un secondo studio: ruolo anche lì, subito
  insert into public.teachers (studio_id, nome, email) values ('pozzo', 'Prova Uno', 'prova.uno@esempio.test');
  select count(*) into n from public.memberships where user_id = u_prova;
  if n <> 2 then raise exception 'Controllo 6: l''email in due studi deve dare due appartenenze, trovate %', n; end if;

  -- 5. Le maiuscole nell'email non contano
  insert into public.teachers (studio_id, nome, email) values ('tribu', 'Prova Due', 'prova.due@esempio.test');
  insert into auth.users (id, email) values (u_due, 'PROVA.DUE@Esempio.test');
  select count(*) into n from public.memberships where user_id = u_due and ruolo = 'insegnante';
  if n <> 1 then raise exception 'Controllo 7: le maiuscole non devono cambiare l''esito'; end if;

  -- 6. Chi è fuori dall'elenco (ex insegnante) non crea l'account
  insert into public.teachers (studio_id, nome, email, attivo) values ('tribu', 'Ex Prova', 'ex@esempio.test', false);
  bloccato := false;
  begin
    insert into auth.users (id, email) values (gen_random_uuid(), 'ex@esempio.test');
  exception when raise_exception then bloccato := true; end;
  if not bloccato then raise exception 'Controllo 8: un insegnante non attivo non deve poter creare l''account'; end if;

  -- 7. Un ruolo più alto non viene mai abbassato
  insert into public.teachers (studio_id, nome, email) values ('tribu', 'Gia Amministrazione', 'gia@prova.invalid');
  select ruolo::text into r from public.memberships where user_id = u_gia and studio_id = 'tribu';
  if r is distinct from 'amministrazione' then raise exception 'Controllo 9: l''amministrazione aggiunta tra gli insegnanti deve restare amministrazione, è %', r; end if;

  -- 8. Segreteria da accessi_extra
  insert into public.accessi_extra (email, studio_id, ruolo) values ('segreteria@esempio.test', 'tribu', 'amministrazione');
  insert into auth.users (id, email) values (u_seg, 'Segreteria@esempio.test');
  select ruolo::text into r from public.memberships where user_id = u_seg and studio_id = 'tribu';
  if r is distinct from 'amministrazione' then raise exception 'Controllo 10: la segreteria in accessi_extra deve ricevere il suo ruolo, ha %', coalesce(r, 'nulla'); end if;

  -- 9. Togliere un insegnante gli toglie l'accesso a quello studio, non agli altri
  update public.teachers set attivo = false where studio_id = 'tribu' and nome = 'Prova Uno';
  select count(*) into n from public.memberships where user_id = u_prova and studio_id = 'tribu';
  if n <> 0 then raise exception 'Controllo 11: dopo la rimozione l''insegnante non deve più avere accesso a Tribù'; end if;
  select count(*) into n from public.memberships where user_id = u_prova and studio_id = 'pozzo';
  if n <> 1 then raise exception 'Controllo 12: l''accesso al Pozzo deve restare'; end if;
  select user_id into v from public.teachers where studio_id = 'tribu' and nome = 'Prova Uno';
  if v is not null then raise exception 'Controllo 13: la riga tolta non deve restare collegata all''account'; end if;

  -- 10. Cambiare l'email toglie l'accesso al vecchio indirizzo
  update public.teachers set email = 'altra@esempio.test' where studio_id = 'tribu' and nome = 'Prova Due';
  select count(*) into n from public.memberships where user_id = u_due;
  if n <> 0 then raise exception 'Controllo 14: cambiando email il vecchio account deve perdere l''accesso'; end if;

  -- 11. Chi gestisce lo studio non può collegare un insegnante a un account scelto a mano
  perform set_config('request.jwt.claims', json_build_object('sub', u_adm, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.teachers set user_id = u_seg, fa_percorsi = true where studio_id = 'tribu' and nome = 'Prova Due';
  execute 'reset role';
  select user_id into v from public.teachers where studio_id = 'tribu' and nome = 'Prova Due';
  if v is not null then raise exception 'Controllo 15: il collegamento si calcola dall''email, non si sceglie'; end if;

  -- 12. accessi_extra e la funzione che dà i ruoli sono chiusi all'app
  perform set_config('request.jwt.claims', json_build_object('sub', u_adm, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  bloccato := false;
  begin
    perform count(*) from public.accessi_extra;
  exception when insufficient_privilege then bloccato := true; end;
  if not bloccato then raise exception 'Controllo 16: accessi_extra non deve essere leggibile dall''app'; end if;
  bloccato := false;
  begin
    perform public.assegna_accessi(u_adm, 'prova.uno@esempio.test');
  exception when insufficient_privilege then bloccato := true; end;
  if not bloccato then raise exception 'Controllo 17: assegna_accessi non deve essere chiamabile dall''app'; end if;
  execute 'reset role';

  -- 13. Sara è l'unica a vedere i Percorsi tra gli insegnanti di partenza
  select count(*) into n from public.teachers where fa_percorsi and studio_id = 'tribu' and nome <> 'Sara' and nome not like 'Prova%' and nome <> 'Ex Prova' and nome <> 'Gia Amministrazione';
  if n <> 0 then raise exception 'Controllo 18: i Percorsi sono solo di Sara, trovati altri % insegnanti', n; end if;
  select count(*) into n from public.teachers where fa_percorsi and studio_id = 'tribu' and nome = 'Sara';
  if n <> 1 then raise exception 'Controllo 19: Sara deve avere i Percorsi'; end if;
end
$$;

rollback;
