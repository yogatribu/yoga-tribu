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
  insert into public.people (id, studio_id, nome) values (p_t, 'tribu', 'Persona Tribù'), (p_p, 'pozzo', 'Persona Pozzo');
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
