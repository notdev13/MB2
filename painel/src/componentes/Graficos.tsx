import type { CSSProperties } from 'react';
import { porcentagem, reais, reaisCurto } from '../dominio/formato';
import { situacaoOrcamento, textoSituacao, type FatiaCategoria } from '../dominio/calculos';
import { barrasOrcamento } from '../dominio/graficos';
import { GraficoLinha } from './GraficoLinha';

// Cores das séries (azul, amarelo, ouro, turquesa), na ordem. Só em barras e linhas, nunca em texto.
const CORES = ['var(--azul)', 'var(--amarelo)', 'var(--ouro)', 'var(--turquesa)'];
export const corDaSerie = (i: number) => CORES[i % CORES.length];

// Uso do orçamento: barra cheia (gasto) sobre barra tracejada (orçamento), cada uma com o rótulo na ponta,
// e a faixa em texto embaixo. A faixa vem do domínio (situacaoOrcamento); aqui só se desenha.
export function BarraOrcamento({ gasto, orcamento, cor = corDaSerie(0) }: { gasto: number; orcamento: number; cor?: string }) {
  const faixa = situacaoOrcamento(gasto, orcamento);
  if (faixa === 'sem-orcamento') return null; // sem orçamento não há o que comparar
  const b = barrasOrcamento(gasto, orcamento);
  const pct = porcentagem(gasto, orcamento);
  const texto = textoSituacao(gasto, orcamento);
  return (
    <div className={'orc ' + faixa} style={{ '--cor': cor } as CSSProperties}>
      <div className="orc-linha" role="meter" aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={Math.min(pct, 100)} aria-valuetext={texto} aria-label="Uso do orçamento"
        title={`${reais(gasto)} de ${reais(orcamento)} (${pct}%)`}>
        <i className="cheia" style={{ '--parte': b.gasto } as CSSProperties} />
        <span>Gasto {reaisCurto(gasto)}</span>
      </div>
      <div className="orc-linha" aria-hidden="true">
        <i className="tracejada" style={{ '--parte': b.orcamento } as CSSProperties} />
        <span>Orçamento {reaisCurto(orcamento)}</span>
      </div>
      <span className="faixa">{texto}</span>
    </div>
  );
}

// Gasto por mês: linha suave com o total do período e abas 3M / 6M / 1A.
export function GastoPorMes({ meses }: { meses: { mes: string; total: number }[] }) {
  return <GraficoLinha meses={meses} />;
}

// Para onde vai o dinheiro: uma linha por categoria, barra colorida com valor e parte na ponta.
export function PorCategoria({ fatias, limite = 6 }: { fatias: FatiaCategoria[]; limite?: number }) {
  const mostrar = fatias.slice(0, limite);
  const resto = fatias.slice(limite);
  const outros = resto.reduce((t, f) => t + f.total, 0);
  const max = Math.max(...fatias.map((f) => f.total), 1);
  const linhas = outros > 0
    ? [...mostrar, { categoria: `Demais (${resto.length})`, total: outros, parte: resto.reduce((t, f) => t + f.parte, 0) }]
    : mostrar;
  return (
    <div className="cat">
      {linhas.map((f, i) => (
        <div key={f.categoria} className="cat-item" title={`${f.categoria}: ${reais(f.total)}`}>
          <span className="categoria">{f.categoria}</span>
          <div className="orc-linha" style={{ '--cor': corDaSerie(i) } as CSSProperties}>
            <i className="cheia" style={{ '--parte': f.total / max } as CSSProperties} />
            <span>{reaisCurto(f.total)} ({Math.round(f.parte * 100)}%)</span>
          </div>
        </div>
      ))}
    </div>
  );
}
