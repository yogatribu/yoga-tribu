// Messaggi già scritti per chi gestisce lo studio. Li controlla e li invia a mano, su WhatsApp o email.
// Regole ferme: mai la condizione di salute di una persona, mai promesse di regali, mai scelta per genere.

export type MotivoMessaggio = 'scadenza' | 'pagamento' | 'dati' | 'compleanno' | 'anniversario' | 'libero' | 'rischio' | 'recupero';

export type ContestoMessaggio = {
  nome: string;
  comunita: string; // "tribù" o "Pozzo"
  importo?: string;
  mancanti?: string[];
  anni?: number;
};

export function primoNome(nomeCompleto: string): string {
  return nomeCompleto.trim().split(/\s+/)[0] ?? '';
}

export function testoMessaggio(motivo: MotivoMessaggio, c: ContestoMessaggio): string {
  const n = primoNome(c.nome);
  switch (motivo) {
    case 'scadenza':
      return `Ciao ${n}, il tuo pacchetto sta per finire. Se vuoi ti aiutiamo a scegliere quello giusto per continuare.`;
    case 'pagamento':
      return `Ciao ${n}, ti ricordiamo ${c.importo ?? 'quanto'} da saldare in studio. Grazie!`;
    case 'dati':
      return `Ciao ${n}! Per completare il tuo profilo ci servono ancora: ${(c.mancanti ?? []).join(', ')}. Ti bastano 30 secondi: quando passi in studio, o rispondendo qui.`;
    case 'compleanno':
      return `Auguri ${n}! Tutta la ${c.comunita} ti abbraccia.`;
    case 'anniversario':
      return `Ciao ${n}, oggi festeggiamo ${c.anni === 1 ? 'un anno' : `${c.anni} anni`} insieme. Grazie di far parte della ${c.comunita}!`;
    case 'rischio':
      return `Ciao ${n}, è un po' che non ti vediamo. Tutto bene? Ti aspettiamo in studio quando vuoi.`;
    case 'recupero':
      return `Ciao ${n}, ci manchi! Se ti va, torna a trovarci: la prima lezione ti aspetta.`;
    case 'libero':
      return '';
  }
}

export function linkWhatsApp(numero: string, testo: string): string {
  return `https://wa.me/${numero}${testo ? `?text=${encodeURIComponent(testo)}` : ''}`;
}
