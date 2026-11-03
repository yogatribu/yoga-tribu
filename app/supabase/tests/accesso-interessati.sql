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
