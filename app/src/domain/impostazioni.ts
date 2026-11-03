// Regole delle Impostazioni: insegnanti e campi su misura dei contatti. Funzioni pure.

export type Insegnante = {
  id: string;
  nome: string;
  email: string | null;
  stili: string[];
  faPrivate: boolean;
  responsabile: boolean;
  privateAuto: boolean;   // conferma automatica delle lezioni private
};

export type CampoContatto = { id: string; nome: string; tipo: 'scelta' | 'testo' | 'si'; opzioni: string[] };

export type Validazione = { ok: true } | { ok: false; motivo: string };

/** Prima lettera maiuscola di ogni parola ("marta rossi" diventa "Marta Rossi"). */
export function maiuscole(testo: string): string {
  return testo.trim().replace(/\S+/g, (p) => p.charAt(0).toUpperCase() + p.slice(1));
}

export function validaNuovoInsegnante(nome: string, email: string, esistenti: readonly Pick<Insegnante, 'nome'>[]): Validazione {
  const n = maiuscole(nome).slice(0, 24);
  if (n === '') return { ok: false, motivo: 'Scrivi il nome.' };
  if (esistenti.some((e) => e.nome.toLowerCase() === n.toLowerCase())) return { ok: false, motivo: "C'è già un insegnante con questo nome." };
  if (email.trim() !== '' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return { ok: false, motivo: "L'email non sembra giusta." };
  return { ok: true };
}

/** Può essere tolto solo chi non ha più lezioni fisse: prima si assegnano a un'altra persona. */
export function puoTogliere(lezioniFisse: number): Validazione {
  return lezioniFisse > 0
    ? { ok: false, motivo: `Ha ancora ${lezioniFisse} ${lezioniFisse === 1 ? 'lezione' : 'lezioni'} in programma: assegnale a un'altra persona prima.` }
    : { ok: true };
}

/** "Schiena, Stress,  Forza" diventa ['Schiena', 'Stress', 'Forza'], senza vuoti né doppioni. */
export function leggiOpzioni(testo: string): string[] {
  const viste = new Set<string>();
  const r: string[] = [];
  for (const o of testo.split(',')) {
    const t = o.trim();
    if (t !== '' && !viste.has(t.toLowerCase())) {
      viste.add(t.toLowerCase());
      r.push(t);
    }
  }
  return r;
}

export function validaCampo(nome: string, tipo: CampoContatto['tipo'], opzioni: string, esistenti: readonly Pick<CampoContatto, 'nome'>[]): Validazione {
  if (nome.trim() === '') return { ok: false, motivo: 'Scrivi cosa vuoi chiedere.' };
  if (esistenti.some((c) => c.nome.toLowerCase() === nome.trim().toLowerCase())) return { ok: false, motivo: 'Questo campo c\'è già.' };
  if (tipo === 'scelta' && leggiOpzioni(opzioni).length < 2) return { ok: false, motivo: 'Scrivi almeno due risposte, separate da una virgola.' };
  return { ok: true };
}

/** Come maiuscole(), ma da usare mentre si scrive: non toglie gli spazi, così si può scrivere la parola dopo. */
export function maiuscoleScrivendo(testo: string): string {
  return testo.replace(/(^|[\s'’-])(\S)/g, (_, prima: string, lettera: string) => prima + lettera.toUpperCase());
}
