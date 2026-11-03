import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Icona, type NomeIcona } from '@/design/Icone';
import { LOGHI, MAIUSCOLO, type StudioId } from '@/config/tema';

// Testata e menù della vista studio, con lo stesso markup del prototipo: <header class="top">, <main class="studio">,
// <div class="sbar"><nav class="snav"> (nome lungo su computer, nome corto e icona su telefono).
export type VoceMenu = { chiave: string; nome: string; corto: string; icona: NomeIcona; soloComputer?: boolean };

export function Struttura({
  studio, voci, corrente, onScegli, children,
}: {
  studio: StudioId; voci: VoceMenu[]; corrente: string | null;
  onScegli: (chiave: string) => void; children: ReactNode;
}) {
  useEffect(() => {
    document.body.dataset.view = 'studio';
    document.documentElement.dataset.studio = studio;
  }, [studio]);
  // Indicatore che scorre sotto la voce attiva, come nella barra degli allievi (posTabPill nel prototipo).
  const barra = useRef<HTMLElement>(null);
  const pillola = useRef<HTMLSpanElement>(null);
  const primaVolta = useRef(true);
  useLayoutEffect(() => {
    const posiziona = () => {
      const b = barra.current?.querySelector<HTMLButtonElement>('button.on');
      const p = pillola.current;
      if (!b || !p || !b.offsetWidth) return;
      if (primaVolta.current) p.style.transition = 'none';
      p.style.left = `${b.offsetLeft}px`;
      p.style.width = `${b.offsetWidth}px`;
      if (primaVolta.current) {
        primaVolta.current = false;
        requestAnimationFrame(() => requestAnimationFrame(() => { p.style.transition = ''; }));
      }
    };
    posiziona();
    window.addEventListener('resize', posiziona);
    return () => window.removeEventListener('resize', posiziona);
  }, [corrente, voci]);
  return (
    <div className="demo">
      <header className="top">
        <div className="top-in">
          <span className="logo" id="brand">
            <img src={LOGHI[studio]} alt="" aria-hidden="true" />
            {MAIUSCOLO[studio]}
          </span>
        </div>
      </header>
      <main className="studio">
        <div className="studio-in" id="studio-root">
          <div className="sbar">
            <nav className="snav" ref={barra}>
              <span className="tp" ref={pillola} aria-hidden="true" />
              {voci.map((v) => (
                <button key={v.chiave} type="button" className={`${corrente === v.chiave ? 'on' : ''}${v.soloComputer ? ' desk' : ''}`} onClick={() => onScegli(v.chiave)}>
                  <Icona nome={v.icona} />
                  <span className="l-f">{v.nome}</span>
                  <span className="l-s">{v.corto}</span>
                </button>
              ))}
            </nav>
          </div>
          {children}
        </div>
      </main>
      <div className="bfade" aria-hidden="true" />
    </div>
  );
}
