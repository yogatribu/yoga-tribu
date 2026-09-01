# Istruzioni per agenti AI — Yoga Tribù

Questo file è il punto di ingresso per qualsiasi agente (Claude Code, Codex, Antigravity, o altro) che lavora su questo repository. Leggerlo prima di iniziare qualsiasi task.

## Sito (Astro)

Il sito in produzione è in `src/`, build spec completa in [`YOGA_TRIBU_BUILD_SPEC.md`](YOGA_TRIBU_BUILD_SPEC.md) (palette, tipografia, componenti, pagine, SEO). Deploy su Vercel, dominio `yogatribu.it`.

## Volantini e materiali stampa/social (fuori dal sito)

La cartella `volantini/` (esclusa dal sito, in `.gitignore`) contiene tutti i materiali grafici: post social, storie, caroselli, messaggi WhatsApp, e avvisi da stampare per lo studio.

**Prima di creare o modificare qualsiasi file in `volantini/_sorgenti/`, leggere [`volantini/DESIGN-SYSTEM.md`](volantini/DESIGN-SYSTEM.md).** È il riferimento autoritativo per font, colori, dimensioni e struttura — vale per qualsiasi agente, non solo per chi ha lavorato alle sessioni precedenti. Se un file esistente diverge da quel documento, è un bug da correggere, non un'eccezione da seguire.

Il documento è diviso in due famiglie con regole diverse:
- **Sezioni 1–10**: materiali social (sfondo fotografico scuro, formati Instagram/Facebook/WhatsApp).
- **Sezione 11**: avvisi da stampare in A4 per lo studio (sfondo chiaro, nessuna foto, layout carta).

Workflow generale per qualsiasi materiale: uno script Python in `_sorgenti/` costruisce una stringa HTML con CSS inline e font locali (`file://`), la scrive su un file HTML temporaneo, e la screenshotta con Chrome headless a un canvas di dimensione fissa. Il comando Chrome esatto e le dimensioni canvas per ogni formato sono documentati nel DESIGN-SYSTEM.

Non inventare valori nuovi di font/colore/spaziatura senza controllare prima se il DESIGN-SYSTEM li ha già definiti per quel ruolo.
