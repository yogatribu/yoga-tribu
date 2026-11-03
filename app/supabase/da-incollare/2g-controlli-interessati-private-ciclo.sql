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
