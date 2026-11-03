import type { ButtonHTMLAttributes } from 'react';

// .chip e .chip.on del prototipo.
export function Chip({ acceso = false, className = '', ...resto }: ButtonHTMLAttributes<HTMLButtonElement> & { acceso?: boolean }) {
  return <button type="button" className={`chip ${acceso ? 'on' : ''} ${className}`.trim()} {...resto} />;
}
