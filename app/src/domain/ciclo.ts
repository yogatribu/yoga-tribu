// Ciclo editoriale: quattro stagioni, tre temi al mese per stagione e un seminario di chiusura. Funzioni pure.
// Colori delle stagioni dal design system dei volantini (src/config/stagioni.ts del sito).

export type StagioneSlug = 'autunno' | 'inverno' | 'primavera' | 'estate';
export const STAGIONI: Record<StagioneSlug, { etichetta: string; colore: string; date: string }> = {
  autunno: { etichetta: 'Autunno', colore: '#3d2b1a', date: 'dal 22 settembre al 21 dicembre' },
  inverno: { etichetta: 'Inverno', colore: '#123241', date: 'dal 21 dicembre al 20 marzo' },
  primavera: { etichetta: 'Primavera', colore: '#3d4a12', date: 'dal 20 marzo al 21 giugno' },
  estate: { etichetta: 'Estate', colore: '#5c2a08', date: 'dal 21 giugno al 22 settembre' },
};
const STAGIONE_DEL_MESE: StagioneSlug[] = ['inverno', 'inverno', 'inverno', 'primavera', 'primavera', 'primavera', 'estate', 'estate', 'estate', 'autunno', 'autunno', 'autunno'];

export type TemaMese = { tema: string; testo: string; libro: string; autore: string; articolo: string };
export const TEMA_VUOTO: TemaMese = { tema: '', testo: '', libro: '', autore: '', articolo: '' };

/** Mese 0-11 (gennaio = 0), come getMonth() del prototipo. */
export function stagioneDelMese(mese: number): StagioneSlug {
  return STAGIONE_DEL_MESE[mese];
}

/** Chiave "AAAA-MM" di un giorno "AAAA-MM-GG". */
export function chiaveMese(giorno: string): string {
  return giorno.slice(0, 7);
}

/** Dodici mesi, a gruppi di tre per stagione, a partire dall'inizio della stagione che contiene oggi. */
export function mesiDelCiclo(oggi: string): { chiave: string; mese: number; anno: number; stagione: StagioneSlug }[][] {
  const m = Number(oggi.slice(5, 7)) - 1;
  const anno = Number(oggi.slice(0, 4));
  const partenza = [0, 3, 6, 9].filter((x) => x <= m).pop() ?? 0;
  const tutti = Array.from({ length: 12 }, (_, i) => {
    const tot = partenza + i;
    const a = anno + Math.floor(tot / 12);
    const mm = tot % 12;
    return { chiave: `${a}-${String(mm + 1).padStart(2, '0')}`, mese: mm, anno: a, stagione: stagioneDelMese(mm) };
  });
  return [0, 3, 6, 9].map((o) => tutti.slice(o, o + 3));
}

/** "Seminario d'Autunno" o "Seminario di Primavera". */
export function nomeSeminario(stagione: StagioneSlug): string {
  const e = STAGIONI[stagione].etichetta;
  return /^[aeiouàèéìòù]/i.test(e) ? `Seminario d'${e}` : `Seminario di ${e}`;
}

export function validaTema(t: TemaMese): { ok: true } | { ok: false; motivo: string } {
  if (t.tema.trim().split(/\s+/).length > 1) return { ok: false, motivo: 'Il tema è una parola sola.' };
  return { ok: true };
}
