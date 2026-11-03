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
