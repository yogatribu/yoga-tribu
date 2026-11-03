import type { ReactNode } from 'react';

// .smodal / .smodal-card del prototipo (smodalHtml): finestra con riga piccola, titolo e pulsante di chiusura.
export function Modale({ riga, titolo, onChiudi, children }: { riga: string; titolo: string; onChiudi: () => void; children: ReactNode }) {
  return (
    <div className="smodal" onClick={(e) => { if (e.target === e.currentTarget) onChiudi(); }}>
      <div className="smodal-card" role="dialog" aria-modal="true" aria-label={titolo}>
        <button type="button" className="x" aria-label="Chiudi" onClick={onChiudi}>×</button>
        <p className="eyebrow">{riga}</p>
        <h3 className="serif big wide">{titolo}</h3>
        {children}
      </div>
    </div>
  );
}
