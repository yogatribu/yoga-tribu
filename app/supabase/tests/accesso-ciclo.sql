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
