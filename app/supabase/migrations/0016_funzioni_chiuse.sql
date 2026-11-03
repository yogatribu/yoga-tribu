-- Prima del lancio: le funzioni del database non devono essere chiamabili da chi non è entrato (anon),
-- e quelle che servono solo ai trigger non devono essere chiamabili da nessuno dall'app.
-- Inoltre gli indirizzi ".invalid" (usati solo dai controlli automatici) non possono più creare un account dal servizio di accesso.
-- Si incolla nell'SQL Editor di Supabase DOPO la migrazione 0015.

-- Servono alle regole di accesso, che le chiamano come utente collegato: restano a chi è entrato.
revoke execute on function
  public.ruolo_in(text), public.e_staff(text), public.e_responsabile(text), public.e_staff_di_persona(uuid), public.e_staff_ovunque(),
  public.e_insegnante_di(uuid), public.e_insegnante_percorsi(text), public.e_mia_lezione(uuid), public.e_mia_persona(uuid, text),
  public.evento_e_percorso(uuid), public.insegnante_in_testo(text, text), public.posti_occupati(uuid), public.persone_di_sara(text)
from public, anon;
grant execute on function
  public.ruolo_in(text), public.e_staff(text), public.e_responsabile(text), public.e_staff_di_persona(uuid), public.e_staff_ovunque(),
  public.e_insegnante_di(uuid), public.e_insegnante_percorsi(text), public.e_mia_lezione(uuid), public.e_mia_persona(uuid, text),
  public.evento_e_percorso(uuid), public.insegnante_in_testo(text, text), public.posti_occupati(uuid), public.persone_di_sara(text)
to authenticated;

-- Funzioni dei trigger: scattano da sole, nessuno le chiama a mano.
revoke execute on function
  public.aggiorna_accessi_insegnante(), public.aggiorna_data(), public.controlla_nuovo_utente(), public.dopo_creazione_utente(),
  public.nuovo_profilo(), public.solo_titolare_cambia_responsabili()
from public, anon, authenticated;

-- Gli indirizzi .invalid non esistono: li usano solo i controlli, lanciati dal SQL Editor. Il servizio di accesso (supabase_auth_admin) non li ammette.
create or replace function public.controlla_nuovo_utente() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  e text := lower(trim(coalesce(new.email, '')));
begin
  if e like '%.invalid' and session_user <> 'supabase_auth_admin' then return new; end if;
  if e = '' or not (
    exists (select 1 from public.teachers where attivo and lower(trim(email)) = e)
    or exists (select 1 from public.accessi_extra where email = e)
  ) then
    raise exception 'Email non abilitata';
  end if;
  return new;
end
$$;

revoke execute on function public.controlla_nuovo_utente() from public, anon, authenticated;
