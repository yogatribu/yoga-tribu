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
