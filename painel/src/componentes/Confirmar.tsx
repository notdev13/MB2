import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

// Pergunta de confirmação dentro do próprio painel (no lugar do window.confirm, que alguns
// lugares onde o painel roda bloqueiam). Uso: if (!(await confirmar({ texto, acao }))) return;
interface Pergunta {
  texto: string;
  acao: string;
  perigo?: boolean;
}

const Contexto = createContext<(p: Pergunta) => Promise<boolean>>(async () => false);

export function ConfirmarProvider({ children }: { children: ReactNode }) {
  const [aberta, setAberta] = useState<(Pergunta & { responder: (ok: boolean) => void }) | null>(null);
  const confirmar = useCallback(
    (p: Pergunta) => new Promise<boolean>((responder) => setAberta({ ...p, responder })),
    [],
  );
  const responder = (ok: boolean) => {
    aberta?.responder(ok);
    setAberta(null);
  };
  return (
    <Contexto.Provider value={confirmar}>
      {children}
      {aberta && <Dialogo pergunta={aberta} aoResponder={responder} />}
    </Contexto.Provider>
  );
}

function Dialogo({ pergunta, aoResponder }: { pergunta: Pergunta; aoResponder: (ok: boolean) => void }) {
  const cancelar = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null;
    cancelar.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && aoResponder(false);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('keydown', esc);
      antes?.focus?.();
    };
  }, [aoResponder]);
  return (
    <div className="fundo centro" onClick={() => aoResponder(false)}>
      <div className="pergunta" role="alertdialog" aria-modal="true" aria-describedby="pergunta-texto"
        onClick={(e) => e.stopPropagation()}>
        <p id="pergunta-texto">{pergunta.texto}</p>
        <div className="acoes">
          <button className={'botao cheio' + (pergunta.perigo ? ' perigo' : '')} onClick={() => aoResponder(true)}>
            {pergunta.acao}
          </button>
          <button ref={cancelar} className="botao secundario cheio" onClick={() => aoResponder(false)}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

export const useConfirmar = () => useContext(Contexto);
