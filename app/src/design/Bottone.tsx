import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

// Le classi sono quelle del prototipo (.btn, .ghost, .sm, .wide): lo stile sta in src/app/prototipo.css, copia identica.
type Opzioni = { variante?: 'primario' | 'secondario'; piccolo?: boolean; larga?: boolean };

export const classeBtn = ({ variante = 'primario', piccolo = false, larga = false }: Opzioni = {}, extra = '') =>
  ['btn', variante === 'secondario' ? 'ghost' : '', piccolo ? 'sm' : '', larga ? 'wide' : '', extra].filter(Boolean).join(' ');

export function Bottone({ variante, piccolo, larga, className = '', ...resto }: ButtonHTMLAttributes<HTMLButtonElement> & Opzioni) {
  return <button type="button" className={classeBtn({ variante, piccolo, larga }, className)} {...resto} />;
}

export function LinkBottone({ variante, piccolo, larga, className = '', ...resto }: AnchorHTMLAttributes<HTMLAnchorElement> & Opzioni) {
  return <a className={classeBtn({ variante, piccolo, larga }, className)} {...resto} />;
}
