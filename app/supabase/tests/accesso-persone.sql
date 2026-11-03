-- Controllo delle regole di accesso di persone, pacchetti, crediti e note (migrazione 0003).
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0003 e si preme Run.
--   "Success" = tutti i controlli passati; un errore dice quale controllo è fallito.
-- Crea persone finte e annulla tutto alla fine (rollback): non lascia nulla.

begin;

do $$
declare
  u_ins_t uuid := gen_random_uuid();   -- insegnante di Yoga Tribù
  u_adm_p uuid := gen_random_uuid();   -- amministrazione del Pozzo
  u_all_t uuid := gen_random_uuid();   -- allievo di Yoga Tribù
  p_t uuid := gen_random_uuid();       -- persona di Yoga Tribù
  p_p uuid := gen_random_uuid();       -- persona del Pozzo
  pk_p uuid;
  pk_t uuid;
  acq uuid;
  n int;
  s int;
begin
  insert into auth.users (id, email) values
    (u_ins_t, 'ins-tribu@prova.invalid'), (u_adm_p, 'adm-pozzo@prova.invalid'), (u_all_t, 'all-tribu@prova.invalid');
  insert into public.memberships (user_id, studio_id, ruolo) values
    (u_ins_t, 'tribu', 'insegnante'), (u_adm_p, 'pozzo', 'amministrazione'), (u_all_t, 'tribu', 'allievo');
  -- la persona di Tribù l'ha aggiunta l'insegnante: così è tra le sue (migrazione 0015)
  insert into public.people (id, studio_id, nome, creato_da) values (p_t, 'tribu', 'Persona Tribù', u_ins_t), (p_p, 'pozzo', 'Persona Pozzo', null);
  select id into pk_t from public.packages where studio_id = 'tribu' limit 1;
  select id into pk_p from public.packages where studio_id = 'pozzo' limit 1;
  if pk_t is null or pk_p is null then raise exception 'Controllo 0: manca il listino di partenza (migrazione 0003 non eseguita?)'; end if;

  -- INSEGNANTE DI YOGA TRIBÙ
  perform set_config('request.jwt.claims', json_build_object('sub', u_ins_t, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.people;
  if n <> 1 then raise exception 'Controllo 1: l''insegnante di Tribù deve vedere 1 persona (solo il suo studio), ne vede %', n; end if;

  insert into public.people (studio_id, nome, creato_da) values ('tribu', 'Nuova', u_ins_t);
  begin
    insert into public.people (studio_id, nome, creato_da) values ('pozzo', 'Intrusa', u_ins_t);
    raise exception 'Controllo 2: non si può aggiungere una persona all''altro studio';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.people (studio_id, nome, creato_da) values ('tribu', 'Falso autore', u_adm_p);
    raise exception 'Controllo 3: non si può aggiungere una persona a nome di un altro';
  exception when insufficient_privilege then null; end;

  update public.people set telefono = '3287675966' where id = p_t;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Controllo 4: l''insegnante deve poter modificare le persone del suo studio'; end if;
  update public.people set telefono = '1' where id = p_p;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Controllo 5: non si modificano le persone dell''altro studio'; end if;
  delete from public.people where id = p_t;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Controllo 6: le persone non si eliminano'; end if;

  select count(*) into n from public.packages where studio_id = 'pozzo';
  if n <> 0 then raise exception 'Controllo 7: l''insegnante di Tribù non deve vedere il listino del Pozzo'; end if;
  update public.packages set prezzo_cent = 1 where id = pk_t;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Controllo 8: un insegnante non deve poter cambiare i prezzi'; end if;

  begin
    insert into public.purchases (studio_id, person_id, nome, crediti, prezzo_cent, creato_da) values ('tribu', p_t, '10 lezioni', 10, 15000, u_ins_t);
    raise exception 'Controllo 9: un insegnante non deve poter vendere pacchetti';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.credit_ledger (studio_id, person_id, delta, motivo, creato_da) values ('tribu', p_t, 5, 'Prova', u_ins_t);
    raise exception 'Controllo 10: un insegnante non deve poter cambiare i crediti';
  exception when insufficient_privilege then null; end;

  insert into public.person_notes (person_id, studio_id, tipo, testo, autore) values (p_t, 'tribu', 'salute', 'Schiena', u_ins_t);
  begin
    insert into public.person_notes (person_id, studio_id, tipo, testo, autore) values (p_t, 'tribu', 'nota', 'Falsa', u_adm_p);
    raise exception 'Controllo 11: non si scrive una nota a nome di un altro';
  exception when insufficient_privilege then null; end;
  update public.person_notes set testo = 'Cambiata' where person_id = p_t;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Controllo 12: le note non si modificano'; end if;
  delete from public.person_notes where person_id = p_t;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Controllo 13: le note non si cancellano'; end if;

  insert into public.contact_log (studio_id, person_id, motivo, creato_da) values ('tribu', p_t, 'scadenza', u_ins_t);
  begin
    insert into public.contact_log (studio_id, person_id, motivo, creato_da) values ('tribu', p_p, 'scadenza', u_ins_t);
    raise exception 'Controllo 14: non si segna un richiamo su una persona dell''altro studio';
  exception when insufficient_privilege then null; end;

  -- AMMINISTRAZIONE DEL POZZO
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u_adm_p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.people where studio_id = 'tribu';
  if n <> 0 then raise exception 'Controllo 15: il Pozzo non deve vedere le persone di Tribù'; end if;

  insert into public.purchases (studio_id, person_id, package_id, nome, crediti, prezzo_cent, creato_da)
    values ('pozzo', p_p, pk_p, '4 lezioni', 4, 6000, u_adm_p) returning id into acq;
  begin
    insert into public.purchases (studio_id, person_id, nome, crediti, prezzo_cent, creato_da) values ('pozzo', p_t, 'Su persona altrui', 4, 6000, u_adm_p);
    raise exception 'Controllo 16: non si vende un pacchetto a una persona dell''altro studio';
  exception when insufficient_privilege then null; end;

  insert into public.credit_ledger (studio_id, person_id, purchase_id, delta, motivo, creato_da) values ('pozzo', p_p, acq, 4, 'Acquisto 4 lezioni', u_adm_p);
  begin
    insert into public.credit_ledger (studio_id, person_id, delta, motivo, creato_da) values ('pozzo', p_p, 0, 'Zero', u_adm_p);
    raise exception 'Controllo 17: un movimento di crediti a zero non ha senso';
  exception when check_violation then null; end;
  update public.credit_ledger set delta = 99 where person_id = p_p;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Controllo 18: il registro dei crediti non si riscrive'; end if;
  delete from public.credit_ledger where person_id = p_p;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Controllo 19: il registro dei crediti non si cancella'; end if;

  select t.saldo, t.da_incassare_cent into s, n from public.person_totals t where t.person_id = p_p;
  if s <> 4 or n <> 6000 then raise exception 'Controllo 20: saldo 4 e 6000 da incassare attesi, trovati % e %', s, n; end if;
  select count(*) into n from public.person_totals where studio_id = 'tribu';
  if n <> 0 then raise exception 'Controllo 21: i totali di Tribù non devono comparire nel Pozzo'; end if;

  update public.purchases set incassato = true where id = acq;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Controllo 22: l''amministrazione deve poter segnare un incasso'; end if;
  select t.da_incassare_cent into n from public.person_totals t where t.person_id = p_p;
  if n <> 0 then raise exception 'Controllo 23: dopo l''incasso non resta nulla da incassare, trovati %', n; end if;

  update public.packages set prezzo_cent = prezzo_cent where id = pk_p;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Controllo 24: l''amministrazione deve poter modificare il listino del suo studio'; end if;
  update public.packages set prezzo_cent = 1 where id = pk_t;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Controllo 25: non si modifica il listino dell''altro studio'; end if;

  -- ALLIEVO DI YOGA TRIBÙ
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u_all_t, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.people;
  if n <> 0 then raise exception 'Controllo 26: un allievo non deve vedere l''elenco delle persone'; end if;
  select count(*) into n from public.credit_ledger;
  if n <> 0 then raise exception 'Controllo 27: un allievo non deve leggere il registro dei crediti degli altri'; end if;

  -- CHI NON HA FATTO L'ACCESSO
  execute 'reset role';
  execute 'set local role anon';
  begin
    perform 1 from public.people limit 1;
    raise exception 'Controllo 28: senza accesso non si deve poter leggere nulla';
  exception when insufficient_privilege then null; end;

  execute 'reset role';
end
$$;

rollback;
