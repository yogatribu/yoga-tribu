# YOGA TRIBÙ — BUILD SPECIFICATION

**Versione:** 1.0
**Data:** Maggio 2026
**Destinatario:** Claude Code
**Status:** Pronto per sviluppo

---

## INDICE

0. Istruzioni preliminari per Claude Code
1. Brand Identity
2. Sistema Visivo (palette, tipografia, spacing, animazioni)
3. Struttura Navigazione (header, mega menu, footer, sticky CTA)
4. Pagine — Struttura Dettagliata
5. Sistema di Booking (WhatsApp)
6. Prezzi e Listini
7. Dati Insegnanti
8. SEO e Schema.org
9. Performance Targets
10. Componenti Astro
11. Tailwind Config
12. Setup Font
13. Considerazioni Legali
14. Checklist Pre-Launch

---

## 0. ISTRUZIONI PRELIMINARI PER CLAUDE CODE

### 0.1 Come usare questo documento

Questo documento è la specifica completa per costruire il sito web di Yoga Tribù. **Leggilo interamente prima di scrivere qualsiasi codice.** Le sezioni sono numerate e referenziate tra loro.

### 0.2 Lavoro a fasi (OBBLIGATORIO)

**NON costruire tutto il sito in una sessione.** Saturresti il context window e perderesti dettagli. Lavora per **fasi sequenziali** e dopo ogni fase chiedi all'utente di verificare prima di procedere.

**FASI OBBLIGATORIE:**

1. **FASE 1 — Setup e fondazioni:** progetto Astro, palette, font, componenti shared (Header, Footer, Button, Card, Section, Container)
2. **FASE 2 — Pagine core conversione:** /corsi (overview), /corsi/iyengar, /corsi/ashtanga, /corsi/flow, /corsi/teen-yoga, /abbonamenti, /orari
3. **FASE 3 — Pagine narrative:** /chi-siamo, 4 pagine /insegnanti/[nome]
4. **FASE 4 — Pagine eventi:** /eventi (overview), /eventi/estate-in-villa, template ritiri/workshop
5. **FASE 5 — Funzionalità interattive:** /quiz (custom), /contatti (con form)
6. **FASE 6 — Homepage e accessorie:** Homepage, /404
7. **FASE 7 — Ottimizzazioni:** SEO, Schema.org, sitemap, robots.txt, performance audit, mobile testing, cross-browser testing

### 0.3 Principi di sviluppo

- **Mobile-first:** progetta sempre prima per mobile, poi adatta a tablet/desktop
- **Componenti modulari:** ogni elemento riutilizzabile (Header, Footer, Card, CTA, Section, etc.) deve essere un componente Astro a sé
- **Performance prioritaria:** target Lighthouse 90+ su tutte le metriche
- **HTML semantico:** un solo H1 per pagina, struttura accessibile
- **Senza dipendenze pesanti:** solo Astro + Tailwind CSS, niente librerie JS pesanti (no jQuery, no Lodash, no Framer Motion)
- **Animazioni leggere:** CSS transitions/animations native
- **Niente localStorage/sessionStorage:** non servono, tutto stateless
- **Foto placeholder durante sviluppo:** usa Unsplash o equivalenti, l'utente sostituirà con foto reali successivamente

### 0.4 Struttura del progetto

```
yoga-tribu/
├── public/
│   ├── fonts/
│   │   └── NewYork.woff2 (convertire da OTF per ottimizzazione)
│   ├── images/ (placeholder durante sviluppo)
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.astro
│   │   │   ├── Footer.astro
│   │   │   ├── MegaMenu.astro
│   │   │   ├── MobileMenu.astro
│   │   │   └── StickyCTA.astro
│   │   ├── ui/
│   │   │   ├── Button.astro
│   │   │   ├── Chip.astro
│   │   │   ├── Card.astro
│   │   │   ├── Section.astro
│   │   │   ├── Container.astro
│   │   │   ├── Tag.astro
│   │   │   ├── Heading.astro
│   │   │   ├── Quote.astro
│   │   │   ├── Divider.astro
│   │   │   ├── Modal.astro
│   │   │   ├── Accordion.astro
│   │   │   └── Tabs.astro
│   │   ├── content/
│   │   │   ├── HeroSection.astro
│   │   │   ├── ManifestoSection.astro
│   │   │   ├── TimelineBenefits.astro
│   │   │   ├── CourseCard.astro
│   │   │   ├── TeacherCard.astro
│   │   │   ├── TeacherCardMicro.astro
│   │   │   ├── PricingCard.astro
│   │   │   ├── ScheduleGrid.astro
│   │   │   ├── ScheduleCell.astro
│   │   │   ├── ScheduleModal.astro
│   │   │   ├── FAQAccordion.astro
│   │   │   ├── TestimonialBlock.astro
│   │   │   ├── EventCard.astro
│   │   │   ├── WorkshopRow.astro
│   │   │   ├── CTAFinal.astro
│   │   │   ├── ExploreOtherCourses.astro
│   │   │   └── HowItWorksSteps.astro
│   │   └── interactive/
│   │       ├── QuizComponent.astro
│   │       ├── IntentChips.astro
│   │       ├── PlanToggle.astro
│   │       ├── ScheduleFilters.astro
│   │       └── TeenToggle.astro
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── corsi/
│   │   │   ├── index.astro
│   │   │   ├── iyengar.astro
│   │   │   ├── ashtanga.astro
│   │   │   ├── flow.astro
│   │   │   └── teen-yoga.astro
│   │   ├── abbonamenti.astro
│   │   ├── orari.astro
│   │   ├── chi-siamo.astro
│   │   ├── insegnanti/
│   │   │   ├── glenda.astro
│   │   │   ├── giulia.astro
│   │   │   ├── victor.astro
│   │   │   └── teen.astro
│   │   ├── eventi/
│   │   │   ├── index.astro
│   │   │   ├── estate-in-villa.astro
│   │   │   ├── ritiri/
│   │   │   │   └── [...slug].astro
│   │   │   └── workshop/
│   │   │       └── [...slug].astro
│   │   ├── quiz.astro
│   │   ├── contatti.astro
│   │   └── 404.astro
│   ├── styles/
│   │   └── globals.css
│   └── content/
│       ├── workshops/ (markdown files)
│       └── ritiri/ (markdown files)
├── astro.config.mjs
├── tailwind.config.cjs
├── package.json
└── README.md
```

---

## 1. BRAND IDENTITY

### 1.1 Nome e posizionamento

**Nome:** Yoga Tribù
**Tagline brand:** *"Non vendiamo lezioni. Vendiamo come ci si sente dopo."*

**Posizionamento:** Studio yoga professionale e tradizionale a Cassola Veneto. Tre stili distinti (Iyengar, Ashtanga, Flow) + Teen Yoga, ciascuno insegnato da specialisti certificati. NON è fitness, NON è yoga lifestyle/social, NON è palestra. È un luogo dove si risolvono problemi reali (dolori fisici, stress, mancanza di consapevolezza corporea) attraverso pratica seria e comunità autentica.

**Target principale:**
- Età 40+ (focus 30-70)
- Persone con dolori fisici cronici (schiena, spalle, ginocchia, cervicale)
- Sportivi che cercano supporto/recupero
- Persone mature, non interessate a yoga estetico/performativo
- Italiano (sito solo in italiano)

**Differenziatori chiave:**
1. Iyengar e Ashtanga rare sul territorio (Cassola, Veneto)
2. Insegnanti formati per anni nel metodo specifico (no "yoga generalisti")
3. No turn-over insegnanti (a differenza di altri studi locali)
4. Lezioni ogni giorno della settimana
5. Comunità "tribù" autentica (l'amicizia è parte dell'esperienza)

**Frase chiave manifesto:**
> *Yoga Tribù esiste per chi è pronto a scegliere consapevolmente. Non per chi cerca la comodità della moda, ma per chi vuole la solidità di una trasformazione reale.*

### 1.2 Tono di voce

- **Elegante, diretto, caldo.** Umano ma professionale.
- **Sicuro senza essere arrogante.**
- **Leggermente aspirazionale ma sempre credibile.**
- **Mai generico, mai fuffa, mai spirituality forzata, mai tecnicismi.**
- **Specifico sempre:** non "migliora il corpo" ma "risolve il mal di schiena in 8 settimane"
- **Microcopy umana:** "scrivici" non "contatta il servizio clienti"

**Esempio frase corretta:**
*"Iyengar non è yoga da social. È la pratica per chi vuole risolvere dolori reali con insegnanti formati per anni."*

**Esempio frase sbagliata:**
*"Scopri il potere trasformativo dello yoga tradizionale in armonia con la natura."*

### 1.3 Cosa NON è Yoga Tribù

- Non è palestra
- Non è brand di lifestyle
- Non è yoga estetico per Instagram
- Non è "spa rilassante"
- Non è studio che segue le mode

### 1.4 Valori

- **Rigore:** tecniche tradizionali, nessuna concessione alla moda
- **Autenticità:** comunicazione reale, relazioni genuine
- **Competenza:** insegnanti certificati in ogni singolo metodo
- **Appartenenza:** siamo una tribù, l'amicizia è parte dell'esperienza

### 1.5 Informazioni operative

- **Indirizzo:** Via Giuseppe Mazzini 1, 36022 Cassola Veneto, Italia
- **Telefono / WhatsApp:** +39 328 767 5966
- **Instagram:** @yoga__tribu
- **Facebook:** Yoga Tribù
- **Intestazione legale:** Antico Glenda Francesca Romana
- **P. IVA:** 04505320244
- **Pagamenti:** carta o contanti in studio (no online payment in fase 1)
- **Lingua sito:** solo italiano
- **Politica cancellazione:** entro 24h prima della lezione (placeholder, da confermare)
## 2. SISTEMA VISIVO

### 2.1 Palette colori

```css
/* PRIMARI (Brand colors) */
--color-primary:        #9c9a66;  /* Ocra principale — headings, accenti, Iyengar, link primari */
--color-secondary:      #bf9d70;  /* Beige-sabbia — accenti secondari, hover state, divider */
--color-background:     #f9f5f0;  /* Avorio — sfondo principale */
--color-background-alt: #faf8f5;  /* Avorio chiaro alternativo — sezioni alternate */

/* COLORI STILI (per griglia orari, tag pratiche) */
--color-iyengar:    #9c9a66;  /* Ocra (primario) */
--color-ashtanga:   #7a6b5f;  /* Marrone profondo */
--color-flow:       #b8a68e;  /* Salvia-sabbia */
--color-teen:       #d4b5a0;  /* Pesca-terra */

/* TESTO */
--color-text:           #2a2a2a;  /* Testo principale (nero quasi-puro) */
--color-text-secondary: #6b6b6b;  /* Testo secondario, descrizioni */
--color-text-light:     #ffffff;  /* Testo su sfondi scuri */

/* FUNZIONALI */
--color-border:    #e8e4df;  /* Border, divider sottile */
--color-error:     #c95a4a;  /* Errore, urgenza, scarcity (es. "5 posti rimasti") */
--color-success:   #7a9d6e;  /* Successo, conferme positive */
```

### 2.2 Tipografia

**Font Principale (Serif, headings):** New York
- File sorgente: `NewYork_PERSONAL_USE.otf` (108 KB)
- File da usare in produzione: `public/fonts/NewYork.woff2` (~50 KB dopo conversione)
- **IMPORTANTE:** convertire OTF in WOFF2 prima del deploy
- Caricamento: `font-display: swap`
- Weights utilizzati: Regular (400), occasionalmente Medium (500)
- Usato per: H1, H2, H3, headline card, citazioni, tagline
- ✅ **Licenza commerciale verificata** dall'utente: il font può essere utilizzato sul sito di Yoga Tribù.
- Fallback stack (in caso di mancato caricamento del file): `Cormorant Garamond`, `Playfair Display`, `EB Garamond`, `Georgia`, `serif`

**Font Secondario (Sans-serif, body):** Inter
- Caricamento: Google Fonts (oppure self-hosted per performance migliori)
- Stack: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Weights: 400 (regular), 500 (medium), 600 (semibold)
- Usato per: body text, descrizioni, label, CTA, microcopy

**Scala tipografica responsive:**

```css
/* Desktop */
--text-display:  64px;  /* Hero h1 */
--text-h1:       48px;  /* H1 standard */
--text-h2:       36px;  /* Section headlines */
--text-h3:       24px;  /* Subsection headlines */
--text-h4:       20px;  /* Card titles */
--text-body:     16px;  /* Body text */
--text-small:    14px;  /* Microcopy, captions */
--text-tiny:     12px;  /* Tags, labels uppercase */

/* Mobile (sotto 640px, scale ~0.75x) */
--text-display-mobile:  44px;
--text-h1-mobile:       36px;
--text-h2-mobile:       28px;
--text-h3-mobile:       22px;
```

**Line height:**
- Headings: 1.2
- Body: 1.6-1.7
- Large quotes: 1.4

**Letter spacing:**
- Tags uppercase: 0.08em-0.1em
- Headings: -0.01em (leggermente serrato)
- Body: 0 (default)

### 2.3 Spacing system (8-point grid)

```css
--spacing-xs:  4px;
--spacing-sm:  8px;
--spacing-md:  16px;
--spacing-lg:  24px;
--spacing-xl:  32px;
--spacing-2xl: 48px;
--spacing-3xl: 64px;
--spacing-4xl: 96px;
--spacing-5xl: 128px;
--spacing-6xl: 160px;
```

**Padding sezioni standard:**
- Sezione standard: `padding: 96px 0` desktop, `64px 0` mobile
- Sezione enfatica (manifesto, CTA finali): `padding: 160px 0` desktop, `96px 0` mobile
- Sezione compatta: `padding: 48px 0` desktop, `32px 0` mobile

### 2.4 Container e griglia

```css
--container-max:    1280px;  /* Standard */
--container-narrow:  800px;  /* Per testi narrativi lunghi */
--container-wide:   1440px;  /* Per griglie larghe (orari, eventi) */
```

**Padding orizzontale container:**
- Mobile: 24px
- Tablet: 48px
- Desktop: 64px

### 2.5 Animazioni e transizioni

**Durate standard:**
- Hover micro: 150-200ms
- Hover card: 250-300ms
- Modal/menu apertura: 250-300ms
- Page transition: 400ms

**Easing standard:**
- Default: `cubic-bezier(0.4, 0, 0.2, 1)` (ease-out)
- Smooth: `cubic-bezier(0.65, 0, 0.35, 1)`
- **Vietato:** bouncy, elastic, spring (non coerenti con il brand)

**Hover effects standardizzati:**
- Link testo: underline animato in 200ms
- Button: leggero darken background, no scale
- Card: lift 4-8px, box-shadow leggera, transizione 250ms
- Image hover: zoom 1.03-1.05 in 400ms
- Icon link: shift 4px in direzione freccia

### 2.6 Border radius

```css
--radius-none: 0;
--radius-sm:   4px;   /* Button, input, mini-tag */
--radius-md:   8px;   /* Card, modal, sezioni */
--radius-lg:   16px;  /* Hero elements (raro) */
--radius-full: 9999px; /* Pillole, toggle */
```

### 2.7 Box shadows

```css
--shadow-sm:    0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md:    0 4px 12px rgba(0, 0, 0, 0.08);
--shadow-lg:    0 12px 24px rgba(0, 0, 0, 0.10);
--shadow-hover: 0 8px 24px rgba(0, 0, 0, 0.12);
```

### 2.8 Iconografia

