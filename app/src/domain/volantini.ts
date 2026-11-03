// Generatore dei volantini: riempie i template di volantini/template con i testi e la foto scelti.
// Funzioni pure, portate dal prototipo (ctCostruisci, ctMeta, ctDaEvento, ctCarHtml). I template si passano da fuori.
// Regole: sezione "Contenuti" di .claude/skills/app-fatta-bene/riferimenti/design-e-componenti.md e volantini/DESIGN-SYSTEM.md.
import type { Evento } from './eventi.ts';

export type Templates = Record<string, string>;
export type Formato = 'post' | 'storia' | 'a4';
export type Dati = Record<string, string | number | undefined>;

export const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];

export const TIPI: readonly (readonly [string, string])[] = [
  ['approfondimento', 'Approfondimento'], ['lezione-speciale', 'Lezione speciale'], ['conferenza', 'Conferenza'], ['incontro', 'Incontro'], ['seminario', 'Seminario'],
  ['ritiro', 'Ritiro'], ['salute-femminile', 'Salute Femminile'], ['corso', 'Corso'], ['carosello', 'Carosello di foto'], ['avviso-a4', 'Avviso A4 da stampare'],
];
export const DIMENSIONI: Record<Formato, [number, number]> = { post: [1080, 1350], storia: [1080, 1920], a4: [1240, 1754] };
export const NOME_FORMATO: Record<Formato, string> = { post: 'Post 4:5', storia: 'Storia 9:16', a4: 'Foglio A4' };
const MIN_TITOLO: Record<Formato, number> = { post: 60, storia: 76, a4: 52 };

// Luminosità: da 0 (foto chiara) a 100 (foto scura). Il centro è il valore di prima ("media"). Coppie [velo, fine del gradiente].
type Scala = { min: [number, number]; media: [number, number]; max: [number, number] };
export const LUM: Scala = { min: [0, .94], media: [.24, .96], max: [.55, .98] };
const LUM_CAROSELLO: Scala = { min: [0, .84], media: [.14, .90], max: [.40, .95] };
const LUM_CAROSELLO_CTA: Scala = { min: [0, .86], media: [.16, .92], max: [.42, .96] };
const PRESET: Record<string, number> = { chiara: 20, media: 50, scura: 75 };

export function lumN(v: unknown): number {
  if (typeof v === 'number') return Math.max(0, Math.min(100, v));
  return typeof v === 'string' && v in PRESET ? PRESET[v] : 50;
}

export function lum(v: unknown, t: Scala): [string, string] {
  const s = lumN(v);
  const [a, b, u] = s < 50 ? [t.min, t.media, s / 50] as const : [t.media, t.max, (s - 50) / 50] as const;
  return [0, 1].map((i) => (a[i] + (b[i] - a[i]) * u).toFixed(3)) as [string, string];
}

const SISTEMA = ['VELO', 'GRAD_FINE', 'FOTO'];

export const TELEFONI: readonly (readonly [string, string])[] = [
  ['328 767 5966', 'Yoga Tribù'], ['347 109 8694', 'Salute Femminile (Sara)'], ['320 615 4453', 'Seminari con Ekta Ghale'], ['348 392 0767', "Pozzo dell'Eternità"],
];
export const INDIRIZZI: Record<'tribu' | 'pozzo', string> = {
  tribu: 'Studio Yoga Tribù · Via Giuseppe Mazzini 1, San Giuseppe di Cassola (VI)',
  pozzo: "Studio Pozzo dell'Eternità · Via Pontile 10, Colico (LC)",
};

