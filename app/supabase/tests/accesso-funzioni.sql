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
