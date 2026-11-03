-- Controllo delle regole di accesso del Programma (migrazione 0002).
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0002 e si preme Run.
--   "Success" = tutti i controlli passati; un errore dice quale controllo è fallito.
-- Crea persone finte e annulla tutto alla fine (rollback): non lascia nulla.

begin;

do $$
declare
  u_ins_t uuid := gen_random_uuid();   -- insegnante di Yoga Tribù
  u_adm_p uuid := gen_random_uuid();   -- amministrazione del Pozzo
  u_all_t uuid := gen_random_uuid();   -- allievo di Yoga Tribù
  t_t uuid;                            -- una lezione di Yoga Tribù
  t_p uuid;                            -- una lezione del Pozzo
  n int;
begin
  insert into auth.users (id, email) values
    (u_ins_t, 'ins-tribu@prova.invalid'), (u_adm_p, 'adm-pozzo@prova.invalid'), (u_all_t, 'all-tribu@prova.invalid');
  insert into public.memberships (user_id, studio_id, ruolo) values
    (u_ins_t, 'tribu', 'insegnante'), (u_adm_p, 'pozzo', 'amministrazione'), (u_all_t, 'tribu', 'allievo');
  select id into t_t from public.lesson_templates where studio_id = 'tribu' limit 1;
  select id into t_p from public.lesson_templates where studio_id = 'pozzo' limit 1;
  if t_t is null or t_p is null then raise exception 'Controllo 0: mancano gli orari di partenza (migrazione 0002 non eseguita?)'; end if;

  -- INSEGNANTE DI YOGA TRIBÙ
  perform set_config('request.jwt.claims', json_build_object('sub', u_ins_t, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.lesson_templates where studio_id = 'pozzo';
  if n <> 0 then raise exception 'Controllo 1: l''insegnante di Tribù non deve vedere gli orari del Pozzo'; end if;
  select count(*) into n from public.lesson_templates where studio_id = 'tribu';
  if n = 0 then raise exception 'Controllo 2: l''insegnante di Tribù deve vedere gli orari del suo studio'; end if;

  begin
    insert into public.lesson_templates (studio_id, giorno, ora, stile, tipo, insegnante) values ('tribu', 1, '10:00', 'iyengar', 'Prova', 'Io');
    raise exception 'Controllo 3: un insegnante non deve poter aggiungere lezioni';
  exception when insufficient_privilege then null; end;

  update public.lesson_templates set attivo = false where id = t_t;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Controllo 4: un insegnante non deve poter togliere lezioni'; end if;

  begin
    insert into public.lesson_blocks (template_id, studio_id, data, creato_da, gruppo_id, scope, da, a) values (t_t, 'tribu', '2026-11-09', u_ins_t, gen_random_uuid(), 'tutti', '2026-11-09', '2026-11-09');
    raise exception 'Controllo 5: un insegnante non deve poter fermare lezioni';
  exception when insufficient_privilege then null; end;

  -- AMMINISTRAZIONE DEL POZZO
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u_adm_p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.lesson_templates where studio_id = 'tribu';
  if n <> 0 then raise exception 'Controllo 6: il Pozzo non deve vedere gli orari di Tribù'; end if;

  insert into public.lesson_templates (studio_id, giorno, ora, stile, tipo, insegnante, aggiunto_a_mano)
    values ('pozzo', 5, '10:00', 'livello-1', 'Prova', 'Mattia', true);

  begin
    insert into public.lesson_templates (studio_id, giorno, ora, stile, tipo, insegnante) values ('tribu', 1, '10:00', 'iyengar', 'Intruso', 'Io');
    raise exception 'Controllo 7: il Pozzo non deve poter aggiungere lezioni a Tribù';
  exception when insufficient_privilege then null; end;

  insert into public.lesson_blocks (template_id, studio_id, data, motivo, creato_da, gruppo_id, scope, da, a) values (t_p, 'pozzo', '2026-11-09', 'Festivo', u_adm_p, gen_random_uuid(), 'tutti', '2026-11-09', '2026-11-09');

  begin
    insert into public.lesson_blocks (template_id, studio_id, data, creato_da, gruppo_id, scope, da, a) values (t_p, 'pozzo', '2026-11-16', u_ins_t, gen_random_uuid(), 'tutti', '2026-11-16', '2026-11-16');
    raise exception 'Controllo 8: non si può fermare una lezione a nome di un altro';
  exception when insufficient_privilege then null; end;

  begin
    insert into public.lesson_blocks (template_id, studio_id, data, creato_da, gruppo_id, scope, da, a) values (t_t, 'pozzo', '2026-11-16', u_adm_p, gen_random_uuid(), 'tutti', '2026-11-16', '2026-11-16');
    raise exception 'Controllo 9: non si può fermare una lezione di un altro studio';
  exception when insufficient_privilege then null; end;

  begin
    insert into public.lesson_blocks (template_id, studio_id, data, creato_da, gruppo_id, scope, da, a) values (t_p, 'pozzo', '2026-11-09', u_adm_p, gen_random_uuid(), 'tutti', '2026-11-09', '2026-11-09');
    raise exception 'Controllo 10: la stessa lezione non si ferma due volte nello stesso giorno';
  exception when unique_violation then null; end;

  update public.lesson_templates set attivo = false where id = t_t;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Controllo 11: il Pozzo non deve poter togliere lezioni di Tribù'; end if;

  update public.lesson_templates set attivo = false where id = t_p;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Controllo 12: l''amministrazione deve poter togliere una lezione del suo studio'; end if;

  delete from public.lesson_blocks where template_id = t_p and data = '2026-11-09';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Controllo 13: l''amministrazione deve poter riattivare una lezione ferma'; end if;

  -- ALLIEVO DI YOGA TRIBÙ
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u_all_t, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.lesson_templates;
  if n <> 0 then raise exception 'Controllo 14: l''allievo non deve leggere la tabella degli orari di lavoro (per ora)'; end if;

  -- CHI NON HA FATTO L'ACCESSO
  execute 'reset role';
  execute 'set local role anon';
  begin
    perform 1 from public.lesson_templates limit 1;
    raise exception 'Controllo 15: senza accesso non si deve poter leggere nulla';
  exception when insufficient_privilege then null; end;

  execute 'reset role';
end
$$;

rollback;
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
-- Controllo delle regole di accesso degli eventi condivisi e dei percorsi (migrazione 0005).
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0005 e si preme Run.
--   "Success" = tutti i controlli passati; un errore dice quale controllo è fallito.
-- Crea persone ed eventi finti e annulla tutto alla fine (rollback): non lascia nulla.

begin;

do $$
declare
  u_ins_t uuid := gen_random_uuid();   -- insegnante di Yoga Tribù
  u_adm_p uuid := gen_random_uuid();   -- amministrazione del Pozzo
  u_all_t uuid := gen_random_uuid();   -- allievo di Yoga Tribù
  p_t uuid := gen_random_uuid();       -- persona di Yoga Tribù
  p_p uuid := gen_random_uuid();       -- persona del Pozzo
  e_cond uuid := gen_random_uuid();    -- workshop condiviso
  e_perc uuid := gen_random_uuid();    -- percorso solo di Yoga Tribù
  n int;
begin
  insert into auth.users (id, email) values
    (u_ins_t, 'ins-tribu@prova.invalid'), (u_adm_p, 'adm-pozzo@prova.invalid'), (u_all_t, 'all-tribu@prova.invalid');
  insert into public.memberships (user_id, studio_id, ruolo) values
    (u_ins_t, 'tribu', 'insegnante'), (u_adm_p, 'pozzo', 'amministrazione'), (u_all_t, 'tribu', 'allievo');
  -- la persona di Tribù l'ha aggiunta l'insegnante: così è tra le sue (migrazione 0015)
  insert into public.people (id, studio_id, nome, creato_da) values (p_t, 'tribu', 'Persona Tribù', u_ins_t), (p_p, 'pozzo', 'Persona Pozzo', null);
  insert into public.events (id, tipo, titolo, da, luogo, posti, iscritti_fissi, studio_origine) values (e_cond, 'workshop', 'Condiviso', '2026-12-01', 'Cassola', 15, 3, 'tribu');
  insert into public.events (id, tipo, titolo, da, luogo, posti, studio_origine, solo_studio, passo) values (e_perc, 'percorso', 'Solo Tribù', '2026-12-01', 'Cassola', 15, 'tribu', 'tribu', 'neonatale');

  -- INSEGNANTE DI YOGA TRIBÙ
  perform set_config('request.jwt.claims', json_build_object('sub', u_ins_t, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.events;
  if n <> 2 then raise exception 'Controllo 1: l''insegnante di Tribù deve vedere 2 eventi (condiviso e percorso), ne vede %', n; end if;

  insert into public.events (tipo, titolo, da, luogo, posti, studio_origine, solo_studio, passo, creato_da) values ('percorso', 'Nuovo percorso', '2026-12-10', 'Cassola', 15, 'tribu', 'tribu', 'gravidanza', u_ins_t);
  begin
    insert into public.events (tipo, titolo, da, luogo, posti, studio_origine, creato_da) values ('workshop', 'Non può', '2026-12-10', 'Cassola', 15, 'tribu', u_ins_t);
    raise exception 'Controllo 2: un insegnante non deve poter creare un workshop';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.events (tipo, titolo, da, luogo, posti, studio_origine, solo_studio, creato_da) values ('percorso', 'Senza passo', '2026-12-10', 'Cassola', 15, 'tribu', 'tribu', u_ins_t);
    raise exception 'Controllo 3: un percorso senza passo deve essere rifiutato';
  exception when check_violation then null; end;

  insert into public.event_registrations (event_id, studio_id, person_id, nome, creato_da) values (e_cond, 'tribu', p_t, 'Persona Tribù', u_ins_t);
  begin
    insert into public.event_registrations (event_id, studio_id, person_id, nome, creato_da) values (e_cond, 'tribu', p_p, 'Persona altrui', u_ins_t);
    raise exception 'Controllo 4: non si iscrive una persona dell''altro studio';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.event_registrations (event_id, studio_id, person_id, nome, creato_da) values (e_perc, 'pozzo', p_p, 'Persona Pozzo', u_ins_t);
    raise exception 'Controllo 5: non si iscrive a nome dell''altro studio';
  exception when insufficient_privilege then null; end;

  select public.posti_occupati(e_cond) into n;
  if n <> 4 then raise exception 'Controllo 6: posti presi attesi 4 (3 fissi più 1), trovati %', n; end if;

  -- AMMINISTRAZIONE DEL POZZO
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u_adm_p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.events;
  if n <> 1 then raise exception 'Controllo 7: il Pozzo deve vedere solo l''evento condiviso, ne vede %', n; end if;
  select public.posti_occupati(e_perc) into n;
  if n is not null then raise exception 'Controllo 8: il Pozzo non deve conoscere i posti di un percorso di Tribù'; end if;

  insert into public.event_registrations (event_id, studio_id, person_id, nome, creato_da) values (e_cond, 'pozzo', p_p, 'Persona Pozzo', u_adm_p);
  select public.posti_occupati(e_cond) into n;
  if n <> 5 then raise exception 'Controllo 9: il Pozzo deve vedere il numero totale (5), trova %', n; end if;
  select count(*) into n from public.event_registrations;
  if n <> 1 then raise exception 'Controllo 10: il Pozzo deve vedere solo le proprie iscrizioni (1), ne vede %', n; end if;

  insert into public.events (tipo, titolo, da, luogo, posti, studio_origine, creato_da) values ('workshop', 'Del Pozzo', '2026-12-12', 'Colico', 15, 'pozzo', u_adm_p);
  begin
    insert into public.events (tipo, titolo, da, luogo, posti, studio_origine, creato_da) values ('workshop', 'A nome di Tribù', '2026-12-12', 'Cassola', 15, 'tribu', u_adm_p);
    raise exception 'Controllo 11: il Pozzo non deve poter creare eventi a nome di Tribù';
  exception when insufficient_privilege then null; end;

  update public.events set titolo = 'Modificato' where id = e_cond;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Controllo 12: il Pozzo non deve poter modificare un evento di Tribù'; end if;

  -- ALLIEVO DI YOGA TRIBÙ
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u_all_t, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.events;
  if n <> 0 then raise exception 'Controllo 13: un allievo non deve leggere la tabella degli eventi di lavoro (per ora)'; end if;

  -- CHI NON HA FATTO L'ACCESSO
  execute 'reset role';
  execute 'set local role anon';
  begin
    perform 1 from public.events limit 1;
    raise exception 'Controllo 14: senza accesso non si deve poter leggere nulla';
  exception when insufficient_privilege then null; end;

  execute 'reset role';
end
$$;

rollback;
-- Controllo delle regole di accesso del planner (migrazione 0006). Si incolla nell'SQL Editor e si preme Run.
--   "Success" = tutti i controlli passati. Non lascia nulla nel database (rollback).

begin;

do $$
declare
  u_ins_t uuid := gen_random_uuid();   -- insegnante di Yoga Tribù
  u_adm_t uuid := gen_random_uuid();   -- amministrazione di Yoga Tribù
  u_adm_p uuid := gen_random_uuid();   -- amministrazione del Pozzo
  u_all_t uuid := gen_random_uuid();   -- allievo di Yoga Tribù
  n int;
begin
  insert into auth.users (id, email) values
    (u_ins_t, 'ins-tribu@prova.invalid'), (u_adm_t, 'adm-tribu@prova.invalid'), (u_adm_p, 'adm-pozzo@prova.invalid'), (u_all_t, 'all-tribu@prova.invalid');
  insert into public.memberships (user_id, studio_id, ruolo) values
    (u_ins_t, 'tribu', 'insegnante'), (u_adm_t, 'tribu', 'amministrazione'), (u_adm_p, 'pozzo', 'amministrazione'), (u_all_t, 'tribu', 'allievo');
  insert into public.content_posts (studio_id, riga_id, stato) values ('tribu', 'e1~0', 'proposto'), ('pozzo', 'e2~0', 'proposto');

  perform set_config('request.jwt.claims', json_build_object('sub', u_ins_t, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.content_posts;
  if n <> 1 then raise exception 'Controllo 1: l''insegnante di Tribù deve vedere 1 riga del planner, ne vede %', n; end if;
  update public.content_posts set stato = 'creato' where studio_id = 'tribu' and riga_id = 'e1~0';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Controllo 2: l''insegnante deve poter far avanzare un post'; end if;
  update public.content_posts set stato = 'creato' where studio_id = 'pozzo';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Controllo 3: non si toccano i post dell''altro studio'; end if;
  begin
    insert into public.content_events (id, studio_id, tipo, titolo, data) values ('m1', 'tribu', 'incontro', 'Non può', '2026-12-01');
    raise exception 'Controllo 4: un insegnante non deve poter aggiungere eventi al planner';
  exception when insufficient_privilege then null; end;

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u_adm_t, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.content_events (id, studio_id, tipo, titolo, data) values ('m2', 'tribu', 'incontro', 'Serata', '2026-12-01');
  begin
    insert into public.content_events (id, studio_id, tipo, titolo, data) values ('m3', 'pozzo', 'incontro', 'Intruso', '2026-12-01');
    raise exception 'Controllo 5: non si aggiungono eventi all''altro studio';
  exception when insufficient_privilege then null; end;

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u_adm_p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.content_events;
  if n <> 0 then raise exception 'Controllo 6: il Pozzo non deve vedere gli eventi del planner di Tribù'; end if;

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u_all_t, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.content_posts;
  if n <> 0 then raise exception 'Controllo 7: un allievo non deve vedere il planner'; end if;

  execute 'reset role';
  execute 'set local role anon';
  begin
    perform 1 from public.content_posts limit 1;
    raise exception 'Controllo 8: senza accesso non si deve poter leggere nulla';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
end
$$;

rollback;
-- Controllo delle regole di accesso delle prenotazioni (migrazione 0007). Si incolla nell'SQL Editor e si preme Run.
--   "Success" = tutti i controlli passati. Non lascia nulla nel database (rollback).

begin;

do $$
declare
  u_ins_t uuid := gen_random_uuid();   -- insegnante di Yoga Tribù
  u_adm_t uuid := gen_random_uuid();   -- amministrazione di Yoga Tribù
  u_adm_p uuid := gen_random_uuid();   -- amministrazione del Pozzo
  u_all_t uuid := gen_random_uuid();   -- allievo di Yoga Tribù
  p_t uuid := gen_random_uuid();
  p_t2 uuid := gen_random_uuid();
  p_p uuid := gen_random_uuid();
  t_t uuid;
  t_p uuid;
  n int;
begin
  insert into auth.users (id, email) values
    (u_ins_t, 'ins-tribu@prova.invalid'), (u_adm_t, 'adm-tribu@prova.invalid'), (u_adm_p, 'adm-pozzo@prova.invalid'), (u_all_t, 'all-tribu@prova.invalid');
  insert into public.memberships (user_id, studio_id, ruolo) values
    (u_ins_t, 'tribu', 'insegnante'), (u_adm_t, 'tribu', 'amministrazione'), (u_adm_p, 'pozzo', 'amministrazione'), (u_all_t, 'tribu', 'allievo');
  insert into public.people (id, studio_id, nome) values (p_t, 'tribu', 'Persona Tribù'), (p_t2, 'tribu', 'Altra Tribù'), (p_p, 'pozzo', 'Persona Pozzo');
  select id into t_t from public.lesson_templates where studio_id = 'tribu' limit 1;
  select id into t_p from public.lesson_templates where studio_id = 'pozzo' limit 1;
  insert into public.bookings (studio_id, template_id, data, person_id) values ('pozzo', t_p, '2026-12-07', p_p);

  -- INSEGNANTE DI YOGA TRIBÙ
  perform set_config('request.jwt.claims', json_build_object('sub', u_ins_t, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.bookings;
  if n <> 0 then raise exception 'Controllo 1: l''insegnante di Tribù non deve vedere le prenotazioni del Pozzo, ne vede %', n; end if;
  begin
    insert into public.bookings (studio_id, template_id, data, person_id, creato_da) values ('tribu', t_t, '2026-12-07', p_t, u_ins_t);
    raise exception 'Controllo 2: un insegnante non deve poter prenotare (muove crediti)';
  exception when insufficient_privilege then null; end;

  -- AMMINISTRAZIONE DI YOGA TRIBÙ
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u_adm_t, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.bookings (studio_id, template_id, data, person_id, creato_da) values ('tribu', t_t, '2026-12-07', p_t, u_adm_t);
  begin
    insert into public.bookings (studio_id, template_id, data, person_id, creato_da) values ('tribu', t_t, '2026-12-07', p_t, u_adm_t);
    raise exception 'Controllo 3: la stessa persona non si prenota due volte alla stessa lezione';
  exception when unique_violation then null; end;
  begin
    insert into public.bookings (studio_id, template_id, data, person_id, creato_da) values ('tribu', t_t, '2026-12-08', p_p, u_adm_t);
    raise exception 'Controllo 4: non si prenota una persona dell''altro studio';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.bookings (studio_id, template_id, data, person_id, creato_da) values ('tribu', t_p, '2026-12-08', p_t2, u_adm_t);
    raise exception 'Controllo 5: non si prenota a una lezione dell''altro studio';
  exception when insufficient_privilege then null; end;
  begin
    update public.bookings set stato = 'inventato' where studio_id = 'tribu';
    raise exception 'Controllo 6: uno stato che non esiste deve essere rifiutato';
  exception when check_violation then null; end;
  update public.bookings set stato = 'annullata' where studio_id = 'tribu';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Controllo 7: l''amministrazione deve poter disdire una prenotazione'; end if;
  insert into public.bookings (studio_id, template_id, data, person_id, creato_da) values ('tribu', t_t, '2026-12-07', p_t, u_adm_t);

  -- AMMINISTRAZIONE DEL POZZO
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u_adm_p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.bookings where studio_id = 'tribu';
  if n <> 0 then raise exception 'Controllo 8: il Pozzo non deve vedere le prenotazioni di Tribù'; end if;
  update public.bookings set stato = 'annullata' where studio_id = 'tribu';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Controllo 9: il Pozzo non deve poter toccare le prenotazioni di Tribù'; end if;

  -- ALLIEVO E CHI NON HA FATTO L'ACCESSO
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u_all_t, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.bookings;
  if n <> 0 then raise exception 'Controllo 10: un allievo non deve vedere l''elenco delle prenotazioni di lavoro (per ora)'; end if;
  execute 'reset role';
  execute 'set local role anon';
  begin
    perform 1 from public.bookings limit 1;
    raise exception 'Controllo 11: senza accesso non si deve poter leggere nulla';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
end
$$;

rollback;


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


-- Controllo delle regole di accesso degli Interessati completi (migrazione 0009).
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0009 e si preme Run.
--   "Success" = tutti i controlli passati; un errore dice quale controllo è fallito.
-- Crea dati finti e annulla tutto alla fine (rollback): non lascia nulla.

begin;

do $$
declare
  u_ins_t uuid := gen_random_uuid();   -- insegnante di Yoga Tribù
  u_adm_t uuid := gen_random_uuid();   -- amministrazione di Yoga Tribù
  u_adm_p uuid := gen_random_uuid();   -- amministrazione del Pozzo
  l1 uuid := gen_random_uuid();
  n int;
  bloccato boolean;
begin
  insert into auth.users (id, email) values (u_ins_t, 'i@prova.invalid'), (u_adm_t, 'a@prova.invalid'), (u_adm_p, 'p@prova.invalid');
  insert into public.memberships (user_id, studio_id, ruolo) values (u_ins_t, 'tribu', 'insegnante'), (u_adm_t, 'tribu', 'amministrazione'), (u_adm_p, 'pozzo', 'amministrazione');
  insert into public.leads (id, studio_id, nome) values (l1, 'tribu', 'Contatto Prova');

  -- INSEGNANTE: fissa la prova, segna un'assenza, scrive i messaggi
  perform set_config('request.jwt.claims', json_build_object('sub', u_ins_t, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  update public.leads set fase = 'prova_fissata', prova_il = '2026-12-01', prova_ora = '18:30', prova_tipo = 'Iyengar', ha_avuto_prova = true where id = l1;
  select count(*) into n from public.leads where id = l1 and prova_il = '2026-12-01' and ha_avuto_prova;
  if n <> 1 then raise exception 'Controllo 1: l''insegnante deve poter fissare la prova'; end if;
  update public.leads set fase = 'interessato', prova_il = null, assenze = assenze + 1, avvisato_il = null where id = l1;
  insert into public.lead_events (lead_id, studio_id, tipo, testo, autore) values (l1, 'tribu', 'messaggio_inviato', 'Ciao', u_ins_t), (l1, 'tribu', 'risposta', 'Ok', u_ins_t);
  select count(*) into n from public.lead_events where lead_id = l1;
  if n <> 2 then raise exception 'Controllo 2: messaggio e risposta devono potersi scrivere'; end if;

  -- IMPOSTAZIONI: le legge ogni persona dello studio, le scrive solo chi gestisce
  select count(*) into n from public.studio_settings;
  if n <> 0 then raise exception 'Controllo 3: non devono esserci impostazioni di partenza, trovate %', n; end if;
  bloccato := false;
  begin
    insert into public.studio_settings (studio_id, chiave, valore) values ('tribu', 'promemoria_interessati', '{"prima":false}');
  exception when insufficient_privilege then bloccato := true; end;
  if not bloccato then raise exception 'Controllo 4: un insegnante non deve poter cambiare le impostazioni'; end if;

  -- AMMINISTRAZIONE DI TRIBÙ: scrive e rilegge
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u_adm_t, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.studio_settings (studio_id, chiave, valore) values ('tribu', 'promemoria_interessati', '{"prima":false}');
  update public.studio_settings set valore = '{"prima":true}' where studio_id = 'tribu' and chiave = 'promemoria_interessati';
  select count(*) into n from public.studio_settings where valore = '{"prima":true}';
  if n <> 1 then raise exception 'Controllo 5: l''amministrazione deve poter scrivere e rileggere le impostazioni'; end if;

  -- AMMINISTRAZIONE DEL POZZO: non vede e non scrive quelle di Tribù
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u_adm_p, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.studio_settings;
  if n <> 0 then raise exception 'Controllo 6: il Pozzo non deve vedere le impostazioni di Tribù, ne vede %', n; end if;
  bloccato := false;
  begin
    insert into public.studio_settings (studio_id, chiave, valore) values ('tribu', 'altra', '{}');
  exception when insufficient_privilege then bloccato := true; end;
  if not bloccato then raise exception 'Controllo 7: il Pozzo non deve scrivere nelle impostazioni di Tribù'; end if;
  execute 'reset role';
end
$$;

rollback;


-- Controllo delle regole di accesso di lezioni private, richieste e avvisi (migrazione 0010).
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0010 e si preme Run.
--   "Success" = tutti i controlli passati; un errore dice quale controllo è fallito.
-- Crea dati finti e annulla tutto alla fine (rollback): non lascia nulla.

begin;

do $$
declare
  u_ins uuid := gen_random_uuid();     -- insegnante A di Yoga Tribù (collegata alla sua riga)
  u_altra uuid := gen_random_uuid();   -- insegnante B di Yoga Tribù
  u_adm uuid := gen_random_uuid();     -- amministrazione di Yoga Tribù
  u_poz uuid := gen_random_uuid();     -- amministrazione del Pozzo
  t_a uuid := gen_random_uuid();
  t_b uuid := gen_random_uuid();
  p_t uuid := gen_random_uuid();
  pr uuid := gen_random_uuid();
  av uuid := gen_random_uuid();
  nt uuid := gen_random_uuid();
  n int;
  bloccato boolean;
begin
  insert into auth.users (id, email) values (u_ins, 'a@prova.invalid'), (u_altra, 'b@prova.invalid'), (u_adm, 'adm@prova.invalid'), (u_poz, 'poz@prova.invalid');
  insert into public.memberships (user_id, studio_id, ruolo) values
    (u_ins, 'tribu', 'insegnante'), (u_altra, 'tribu', 'insegnante'), (u_adm, 'tribu', 'amministrazione'), (u_poz, 'pozzo', 'amministrazione');
  -- il collegamento account-insegnante si calcola dall'email (migrazione 0008)
  insert into public.teachers (id, studio_id, nome, email) values (t_a, 'tribu', 'Insegnante A', 'a@prova.invalid'), (t_b, 'tribu', 'Insegnante B', 'b@prova.invalid');
  insert into public.people (id, studio_id, nome) values (p_t, 'tribu', 'Persona Tribù');

  -- INSEGNANTE A: gestisce i propri orari e le proprie richieste, non quelle di B
  perform set_config('request.jwt.claims', json_build_object('sub', u_ins, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.private_availability (studio_id, teacher_id, giorno, ore) values ('tribu', t_a, 1, '{15,16}');
  insert into public.private_availability (studio_id, teacher_id, data, ore) values ('tribu', t_a, '2026-12-10', '{}');
  bloccato := false;
  begin
    insert into public.private_availability (studio_id, teacher_id, giorno, ore) values ('tribu', t_b, 2, '{15}');
  exception when insufficient_privilege then bloccato := true; end;
  if not bloccato then raise exception 'Controllo 1: un''insegnante non deve cambiare gli orari di un''altra'; end if;
  bloccato := false;
  begin
    insert into public.private_availability (studio_id, teacher_id, giorno, data, ore) values ('tribu', t_a, 3, '2026-12-11', '{15}');
  exception when check_violation then bloccato := true; end;
  if not bloccato then raise exception 'Controllo 2: una disponibilità o è settimanale o è di una data'; end if;

  insert into public.private_lessons (id, studio_id, person_id, teacher_id, n, stile, data, ora, creato_da) values (pr, 'tribu', p_t, t_a, 1, 'iyengar', '2026-12-10', '15:00', u_ins);
  update public.private_lessons set stato = 'confermata' where id = pr;
  select count(*) into n from public.private_lessons where id = pr and stato = 'confermata';
  if n <> 1 then raise exception 'Controllo 3: l''insegnante deve poter confermare la sua privata'; end if;
  insert into public.private_lessons (studio_id, person_id, teacher_id, n, stile, data, ora, creato_da) values ('tribu', p_t, t_b, 2, 'ashtanga', '2026-12-11', '16:00', u_ins);
  update public.private_lessons set stato = 'confermata' where teacher_id = t_b;
  select count(*) into n from public.private_lessons where teacher_id = t_b and stato = 'confermata';
  if n <> 0 then raise exception 'Controllo 4: un''insegnante non deve confermare le private di un''altra'; end if;

  insert into public.student_requests (id, studio_id, person_id, categoria, testo, creato_da) values (av, 'tribu', p_t, 'Lezione', 'Posso recuperare?', u_ins);
  update public.student_requests set risposta = 'Certo', risposta_il = now() where id = av;
  select count(*) into n from public.student_requests where risposta = 'Certo';
  if n <> 1 then raise exception 'Controllo 5: lo studio deve poter rispondere a una richiesta'; end if;

  insert into public.group_notices (id, studio_id, titolo, testo, tipo, quando, gruppi, creato_da) values (nt, 'tribu', 'Cambio orario', 'Domani alle 9', 'importante', 'ora', 'Tutti', u_ins);
  insert into public.group_notice_recipients (notice_id, person_id) values (nt, p_t);
  select count(*) into n from public.group_notice_recipients;
  if n <> 1 then raise exception 'Controllo 6: i destinatari dell''avviso devono potersi salvare'; end if;

  -- AMMINISTRAZIONE: cambia gli orari di chiunque nello studio
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u_adm, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.private_availability (studio_id, teacher_id, giorno, ore) values ('tribu', t_b, 2, '{15}');
  update public.private_lessons set stato = 'rifiutata' where teacher_id = t_b;
  select count(*) into n from public.private_lessons where stato = 'rifiutata';
  if n <> 1 then raise exception 'Controllo 7: l''amministrazione deve poter gestire le private di tutti'; end if;

  -- POZZO: non vede niente di Tribù e non scrive in Tribù
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u_poz, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select (select count(*) from public.private_availability) + (select count(*) from public.private_lessons) + (select count(*) from public.student_requests)
    + (select count(*) from public.group_notices) + (select count(*) from public.group_notice_recipients) into n;
  if n <> 0 then raise exception 'Controllo 8: il Pozzo non deve vedere nulla di Tribù, vede % righe', n; end if;
  bloccato := false;
  begin
    insert into public.student_requests (studio_id, person_id, categoria, testo) values ('tribu', p_t, 'Lezione', 'Non può');
  exception when insufficient_privilege then bloccato := true; end;
  if not bloccato then raise exception 'Controllo 9: il Pozzo non deve scrivere richieste a Tribù'; end if;
  execute 'reset role';
end
$$;

rollback;


-- Controllo delle regole di accesso del ciclo editoriale (migrazione 0011).
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0011 e si preme Run.
--   "Success" = tutti i controlli passati. Non lascia nulla nel database (rollback).

begin;

do $$
declare
  u_ins uuid := gen_random_uuid();
  u_adm uuid := gen_random_uuid();
  u_poz uuid := gen_random_uuid();
  n int;
  bloccato boolean;
begin
  insert into auth.users (id, email) values (u_ins, 'i@prova.invalid'), (u_adm, 'a@prova.invalid'), (u_poz, 'p@prova.invalid');
  insert into public.memberships (user_id, studio_id, ruolo) values (u_ins, 'tribu', 'insegnante'), (u_adm, 'tribu', 'amministrazione'), (u_poz, 'pozzo', 'amministrazione');

  perform set_config('request.jwt.claims', json_build_object('sub', u_adm, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.monthly_themes (studio_id, mese, tema, testo) values ('tribu', '2026-11', 'Stabilità', 'Un punto fermo');
  update public.monthly_themes set libro = 'Titolo' where studio_id = 'tribu' and mese = '2026-11';
  bloccato := false;
  begin
    insert into public.monthly_themes (studio_id, mese) values ('tribu', '2026-13');
  exception when check_violation then bloccato := true; end;
  if not bloccato then raise exception 'Controllo 1: un mese inesistente deve essere rifiutato'; end if;

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u_ins, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.monthly_themes;
  if n <> 1 then raise exception 'Controllo 2: l''insegnante deve leggere il tema del mese'; end if;
  bloccato := false;
  begin
    insert into public.monthly_themes (studio_id, mese, tema) values ('tribu', '2026-12', 'Desiderio');
  exception when insufficient_privilege then bloccato := true; end;
  if not bloccato then raise exception 'Controllo 3: un insegnante non deve poter scrivere il tema'; end if;

  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u_poz, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.monthly_themes;
  if n <> 0 then raise exception 'Controllo 4: il Pozzo non deve vedere i temi di Tribù'; end if;
  execute 'reset role';
end
$$;

rollback;


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


-- Controllo del regalo automatico (migrazione 0013).
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0013 e si preme Run.
--   "Success" = tutti i controlli passati; un errore dice quale controllo è fallito.
-- Crea persone finte e annulla tutto alla fine (rollback): non lascia nulla.

begin;

do $$
declare
  oggi date := (now() at time zone 'Europe/Rome')::date;
  p_comp uuid := gen_random_uuid();
  p_ann uuid := gen_random_uuid();
  p_illim uuid := gen_random_uuid();
  p_altro uuid := gen_random_uuid();
  p_nuovo uuid := gen_random_uuid();
  n int;
  tot int;
begin
  -- Pozzo con l'impostazione spenta, Tribù con entrambe accese
  insert into public.studio_settings (studio_id, chiave, valore) values ('tribu', 'regalo_compleanni', 'true'::jsonb), ('tribu', 'regalo_anniversari', 'true'::jsonb)
    on conflict (studio_id, chiave) do update set valore = excluded.valore;
  delete from public.studio_settings where studio_id = 'pozzo' and chiave in ('regalo_compleanni', 'regalo_anniversari');

  insert into public.people (id, studio_id, nome, data_nascita, iscritto_il) values
    (p_comp, 'tribu', 'Prova Compleanno', oggi - interval '30 years', oggi - interval '40 days'),
    (p_ann, 'tribu', 'Prova Anniversario', date '1990-03-03', oggi - interval '2 years'),
    (p_nuovo, 'tribu', 'Prova Appena Iscritta', null, oggi),
    (p_altro, 'pozzo', 'Prova Pozzo', oggi - interval '25 years', oggi - interval '3 years');
  insert into public.people (id, studio_id, nome, data_nascita, crediti_illimitati) values (p_illim, 'tribu', 'Prova Illimitati', oggi - interval '40 years', true);

  tot := public.regali_automatici();
  select count(*) into n from public.credit_ledger where person_id = p_comp and motivo = 'Omaggio compleanno ' || to_char(oggi, 'YYYY') and delta = 1;
  if n <> 1 then raise exception 'Controllo 1: chi compie gli anni oggi riceve una lezione, trovate %', n; end if;
  select count(*) into n from public.credit_ledger where person_id = p_ann and motivo = 'Omaggio anniversario ' || to_char(oggi, 'YYYY') and delta = 1;
  if n <> 1 then raise exception 'Controllo 2: chi festeggia un anno dall''iscrizione riceve una lezione, trovate %', n; end if;
  select count(*) into n from public.credit_ledger where person_id = p_illim;
  if n <> 0 then raise exception 'Controllo 3: chi ha crediti illimitati non riceve nulla'; end if;
  select count(*) into n from public.credit_ledger where person_id = p_nuovo;
  if n <> 0 then raise exception 'Controllo 4: chi si è appena iscritta non ha un anniversario'; end if;
  select count(*) into n from public.credit_ledger where person_id = p_altro;
  if n <> 0 then raise exception 'Controllo 5: con l''impostazione spenta (Pozzo) non parte nulla'; end if;

  -- Una sola volta all'anno, anche se la funzione parte due volte
  if public.regali_automatici() <> 0 then raise exception 'Controllo 6: la seconda volta non deve regalare di nuovo'; end if;
  select count(*) into n from public.credit_ledger where person_id = p_comp;
  if n <> 1 then raise exception 'Controllo 7: un solo omaggio per ricorrenza'; end if;

  -- Un omaggio già dato a mano conta: non se ne aggiunge un altro
  delete from public.credit_ledger where person_id = p_ann;
  insert into public.credit_ledger (studio_id, person_id, delta, motivo) values ('tribu', p_ann, 1, 'Omaggio anniversario ' || to_char(oggi, 'YYYY'));
  perform public.regali_automatici();
  select count(*) into n from public.credit_ledger where person_id = p_ann;
  if n <> 1 then raise exception 'Controllo 8: l''omaggio dato a mano non si raddoppia'; end if;

  -- Spegnendo l'impostazione non parte più nulla
  update public.studio_settings set valore = 'false'::jsonb where studio_id = 'tribu' and chiave = 'regalo_compleanni';
  delete from public.credit_ledger where person_id = p_comp;
  perform public.regali_automatici();
  select count(*) into n from public.credit_ledger where person_id = p_comp;
  if n <> 0 then raise exception 'Controllo 9: con i compleanni spenti non si regala'; end if;

  -- Non è chiamabile dall'app
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
    execute 'set local role authenticated';
    perform public.regali_automatici();
    execute 'reset role';
    raise exception 'Controllo 10: regali_automatici non deve essere chiamabile dall''app';
  exception when insufficient_privilege then
    execute 'reset role';
  end;
end
$$;

rollback;


-- Controllo dei nuovi motivi di Da contattare (migrazione 0014).
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0014 e si preme Run.
--   "Success" = tutti i controlli passati; un errore dice quale controllo è fallito.
-- Crea una persona finta e annulla tutto alla fine (rollback): non lascia nulla.

begin;

do $$
declare
  p uuid := gen_random_uuid();
  rifiutato boolean := false;
begin
  insert into public.people (id, studio_id, nome) values (p, 'tribu', 'Prova Contatti');
  insert into public.contact_log (studio_id, person_id, motivo) values ('tribu', p, 'rischio'), ('tribu', p, 'recupero'), ('tribu', p, 'scadenza');
  begin
    insert into public.contact_log (studio_id, person_id, motivo) values ('tribu', p, 'inventato');
  exception when check_violation then rifiutato := true; end;
  if not rifiutato then raise exception 'Controllo 1: un motivo inventato non deve essere accettato'; end if;
end
$$;

rollback;


-- Controllo di "i miei allievi", dei blocchi delle proprie lezioni e delle richieste di lezioni (migrazione 0015).
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0015 e si preme Run.
--   "Success" = tutti i controlli passati; un errore dice quale controllo è fallito.
-- Crea account, insegnanti e persone finte e annulla tutto alla fine (rollback): non lascia nulla.

begin;

do $$
declare
  u_a uuid := gen_random_uuid();     -- insegnante A
  u_b uuid := gen_random_uuid();     -- insegnante B
  u_s uuid := gen_random_uuid();     -- Sara, insegnante dei percorsi
  u_adm uuid := gen_random_uuid();   -- responsabile
  t_a uuid := gen_random_uuid();     -- lezione di A
  t_b uuid := gen_random_uuid();     -- lezione di B
  t_ab uuid := gen_random_uuid();    -- lezione di A e B insieme
  p1 uuid := gen_random_uuid();      -- prenotata da A
  p2 uuid := gen_random_uuid();      -- prenotata da B
  p3 uuid := gen_random_uuid();      -- prenotata sulla lezione di A e B
  p4 uuid := gen_random_uuid();      -- aggiunta da A a mano
  p5 uuid := gen_random_uuid();      -- iscritta a un percorso (di Sara)
  p6 uuid := gen_random_uuid();      -- di nessuno
  e_perc uuid := gen_random_uuid();
  rq uuid;
  n int;
  bloccato boolean;
begin
  insert into auth.users (id, email) values (u_a, 'a@prova.invalid'), (u_b, 'b@prova.invalid'), (u_s, 's@prova.invalid'), (u_adm, 'adm@prova.invalid');
  insert into public.memberships (user_id, studio_id, ruolo) values (u_adm, 'tribu', 'amministrazione');
  -- gli insegnanti si collegano al loro account dall'email, e ricevono il ruolo (migrazione 0008)
  insert into public.teachers (studio_id, nome, email) values ('tribu', 'Prova A', 'a@prova.invalid'), ('tribu', 'Prova B', 'b@prova.invalid');
  insert into public.teachers (studio_id, nome, email, fa_percorsi) values ('tribu', 'Prova Sara', 's@prova.invalid', true);

  insert into public.lesson_templates (id, studio_id, giorno, ora, stile, tipo, insegnante) values
    (t_a, 'tribu', 1, '07:00', 'iyengar', 'Prova A', 'Prova A'), (t_b, 'tribu', 2, '07:00', 'iyengar', 'Prova B', 'Prova B'), (t_ab, 'tribu', 3, '07:00', 'iyengar', 'Prova AB', 'Prova A e Prova B');
  insert into public.people (id, studio_id, nome, creato_da) values
    (p1, 'tribu', 'Allieva 1', null), (p2, 'tribu', 'Allieva 2', null), (p3, 'tribu', 'Allieva 3', null), (p4, 'tribu', 'Allieva 4', u_a), (p5, 'tribu', 'Allieva 5', null), (p6, 'tribu', 'Allieva 6', null);
  insert into public.bookings (studio_id, template_id, data, person_id) values
    ('tribu', t_a, '2026-12-07', p1), ('tribu', t_b, '2026-12-08', p2), ('tribu', t_ab, '2026-12-09', p3);
  insert into public.events (id, tipo, titolo, da, luogo, posti, studio_origine, solo_studio, passo) values (e_perc, 'percorso', 'Percorso di prova', '2026-12-15', 'Cassola', 15, 'tribu', 'tribu', 'gravidanza');
  insert into public.event_registrations (event_id, studio_id, person_id, nome) values (e_perc, 'tribu', p5, 'Allieva 5');
  insert into public.person_notes (person_id, studio_id, tipo, testo, autore) values (p1, 'tribu', 'nota', 'Di A', u_adm), (p2, 'tribu', 'nota', 'Di B', u_adm);

  -- 1. L'insegnante A vede i suoi: chi ha prenotato da lui, la lezione in comune, chi ha aggiunto lui
  perform set_config('request.jwt.claims', json_build_object('sub', u_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.people;
  if n <> 3 then raise exception 'Controllo 1: A deve vedere 3 persone (1, 3 e 4), ne vede %', n; end if;
  select count(*) into n from public.people where id in (p2, p5, p6);
  if n <> 0 then raise exception 'Controllo 2: A non deve vedere le persone di B, di Sara e di nessuno'; end if;
  select count(*) into n from public.person_notes;
  if n <> 1 then raise exception 'Controllo 3: A deve vedere solo le note delle sue persone, ne vede %', n; end if;
  select count(*) into n from public.bookings;
  if n <> 2 then raise exception 'Controllo 4: A deve vedere solo le prenotazioni delle sue persone, ne vede %', n; end if;
  update public.people set telefono = '1' where id = p2;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Controllo 5: A non deve poter modificare le persone di B'; end if;
  select count(*) into n from public.event_registrations;
  if n <> 0 then raise exception 'Controllo 6: A non deve vedere le iscrizioni ai percorsi'; end if;
  execute 'reset role';

  -- 2. B vede le sue (la 2 e quella in comune)
  perform set_config('request.jwt.claims', json_build_object('sub', u_b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.people;
  if n <> 2 then raise exception 'Controllo 7: B deve vedere 2 persone (2 e 3), ne vede %', n; end if;
  execute 'reset role';

  -- 3. Sara vede chi è iscritto ai percorsi, e le iscrizioni
  perform set_config('request.jwt.claims', json_build_object('sub', u_s, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.people;
  if n <> 1 then raise exception 'Controllo 8: Sara deve vedere 1 persona (la 5), ne vede %', n; end if;
  select count(*) into n from public.event_registrations;
  if n <> 1 then raise exception 'Controllo 9: Sara deve vedere le iscrizioni ai percorsi'; end if;
  execute 'reset role';

  -- 4. Un responsabile vede tutti
  perform set_config('request.jwt.claims', json_build_object('sub', u_adm, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.people;
  if n <> 6 then raise exception 'Controllo 10: il responsabile deve vedere 6 persone, ne vede %', n; end if;
  execute 'reset role';

  -- 4b. Chi è di Sara lo sanno tutti (solo gli identificativi), così nessuno le scrive al posto suo
  perform set_config('request.jwt.claims', json_build_object('sub', u_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.persone_di_sara('tribu');
  if n <> 1 then raise exception 'Controllo 10b: le persone di Sara devono essere 1, sono %', n; end if;
  select count(*) into n from public.persone_di_sara('pozzo');
  if n <> 0 then raise exception 'Controllo 10c: un insegnante di Tribù non deve avere nulla dal Pozzo'; end if;
  execute 'reset role';

  -- 5. A ferma le sue lezioni, non quelle degli altri
  perform set_config('request.jwt.claims', json_build_object('sub', u_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  insert into public.lesson_blocks (template_id, studio_id, data, creato_da, gruppo_id, scope, da, a) values (t_a, 'tribu', '2026-12-14', u_a, gen_random_uuid(), 'Prova A', '2026-12-14', '2026-12-14');
  insert into public.lesson_blocks (template_id, studio_id, data, creato_da, gruppo_id, scope, da, a) values (t_ab, 'tribu', '2026-12-16', u_a, gen_random_uuid(), 'Prova A', '2026-12-16', '2026-12-16');
  bloccato := false;
  begin
    insert into public.lesson_blocks (template_id, studio_id, data, creato_da, gruppo_id, scope, da, a) values (t_b, 'tribu', '2026-12-15', u_a, gen_random_uuid(), 'Prova B', '2026-12-15', '2026-12-15');
  exception when insufficient_privilege then bloccato := true; end;
  if not bloccato then raise exception 'Controllo 11: A non deve poter fermare le lezioni di B'; end if;
  delete from public.lesson_blocks where template_id = t_a;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Controllo 12: A deve poter riattivare la sua lezione'; end if;
  execute 'reset role';
  insert into public.lesson_blocks (template_id, studio_id, data, creato_da, gruppo_id, scope, da, a) values (t_b, 'tribu', '2026-12-15', u_adm, gen_random_uuid(), 'Prova B', '2026-12-15', '2026-12-15');
  perform set_config('request.jwt.claims', json_build_object('sub', u_a, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  delete from public.lesson_blocks where template_id = t_b;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Controllo 13: A non deve poter riattivare le lezioni di B'; end if;

  -- 6. A chiede una lezione nuova: solo a suo nome, e non può deciderla da solo
  insert into public.lesson_requests (studio_id, richiedente, richiedente_nome, giorno, ora, stile, tipo, posti) values ('tribu', u_a, 'Prova A', 4, '18:00', 'iyengar', 'Lezione nuova', 12);
  bloccato := false;
  begin
    insert into public.lesson_requests (studio_id, richiedente, richiedente_nome, giorno, ora, stile, tipo) values ('tribu', u_a, 'Prova B', 4, '19:00', 'iyengar', 'Falsa');
  exception when insufficient_privilege then bloccato := true; end;
  if not bloccato then raise exception 'Controllo 14: non si chiede una lezione a nome di un altro insegnante'; end if;
  update public.lesson_requests set stato = 'approvata';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'Controllo 15: un insegnante non deve poter approvare la propria richiesta'; end if;
  select id into rq from public.lesson_requests limit 1;
  bloccato := false;
  begin
    perform public.decidi_richiesta_lezione(rq, true);
  exception when raise_exception then bloccato := true; end;
  if not bloccato then raise exception 'Controllo 16: la funzione che decide non deve funzionare per un insegnante'; end if;
  execute 'reset role';

  -- 7. B non vede la richiesta di A; il responsabile sì, e approvandola nasce la lezione
  perform set_config('request.jwt.claims', json_build_object('sub', u_b, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.lesson_requests;
  if n <> 0 then raise exception 'Controllo 17: B non deve vedere le richieste di A'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claims', json_build_object('sub', u_adm, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.lesson_requests where stato = 'attesa';
  if n <> 1 then raise exception 'Controllo 18: il responsabile deve vedere la richiesta'; end if;
  perform public.decidi_richiesta_lezione(rq, true);
  select count(*) into n from public.lesson_templates where studio_id = 'tribu' and tipo = 'Lezione nuova' and insegnante = 'Prova A' and aggiunto_a_mano and posti = 12;
  if n <> 1 then raise exception 'Controllo 19: approvando, la lezione deve entrare nell''orario con l''insegnante giusto'; end if;
  select count(*) into n from public.lesson_requests where stato = 'approvata' and deciso_da = u_adm;
  if n <> 1 then raise exception 'Controllo 20: la richiesta deve risultare approvata da chi ha deciso'; end if;
  bloccato := false;
  begin
    perform public.decidi_richiesta_lezione(rq, false);
  exception when raise_exception then bloccato := true; end;
  if not bloccato then raise exception 'Controllo 21: una richiesta già decisa non si decide due volte'; end if;
  execute 'reset role';
end
$$;

rollback;


-- Controllo delle funzioni chiuse (migrazione 0016).
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0016 e si preme Run.
--   "Success" = tutti i controlli passati; un errore dice quale controllo è fallito.

begin;

do $$
declare
  chiuso boolean;
  u uuid := gen_random_uuid();
  n int;
begin
  -- Chi non è entrato non può chiamare le funzioni delle regole
  execute 'set local role anon';
  chiuso := false;
  begin
    perform public.e_staff('tribu');
  exception when insufficient_privilege then chiuso := true; end;
  if not chiuso then raise exception 'Controllo 1: chi non è entrato non deve poter chiamare e_staff'; end if;
  chiuso := false;
  begin
    perform public.posti_occupati(gen_random_uuid());
  exception when insufficient_privilege then chiuso := true; end;
  if not chiuso then raise exception 'Controllo 2: chi non è entrato non deve conoscere i posti degli eventi'; end if;
  execute 'reset role';

  -- Chi è entrato le usa (le regole di accesso le chiamano per lui)
  insert into auth.users (id, email) values (u, 'f@prova.invalid');
  insert into public.memberships (user_id, studio_id, ruolo) values (u, 'tribu', 'amministrazione');
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into n from public.people;
  if n < 0 then raise exception 'Controllo 3: le persone devono restare leggibili per un responsabile'; end if;
  if not public.e_responsabile('tribu') then raise exception 'Controllo 4: un responsabile deve poter usare e_responsabile'; end if;

  -- Le funzioni dei trigger non si chiamano dall'app
  chiuso := false;
  begin
    perform public.nuovo_profilo();
  exception when insufficient_privilege then chiuso := true; end;
  if not chiuso then raise exception 'Controllo 5: nuovo_profilo non deve essere chiamabile dall''app'; end if;
  execute 'reset role';
end
$$;

rollback;
