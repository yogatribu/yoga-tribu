// Date come testo "AAAA-MM-GG", per evitare problemi di fuso orario.

export function aggiungiGiorni(data: string, giorni: number): string {
  const [a, m, g] = data.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1, g + giorni));
  return d.toISOString().slice(0, 10);
}

/** Data di oggi nel fuso del computer (lo studio è in Italia). */
export function oggi(adesso: Date = new Date()): string {
  const m = String(adesso.getMonth() + 1).padStart(2, '0');
  const g = String(adesso.getDate()).padStart(2, '0');
  return `${adesso.getFullYear()}-${m}-${g}`;
}

/** 0 = domenica ... 6 = sabato, come in JavaScript. */
export function giornoDellaSettimana(data: string): number {
  const [a, m, g] = data.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, g)).getUTCDay();
}

/** Il lunedì della settimana che contiene la data. */
export function lunedi(data: string): string {
  const g = giornoDellaSettimana(data);
  return aggiungiGiorni(data, g === 0 ? -6 : 1 - g);
}

export function giorniDellaSettimana(primo: string): string[] {
  return Array.from({ length: 7 }, (_, i) => aggiungiGiorni(primo, i));
}
