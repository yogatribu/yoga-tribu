# Collegare Supabase e Resend (una volta sola)

Tutto si fa dai pannelli dei due servizi, con gli account intestati ad Andrea. Le chiavi non si incollano mai in chat né nel codice: vanno solo nel file `app/.env.local`, che è escluso da git.

## 1. Chiavi di Supabase nel file locale

1. Nel pannello del progetto: Project Settings, poi API (o Data API).
2. Copia **Project URL** e la chiave **anon / publishable**. Sono pensate per stare nel browser, la sicurezza è nelle regole del database.
3. Nella cartella `app/`: `cp .env.example .env.local`, poi apri `.env.local` e compila le prime due righe.
4. **Non copiare** la chiave `service_role` da nessuna parte nell'app: dà accesso a tutto e salta le regole.

## 2. Creare le tabelle

1. Supabase, SQL Editor, New query.
2. Incolla tutto il contenuto di `supabase/migrations/0001_studi_ruoli_contatti.sql` e premi Run.
3. Deve finire con "Success". Se dà errore, copia il messaggio e mandamelo.

## 3. Far arrivare il codice per email (Resend dentro Supabase)

Il servizio email incluso in Supabase manda pochissime email all'ora e non va bene per il codice di accesso. Si usa Resend:

1. Resend, Domains, Add domain: `yogatribu.it`. Aggiungi nel DNS del dominio i record che Resend mostra e aspetta "Verified".
2. Resend, API Keys, crea una chiave con permesso "Sending access" solo per quel dominio.
3. Supabase, Project Settings, Authentication, SMTP Settings, attiva "Enable custom SMTP":
   - Host `smtp.resend.com`, porta `465`
   - Username `resend`
   - Password: la chiave API appena creata
   - Mittente: per esempio `app@yogatribu.it`, nome "Yoga Tribù"
4. Supabase, Authentication, Email Templates, "Magic Link": nel testo deve comparire `{{ .Token }}`, per esempio "Il tuo codice di accesso è {{ .Token }}". Così nella email c'è il codice e non il link.
5. Supabase, Authentication, Sign In / Providers, Email: lascia attivo l'accesso con email e **disattiva** "Allow new users to sign up" (la registrazione resta chiusa mentre ci sono solo gli insegnanti).

## 4. Primo accesso: creare le persone e i ruoli

1. Supabase, Authentication, Users, Add user, "Create new user": email della persona, spunta "Auto Confirm User". Fai lo stesso per ogni insegnante.
2. SQL Editor, assegna il ruolo (cambia email, studio e ruolo):

```sql
insert into public.memberships (user_id, studio_id, ruolo)
select id, 'tribu', 'gestione' from auth.users where email = 'LA-TUA-EMAIL';
```

Ruoli possibili: `allievo`, `insegnante`, `amministrazione`, `gestione`. Studi: `tribu`, `pozzo`.
Il primo ruolo `gestione` si assegna solo così, da SQL: poi i responsabili possono assegnare gli altri dall'app.

## 5. Controllo delle regole di accesso

SQL Editor, New query, incolla tutto `supabase/tests/accesso.sql` e premi Run. "Success" vuol dire che uno studio non vede l'altro e che ogni ruolo fa solo ciò che gli spetta. Se compare un errore, copia il messaggio: dice quale controllo è fallito. Il file non lascia nulla nel database.

## 6. Provare

```
cd app
npm run dev
```

Apri `http://localhost:4324`, scrivi la tua email, arriva il codice, entri. Se vedi "Il tuo accesso non è ancora abilitato" manca il passo 4.
