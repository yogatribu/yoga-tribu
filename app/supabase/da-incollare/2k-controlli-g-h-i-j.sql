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