type Info = [label: string, segnaposto: string, tipo: 'riga' | 'area2' | 'area3'];
const INFO: Record<string, Info> = {
  TITOLO: ['Titolo', 'Ritrovare spazio\ncon le torsioni.', 'area2'], CHI: ['Insegnante', 'con Glenda e Mattia', 'riga'], TESTO: ['Descrizione', 'Una mattinata dedicata alle torsioni...', 'area3'],
  DATA: ['Data', '18 ottobre', 'riga'], ORARIO: ['Orario', '9:00 – 11:30', 'riga'], QUOTA: ['Quota', '10€', 'riga'], OCCHIELLO: ['Sopra il titolo', 'Costiera Amalfitana', 'riga'],
  DATE: ['Date', '5-9 giugno', 'riga'], PERIODO: ['Periodo', '28-30 agosto 2026', 'riga'], SOTTOTITOLO: ['Sottotitolo', 'In vigore da settembre 2026', 'riga'],
  PARAGRAFO: ['Testo introduttivo', 'Testo di apertura del foglio', 'area3'], SEZIONE: ['Titolo della sezione', 'Quote', 'riga'], GIORNO: ['Giorno', 'Venerdì 28', 'riga'],
  MOMENTO: ['Momento', 'sera', 'riga'], SESS_ORARIO: ['Orario', '18:00 - 20:00', 'riga'], TITOLO_RIGA: ['Titolo', 'Lezione singola', 'riga'], DETTAGLIO: ['Dettaglio', 'Senza abbonamento', 'riga'], PREZZO: ['Prezzo', '15€', 'riga'],
};

export type Campo = { slot: string; label: string; ph: string; tipo: 'riga' | 'area2' | 'area3' };
export type GruppoCampi = { gruppo: string; campi: Campo[] };

