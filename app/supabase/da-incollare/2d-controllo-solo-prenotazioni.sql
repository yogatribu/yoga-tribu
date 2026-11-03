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