- **Stile:** linea sottile, 1.5-2px stroke
- **Color default:** `#9c9a66` o `#6b6b6b` a seconda del contesto
- **Geometrico, elegante**
- **VIETATO:** icone "yoga emoji" tipo loto/Om, simboli spirituali stereotipati, emoji standard (🧘 ecc. usabili solo dove esplicitamente indicato)
- **Suggerito libreria:** Lucide Icons (https://lucide.dev) — open source, stile pulito

### 2.9 Breakpoint responsive

```css
/* Mobile-first approach */
--breakpoint-sm:  640px;   /* Telefoni grandi / tablet piccoli */
--breakpoint-md:  768px;   /* Tablet */
--breakpoint-lg:  1024px;  /* Desktop piccolo */
--breakpoint-xl:  1280px;  /* Desktop standard */
--breakpoint-2xl: 1536px;  /* Desktop grande */
```

**Strategia:**
- Default styling: mobile (320px+)
- `sm:` per ≥640px
- `md:` per ≥768px
- `lg:` per ≥1024px
- `xl:` per ≥1280px

### 2.10 Mood visivo per stile

Ogni stile yoga ha un mood fotografico distintivo (per le foto reali da usare nelle pagine):

| Stile | Tono visivo | Mood foto |
|---|---|---|
| **Iyengar** | Toni terrosi, ocra spento, beige caldi | Dettagli precisi: mani, mattoncini, allineamenti |
| **Ashtanga** | Toni più scuri, marrone profondo | Disciplina, sudore vero, sguardi concentrati |
| **Flow** | Toni più chiari, salvia, avorio | Movimento, fluidità, luce naturale |
| **Teen Yoga** | Toni più chiari, pesca-sabbia | Naturale, autentico, non posato |

**Regole foto generali:**
- ✅ Foto reali in studio, persone vere, luce naturale
- ❌ Stock photo riconoscibili
- ❌ Donne sotto 25 anni in tenuta da yoga su una spiaggia
- ❌ Mani giunte al tramonto
- ❌ Filtri pesanti, tinte calde finte
## 3. STRUTTURA NAVIGAZIONE GLOBALE

### 3.1 Header

**Posizione:** sticky, sempre visibile.

**Comportamento sticky:**
- Stato iniziale (su hero pagina): trasparente, testo bianco
- Dopo scroll >80px: background `#f9f5f0` con `backdrop-filter: blur(20px)`, bordo inferiore 1px `#e8e4df`, testo `#2a2a2a`
- Transizione: 250ms ease-out
- Riduzione altezza: da 88px a 64px durante transizione

**Layout desktop (≥1024px):**
```
[LOGO] | [Menu centrato: Corsi · Chi Siamo · Abbonamenti · Eventi] | [CTA "Prenota la prima lezione"]
```

**Layout tablet (768-1023px):**
```
[LOGO] | [Menu compatto] | [CTA "Prenota"]
```

**Layout mobile (≤767px):**
```
[LOGO] | [hamburger icon]
```

**Specifiche:**
- Altezza desktop: 88px iniziale → 64px sticky
- Altezza mobile: 60px (sempre)
- Logo: placeholder testuale "Yoga Tribù" in font New York 24px, finché non c'è file logo. Quando l'utente fornirà il logo (.svg preferibilmente), sostituire.
- Z-index header: 50

**Font menu:**
- Sans-serif Inter, 15px, weight 400
- Letter-spacing leggero (0.02em)
- Hover: underline animato (2px, 200ms)
- Color: ereditato dallo stato sticky (white iniziale, dark dopo scroll)

**CTA "Prenota":**
- Padding: 12px 24px
- Background: `#9c9a66`
- Text: white, 14px, weight 500
- Border-radius: 4px
- Hover: background `#8a885a`
- Action: apre WhatsApp con messaggio "Ciao! Vorrei prenotare la prima lezione di prova a 10€." (vedi sezione 5.2)

### 3.2 Mega Menu (desktop)

**Trigger:** hover su voce menu (delay apertura 100ms, delay chiusura 200ms)

**Layout pannello:**
- Larghezza: full-width con max-width 1280px centrato
- Background: `#f9f5f0`
- Padding: 64px sopra/sotto, 48px laterali
- Backdrop su pagina sottostante: `rgba(255,255,255,0.6)` con `blur(20px)`
- Box-shadow: `var(--shadow-md)` sotto il pannello
- Animazione apertura: fade + slide-down 12px, 250ms ease-out
- Z-index: 49 (sotto header)

**Struttura pannello (pattern Apple):**
- Label colonna in alto: 12px, uppercase, color #6b6b6b, letter-spacing 0.1em
- Voci principali: serif New York 28-32px, regular
- Hover voce: opacità leggera (0.7) + shift 6px right
- Click voce: naviga a pagina corrispondente

#### 3.2.1 Mega Menu — Corsi

```
COL 1: SCOPRI I CORSI
├── Tutti i corsi              → /corsi
├── Iyengar Yoga               → /corsi/iyengar
├── Ashtanga Yoga              → /corsi/ashtanga
├── Flow Yoga                  → /corsi/flow
├── Teen Yoga                  → /corsi/teen-yoga
└── Quale corso fa per te?     → /quiz
```

#### 3.2.2 Mega Menu — Chi Siamo

```
COL 1: LA NOSTRA STORIA          COL 2: LE PERSONE
├── Chi siamo                   ├── Tutti gli insegnanti  → /chi-siamo#insegnanti
├── Filosofia e metodo          ├── Glenda                → /insegnanti/glenda
└── Lo studio                   ├── Giulia                → /insegnanti/giulia
                                ├── Victor                → /insegnanti/victor
                                └── [Teen]                → /insegnanti/teen
```

**Note:** "Chi siamo", "Filosofia e metodo", "Lo studio" puntano tutti a `/chi-siamo` con eventualmente anchor (`#filosofia`, `#studio`) per navigazione rapida nella stessa pagina.

#### 3.2.3 Mega Menu — Abbonamenti

```
COL 1: SCOPRI I PIANI
├── Tutti gli abbonamenti       → /abbonamenti
├── Lezioni in studio           → /abbonamenti#studio
├── Lezioni private             → /abbonamenti#private
└── Prima lezione di prova      → WhatsApp link
```

#### 3.2.4 Mega Menu — Eventi

```
COL 1: ESPLORA GLI EVENTI         COL 2: PROSSIMO EVENTO
├── Tutti gli eventi              [Card immagine + titolo + data]
├── Estate in Villa               [Cliccabile → pagina evento]
├── Ritiri                        
└── Workshop mensili              
```

**La col 2 mostra dinamicamente il prossimo evento in calendario.** Se non ci sono eventi imminenti, fallback: card statica con foto Estate in Villa edizione passata + testo "Iscrizioni 2026 in arrivo".

### 3.3 Menu mobile

**Trigger:** click su hamburger icon

**Layout menu mobile:**
- Full-screen overlay
- Background: `#f9f5f0`
- Animazione: slide-in da destra, 300ms ease-out
- Close icon (×) in alto a destra
- CTA "Prenota la prima lezione" in alto, prominente, full-width
- Voci principali: New York 32px, regular, una sotto l'altra, tap per espandere
- Sottoclassi: accordion che si espande al tap (icona + ruota in -)
- Footer del menu: link social (IG, FB, WhatsApp) + numero telefono

**Z-index:** 60 (sopra l'header)

**Struttura voci:**
```
× (close)

[CTA grande]: Prenota la prima lezione

CORSI ▼
   ├ Tutti i corsi
   ├ Iyengar
   ├ Ashtanga
   ├ Flow
   ├ Teen Yoga
   └ Quiz: quale fa per te?

CHI SIAMO ▼
   ├ Chi siamo
   ├ Filosofia
   ├ Lo studio
   └ Insegnanti
       ├ Glenda
       ├ Giulia
       ├ Victor
       └ Teen

ABBONAMENTI ▼
   ├ Tutti i piani
   ├ In studio
   └ Private

EVENTI ▼
   ├ Tutti gli eventi
   ├ Estate in Villa
   ├ Ritiri
   └ Workshop

ORARI       (link diretto)
CONTATTI    (link diretto)

────────────

[Social row]: IG · FB · WhatsApp
+39 328 767 5966
```

### 3.4 Footer

**Layout desktop (4 colonne):**

```
COL 1: BRAND          COL 2: NAVIGAZIONE    COL 3: PRATICA          COL 4: CONTATTI
┌─────────────────┐   ├ Corsi               ├ Iyengar               📍 Via Giuseppe Mazzini 1
│  YOGA TRIBÙ     │   ├ Chi Siamo           ├ Ashtanga              36022 Cassola Veneto
│  [tagline]      │   ├ Abbonamenti         ├ Flow                  
└─────────────────┘   ├ Orari               ├ Teen Yoga             📞 +39 328 767 5966
[Citazione brand]     ├ Eventi              └ Quiz                  ✉️ [email placeholder]
                      └ Contatti                                    
                                                                    [Social: IG · FB · WA]
```

**Layout tablet (2 colonne 2x2)**
**Layout mobile:** colonne in stack verticale.

**Sottofooter (sotto le 4 colonne):**
```
[Linea sottile #4a4a4a]
© 2026 Yoga Tribù di Antico Glenda Francesca Romana · P. IVA 04505320244  |  Privacy Policy  |  Cookie Policy
```

**Specifiche footer:**
- Background: `#1a1a1a` (più scuro del testo per più contrasto)
- Text color: avorio chiaro (`#f9f5f0` con opacity 0.85)
- Heading colonne: bianco, Inter 13px uppercase, letter-spacing 0.1em
- Padding: 96px 0 48px desktop, 64px 0 32px mobile
- Link hover: underline + opacity 1

**Contenuti specifici:**

**COL 1 — BRAND:**
- Logo "Yoga Tribù" (placeholder testuale, font New York white, 28px)
- Tagline sotto: "Studio yoga professionale a Cassola Veneto"
- Citazione brand (italic 14px, max-width 280px): *"Non vendiamo lezioni. Vendiamo come ci si sente dopo."*

**COL 2 — NAVIGAZIONE:**
- Heading: NAVIGAZIONE
- Lista link:
  - Corsi → /corsi
  - Chi Siamo → /chi-siamo
  - Abbonamenti → /abbonamenti
  - Orari → /orari
  - Eventi → /eventi
  - Contatti → /contatti

**COL 3 — PRATICA:**
- Heading: LE PRATICHE
- Lista link:
  - Iyengar → /corsi/iyengar
  - Ashtanga → /corsi/ashtanga
  - Flow → /corsi/flow
  - Teen Yoga → /corsi/teen-yoga
  - Quiz → /quiz

**COL 4 — CONTATTI:**
- Heading: CONTATTI
- Indirizzo (con icona pin minimale): Via Giuseppe Mazzini 1, 36022 Cassola Veneto, Italia
- Telefono (clickable `tel:+393287675966`): +39 328 767 5966
- Email placeholder: info@yogatribu.it (da configurare)
- Social links (icone 24px):
  - Instagram → `https://instagram.com/yoga__tribu`
  - Facebook → `https://facebook.com/yogatribu` (verificare URL esatto)
  - WhatsApp → `https://wa.me/393287675966`

**Sottofooter dettagli:**
- Inter 13px, color rgba(255,255,255,0.5)
- Privacy Policy / Cookie Policy: link che vanno a pagine `/privacy` e `/cookie` (placeholder fino a configurazione Iubenda)

### 3.5 Sticky CTA mobile (solo pagine corso)

**Comportamento:**
- Appare SOLO su mobile (≤768px)
- Appare SOLO su pagine `/corsi/[stile]` (Iyengar, Ashtanga, Flow, Teen Yoga)
- Si attiva dopo scroll del 30% della pagina
- Si nasconde quando l'utente scrolla VERSO L'ALTO (segno che sta cercando di leggere, non di cliccare)
- Riappare quando scrolla verso il basso

**Design:**
- Position: `fixed; bottom: 0;`
- Background: bianco con `backdrop-filter: blur(12px)`, opacity 0.95
- Border-top: 1px `#e8e4df`
- Padding: 12px 16px
- Z-index: 40 (sotto modal e menu)

**Contenuto:**
- Pulsante singolo full-width
- Background: `#9c9a66`
- Text: "Prenota la prima lezione"
- Color: white, 15px, weight 500
- Border-radius: 4px
- Padding: 14px

**Animazioni:**
- Apparizione: slide-up 250ms ease-out
- Sparizione: slide-down 200ms ease-out
- Implementazione: vanilla JS che ascolta `scroll` event con throttle/debounce

**Action:** apre WhatsApp con messaggio precompilato basato sulla pagina corso corrente:
- /corsi/iyengar → "Ciao! Vorrei prenotare una prima lezione di Iyengar."
- /corsi/ashtanga → "Ciao! Vorrei prenotare una prima lezione di Ashtanga."
- /corsi/flow → "Ciao! Vorrei prenotare una prima lezione di Flow."
- /corsi/teen-yoga → "Ciao! Vorrei informazioni su Teen Yoga."
## 4. PAGINE — STRUTTURA DETTAGLIATA

## 4.1 PAGINA `/corsi` (OVERVIEW)

### Funzione
Helper per scegliere lo stile giusto + navigazione ai dettagli corso.

### Struttura

#### 4.1.1 Hero pagina (50vh)

```
[Background: #f9f5f0, padding 96px 0]

[Centrato, max-width 900px]

[Tag]: I CORSI

[Headline grande, New York serif 56px desktop / 36px mobile]
Tre pratiche. Tre maestri. 
Una scelta consapevole.

[Sotto-headline, max-width 700px centrato]
Iyengar, Ashtanga e Flow — ciascuno insegnato da chi lo ha 
studiato per anni. Trova quello giusto per la fase di vita 
in cui sei.
```

#### 4.1.2 Selettore intent (chip cliccabili)

```
[Background: #f9f5f0, padding 0 0 64px 0]

[Centrato, max-width 800px]

[Label sopra chip, Inter 14px color #6b6b6b]
Cosa cerchi?

[Spacing 16px]

[4 chip cliccabili, allineate centrate, gap 12px, wrap su mobile]
( Risolvere dolori fisici )  ( Costanza e disciplina )
( Muovermi senza pensare )    ( Non lo so ancora )
```

**Specifiche chip:**
- Padding: 12px 24px
- Border: 1px `#e8e4df`
- Border-radius: 9999px (pill)
- Font: Inter 14px regular
- Background: transparent
- Hover: background `#faf8f5`, border `#9c9a66`
- Cursor: pointer

**Stato attivo:**
- Background: `#9c9a66`
- Text: white
- Border: `#9c9a66`

**Comportamento:**
- Click su una chip → la card corrispondente sotto si evidenzia (border 2px `#9c9a66`, scale 1.02), le altre opacity 0.6
- Una sola chip attiva alla volta (radio behavior)
- Click di nuovo sulla chip attiva → deseleziona, tutte tornano normali
- Click su "Non lo so ancora" → naviga a `/quiz`
- Animazione: 250ms ease-out

**Mapping chip → card:**
- "Risolvere dolori fisici" → evidenzia Iyengar
- "Costanza e disciplina" → evidenzia Ashtanga
- "Muovermi senza pensare" → evidenzia Flow

#### 4.1.3 Griglia card 3 corsi principali

**Decisione architettura:** Teen Yoga NON è in questa griglia. È in una sezione dedicata sotto, perché ha target diverso (genitori/adolescenti) e merita la sua narrazione separata.

```
[Background: #f9f5f0, padding 64px 0 96px 0]

[Container max 1280px, padding orizzontale 64px desktop / 24px mobile]

[Griglia 3 colonne desktop, 1 colonna tablet+mobile, gap 32px]
```

**Anatomia card corso:**

```
┌──────────────────────────────────────┐
│                                      │
│   [Immagine 4:5 verticale]           │
│   Foto reale, dettaglio pratica      │
│                                      │
├──────────────────────────────────────┤
│  Padding 32px                        │
│                                      │
│  IYENGAR                             │  ← Tag uppercase 12px color stile
│                                      │
│  Per il corpo che ha                 │  ← New York 28px desktop / 22px mobile
│  bisogno di precisione.              │
│                                      │
│  Una pratica tradizionale che        │  ← Inter 15px line-height 1.6
│  risolve dolori reali con tecniche   │
│  precise e insegnanti formati.       │
│                                      │
│  ─────────                           │  ← Divider 1px #e8e4df
│                                      │
│  • Tutti i livelli                   │  ← Inter 14px, gap 8px
│  • 30–70 anni                        │
│  • Postura, dolori, consapevolezza   │
│                                      │
│  Scopri Iyengar  →                   │  ← Inter 15px medium color stile
│                                      │
└──────────────────────────────────────┘
```

**Stati card:**
- Default: border 1px `#e8e4df`, background white, border-radius 8px
- Hover: border colore stile, lift 4px, shadow `var(--shadow-md)`, image zoom 1.03
- Cursor pointer su tutta la card

**Cliccabilità:**
- Tutta la card è cliccabile → naviga a `/corsi/[stile]`
- La CTA "Scopri →" è solo indicazione visiva

**Contenuti specifici per ogni card:**

**Card 1 — IYENGAR**
- Tag: IYENGAR (color #9c9a66)
- Headline: "Per il corpo che ha bisogno di precisione."
- Descrizione: "Una pratica tradizionale che risolve dolori reali con tecniche precise e insegnanti formati."
- Bullet: Tutti i livelli · 30–70 anni · Postura, dolori, consapevolezza
- Link: /corsi/iyengar

**Card 2 — ASHTANGA**
- Tag: ASHTANGA (color #7a6b5f)
- Headline: "Per chi cerca un posto a cui tornare ogni giorno."
- Descrizione: "Una pratica costante che restituisce silenzio interiore, crescita fisica e mentale."
- Bullet: Guidata e Mysore · 20–50 anni · Disciplina, costanza, comunità
- Link: /corsi/ashtanga

**Card 3 — FLOW**
- Tag: FLOW (color #b8a68e)
- Headline: "Un'ora in cui smetti di pensare."
- Descrizione: "Pratica fresca, sempre diversa. Muoversi, respirare, lasciare fuori il resto."
- Bullet: Tutti i livelli · 18–45 anni · Movimento, presenza, libertà
- Link: /corsi/flow

#### 4.1.4 Sezione Teen Yoga (separata, asimmetrica)

```
[Background: #faf8f5, padding 96px 0]

[Container]

[Layout 2 colonne 50/50 desktop, stack mobile, gap 64px]

COL SINISTRA (testo):

[Tag, color #d4b5a0]: TEEN YOGA

[Headline, New York serif 40px]
Per chi sta diventando 
se stesso.

[Body, Inter 16px line-height 1.7]
Pratica pensata per adolescenti tra i 12 e i 17 anni. 
Una via concreta per imparare a gestire stress, postura e 
concentrazione in una fase della vita dove il corpo e la mente 
cambiano in fretta.

[Spacing 24px]

[CTA testuale]: Scopri Teen Yoga →
[Link: /corsi/teen-yoga, color #d4b5a0]

COL DESTRA (immagine):
[Foto reale o placeholder — adolescenti in pratica, naturale, non posato]
[Aspect ratio 4:5 verticale]
```

#### 4.1.5 Sezione "Non sai ancora?"

```
[Background: #f9f5f0, padding 96px 0]

[Centrato, max-width 700px]

[Headline media, New York serif 36px]
Ancora non sai quale fa per te?

[Sotto-headline]
Cinque domande, sessanta secondi. 
Ti diciamo da dove iniziare.

[Spacing 32px]

[CTA pulsante]: Fai il test →
[Background #9c9a66, text white, padding 16px 32px, link /quiz]

[Spacing 16px]

[Microcopy 13px color #6b6b6b]
Oppure scrivici su WhatsApp — rispondiamo entro un'ora.
[Link "su WhatsApp" → wa.me/393287675966]
```

#### 4.1.6 Sezione "Come funziona una lezione"

```
[Background: #faf8f5, padding 96px 0]

[Container]

[Tag]: LA TUA PRIMA VOLTA

[Headline]: Cosa aspettarti.

[Spacing 48px]

[Griglia 3 colonne desktop, 1 mobile, gap 48px]

[Col 1: icona]                [Col 2: icona]                [Col 3: icona]
[Icona linea, 48px, color #9c9a66]

NON SERVE                      L'INSEGNANTE                   TU PENSI AL RESPIRO,
ESSERE FLESSIBILI              TI GUIDA SEMPRE                NOI AL RESTO

La flessibilità è              Se non conosci una             Tappetini, mattoncini, 
il risultato della             posizione, non sei             cinture: tutto è già 
pratica, non il                solo. Ti mostriamo             in studio. Vieni con 
prerequisito.                  come, passo per passo.         abiti comodi.
```

#### 4.1.7 CTA finale pagina

```
[Background: #9c9a66, text white, padding 128px 0]

[Centrato]

[Headline]: Inizia da una sola lezione.

[Sotto-headline]
Prima lezione di prova a 10€. Senza abbonamenti, senza fretta.

[CTA grande]: Prenota →
[Background white, text #9c9a66, padding 16px 40px]

[Microcopy white 13px opacity 0.85]: 
Risposta entro 1 ora · Cancellabile fino a 24h prima
```

---

## 4.2 PAGINA `/abbonamenti`

### Identità visiva
- Background base: `#f9f5f0` alternato `#faf8f5`
- Accenti: `#9c9a66` per piano consigliato, `#c95a4a` per badge sconto

### Struttura

#### 4.2.1 Hero (40vh)

```
[Background: #f9f5f0, padding 96px 0]

[Centrato, max-width 900px]

[Tag]: ABBONAMENTI

[Headline]: 
Trova il piano che funziona davvero per te.

[Sotto-headline]: 
Niente vincoli annuali. Cambi quando cambi tu.
```

#### 4.2.2 Toggle In Studio / Private (sticky leggero)

```
[Centrato sotto hero, sticky con top: 80px dopo scroll]

[Container pillola, larghezza ~360px]
[ Lezioni in studio ]    Private

Default attivo: "Lezioni in studio"
```

**Specifiche toggle:**
- Container: background `#e8e4df`, border-radius 9999px, padding 4px
- Pillola attiva: background `#9c9a66`, text white, border-radius 9999px, padding 12px 24px
- Pillola inattiva: text `#6b6b6b`, transparent
- Animazione switch: pillola scivola da una parte all'altra in 250ms ease-out
- URL state: opzionale, ?tipo=studio o ?tipo=private (per condivisione link diretto)

#### 4.2.3 Griglia 4 card LEZIONI IN STUDIO (default)

```
[Container max 1280px, padding 64px 0]

[Griglia 4 colonne desktop, 2x2 tablet, 1 mobile, gap 24px]
```

**CARD 1 — PRIMA LEZIONE DI PROVA:**

```
┌─────────────────────────┐
│  PROVA                  │  ← Tag uppercase 11px color #9c9a66
│                         │
│  Prima lezione          │  ← New York 24px
│                         │
│  10€                    │  ← Inter 36px medium
│                         │
│  Una sola lezione, per  │
│  capire se è il tuo     │
│  posto.                 │
│                         │
│  ─────────              │
│                         │
│  ✓ Tutti gli stili      │
│  ✓ Senza impegno        │
│  ✓ Tappetino fornito    │
│                         │
│  Prenota →              │
│                         │
└─────────────────────────┘
```

**CARD 2 — DROP-IN:**

```
SINGOLA
Lezione singola
20€
Per chi pratica saltuariamente.
─────────
✓ Tutti gli stili
✓ Nessuna scadenza
✓ Prenotazione in qualsiasi momento

Acquista →
```

**CARD 3 — PACCHETTO 10:**

```
PACCHETTO
10 lezioni
150€
15€ a lezione (Inter 14px color #6b6b6b sotto il prezzo)
Per chi pratica una volta a settimana.
─────────
✓ Tutti gli stili
✓ Validità 4 mesi
✓ Workshop scontati

Acquista →
```

**CARD 4 — PACCHETTO 20 ⭐ PIÙ SCELTO:**

```
[Differenziazione visiva:]
- Border 2px solid #9c9a66 (vs 1px default delle altre)
- Altezza scala +12px (sticking out leggero)
- Box-shadow leggera sempre attiva
- Badge "⭐ PIÙ SCELTO" in alto, posizionato assoluto, background #9c9a66 text white, padding 6px 12px, border-radius 4px

PACCHETTO
20 lezioni
240€
12€ a lezione

[Badge sconto, color #c95a4a, sotto il prezzo]: Risparmi 40%

Per chi pratica due volte a settimana.
─────────
✓ Tutti gli stili
✓ Validità 5 mesi
✓ Workshop scontati
✓ Priorità prenotazione  ← unico beneficio esclusivo, in evidenza

Inizia ora →
[Verbo di trasformazione, non "Acquista"]
```

**Comportamento card:**
- Hover: lift 4px, shadow `var(--shadow-md)`
- Click su CTA → apre WhatsApp con messaggio precompilato:
  - Card 1: "Ciao! Vorrei prenotare la prima lezione di prova a 10€."
  - Card 2: "Ciao! Vorrei acquistare una lezione singola."
  - Card 3: "Ciao! Vorrei acquistare il pacchetto da 10 lezioni."
  - Card 4: "Ciao! Vorrei acquistare il pacchetto da 20 lezioni."

#### 4.2.4 Griglia 4 card LEZIONI PRIVATE (toggle alternativo)

```
[Sopra le card, max-width 800px centrato, padding 24px 0]

[Nota informativa, Inter 15px italic color #6b6b6b]

Le lezioni private sono pensate per chi cerca un percorso 
personalizzato — recupero da infortuni, bisogni specifici, 
principianti che vogliono sicurezza.

[Spacing 32px]

[Griglia 4 card, gap 24px]
```

**CARD 1 — INDIVIDUALE:**
```
1 PERSONA
Privata individuale
45€
─
Lezione personalizzata.
─────────
✓ Stile a scelta (Iyengar, Ashtanga, Flow)
✓ ~60 minuti
✓ Adattata alle tue necessità

Richiedi →
```

**CARD 2 — DUO ⭐ PIÙ SCELTO:**
```
[Stesso pattern card "PIÙ SCELTO" della griglia studio]

2 PERSONE
Privata duo
80€
40€/persona
─
Lezione a due, esperienza intima.
─────────
✓ Stile a scelta
✓ ~60 minuti
✓ Ideale per coppie, amiche

Richiedi →
```

**CARD 3 — TRIO:**
```
3 PERSONE
Privata trio
105€
35€/persona
─
Lezione a tre persone.
─────────
✓ Stile a scelta
✓ ~60 minuti

Richiedi →
```

**CARD 4 — GRUPPO (4 persone):**
```
4 PERSONE
Privata di gruppo
120€
30€/persona
─
Piccolo gruppo personalizzato.
─────────
✓ Stile a scelta
✓ ~60 minuti
✓ Ideale per gruppi di amici, famiglie

Richiedi →
```

**CTA card private:** "Richiedi" (non "Acquista") — perché le private si concordano, non si comprano automaticamente.

**Note sotto le card private:**
```
[Inter 14px color #6b6b6b, centrato max-width 700px, padding 32px 0]

Le sessioni durano circa 60 minuti. Lo stile (Iyengar, Ashtanga, Flow) 
si concorda con l'insegnante.
```

#### 4.2.5 Sezione "Come funzionano gli abbonamenti"

```
[Background: #faf8f5, padding 96px 0]

[Container]

[Tag]: COME FUNZIONA

[Headline]: Trasparenza prima di tutto.

[Spacing 48px]

[Griglia 4 colonne desktop, 2x2 tablet, 1 mobile, gap 32px]

[Col 1]                       [Col 2]                       [Col 3]                       [Col 4]
[Icona linea]                 [Icona linea]                 [Icona linea]                 [Icona linea]

TUTTI GLI STILI,              NESSUN VINCOLO                SOSPENDIBILE                  WORKSHOP SEMPRE
UNA SOLA TARIFFA              ANNUALE                       IN QUALSIASI MOMENTO          SCONTATI

I tuoi 10, 20 lezioni         Nessun rinnovo                Hai un imprevisto?            I workshop mensili 
valgono per Iyengar,          automatico, nessuna           Sospendi il pacchetto         Deep Dive sono
Ashtanga e Flow. Cambi        penale di uscita.             fino a 30 giorni. Le          scontati per chi ha
quando vuoi.                  Decidi tu quando              lezioni rimanenti             un abbonamento attivo.
                              smettere.                     restano valide.
```

**Note:** queste 4 colonne rispondono alle 4 ANSIE PRINCIPALI prima dell'acquisto. Devono essere brevi, chiare, rassicuranti.

#### 4.2.6 FAQ Abbonamenti (accordion)

```
[Background: #f9f5f0, padding 96px 0]

[Container, max-width 900px]

[Headline]: Domande frequenti.

[Spacing 48px]

[6 accordion, chiusi di default]
```

**Le 6 domande:**

```
1. Posso provare prima di abbonarmi?
   Sì. La prima lezione è 10€, e non ti chiediamo nulla in 
   cambio. Se decidi di continuare, scegli il piano che fa per te.

2. Cosa succede se non finisco le lezioni in tempo?
   I pacchetti hanno una validità ampia (4-5 mesi). Se hai un 
   imprevisto serio (malattia, infortunio), possiamo sospendere 
   il pacchetto fino a 30 giorni — basta scriverci.

3. Posso passare da un pacchetto all'altro?
   Sì. Se compri un pacchetto 10 e ti accorgi di voler praticare 
   di più, ti calcoliamo la differenza per passare al pacchetto 
   da 20.

4. I workshop sono inclusi nell'abbonamento?
   Non sono inclusi automaticamente, ma chi ha un abbonamento 
   attivo li paga il 20% in meno.

5. Come pago?
   Carta o contanti in studio. Nessun rinnovo automatico, 
   nessun addebito sorpresa.

6. Posso regalare un pacchetto a qualcuno?
   Sì. Scrivici e ti prepariamo un voucher digitale o stampato.
```

**Specifiche accordion:**
- Domanda: New York serif 20px, color `#2a2a2a`, cursor pointer
- Padding: 24px 0
- Border-bottom: 1px `#e8e4df`
- Icona +/× a destra, color `#9c9a66`, ruota 180° al click
- Click espande → risposta Inter 15px color `#6b6b6b`, line-height 1.7
- Animazione: max-height transition 300ms ease-out

#### 4.2.7 Sezione WhatsApp fallback

```
[Background: #faf8f5, padding 96px 0]

[Centrato, max-width 700px]

[Headline]: Non sai quale piano fa per te?

[Sotto-headline]: 
Scrivici su WhatsApp. Ti aiutiamo a scegliere senza pressioni 
in meno di 10 minuti.

[Spacing 32px]

[CTA pulsante]: Scrivici su WhatsApp →
[Background #9c9a66, text white, link wa.me/393287675966 con messaggio:
"Ciao! Mi aiutate a scegliere il piano abbonamento giusto?"]

[Microcopy]: Risposta entro 1 ora · Nessun impegno
```

---

## 4.3 PAGINA `/orari`

### Funzione
Mostrare tutti gli slot disponibili, ridurre attrito nella scelta, convertire a prenotazione.

### Struttura

#### 4.3.1 Hero (35vh)

```
[Background: #f9f5f0, padding 96px 0]

[Centrato]

[Tag]: ORARI

[Headline]: 
Una pratica al giorno. Sette giorni su sette.

[Sotto-headline]: 
Iyengar, Ashtanga e Flow — ogni giorno della settimana, mattina 
e sera. Trova la lezione giusta per te.
```

#### 4.3.2 Filtri (sticky leggero)

```
[Centrato, sticky con top: 80px dopo scroll]

[Label]: Filtra per stile

[5 chip cliccabili centrate, gap 12px, wrap su mobile]
( Tutti )    ( Iyengar )    ( Ashtanga )    ( Flow )    ( Teen )
```

**Specifiche chip:** stesse di /corsi (chip pillola con stati).
**Default attivo:** "Tutti".
**Comportamento:** click su chip → eventi non corrispondenti opacity 0.15 (sbiadiscono ma rimangono visibili nello slot vuoto, così l'utente vede la "negazione" del filtro).

#### 4.3.3 Griglia settimanale

**Layout desktop (≥1024px):** Griglia 7 colonne (giorni) × N righe (fasce orarie). Max-width 1280px.

```
              LUN        MAR        MER        GIO        VEN        SAB        DOM
              ─────────────────────────────────────────────────────────────────────────
7:00          [Iyengar   .          .          .          [Ashtanga  .          .
              L2]                                          Mysore]
              
7:30          .          .          [Flow]     .          .          .          .

8:30          .          .          .          .          .          [Ashtanga  .
                                                                      Mysore]

8:45          [Iyengar   [Iyengar   [Iyengar   .          .          .          .
              L1]        Soft]      L1]

10:30         .          .          .          .          .          [Flow]     .

13:00         .          [Iyengar   .          [Iyengar   .          .          .
                          L3]                   L3]

16:30         .          .          [Teen      .          .          .          .
                                     Yoga]

17:30         .          [Ashtanga  .          [Ashtanga  .          .          [Flow]
                          Mysore]               Mysore]

18:00         [Iyengar   .          [Iyengar   .          .          .          .
              L2]                    L2]

19:00         .          [Ashtanga  .          [Ashtanga  .          .          .
                          Guidata]              Guidata]

19:30         [Iyengar   .          [Iyengar   .          .          .          .
              L2]                    L2]
```

**Anatomia cella lezione:**

```
┌─────────────────────┐
│ ▌ IYENGAR           │  ← Bordo sinistro 4px colore stile
│   Livello 2         │  ← Inter 12px regular
│   18:00             │  ← Inter 11px color #6b6b6b
└─────────────────────┘

Padding cella: 12px
Background: white
Border-left: 4px solid [colore stile]
Border-radius: 4px
Min-height: 60px
Hover: background #faf8f5, shadow leggera, cursor pointer
```

**Colori bordo cella:**
- Iyengar: `#9c9a66`
- Ashtanga: `#7a6b5f`
- Flow: `#b8a68e`
- Teen: `#d4b5a0`

**Click cella:** apre mini-modal centrato con backdrop blur.

#### 4.3.4 Mini-modal cella (al click)

```
[Backdrop: rgba(0,0,0,0.5) con blur(8px), full screen]
[Click sul backdrop → chiude modal]

[Modal centrato, max-width 480px, background white, 
border-radius 8px, padding 32px, box-shadow large]

[Close icon top-right (×), color #6b6b6b, click chiude]

[Stile grande, New York serif 28px, color stile della pratica]
IYENGAR

[Titolo lezione, Inter 17px medium]
Iyengar Yoga — Livello 2

[Dettagli, Inter 14px line-height 1.7]
Lunedì · 18:00
Insegnante: Glenda
Durata: circa 90 minuti, può variare in base alla classe
Capienza: 12 persone

[Divider 1px #e8e4df]

[Descrizione lezione, Inter 14px color #6b6b6b, 3-4 righe]
[Descrizione specifica del livello — vedi sezione 4.3.5 sotto]

[Divider]

[CTA primaria, button bg #9c9a66 text white, full-width, padding 14px]
Prenota questa lezione →
[Apre WhatsApp con messaggio: "Ciao! Vorrei prenotare la lezione di [tipo] di [giorno] alle [ora]."]

[CTA secondaria, testuale color #9c9a66, centered, margin-top 16px]
Scopri Iyengar →
[Link a /corsi/iyengar]
```

**Animazione apertura:** fade + slide-up 24px, 200ms ease-out.

#### 4.3.5 Layout mobile orari

Su mobile la griglia 7×N non funziona. Pattern alternativo:

```
[Tab orizzontali 7 giorni in alto, swipeable, sticky con top 60px]
[ Lun ] [ Mar ] [ Mer ] [ Gio ] [ Ven ] [ Sab ] [ Dom ]
[Tab attivo evidenziato (default: oggi)]

[Sotto: lista verticale lezioni del giorno selezionato]

MARTEDÌ

MATTINA
┌────────────────────────────────┐
│ ▌ IYENGAR · Soft                │
│   8:45                          │
└────────────────────────────────┘

POMERIGGIO
┌────────────────────────────────┐
│ ▌ IYENGAR · Livello 3           │
│   13:00                         │
└────────────────────────────────┘

[etc.]
```

Tap card → stessa modal del desktop.

#### 4.3.6 Sezione "I livelli e le varianti"

```
[Background: #faf8f5, padding 96px 0]

[Container]

[4 blocchi separati con headline media, padding 48px 0 ciascuno]
```

**BLOCCO 1 — IYENGAR**
```
[Headline]: Iyengar — Quattro livelli per quattro fasi della pratica.

[4 colonne desktop, 2x2 tablet, 1 mobile]

LIVELLO 1               LIVELLO 2               LIVELLO 3               SOFT
Base                    Intermedio              Avanzato                Ristorativo

Per chi inizia o        Per chi pratica         Per praticanti          Pratica delicata 
riprende dopo molto.    da almeno 6 mesi e      esperti. Asana          per chi cerca 
Posizioni in piedi,     conosce le posizioni    complesse, inversioni,  rigenerazione, ha
allineamenti, uso       di base. Lavoro più     pranayama, approfon-    limitazioni fisiche
di mattoncini e         profondo su preci-      dimenti.                o sta recuperando 
cinture.                sione e allungamento.                           da un infortunio.
```

**BLOCCO 2 — ASHTANGA**
```
[Headline]: Ashtanga — Due modi di praticare la stessa serie.

[2 colonne desktop, 1 mobile]

GUIDATA                                    MYSORE

L'insegnante chiama le posizioni e i       Tu conosci la sequenza a memoria e
passaggi con la voce. Tutto il gruppo      la pratichi da solo, al tuo ritmo.
pratica insieme, allo stesso ritmo.        L'insegnante passa tra gli allievi
                                           e ti aggiusta singolarmente.
Ideale per chi inizia, per chi vuole       
imparare la sequenza, o per chi cerca      Ideale per chi conosce già la 
una pratica condotta dal vivo.             pratica e vuole approfondire, o per
                                           chi cerca un'esperienza più 
                                           meditativa e personale.
```

**BLOCCO 3 — FLOW**
```
[Headline]: Flow — Una pratica diversa ogni volta.

[1 paragrafo, max-width 800px centrato]

Tutti i livelli, dal principiante al praticante esperto. 
Ogni lezione è un viaggio diverso: l'insegnante costruisce 
sequenze fluide, sempre nuove, dove movimento e respiro si 
fondono. Non serve essere flessibili. Serve voler smettere 
di pensare per un'ora.
```

**BLOCCO 4 — TEEN YOGA**
```
[Headline]: Teen Yoga — Per chi sta crescendo.

[1 paragrafo, max-width 800px centrato]

Pratica pensata per adolescenti (12–17 anni). Una via 
concreta per imparare a gestire stress, postura e 
concentrazione in una fase della vita dove il corpo e la 
mente cambiano in fretta. Lezione settimanale, gruppo 
dedicato, ambiente protetto.
```

#### 4.3.7 Sezione "Non trovi un orario adatto a te?"

```
[Background: #f9f5f0, padding 96px 0]

[Centrato, max-width 700px]

[Headline]: 
Non trovi un orario adatto a te?

[Sotto-headline]
Lavori in orari complicati, hai esigenze specifiche o cerchi 
un percorso più personale? Le lezioni private si organizzano 
nei giorni e orari che preferisci tu.

[Spacing 32px]

[CTA testuale]: Scopri le lezioni private →
[Link: /abbonamenti?tipo=private — toggle Private pre-selezionato]
```

#### 4.3.8 Sezione "Come prenotare" (3 step)

```
[Background: #faf8f5, padding 96px 0]

[Tag]: COME PRENOTARE

[Headline]: Come prenotare una lezione.

[Spacing 48px]

[Griglia 3 colonne desktop, 1 mobile, gap 48px]

[Col 1]                       [Col 2]                       [Col 3]
[Icona linea]                 [Icona linea]                 [Icona linea]
01                            02                            03
SCEGLI IL GIORNO              RICEVERAI CONFERMA            VIENI IN STUDIO
E L'ORARIO

Clicca sulla lezione           Ti contattiamo per            Tappetino e attrezzi
che ti interessa o             confermare disponibilità      forniti. Vieni con
scrivici su WhatsApp.          e darti tutte le info         abiti comodi, 15
È gratis e veloce.             pratiche.                     minuti prima della
                                                              lezione.
```

#### 4.3.9 CTA finale

```
[Background: #9c9a66, text white, padding 96px 0]

[Centrato]

[Headline]: 
Hai trovato la tua lezione?

[CTA grande]: Prenota la prima lezione →
[Background white, text #9c9a66]

[CTA secondaria testuale]: Hai dubbi? Scrivici su WhatsApp →
```

### 4.3.10 ORARI COMPLETI (dati per griglia)

```javascript
// Database lezioni — usare per popolare la griglia
const lezioni = [
  // LUNEDÌ
  { giorno: 'lun', ora: '7:00', stile: 'iyengar', tipo: 'Livello 2', insegnante: 'Glenda', durata: '~90 min' },
  { giorno: 'lun', ora: '8:45', stile: 'iyengar', tipo: 'Livello 1', insegnante: 'Glenda', durata: '~90 min' },
  { giorno: 'lun', ora: '18:00', stile: 'iyengar', tipo: 'Livello 2', insegnante: 'Glenda', durata: '~90 min' },
  { giorno: 'lun', ora: '19:30', stile: 'iyengar', tipo: 'Livello 2', insegnante: 'Glenda', durata: '~90 min' },
  
  // MARTEDÌ
  { giorno: 'mar', ora: '8:45', stile: 'iyengar', tipo: 'Soft', insegnante: 'Glenda', durata: '~90 min' },
  { giorno: 'mar', ora: '13:00', stile: 'iyengar', tipo: 'Livello 3', insegnante: 'Glenda', durata: '~90 min' },
  { giorno: 'mar', ora: '17:30', stile: 'ashtanga', tipo: 'Mysore', insegnante: 'Victor', durata: '60-90 min' },
  { giorno: 'mar', ora: '19:00', stile: 'ashtanga', tipo: 'Guidata', insegnante: 'Victor', durata: '~90 min' },
  
  // MERCOLEDÌ
  { giorno: 'mer', ora: '7:30', stile: 'flow', tipo: 'Flow', insegnante: 'Giulia', durata: '~60 min' },
  { giorno: 'mer', ora: '8:45', stile: 'iyengar', tipo: 'Livello 1', insegnante: 'Glenda', durata: '~90 min' },
  { giorno: 'mer', ora: '16:30', stile: 'teen', tipo: 'Teen Yoga', insegnante: '[Teen]', durata: '~60 min' },
  { giorno: 'mer', ora: '18:00', stile: 'iyengar', tipo: 'Livello 2', insegnante: 'Glenda', durata: '~90 min' },
  { giorno: 'mer', ora: '19:30', stile: 'iyengar', tipo: 'Livello 2', insegnante: 'Glenda', durata: '~90 min' },
  
  // GIOVEDÌ
  { giorno: 'gio', ora: '13:00', stile: 'iyengar', tipo: 'Livello 3', insegnante: 'Glenda', durata: '~90 min' },
  { giorno: 'gio', ora: '17:30', stile: 'ashtanga', tipo: 'Mysore', insegnante: 'Victor', durata: '60-90 min' },
  { giorno: 'gio', ora: '19:00', stile: 'ashtanga', tipo: 'Guidata', insegnante: 'Victor', durata: '~90 min' },
  
  // VENERDÌ
  { giorno: 'ven', ora: '7:00', stile: 'ashtanga', tipo: 'Mysore', insegnante: 'Victor', durata: '60-90 min' },
  
  // SABATO
  { giorno: 'sab', ora: '8:30', stile: 'ashtanga', tipo: 'Mysore', insegnante: 'Victor', durata: '60-90 min' },
  { giorno: 'sab', ora: '10:30', stile: 'flow', tipo: 'Flow', insegnante: 'Giulia', durata: '~60 min' },
  
  // DOMENICA
  { giorno: 'dom', ora: '17:30', stile: 'flow', tipo: 'Flow', insegnante: 'Giulia', durata: '~60 min' },
];
```

**Riepilogo per stile (per debug):**
- Iyengar: 8 lezioni/settimana (L1×2, L2×5, L3×2, Soft×1) — sì, 10 totali ricontrolla
- Ashtanga: 6 lezioni/settimana (Mysore×4, Guidata×2)
- Flow: 3 lezioni/settimana
- Teen: 1 lezione/settimana
- **Totale: 18 lezioni/settimana**

**Verifica conteggio Iyengar:**
- L1: lun 8:45, mer 8:45 → 2
- L2: lun 7:00, lun 18:00, lun 19:30, mer 18:00, mer 19:30 → 5
- L3: mar 13:00, gio 13:00 → 2
- Soft: mar 8:45 → 1
- **Totale Iyengar: 10 lezioni**

Quindi totale generale: 10 + 6 + 3 + 1 = **20 lezioni/settimana**.
## 4.4 PAGINA `/corsi/iyengar`

### Identità visiva specifica
- Palette dominante: `#9c9a66` (ocra Iyengar)
- Background base: `#f9f5f0` alternato `#faf8f5`
- Mood foto: dettagli precisi (mani, allineamenti, mattoncini, posture in costruzione)

### Struttura completa

#### 4.4.1 Hero (90vh)

```
[Background: foto/video silenzioso loop — dettaglio Iyengar 
in studio, mani che sistemano allineamento, mattoncini visibili]

[Overlay scuro: rgba(0,0,0,0.35)]

[Allineato sinistra, max-width 800px, padding sinistro 64px desktop / 24px mobile]
[Verticalmente centrato]

[Tag uppercase white, Inter 12px letter-spacing 0.1em]
IYENGAR YOGA

[Spacing 16px]

[Headline grande, New York serif 64px desktop / 44px mobile, white]
Per il corpo che ha 
bisogno di precisione.

[Spacing 24px]

[Sotto-headline white, Inter 18px line-height 1.5]
Una pratica tradizionale che risolve dolori reali — 
schiena, spalle, ginocchia — con tecniche precise e 
insegnanti formati in anni di studio.

[Spacing 32px]

[2 CTA in fila]
[Primaria, button white text #9c9a66, padding 14px 32px]: Prenota la prima lezione →
[Secondaria, testuale white, underline on hover]: Vedi gli orari →
[Link primario: WhatsApp con messaggio "Ciao! Vorrei prenotare una prima lezione di Iyengar."]
[Link secondario: /orari?stile=iyengar]
```

**Note:** mobile, hero diventa 80vh, video sostituito da foto statica per performance.

#### 4.4.2 Frase manifesto

```
[Background: #f9f5f0, padding 160px 0]

[Centrato, max-width 900px, padding laterale 64px]

[Testo grande, New York serif italic, 38px desktop / 28px mobile, 
line-height 1.4, color #2a2a2a]

"Lo Iyengar non è yoga da social. 
È la pratica per chi vuole risolvere dolori 
reali con tecniche tradizionali e 
insegnanti formati in anni di studio."
```

#### 4.4.3 A chi è dedicato (3 colonne)

```
[Background: #faf8f5, padding 96px 0]

[Container]

[Tag]: A CHI È DEDICATO
[Headline]: Iyengar è per te se...

[Spacing 64px]

[Griglia 3 colonne desktop, 1 mobile, gap 48px]

[Col 1]                          [Col 2]                          [Col 3]
[Icona linea 48px, color #9c9a66] (es: corpo con freccia)
[Inter 14px uppercase, letter-spacing 0.08em]

HAI DOLORI FISICI                AFFIANCHI UN ALTRO SPORT         VUOI PREVENIRE
CRONICI                                                            INFORTUNI

[Inter 15px line-height 1.7]
Schiena, spalle,                 Iyengar lavora dove gli          Rinforzi profondi,
ginocchia, cervicale.            sport comuni non arrivano:       mobilità articolare,
Iyengar lavora sulla             precisione negli                 postura corretta.
causa, non sul sintomo,          allineamenti, equilibrio,        Una base solida che 
con applicazioni                 consapevolezza del corpo.        rende ogni movimento 
terapeutiche reali.                                                più sicuro.
```

#### 4.4.4 Timeline benefici

```
[Background: #f9f5f0, padding 128px 0]

[Container]

[Tag]: COSA OTTERRAI

[Headline]: 
Una pratica che cambia il corpo nel tempo.

[Sotto-headline, max-width 700px]: 
Non promesse. Tappe concrete che vediamo nei nostri allievi 
da anni.

[Spacing 80px]

[Timeline orizzontale desktop, verticale mobile]

  ●─────────────────●─────────────────●
  
  DOPO 1 MESE         DOPO 3 MESI         DOPO 1 ANNO
  
  Meno tensioni       Dolori ridotti      Più flessibile,
  muscolari.          o spariti.          più forte, più 
                                          lucido.
  Più consapevolezza  Postura cambiata    Cambia il modo in
  del corpo nei       in modo visibile.   cui vivi il corpo
  gesti quotidiani.   Notano la           ogni giorno.
                       differenza anche 
                       gli altri.
```

**Specifiche timeline:**
- Linea connettiva: 2px `#9c9a66`
- Punti: 14px diametro, fill `#9c9a66`
- Posizione punti: equidistanti
- Headline step: New York serif 22px medium, color #2a2a2a
- Body step: Inter 15px line-height 1.6, color #6b6b6b
- Mobile: timeline verticale con linea sinistra che collega i punti

#### 4.4.5 I 4 livelli (tab interattivo)

```
[Background: #faf8f5, padding 128px 0]

[Container]

[Tag]: I LIVELLI

[Headline]: Quattro livelli. Quattro fasi della pratica.

[Sotto-headline]: 
Iyengar non è uno stile unico — è un percorso. Ogni livello è 
pensato per una fase specifica.

[Spacing 64px]

[Tab navigation centrata, gap 8px, wrap su mobile]
[ Livello 1 (Base) ]  [ Livello 2 (Intermedio) ]  [ Livello 3 (Avanzato) ]  [ Soft (Ristorativo) ]

[Default tab attivo: LIVELLO 1]

[Pannello dettaglio sotto tab, transizione fade 200ms al cambio]
```

**Specifiche tab:**
- Tab attivo: background `#9c9a66`, text white, weight 500
- Tab inattivo: text `#6b6b6b`, background transparent, hover `#faf8f5`
- Padding tab: 12px 24px
- Border-radius: 4px
- Mobile: tab si trasforma in select dropdown OPPURE accordion (1 alla volta aperto). Soluzione preferita: scroll orizzontale dei tab con `overflow-x: auto`.

**ORDINE TAB (importante):**
1. Livello 1 (Base) — DEFAULT APERTO
2. Livello 2 (Intermedio)
3. Livello 3 (Avanzato)
4. Soft (Ristorativo)

**TAB 1 — LIVELLO 1 (Base) [DEFAULT]**

```
[Layout 2 colonne, 40/60 desktop, stack mobile, gap 48px]

COL SINISTRA (40%):

[Headline livello, New York 36px]
LIVELLO 1
Base

[Body Inter 15px line-height 1.7]
Per chi inizia o riprende dopo molto.

[Spacing 24px]

[Sezione Adatto a, label uppercase 12px]
ADATTO A:
• Principianti assoluti
• Chi non pratica da molto tempo
• Chi vuole costruire fondamenta solide
• Chi ha dolori cronici e cerca un approccio strutturato

[Spacing 24px]

[Sezione Cosa succede, label uppercase 12px]
COSA SUCCEDE IN LEZIONE:
Posizioni in piedi (Tadasana, Trikonasana, Virabhadrasana), 
allineamenti precisi, introduzione all'uso di mattoncini e 
cinture. L'insegnante spiega il perché di ogni posizione.

[Spacing 32px]

[Mini-info, Inter 14px color #6b6b6b]
Durata: ~90 min
Frequenza consigliata: 1-2x/sett
Quando: Lunedì 8:45 · Mercoledì 8:45

[Spacing 24px]

[CTA testuale, color #9c9a66]: Prenota una L1 →
[Link: WhatsApp "Ciao! Vorrei prenotare una lezione di Iyengar Livello 1."]

COL DESTRA (60%):
[Foto verticale 4:5 — pratica L1, posizione in piedi, mattoncini visibili]
```

**TAB 2 — LIVELLO 2 (Intermedio)**

```
LIVELLO 2
Intermedio

Per chi pratica da almeno 6 mesi e conosce le posizioni di base.

ADATTO A:
• Chi ha completato almeno 6 mesi di L1
• Chi conosce la nomenclatura sanscrita base
• Chi è pronto a lavorare su precisione e allungamenti più profondi
• Chi vuole approfondire le inversioni più semplici 
  (Salamba Sarvangasana, Halasana)

COSA SUCCEDE IN LEZIONE:
Posizioni di equilibrio, primi piegamenti indietro, lavoro più 
profondo sulla rotazione e l'apertura del torace. Sequenze 
costruite, non improvvisate.

[Mini-info]
Durata: ~90 min
Frequenza consigliata: 2x/sett
Quando: Lunedì 7:00, 18:00, 19:30 · Mercoledì 18:00, 19:30

[CTA]: Prenota una L2 →
[Link WhatsApp specifico]
```

**TAB 3 — LIVELLO 3 (Avanzato)**

```
LIVELLO 3
Avanzato

Per praticanti esperti.

ADATTO A:
• Chi pratica costantemente da almeno 2 anni
• Chi ha familiarità con tutte le inversioni
• Chi vuole approfondire pranayama e asana complesse
• Chi cerca un approccio quasi terapeutico e personalizzato

COSA SUCCEDE IN LEZIONE:
Asana avanzate, inversioni complete, pranayama (tecniche di 
respirazione), approfondimenti su filosofia e metodo. Lezione 
più meditativa, ritmo lento.

⚠️ Riservato a chi pratica da almeno 2 anni. Se hai dubbi sul 
tuo livello, scrivici prima.
[Note "warning" formattata con icona attenzione, color #c95a4a]

[Mini-info]
Durata: ~90 min
Frequenza consigliata: 2x/sett
Quando: Martedì 13:00 · Giovedì 13:00

[CTA]: Prenota una L3 →
```

**TAB 4 — SOFT (Ristorativo)**

```
IYENGAR SOFT
Ristorativo

Per chi cerca rigenerazione, recupero o pratica delicata.

ADATTO A:
• Chi ha più di 65 anni
• Chi sta recuperando da un infortunio
• Chi ha limitazioni fisiche specifiche
• Chi è alla prima esperienza con lo yoga e teme l'impegno fisico

COSA SUCCEDE IN LEZIONE:
Posizioni mantenute a lungo, con uso intenso di supporti 
(coperte, mattoncini, cinture). Pratica passiva, recupero del 
sistema nervoso, rilascio profondo delle tensioni.

[Mini-info]
Durata: ~90 min
Frequenza consigliata: 1x/sett
Quando: Martedì 8:45

[CTA]: Prenota una Soft →
```

#### 4.4.6 Insegnanti che tengono Iyengar

```
[Background: #f9f5f0, padding 96px 0]

[Container]

[Tag]: GLI INSEGNANTI

[Headline]: Le persone che ti guideranno.

[Sotto-headline]: 
Insegnanti certificati, formati in anni di studio. Quando trovi 
il tuo maestro, sai dove ritrovarlo.

[Spacing 64px]

[Griglia micro-card insegnanti]
```

**Per Iyengar mostriamo gli insegnanti che insegnano Iyengar.**

In base ai dati attuali: **solo Glenda** insegna Iyengar.

**Layout:** una sola card, centrata con max-width 360px (oppure se preferisci, layout asimmetrico testo + card). Quando ci saranno più insegnanti Iyengar, diventano griglia.

**Anatomia micro-card insegnante:**

```
┌──────────────────────────┐
│                          │
│   [Foto verticale 3:4]   │  ← Foto reale o placeholder
│   ~360px altezza         │
│                          │
├──────────────────────────┤
│  Padding 24px            │
│                          │
│  Glenda                  │  ← New York 24px
│                          │
│  IYENGAR · ASHTANGA      │  ← Tag 11px uppercase color #9c9a66
│                          │
│  Insegna Iyengar dal     │  ← Inter 13px color #6b6b6b
│  [PLACEHOLDER anno]      │
│                          │
│  "[PLACEHOLDER -          │  ← Italic 14px, max 2-3 righe
│  citazione Glenda]"      │
│                          │
│  Scopri Glenda →         │
│                          │
└──────────────────────────┘

Cliccabilità: tutta la card → /insegnanti/glenda

Hover state:
- Foto zoom 1.03
- Card lift 4px, shadow #shadow-md
- Cursor pointer
```

#### 4.4.7 Come si svolge una lezione (4 step)

```
[Background: #faf8f5, padding 96px 0]

[Container]

[Tag]: LA TUA PRIMA VOLTA

[Headline]: Cosa aspettarti in studio.

[Sotto-headline]: 
Perché iniziare a praticare non deve essere fonte di stress.

[Spacing 64px]

[Griglia 4 colonne desktop, 2x2 tablet, 1 mobile, gap 32px]

[Col 1]               [Col 2]                [Col 3]                [Col 4]
01                    02                     03                     04
[New York serif 48px desktop / 32px mobile, color #9c9a66]

ARRIVI 15 MIN         TI ACCOGLIAMO          PRATICA GUIDATA        RILASSAMENTO 
PRIMA                                                                FINALE

Ti diamo tempo        Parliamo del tuo       L'insegnante guida     Ogni lezione 
per cambiarti,        livello, di            ogni passaggio.        finisce con 
conoscere lo          eventuali dolori       Non sei mai solo:      Savasana — 
studio e i            o limitazioni.         se non sai una         rilassamento 
compagni di           Adattiamo la           posizione, te la       profondo sul 
pratica.              pratica a te.          mostriamo.             tappetino. Esci 
                                                                     sereno e 
                                                                     ricaricato.
```

#### 4.4.8 Cosa portare / cosa è incluso

```
[Background: #f9f5f0, padding 96px 0]

[Container, max-width 900px]

[Headline media centrato]: Vieni leggero.

[Spacing 48px]

[Layout 2 colonne 50/50, gap 64px]

COL SINISTRA:                          COL DESTRA:
[Inter 14px uppercase]                 [Inter 14px uppercase]
NON SERVE PORTARE:                     È TUTTO IN STUDIO:

[Inter 16px]
✗ Tappetino                            ✓ Tappetini di qualità
✗ Mattoncini, cinture                  ✓ Mattoncini, cinture
✗ Coperte                              ✓ Coperte, sedie
✗ Vestiti firmati                      ✓ Spogliatoio
                                        ✓ Acqua

[Spacing 32px, sotto le colonne, centrato]

[Microcopy 14px color #6b6b6b]
Vieni con abiti comodi (leggings, t-shirt). 
A piedi nudi, ovviamente.
```

#### 4.4.9 FAQ specifiche Iyengar (accordion)

```
[Background: #faf8f5, padding 96px 0]

[Container, max-width 900px]

[Headline]: Domande frequenti.

[Spacing 48px]

[6 accordion, chiusi di default]
```

**Le 6 domande:**

```
1. Posso fare Iyengar se ho un'ernia/scoliosi/problema specifico?
   La maggior parte dei nostri allievi viene proprio per questo. 
   Iyengar nasce con applicazioni terapeutiche reali. Prima della 
   lezione, parla con l'insegnante delle tue condizioni — adatterà 
   la pratica a te.

2. Funziona davvero per il mal di schiena?
   Sì, ma serve costanza. La maggior parte dei nostri allievi nota 
   miglioramenti nelle prime 4-6 settimane di pratica regolare 
   (1-2 volte a settimana). Non è una soluzione miracolosa: è una 
   pratica che lavora sulla causa.

3. Devo essere flessibile per iniziare?
   No. La flessibilità è il risultato della pratica, non il 
   prerequisito. I nostri allievi più rigidi diventano i più 
   consapevoli del loro corpo nei primi mesi.

4. Quanto tempo prima vedo risultati?
   Sulle tensioni quotidiane: 2-3 settimane. Sui dolori cronici: 
   2-3 mesi di pratica regolare. Sulla flessibilità reale: 6 mesi 
   in su.

5. Come capisco il mio livello?
   Se sei alla prima volta o non pratichi da anni → Livello 1 (Base) 
   o Soft. Se conosci le posizioni base → Livello 2. Se hai dubbi, 
   scrivici e ti aiutiamo a scegliere.

6. Posso fare Iyengar e altri sport contemporaneamente?
   Assolutamente. Iyengar è il complemento perfetto per chi corre, 
   pedala, fa Crossfit o tennis. Lavora sugli equilibri muscolari 
   che gli sport ad alta intensità non toccano.
```

#### 4.4.10 Testimonianza

```
[Background: #f9f5f0, padding 128px 0]

[Centrato, max-width 800px]

[Citazione grande, New York serif italic 32-38px line-height 1.4]

"[PLACEHOLDER — testimonianza reale.
Esempio:]
Avevo dolori cervicali da tre anni. Avevo provato fisioterapia, 
osteopatia, integratori. Dopo due mesi di Iyengar sono spariti. 
Ma quello che mi tiene qui non è solo questo — è sentirmi 
finalmente a casa nel mio corpo."

[Spacing 32px]

[Foto cerchio 80px + nome]
[Foto reale con consenso]
Marco, 47 anni
Pratica Iyengar dal 2024
```

⚠️ **PLACEHOLDER:** sostituire con testimonianza reale + foto + consenso firmato.

#### 4.4.11 Orari Iyengar (mini-vista)

```
[Background: #faf8f5, padding 96px 0]

[Container, max-width 1100px]

[Tag]: ORARI

[Headline]: Quando praticare Iyengar.

[Spacing 48px]

[Mini-griglia condensata, 4 colonne desktop, 2x2 tablet, 1 mobile]

LIVELLO 1 (BASE)              LIVELLO 2 (INTERMEDIO)        LIVELLO 3 (AVANZATO)         SOFT

Lun 8:45                       Lun 7:00                      Mar 13:00                     Mar 8:45
Mer 8:45                       Lun 18:00                     Gio 13:00
                               Lun 19:30
                               Mer 18:00
                               Mer 19:30

[Spacing 32px, centrato]

[CTA testuale]: Vedi tutti gli orari →
[Link: /orari]

[Microcopy]: Lezione di prova a 10€ — porta da cui iniziare.
```

#### 4.4.12 Esplora le altre pratiche

```
[Background: #f9f5f0, padding 96px 0]

[Container]

[Headline media]: Esplora le altre pratiche.

[Spacing 48px]

[Griglia 2 colonne desktop, 1 mobile, gap 24px]
[2 mini-card simili a quelle di /corsi ma più compatte, con foto + tag + headline + CTA]

CARD 1 — ASHTANGA
[Foto piccola 16:9]
ASHTANGA
"Per chi cerca un posto a cui tornare ogni giorno."
Scopri →
[Link /corsi/ashtanga]

CARD 2 — FLOW
[Foto piccola 16:9]
FLOW
"Un'ora in cui smetti di pensare."
Scopri →
[Link /corsi/flow]
```

**Note:** non si include Teen Yoga (target diverso).

#### 4.4.13 CTA finale

```
[Background: #9c9a66, text white, padding 128px 0]

[Centrato, max-width 700px]

[Headline grande]: Inizia da una sola lezione.

[Sotto-headline]
Prima lezione di prova a 10€. Senza abbonamenti, senza fretta.

[Spacing 32px]

[CTA grande, button bg white text #9c9a66]: Prenota la prima Iyengar →
[Link WhatsApp specifico]

[Microcopy white opacity 0.85]: 
Risposta entro 1 ora · Cancellabile fino a 24h prima
```
## 4.5 PAGINA `/corsi/ashtanga`

### Identità visiva specifica
- Palette dominante: `#7a6b5f` (marrone Ashtanga)
- Background base: `#f9f5f0` alternato `#faf8f5`
- Mood foto: disciplina, ritmo, intensità (foto di pratica intensa, sudore vero, sguardi concentrati)

### Struttura

#### 4.5.1 Hero (90vh)

```
[Background: foto/video Ashtanga in pratica, atmosferico]
[Overlay: rgba(0,0,0,0.4) — leggermente più scuro per intensità]

[Allineato sinistra, max-width 800px]

[Tag white]: ASHTANGA YOGA

[Headline white, New York serif 64px desktop / 44px mobile]
Per chi cerca un posto 
a cui tornare ogni giorno.

[Sotto-headline white]
Una pratica antica che restituisce silenzio interiore, 
crescita fisica e mentale. Non si pratica per provare — 
si pratica per esserci.

[2 CTA]
[Primaria white text #7a6b5f]: Prenota la prima lezione →
[Secondaria testuale white]: Vedi gli orari →
```

**Note:** la CTA primaria su Ashtanga usa il colore brand #9c9a66 NON #7a6b5f (il marrone è per accenti, non per pulsanti — sarebbe troppo cupo). Mantieni coerenza CTA con colore primario in tutto il sito.

#### 4.5.2 Frase manifesto

```
[Background: #f9f5f0, padding 160px 0]

[Centrato, max-width 900px]

[Testo grande, New York serif italic, 38px / 28px mobile]

"Una pratica antica per chi cerca 
un posto a cui tornare ogni giorno."
```

#### 4.5.3 A chi è dedicato (3 colonne)

```
[Background: #faf8f5, padding 96px 0]

[Tag]: A CHI È DEDICATO
[Headline]: Ashtanga è per te se...

[Griglia 3 colonne, gap 48px]

CERCHI DISCIPLINA                  VUOI UNA PRATICA CON              CERCHI UNA COMUNITÀ
E COSTANZA                         PROGRESSIONE CHIARA               

L'Ashtanga è una                   Una sequenza fissa, una           La tribù della pratica
pratica che si                     serie di asana che si             del mattino, gli stessi
costruisce ogni giorno.            imparano e si                     volti che si ritrovano,
Non c'è "ho fatto la               approfondiscono nel               un senso di appartenenza
mia lezione" — c'è                 tempo. Sai sempre dove            che non si trova
"sono qui ancora una               stai andando.                     altrove.
volta".
```

#### 4.5.4 Timeline benefici

```
[Background: #f9f5f0, padding 128px 0]

[Tag]: COSA OTTERRAI
[Headline]: Cosa cambia se pratichi davvero.

[Timeline 3 step]

DOPO 1 MESE         DOPO 3 MESI         DOPO 1 ANNO

Più presente nel    Forza e             Cambia il rapporto
corpo. Il respiro   resistenza          con la disciplina e
inizia a guidare    visibilmente        con te stesso. Non
il movimento, non   trasformate.        è più "andare a
viceversa.          Dormi meglio,       yoga", è la tua
                    senti meno          base quotidiana.
                    stress fisico,
                    la pratica diventa
                    un'abitudine.
```

#### 4.5.5 I 2 stili (tab Guidata + Mysore)

```
[Background: #faf8f5, padding 128px 0]

[Tag]: I DUE STILI
[Headline]: Due modi di praticare la stessa serie.

[Sotto-headline]: 
L'Ashtanga si insegna in due forme diverse — ognuna ha il suo 
valore, e si possono alternare.

[Tab navigation centrata, default: Guidata]
[ Guidata ]  [ Mysore ]
```

**TAB 1 — GUIDATA [DEFAULT]**

```
[Layout 2 colonne 40/60 desktop, stack mobile]

COL SINISTRA:

ASHTANGA GUIDATA

L'insegnante chiama le posizioni e i passaggi con la voce. 
Tutto il gruppo pratica insieme, allo stesso ritmo.

ADATTO A:
• Chi inizia con l'Ashtanga
• Chi vuole imparare la sequenza
• Chi cerca una pratica condotta dal vivo
• Chi pratica saltuariamente e ha bisogno di una guida vocale

COSA SUCCEDE IN LEZIONE:
Si segue la prima serie (Yoga Chikitsa) o parti di essa, sotto 
la guida dell'insegnante. Il ritmo è dato dal respiro contato in 
sanscrito (vinyasa). Non c'è improvvisazione: la sequenza è la 
stessa, sempre.

[Mini-info]
Durata: ~90 min
Frequenza consigliata: 1-2x/sett
Quando: Martedì 19:00 · Giovedì 19:00

[CTA]: Prenota una Guidata →
[WhatsApp: "Ciao! Vorrei prenotare una lezione di Ashtanga Guidata."]

COL DESTRA:
[Foto verticale 4:5 — gruppo che pratica insieme, sincrono]
```

**TAB 2 — MYSORE**

```
ASHTANGA MYSORE

Tu conosci la sequenza a memoria e la pratichi da solo, al tuo 
ritmo. L'insegnante passa tra gli allievi e ti aggiusta 
singolarmente.

ADATTO A:
• Chi conosce già la pratica e vuole approfondire
• Chi cerca un'esperienza più meditativa e personale
• Chi vuole sviluppare autonomia nella propria pratica
• Chi pratica regolarmente (idealmente 4-6 volte a settimana)

COSA SUCCEDE IN LEZIONE:
Arrivi quando vuoi nell'arco di un orario stabilito, srotoli il 
tappetino, inizi la tua pratica. Non c'è musica, non c'è 
istruzione vocale collettiva. L'insegnante ti osserva, ti 
corregge, ti aiuta nelle posizioni nuove.

⚠️ Per chi è alla prima esperienza con l'Ashtanga, consigliamo 
di iniziare con la Guidata per imparare la sequenza, poi passare 
al Mysore.
[Note warning, color #c95a4a]

[Mini-info]
Durata: 60-90 min (al tuo ritmo)
Frequenza consigliata: 4-6x/sett
Quando: Martedì 17:30 · Giovedì 17:30 · Venerdì 7:00 · Sabato 8:30

[CTA]: Prenota una Mysore →
```

#### 4.5.6 Insegnanti che tengono Ashtanga

```
[Background: #f9f5f0, padding 96px 0]

[Tag]: GLI INSEGNANTI
[Headline]: Le persone che ti guideranno.

[Griglia micro-card insegnanti — 2 card]
```

**Per Ashtanga mostriamo:**
- Glenda (Iyengar + Ashtanga)
- Victor (Ashtanga)

**Layout:** 2 card affiancate desktop, 1 mobile.

#### 4.5.7 Come si svolge una lezione (4 step)

```
01                    02                     03                     04
ARRIVI 15 MIN         TI ACCOGLIAMO          PRATICA INTENSA        RILASSAMENTO
PRIMA                                                                FINALE

Ti diamo tempo        Parliamo del tuo       Sequenza completa      Savasana, 
per cambiarti,        livello, della tua     guidata dal respiro.   rilassamento
prepararti, sentire   familiarità con la     Ritmo costante,        profondo, chiusura
lo studio.            sequenza. Ti           movimenti che          della pratica.
                      diciamo cosa           si concatenano.
                      aspettarti.
```

#### 4.5.8 Cosa portare / cosa è incluso

Stesso pattern di Iyengar. Aggiungere nota:

```
[Microcopy aggiuntiva sotto le 2 colonne]
Se pratichi Ashtanga regolarmente, ti consigliamo di portare 
il tuo tappetino — molti praticanti preferiscono un tappetino 
personale per la Mysore.
```

#### 4.5.9 FAQ Ashtanga

**6 domande:**

```
1. Devo conoscere la sequenza per iniziare?
   No. Si inizia dalla Guidata, dove l'insegnante chiama ogni 
   posizione. Imparerai la sequenza naturalmente, lezione dopo 
   lezione. La Mysore arriva dopo, quando sai già muoverti da solo.

2. Quanto è impegnativo fisicamente?
   È una pratica intensa, con flussi continui e posizioni 
   impegnative. Ma si entra gradualmente: nessuno fa la prima serie 
   completa al primo giorno. Si parte da una versione ridotta e si 
   cresce nel tempo.

3. Cos'è la Mysore? Posso iniziare da lì?
   La Mysore è la pratica autonoma — conosci la sequenza, la fai 
   al tuo ritmo, l'insegnante ti aggiusta. Sconsigliamo di 
   iniziare dalla Mysore: prima impari con la Guidata.

4. Ashtanga fa per chi ha più di 50 anni?
   Sì, ma con adattamenti. L'Ashtanga si modula in base alla 
   persona — la sequenza è la stessa, ma le varianti permettono 
   di praticare a qualsiasi età, se non hai limitazioni mediche 
   importanti.

5. Devo essere flessibile?
   No. La flessibilità arriva con la pratica. Ciò che serve è 
   costanza, respiro lungo, e voglia di tornare ogni giorno.

6. Ashtanga è uno sport o una pratica spirituale?
   Entrambe le cose. La parte fisica è chiarissima — una pratica 
   intensa, sudore vero, forza che cresce. Ma c'è anche una 
   dimensione meditativa, di silenzio interiore. Decidi tu quanto 
   approfondire.
```

#### 4.5.10 Testimonianza

PLACEHOLDER, struttura uguale a Iyengar.

#### 4.5.11 Orari Ashtanga (mini-vista)

```
[Mini-griglia 2 colonne]

GUIDATA                        MYSORE

Mar 19:00                      Mar 17:30
Gio 19:00                      Gio 17:30
                               Ven 7:00
                               Sab 8:30
```

#### 4.5.12 Esplora le altre pratiche

Mini-card Iyengar + Flow.

#### 4.5.13 CTA finale

Stessa struttura, microcopy adattata.

---

## 4.6 PAGINA `/corsi/flow`

### Identità visiva
- Palette dominante: `#b8a68e` (salvia-sabbia Flow)
- Background: `#f9f5f0` alternato `#faf8f5`
- Mood foto: fluidità, movimento, leggerezza, luce naturale

### Struttura

#### 4.6.1 Hero (90vh)

```
[Background: foto/video Flow — movimento fluido, luce naturale]
[Overlay: rgba(0,0,0,0.3) — più leggero per dare luce]

[Tag]: FLOW YOGA

[Headline]
Un'ora in cui smetti 
di pensare.

[Sotto-headline]
Pratica fresca, sempre diversa. Per chi vuole muoversi, 
respirare, lasciare fuori il resto.

[2 CTA]: Prenota la prima · Vedi gli orari
```

#### 4.6.2 Frase manifesto

```
[Background: #f9f5f0, padding 160px 0]
[Centrato, max-width 900px]

[Testo grande italic]
"Un'ora in cui smetti di pensare."
```

#### 4.6.3 A chi è dedicato (3 colonne)

```
[Tag]: A CHI È DEDICATO
[Headline]: Flow è per te se...

[3 colonne]

VUOI MUOVERTI                 PRATICHI GIÀ UN ALTRO        SEI ALLA PRIMA
SENZA PENSARE                 STILE E CERCHI VARIETÀ       ESPERIENZA CON LO YOGA

Una pratica che               Iyengar e Ashtanga sono      Flow è la pratica più
ti porta nel                  pratiche strutturate. Il     accessibile per iniziare.
presente. Niente              Flow ti dà una boccata       Nessuna sequenza fissa
sequenze rigide,              d'aria diversa, ogni         da imparare, nessuna
nessun pensiero               volta una sorpresa.          tecnica complicata. Solo
sulla forma —                                              respiro e movimento.
solo movimento
e respiro.
```

#### 4.6.4 Timeline benefici (versione Flow)

```
[Tag]: COSA OTTERRAI
[Headline]: Cosa porti via dal Flow.

[Timeline 3 step, tappe diverse rispetto a Iyengar/Ashtanga]

DOPO 1 LEZIONE      DOPO 1 MESE         DOPO 6 MESI

Sensazione di       Maggior             Rapporto trasformato
leggerezza,         consapevolezza      con il proprio corpo
mente svuotata,     del respiro nei     in movimento. Non è
corpo aperto.       momenti di          più "fare yoga", è
È il "reset"        stress quotidiano.  sentirsi vivi.
della giornata.     Inizi ad usare lo
                    yoga come strumento
                    di gestione.
```

#### 4.6.5 SEZIONE LIVELLI — ASSENTE

**Decisione esplicita:** Flow non ha sottolivelli. Questa sezione NON esiste nella pagina. Si passa direttamente alla sezione insegnanti.

#### 4.6.6 Insegnanti che tengono Flow

```
[Tag]: GLI INSEGNANTI

[1 micro-card — Giulia (Flow)]
[Layout: card centrata con max-width 360px]
```

#### 4.6.7 Come si svolge una lezione (4 step)

```
01                    02                     03                     04
ARRIVI 15 MIN         TI DIAMO LE BASI       PRATICA FLUIDA         RILASSAMENTO
PRIMA                 (SE NUOVO)                                     E SILENZIO

Ti cambi, prendi      Se è la tua prima      Sequenza guidata       Lo studio si
il tuo posto in       volta, l'insegnante    dall'insegnante,       svuota lentamente
studio.               ti spiega le 5         sempre nuova. Si       in Savasana. Niente
                      posizioni base.        scioglie il corpo,     fretta di uscire.
                      Niente di              si apre il respiro,
                      complicato.            si lascia andare il
                                             pensiero.
```

#### 4.6.8 Cosa portare

Stesso pattern.

#### 4.6.9 FAQ Flow (5 domande)

```
1. Cosa cambia rispetto a Iyengar e Ashtanga?
   Iyengar è precisione e allineamento. Ashtanga è una sequenza 
   fissa che si ripete. Flow è il più libero dei tre: ogni 
   lezione è diversa, l'insegnante costruisce la pratica in 
   base al gruppo e al momento.

2. Devo essere già flessibile o esperto?
   No. Flow è probabilmente la pratica più accessibile per chi 
   inizia. Non c'è una tecnica complicata da imparare — basta 
   seguire l'insegnante e ascoltare il proprio corpo.

3. Posso fare Flow anche se ho dolori fisici?
   Dipende dai dolori. Se hai problematiche specifiche (mal di 
   schiena cronico, ernia, infortuni recenti), Iyengar è 
   probabilmente più indicato — lavora sulla causa con maggior 
   precisione. Flow è ideale per chi sta bene fisicamente e vuole 
   muoversi.

4. Ogni lezione è davvero diversa?
   Sì. L'insegnante costruisce sequenze sempre nuove, in base 
   alla composizione del gruppo, al periodo dell'anno, al focus 
   del momento. Non vieni mai alla "stessa" lezione.

5. Posso fare Flow come unica pratica o devo combinarla?
   Puoi farla come unica pratica, certo. Ma molti dei nostri 
   allievi alternano Flow + Iyengar (uno per la libertà, l'altro 
   per la struttura) e lo trovano un equilibrio perfetto.
```

#### 4.6.10 Testimonianza

PLACEHOLDER.

#### 4.6.11 Orari Flow (mini-vista)

```
[Lista compatta, centrata]

Flow Yoga
Mercoledì 7:30
Sabato 10:30
Domenica 17:30
```

#### 4.6.12 Esplora le altre pratiche

Mini-card Iyengar + Ashtanga.

#### 4.6.13 CTA finale

Stessa struttura.

---

## 4.7 PAGINA `/corsi/teen-yoga`

### Identità visiva
- Palette dominante: `#d4b5a0` (pesca-terra Teen)
- Background: `#f9f5f0` alternato `#faf8f5`
- Mood foto: giovanile ma non infantile, fresco, autentico, senza forzature

### CARATTERISTICA UNICA: TOGGLE GENITORE/TEEN

**Funzionamento:**
- All'inizio della pagina, sotto l'hero compatto, c'è un toggle
- Default: "Sono un genitore" attivo
- Click su "Sono un ragazzo / una ragazza" → cambia tono di voce e contenuti delle sezioni dinamiche
- La struttura della pagina rimane uguale, cambiano testi ed esempi

### Struttura

#### 4.7.1 Hero (60vh)

```
[Background: foto adolescenti in pratica, naturale, non posato]
[Overlay leggero rgba(0,0,0,0.3)]

[Centrato]

[Tag]: TEEN YOGA

[Headline grande]
Per chi sta diventando 
se stesso.

[Sotto-headline neutra]
Yoga per ragazze e ragazzi tra i 12 e i 17 anni.
```

**Note:** sotto-headline neutra, vale per entrambi i target. Le differenze partono dal toggle.

#### 4.7.2 Toggle (sotto hero)

```
[Background: #f9f5f0, padding 48px 0]

[Centrato]

[Label sopra]: Per chi stai leggendo?

[Toggle pillola, larghezza ~440px]
[ Sono un genitore ]    Sono un ragazzo / una ragazza

[Default attivo: "Sono un genitore"]
```

**Specifiche toggle:**
- Container: background `#e8e4df`, border-radius 9999px, padding 4px
- Pillola attiva: background `#d4b5a0`, text `#2a2a2a`, border-radius 9999px (uso colore Teen, non #9c9a66, per coerenza con tag)
- Pillola inattiva: text `#6b6b6b`, transparent
- Padding pillola: 12px 24px
- Animazione switch: 250ms ease-out

**Implementazione tecnica:**
- Vanilla JS con event listener sul toggle
- Le sezioni dinamiche hanno attributi `data-content="genitore"` o `data-content="teen"`
- Default: tutti `data-content="teen"` hanno `display: none`, `data-content="genitore"` `display: block`
- Click toggle → swap visibility

```javascript
// Pseudocode
const toggle = document.querySelector('[data-toggle="teen-genitore"]');
const elementsGenitore = document.querySelectorAll('[data-content="genitore"]');
const elementsTeen = document.querySelectorAll('[data-content="teen"]');

toggle.addEventListener('click', (e) => {
  const target = e.target.dataset.target; // 'genitore' or 'teen'
  
  elementsGenitore.forEach(el => {
    el.style.display = target === 'genitore' ? 'block' : 'none';
  });
  elementsTeen.forEach(el => {
    el.style.display = target === 'teen' ? 'block' : 'none';
  });
  
  // Update active state on toggle
});
```

#### 4.7.3 Sezione "A chi è dedicato" (DINAMICA)

**VERSIONE GENITORE (default visibile):**

```
[data-content="genitore"]

[Tag]: A CHI È DEDICATO

[Headline]: Teen Yoga è adatto a tuo figlio se...

[3 colonne]

PASSA TROPPE ORE              VIVE LO STRESS                CERCA UNO SPAZIO
DAVANTI A SCHERMI             SCOLASTICO                    DOVE STARE BENE

Tablet, computer,             Ansia da prestazione,         I social, gli schermi,
smartphone. La                pressione voti, ritmi         le aspettative — tutto
postura ne risente            intensi. Lo yoga è uno        diventa rumore. Lo yoga
ogni giorno.                  strumento concreto per        è un'ora di silenzio
                              imparare a respirare e        e movimento puri.
                              gestire la tensione.
```

**VERSIONE TEEN (nascosta default):**

```
[data-content="teen"]

[Tag]: PER TE SE...

[Headline]: Teen Yoga è per te se...

[3 colonne]

SEI SEMPRE COL                LA SCUOLA TI                   VUOI UN POSTO DOVE 
COLLO PIEGATO SUL             SVUOTA                         NON DEVI ESSERE
TELEFONO                                                       BRAVO

Spalle in avanti,             Verifiche, voti,              Niente performance,
schiena curva, mal             pressione costante.           niente confronti, niente
di testa serale.               Lo yoga ti dà 60              giudizi. Solo tu, il
Lo yoga rimette a              minuti senza pensieri,        tappetino, il respiro.
posto la postura,              senza schermi, senza
toglie tensioni che            stress.
nemmeno sai di avere.
```

#### 4.7.4 Sezione "Cosa otterrai" (DINAMICA)

**VERSIONE GENITORE:**

```
[Headline]: Cosa cambia con la pratica.

[Griglia 4 colonne]

GESTIONE DELLO STRESS         POSTURA CHE MIGLIORA          CONCENTRAZIONE          AUTOSTIMA NEL CORPO

Strumenti concreti per         A 13-17 anni il corpo         Allenarsi a stare       In un'età di insicurezze,
calmare l'ansia prima di       cambia in fretta. Lo          presenti per un'ora     riscoprire il proprio
una verifica o di una          yoga lavora sulla             attiva la stessa         corpo come strumento
situazione difficile.          struttura, non sulla          capacità necessaria      potente, non da
                               moda — colonna,               nello studio.            giudicare.
                               cervicale, spalle.
```

**VERSIONE TEEN:**

```
[Headline]: Cosa ti porti a casa.

[Griglia 4 colonne, tono più diretto]

DORMI MEGLIO                   SMETTI DI                      SCUOLA UN PO'           SENTIRSI A POSTO
                              SENTIRTI                       MENO PESANTE             CON SE STESSI
Anche se vai a letto           CONTRATTO                                              
tardi, il sonno è              Quelle tensioni alle           Non ti diventerà         A 15 anni nessuno si
diverso. Più profondo,         spalle e al collo che          divertente, ma           sente "a posto" sempre.
ti svegli meno stanco.         hai sempre, vanno via.         imparerai a              Lo yoga ti dà uno spazio
                               Pian piano.                    respirare prima delle    dove non devi essere
                                                              verifiche.               nessuno.
```

#### 4.7.5 Sezione FAQ (DINAMICA)

**VERSIONE GENITORE:**

```
[Headline]: Domande frequenti.

1. Mio figlio/a non ha mai fatto yoga, può iniziare?
   Sì. Il Teen Yoga è pensato proprio per principianti. 
   L'insegnante adatta tutto al gruppo, parte sempre dalle basi.

2. È un ambiente sicuro per adolescenti?
   Sì. Gruppo dedicato di solo adolescenti, insegnante formato 
   per questa fascia d'età. Niente adulti misti, niente 
   pressione, ambiente protetto.

3. Quanto dura la lezione?
   60 minuti, una volta a settimana (mercoledì 16:30).

4. Posso assistere come genitore o no?
   Preferiamo che il gruppo sia solo di adolescenti. Aiuta i 
   ragazzi a sentirsi liberi, a non sentirsi osservati. Se vuoi 
   parlare con l'insegnante prima o dopo la lezione, sei 
   benvenuto.

5. C'è una prova gratuita per i ragazzi?
   La prima lezione è di prova, a 10€. Se tuo figlio/a non si 
   trova bene, non c'è nessun obbligo. Vogliamo che venga perché 
   ne ha voglia, non per noi.
```

**VERSIONE TEEN:**

```
[Headline]: Domande che probabilmente hai.

1. Devo essere flessibile o sportivo? Spoiler: no.
   Tipo per niente. Lo yoga lavora con il corpo che hai oggi, 
   non con quello che pensi di dover avere. Se non riesci a 
   toccarti i piedi, va benissimo. Davvero.

2. Sarò il/la più imbranato/a della classe?
   No. Il gruppo è di gente come te — alcuni alla prima volta, 
   alcuni che vengono da 6 mesi, ma nessuno che ti guarda. 
   L'insegnante è cool e rispetta i tempi di ognuno.

3. Devo dire cose tipo "namasté" o robe spirituali?
   No. Il nostro Teen Yoga è una pratica vera, non una scena 
   da film. Si lavora sul corpo, sul respiro, sul presente. 
   Niente forzatura.

4. I miei amici possono venire con me?
   Assolutamente sì. Anzi, è meglio. Spesso si crea un piccolo 
   gruppo di amici che vengono insieme.

5. Quanto costa?
   La prima lezione è 10€ (prova). Se vuoi continuare, c'è uno 
   sconto specifico per teen — chiedici i dettagli.
```

#### 4.7.6 Sezioni STATICHE (uguali per entrambi)

**Insegnante:**
```
[Tag]: L'INSEGNANTE
[1 micro-card del/della Teen Yoga insegnante]
[PLACEHOLDER nome — da recuperare]
```

**Come si svolge una lezione (4 step):**
```
01                    02                     03                     04
ARRIVI                COMINCIAMO IN          PRATICA INSIEME        CHIUSURA
                      CERCHIO                                       

Lo spogliatoio è      Brevissimo check-in,   60 minuti di pratica   5 minuti di
tuo, ti cambi,        come state, cosa       guidata, posizioni     rilassamento.
prendi un              avete in giro per      adattate al gruppo,    Esci sereno e
tappetino.            la testa. 2 minuti,    movimento, respiro,    pronto per il resto
                      poi via.               qualche risata.        della giornata.
```

**Orari:**
```
[Lista compatta, centrata]

Teen Yoga
Mercoledì 16:30 (60 min)
```

**CTA finale:**

```
[Background: #d4b5a0, text #2a2a2a, padding 96px 0]
[Note: usiamo il colore Teen come background CTA finale per coerenza visiva con la pagina]

[Centrato]

[Headline]: Vieni a una lezione.

[Sotto-headline]
Prima lezione di prova a 10€. Senza impegno.

[CTA]: Scrivici su WhatsApp →
[Link WhatsApp con messaggio: "Ciao! Vorrei informazioni su Teen Yoga."]

[Microcopy]: Risposta entro 1 ora · Cancellabile fino a 24h prima
```
## 4.8 PAGINA `/chi-siamo`

### Filosofia
Pagina narrativa, non promozionale. Racconta identità del brand. Glenda ha sezione dedicata e prominente (è il volto del brand). Gli altri 3 insegnanti seguono in griglia.

### Struttura completa

#### 4.8.1 Hero (80vh)

```
[Background: foto reale dello studio o di un momento di pratica, atmosferica]

[Overlay scuro leggero: rgba(0,0,0,0.4)]

[Centrato verticalmente, allineato sinistra max-width 800px]

[Tag white]: CHI SIAMO

[Headline grande, New York serif 64px desktop / 44px mobile, white]
Siamo uno studio.
Non una palestra.

[Sotto-headline white, Inter 18px]
Una tribù di insegnanti e allievi che condividono una pratica 
seria, fatta di rigore, autenticità e amicizia vera.
```

**Note:** niente CTA in hero. Questa pagina racconta, non vende.

#### 4.8.2 Manifesto "Cosa non siamo"

```
[Background: #f9f5f0, padding 160px 0]

[Centrato, max-width 900px, padding laterale 64px]

[Tag piccolo]: IL NOSTRO MANIFESTO
[Headline]: Cominciamo da quello che non siamo.

[Spacing 48px]

[Testo grande, New York serif italic, 32-38px line-height 1.4]

Non siamo una palestra.
Non siamo un brand di lifestyle.
Non siamo per chi cerca la moda.
Non siamo yoga estetico da social.

[Pausa visiva — divider sottile centrato 1px #e8e4df, larghezza 200px]

[Spacing 48px]

[Stesso stile, ma versione positiva]

Siamo uno studio dove ogni stile ha la sua identità,
il suo insegnante, il suo pubblico.
Siamo per chi vuole risolvere problemi reali e si fida 
di insegnanti che hanno studiato per anni.
```

#### 4.8.3 La storia di Yoga Tribù

```
[Background: #faf8f5, padding 128px 0]

[Layout 2 colonne, 60/40 desktop, stack mobile, gap 64px]

COL SINISTRA (60%):

[Tag]: LA NOSTRA STORIA
[Headline]: Una pratica vera, in un luogo umano.

[Body, Inter 17px line-height 1.7, 5 paragrafi]

Yoga Tribù nasce per chi cerca lo yoga vero — quello che 
risolve dolori reali, costruisce consapevolezza, restituisce 
calma. Non lo yoga delle mode passeggere, ma una pratica 
antica, precisa, tradizionale.

Lo studio propone tre stili distinti — Iyengar, Ashtanga e 
Flow — ciascuno insegnato da un insegnante specializzato e 
certificato in quel metodo specifico. Niente generalismi: chi 
insegna Iyengar ha studiato Iyengar per anni, chi insegna 
Ashtanga ha praticato Ashtanga ogni giorno per anni.

Le pratiche principali sono Iyengar e Ashtanga, entrambe rare 
sul territorio. Le persone arrivano da lontano per noi.

A queste si aggiunge il Flow, una pratica complementare per 
chi cerca movimento più libero, e il Teen Yoga per i nostri 
ragazzi.

Ma quello che ci tiene insieme non sono le tecniche — è 
l'idea che lo yoga si vive in un gruppo. Una tribù. 
L'amicizia, la fiducia, il sentirsi visti — questo è ciò 
che si perderebbe se Yoga Tribù fosse solo un posto dove si 
fa pratica.

COL DESTRA (40%):
[Foto verticale 3:4 — momento di studio, naturale, persone reali]
```

#### 4.8.4 Glenda — sezione dedicata (FONDATRICE)

```
[Background: #f9f5f0, padding 128px 0]

[Container]

[Tag]: LA FONDATRICE

[Spacing 48px]

[Layout 2 colonne, 50/50 desktop, gap 64px]

COL SINISTRA — FOTO:
[Foto grande verticale 4:5, in studio, naturale, ~600px altezza]

COL DESTRA — BIO:

[Nome grande, New York serif 56px desktop / 40px mobile]
Glenda

[Sottotitolo, Inter 13px uppercase color #9c9a66, letter-spacing 0.1em]
FONDATRICE · IYENGAR · ASHTANGA

[Spacing 24px]

[Citazione personale, italic 22px line-height 1.4, color #6b6b6b]
"[PLACEHOLDER — citazione di Glenda. Esempio:
Lo yoga non è ginnastica. È riprendere possesso del proprio corpo.]"

[Spacing 32px]

[Bio narrativa, Inter 16px line-height 1.7, 5 paragrafi]

[PLACEHOLDER — bio Glenda da scrivere insieme. Struttura suggerita:]

— Paragrafo 1: come ha incontrato lo yoga (l'inizio personale, 
non i titoli)

— Paragrafo 2: la formazione (anni di studio, dove, con chi — 
qui i titoli e le certificazioni servono)

— Paragrafo 3: perché ha aperto Yoga Tribù — la visione

— Paragrafo 4: il suo approccio all'insegnamento, cosa la 
distingue

— Paragrafo 5: cosa cerca di restituire agli allievi 
(chiusura emotiva)

[Spacing 48px]

[Sezione certificazioni — sotto la bio]

[Tag piccolo, Inter 12px uppercase]: CERTIFICAZIONI

[Lista pulita, Inter 15px, gap 8px]
• [PLACEHOLDER — Es: Certified Iyengar Yoga Teacher (CIYT) — RIMYI Pune]
• [PLACEHOLDER — Es: Authorized Level 2 — KPJAYI Mysore]
• [PLACEHOLDER — Es: 15+ anni di insegnamento]

[Spacing 32px]

[CTA testuale, color #9c9a66, weight medium]
Vieni a una lezione con Glenda →
[Link: /orari?stile=iyengar — opzionalmente filtra per insegnante]
```

#### 4.8.5 Gli altri insegnanti

```
[Background: #faf8f5, padding 96px 0]

[Container]

[Tag]: LA TRIBÙ

[Headline]: Le persone con cui pratichiamo.

[Sotto-headline]: 
Insegnanti certificati, formati per anni nel metodo che 
insegnano. Nessun turn-over: quando trovi il tuo maestro, 
sai dove ritrovarlo.

[Spacing 48px]

[Griglia 3 card affiancate desktop, 1 mobile, gap 32px]
```

**Anatomia card insegnante (medium size):**

```
┌──────────────────────────┐
│                          │
│   [Foto verticale 3:4]   │
│   ~360px altezza         │
│                          │
├──────────────────────────┤
│  Padding 24px            │
│                          │
│  Giulia                  │  ← New York 28px
│                          │
│  FLOW                    │  ← Tag 11px uppercase, color stile
│                          │
│  Insegna Flow dal        │  ← Inter 14px color #6b6b6b
│  [PLACEHOLDER anno]      │
│                          │
│  "[PLACEHOLDER -          │  ← Italic 14px, max 3 righe
│  citazione breve]"       │
│                          │
│  Scopri Giulia →         │  ← CTA testuale
│                          │
└──────────────────────────┘

Cliccabilità: tutta la card → /insegnanti/[nome]

Hover state:
- Foto zoom 1.03
- Card lift 4px, shadow #shadow-md
```

**3 card per:**

```
CARD 1 — GIULIA
Tag: FLOW (color #b8a68e)
Insegna Flow dal [PLACEHOLDER]
Citazione: [PLACEHOLDER]
Link: /insegnanti/giulia

CARD 2 — VICTOR
Tag: ASHTANGA (color #7a6b5f)
Insegna Ashtanga dal [PLACEHOLDER]
Citazione: [PLACEHOLDER]
Link: /insegnanti/victor

CARD 3 — [TEEN INSEGNANTE]
Tag: TEEN YOGA (color #d4b5a0)
Insegna dal [PLACEHOLDER]
Citazione: [PLACEHOLDER]
Link: /insegnanti/teen
```

#### 4.8.6 Lo studio (luogo fisico)

```
[Background: #f9f5f0, padding 96px 0]

[Container]

[Tag]: LO STUDIO

[Headline]: Un luogo costruito per la pratica.

[Spacing 48px]

[Foto a tutta larghezza, 16:9, ~600px altezza, max-width 1280px]
[Foto reale dello studio — sala di pratica, vista d'insieme]

[Spacing 48px]

[Centrato, max-width 700px]

[Sotto-headline, Inter 17px line-height 1.6]
Spazio luminoso, tappetini di qualità, attrezzi sempre 
disponibili. Niente musica forzata, niente atmosfera da spa. 
Solo lo spazio per fare pratica seriamente, con cura.

[Spacing 64px]

[Griglia 4 mini-foto, ~250px ciascuna desktop, 2x2 mobile, gap 16px]
[Foto: dettagli studio — mattoncini, luce, ingresso, spogliatoio]

[Spacing 48px, centrato]

[CTA testuale]: Vieni a vedere lo studio dal vivo →
[Link: /contatti]
```

#### 4.8.7 I valori

```
[Background: #faf8f5, padding 96px 0]

[Container]

[Tag]: COSA CI TIENE INSIEME

[Headline]: I valori non si dichiarano. Si vedono in studio.

[Spacing 48px]

[Griglia 4 colonne desktop, 2x2 mobile, gap 32px]

[Col 1]              [Col 2]              [Col 3]              [Col 4]
[Icona linea, color #9c9a66]

RIGORE               AUTENTICITÀ          COMPETENZA           APPARTENENZA

Tecniche             Comunicazione        Insegnanti           Siamo una tribù.
tradizionali,        reale, relazioni     certificati in       L'amicizia è
nessuna              genuine.             ogni singolo         parte
concessione                               metodo.              dell'esperienza.
alla moda.
```

#### 4.8.8 Testimonianza

```
[Background: #f9f5f0, padding 128px 0]

[Centrato, max-width 800px]

[Citazione, italic 32-38px]

"[PLACEHOLDER — testimonianza]
Ho cambiato 3 studi prima di trovare Yoga Tribù. 
Quello che mi tiene qui non è solo l'insegnamento — 
è sentirmi finalmente vista come persona, 
non come abbonata."

[Spacing 32px]

[Foto cerchio 80px + nome]
Anna, 52 anni
Pratica Iyengar dal 2022
```

#### 4.8.9 CTA finale

```
[Background: #9c9a66, text white, padding 128px 0]

[Centrato, max-width 700px]

[Headline]: Vuoi conoscerci di persona?

[Sotto-headline]
Il modo migliore di capire Yoga Tribù è venire una volta, 
fare una pratica, parlare con noi.

[2 CTA]
[Primaria, button white text #9c9a66]: Prenota la prima lezione →
[Secondaria testuale white]: Hai una domanda? Scrivici su WhatsApp →

[Microcopy]: Risposta entro 1 ora · Cancellabile fino a 24h prima
```

---

## 4.9 PAGINE `/insegnanti/[nome]` (4 PAGINE)

### Funzione
Profilo individuale di ogni insegnante. Trust building. Fa avvicinare le persone all'insegnante con dettagli personali.

### Template comune

Tutte le 4 pagine seguono lo stesso template, con varianti:
- **Glenda:** versione completa, dettagliata, prominente (è il volto del brand)
- **Giulia, Victor, Teen:** versione semplificata ma comunque ricca

### Struttura template

#### 4.9.1 Hero (60vh)

```
[Background: #f9f5f0, padding 96px 0]

[Container max-width 1280px]

[Layout 2 colonne, 50/50 desktop, stack mobile, gap 64px]

COL SINISTRA (foto):
[Foto verticale 4:5, ~600px altezza desktop]
[Foto reale in studio, naturale, non posata]

COL DESTRA (info):

[Nome grande, New York serif 56px desktop / 40px mobile]
Glenda

[Tag stile, Inter 13px uppercase color stile, letter-spacing 0.1em]
[Per Glenda: IYENGAR · ASHTANGA · FONDATRICE]
[Per altri: solo lo stile che insegnano + eventualmente ruolo]

[Spacing 16px]

[Anni esperienza, Inter 15px color #6b6b6b]
Insegna [stile] dal [PLACEHOLDER anno]

[Spacing 24px]

[Citazione personale, italic 22px line-height 1.4]
"[PLACEHOLDER — citazione personale dell'insegnante]"
```

#### 4.9.2 Sezione "La mia storia"

```
[Background: #faf8f5, padding 96px 0]

[Container, max-width 800px centrato]

[Tag]: LA MIA STORIA

[Headline, New York serif 36px]
[Nome dell'insegnante]

[Body Inter 17px line-height 1.7, 4-6 paragrafi narrativi]

[PLACEHOLDER per ogni insegnante. Struttura suggerita:
- Come ha incontrato lo yoga (l'inizio personale)
- Formazione e percorso (dove ha studiato, con chi)
- Cosa lo ha portato a Yoga Tribù
- Approccio personale all'insegnamento
- Cosa vuole restituire agli allievi]
```

**Differenza tra Glenda e gli altri:**
- Glenda: 5-6 paragrafi più ricchi
- Giulia/Victor/Teen: 4 paragrafi più concisi

#### 4.9.3 Sezione "La mia filosofia"

```
[Background: #f9f5f0, padding 96px 0]

[Container, max-width 800px centrato]

[Tag]: FILOSOFIA

[Headline]: Come insegno.

[Body 3-4 paragrafi]

[PLACEHOLDER — filosofia personale dell'insegnante]
```

**Per Glenda:** sezione più articolata con riflessioni sull'evoluzione del suo modo di insegnare.

**Per gli altri:** versione più diretta, 2-3 paragrafi.

#### 4.9.4 Sezione "Certificazioni"

```
[Background: #faf8f5, padding 64px 0]

[Container, max-width 800px centrato]

[Tag]: CERTIFICAZIONI

[Lista visibile, formato bullet con eventuali loghi/icone]
• [PLACEHOLDER]
• [PLACEHOLDER]
• [PLACEHOLDER]

Per Glenda elenco più ricco. Per gli altri 2-3 voci.
```

#### 4.9.5 Sezione "I miei corsi"

```
[Background: #f9f5f0, padding 96px 0]

[Container]

[Headline]: Le lezioni che tengo.

[Spacing 48px]

[Mini-griglia degli orari di questo insegnante, formato condensato]
```

**Specifico per ogni insegnante:**

**Glenda (Iyengar + Ashtanga):**
```
LIVELLO 1 (BASE)              LIVELLO 2              LIVELLO 3              SOFT
Lun 8:45                      Lun 7:00, 18:00, 19:30 Mar 13:00              Mar 8:45
Mer 8:45                      Mer 18:00, 19:30       Gio 13:00
```

[Glenda potrebbe anche insegnare Ashtanga? Verificare. Per ora, in base agli orari forniti, gli Ashtanga sono di Victor. Ma se Glenda insegna anche Ashtanga, mostrare anche quegli orari.]

**Giulia (Flow):**
```
FLOW
Mer 7:30
Sab 10:30
Dom 17:30
```

**Victor (Ashtanga):**
```
GUIDATA                        MYSORE
Mar 19:00                      Mar 17:30
Gio 19:00                      Gio 17:30
                               Ven 7:00
                               Sab 8:30
```

**[Teen] (Teen Yoga):**
```
TEEN YOGA
Mer 16:30
```

#### 4.9.6 CTA finale

```
[Background: #9c9a66, text white, padding 96px 0]

[Centrato]

[Headline]: Vieni a una lezione con [Nome].

[Sotto-headline]
Prima lezione di prova a 10€.

[CTA primaria white]: Prenota una lezione →
[CTA secondaria testuale]: Scrivici su WhatsApp →
```

---

## 4.10 PAGINA `/eventi` (OVERVIEW)

### Filosofia
Architettura a 3 livelli di prominenza basata su comportamento utente:
1. **Estate in Villa** = HERO immersivo (bassa frequenza, alta considerazione, narrativo)
2. **Ritiri** = DESTACATO editoriale (bassa frequenza, alta considerazione, immersivo)
3. **Workshop** = LISTA scannable (alta frequenza, bassa considerazione, decisione veloce)

### Struttura

#### 4.10.1 Hero compatto (35vh)

```
[Background: #f9f5f0, padding 96px 0]

[Centrato]

[Tag]: EVENTI

[Headline]: La pratica continua oltre la lezione.

[Sotto-headline]
Workshop mensili, ritiri, l'estate in villa. 
Esperienze costruite per andare più in profondità.
```

#### 4.10.2 Estate in Villa (HERO immersivo, 90vh)

```
[Background: foto grande della villa con porticato, luce calda]
[Overlay scuro: rgba(0,0,0,0.4)]

[Allineato sinistra, max-width 800px, padding 64px]

[Tag white]: ESTATE 2026 · LUGLIO

[Headline grande, New York italic, 64-72px white]
Estate in Villa.
Una settimana sotto il porticato.

[Sotto-headline white]
Pratiche all'aperto, Iyengar, Ashtanga, Flow e meditazione 
guidata. Non solo yoga — un'esperienza estiva completa.

[Spacing 32px]

[Mini-info inline white, con icone minimaliste]
📍 [PLACEHOLDER location]
📅 [PLACEHOLDER date]
👥 [PLACEHOLDER posti totali]

[Spacing 32px]

[2 CTA]
[Primaria white text #9c9a66]: Scopri Estate in Villa →
[Link: /eventi/estate-in-villa]
[Secondaria testuale white]: Vedi le foto delle edizioni passate →
[Link: /eventi/estate-in-villa#galleria]
```

**Cliccabilità:** tutto il blocco è cliccabile come fallback → `/eventi/estate-in-villa`

#### 4.10.3 Separatore narrativo

```
[Background: #f9f5f0, padding 80px 0]

[Centrato, max-width 700px]

[Testo italic, New York 24px, color #6b6b6b]
"Ogni anno cerchiamo un luogo dove andare a fondo."

[Spacing 32px]

[Linea sottile centrata 1px #e8e4df, larghezza 200px]
```

#### 4.10.4 Ritiri (sezione destacata)

```
[Background: #faf8f5, padding 128px 0]

[Container]

[Tag]: RITIRI

[Headline]: Andare a fondo. Insieme.

[Sotto-headline, max-width 600px]
Una volta o due l'anno. Pochi giorni in una destinazione 
scelta. Si pratica, si vive un'esperienza completa, si torna 
diversi.

[Spacing 64px]

[Layout 2 colonne 40/60 desktop, gap 48px]

COL SINISTRA (40%):

[Tag piccolo]: PROSSIMO RITIRO

[Spacing 16px]

[Nome ritiro, New York 36px]
[PLACEHOLDER — Es. "Ritiro autunnale in Toscana"]

[Spacing 24px]

[Mini-info, Inter 14px]
📅 [PLACEHOLDER date]
📍 [PLACEHOLDER location]
👥 [PLACEHOLDER posti totali] · [posti] disponibili

[Spacing 24px]

[Descrizione, Inter 15px line-height 1.7, 4 righe]
[PLACEHOLDER descrizione narrativa breve del ritiro]

[Spacing 32px]

[CTA primaria]: Scopri il ritiro →
[Link: /eventi/ritiri/[slug]]

[CTA secondaria testuale]: Galleria edizioni precedenti →

COL DESTRA (60%):
[Foto grande verticale 4:5 — atmosferica della location]
```

**Versione fallback se nessun ritiro programmato:**

```
[Stessa sezione ma contenuto diverso]

[Headline]: Il prossimo ritiro è in costruzione.

[Sotto-headline]
Salva il numero di Yoga Tribù in rubrica. Quando si aprono 
le iscrizioni a un ritiro, ti basterà scriverci un WhatsApp.

[2 CTA]
[Primaria]: Salva il numero
[Link: tel:+393287675966]
[Secondaria testuale]: Scrivi su WhatsApp →
[Link: wa.me/393287675966]
```

#### 4.10.5 Workshop mensili (lista calendario)

```
[Background: #f9f5f0, padding 128px 0]

[Container]

[Tag]: WORKSHOP MENSILI

[Headline]: Deep Dive.

[Sotto-headline, max-width 700px]
Un weekend al mese, tre ore di approfondimento. 
Ogni mese un tema diverso, un insegnante, una pratica.

[Spacing 64px]

[Lista calendario — formato editoriale]
```

**Anatomia riga workshop:**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  [Layout grid: data 80px | contenuto flex | prezzo 80px | freccia 24px]    │
│                                                                              │
│  GIU                       BACKBENDS — Aprire il cuore.            €45  →  │
│  15                        Glenda · 14:00–17:00 · 3h                        │
│  DOM                       Workshop di approfondimento sui                  │
│                            piegamenti all'indietro, tecniche                │
│                            tradizionali Iyengar.                             │
│                            12 posti · 5 disponibili                          │
│                                                                              │
│  Padding 32px 0                                                              │
│  Border-bottom 1px #e8e4df                                                   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

Hover state:
- Background: #faf8f5
- Freccia shift right 4px
- Cursor pointer

Cliccabilità: tutta la riga → /eventi/workshop/[slug]
```

**Specifiche elementi riga:**

- **Data box (80px):**
  - Mese: Inter 12px uppercase color #9c9a66
  - Giorno: New York 36px medium
  - Giorno settimana: Inter 11px uppercase color #6b6b6b
- **Titolo workshop:** Inter 20px medium
- **Sottotitolo (insegnante · orario · durata):** Inter 13px color #6b6b6b
- **Descrizione:** Inter 15px line-height 1.6, max 2-3 righe
- **Posti disponibili:** Inter 13px color `#c95a4a` se <5, altrimenti #6b6b6b
- **Prezzo:** Inter 18px medium, allineato a destra
- **Freccia:** 16px color #6b6b6b, hover #9c9a66

**Mostrare:** prossimi 3-4 workshop. Sotto: CTA "Vedi tutti i workshop in programma →" → `/eventi/workshop`.

```
[Spacing 48px, centrato]

[CTA testuale]: Vedi tutti i workshop in programma →
```

#### 4.10.6 Sezione "Restiamo in contatto" (WhatsApp)

```
[Background: #9c9a66, text white, padding 96px 0]

[Centrato, max-width 700px]

[Headline white]: Non perdere il prossimo evento.

[Sotto-headline]
Salva il numero di Yoga Tribù in rubrica. Quando si aprono 
le iscrizioni a un evento, ti basterà scriverci un WhatsApp.

[Spacing 32px]

[2 CTA inline]
[Primaria, button white text #9c9a66]: Salva il numero
[Link: tel:+393287675966]
[Secondaria testuale white underline]: Scrivi su WhatsApp →
[Link: wa.me/393287675966]

[Spacing 16px]

[Microcopy white opacity 0.8]
+39 328 767 5966
```

#### 4.10.7 CTA finale per non-allievi

```
[Background: #f9f5f0, padding 96px 0]

[Centrato, max-width 700px]

[Headline]: Non sei ancora un allievo?

[Sotto-headline]
Gli eventi sono per chi pratica con noi. Inizia da una sola 
lezione, e poi vediamo.

[Spacing 32px]

[CTA pulsante]: Prenota la prima lezione →
[Link WhatsApp: prima lezione di prova]

[Microcopy]: Prima lezione di prova a 10€
```

---

## 4.11 PAGINA `/eventi/estate-in-villa`

### Funzione
Pagina dettaglio dell'evento più narrativo. Lunga, immersiva, racconta l'esperienza.

### Struttura

#### 4.11.1 Hero immersivo (100vh)

```
[Background: foto grande villa, atmosferica]
[Overlay scuro: rgba(0,0,0,0.4)]

[Centrato, max-width 800px]

[Tag white]: ESTATE 2026

[Headline grande, New York italic 72px desktop / 48px mobile]
Estate in Villa.

[Sotto-headline white, Inter 18px]
Una settimana sotto il porticato — pratiche all'aperto, 
silenzio condiviso, cibo vero, tribù.

[Spacing 32px]

[Mini-info inline]
📅 [date] · 📍 [location] · 👥 [posti] totali, [posti] disponibili

[Spacing 32px]

[CTA primaria white]: Prenota il tuo posto →
```

#### 4.11.2 Cosa vivrai (narrativo)

```
[Background: #f9f5f0, padding 128px 0]

[Centrato, max-width 800px]

[Tag]: COSA VIVRAI

[Headline]: 
Una settimana fuori dal mondo, dentro alla pratica.

[Body narrativo, 5-6 paragrafi, Inter 17px line-height 1.7]

[PLACEHOLDER — testo da scrivere insieme. Deve trasmettere 
atmosfera, ritmo, profondità. Esempio:]

Sveglia presto, pratica all'aperto sotto il porticato della 
villa — Iyengar al mattino, quando l'aria è ancora fresca. 
Colazione lunga insieme, frutta di stagione, caffè che si 
prepara con calma. Poi tempo libero — alcuni leggono, altri 
camminano, altri stanno e basta.

A metà giornata un workshop tematico — varia ogni giorno: 
inversioni, pranayama, philosophia yoga, anatomia funzionale. 
Pranzo vero, cibo locale, conversazioni che cominciano a 
mezzogiorno e finiscono dopo le tre.

Pomeriggio di nuovo movimento — Ashtanga, Flow, oppure una 
camminata insieme. La sera, cena conviviale all'aperto, e 
poi meditazione guidata sotto le stelle prima di andare a 
dormire.

Una settimana così. Niente social, niente schermi, niente 
fretta. Solo la pratica, le persone, il luogo. Si arriva 
stanchi e si torna diversi.

[5-6 paragrafi totali]
```

#### 4.11.3 Programma giornaliero

```
[Background: #faf8f5, padding 96px 0]

[Container, max-width 800px]

[Tag]: UNA GIORNATA TIPO

[Headline]: Il ritmo dei giorni.

[Spacing 48px]

[Timeline verticale]

07:00  Sveglia
       
07:30  Iyengar all'aperto sotto il porticato (90 min)
       
09:30  Colazione lunga insieme — frutta, pane, caffè
       
11:00  Tempo libero — passeggiate, lettura, riposo
       
13:00  Pranzo — cibo locale, vero, semplice
       
15:00  Workshop tematico (3h) — varia ogni giorno
       
18:30  Ashtanga al tramonto (75 min)
       
20:00  Cena conviviale
       
21:30  Meditazione guidata sotto le stelle (30 min)
       
22:30  Buonanotte
```

**Specifiche timeline:**
- Lista verticale con linea sottile sinistra (1px #9c9a66)
- Punti orari: dot 8px su linea
- Orario: Inter 14px medium color #9c9a66
- Descrizione: Inter 16px color #2a2a2a

#### 4.11.4 Insegnanti dell'evento

```
[Background: #f9f5f0, padding 96px 0]

[Tag]: GLI INSEGNANTI

[Headline]: Chi guida la settimana.

[Griglia micro-card insegnanti che partecipano]
[PLACEHOLDER: Glenda + Victor + Giulia o quanti partecipano]
```

#### 4.11.5 Cosa è incluso / cosa portare

```
[Background: #faf8f5, padding 96px 0]

[Container, max-width 900px]

[Layout 2 colonne 50/50, gap 64px]

COL SINISTRA — INCLUSO:
[Heading]: COSA È INCLUSO

✓ Pratica yoga 2x al giorno
✓ Workshop tematici quotidiani
✓ Tutti i pasti (colazione, pranzo, cena)
✓ Pernottamento in villa
✓ Tappetini e attrezzi forniti
✓ Meditazioni guidate

COL DESTRA — DA PORTARE:
[Heading]: COSA PORTARE

• Abiti comodi per la pratica
• Costume da bagno (se c'è piscina)
• Quaderno per appunti
• Curiosità e tempo
```

#### 4.11.6 Galleria edizioni precedenti

```
[Background: #f9f5f0, padding 96px 0]

[Container]

[Tag]: COME È STATO

[Headline]: Le edizioni passate.

[Spacing 48px]

[Griglia foto, 3x3 desktop, 2x3 tablet, 1 colonna mobile, gap 16px]
[6-9 foto reali da edizioni precedenti]

[Spacing 64px]

[Sezione testimonianze partecipanti precedenti, max-width 800px]

[2-3 brevi citazioni a stack verticale, ciascuna con foto + nome + edizione]

[Esempio:]
"[PLACEHOLDER citazione]"
[Foto] Nome, edizione 2025

[etc.]
```

**IMPORTANTE per CRO:** la galleria edizioni precedenti è il singolo elemento più potente per convertire chi non è mai venuto. Usare foto reali, atmosferiche, con persone vere.

#### 4.11.7 Posti disponibili e prezzo

```
[Background: #9c9a66, text white, padding 96px 0]

[Centrato, max-width 700px]

[Headline]: Iscrizioni aperte.

[Sotto-headline]
[PLACEHOLDER posti]: 18 posti totali · 7 disponibili
[Color #c95a4a se <5 disponibili]

[Spacing 32px]

[Pricing block]
[Prezzo grande, white, New York 56px]
€[PLACEHOLDER prezzo]

[Sotto-info white]
Comprende vitto, alloggio, pratiche, workshop.

[Spacing 32px]

[CTA grande, button bg white text #9c9a66, padding 16px 40px]
Prenota il tuo posto →
[Link WhatsApp: "Ciao! Vorrei prenotare un posto per Estate in Villa."]

[Spacing 16px]

[Microcopy white opacity 0.85]
Per prenotazione, scrivici su WhatsApp.
```

#### 4.11.8 FAQ specifiche evento

```
[Background: #f9f5f0, padding 96px 0]

[Container, max-width 900px]

[Headline]: Domande frequenti.

[6-7 accordion]

1. Come si arriva alla villa?
   [PLACEHOLDER — info trasporti, parcheggi, eventuale shuttle]

2. Posso venire da solo/sola?
   La maggior parte dei partecipanti viene da sola. La tribù 
   si crea già il primo giorno.

3. Devo essere praticante avanzato?
   No. Tutti i livelli sono benvenuti — gli insegnanti adattano 
   la pratica al gruppo.

4. C'è una caparra? Posso disdire?
   [PLACEHOLDER — politica caparre da definire]

5. Come funzionano i pasti? Sono adattabili (vegetariani, 
   intolleranze)?
   [PLACEHOLDER risposta]

6. Cosa se piove?
   La villa ha spazi al chiuso adeguati, tutto si sposta dentro.

7. Posso portare un accompagnatore non praticante?
   [PLACEHOLDER — politica accompagnatori]
```

#### 4.11.9 CTA finale

```
[Background: #faf8f5, padding 96px 0]

[Centrato]

[Headline]: Pronto a venire?

[CTA primaria]: Prenota →
[CTA secondaria testuale]: Scrivici su WhatsApp →
```

---

## 4.12 TEMPLATE `/eventi/ritiri/[slug]` (DINAMICA)

### Funzionamento
Pagine generate da Astro Content Collections. File markdown in `src/content/ritiri/`. Stessa struttura di Estate in Villa, adattata al ritiro specifico.

### File markdown esempio (`src/content/ritiri/toscana-2026.md`):

```yaml
---
title: "Ritiro autunnale in Toscana"
slug: "toscana-2026"
date_inizio: "2026-10-12"
date_fine: "2026-10-16"
location: "Casale in Maremma, Toscana"
posti_totali: 12
posti_disponibili: 4
prezzo: 580
insegnanti: ["glenda", "victor"]
foto_hero: "/images/ritiri/toscana-hero.jpg"
foto_gallery: 
  - "/images/ritiri/toscana-1.jpg"
  - "/images/ritiri/toscana-2.jpg"
  - "/images/ritiri/toscana-3.jpg"
descrizione_breve: "Cinque giorni di pratica intensa in un casale toscano circondato da oliveti."
---

[Contenuto narrativo del ritiro in markdown]

## Cosa vivrai
[Paragrafo lungo narrativo]

## Programma giornaliero
[Lista timeline]

## La location
[Paragrafo]

## FAQ
[Domande specifiche]
```

### Struttura pagina (rendering del markdown)

Stessa di Estate in Villa, sezioni uguali:
1. Hero immersivo
2. Cosa vivrai (narrativo)
3. Programma giornaliero
4. Insegnanti
5. Cosa incluso / cosa portare
6. Galleria
7. Posti e prezzo
8. FAQ
9. CTA finale

---

## 4.13 TEMPLATE `/eventi/workshop/[slug]` (DINAMICA)

### Funzionamento
Pagine generate da Astro Content Collections. File markdown in `src/content/workshops/`. Pagina più compatta dei ritiri/villa (workshop = decisione veloce).

### File markdown esempio:

```yaml
---
title: "Backbends — Aprire il cuore"
slug: "backbends-giugno-2026"
data: "2026-06-15"
orario: "14:00-17:00"
durata: 180
insegnante: "glenda"
prezzo: 45
posti_totali: 12
posti_disponibili: 5
descrizione_breve: "Workshop sui piegamenti all'indietro, tecniche tradizionali Iyengar."
---

[Contenuto narrativo]
```

### Struttura pagina

```
[Hero compatto 60vh]

[Tag]: WORKSHOP DEEP DIVE

[Headline]: [Titolo workshop]

[Sotto-headline]: [Descrizione breve 2 righe]

[Mini-info inline]
📅 [data] · ⏰ [orario] · 👤 [insegnante] · €[prezzo]

[CTA primaria]: Iscriviti →
```

```
[Sezione "Cosa vedremo"]
[Background: #f9f5f0, padding 96px 0]
[Body narrativo 4-5 paragrafi]
```

```
[Sezione "A chi è dedicato"]
[Background: #faf8f5, padding 96px 0]
[3 punti, simile a /corsi/[stile]]
```

```
[Sezione "L'insegnante"]
[Background: #f9f5f0, padding 96px 0]
[Micro-card insegnante centrata]
```

```
[Sezione "Posti disponibili e prezzo"]
[Background: #9c9a66 text white]
[Stessa struttura di Estate in Villa]
```

```
[CTA finale]
[Background: #faf8f5]
```
## 4.14 PAGINA `/` (HOMEPAGE)

### Filosofia
Pattern Apple "tile by tile": ogni sezione è una tile autonoma con un focus singolo, alta densità visiva, scroll fluido tra blocchi. Nessun blocco prova a fare due cose. La home è il punto di ingresso più importante: deve far capire **cosa siamo, perché siamo diversi, e dove andare** in 90 secondi di scroll.

### Architettura — 9 tile sequenziali

1. Hero (95vh) — chi siamo + prima azione
2. Tile Iyengar (70vh) — pratica principale 1
3. Tile Ashtanga (70vh) — pratica principale 2
4. Tile Flow (70vh) — pratica complementare
5. Tile Quiz (60vh) — helper di scelta
6. Tile Tribù (80vh) — manifesto + "non siamo questo"
7. Tile Eventi (60vh) — vetrina prossimo evento
8. Tile Testimonianza (60vh) — social proof
9. CTA finale (60vh) — chiusura

### Struttura completa

#### 4.14.1 Tile 1 — Hero (95vh)

```
[Background: video silenzioso loop o foto grande dello studio in pratica]
[Overlay scuro: rgba(0,0,0,0.4)]

[Allineato sinistra, max-width 900px, padding sinistro 64px desktop / 24px mobile]
[Verticalmente centrato]

[Tag white]: STUDIO YOGA · CASSOLA VENETO

[Spacing 16px]

[Headline grande, New York serif 80px desktop / 48px mobile, white, line-height 1.1]
Non vendiamo lezioni.
Vendiamo come ci si 
sente dopo.

[Spacing 32px]

[Sotto-headline white, Inter 18px line-height 1.5, max-width 600px]
Iyengar, Ashtanga e Flow — tre pratiche tradizionali, 
insegnanti formati per anni, una tribù vera.

[Spacing 40px]

[2 CTA in fila]
[Primaria, button bg white text #9c9a66, padding 16px 32px, weight 500]
Prenota la prima lezione →
[Secondaria, testuale white, underline animato]
Quale pratica fa per te? →
[Link primario: WhatsApp prima lezione]
[Link secondario: /quiz]
```

**Comportamento:**
- Su scroll, il video/foto rimane fermo, contenuto fade-out lieve
- Headline animata: fade-in + slide-up 16px su page load, 600ms ease-out
- Mobile: hero 80vh, foto statica (no video per performance), headline 44px

#### 4.14.2 Tile 2 — Iyengar (70vh)

```
[Background: foto grande Iyengar — dettaglio precisione, mani, mattoncini]
[Overlay molto leggero: rgba(0,0,0,0.25) — più chiaro dell'hero]

[Layout asimmetrico: contenuto allineato a destra desktop, max-width 600px]
[Mobile: contenuto centrato, padding 24px]

[Tag white]: IYENGAR · PRATICA PRINCIPALE

[Headline white, New York serif 56px desktop / 36px mobile, italic]
Per il corpo che ha 
bisogno di precisione.

[Sotto-headline white]
Una pratica tradizionale che risolve dolori reali — 
schiena, spalle, ginocchia — con tecniche precise.

[CTA testuale white underline]: Scopri Iyengar →
[Link: /corsi/iyengar]
```

**Cliccabilità:** tutta la tile è cliccabile come fallback → `/corsi/iyengar`.

#### 4.14.3 Tile 3 — Ashtanga (70vh)

```
[Background: foto Ashtanga — atmosferica, intensa, sudore vero]
[Overlay: rgba(0,0,0,0.45) — più scuro per intensità]

[Layout: contenuto allineato a sinistra, max-width 600px]

[Tag white]: ASHTANGA · PRATICA PRINCIPALE

[Headline white, New York serif italic 56px / 36px mobile]
Per chi cerca un posto 
a cui tornare ogni giorno.

[Sotto-headline white]
Una pratica antica che restituisce silenzio interiore, 
crescita fisica e mentale.

[CTA testuale white]: Scopri Ashtanga →
```

**Note:** alternanza visiva — Iyengar a destra, Ashtanga a sinistra. Crea ritmo.

#### 4.14.4 Tile 4 — Flow (70vh)

```
[Background: foto Flow — luce, leggerezza, movimento]
[Overlay leggero: rgba(0,0,0,0.25)]

[Layout: contenuto centrato, max-width 700px]

[Tag white]: FLOW · PRATICA COMPLEMENTARE

[Headline white, New York italic]
Un'ora in cui smetti di pensare.

[Sotto-headline white]
Pratica fresca, sempre diversa. Movimento, respiro, niente 
pensieri per un'ora.

[CTA testuale white]: Scopri Flow →
```

#### 4.14.5 Tile 5 — Quiz helper (60vh)

```
[Background: #f9f5f0, padding 128px 0]

[Centrato, max-width 700px]

[Tag piccolo]: NON SAI DA DOVE INIZIARE?

[Headline]: 
Cinque domande, 
sessanta secondi.

[Sotto-headline, Inter 17px]
Iyengar, Ashtanga o Flow? Te lo diciamo noi, in base a 
quello che cerchi.

[Spacing 32px]

[CTA pulsante grande, bg #9c9a66 text white, padding 16px 40px]
Fai il test →
[Link: /quiz]

[Spacing 16px]

[Microcopy 13px color #6b6b6b]
Oppure scrivici su WhatsApp — rispondiamo entro un'ora.
[Link "su WhatsApp" → wa.me/393287675966]
```

#### 4.14.6 Tile 6 — Tribù (manifesto, 80vh)

```
[Background: #faf8f5, padding 160px 0]

[Container]

[Tag]: LA NOSTRA IDENTITÀ

[Headline grande]: 
Cominciamo da quello 
che non siamo.

[Spacing 64px]

[Layout 2 colonne 50/50, gap 64px]

COL SINISTRA — COSA NON SIAMO:
[Lista, ogni voce padding-y 16px, divider 1px #e8e4df sotto]

✗ Non siamo una palestra.
✗ Non siamo yoga estetico da social.
✗ Non siamo per chi cerca la moda.
✗ Non siamo "uno studio di rilassamento".

COL DESTRA — COSA SIAMO:
[Lista parallela]

✓ Siamo uno studio professionale.
✓ Siamo per chi vuole risolvere problemi reali.
✓ Siamo insegnanti formati per anni.
✓ Siamo una tribù — l'amicizia è parte della pratica.

[Spacing 64px, centrato]

[CTA testuale]: Scopri di più su di noi →
[Link: /chi-siamo]
```

**Specifiche visive:**
- Voci "non siamo": Inter 18px, color #6b6b6b
- Voci "siamo": Inter 18px, color #2a2a2a, weight 500
- Icone ✗ e ✓: 16px, color rispettivamente #c95a4a (sbiadito) e #9c9a66

#### 4.14.7 Tile 7 — Eventi (60vh)

```
[Background: foto grande Estate in Villa o evento — atmosferica]
[Overlay: rgba(0,0,0,0.4)]

[Allineato sinistra, max-width 700px]

[Tag white]: PROSSIMO EVENTO

[Headline white, New York italic]
Estate in Villa.
Una settimana sotto il porticato.

[Sotto-headline white]
[PLACEHOLDER date] · [PLACEHOLDER location]

[CTA white]: Scopri →
[Link: /eventi/estate-in-villa]
```

**Comportamento dinamico:**
- Mostra il prossimo evento più rilevante in calendario
- Logica priorità: Estate in Villa (se prossima) > Ritiri (se prossimi) > Workshop (se prossimi)
- Se nessun evento programmato, mostra Estate in Villa edizione passata con tag "Iscrizioni 2026 in arrivo"

#### 4.14.8 Tile 8 — Testimonianza (60vh)

```
[Background: #f9f5f0, padding 128px 0]

[Centrato, max-width 800px]

[Citazione, New York serif italic 36px desktop / 26px mobile, line-height 1.4]

"[PLACEHOLDER — testimonianza forte. Esempio:]
Avevo dolori cervicali da tre anni. 
Avevo provato fisioterapia, osteopatia, 
integratori. Dopo due mesi di Iyengar 
sono spariti. Ma quello che mi tiene qui 
non è solo questo — è sentirmi 
finalmente a casa nel mio corpo."

[Spacing 32px]

[Foto cerchio 80px + nome]
Marco, 47 anni
Pratica Iyengar dal 2024
```

⚠️ PLACEHOLDER: testimonianza reale + foto + consenso firmato.

#### 4.14.9 Tile 9 — CTA finale (60vh)

```
[Background: #9c9a66, text white, padding 128px 0]

[Centrato, max-width 700px]

[Headline grande white]: 
Comincia da una sola lezione.

[Sotto-headline white]
Prima lezione di prova a 10€. Senza abbonamenti, senza fretta.

[Spacing 40px]

[CTA grande, button bg white text #9c9a66, padding 18px 48px]
Prenota la prima lezione →
[Link WhatsApp]

[Spacing 20px]

[Microcopy white opacity 0.85]: 
Risposta entro 1 ora · Cancellabile fino a 24h prima
```

---

## 4.15 PAGINA `/quiz`

### Funzione
Helper di scelta per chi non sa quale stile fa per lui. 5 domande, sistema scoring, 3 risultati possibili (Iyengar, Ashtanga, Flow).

### Implementazione
**Custom HTML/JS, NON Typeform.** Implementazione vanilla in un componente Astro con script inline. State management con un oggetto JS.

### Struttura

#### 4.15.1 Layout container

```
[Background: #f9f5f0, full screen, padding 64px 0]

[Centrato, max-width 800px, padding laterale 24px]

[Container quiz: background white, border-radius 16px, padding 64px, box-shadow var(--shadow-md)]
[Mobile: padding 32px 24px, border-radius 12px]
```

#### 4.15.2 Schermata intro (step 0)

```
[Tag]: QUIZ

[Headline, New York serif 40px / 28px mobile]
Quale pratica fa per te?

[Sotto-headline, Inter 16px line-height 1.6]
5 domande. Sessanta secondi. 
Ti diciamo da dove iniziare il tuo percorso.

[Spacing 48px]

[CTA grande, bg #9c9a66 text white, full-width, padding 16px]
Inizia →

[Spacing 16px, centrato]

[Microcopy 13px color #6b6b6b]
Nessun dato salvato · Niente email · Solo curiosità onesta
```

#### 4.15.3 Schermata domanda (step 1-5)

```
[Progress bar in alto, 4px height, color #9c9a66 su track #e8e4df]
[Larghezza riempita: (step / 5) * 100%]

[Spacing 32px]

[Label, Inter 13px uppercase color #6b6b6b]
DOMANDA [N] DI 5

[Spacing 16px]

[Domanda, New York serif 32px / 24px mobile, line-height 1.3]
[Testo della domanda]

[Spacing 40px]

[Lista opzioni risposta, gap 12px]

[Ogni opzione è un button:]
- Padding: 20px
- Border: 1px #e8e4df
- Border-radius: 8px
- Background: transparent
- Text-align: left
- Font: Inter 16px line-height 1.4
- Hover: border #9c9a66, background #faf8f5
- Cursor: pointer

[Click opzione → animazione check-mark 200ms, poi passa a domanda successiva 400ms dopo]

[Footer del quiz]
[Spacing 32px]

[Layout: bottone "Indietro" sinistra, contatore destra]

← Indietro                                          [N] / 5

[Bottone Indietro: Inter 14px color #6b6b6b, hover #9c9a66]
[Disabilitato a step 1]
```

#### 4.15.4 Le 5 domande con scoring

Ogni risposta assegna punti a uno o più stili. A fine quiz, lo stile con più punti vince. In caso di pareggio (probabilità bassa), priorità Iyengar > Ashtanga > Flow.

**DOMANDA 1**
```
Cosa cerchi principalmente nello yoga?

A) Risolvere dolori fisici (schiena, spalle, ginocchia)
   → Iyengar +3

B) Una disciplina costante a cui tornare ogni giorno
   → Ashtanga +3

C) Un'ora per smettere di pensare e muovermi
   → Flow +3

D) Non lo so ancora, voglio scoprire
   → Iyengar +1, Ashtanga +1, Flow +1
```

**DOMANDA 2**
```
Quanti anni hai?

A) 18-30
   → Flow +2, Ashtanga +2

B) 30-45
   → Iyengar +1, Ashtanga +2, Flow +2

C) 45-60
   → Iyengar +3, Ashtanga +1

D) 60+
   → Iyengar +3 (con preferenza Soft)
```

**DOMANDA 3**
```
Hai dolori fisici cronici?

A) Sì, schiena/cervicale/spalle
   → Iyengar +3

B) Sì, ma legati a sport
   → Iyengar +2, Ashtanga +1

C) Niente di significativo, solo qualche tensione
   → Iyengar +1, Flow +2, Ashtanga +1

D) No, sto bene fisicamente
   → Flow +2, Ashtanga +2
```

**DOMANDA 4**
```
Quanto sei costante nelle abitudini?

A) Molto. Quando inizio qualcosa, la porto avanti
   → Ashtanga +3

B) Mi piace la varietà, mi annoio facilmente
   → Flow +3

C) Dipende dai periodi
   → Iyengar +2, Flow +1

D) Sto cercando proprio questo: costanza
   → Ashtanga +2, Iyengar +1
```

**DOMANDA 5**
```
Cosa ti spaventa di più dello yoga?

A) Sentirmi imbranato/a perché non sono flessibile
   → Iyengar +2 (perché è precisione, non flessibilità), 
   Flow +1

B) La parte spirituale forzata, le cose strane
   → Iyengar +2, Ashtanga +2, Flow +1 
   (tutti e 3 sono pratici, ma Flow ha meno struttura)

C) L'impegno fisico, ho paura di non farcela
   → Iyengar Soft +3, Flow +1

D) Niente, sono curioso/a
   → Iyengar +1, Ashtanga +1, Flow +1
```

#### 4.15.5 Logica di scoring (JS)

```javascript
const scores = { iyengar: 0, ashtanga: 0, flow: 0 };

// Per ogni risposta selezionata, somma punti agli stili
// es. dopo D1 risposta A: scores.iyengar += 3

// A fine quiz:
const ranked = Object.entries(scores)
  .sort((a, b) => b[1] - a[1]);

const winner = ranked[0][0]; // 'iyengar' | 'ashtanga' | 'flow'
const second = ranked[1][0];
const gap = ranked[0][1] - ranked[1][1];

// Se gap molto piccolo (<=2), mostra secondario nella schermata risultato
const showAlternative = gap <= 2;
```

#### 4.15.6 Schermata risultato

3 schermate diverse in base allo stile vincitore. Layout simile, contenuto diverso.

**RISULTATO IYENGAR:**

```
[Tag, color #9c9a66]: IL TUO STILE

[Headline, New York 48px]
Iyengar fa per te.

[Sotto-headline, Inter 17px line-height 1.6]
Sei una persona che cerca precisione, vuole capire il proprio 
corpo, e ha pazienza per costruire qualcosa di duraturo. Iyengar 
è la pratica che ti serve.

[Spacing 32px]

[Mini-info]: 
PERCHÉ TI SI ADDICE
[3 punti basati sulle risposte, generati dinamicamente. Esempio:]
• Hai cercato di risolvere dolori fisici → Iyengar è terapeutico
• Apprezzi la struttura → Iyengar è strutturato
• [terzo punto basato su risposta]

[Spacing 32px]

[CTA primaria]: Prenota una prima lezione di Iyengar →
[Link WhatsApp Iyengar]

[Spacing 16px]

[CTA secondaria testuale]: Approfondisci sulla pagina Iyengar →
[Link: /corsi/iyengar]

[Sezione "Vorresti provare anche..."] (mostrata solo se gap piccolo)
[Spacing 32px]

[Divider sottile]

[Heading 14px uppercase]: VORRESTI PROVARE ANCHE
[Mini-card stile secondario]: 
[Tag stile] · [Headline corsa] · [CTA testuale]
```

**RISULTATO ASHTANGA:**

```
[Tag, color #7a6b5f]: IL TUO STILE

[Headline]: Ashtanga fa per te.

[Sotto-headline]
Sei una persona che cerca disciplina, costanza, un posto a cui 
tornare ogni giorno. Ashtanga è la pratica che ti renderà 
diverso nel tempo.

[3 punti dinamici]
[CTA primaria Ashtanga]
[CTA secondaria pagina Ashtanga]
[Eventuale alternativa]
```

**RISULTATO FLOW:**

```
[Tag, color #b8a68e]: IL TUO STILE

[Headline]: Flow fa per te.

[Sotto-headline]
Cerchi movimento, libertà, varietà. Flow è la pratica più 
accessibile per iniziare e la più dinamica per restare.

[3 punti dinamici]
[CTA primaria Flow]
[CTA secondaria pagina Flow]
[Eventuale alternativa]
```

#### 4.15.7 Footer schermata risultato

```
[Spacing 64px, divider sottile]

[Heading]: Hai dubbi? Parliamone.

[Body 15px]
Se non sei convinto del risultato, scrivici su WhatsApp e ti 
aiutiamo a scegliere in base alla tua situazione specifica. 
Niente pressioni.

[CTA testuale]: Scrivici su WhatsApp →

[Spacing 24px, allineato a sinistra]

[Bottone "Rifai il quiz" con icona refresh, color #6b6b6b 14px]
↻ Rifai il quiz
```

#### 4.15.8 State management (no localStorage)

**IMPORTANTE:** non si usa localStorage (vincolo ambiente). State in memoria, perso al refresh:

```javascript
const state = {
  step: 0, // 0 = intro, 1-5 = domande, 6 = risultato
  answers: [], // array di risposte selezionate
  scores: { iyengar: 0, ashtanga: 0, flow: 0 }
};

// Funzioni:
// - nextStep(answer) → calcola scores, va alla prossima
// - prevStep() → torna indietro, ricalcola
// - resetQuiz() → torna a step 0, scores azzerati
// - showResult() → calcola winner, render schermata
```

**Note:** se l'utente ricarica la pagina, ricomincia da capo. Comportamento accettabile dato che il quiz è breve.

---

## 4.16 PAGINA `/contatti`

### Struttura

#### 4.16.1 Hero (35vh)

```
[Background: #f9f5f0, padding 96px 0]

[Centrato]

[Tag]: CONTATTI

[Headline, New York 48px / 32px mobile]
Scrivici. 
Rispondiamo entro un'ora.

[Sotto-headline]
Domande sui corsi, gli abbonamenti, i ritiri. 
O semplicemente per dirci ciao.
```

#### 4.16.2 Griglia 4 box info contatti

```
[Background: #f9f5f0, padding 64px 0 96px 0]

[Container]

[Griglia 4 colonne desktop, 2x2 tablet, 1 mobile, gap 24px]
```

**Anatomia box info:**

```
┌──────────────────────────┐
│  Padding 32px            │
│  Background white        │
│  Border 1px #e8e4df      │
│  Border-radius 8px       │
│  Hover: border #9c9a66,  │
│         lift 4px         │
│                          │
│  [Icona 32px #9c9a66]    │
│                          │
│  TELEFONO                │  ← Inter 12px uppercase
│                          │
│  +39 328 767 5966        │  ← Inter 18px medium
│                          │
│  Per dirci ciao,         │  ← Inter 14px color #6b6b6b
│  fissare una lezione     │
│  o chiedere info.        │
│                          │
│  Chiama →                │  ← CTA testuale
│                          │
└──────────────────────────┘
```

**Le 4 box:**

**BOX 1 — TELEFONO**
- Icona: telefono linea
- Heading: TELEFONO
- Info: +39 328 767 5966
- Description: Per dirci ciao, fissare una lezione o chiedere info.
- CTA: Chiama →
- Link: `tel:+393287675966`

**BOX 2 — WHATSAPP**
- Icona: whatsapp linea (o messaggio)
- Heading: WHATSAPP
- Info: Risposta entro 1 ora
- Description: Il modo più veloce per parlarci. Scrivi quando vuoi.
- CTA: Apri WhatsApp →
- Link: `https://wa.me/393287675966`

**BOX 3 — INDIRIZZO**
- Icona: pin posizione linea
- Heading: STUDIO
- Info: Via Giuseppe Mazzini 1
- Description: 36022 Cassola Veneto, Italia · Parcheggio gratuito
- CTA: Apri in mappe →
- Link: Google Maps con indirizzo

**BOX 4 — SOCIAL**
- Icona: link/social
- Heading: SEGUICI
- Info: @yoga__tribu
- Description: Storie dello studio, contenuti utili, vita di tribù.
- CTA: Vai su Instagram →
- Link: `https://instagram.com/yoga__tribu`

#### 4.16.3 Mappa

```
[Background: #faf8f5, padding 96px 0]

[Container, max-width 1280px]

[Tag]: COME ARRIVARE

[Headline]: Lo studio si trova qui.

[Spacing 48px]

[Embed Google Maps, larghezza 100%, altezza 480px desktop / 320px mobile]
[Border-radius 8px]
[Indirizzo: Via Giuseppe Mazzini 1, 36022 Cassola Veneto]

[Spacing 32px]

[Layout 2 colonne desktop, 1 mobile]

COL SINISTRA — IN AUTO:
[Heading 14px uppercase]: IN AUTO
[Inter 15px line-height 1.6]
Parcheggio gratuito disponibile davanti allo studio. 
Da Bassano del Grappa: 10 minuti.
Da Vicenza: 30 minuti.
Da Padova: 45 minuti.

COL DESTRA — IN BICI:
[Heading]: IN BICI
[Body]
Cassola è collegata da piste ciclabili. 
Rastrelliera dedicata davanti allo studio.
```

**Note:** se la posizione esatta dello studio è diversa, l'utente correggerà i tempi. Servono come placeholder/riferimento.

#### 4.16.4 Form di contatto (semplice)

```
[Background: #f9f5f0, padding 96px 0]

[Container, max-width 700px]

[Tag]: FORM

[Headline]: O scrivici qui.

[Sotto-headline]
Per richieste più articolate. Ti rispondiamo via email entro 24h.

[Spacing 48px]

[Form, layout colonna verticale, gap 24px]
```

**Campi form:**

```
[Campo Nome]
Label: NOME
Input: Inter 16px, padding 14px 16px, border 1px #e8e4df, 
       border-radius 4px, focus border #9c9a66

[Campo Email]
Label: EMAIL
Type: email
Required

[Campo Telefono] (opzionale)
Label: TELEFONO (OPZIONALE)
Type: tel

[Campo Argomento (select)]
Label: DI COSA VUOI PARLARCI?
Opzioni:
- Una prima lezione
- Abbonamenti
- Lezioni private
- Eventi e ritiri
- Altro

[Campo Messaggio (textarea)]
Label: IL TUO MESSAGGIO
Min height: 140px

[Spacing 16px]

[Checkbox privacy obbligatoria]
☐ Ho letto la Privacy Policy e acconsento al trattamento dei 
miei dati per essere ricontattato/a.
[Link "Privacy Policy" → /privacy]

[Spacing 24px]

[Bottone submit, full-width, bg #9c9a66 text white, padding 16px]
Invia messaggio →

[Microcopy 13px color #6b6b6b sotto il bottone]
Per risposte più rapide, scrivici su WhatsApp.
```

**Implementazione tecnica form:**
- Action: server-side endpoint (Astro endpoint o servizio esterno tipo Formspree/Netlify Forms in fase iniziale)
- Validazione client-side: email valida, campi required, checkbox privacy required
- Validazione server-side obbligatoria
- Anti-spam: honeypot field nascosto + rate limit
- Conferma post-submit: messaggio inline "Grazie! Ti risponderemo presto." (no redirect a pagina separata)

⚠️ **NOTA SICUREZZA:** in fase di setup, configurare l'endpoint per inviare a un'email reale. Mai esporre l'email destinazione in HTML. Usare variabili d'ambiente.

#### 4.16.5 Sezione orari studio

```
[Background: #faf8f5, padding 64px 0]

[Container, max-width 700px centrato]

[Tag]: QUANDO SIAMO IN STUDIO

[Headline]: Orari di apertura.

[Spacing 32px]

[Layout 2 colonne 50/50, gap 32px]

COL SINISTRA:
[Heading 13px uppercase]: GIORNI E ORARI

LUN-VEN  7:00 – 21:00
SAB      8:00 – 12:00
DOM      17:00 – 19:00

COL DESTRA:
[Heading 13px uppercase]: COME RAGGIUNGERCI

Via Giuseppe Mazzini 1
36022 Cassola Veneto

📞 +39 328 767 5966
💬 wa.me/393287675966
```

**Note:** verificare orari esatti di apertura studio con l'utente. Quelli sopra sono ricavati dagli orari lezioni.

#### 4.16.6 CTA finale

```
[Background: #9c9a66, text white, padding 96px 0]

[Centrato]

[Headline]: Il modo più veloce per parlarci.

[Sotto-headline]
WhatsApp. Risposta entro un'ora.

[CTA grande, bg white text #9c9a66]
Apri WhatsApp →
[Link: wa.me/393287675966]
```

---

## 4.17 PAGINA `/404`

### Filosofia
Tono coerente con il brand — diretto, senza fronzoli, leggera ironia.

### Struttura

```
[Background: #f9f5f0, full screen, centrato verticalmente e orizzontalmente]

[Container, max-width 600px, padding 32px, centrato]

[Numero 404 grande, New York serif italic 120px desktop / 80px mobile, color #9c9a66]
404

[Spacing 24px]

[Headline, New York 36px / 28px mobile]
Hai trovato una porta 
che non esiste.

[Spacing 16px]

[Sotto-headline, Inter 16px line-height 1.6]
La pagina che cercavi è stata spostata, eliminata, 
o forse non è mai esistita.

[Spacing 40px]

[3 link suggeriti, layout colonna verticale, gap 16px]

→ Torna alla home
[Link: /]

→ Esplora i corsi
[Link: /corsi]

→ Scrivici su WhatsApp
[Link: WhatsApp]

[Spacing 32px]

[Microcopy, Inter 13px italic color #6b6b6b]
"Quando torni al respiro, sai sempre dove sei."
```

---

## 5. SISTEMA DI BOOKING (WHATSAPP)

### 5.1 Filosofia

Niente sistema di booking online proprio (no Stripe, no calendar widgets, no account utente). Tutto passa per WhatsApp con messaggi precompilati. Vantaggi: zero attrito tecnico, conversione altissima, contatto umano dal primo touch.

### 5.2 Implementazione tecnica

**Pattern URL WhatsApp:**
```
https://wa.me/393287675966?text=[messaggio_url_encoded]
```

**Componente Astro suggerito:** `WhatsAppLink.astro`
```astro
---
const { messaggio, classe = "" } = Astro.props;
const numero = "393287675966";
const testoEncoded = encodeURIComponent(messaggio);
const href = `https://wa.me/${numero}?text=${testoEncoded}`;
---
<a href={href} target="_blank" rel="noopener noreferrer" class={classe}>
  <slot />
</a>
```

**Uso:**
```astro
<WhatsAppLink messaggio="Ciao! Vorrei prenotare la prima lezione di Iyengar.">
  Prenota la prima lezione →
</WhatsAppLink>
```

### 5.3 Messaggi precompilati per contesto

**Mappatura completa CTA → messaggio:**

```javascript
const messaggi = {
  // PRIMA LEZIONE GENERICA (CTA generiche, hero homepage, footer)
  primaLezioneGenerica: 
    "Ciao! Vorrei prenotare la prima lezione di prova a 10€.",
  
  // PRIMA LEZIONE PER STILE (CTA su pagine corso specifiche)
  primaLezioneIyengar: 
    "Ciao! Vorrei prenotare una prima lezione di Iyengar.",
  primaLezioneAshtanga: 
    "Ciao! Vorrei prenotare una prima lezione di Ashtanga.",
  primaLezioneFlow: 
    "Ciao! Vorrei prenotare una prima lezione di Flow.",
  primaLezioneTeen: 
    "Ciao! Vorrei informazioni su Teen Yoga.",
  
  // LEZIONI SPECIFICHE PER LIVELLO IYENGAR (CTA sui tab livelli)
  iyengarL1: 
    "Ciao! Vorrei prenotare una lezione di Iyengar Livello 1.",
  iyengarL2: 
    "Ciao! Vorrei prenotare una lezione di Iyengar Livello 2.",
  iyengarL3: 
    "Ciao! Vorrei prenotare una lezione di Iyengar Livello 3.",
  iyengarSoft: 
    "Ciao! Vorrei prenotare una lezione di Iyengar Soft.",
  
  // ASHTANGA SPECIFICHE
  ashtangaGuidata: 
    "Ciao! Vorrei prenotare una lezione di Ashtanga Guidata.",
  ashtangaMysore: 
    "Ciao! Vorrei prenotare una sessione di Ashtanga Mysore.",
  
  // ABBONAMENTI (CTA sulle card abbonamento)
  abbonamentoDropIn: 
    "Ciao! Vorrei acquistare una lezione singola.",
  abbonamento10: 
    "Ciao! Vorrei acquistare il pacchetto da 10 lezioni.",
  abbonamento20: 
    "Ciao! Vorrei acquistare il pacchetto da 20 lezioni.",
  
  // PRIVATE
  privataIndividuale: 
    "Ciao! Vorrei richiedere una lezione privata individuale.",
  privataDuo: 
    "Ciao! Vorrei richiedere una lezione privata per 2 persone.",
  privataTrio: 
    "Ciao! Vorrei richiedere una lezione privata per 3 persone.",
  privataGruppo: 
    "Ciao! Vorrei richiedere una lezione privata per 4 persone.",
  
  // AIUTO E CONSULENZA
  aiutoSceltaPiano: 
    "Ciao! Mi aiutate a scegliere il piano abbonamento giusto?",
  aiutoSceltaStile: 
    "Ciao! Vorrei aiuto per scegliere lo stile giusto per me.",
  
  // EVENTI
  prenotazioneEstateInVilla: 
    "Ciao! Vorrei prenotare un posto per Estate in Villa.",
  infoRitiri: 
    "Ciao! Vorrei informazioni sui prossimi ritiri.",
  
  // CONTATTO GENERICO
  generico: 
    "Ciao! Vorrei delle informazioni.",
};
```

**Per orari (modal cella griglia):** generare dinamicamente il messaggio
```javascript
function generaMessaggioLezione(stile, tipo, giorno, ora) {
  return `Ciao! Vorrei prenotare la lezione di ${stile} ${tipo} di ${giorno} alle ${ora}.`;
}
// Esempio: "Ciao! Vorrei prenotare la lezione di Iyengar Livello 2 di Lunedì alle 18:00."
```

**Per workshop (CTA pagina workshop):** generare con titolo workshop
```javascript
function generaMessaggioWorkshop(titoloWorkshop) {
  return `Ciao! Vorrei iscrivermi al workshop "${titoloWorkshop}".`;
}
```

### 5.4 Tracking conversioni (opzionale, fase 2)

In fase iniziale, no tracking specifico. In fase 2, considerare:
- Click event su CTA WhatsApp → invio evento Google Analytics 4
- Etichetta evento: `whatsapp_click_[contesto]` (es. `whatsapp_click_homepage_hero`)
- Implementare con `data-track` attribute sui link e listener globale.

---

## 6. PREZZI E LISTINI

### 6.1 Prezzi finali (fonte di verità)

**LEZIONI IN STUDIO:**

| Prodotto | Prezzo | Costo/lezione | Validità | Note |
|---|---|---|---|---|
| Prima lezione di prova | 10€ | 10€ | — | Una sola, per nuovi clienti |
| Lezione singola (drop-in) | 20€ | 20€ | — | Per chi pratica saltuariamente |
| Pacchetto 10 lezioni | 150€ | 15€ | 4 mesi | Per chi pratica 1x/sett |
| Pacchetto 20 lezioni ⭐ | 240€ | 12€ | 5 mesi | Più scelto, per chi pratica 2x/sett |

**LEZIONI PRIVATE:**

| Prodotto | Prezzo | Costo/persona | Note |
|---|---|---|---|
| Privata individuale | 45€ | 45€ | 1 persona, ~60 min |
| Privata duo ⭐ | 80€ | 40€ | 2 persone, più scelto |
| Privata trio | 105€ | 35€ | 3 persone |
| Privata gruppo (4) | 120€ | 30€ | 4 persone |

**WORKSHOP:**

| Tipo | Prezzo standard | Sconto abbonati |
|---|---|---|
| Workshop Deep Dive (3h) | 45€ | -20% (36€) |

**EVENTI:**

| Evento | Prezzo |
|---|---|
| Estate in Villa | [PLACEHOLDER — da definire] |
| Ritiri | [PLACEHOLDER — variabile] |

### 6.2 Note operative sui prezzi

- **Pagamento:** carta o contanti in studio. No online payment in fase 1.
- **Conferma:** dopo richiesta WhatsApp, lo studio conferma il pagamento al primo arrivo in studio o concorda accordi diversi caso per caso.
- **Sospensione pacchetti:** fino a 30 giorni per imprevisti (malattia, infortunio). Si comunica via WhatsApp.
- **Upgrade pacchetti:** si può passare da 10 a 20 lezioni pagando la differenza (90€).
- **Voucher regalo:** disponibili su richiesta WhatsApp.

### 6.3 Strategia di pricing display

**Sempre mostrare:**
- Prezzo totale del pacchetto (es. "150€")
- Prezzo per lezione sotto, color #6b6b6b (es. "15€ a lezione")
- Validità (es. "Validità 4 mesi")

**Sul pacchetto 20:**
- Badge "⭐ PIÙ SCELTO"
- Indicatore risparmio: "Risparmi 40%" rispetto al drop-in (color #c95a4a)
- Beneficio esclusivo evidenziato: "Priorità prenotazione"

**Mai mostrare:**
- Prezzi barrati con sconti finti
- Countdown urgenza falsa
- Bullet "anche tu puoi..." stile guru

---

## 7. DATI INSEGNANTI (PLACEHOLDER)

⚠️ **IMPORTANTE:** tutti i dati sotto sono placeholder. L'utente li sostituirà con dati reali. Le strutture sotto servono come schema per i file di contenuto.

### 7.1 Glenda

```yaml
nome: "Glenda"
slug: "glenda"
ruolo: "Fondatrice"
stili: ["iyengar", "ashtanga"]
foto_principale: "/images/insegnanti/glenda-portrait.jpg"
foto_lezione: "/images/insegnanti/glenda-pratica.jpg"
anno_inizio_insegnamento: "[PLACEHOLDER]"
citazione: "[PLACEHOLDER — citazione personale]"
bio_breve: "[PLACEHOLDER — 1-2 frasi per card]"
bio_completa: |
  [PLACEHOLDER — 5-6 paragrafi narrativi]
filosofia: |
  [PLACEHOLDER — 3-4 paragrafi sulla sua filosofia]
certificazioni:
  - "[PLACEHOLDER — Es. Certified Iyengar Yoga Teacher (CIYT)]"
  - "[PLACEHOLDER]"
  - "[PLACEHOLDER]"
corsi_che_tiene:
  iyengar:
    - "Lunedì 7:00 (L2)"
    - "Lunedì 8:45 (L1)"
    - "Lunedì 18:00 (L2)"
    - "Lunedì 19:30 (L2)"
    - "Martedì 8:45 (Soft)"
    - "Martedì 13:00 (L3)"
    - "Mercoledì 8:45 (L1)"
    - "Mercoledì 18:00 (L2)"
    - "Mercoledì 19:30 (L2)"
    - "Giovedì 13:00 (L3)"
  # Verificare se Glenda insegna anche Ashtanga: in base agli orari forniti, no.
  # Se sì, aggiungere qui.
```

### 7.2 Giulia

```yaml
nome: "Giulia"
slug: "giulia"
stili: ["flow"]
anno_inizio_insegnamento: "[PLACEHOLDER]"
citazione: "[PLACEHOLDER]"
bio_breve: "[PLACEHOLDER]"
bio_completa: |
  [PLACEHOLDER — 4 paragrafi]
filosofia: |
  [PLACEHOLDER — 2-3 paragrafi]
certificazioni:
  - "[PLACEHOLDER]"
  - "[PLACEHOLDER]"
corsi_che_tiene:
  flow:
    - "Mercoledì 7:30"
    - "Sabato 10:30"
    - "Domenica 17:30"
```

### 7.3 Victor

```yaml
nome: "Victor"
slug: "victor"
stili: ["ashtanga"]
anno_inizio_insegnamento: "[PLACEHOLDER]"
citazione: "[PLACEHOLDER]"
bio_breve: "[PLACEHOLDER]"
bio_completa: |
  [PLACEHOLDER — 4 paragrafi]
filosofia: |
  [PLACEHOLDER]
certificazioni:
  - "[PLACEHOLDER]"
  - "[PLACEHOLDER]"
corsi_che_tiene:
  ashtanga:
    guidata:
      - "Martedì 19:00"
      - "Giovedì 19:00"
    mysore:
      - "Martedì 17:30"
      - "Giovedì 17:30"
      - "Venerdì 7:00"
      - "Sabato 8:30"
```

### 7.4 [Teen — nome da recuperare]

```yaml
nome: "[PLACEHOLDER]"
slug: "teen"
stili: ["teen"]
anno_inizio_insegnamento: "[PLACEHOLDER]"
citazione: "[PLACEHOLDER]"
bio_breve: "[PLACEHOLDER]"
bio_completa: |
  [PLACEHOLDER — 4 paragrafi, tono adatto a leggibilità per genitori e adolescenti]
filosofia: |
  [PLACEHOLDER]
certificazioni:
  - "[PLACEHOLDER]"
corsi_che_tiene:
  teen:
    - "Mercoledì 16:30"
```

⚠️ **AZIONE RICHIESTA UTENTE:**
1. Recuperare nome dell'insegnante Teen Yoga
2. Compilare tutte le bio (Glenda lunga, altri 3 più brevi)
3. Verificare se Glenda insegna ANCHE Ashtanga oltre a Iyengar
4. Recuperare anni di inizio insegnamento per ciascuno
5. Compilare certificazioni reali
6. Fornire foto reali (formato 4:5 verticale, qualità alta)
## 8. SEO E SCHEMA.ORG

### 8.1 Strategia SEO generale

**Obiettivi:**
- Posizionamento locale per "yoga Cassola Veneto", "yoga Bassano del Grappa"
- Posizionamento per "Iyengar yoga Veneto", "Ashtanga yoga Veneto" (basso volume, alta intent)
- Posizionamento AI: ottimizzare per essere citati da ChatGPT, Claude, Perplexity quando qualcuno chiede "studio yoga di qualità a [zona]"

### 8.2 Meta tag globali (BaseLayout.astro)

```html
<head>
  <!-- Charset e viewport -->
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
  <!-- Title (sovrascritto per pagina) -->
  <title>{title} | Yoga Tribù</title>
  
  <!-- Description (sovrascritta per pagina) -->
  <meta name="description" content={description} />
  
  <!-- Canonical -->
  <link rel="canonical" href={canonicalUrl} />
  
  <!-- Lingua -->
  <html lang="it">
  
  <!-- Open Graph -->
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:type" content="website" />
  <meta property="og:url" content={canonicalUrl} />
  <meta property="og:image" content={ogImage} />
  <meta property="og:locale" content="it_IT" />
  <meta property="og:site_name" content="Yoga Tribù" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={ogImage} />
  
  <!-- Robots -->
  <meta name="robots" content="index, follow" />
  
  <!-- Favicon -->
  <link rel="icon" type="image/png" href="/favicon.png" />
  
  <!-- Theme color -->
  <meta name="theme-color" content="#9c9a66" />
</head>
```

### 8.3 Meta description specifiche per pagina

| Pagina | Title | Description (max 155 caratteri) |
|---|---|---|
| `/` | Yoga Tribù — Studio yoga professionale a Cassola Veneto | Studio yoga a Cassola Veneto. Iyengar, Ashtanga, Flow con insegnanti certificati. Risolvi dolori reali con pratica tradizionale. |
| `/corsi` | I corsi — Yoga Tribù | Iyengar, Ashtanga, Flow e Teen Yoga a Cassola Veneto. Trova lo stile giusto per la fase di vita in cui sei. |
| `/corsi/iyengar` | Iyengar Yoga a Cassola Veneto — Yoga Tribù | Pratica tradizionale Iyengar con insegnanti certificati. Risolvi dolori cronici di schiena, spalle, ginocchia con tecnica precisa. |
| `/corsi/ashtanga` | Ashtanga Yoga a Cassola Veneto — Yoga Tribù | Ashtanga Vinyasa Yoga, Guidata e Mysore. Pratica costante per disciplina, forza e silenzio interiore. |
| `/corsi/flow` | Flow Yoga a Cassola Veneto — Yoga Tribù | Flow Yoga: pratica fluida e sempre diversa. Movimento, respiro, libertà — un'ora per smettere di pensare. |
| `/corsi/teen-yoga` | Teen Yoga per adolescenti — Yoga Tribù | Yoga per ragazzi e ragazze tra i 12 e 17 anni. Gestione dello stress, postura, concentrazione in un ambiente protetto. |
| `/abbonamenti` | Abbonamenti e prezzi — Yoga Tribù | Prima lezione 10€, pacchetti da 10 e 20 lezioni, lezioni private. Tutti gli stili, nessun vincolo annuale. |
| `/orari` | Orari delle lezioni — Yoga Tribù | Lezioni di yoga a Cassola Veneto ogni giorno della settimana. Iyengar, Ashtanga, Flow — mattina e sera. |
| `/chi-siamo` | Chi siamo — Yoga Tribù | Studio yoga a Cassola Veneto. Insegnanti formati per anni in Iyengar, Ashtanga e Flow. Una tribù vera, non una palestra. |
| `/insegnanti/glenda` | Glenda — Insegnante Iyengar e Ashtanga — Yoga Tribù | [PLACEHOLDER — basato su bio reale] |
| `/insegnanti/giulia` | Giulia — Insegnante Flow — Yoga Tribù | [PLACEHOLDER] |
| `/insegnanti/victor` | Victor — Insegnante Ashtanga — Yoga Tribù | [PLACEHOLDER] |
| `/insegnanti/teen` | [PLACEHOLDER] — Insegnante Teen Yoga — Yoga Tribù | [PLACEHOLDER] |
| `/eventi` | Eventi e ritiri — Yoga Tribù | Estate in Villa, ritiri, workshop mensili. Esperienze yoga immersive a Cassola Veneto e in Italia. |
| `/eventi/estate-in-villa` | Estate in Villa 2026 — Yoga Tribù | Una settimana di pratica yoga sotto il porticato di una villa. Iyengar, Ashtanga, Flow e meditazione all'aperto. |
| `/quiz` | Quale yoga fa per te? — Yoga Tribù | Quiz: 5 domande, 60 secondi. Scopri quale stile yoga è giusto per te tra Iyengar, Ashtanga e Flow. |
| `/contatti` | Contatti — Yoga Tribù | Studio yoga a Cassola Veneto. Telefono, WhatsApp, email, indirizzo. Risposta entro un'ora. |

### 8.4 Schema.org JSON-LD

#### LocalBusiness (in tutte le pagine, in head)

```json
{
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "HealthClub", "ExerciseGym"],
  "name": "Yoga Tribù",
  "image": "https://yogatribu.it/og-image.jpg",
  "logo": "https://yogatribu.it/logo.png",
  "url": "https://yogatribu.it",
  "telephone": "+39 328 767 5966",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Via Giuseppe Mazzini 1",
    "addressLocality": "Cassola",
    "addressRegion": "VI",
    "postalCode": "36022",
    "addressCountry": "IT"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "[PLACEHOLDER LATITUDE]",
    "longitude": "[PLACEHOLDER LONGITUDE]"
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "07:00",
      "closes": "21:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Saturday",
      "opens": "08:00",
      "closes": "12:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": "Sunday",
      "opens": "17:00",
      "closes": "19:00"
    }
  ],
  "priceRange": "€€",
  "sameAs": [
    "https://instagram.com/yoga__tribu",
    "https://facebook.com/yogatribu"
  ],
  "description": "Studio yoga professionale a Cassola Veneto. Iyengar, Ashtanga e Flow con insegnanti certificati e formati per anni nel metodo specifico."
}
```

⚠️ Compilare lat/lng dopo il deploy.

#### Course schema (su pagine corso)

```json
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "Iyengar Yoga",
  "description": "Pratica yoga tradizionale focalizzata su precisione, allineamento e applicazioni terapeutiche...",
  "provider": {
    "@type": "Organization",
    "name": "Yoga Tribù",
    "sameAs": "https://yogatribu.it"
  },
  "courseMode": "in-person",
  "educationalLevel": "Beginner|Intermediate|Advanced",
  "hasCourseInstance": {
    "@type": "CourseInstance",
    "courseMode": "in-person",
    "location": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "Via Giuseppe Mazzini 1",
        "addressLocality": "Cassola",
        "postalCode": "36022",
        "addressCountry": "IT"
      }
    }
  },
  "offers": {
    "@type": "Offer",
    "price": "10.00",
    "priceCurrency": "EUR",
    "category": "Prima lezione di prova",
    "availability": "https://schema.org/InStock"
  }
}
```

#### Person schema (su pagine insegnante)

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Glenda [Cognome]",
  "jobTitle": "Yoga Teacher · Founder",
  "worksFor": {
    "@type": "Organization",
    "name": "Yoga Tribù"
  },
  "image": "https://yogatribu.it/images/insegnanti/glenda.jpg",
  "description": "[PLACEHOLDER bio]",
  "knowsAbout": ["Iyengar Yoga", "Ashtanga Yoga"]
}
```

#### Event schema (su pagine evento)

```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Estate in Villa 2026",
  "description": "Una settimana di pratica yoga immersiva...",
  "startDate": "[PLACEHOLDER ISO date]",
  "endDate": "[PLACEHOLDER ISO date]",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "location": {
    "@type": "Place",
    "name": "[PLACEHOLDER nome villa]",
    "address": "[PLACEHOLDER]"
  },
  "organizer": {
    "@type": "Organization",
    "name": "Yoga Tribù",
    "url": "https://yogatribu.it"
  },
  "offers": {
    "@type": "Offer",
    "price": "[PLACEHOLDER]",
    "priceCurrency": "EUR",
    "availability": "https://schema.org/InStock",
    "validFrom": "[PLACEHOLDER]"
  },
  "image": "https://yogatribu.it/images/eventi/estate-villa-2026.jpg"
}
```

#### FAQPage schema (su pagine con FAQ)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Posso fare Iyengar se ho un'ernia?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "La maggior parte dei nostri allievi viene proprio per questo..."
      }
    }
    // ... altre FAQ
  ]
}
```

### 8.5 Sitemap.xml

Generato automaticamente con `@astrojs/sitemap`:

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://yogatribu.it',
  integrations: [tailwind(), sitemap()],
});
```

