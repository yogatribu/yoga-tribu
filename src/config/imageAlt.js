// Fonte unica delle descrizioni alt per le foto riutilizzate su più pagine.
// Regola: stessa foto (stesso file) → stessa descrizione ovunque.
// Modifica qui e cambia in tutto il sito.

export const IMAGE_ALT = {
  '/images/iyengar.webp': 'Pratica di Iyengar Yoga nello studio Yoga Tribù',
  '/images/ashtanga.webp': 'Pratica di Ashtanga Yoga nello studio Yoga Tribù',
  '/images/salute_femminile.webp': 'Sessione di Salute Femminile con una donna in gravidanza, Yoga Tribù',

  '/images/insegnanti/glenda.webp': 'Glenda - Insegnante di Iyengar Yoga e fondatrice di Yoga Tribù',
  '/images/insegnanti/victor.webp': 'Victor - Insegnante di Ashtanga Yoga',
  '/images/insegnanti/sara.webp': 'Sara - Insegnante di Salute Femminile',
};

// Ritorna l'alt canonico della foto; se non è mappata, usa il fallback fornito.
export function altFor(path, fallback = '') {
  return IMAGE_ALT[path] ?? fallback;
}
