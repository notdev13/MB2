import type { ReactNode } from 'react';
import { STATUS_OBRA, type StatusObra } from '../../dominio/tipos';

// Peças básicas do design system desktop (classes "d-…" em desktop.css).

const caminhos = {
  visao: 'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 4v3h6V4z',
  obras: 'M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6',
  lancamentos: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  ajustes: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
  contas: 'M3 7h18v12H3zM3 7l2-3h14l2 3M16 13h2',
  mais: 'M12 5v14M5 12h14',
  busca: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  sol: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  lua: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  seta: 'M9 18l6-6-6-6',
  voltar: 'M15 18l-6-6 6-6',
  editar: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  acima: 'M12 19V5M6 11l6-6 6 6',
  abaixo: 'M12 5v14M6 13l6 6 6-6',
  limpar: 'M18 6L6 18M6 6l12 12',
} as const;

export type NomeIconeD = keyof typeof caminhos;

export function IconeD({ nome, tamanho = 18 }: { nome: NomeIconeD; tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={caminhos[nome]} />
    </svg>
  );
}

// Cartão com cabeçalho (título à esquerda, ação à direita).
export function Painel({ titulo, acao, children, className = '', semPadding }: {
  titulo?: ReactNode; acao?: ReactNode; children: ReactNode; className?: string; semPadding?: boolean;
}) {
  return (
    <section className={`d-painel ${className}`}>
      {(titulo || acao) && (
        <header className="d-painel-topo">
          {titulo && <h2>{titulo}</h2>}
          {acao}
        </header>
      )}
      <div className={semPadding ? '' : 'd-painel-corpo'}>{children}</div>
    </section>
  );
}

// Indicador: rótulo pequeno, número grande em serifa, detalhe embaixo.
export function Kpi({ rotulo, valor, detalhe, tom }: {
  rotulo: string; valor: ReactNode; detalhe?: ReactNode; tom?: 'alerta';
}) {
  return (
    <div className={'d-kpi' + (tom === 'alerta' ? ' alerta' : '')}>
      <span className="d-rotulo">{rotulo}</span>
      <strong className="d-kpi-valor">{valor}</strong>
      {detalhe && <span className="d-kpi-detalhe">{detalhe}</span>}
    </div>
  );
}

const CLASSE_STATUS: Record<StatusObra, string> = {
  planejamento: 'neutro', em_andamento: 'ativo', pausada: 'pendente', concluida: '',
};

export const SeloStatus = ({ status }: { status: StatusObra }) => (
  <span className={`selo ${CLASSE_STATUS[status]}`}>{STATUS_OBRA[status]}</span>
);

// Variação contra o período anterior, com seta e texto. Sem cor: gastar mais ou menos não é bom nem ruim por si.
// `rotulo` já vem com a preposição: "do mês passado".
export function Variacao({ valor, rotulo }: { valor: number | null; rotulo: string }) {
  if (valor === null) return <span className="d-variacao">sem gasto {rotulo} para comparar</span>;
  const pct = Math.round(valor * 100);
  if (pct === 0) return <span className="d-variacao">praticamente o mesmo valor {rotulo}</span>;
  return (
    <span className="d-variacao">
      <IconeD nome={pct > 0 ? 'acima' : 'abaixo'} tamanho={13} />
      {Math.abs(pct)}% {pct > 0 ? 'acima' : 'abaixo'} {rotulo}
    </span>
  );
}

export function Vazio({ titulo, texto, children }: { titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <div className="d-vazio">
      <h3>{titulo}</h3>
      {texto && <p>{texto}</p>}
      {children}
    </div>
  );
}
