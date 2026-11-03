-- Controllo di sicurezza prima del lancio. Solo lettura: non cambia nulla.
-- Si incolla nell'SQL Editor di Supabase e si preme Run: dà una tabella con una riga per controllo.
-- "OK" va bene; "DA SISTEMARE" va guardato (la colonna dettaglio dice cosa).

select controllo, esito, dettaglio from (
  select 1 as n, 'Tabelle senza regole di accesso' as controllo,
    case when count(*) = 0 then 'OK' else 'DA SISTEMARE' end as esito, coalesce(string_agg(c.relname, ', '), 'Tutte le tabelle hanno le regole') as dettaglio
  from pg_class c join pg_namespace s on s.oid = c.relnamespace
  where s.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity

  union all
  select 2, 'Tabelle leggibili da chi non è entrato (anon)',
    case when count(*) = 0 then 'OK' else 'DA SISTEMARE' end, coalesce(string_agg(distinct table_name, ', '), 'Nessuna')
  from information_schema.role_table_grants where table_schema = 'public' and grantee = 'anon'

  union all
  select 3, 'Funzioni chiamabili da chi non è entrato (anon)',
    case when count(*) = 0 then 'OK' else 'DA SISTEMARE' end, coalesce(string_agg(p.proname, ', '), 'Nessuna')
  from pg_proc p join pg_namespace s on s.oid = p.pronamespace
  where s.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')

  union all
  select 4, 'Regole aperte a chi non è entrato',
    case when count(*) = 0 then 'OK' else 'DA SISTEMARE' end, coalesce(string_agg(tablename || '.' || policyname, ', '), 'Nessuna')
  from pg_policies where schemaname = 'public' and (roles::text like '%anon%' or roles::text like '%public%')

  union all
  select 5, 'Funzioni del database chiamabili dall''app che non dovrebbero esserlo',
    case when count(*) = 0 then 'OK' else 'DA SISTEMARE' end, coalesce(string_agg(p.proname, ', '), 'Nessuna')
  from pg_proc p join pg_namespace s on s.oid = p.pronamespace
  where s.nspname = 'public' and p.proname in ('assegna_accessi', 'regali_automatici', 'controlla_nuovo_utente', 'dopo_creazione_utente', 'nuovo_profilo', 'aggiorna_accessi_insegnante', 'solo_titolare_cambia_responsabili')
    and has_function_privilege('authenticated', p.oid, 'execute')

  union all
  select 6, 'Account con indirizzo finto (.invalid)',
    case when count(*) = 0 then 'OK' else 'DA SISTEMARE' end, coalesce(string_agg(email, ', '), 'Nessuno')
  from auth.users where lower(email) like '%.invalid'

  union all
  select 7, 'Account che non sono insegnanti né accessi extra',
    case when count(*) = 0 then 'OK' else 'DA SISTEMARE' end, coalesce(string_agg(u.email, ', '), 'Nessuno')
  from auth.users u
  where not exists (select 1 from public.teachers t where t.attivo and lower(trim(t.email)) = lower(u.email))
    and not exists (select 1 from public.accessi_extra x where x.email = lower(u.email))

  union all
  select 8, 'Insegnanti attivi senza email (non potranno entrare)',
    case when count(*) = 0 then 'OK' else 'DA SISTEMARE' end, coalesce(string_agg(studio_id || ': ' || nome, ', '), 'Nessuno')
  from public.teachers where attivo and (email is null or trim(email) = '')

  union all
  select 9, 'Chi può vedere tutto (titolare e responsabili)',
    'DA GUARDARE', coalesce(string_agg(coalesce(u.email, m.user_id::text) || ' (' || m.studio_id || ', ' || m.ruolo || ')', '; '), 'Nessuno')
  from public.memberships m left join auth.users u on u.id = m.user_id where m.ruolo in ('amministrazione', 'gestione')

  union all
  select 10, 'Impostazione: nuovi account solo per chi è in elenco',
    case when (select count(*) from pg_trigger where tgname = 'prima_della_creazione_utente' and not tgisinternal) = 1 then 'OK' else 'DA SISTEMARE' end,
    'Il controllo sull''email è attivo sul database'

  union all
  select 11, 'Estensione per il regalo automatico (pg_cron)',
    case when exists (select 1 from pg_extension where extname = 'pg_cron') then 'OK' else 'DA SISTEMARE' end,
    'Serve solo se vuoi il regalo automatico di compleanni e anniversari'
) x order by n;
