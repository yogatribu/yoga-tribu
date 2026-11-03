import { useState } from 'react';
import { Modale } from '@/design/Modale';
import { Chip } from '@/design/Chip';
import { linkWhatsApp } from '@/domain/messaggi';

// "Nuovo messaggio" del prototipo (composer): canale, testo modificabile, Invia. Qui "Invia" apre WhatsApp o la posta
// con il testo già scritto: il messaggio parte dall'app del telefono o del computer, non dal nostro server.
export function Compositore({
  nome, whatsapp, email, testo, onChiudi, onInviato,
}: { nome: string; whatsapp: string; email: string | null; testo: string; onChiudi: () => void; onInviato: () => void }) {
  const [canale, setCanale] = useState<'WhatsApp' | 'Email'>(whatsapp ? 'WhatsApp' : 'Email');
  const [t, setT] = useState(testo);
  const indirizzo = canale === 'WhatsApp' ? whatsapp : email ?? '';
  const href = canale === 'WhatsApp' ? linkWhatsApp(whatsapp, t) : `mailto:${email ?? ''}?body=${encodeURIComponent(t)}`;
  return (
    <Modale riga="Nuovo messaggio" titolo={`A ${nome}`} onChiudi={onChiudi}>
      <div className="chips" style={{ marginBottom: 10 }}>
        {whatsapp && <Chip acceso={canale === 'WhatsApp'} onClick={() => setCanale('WhatsApp')}>WhatsApp</Chip>}
        {email && <Chip acceso={canale === 'Email'} onClick={() => setCanale('Email')}>Email</Chip>}
      </div>
      <textarea id="msg" rows={5} value={t} onChange={(e) => setT(e.target.value)}></textarea>
      <p className="muted small">{canale === 'WhatsApp' ? `+${whatsapp}` : email} · si apre {canale === 'WhatsApp' ? 'WhatsApp' : 'la tua posta'} con il testo già scritto.</p>
      <div className="two-btn" style={{ gridTemplateColumns: 'auto auto', justifyContent: 'start' }}>
        {indirizzo
          ? <a className="btn" href={href} target="_blank" rel="noreferrer" onClick={onInviato}>Invia</a>
          : <button type="button" className="btn" disabled>Invia</button>}
        <button type="button" className="btn ghost" onClick={onChiudi}>Annulla</button>
      </div>
    </Modale>
  );
}
