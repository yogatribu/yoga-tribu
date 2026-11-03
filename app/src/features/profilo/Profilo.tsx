import { useEffect, useState } from 'react';
import * as reale from '@/data/sessione';
import { maiuscole, maiuscoleScrivendo } from '@/domain/impostazioni';
import { telefonoValido } from '@/domain/leads';

// Stesso markup di "Modifica profilo" del prototipo (.card, .fl). Per lo studio servono nome, cognome e telefono;
// l'email è quella del login e non si cambia da qui.
export function Profilo({ iniziale, onSalvato, api = reale }: { iniziale: boolean; onSalvato: (p: reale.Profilo) => void; api?: Pick<typeof reale, 'leggiProfilo' | 'salvaProfilo'> }) {
  const [p, setP] = useState<reale.Profilo | null>(null);
  const [err, setErr] = useState('');
  const [fatto, setFatto] = useState(false);
  useEffect(() => {
    void api.leggiProfilo().then(setP);
  }, [api]);
  if (p === null) return <p className="muted">Carico il profilo…</p>;
  async function salva() {
    if (!p) return;
    const nome = maiuscole(p.nome);
    const cognome = maiuscole(p.cognome);
    if (nome === '') return setErr('Scrivi il nome.');
    if (cognome === '') return setErr('Scrivi il cognome.');
    if (!telefonoValido(p.telefono)) return setErr('Il numero di telefono serve allo studio, e deve essere completo.');
    const { ok } = await api.salvaProfilo({ nome, cognome, telefono: p.telefono });
    if (!ok) return setErr('Non sono riuscito a salvare. Riprova tra poco.');
    setErr('');
    setFatto(true);
    onSalvato({ ...p, nome, cognome });
  }
  return (
    <>
      <section className="card">
        <label className="fl">Nome<input value={p.nome} autoCapitalize="words" onChange={(e) => { setP({ ...p, nome: maiuscoleScrivendo(e.target.value) }); setFatto(false); }} /></label>
        <label className="fl">Cognome<input value={p.cognome} autoCapitalize="words" onChange={(e) => { setP({ ...p, cognome: maiuscoleScrivendo(e.target.value) }); setFatto(false); }} /></label>
        <label className="fl">Email<input type="email" value={p.email} disabled /></label>
        <label className="fl">Telefono (obbligatorio)<input type="tel" placeholder="Per avvisarti se cambia qualcosa" value={p.telefono} onChange={(e) => { setP({ ...p, telefono: e.target.value }); setFatto(false); }} /></label>
        <p className="muted small">L'email è quella con cui entri. Per cambiarla chiedi a chi gestisce lo studio.</p>
      </section>
      {err && <p className="note" role="alert">{err}</p>}
      {fatto && !iniziale && <p className="muted small" role="status">Salvato.</p>}
      <button type="button" className="btn wide" onClick={() => void salva()}>{iniziale ? 'Continua' : 'Salva'}</button>
    </>
  );
}
