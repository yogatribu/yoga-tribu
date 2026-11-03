-- Controllo delle regole di accesso: uno studio non vede l'altro, ognuno fa solo quello che gli spetta.
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0001 e si preme Run.
--   "Success"  = tutti i controlli sono passati.
--   un errore  = il messaggio dice quale controllo è fallito.
-- Non lascia nulla nel database: crea persone finte e annulla tutto alla fine (rollback).

begin;

do $$
declare
  u_ins_t uuid := gen_random_uuid();   -- insegnante di Yoga Tribù
  u_adm_p uuid := gen_random_uuid();   -- amministrazione del Pozzo
  u_all_t uuid := gen_random_uuid();   -- allievo di Yoga Tribù
  u_nessuno uuid := gen_random_uuid(); -- ha fatto l'accesso ma non ha nessun ruolo
  l_t uuid := gen_random_uuid();       -- contatto di Yoga Tribù
  l_p uuid := gen_random_uuid();       -- contatto del Pozzo
  n int;
begin
  insert into auth.users (id, email) values
    (u_ins_t, 'ins-tribu@prova.invalid'), (u_adm_p, 'adm-pozzo@prova.invalid'),
    (u_all_t, 'all-tribu@prova.invalid'), (u_nessuno, 'nessuno@prova.invalid');
  insert into public.memberships (user_id, studio_id, ruolo) values
    (u_ins_t, 'tribu', 'insegnante'), (u_adm_p, 'pozzo', 'amministrazione'), (u_all_t, 'tribu', 'allievo');
  insert into public.leads (id, studio_id, nome) values (l_t, 'tribu', 'Contatto Tribù'), (l_p, 'pozzo', 'Contatto Pozzo');

  -- INSEGNANTE DI YOGA TRIBÙ
  perform set_config('request.jwt.claims', json_build_object('sub', u_ins_t, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.leads;
  if n <> 1 then raise exception 'Controllo 1: l''insegnante di Tribù deve vedere 1 contatto (solo il suo studio), ne vede %', n; end if;

  begin
    insert into public.leads (studio_id, nome, creato_da) values ('pozzo', 'Intruso', u_ins_t);
    raise exception 'Controllo 2: l''insegnante di Tribù non deve poter creare contatti nel Pozzo';
  exception when insufficient_privilege then null; end;

  begin
    insert into public.leads (studio_id, nome, creato_da) values ('tribu', 'Falso autore', u_adm_p);
    raise exception 'Controllo 3: non si può creare un contatto a nome di un altro';
  exception when insufficient_privilege then null; end;

  insert into public.leads (studio_id, nome, creato_da) values ('tribu', 'Nuovo contatto', u_ins_t);

  update public.leads set fase = 'prova_fissata' where id = l_t;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Controllo 4: l''insegnante deve poter aggiornare i contatti del suo studio'; end if;

  begin
    update public.leads set fase = 'non_prosegue' where id = l_t;
    raise exception 'Controllo 5: chiudere un contatto senza motivo deve essere rifiutato';
  exception when check_violation then null; end;

  delete from public.leads where id = l_t;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Controllo 6: un insegnante non deve poter eliminare contatti'; end if;

  insert into public.lead_events (lead_id, studio_id, tipo, testo, autore) values (l_t, 'tribu', 'nota', 'Ha chiamato', u_ins_t);
  update public.lead_events set testo = 'Modificato' where lead_id = l_t;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Controllo 7: la cronologia non si deve poter modificare'; end if;
  delete from public.lead_events where lead_id = l_t;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Controllo 8: la cronologia non si deve poter cancellare'; end if;

  begin
    insert into public.lead_events (lead_id, studio_id, tipo, testo, autore) values (l_p, 'tribu', 'nota', 'Su contatto altrui', u_ins_t);
    raise exception 'Controllo 9: non si può scrivere sulla cronologia di un contatto di un altro studio';
  exception when insufficient_privilege then null; end;

  begin
    insert into public.memberships (user_id, studio_id, ruolo) values (u_nessuno, 'tribu', 'insegnante');
    raise exception 'Controllo 10: un insegnante non deve poter assegnare ruoli';
  exception when insufficient_privilege then null; end;

  select count(*) into n from public.profiles where id = u_all_t;
  if n <> 1 then raise exception 'Controllo 11: l''insegnante deve vedere il profilo degli iscritti al suo studio'; end if;
  select count(*) into n from public.profiles where id = u_adm_p;
  if n <> 0 then raise exception 'Controllo 12: l''insegnante non deve vedere i profili dell''altro studio'; end if;

  -- AMMINISTRAZIONE DEL POZZO
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u_adm_p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.leads;
  if n <> 1 then raise exception 'Controllo 13: l''amministrazione del Pozzo deve vedere 1 contatto, ne vede %', n; end if;
  select count(*) into n from public.leads where studio_id = 'tribu';
  if n <> 0 then raise exception 'Controllo 14: il Pozzo non deve vedere i contatti di Tribù'; end if;
  select count(*) into n from public.profiles where id = u_all_t;
  if n <> 0 then raise exception 'Controllo 15: il Pozzo non deve vedere gli iscritti di Tribù'; end if;

  begin
    insert into public.memberships (user_id, studio_id, ruolo) values (u_nessuno, 'pozzo', 'gestione');
    raise exception 'Controllo 16: l''amministrazione non deve poter dare il ruolo gestione';
  exception when insufficient_privilege then null; end;

  begin
    insert into public.memberships (user_id, studio_id, ruolo) values (u_nessuno, 'tribu', 'insegnante');
    raise exception 'Controllo 17: l''amministrazione del Pozzo non deve poter dare ruoli in Tribù';
  exception when insufficient_privilege then null; end;

  insert into public.memberships (user_id, studio_id, ruolo) values (u_nessuno, 'pozzo', 'insegnante');

  delete from public.leads where id = l_p;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Controllo 18: l''amministrazione deve poter eliminare i contatti del suo studio'; end if;

  -- ALLIEVO DI YOGA TRIBÙ
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u_all_t, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.leads;
  if n <> 0 then raise exception 'Controllo 19: un allievo non deve vedere nessun contatto'; end if;
  select count(*) into n from public.profiles;
  if n <> 1 then raise exception 'Controllo 20: un allievo deve vedere solo il proprio profilo, ne vede %', n; end if;

  begin
    insert into public.leads (studio_id, nome, creato_da) values ('tribu', 'Da allievo', u_all_t);
    raise exception 'Controllo 21: un allievo non deve poter creare contatti';
  exception when insufficient_privilege then null; end;

  -- PERSONA SENZA RUOLO
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u_nessuno, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  -- (ora è insegnante del Pozzo, assegnato dall'amministrazione: deve vedere solo quello studio)
  select count(*) into n from public.leads where studio_id = 'tribu';
  if n <> 0 then raise exception 'Controllo 22: chi è del Pozzo non deve vedere Tribù'; end if;

  -- CHI NON HA FATTO L'ACCESSO
  execute 'reset role';
  execute 'set local role anon';
  begin
    perform 1 from public.leads limit 1;
    raise exception 'Controllo 23: senza accesso non si deve poter leggere nulla';
  exception when insufficient_privilege then null; end;

  execute 'reset role';
end
$$;

rollback;
