// Studi e tema. I colori e i caratteri per studio sono in src/app/tema.css (copiati da src/config/studi.ts alla radice,
// chiave `tema`, nel formato del prototipo: variabili --t-*). Si attivano con l'attributo data-studio sulla pagina.

export type StudioId = 'tribu' | 'pozzo';

export const NOMI_STUDI: Record<StudioId, string> = {
  tribu: 'Yoga Tribù',
  pozzo: "Pozzo dell'Eternità",
};

// Come `S.maiuscolo` e `S.logo` del prototipo.
export const MAIUSCOLO: Record<StudioId, string> = {
  tribu: 'YOGA TRIBÙ',
  pozzo: "POZZO DELL'ETERNITÀ",
};

export const LOGHI_COMPLETI: Record<StudioId, string> = {
  tribu: '/logo/logo-completo-ocra.svg',
  pozzo: '/pozzo/logo/sigillo-lago.svg',
};

export const LOGHI: Record<StudioId, string> = {
  tribu: '/logo/icona-ocra.svg',
  pozzo: '/pozzo/logo/sigillo-lago.svg',
};

export function eStudioId(valore: string): valore is StudioId {
  return valore === 'tribu' || valore === 'pozzo';
}

export function applicaTema(studio: StudioId): void {
  document.documentElement.dataset.studio = studio;
}

// Colori dei cerchietti con l'iniziale, come `S.colori` del prototipo (si prende il valore numero indice % 6).
export const COLORI_AVATAR: Record<StudioId, string[]> = {
  tribu: ['#9c9a66', '#7a6b5f', '#b8a68e', '#d4b5a0', '#bf9d70', '#8c7ba0'],
  pozzo: ['#4f7a8a', '#1f4e5f', '#7ea3ad', '#1f4e5f', '#3f6573'],
};

export const COMUNITA: Record<StudioId, string> = { tribu: 'tribù', pozzo: 'comunità' };

// Foto degli insegnanti (cartella public/images/insegnanti e public/pozzo/images), come FOTO_INS del prototipo.
export const FOTO_INSEGNANTI: Record<StudioId, Record<string, string>> = {
  tribu: { Glenda: '/images/insegnanti/glenda.webp', Mattia: '/images/insegnanti/mattia.webp', Victor: '/images/insegnanti/victor.webp', Sara: '/images/insegnanti/sara.webp', Giorgia: '/images/insegnanti/giorgia.webp' },
  pozzo: { Mattia: '/pozzo/images/mattia-card.webp', Glenda: '/pozzo/images/glenda.webp' },
};

/** Gli stili che si possono assegnare a un insegnante (tutti tranne "Approfondimenti"), come impStili del prototipo. */
export const STILI_INSEGNANTI: Record<StudioId, [string, string][]> = {
  tribu: [['iyengar', 'Iyengar'], ['ashtanga', 'Ashtanga'], ['flow', 'Vinyasa'], ['teen', 'Teen Yoga'], ['kundalini', 'Kundalini']],
  pozzo: [['livello-1', 'Livello 1'], ['livello-2', 'Livello 2'], ['restorative', 'Restorative'], ['iyengar', 'Iyengar']],
};

// Frasi che cambiano da studio a studio nei messaggi (da src/config/studi.ts del sito: prova, inStudio, com).
export const TESTI_STUDIO: Record<StudioId, { provaEtichetta: string; provaPrezzo: number; inStudio: string; comunita: string }> = {
  tribu: { provaEtichetta: 'Lezione di prova', provaPrezzo: 10, inStudio: 'in Yoga Tribù', comunita: 'tribù' },
  pozzo: { provaEtichetta: 'Prima lezione', provaPrezzo: 0, inStudio: "al Pozzo dell'Eternità", comunita: 'comunità' },
};

// Prezzo delle lezioni private per numero di persone (null: non si fa con quel numero).
export const PREZZI_PRIVATE: Record<StudioId, Record<1 | 2 | 3 | 4, number | null>> = {
  tribu: { 1: 45, 2: 80, 3: 105, 4: 120 },
  pozzo: { 1: 40, 2: null, 3: null, 4: null },
};