Il sitemap include automaticamente tutte le pagine statiche e quelle generate da content collections (workshops, ritiri).

### 8.6 robots.txt

```
# /public/robots.txt

User-agent: *
Allow: /

# Esplicita autorizzazione per AI crawler
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: CCBot
Allow: /

# Sitemap
Sitemap: https://yogatribu.it/sitemap-index.xml
```

**Razionale:** abilitare esplicitamente AI crawler aumenta la probabilità di essere citati come fonte da ChatGPT/Claude/Perplexity quando utenti chiedono "studio yoga di qualità a Cassola" o domande simili.

### 8.7 Ottimizzazioni AI search

**Pattern di scrittura per essere citati da AI:**
- Usare frasi nominali chiare ("Studio yoga a Cassola Veneto specializzato in Iyengar e Ashtanga")
- Definizioni esplicite ("Iyengar è una pratica yoga tradizionale focalizzata su...")
- Confronti chiari tra stili (l'AI tende a citare confronti)
- FAQ ben strutturate (FAQPage schema + testo Q/A)
- Date specifiche, nomi specifici, prezzi specifici (l'AI premia la specificità)

---

## 9. PERFORMANCE TARGETS

### 9.1 Lighthouse target

| Metrica | Target | Soglia minima accettabile |
|---|---|---|
| Performance | 90+ | 85 |
| Accessibility | 95+ | 90 |
| Best Practices | 95+ | 90 |
| SEO | 100 | 95 |

### 9.2 Core Web Vitals

| Metrica | Target | Soglia massima |
|---|---|---|
| LCP (Largest Contentful Paint) | <2.0s | 2.5s |
| FID (First Input Delay) | <50ms | 100ms |
| CLS (Cumulative Layout Shift) | <0.05 | 0.1 |
| INP (Interaction to Next Paint) | <150ms | 200ms |

### 9.3 Strategie di ottimizzazione

**Immagini:**
- Formato: WebP con fallback JPEG (Astro lo gestisce nativamente con `<Image />`)
- Lazy loading: tutte le immagini below the fold (`loading="lazy"`)
- Responsive images: `srcset` con almeno 3 dimensioni (mobile, tablet, desktop)
- Dimensioni esplicite: `width` e `height` sempre dichiarati per evitare CLS
- Priority loading: hero images con `loading="eager"` e `fetchpriority="high"`
- Compressione: ~80% qualità per JPEG/WebP

**Font:**
- New York: self-hosted, WOFF2, `font-display: swap`
- Inter: self-hosted (preferito) o Google Fonts con `&display=swap`
- Preload del font principale (New York) nel `<head>`:
```html
<link rel="preload" href="/fonts/NewYork.woff2" as="font" type="font/woff2" crossorigin />
```

**JS:**
- Nessuna libreria pesante (no jQuery, Lodash, Framer Motion, GSAP)
- Solo vanilla JS o Astro native
- Astro Islands per componenti interattivi (es. quiz)
- Defer/async per script non critici

**CSS:**
- Tailwind CSS purged in produzione
- Critical CSS inline in `<head>` (Astro lo fa nativamente)
- Nessun CSS framework aggiuntivo

**Caching:**
- Headers cache aggressivi su asset statici (1 anno)
- Headers cache moderati su HTML (24h con revalidation)

**Build:**
- Astro static build (no SSR per ora — sito è 99% contenuto statico)
- Pre-rendering di tutte le pagine

### 9.4 Testing checklist

- [ ] Lighthouse audit mobile + desktop (≥90)
- [ ] Test su connessione 3G simulata
- [ ] Test su iPhone SE (320px width)
- [ ] Test su iPad (768px)
- [ ] Test su desktop 1280px e 1920px
- [ ] Cross-browser: Chrome, Safari, Firefox, Edge
- [ ] Test screen reader (NVDA o VoiceOver) sulle pagine principali
- [ ] Test contrasto WCAG AA su tutti i colori
- [ ] Test tap target ≥44x44px su mobile

---

## 10. COMPONENTI ASTRO — LISTA DETTAGLIATA

### 10.1 Layout

**`src/layouts/BaseLayout.astro`**
- Props: `title`, `description`, `ogImage`, `canonicalUrl`, `schemaJsonLd` (opzionale)
- Wrapper di tutto il sito: `<Header />` + `<slot />` + `<Footer />`
- Gestisce meta tag globali, font preload, schema.org base

### 10.2 Componenti layout

**`Header.astro`** — Header sticky con stati transparente/scrolled
- Logo + nav menu + CTA prenota
- Gestisce stato scroll con vanilla JS
- Hamburger su mobile

**`MegaMenu.astro`** — Pannello mega menu desktop
- Props: `voce` (corsi | chi-siamo | abbonamenti | eventi)
- Renderizza struttura colonnare in base alla voce

**`MobileMenu.astro`** — Menu mobile full-screen overlay
- Toggle visibility con classe CSS
- Accordion espandibili per sottosezioni

**`StickyCTA.astro`** — CTA fissa in basso su mobile
- Visibile solo su pagine `/corsi/[stile]`
- Gestisce visibility con vanilla JS (scroll listener)
- Props: `messaggioWhatsapp`

**`Footer.astro`** — Footer 4 colonne con sub-footer

### 10.3 Componenti UI primari

**`Button.astro`**
- Props: `variant` (primary | secondary | outline | ghost), `size` (sm | md | lg), `href`, `external`
- Renderizza `<a>` o `<button>` in base a presenza `href`

**`Chip.astro`**
- Props: `label`, `active` (boolean), `onClick` (per interattività)
- Pillola cliccabile per filtri

**`Card.astro`**
- Generic card con padding, border, hover state
- Slot per contenuto

**`Section.astro`**
- Wrapper sezione con padding standard
- Props: `background` (default | alt | dark | accent), `narrow`, `wide`

**`Container.astro`**
- Container con max-width e padding orizzontale
- Props: `size` (default 1280px | narrow 800px | wide 1440px)

**`Tag.astro`**
- Tag uppercase piccolo (12px)
- Props: `color` (default ocra | iyengar | ashtanga | flow | teen)

**`Heading.astro`**
- Props: `level` (1-4), `serif` (boolean, default true), `italic`
- Applica scala tipografica responsive

**`Quote.astro`**
- Citazione large, italic, formattata

**`Divider.astro`**
- Linea sottile centrata, larghezza opzionale

**`Modal.astro`**
- Modal generico con backdrop e close
- Props: `open`, `onClose`, `maxWidth`
- Usato per modal cella griglia orari

**`Accordion.astro`**
- Accordion item con domanda/risposta
- Props: `question`, expandable, default closed
- Animazione max-height transition

**`Tabs.astro`**
- Sistema tab con tab list + content panels
- Usato in `/corsi/iyengar` (4 livelli) e `/corsi/ashtanga` (Guidata/Mysore)
- Props: `tabs` (array), `defaultActive`

### 10.4 Componenti contenuto

**`HeroSection.astro`** — Hero con background image + overlay + content
- Props: `image`, `tag`, `headline`, `subheadline`, `ctaPrimary`, `ctaSecondary`, `align` (left | center | right), `height` (vh)

**`ManifestoSection.astro`** — Sezione manifesto con citazione grande

**`TimelineBenefits.astro`** — Timeline 3 step orizzontale/verticale
- Props: `steps` (array di {label, headline, body})

**`CourseCard.astro`** — Card corso (usata in /corsi e altrove)
- Props: `stile`, `headline`, `descrizione`, `bullets`, `link`

**`TeacherCard.astro`** — Card insegnante medium (usata in /chi-siamo, pagine corso)
- Props: `nome`, `stili`, `annoInizio`, `citazione`, `foto`, `link`

**`TeacherCardMicro.astro`** — Versione compatta della teacher card

**`PricingCard.astro`** — Card abbonamento
- Props: `tag`, `nome`, `prezzo`, `costoLezione`, `validita`, `descrizione`, `bullets`, `featured`, `messaggioWa`

**`ScheduleGrid.astro`** — Griglia settimanale orari (desktop)
- Props: `lezioni` (array), `filtroStile`

**`ScheduleCell.astro`** — Singola cella griglia
- Props: `stile`, `tipo`, `ora`
- Click apre modal

**`ScheduleModal.astro`** — Modal dettaglio lezione

**`ScheduleMobile.astro`** — Vista mobile orari (tab giorni + lista)

**`FAQAccordion.astro`** — FAQ con array di domande
- Props: `items` (array di {question, answer})

**`TestimonialBlock.astro`** — Testimonianza con citazione + foto + nome

**`EventCard.astro`** — Card evento (Estate in Villa, Ritiri)

**`WorkshopRow.astro`** — Riga workshop in lista calendario
- Props: `data`, `titolo`, `insegnante`, `orario`, `prezzo`, `postiDisponibili`, `slug`

**`CTAFinal.astro`** — Sezione CTA finale standardizzata
- Props: `headline`, `subheadline`, `ctaPrimary`, `ctaSecondary`, `background` (default ocra)

**`ExploreOtherCourses.astro`** — "Esplora le altre pratiche" (su pagine corso)
- Props: `excludeStile` (per non mostrare la pratica corrente)

**`HowItWorksSteps.astro`** — Sezione 4 step "Come funziona"
- Props: `steps` (array)

**`WhatsAppLink.astro`** — Link WhatsApp con messaggio precompilato
- Props: `messaggio`, `classe`
- Slot per testo del link/bottone

### 10.5 Componenti interattivi (Astro Islands)

**`QuizComponent.astro`** — Quiz custom con stato JS
- Implementazione: vanilla JS in `<script>` tag con `client:load` directive
- Gestisce 5 domande, scoring, schermata risultato

**`IntentChips.astro`** — Chip interattive per filtro intent (in /corsi)
- Click chip evidenzia card corrispondente

**`PlanToggle.astro`** — Toggle In Studio / Private (in /abbonamenti)
- Switch tra 2 set di card

**`ScheduleFilters.astro`** — Filtri stile per griglia orari
- 5 chip cliccabili (Tutti, Iyengar, Ashtanga, Flow, Teen)

**`TeenToggle.astro`** — Toggle Genitore / Teen (in /corsi/teen-yoga)
- Switch contenuti dinamici basati su data-content

---

## 11. TAILWIND CONFIG

### 11.1 File `tailwind.config.cjs`

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Primari
        primary: '#9c9a66',
        secondary: '#bf9d70',
        background: '#f9f5f0',
        'background-alt': '#faf8f5',
        
        // Stili
        iyengar: '#9c9a66',
        ashtanga: '#7a6b5f',
        flow: '#b8a68e',
        teen: '#d4b5a0',
        
        // Testo
        'text-main': '#2a2a2a',
        'text-secondary': '#6b6b6b',
        
        // Funzionali
        border: '#e8e4df',
        error: '#c95a4a',
        success: '#7a9d6e',
      },
      fontFamily: {
        serif: ['"New York"', 'Cormorant Garamond', 'Playfair Display', 'EB Garamond', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      fontSize: {
        // Display
        'display': ['64px', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
        'display-mobile': ['44px', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        
        // Headings
        'h1': ['48px', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'h1-mobile': ['36px', { lineHeight: '1.2' }],
        'h2': ['36px', { lineHeight: '1.2' }],
        'h2-mobile': ['28px', { lineHeight: '1.25' }],
        'h3': ['24px', { lineHeight: '1.3' }],
        'h3-mobile': ['22px', { lineHeight: '1.3' }],
        'h4': ['20px', { lineHeight: '1.3' }],
        
        // Body
        'body': ['16px', { lineHeight: '1.6' }],
        'small': ['14px', { lineHeight: '1.5' }],
        'tiny': ['12px', { lineHeight: '1.4', letterSpacing: '0.08em' }],
      },
      spacing: {
        '5xl': '128px',
        '6xl': '160px',
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '16px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'md': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'lg': '0 12px 24px rgba(0, 0, 0, 0.10)',
        'hover': '0 8px 24px rgba(0, 0, 0, 0.12)',
      },
      transitionTimingFunction: {
        'default': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'smooth': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
      maxWidth: {
        'narrow': '800px',
        'container': '1280px',
        'wide': '1440px',
      },
    },
  },
  plugins: [],
};
```

### 11.2 CSS globale `src/styles/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* Font face declarations */
  @font-face {
    font-family: 'New York';
    src: url('/fonts/NewYork.woff2') format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: swap;
  }
  
  /* Reset bonus */
  html {
    scroll-behavior: smooth;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  body {
    @apply bg-background text-text-main font-sans;
    font-size: 16px;
    line-height: 1.6;
  }
  
  h1, h2, h3, h4 {
    @apply font-serif text-text-main;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }
  
  /* Selection */
  ::selection {
    background-color: #9c9a66;
    color: white;
  }
  
  /* Focus visible */
  :focus-visible {
    outline: 2px solid #9c9a66;
    outline-offset: 2px;
  }
  
  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}

@layer utilities {
  /* Container utility */
  .container-narrow {
    @apply max-w-narrow mx-auto px-6 md:px-8;
  }
  
  .container-default {
    @apply max-w-container mx-auto px-6 md:px-12;
  }
  
  .container-wide {
    @apply max-w-wide mx-auto px-6 md:px-12;
  }
  
  /* Section padding */
  .section-padding {
    @apply py-16 md:py-24;
  }
  
  .section-padding-large {
    @apply py-24 md:py-40;
  }
}
```

---

## 12. SETUP FONT

### 12.1 Conversione OTF → WOFF2

**Strumento consigliato:** `fonttools` (Python) o servizio web come `cloudconvert.com`.

**Comando con fonttools:**
```bash
pip install fonttools brotli
fonttools ttx -d output/ NewYork_PERSONAL_USE.otf
# oppure più semplice:
woff2_compress NewYork_PERSONAL_USE.otf
# crea NewYork_PERSONAL_USE.woff2
```

**Alternativa CLI:** `https://github.com/google/woff2`
```bash
git clone --recursive https://github.com/google/woff2.git
cd woff2
make clean all
./woff2_compress /path/to/NewYork_PERSONAL_USE.otf
```

### 12.2 Licenza font (verificata)

✅ **Licenza commerciale confermata dall'utente.** Il font New York è utilizzabile sul sito di Yoga Tribù senza restrizioni.

**Implementazione:**
```css
font-family: 'New York', 'Cormorant Garamond', 'Playfair Display', 'EB Garamond', Georgia, serif;
```

Lo stack di fallback è mantenuto come misura di sicurezza: se il file `NewYork.woff2` non si carica per qualsiasi motivo (errore di rete, cache, deploy non completato), il browser usa automaticamente il font successivo della lista, mantenendo l'aspetto serif elegante della pagina.

### 12.3 Self-hosting Inter

Per performance migliori, self-hostare Inter invece di Google Fonts:

1. Scaricare Inter da `https://rsms.me/inter/`
2. Mettere i file WOFF2 in `/public/fonts/`
3. Dichiarare in CSS:

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Medium.woff2') format('woff2');
  font-weight: 500;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-SemiBold.woff2') format('woff2');
  font-weight: 600;
  font-style: normal;
  font-display: swap;
}
```

### 12.4 Preload font critici

In `BaseLayout.astro`, dentro `<head>`:

```html
<link rel="preload" href="/fonts/NewYork.woff2" as="font" type="font/woff2" crossorigin />
<link rel="preload" href="/fonts/Inter-Regular.woff2" as="font" type="font/woff2" crossorigin />
```

Solo i font usati above-the-fold dovrebbero essere preloaded.

---

## 13. CONSIDERAZIONI LEGALI

### 13.1 Privacy Policy e Cookie Policy

**Strumento consigliato:** Iubenda (`https://www.iubenda.com`).

**Setup richiesto:**
1. Account Iubenda
2. Configurazione Privacy Policy specifica per il sito (form di contatto, Google Analytics, ecc.)
3. Configurazione Cookie Banner conforme GDPR
4. Embed degli script Iubenda nel `BaseLayout.astro`

**Pagine `/privacy` e `/cookie`:**
In fase iniziale, mettere placeholder con messaggio:
```
[Background: #f9f5f0, padding 96px 0]
[Centrato, max-width 800px]

[Headline]: Privacy Policy / Cookie Policy

[Body]
Stiamo finalizzando i contenuti legali. Per qualsiasi domanda 
riguardante il trattamento dei dati, scrivici a 
[email] o WhatsApp.
```

Sostituire con embed Iubenda quando configurato.

### 13.2 Cookie Banner

**Implementazione minima senza Iubenda (fase 1):**

Banner semplice con 3 opzioni:
- Accetta tutti
- Solo necessari
- Personalizza

⚠️ Cookie tecnici (sessione, lingua) non richiedono consenso. Cookie di analytics (Google Analytics) richiedono consenso esplicito.

**Soluzione semplice:** non installare GA in fase 1. Aggiungerlo dopo, con cookie banner appropriato.

### 13.3 GDPR per form di contatto

Il form di contatto richiede:
- Checkbox di consenso esplicito al trattamento dei dati (obbligatoria)
- Link alla Privacy Policy
- Indicazione delle finalità del trattamento (ricontatto)
- Indicazione del titolare del trattamento (Yoga Tribù + dati P.IVA)

### 13.4 P. IVA e dati fiscali

Dati fiscali Yoga Tribù confermati:
- **Intestazione legale:** Antico Glenda Francesca Romana
- **P. IVA:** 04505320244

Da inserire in:
- Footer (sub-footer): "© 2026 Yoga Tribù di Antico Glenda Francesca Romana · P. IVA 04505320244"
- Privacy Policy: indicare il titolare del trattamento con nome, cognome e P. IVA
- Email automatiche e form di contatto: come firma o indicazione titolare

### 13.5 Cessione diritti immagine

⚠️ Per ogni testimonianza con foto reale, raccogliere consenso scritto firmato per uso commerciale dell'immagine. Conservare copia firmata.

Per foto interne dello studio con persone presenti: consenso o foto in cui le persone non sono riconoscibili (back, dettagli).

---

## 14. CHECKLIST PRE-LAUNCH

### 14.1 Contenuti

- [ ] Tutte le bio insegnanti compilate (placeholder rimossi)
- [ ] Foto reali di tutti gli insegnanti (formato 4:5)
- [ ] Foto reali dello studio (almeno 8-10)
- [ ] Foto Estate in Villa (edizioni passate)
- [ ] Almeno 3 testimonianze reali con foto e consenso
- [ ] Bio completa di Glenda (5-6 paragrafi)
- [ ] Verifica nome insegnante Teen Yoga
- [ ] P. IVA 04505320244 e intestazione "Antico Glenda Francesca Romana" confermate in footer e privacy
- [ ] Email aziendale configurata e linkata
- [ ] Indirizzo Google Maps verificato
- [ ] Coordinate lat/lng inserite in Schema LocalBusiness

### 14.2 Tecnico

- [ ] Font New York: WOFF2 generato (licenza già verificata)
- [ ] Font Inter: self-hostato in `/fonts/`
- [ ] Tutti i meta tag sono compilati (title, description, OG)
- [ ] Schema.org JSON-LD su tutte le pagine principali
- [ ] sitemap.xml generato e accessibile su `/sitemap-index.xml`
- [ ] robots.txt configurato con AI bot allow
- [ ] Canonical URL impostati
- [ ] 404 page funzionante
- [ ] Form di contatto: endpoint configurato e testato
- [ ] Form: anti-spam (honeypot) attivo
- [ ] Tutti i link WhatsApp testati con messaggi precompilati
- [ ] Tutti i link interni testati (no broken links)

### 14.3 SEO

- [ ] Lighthouse SEO score = 100
- [ ] Google Search Console configurato
- [ ] Sitemap inviato a GSC
- [ ] Verifica indexability di ogni pagina (no `noindex` involontari)
- [ ] Test mobile-friendly (Google Mobile-Friendly Test)
- [ ] Test rich results (Google Rich Results Test) per Schema

### 14.4 Performance

- [ ] Lighthouse Performance ≥90 mobile
- [ ] Lighthouse Performance ≥95 desktop
- [ ] Tutte le immagini ottimizzate (WebP, responsive, lazy load)
- [ ] Font preloaded
- [ ] Cache headers configurati (1 anno per asset, 24h per HTML)
- [ ] CSS purged in produzione
- [ ] JS bundle minimo (no dipendenze pesanti)
- [ ] Test su connessione 3G simulata: pagina principale <3s

### 14.5 Accessibilità

- [ ] Lighthouse Accessibility ≥95
- [ ] Test screen reader (VoiceOver o NVDA) sulla home, /corsi/iyengar, /quiz
- [ ] Tutti i contrasti WCAG AA verificati
- [ ] Tutti gli elementi interattivi raggiungibili da tastiera
- [ ] Focus visible su tutti gli elementi interattivi
- [ ] `alt` text su tutte le immagini
- [ ] Form labels associati correttamente

### 14.6 Cross-browser e device

- [ ] Chrome (ultima versione) — desktop + mobile
- [ ] Safari (ultima versione) — desktop + mobile
- [ ] Firefox (ultima versione)
- [ ] Edge (ultima versione)
- [ ] iPhone SE (320px width) — layout integro
- [ ] iPhone standard (390px) — layout integro
- [ ] iPad (768px) — layout integro
- [ ] Desktop 1280px — layout integro
- [ ] Desktop 1920px — layout integro

### 14.7 Funzionali

- [ ] Mega menu desktop si apre/chiude con hover
- [ ] Menu mobile si apre/chiude con tap
- [ ] Sticky CTA su pagine corso si nasconde/mostra correttamente
- [ ] Toggle In Studio / Private funzionante in /abbonamenti
- [ ] Toggle Genitore / Teen funzionante in /corsi/teen-yoga
- [ ] Tab livelli Iyengar funzionante
- [ ] Tab Guidata/Mysore Ashtanga funzionante
- [ ] Filtri stile in /orari funzionano
- [ ] Click cella griglia orari apre modal
- [ ] Quiz completabile, scoring corretto, schermata risultato visualizzata
- [ ] Form di contatto: invio funziona, conferma visualizzata
- [ ] Tutti i link WhatsApp aprono correttamente con messaggio precompilato

### 14.8 Legale

- [ ] Privacy Policy attiva (Iubenda o equivalente)
- [ ] Cookie Policy attiva
- [ ] Cookie banner funzionante
- [ ] Form contatto: checkbox consenso obbligatoria
- [ ] P.IVA visibile in footer
- [ ] Footer link Privacy/Cookie funzionanti
- [ ] Tutte le foto con persone hanno consenso scritto

### 14.9 Marketing e analytics (post-launch)

- [ ] Google Analytics 4 installato (con cookie consent)
- [ ] Eventi tracciati: click WhatsApp, submit form, page views
- [ ] Google Business Profile aggiornato e collegato
- [ ] Recensioni Google Business sollecitate ai clienti più affezionati
- [ ] Instagram bio link aggiornato a yogatribu.it
- [ ] Facebook info aggiornate

### 14.10 Setup post-launch

- [ ] Backup automatici configurati
- [ ] Hosting con SSL attivo (HTTPS obbligatorio)
- [ ] Redirect www → non-www (o viceversa, scelta)
- [ ] Monitoring uptime (es. UptimeRobot)
- [ ] Log di errore monitorati (Sentry o equivalente, opzionale)

---

## FINE DEL DOCUMENTO

**Riepilogo:** questa specifica è progettata per essere costruita in 7 fasi consecutive da Claude Code. Ogni fase è autonoma ma sequenziale. Il documento copre identità, sistema visivo, navigazione, struttura di tutte le pagine, sistema booking, prezzi, dati insegnanti, SEO, performance, componenti, configurazioni tecniche e checklist pre-launch.

**Per chi costruirà:** segui l'ordine delle fasi (Sezione 0.2). Non saltare fasi, non costruire in parallelo. Ogni fase si chiude con verifica dell'utente.

**Per Yoga Tribù:** dopo il deploy iniziale, la priorità è raccogliere foto reali e bio reali per sostituire i placeholder.

**Buona pratica.**
