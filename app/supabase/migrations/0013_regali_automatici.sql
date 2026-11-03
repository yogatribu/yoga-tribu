-- Regalo automatico: se è acceso (Ricorrenze), ogni mattina il database regala una lezione a chi compie gli anni
-- o a chi festeggia un anno (o più) dall'iscrizione. Un omaggio per ricorrenza e per anno, come quello dato a mano.
-- Chi ha i crediti illimitati non riceve nulla. Le due impostazioni stanno in studio_settings:
--   regalo_compleanni e regalo_anniversari (true o false).
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0012.

create function public.regali_automatici() returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  oggi date := (now() at time zone 'Europe/Rome')::date;
  anno text := to_char((now() at time zone 'Europe/Rome')::date, 'YYYY');
  fatti integer := 0;
  n integer;
begin
  insert into public.credit_ledger (studio_id, person_id, delta, motivo)
  select p.studio_id, p.id, 1, 'Omaggio compleanno ' || anno
  from public.people p
  join public.studio_settings s on s.studio_id = p.studio_id and s.chiave = 'regalo_compleanni' and s.valore = 'true'::jsonb
  where p.attivo and not p.crediti_illimitati and p.data_nascita is not null
    and to_char(p.data_nascita, 'MM-DD') = to_char(oggi, 'MM-DD')
    and not exists (select 1 from public.credit_ledger l where l.person_id = p.id and l.motivo = 'Omaggio compleanno ' || anno);
  get diagnostics n = row_count;
  fatti := fatti + n;

  insert into public.credit_ledger (studio_id, person_id, delta, motivo)
  select p.studio_id, p.id, 1, 'Omaggio anniversario ' || anno
  from public.people p
  join public.studio_settings s on s.studio_id = p.studio_id and s.chiave = 'regalo_anniversari' and s.valore = 'true'::jsonb
  where p.attivo and not p.crediti_illimitati
    and p.iscritto_il <= oggi - interval '1 year'
    and to_char(p.iscritto_il, 'MM-DD') = to_char(oggi, 'MM-DD')
    and not exists (select 1 from public.credit_ledger l where l.person_id = p.id and l.motivo = 'Omaggio anniversario ' || anno);
  get diagnostics n = row_count;
  return fatti + n;
end
$$;

-- Lo lancia solo la pianificazione del database, non l'app.
revoke execute on function public.regali_automatici() from public, anon, authenticated;

-- Ogni giorno alle 5:30 UTC (le 6:30 o le 7:30 in Italia). Serve l'estensione pg_cron: se non si riesce ad attivarla da qui,
-- si accende da Database → Extensions e si rilancia solo questo blocco.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('regali-automatici', '30 5 * * *', 'select public.regali_automatici()');
exception when others then
  raise notice 'Regalo automatico non pianificato (pg_cron non disponibile): %', sqlerrm;
end
$$;
