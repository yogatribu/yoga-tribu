# Consenso cookie

Banner e gestione del consenso fatti in casa, al posto di iubenda. Questo documento descrive cosa fanno, cosa verificano i test e, soprattutto, **cosa non garantiscono**.

Non è una dichiarazione di conformità: è la descrizione di una configurazione reale, da far valutare a chi segue la privacy dello studio.

## Come funziona

| Pezzo | File |
|---|---|
| Registro degli strumenti (unica fonte di verità) | `src/lib/consent-config.ts` |
| Banner, pannello preferenze, loader dei servizi | `src/components/layout/CookieBanner.astro` |
| Iframe di terze parti bloccati finché non c'è il consenso | `src/components/ui/ConsentEmbed.astro` |
| Link «Gestisci cookie» | `src/components/layout/Footer.astro` |
| Registro dei consensi sul server | `api/consent.js` (Vercel Function) |
| Cookie Policy (strumenti generati dal registro) e Privacy Policy | `src/pages/cookie.astro`, `src/pages/privacy.astro` |
| Test | `tests/*.test.mjs` |

Regole implementate:

- Prima della scelta non parte nessuna richiesta verso domini esterni e non viene scritto nessun cookie. Google Analytics non viene nemmeno scaricato.
- Al primo livello **Accetta tutti** è il pulsante principale e **Personalizza** quello secondario. In alto a destra c'è la **X** di chiusura, che equivale a continuare senza accettare (richiesta dal Garante, non va tolta). **Personalizza** apre il pannello per categoria e, dove una categoria ha più servizi, per singolo servizio.
- Nessuna casella preselezionata: nel pannello tutte le opzioni non necessarie partono disattivate. Le caselle già spuntate non sono un consenso valido (Corte di giustizia UE, causa Planet49, e Garante). Scroll, navigazione, tasto Esc o chiusura non valgono come consenso: senza scelta il banner resta.
- **Indietro** (e un clic fuori dal banner, dal pannello preferenze) torna al primo livello senza dare consenso; se una scelta esiste già, chiude il banner. Un clic fuori dal banner al primo livello non fa nulla.
- Revoca in qualsiasi momento da «Gestisci cookie» (footer e pagina `/cookie`): i cookie `_ga*` vengono cancellati, `gtag` rimosso, la mappa torna bloccata.
- La scelta dura 180 giorni e viene richiesta di nuovo se cambia `POLICY_VERSION` o se compare un servizio nuovo nel registro.
- Google Consent Mode v2: all'avvio `ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage` sono `denied`. Dopo il consenso alle statistiche passa a `granted` solo `analytics_storage`. Le chiavi pubblicitarie restano negate finché non esisterà un servizio di marketing.
- Il tracciamento dei clic su WhatsApp crea l'identificativo di sessione `yt_rif` **solo** con il consenso alle statistiche (prima lo creava sempre). Alla revoca viene cancellato.
- **Registro delle scelte.** Ogni decisione (accetta, rifiuta, X, personalizza, singolo servizio) viene salvata nel browser (`yt_cookie_consent_log`, ultime 25) e inviata a `/api/consent` con: id casuale anonimo, data, versione dell'informativa, scelte, user agent, lingua, pagina. L'IP non viene salvato. Se l'invio fallisce, la scelta resta in coda (`yt_cookie_consent_pending`) e viene reinviata alla pagina successiva. Il server convalida rigidamente ogni campo, scarta quelli non previsti, accetta solo richieste dal dominio del sito e conserva ogni voce per 730 giorni.

## Attivare il registro sul server (azione richiesta)

`api/consent.js` salva le scelte in **Redis (Upstash)**. Finché non lo colleghi, scrive solo nei log di Vercel, che durano poco e **non** valgono come archivio. Per attivarlo:

