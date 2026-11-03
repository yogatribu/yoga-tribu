-- Controllo dei nuovi motivi di Da contattare (migrazione 0014).
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0014 e si preme Run.
--   "Success" = tutti i controlli passati; un errore dice quale controllo è fallito.
-- Crea una persona finta e annulla tutto alla fine (rollback): non lascia nulla.

begin;

do $$
declare
  p uuid := gen_random_uuid();
  rifiutato boolean := false;
begin
  insert into public.people (id, studio_id, nome) values (p, 'tribu', 'Prova Contatti');
  insert into public.contact_log (studio_id, person_id, motivo) values ('tribu', p, 'rischio'), ('tribu', p, 'recupero'), ('tribu', p, 'scadenza');
  begin
    insert into public.contact_log (studio_id, person_id, motivo) values ('tribu', p, 'inventato');
  exception when check_violation then rifiutato := true; end;
  if not rifiutato then raise exception 'Controllo 1: un motivo inventato non deve essere accettato'; end if;
end
$$;

rollback;