export const esc = (t: unknown): string => String(t ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unesc = (t: string): string => t.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const segni = (s: string): string[] => [...new Set([...s.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map((m) => m[1]))];
const campo = (slot: string, chiave: string): Campo => { const [label, ph, tipo] = INFO[chiave] ?? [chiave, '', 'riga']; return { slot, label, ph, tipo }; };

function descrittori(lista: string[]): (Campo | GruppoCampi)[] {
  const out: (Campo | GruppoCampi)[] = [];
  const visti = new Set<string>();
  for (const sl of lista) {
    if (SISTEMA.includes(sl)) continue;
    let m: RegExpMatchArray | null;
    if ((m = sl.match(/^(GIORNO|MOMENTO|ORARIO)_(\d+)$/))) {
      const n = m[2];
      if (visti.has(`s${n}`)) continue;
      visti.add(`s${n}`);
      out.push({ gruppo: `Sessione ${n}`, campi: [campo(`GIORNO_${n}`, 'GIORNO'), campo(`MOMENTO_${n}`, 'MOMENTO'), campo(`ORARIO_${n}`, 'SESS_ORARIO')] });
    } else if ((m = sl.match(/^RIGA_(\d+)_(TITOLO|DETTAGLIO|PREZZO)$/))) {
      const n = m[1];
      if (visti.has(`r${n}`)) continue;
      visti.add(`r${n}`);
      out.push({ gruppo: `Riga ${n}`, campi: [campo(`RIGA_${n}_TITOLO`, 'TITOLO_RIGA'), campo(`RIGA_${n}_DETTAGLIO`, 'DETTAGLIO'), campo(`RIGA_${n}_PREZZO`, 'PREZZO')] });
    } else if ((m = sl.match(/^PUNTO_(\d+)$/))) out.push({ slot: sl, label: `Punto ${m[1]}`, ph: 'Frase breve', tipo: 'riga' });
    else if ((m = sl.match(/^DATA_(\d+)$/))) out.push({ slot: sl, label: `Data ${m[1]}`, ph: '5 settembre', tipo: 'riga' });
    else out.push(campo(sl, sl));
  }
  return out;
}

export const tpl = (t: Templates, tipo: string, fmt: string): string | undefined => (tipo === 'avviso-a4' ? t['a4-avviso'] : t[`${fmt}-${tipo}`]);
export const eSociale = (tipo: string): boolean => tipo !== 'avviso-a4' && tipo !== 'carosello';

export type Meta = { formati: Formato[]; campi: (Campo | GruppoCampi)[]; etichetta: string; cta: string; luogo: string; telefono: string; firma: string };

/** Cosa c'è da compilare in un tipo di volantino, e quali sono le parti fisse (quelle già scritte nel template). */
export function meta(t: Templates, tipo: string): Meta {
  const fmt = tipo === 'avviso-a4' ? 'a4' : 'post';
  const s = tpl(t, tipo, fmt) ?? '';
  const prendi = (rx: RegExp) => { const m = s.match(rx); return m ? unesc(m[1]) : ''; };
  return {
    formati: fmt === 'a4' ? ['a4'] : ['post', 'storia'], campi: descrittori(segni(s)),
    etichetta: prendi(/<div class="(?:etichetta|kicker)">([^<]*)<\/div>/), cta: prendi(/<span class="cta">([^<]*)<\/span>/), luogo: prendi(/<div class="addr">([^<]*)<\/div>/),
    telefono: prendi(/&nbsp;·&nbsp; ([^<]*)<\/div>/), firma: prendi(/<div class="firma">([^<]*)<\/div>/),
  };
}

function inHtml(slot: string, v: string): string {
  const x = esc(v).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  return slot === 'TITOLO' ? x.trim().replace(/\s*\n\s*/g, '<br>') : x.replace(/\s*\n\s*/g, ' ');
}

// Dentro l'anteprima e prima dell'esportazione: riduce il titolo finché il testo entra, poi dice com'è andata.
const FIT = `<script>
document.fonts.ready.then(function () {
  var wrap = document.querySelector('.wrap'), h1 = document.querySelector('h1');
  var top = document.querySelector('.top'), bottom = document.querySelector('.bottom');
  var min = %MIN%, social = !!bottom;
  function troppo() {
    var gap = social ? bottom.getBoundingClientRect().top - top.getBoundingClientRect().bottom : 999;
    return wrap.scrollHeight > wrap.clientHeight + 1 || gap < 40;
  }
  function righe() { var fs = parseFloat(getComputedStyle(h1).fontSize); return h1.getBoundingClientRect().height / (fs * 1.03) > 3.2; }
  var fs = parseFloat(getComputedStyle(h1).fontSize);
  if (social) { while ((troppo() || righe()) && fs > min) { fs -= 2; h1.style.fontSize = fs + 'px'; } }
  var esito = troppo() ? 'OVERFLOW' : 'OK';
  document.documentElement.setAttribute('data-esito', esito);
  try { if (parent !== window) parent.postMessage({ fit: true, esito: esito }, '*'); } catch (e) {}
});
</script>`;

export class ErroreVolantino extends Error {}

/** Il volantino finito (html) e gli avvisi da mostrare. In anteprima i campi mancanti hanno un valore di prova; esportando mancano = errore. */
export function costruisci(t: Templates, tipo: string, fmt: Formato, d: Dati, anteprima: boolean): { html: string; avvisi: string[] } {
  const avvisi: string[] = [];
  const social = tipo !== 'avviso-a4';
  const m = meta(t, tipo);
  let s = tpl(t, tipo, fmt);
  if (!s) throw new ErroreVolantino('Template mancante.');
  const vals: Record<string, string> = {};
  for (const [k, v] of Object.entries(d)) if (typeof v === 'string') vals[k] = v.trim().replace(/—/g, '–');
  if (Object.values(d).some((v) => typeof v === 'string' && v.includes('—'))) avvisi.push('Ho sostituito il trattino lungo con un trattino corto.');
  if (!vals.TITOLO) { if (anteprima) vals.TITOLO = 'Titolo del volantino'; else throw new ErroreVolantino('Manca il titolo.'); }
  if (social) {
    const foto = vals.FOTO || (anteprima ? '/images/studio.webp' : '');
    if (!foto) throw new ErroreVolantino('Scegli una foto.');
    const [velo, fine] = lum(d.LUMINOSITA, LUM);
    const x = parseInt(String(d.FOTO_X ?? 50), 10), y = parseInt(String(d.FOTO_Y ?? 40), 10);
    s = s.replace(/object-position:[^;}]*/, `object-position:${x}% ${y}%`).replace(/\{\{VELO\}\}/g, velo).replace(/\{\{GRAD_FINE\}\}/g, fine).replace('{{FOTO}}', () => foto);
  }
  const sost = (vecchio: string, nuovo: string | undefined, prima: string, dopo: string) => {
    if (nuovo && nuovo !== vecchio) s = (s as string).replace(prima + esc(vecchio) + dopo, () => prima + esc(nuovo) + dopo);
  };
  sost(m.etichetta, vals.ETICHETTA, `<div class="${social ? 'etichetta' : 'kicker'}">`, '</div>');
  sost(m.cta, vals.CTA, '<span class="cta">', '</span>');
  sost(m.luogo, vals.LUOGO, '<div class="addr">', '</div>');
  sost(m.telefono, vals.TELEFONO, '&nbsp;·&nbsp; ', '</div>');
  sost(m.firma, vals.FIRMA, '<div class="firma">', '</div>');
  for (let n = 1; n < 10; n++) if (!vals[`MOMENTO_${n}`]) s = s.replace(` · {{MOMENTO_${n}}}`, '');
  // le righe che hanno solo segni vuoti spariscono dal volantino
  s = s.split('\n').filter((riga) => {
    const usati = [...riga.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map((x) => x[1]).filter((x) => !SISTEMA.includes(x));
    return !(usati.length && usati.every((x) => !vals[x]));
  }).join('\n');
  for (const k of segni(s)) s = s.split(`{{${k}}}`).join(inHtml(k, vals[k] ?? ''));
  s = s.replace(/<ul>\s*<\/ul>/g, '').replace(/<div class="(?:dates|meta)">\s*<\/div>/g, '').replace(/<div class="sched">\s*<\/div>/g, '');
  if (/\{\{[A-Z0-9_]+\}\}/.test(s)) throw new ErroreVolantino('Restano dei campi non compilati nel template.');
  return { html: s.replace('</body>', `${FIT.replace('%MIN%', String(MIN_TITOLO[fmt]))}\n</body>`), avvisi };
}

export function slug(t: string | undefined): string {
  return (t ?? '').replace(/<[^>]+>/g, ' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'volantino';
}

// ---- Dagli eventi dell'app ai campi del volantino ----

const TIPO_DA_EVENTO: Record<string, string> = { workshop: 'approfondimento', incontro: 'incontro', seminario: 'seminario', ritiro: 'ritiro', percorso: 'salute-femminile' };
const KICKER_DA_EVENTO: Record<string, string> = { workshop: 'Approfondimento', incontro: 'Incontro', seminario: 'Seminario', ritiro: 'Ritiro', percorso: 'Salute femminile' };

const dataDi = (iso: string) => { const [a, m, g] = iso.split('-').map(Number); return { a, m: m - 1, g }; };

function periodo(e: Pick<Evento, 'da' | 'a'>): string {
  const a = dataDi(e.da);
  if (!e.a || e.a === e.da) return `${a.g} ${MESI[a.m]}`;
  const b = dataDi(e.a);
  return a.m === b.m ? `${a.g}-${b.g} ${MESI[b.m]}` : `${a.g} ${MESI[a.m]} - ${b.g} ${MESI[b.m]}`;
}

/** Tipo di volantino e campi precompilati da un evento. La foto, luminosità e inquadratura si tengono quelle già scelte. */
export function daEvento(e: Evento, attuali: Dati): { tipo: string; d: Dati } {
  const dt = dataDi(e.da);
  const ora = (e.ora ?? '').match(/(\d{1,2}):(\d{2})/);
  const prezzo = e.prezzoCent && !e.suRichiesta ? `${e.prezzoCent / 100}€` : '';
  const d: Dati = {
    LUMINOSITA: attuali.LUMINOSITA, FOTO_X: attuali.FOTO_X, FOTO_Y: attuali.FOTO_Y,
    TITOLO: e.titolo, CHI: e.insegnanti.length ? `con ${e.insegnanti.join(' e ')}` : '', TESTO: e.descrizione ?? '', QUOTA: prezzo,
    DATA: `${dt.g} ${MESI[dt.m]}`, ORARIO: ora ? `${ora[1]}:${ora[2]}` : '', PERIODO: periodo(e) + (e.tipo === 'seminario' ? ` ${dt.a}` : ''), DATE: periodo(e), OCCHIELLO: e.luogo.split(' · ').pop() ?? '',
    FOTO: e.tipo === 'ritiro' && /Marocco/.test(e.titolo) ? '/images/marocco/hero_marocco.webp' : e.tipo === 'seminario' ? '/images/seminari/rachele-di-fino-hero.webp' : '/images/studio.webp',
  };
  if (/Pozzo/.test(e.luogo)) d.LUOGO = INDIRIZZI.pozzo;
  return { tipo: TIPO_DA_EVENTO[e.tipo] ?? 'approfondimento', d };
}

// ---- Carosello di recap ----

export type SlideCarosello = { foto: string; x: number; y: number; titolo?: string; testo?: string };
export type Carosello = {
  kicker: string; titolo: string; sub: string; lum: number; sel: number; luogo: 'tribu' | 'pozzo';
  slides: SlideCarosello[]; cta: { on: boolean; titolo: string; testo: string; bottone: string; foto: string; x: number; y: number };
};
export type SlideFinale = SlideCarosello & { tipo: 'cover' | 'interna' | 'cta' };
export const MAX_SLIDE = 10;

export function nuovoCarosello(luogo: 'tribu' | 'pozzo'): Carosello {
  return {
    kicker: 'Approfondimento', titolo: 'Allineare\nla colonna.', sub: 'Una mattinata con Glenda e Mattia', lum: 50, sel: 0, luogo,
    slides: [{ foto: '/images/studio.webp', x: 50, y: 40 }, { foto: '/images/tappetino.webp', x: 50, y: 50, titolo: '', testo: '' }, { foto: '/images/props.webp', x: 50, y: 50, titolo: '', testo: '' }],
    cta: { on: false, titolo: 'La prossima volta\nci sei anche tu?', testo: 'Scrivici e ti raccontiamo quando sarà\nil prossimo appuntamento.', bottone: 'Scrivici su WhatsApp', foto: '/images/studio.webp', x: 50, y: 42 },
  };
}

export function slideCarosello(k: Carosello): SlideFinale[] {
  const out: SlideFinale[] = k.slides.map((sl, i) => ({ tipo: i === 0 ? 'cover' : 'interna', ...sl }));
  if (k.cta.on) out.push({ tipo: 'cta', foto: k.cta.foto, x: k.cta.x, y: k.cta.y });
  return out;
}

/** Copertina e luogo del carosello presi da un evento. */
export function caroselloDaEvento(k: Carosello, evento: Evento): Carosello {
  return { ...k, kicker: KICKER_DA_EVENTO[evento.tipo] ?? 'Evento', titolo: evento.titolo, sub: evento.insegnanti.length ? `Con ${evento.insegnanti.join(' e ')}` : '', luogo: /Pozzo/.test(evento.luogo) ? 'pozzo' : 'tribu' };
}

export function caroselloHtml(t: Templates, k: Carosello, i: number): string {
  const sl = slideCarosello(k)[i];
  if (!sl) throw new ErroreVolantino('Aggiungi almeno una foto.');
  const logo = '<img src="/logo/logo-completo-bianco.svg">';
  const br = (x: string) => esc(x.trim()).replace(/\s*\n\s*/g, '<br>');
  const [velo, fine] = lum(k.lum, sl.tipo === 'cta' ? LUM_CAROSELLO_CTA : LUM_CAROSELLO);
  const titolo = (sl.titolo ?? '').trim(), testo = (sl.testo ?? '').trim();
  const corpo = sl.tipo === 'cover'
    ? `<div class="cover"><div class="marchio">${logo}<div class="kicker">${esc(k.kicker.trim())}</div></div><div class="centro"><h1>${br(k.titolo || 'Titolo')}</h1>${k.sub.trim() ? `<div class="sub">${esc(k.sub.trim())}</div>` : ''}</div></div>`
    : sl.tipo === 'interna'
      ? `<div class="top">${logo}</div>${titolo || testo ? `<div class="bottom">${titolo ? `<h1>${br(titolo)}</h1>` : ''}${testo ? `<p class="testo">${br(testo)}</p>` : ''}</div>` : ''}`
      : `<div class="top">${logo}</div><div class="bottom"><h1>${br(k.cta.titolo)}</h1>${k.cta.testo.trim() ? `<p class="testo">${br(k.cta.testo)}</p>` : ''}<div><span class="cta">${esc(k.cta.bottone.trim())}</span></div><div class="addr">${esc(INDIRIZZI[k.luogo])}</div><div class="site">YOGATRIBU.IT &nbsp;·&nbsp; 328 767 5966</div></div>`;
  const base = t['carosello-recap'];
  if (!base) throw new ErroreVolantino('Template mancante.');
  return base.replace('{{OBJPOS}}', `${sl.x}% ${sl.y}%`).replace('{{VELO}}', velo).replace('{{GRAD_FINE}}', fine).replace('{{FOTO}}', () => sl.foto).replace('{{CORPO}}', () => corpo)
    .replace('</body>', '<script>document.fonts.ready.then(function(){document.documentElement.setAttribute("data-esito","OK");});</script></body>');
}

/** Il nome di una slide nei pulsanti: Copertina, numero, Chiusura. */
export const nomeSlide = (x: SlideFinale, i: number): string => (x.tipo === 'cover' ? 'Copertina' : x.tipo === 'cta' ? 'Chiusura' : String(i + 1));