1. Vercel, progetto yoga-tribu, scheda **Storage**: crea un database **Upstash Redis** (piano gratuito sufficiente) e collegalo al progetto. Vercel aggiunge da solo le variabili `KV_REST_API_URL` e `KV_REST_API_TOKEN`.
2. Rifai il deploy.
3. Controlla: fai una scelta sul sito, poi nel database cerca la chiave `consent:<id>` (l'id sta in `localStorage`, chiave `yt_cookie_consent`).

Variabili facoltative: `CONSENT_RETENTION_DAYS` (predefinito 730; se lo cambi, aggiorna anche `CONSENT_LOG_RETENTION_DAYS` in `consent-config.ts`, che alimenta il testo dell'informativa) e `CONSENT_ALLOWED_HOSTS` (host extra, per esempio un'anteprima).

Non l'ho potuto provare contro un Redis reale: il test usa un finto Redis e controlla comandi e scadenza inviati.

## Mappa di calore (Microsoft Clarity)

Clarity (gratuito) mostra dove cliccano e fin dove scorrono i visitatori e registra le sessioni. È già predisposto ma **resta spento finché non c'è un ID**: senza ID non compare né nel banner né nelle informative.

Per attivarlo:

1. Crea un progetto gratuito su clarity.microsoft.com e copia il **Project ID** (poche lettere e cifre).
2. Su Vercel, Settings, Environment Variables: aggiungi `PUBLIC_CLARITY_PROJECT_ID` con quell'ID (ambiente Production) e rifai il deploy. Non serve cambiare il codice.
3. Alla visita successiva tutti vedono di nuovo il banner (c'è un servizio nuovo): nel pannello Personalizza compare «Microsoft Clarity» con un interruttore proprio, separato da Google Analytics. Privacy e Cookie Policy si aggiornano da sole.

Da sapere:

- Clarity parte solo dopo il consenso e alla revoca si ferma e cancella i suoi cookie (`_clck`, `_clsk`, `CLID`). Per fermare del tutto gli script serve ricaricare la pagina.
- Registra le sessioni: è più invasivo delle sole statistiche. Nelle impostazioni del progetto Clarity conviene scegliere il mascheramento **Strict** e controllare i tempi di conservazione. Il sito non ha moduli, quindi non finiscono dati scritti dalle persone.
- Nell'informativa i tempi di conservazione di Clarity rimandano alle impostazioni del progetto: vanno confermati con chi segue la privacy, e vanno citati con il valore reale.
- Per spegnerlo basta togliere la variabile e rifare il deploy.
- Test: `npm run test:clarity` (costruisce il sito con un ID finto).

## Cosa c'è sul sito (scansione)

Fatta con ricerca nel codice e con `tests/crawl.test.mjs`, che apre tutte le pagine del build intercettando ogni richiesta esterna.

| Strumento | Categoria | Stato |
|---|---|---|
| Google Analytics 4 (`G-0GKQSD86CG`) | Statistiche | Bloccato fino al consenso |
| Google Maps (iframe in `/contatti`) | Preferenze e contenuti esterni | Bloccato fino al consenso |
| Microsoft Clarity (mappe di calore) | Statistiche | Predisposto, spento senza ID; con ID bloccato fino al consenso |
| Vercel Speed Insights | nessuna | Senza cookie, caricato sempre |
| Google Tag Manager, Meta Pixel, YouTube, altri | n/d | **Non presenti** |

La categoria «Marketing» esiste nel registro ma non compare nel banner perché non ha servizi: mostrare un interruttore che non controlla niente sarebbe fuorviante. Compare da sola quando si aggiunge un servizio di marketing.

## Aggiungere un servizio (es. Meta Pixel, GTM)

1. Aggiungere una voce in `SERVICES` (`consent-config.ts`) con categoria, fornitore, finalità, cookie e link all'informativa.
2. Aggiungere il suo loader in `loaders` dentro `CookieBanner.astro` (`enable()` carica lo script, `disable()` lo ferma e cancella i cookie propri).
3. Aggiornare `POLICY_VERSION`: tutti gli utenti vengono richiesti di nuovo.
4. Per i servizi Google di marketing, concedere in `enable()` anche `ad_storage`, `ad_user_data`, `ad_personalization` con `gt('consent', 'update', ...)`.
5. Se è un iframe, usare `ConsentEmbed.astro`.
6. Lanciare i test. La tabella in `/cookie` e il banner si aggiornano da soli.

## Test

```bash
npm run test:consent        # Chromium
npm run test:consent:all    # Chromium, Firefox e WebKit (il motore di Safari), più Clarity
npm run test:clarity        # solo Clarity (costruisce il sito con un ID finto)
```

Costruisce il sito, lo serve in locale e lo prova con Playwright. Copre: rifiuto, X, accettazione, personalizzazione, consenso al singolo servizio, revoca, scadenza e dati manomessi o corrotti, Consent Mode, invio e reinvio al registro, richieste di rete prima e dopo il consenso, WhatsApp, e la scansione di **tutte** le pagine del build (nessuna richiesta esterna e nessun cookie senza consenso, nessuna eccezione). `tests/mobile.test.mjs` prova iPhone 13 (WebKit) e Pixel 7 (Chromium) con il tocco. `tests/consent-api.test.mjs` prova l'endpoint. Ogni richiesta esterna viene intercettata e bloccata: i test non toccano Google.

Verificato anche al contrario: rompendo apposta il blocco di Analytics, i test diventano rossi.

## Cosa si può fare per favorire l'accettazione (e cosa no)

Lecito, ed è già fatto: pulsante pieno e più largo, nella posizione dove cade il pollice (in basso a destra, in basso su telefono), colore del brand, testo chiaro e senza toni drammatici.

Da non fare, perché invalidano il consenso o espongono a sanzioni: nascondere o togliere la X, caselle preselezionate, testi che colpevolizzano chi rifiuta, ritardi o animazioni che rendono lento il rifiuto, ripresentare il banner a ogni pagina, bloccare il sito a chi non accetta (cookie wall).

## Limiti e punti aperti

1. **Registro sul server da collegare.** Vedi «Attivare il registro»: senza Redis non c'è un archivio durevole. Va deciso anche per quanto conservare i dati (ora 2 anni) e il testo dell'informativa lo dichiara.
2. **Gerarchia visiva a favore dell'accettazione.** Accetta tutti è molto più evidente della X di chiusura. Non è un'invalidità automatica, ma il Garante e le autorità europee guardano con attenzione ai banner che scoraggiano il rifiuto. Se la X diventasse difficile da vedere o da usare, il rischio aumenta.
3. **Nessuna protezione vera da manomissioni.** Tutto gira nel browser, quindi chi vuole può modificare il proprio storage. Il codice convalida con rigore (versione, scadenza massima, tipi, solo servizi noti) e ignora quello che non torna, ma questo protegge da errori e dati corrotti, non da un utente che inganna se stesso. Il server a sua volta convalida e non si fida del client.
4. **Browser e dispositivi.** Provati Chromium, Firefox e WebKit su desktop, più iPhone 13 e Pixel 7 emulati (motore e tocco reali, ma non è un telefono fisico). Una prova a mano su un iPhone vero resta consigliata.
5. **Informative.** Privacy e Cookie Policy sono ospitate sul sito (iubenda non è più usato per niente) e scritte in forma formale come i Termini e condizioni. Sono redatte da un assistente informatico, non da un legale, sulla base di ciò che il sito fa davvero: vanno fatte leggere a chi segue la privacy dello studio. Punti da confermare: nessun DPO designato; i tempi di conservazione dei log tecnici sono quelli del fornitore di hosting; il database del registro dei consensi va nominato nell'informativa quando lo si sceglie.
6. **Mappa.** Resta sul sito ma l'iframe di Google Maps non è un cookie tecnico (Google imposta propri cookie): si carica solo dopo il consenso, con il segnaposto «Mostra la mappa». Togliere la voce Maps dal banner è possibile solo togliendo la mappa incorporata (resterebbe il link «Apri in mappe»).
7. **Vercel.** Speed Insights e `/_vercel/insights` (pagina `/links`) vengono caricati sempre perché Vercel li descrive come senza cookie e anonimi. Non è stato verificato in modo indipendente.
8. **Produzione.** Il sito online usa ancora il vecchio banner e le vecchie informative (iubenda) finché non si fa il deploy di questa modifica. Dopo il deploy l'account iubenda non serve più.
9. **Foto.** Le foto segnaposto di Unsplash ora sono ospitate sul sito (`public/images/stock/`), quindi non partono più richieste verso terzi. Restano foto di repertorio da sostituire con foto proprie quando le avrete.
