// Registro unico degli strumenti che usano cookie o storage non tecnico.
// Banner, loader, placeholder degli embed e tabella della Cookie Policy
// leggono tutti da qui: per aggiungere un servizio si aggiunge una voce
// in SERVICES e il suo loader in CookieBanner.astro (vedi docs/consenso-cookie.md).

// Da incrementare quando cambiano strumenti, finalità o testi in modo rilevante:
// tutti i consensi salvati con una versione diversa vengono richiesti di nuovo.
export const POLICY_VERSION = '2026-10-15';

// Durata massima di una scelta (linee guida del Garante: 6 mesi).
export const CONSENT_MAX_AGE_DAYS = 180;

export const GA_MEASUREMENT_ID = 'G-0GKQSD86CG';

// Ogni scelta viene inviata (fetch) a questo endpoint, che la conserva come
// prova del consenso: vedi api/consent.js. Vuoto = registro solo nel browser.
export const CONSENT_LOG_ENDPOINT = '/api/consent';

// Per quanto tempo il server conserva la prova di una scelta. Deve coincidere con
// il valore predefinito di RETENTION_DAYS in api/consent.js (730 giorni = 2 anni).
export const CONSENT_LOG_RETENTION_DAYS = 730;

export type CategoryId = 'necessary' | 'preferences' | 'statistics' | 'marketing';

export interface CategoryDef {
  id: CategoryId;
  label: string;
  description: string;
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: 'necessary',
    label: 'Necessari',
    description: 'Servono al funzionamento del sito e a ricordare la tua scelta. Non si possono disattivare.',
  },
  {
    id: 'preferences',
    label: 'Preferenze e contenuti esterni',
    description: 'Contenuti di terze parti incorporati nelle pagine, come la mappa.',
  },
  {
    id: 'statistics',
    label: 'Statistiche',
    description: 'Ci aiutano a capire come viene usato il sito, per migliorarlo.',
  },
  {
    id: 'marketing',
    label: 'Marketing',
    description: 'Pubblicità e remarketing.',
  },
];

export interface CookieInfo {
  name: string;
  purpose: string;
  duration: string;
}

export interface ServiceDef {
  id: string;
  category: Exclude<CategoryId, 'necessary'>;
  name: string;
  provider: string;
  purpose: string;
  cookies: CookieInfo[];
  policyUrl: string;
}

export const SERVICES: ServiceDef[] = [
  {
    id: 'ga4',
    category: 'statistics',
    name: 'Google Analytics 4',
    provider: 'Google Ireland Limited',
    purpose: 'Statistiche aggregate sulle visite e sui clic ai pulsanti WhatsApp.',
    cookies: [
      { name: '_ga', purpose: 'Distingue i visitatori in forma anonima', duration: '2 anni' },
      { name: '_ga_0GKQSD86CG', purpose: 'Mantiene lo stato della sessione', duration: '2 anni' },
    ],
    policyUrl: 'https://policies.google.com/privacy',
  },
  {
    id: 'google-maps',
    category: 'preferences',
    name: 'Google Maps',
    provider: 'Google Ireland Limited',
    purpose: 'Mappa incorporata nella pagina Contatti.',
    cookies: [
      { name: 'NID, AEC e simili', purpose: 'Preferenze e sicurezza impostate da Google quando la mappa viene caricata', duration: 'fino a 6 mesi' },
    ],
    policyUrl: 'https://policies.google.com/privacy',
  },
];

// Archiviazione tecnica propria del sito: non richiede consenso, ma va dichiarata.
export const NECESSARY_STORAGE: CookieInfo[] = [
  { name: 'yt_cookie_consent (localStorage)', purpose: 'Ricorda le tue scelte sui cookie', duration: '6 mesi' },
  { name: 'yt_cookie_consent_log (localStorage)', purpose: 'Registro locale delle tue scelte (data, versione dell\'informativa)', duration: 'ultime 25 scelte' },
  { name: 'yt_cookie_consent_pending (localStorage)', purpose: 'Coda temporanea per inviare la prova della tua scelta al nostro registro', duration: 'finché l\'invio non riesce' },
];

// Servizi senza cookie, dichiarati per trasparenza.
export const COOKIELESS_NOTES: string[] = [
  'Vercel Speed Insights misura le prestazioni delle pagine senza usare cookie e senza identificare le persone.',
  'I font sono ospitati sul nostro stesso sito, nessuna richiesta a servizi di font esterni.',
];

export const SERVICE_IDS = SERVICES.map((s) => s.id);

export function categoriesInUse(): CategoryDef[] {
  const used = new Set(SERVICES.map((s) => s.category));
  return CATEGORIES.filter((c) => c.id === 'necessary' || used.has(c.id as Exclude<CategoryId, 'necessary'>));
}

export function servicesOf(category: CategoryId): ServiceDef[] {
  return SERVICES.filter((s) => s.category === category);
}
