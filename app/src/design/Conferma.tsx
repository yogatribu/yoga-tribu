import { Modale } from '@/design/Modale';

// chiedi() del prototipo: riga piccola, domanda, spiegazione, e due pulsanti. Con `pericolo` il pulsante che fa l'azione è quello rosso.
export function Conferma({
  riga, titolo, testo, ok, pericolo = false, onOk, onAnnulla,
}: { riga: string; titolo: string; testo: string; ok: string; pericolo?: boolean; onOk: () => void; onAnnulla: () => void }) {
  return (
    <Modale riga={riga} titolo={titolo} onChiudi={onAnnulla}>
      <p className="muted">{testo}</p>
      {pericolo ? (
        <>
          <button type="button" className="btn wide" onClick={onAnnulla}>Annulla</button>
          <button type="button" className="btn-del" style={{ width: '100%' }} onClick={onOk}>{ok}</button>
        </>
      ) : (
        <>
          <button type="button" className="btn wide" onClick={onOk}>{ok}</button>
          <button type="button" className="btn ghost wide" style={{ marginTop: 10 }} onClick={onAnnulla}>Annulla</button>
        </>
      )}
    </Modale>
  );
}
