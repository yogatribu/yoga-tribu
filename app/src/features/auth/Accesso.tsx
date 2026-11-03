import { useEffect, useRef, useState } from 'react';
import { CIFRE_CODICE } from '@/config/accesso';
import { LOGHI_COMPLETI } from '@/config/tema';
import { emailValida } from '@/domain/accesso';
import { inviaCodice, verificaCodice } from '@/data/sessione';
import { Icona } from '@/design/Icone';

// Stesso markup e stesse classi dell'accesso del prototipo (renderAuth: passi "email" e "code"), senza i pulsanti di prova.
export function Accesso() {
  const [passo, setPasso] = useState<'email' | 'codice'>('email');
  const [email, setEmail] = useState('');
  const [cifre, setCifre] = useState<string[]>(Array(CIFRE_CODICE).fill(''));
  const [errore, setErrore] = useState('');
  const [dettaglio, setDettaglio] = useState('');
  const [occupato, setOccupato] = useState(false);
  const caselle = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (passo === 'codice') caselle.current[0]?.focus();
  }, [passo]);

  async function mandaCodice() {
    if (!emailValida(email)) return setErrore('Scrivi un indirizzo email valido.');
    setErrore('');
    setOccupato(true);
    const { ok, nonAbilitata, dettaglio: motivo } = await inviaCodice(email);
    setOccupato(false);
    setDettaglio(motivo ?? '');
    if (nonAbilitata) return setErrore('Questa email non è abilitata. Se insegni qui, chiedi a chi gestisce lo studio di aggiungerla tra gli insegnanti.');
    if (!ok) return setErrore("Non riesco a mandare il codice. Controlla l'email o riprova tra poco.");
    setCifre(Array(CIFRE_CODICE).fill(''));
    setPasso('codice');
  }

  async function entra(valori: string[]) {
    const codice = valori.join('');
    if (codice.length < CIFRE_CODICE) return;
    setOccupato(true);
    const { ok } = await verificaCodice(email, codice);
    setOccupato(false);
    // Se va bene, onAuthStateChange porta alla schermata successiva da solo.
    if (!ok) {
      setErrore('Il codice non è giusto o è scaduto. Riprova o chiedine uno nuovo.');
      setCifre(Array(CIFRE_CODICE).fill(''));
      caselle.current[0]?.focus();
    }
  }

  function scrivi(i: number, valore: string) {
    const pulito = valore.replace(/\D/g, '');
    const prossimo = [...cifre];
    if (pulito.length > 1) {
      // codice incollato per intero
      pulito.slice(0, CIFRE_CODICE - i).split('').forEach((c, k) => { prossimo[i + k] = c; });
      setCifre(prossimo);
      caselle.current[Math.min(i + pulito.length, CIFRE_CODICE - 1)]?.focus();
      void entra(prossimo);
      return;
    }
    prossimo[i] = pulito;
    setCifre(prossimo);
    setErrore('');
    if (pulito && i < CIFRE_CODICE - 1) caselle.current[i + 1]?.focus();
    void entra(prossimo);
  }

  return (
    <div className="demo" style={{ position: 'relative', minHeight: '100vh' }}>
      <div className="auth" id="auth">
        <div style={{ width: '100%', maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {passo === 'email' ? (
            <>
              <div className="au-top"><img className="au-logo" src={LOGHI_COMPLETI.tribu} alt="Yoga Tribù" /></div>
              <h2 className="au-h">Entra nella <em>tribù.</em></h2>
              <p className="muted au-p">Scrivi la tua email: ti mandiamo un codice. Niente password da ricordare.</p>
              <input id="au-mail" className="au-in" type="email" inputMode="email" autoComplete="email" placeholder="La tua email" value={email}
                onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void mandaCodice(); }} />
              {errore && <p className="au-err">{errore}</p>}
              {dettaglio && <p className="au-legal">Dettaglio tecnico: {dettaglio}</p>}
              <button type="button" className="btn wide" disabled={occupato} onClick={() => void mandaCodice()}>{occupato ? 'Invio in corso…' : 'Continua'}</button>
            </>
          ) : (
            <>
              <button type="button" className="roundback" aria-label="Indietro" onClick={() => { setPasso('email'); setErrore(''); }}>‹</button>
              <div className="au-icon"><Icona nome="doc" /></div>
              <h2 className="au-h">Controlla la tua <em>email</em>.</h2>
              <p className="muted au-p">Abbiamo mandato un codice a <b>{email}</b>. Scrivilo qui sotto. Controlla anche nella posta indesiderata.</p>
              <div className="otp">
                {cifre.map((c, i) => (
                  <input key={i} ref={(el) => { caselle.current[i] = el; }} inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={i === 0 ? CIFRE_CODICE : 1}
                    aria-label={`Cifra ${i + 1}`} value={c} onChange={(e) => scrivi(i, e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Backspace' && !cifre[i] && i > 0) caselle.current[i - 1]?.focus(); }} />
                ))}
              </div>
              {errore && <p className="au-err" style={{ textAlign: 'center' }}>{errore}</p>}
              <button type="button" className="au-link" disabled={occupato} onClick={() => void mandaCodice()}>Rimanda il codice</button>
              <button type="button" className="au-link" onClick={() => { setPasso('email'); setErrore(''); }}>Cambia email</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
