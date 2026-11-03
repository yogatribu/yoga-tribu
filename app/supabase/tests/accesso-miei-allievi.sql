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
