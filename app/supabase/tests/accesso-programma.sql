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
