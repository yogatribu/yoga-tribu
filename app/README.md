# Yoga Tribù · App (in costruzione)

App vera di prenotazioni, crediti e CRM, separata dal sito pubblico (`src/` alla radice, Astro). Decisioni e motivi in [`../docs/decisioni-app.md`](../docs/decisioni-app.md) e nella skill `app-fatta-bene` (`.claude/skills/app-fatta-bene/`).

Il vecchio prototipo cliccabile (`../src/pages/app-demo.astro`, dati finti) resta solo come specifica visiva: non è la base di questo codice.

## Prima di partire

Segui [`docs/avvio-supabase-resend.md`](docs/avvio-supabase-resend.md): chiavi nel file locale, tabelle, email con Resend, primi ruoli.

## Avvio

```
cd app
npm install
npm run dev
```

Si apre su `http://localhost:4324`. Finché `.env.local` non ha le chiavi, la pagina lo segnala e basta.

## Struttura

Vedi `architettura-codice.md` nella skill per la spiegazione di ogni cartella (`domain/` per le regole pure, `data/` per l'accesso al database, `features/` per le schermate, `services/` per i servizi esterni).

## Disegno

Identico al prototipo, per copia: `src/app/prototipo.css` (copia esatta dello stile del prototipo), `src/app/tema.css` (colori per studio), caratteri in `public/fonts`. Le schermate riprendono il markup del prototipo. Per vederle senza accedere, con dati finti: avvia l'app e apri `http://localhost:4324/#galleria` (o `#galleria-pozzo`), solo in sviluppo.

## Stato

Fatto, parte dello studio: login con codice via email e ruoli (0001), Interessati con campi su misura, Programma con blocchi ed eventi (0002, 0005), Allievi con pacchetti, crediti, incassi e stato di frequenza (0003), Impostazioni (0004), Percorsi di Sara (0005), planner dei contenuti (0006), prenotazioni inserite dallo studio, Home con l'elenco di ogni lezione, Da incassare, Disdette last minute, Emergenza, Statistiche (0007). Regole con test in `src/domain/`, controlli di accesso del database in `supabase/tests/`. Il disegno è la copia del prototipo.

Per eseguire le migrazioni in un colpo solo: `supabase/da-incollare/` ha `1-tabelle.sql` (0002 → 0007) e `2-controlli.sql`. Chi è già arrivato a una certa migrazione usa i file `1b`, `1c`, `1d` (solo eventi, solo planner, solo prenotazioni) e i `2b`, `2c`, `2d` per i controlli.

Migrazione 0008 (accesso riservato agli insegnanti): `1e` e `2e` da soli, oppure `1f-planner-prenotazioni-accesso.sql` e `2f-controlli-planner-prenotazioni-accesso.sql` per 0006, 0007 e 0008 in un colpo solo. Dopo la 0008 solo le email in Impostazioni (insegnanti) o in `accessi_extra` possono creare l'account; in Supabase, Authentication, "Allow new users to sign up" deve restare acceso, è il database a filtrare.

Migrazioni 0009 (Interessati completi), 0010 (private, richieste, avvisi) e 0011 (ciclo): `1g-interessati-private-ciclo.sql` e `2g-controlli-interessati-private-ciclo.sql` in `supabase/da-incollare/`.

Migrazioni 0012 (Responsabile come permesso vero, solo il titolare lo cambia), 0013 (regalo automatico di compleanni e anniversari ogni mattina, usa pg_cron) 0014 (Da contattare: A rischio abbandono e Da recuperare) 0015 (ogni insegnante vede i suoi allievi, blocca le sue lezioni, chiede quelle nuove) e 0016 (funzioni chiuse a chi non è entrato): `1k-responsabili-regali-contatti.sql`. I controlli di 0009 → 0016 stanno insieme in `2k-controlli-g-h-i-j.sql`.

## Prossimi passi (nell'ordine)

1. Eseguire le migrazioni e i controlli che mancano (0006 e 0007).
2. Lezioni private, avvisi a un gruppo, richieste degli allievi.
3. (fatto) Generatore dei volantini: i template vengono da `volantini/template`; dopo averli cambiati o aggiunto foto al sito si lancia `npm run sync-contenuti`.
4. Vista degli allievi (prenotare da soli, pacchetti, profilo): l'app aperta a tutti.
