import type { CSSProperties } from 'react';
import { GraficoLinha } from '../../componentes/GraficoLinha';
import { corDaSerie } from '../../componentes/Graficos';
import { situacaoOrcamento, textoSituacao, type FatiaCategoria } from '../../dominio/calculos';
import { porcentagem, reais } from '../../dominio/formato';
import { agruparCategorias, barrasOrcamento } from '../../dominio/graficos';

// Gráficos do desktop: linha verde no gasto por mês, barras em cores claras (cheia = valor, tracejada = orçamento).
// Eixos e grade em linhas finas. O gráfico de linha tem uma tabela escondida com os números, para leitor de tela.

// Gasto por mês: a mesma linha do celular, com grade e valores no eixo.
export function LinhaMes({ meses, altura = 220 }: { meses: { mes: string; total: number }[]; altura?: number }) {
  return <GraficoLinha meses={meses} eixo altura={altura} />;
}

// As maiores categorias (o resto somado em "Demais"), para o quadro não crescer além do gráfico ao lado.
export function BarrasCategoria({ fatias, limite = 6 }: { fatias: FatiaCategoria[]; limite?: number }) {
  const linhas = agruparCategorias(fatias, limite);
  const max = Math.max(...linhas.map((f) => f.total), 1);
  return (
    <ul className="d-barras">
      {linhas.map((f, i) => (
        <li key={f.categoria} title={`${f.categoria}: ${reais(f.total)}`}>
          <span className="categoria">{f.categoria}</span>
          <div className="orc-linha" style={{ '--cor': corDaSerie(i) } as CSSProperties}>
            <i className="cheia" style={{ '--parte': f.total / max } as CSSProperties} />
            <span><span className="d-num">{reais(f.total)}</span> ({Math.round(f.parte * 100)}%)</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

// Uso do orçamento em linha: barra cheia (gasto) sobre a tracejada (orçamento) + faixa em texto
// (mesmo vocabulário do celular). Vermelho quando chega ao limite ou passa.
export function UsoOrcamento({ gasto, orcamento, cor = corDaSerie(0) }: { gasto: number; orcamento: number; cor?: string }) {
  const faixa = situacaoOrcamento(gasto, orcamento);
  if (faixa === 'sem-orcamento') return <span className="d-apagado">sem orçamento</span>;
  const pct = porcentagem(gasto, orcamento);
  const base = textoSituacao(gasto, orcamento);
  const texto = faixa === 'folga' ? `${base} · ${pct}%` : base; // no desktop a folga também mostra o percentual
  const b = barrasOrcamento(gasto, orcamento);
  return (
    <span className={'d-uso ' + faixa} title={`${reais(gasto)} de ${reais(orcamento)}`} style={{ '--cor': cor } as CSSProperties}>
      <span className="d-trilho" role="meter" aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={Math.min(pct, 100)} aria-valuetext={texto} aria-label="Uso do orçamento">
        <i className="cheia" style={{ width: `${b.gasto * 100}%` }} />
        <i className="tracejada" style={{ width: `${b.orcamento * 100}%` }} />
      </span>
      <span className={'d-faixa ' + faixa}>{texto}</span>
    </span>
  );
}
