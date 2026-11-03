// Importazione di un elenco di contatti incollato (da Excel, da Bookyway, dalla rubrica). Funzioni pure.
// Come nel prototipo (liParse): una persona per riga, nome e telefono in qualsiasi ordine, doppioni controllati prima di aggiungere.
import { maiuscole } from './impostazioni.ts';
import { telefonoNormalizzato, telefonoValido } from './leads.ts';

export type Esistente = { nome: string; telefono: string | null; dove: string };
export type StatoRiga = 'nuovo' | 'doppio' | 'controlla';
export type RigaImportata = { nome: string; telefono: string; fonte: string; stato: StatoRiga; perche: string; riga: string };

/** Ultime nove cifre: abbastanza per riconoscere lo stesso numero scritto con o senza prefisso. */
const chiaveTelefono = (t: string | null) => telefonoNormalizzato(t ?? '').slice(-9);

const chiaveNome = (n: string) =>
  n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim();

export function leggiElenco(testo: string, esistenti: readonly Esistente[], fonti: readonly string[]): RigaImportata[] {
  const gia = esistenti.map((e) => ({ k: chiaveTelefono(e.telefono), n: chiaveNome(e.nome), dove: e.dove }));
  const viste: { k: string; n: string }[] = [];
  const righe = testo.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
  const risultato: RigaImportata[] = [];
  righe.forEach((riga, i) => {
    const separatore = riga.includes('\t') ? '\t' : riga.includes(';') ? ';' : ',';
    const celle = riga.split(separatore).map((x) => x.trim().replace(/^"|"$/g, '')).filter((x, j) => x || j < 2);
    if (i === 0 && /nome|cognome/i.test(riga) && !/\d{6,}/.test(riga)) return; // intestazione
    const eFonte = (x: string) => fonti.some((f) => f.toLowerCase() === x.toLowerCase());
    const telefono = (celle.find((x) => /^[\d\s+().\/-]+$/.test(x) && /\d/.test(x)) ?? '').trim();
    const fonte = fonti.find((f) => celle.some((x) => x.toLowerCase() === f.toLowerCase())) ?? '';
    const nome = maiuscole((celle.find((x) => x && x !== telefono && !/@/.test(x) && !eFonte(x)) ?? '').toLowerCase());
    const k = chiaveTelefono(telefono);
    const n = chiaveNome(nome);
    let stato: StatoRiga = 'nuovo';
    let perche = '';
    const d = gia.find((g) => (k && g.k && g.k === k) || (n && g.n === n)) ?? null;
    const ripetuto = viste.some((g) => (k && g.k === k) || (n && g.n === n));
    if (!nome) { stato = 'controlla'; perche = 'manca il nome'; }
    else if (d) { stato = 'doppio'; perche = `già ${d.dove}`; }
    else if (ripetuto) { stato = 'doppio'; perche = "ripetuto nell'elenco"; }
    else if (telefono && !telefonoValido(telefono)) { stato = 'controlla'; perche = 'telefono incompleto'; }
    if (stato === 'nuovo') viste.push({ k, n });
    risultato.push({ nome, telefono, fonte, stato, perche, riga });
  });
  return risultato;
}
