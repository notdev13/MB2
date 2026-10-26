import { useEffect, useRef, type ReactNode } from 'react';
import { Icone } from './Icone';

// Painel que sobe de baixo da tela, para formulários.
export function Folha({ titulo, aoFechar, children }: { titulo: string; aoFechar: () => void; children: ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null);
  // Leva o foco para dentro ao abrir e devolve ao botão que abriu ao fechar.
  useEffect(() => {
    const antes = document.activeElement as HTMLElement | null;
    if (!caixa.current?.contains(document.activeElement)) caixa.current?.focus();
    return () => antes?.focus?.();
  }, []);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', esc);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', esc);
      document.body.style.overflow = anterior;
    };
  }, [aoFechar]);

  return (
    <div className="fundo" onClick={aoFechar}>
      <div ref={caixa} tabIndex={-1} className="folha" role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <div className="alca" />
        <header>
          <h1>{titulo}</h1>
          <button className="botao secundario pequeno" onClick={aoFechar} aria-label="Fechar">
            <Icone nome="fechar" tamanho={18} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
