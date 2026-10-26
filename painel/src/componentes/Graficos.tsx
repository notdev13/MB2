import { porcentagem, mesAno, reais, reaisCurto } from '../dominio/formato';
import type { FatiaCategoria } from '../dominio/calculos';

// Barra de uso do orçamento. Acima de 100% fica vermelha e ganha o selo "Estourou" (cor nunca sozinha).
export function BarraOrcamento({ gasto, orcamento }: { gasto: number; orcamento: number }) {
  const uso = orcamento > 0 ? gasto / orcamento : 0;
  const estourou = orcamento > 0 && gasto > orcamento;
  return (
    <div className={'trilho' + (estourou ? ' estourou' : '')} role="meter" aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={porcentagem(gasto, orcamento)} aria-label="Uso do orçamento"
      title={orcamento > 0 ? `${reais(gasto)} de ${reais(orcamento)} (${porcentagem(gasto, orcamento)}%)` : 'Sem orçamento'}>
      <i style={{ width: `${Math.min(uso, 1) * 100}%` }} />
    </div>
  );
}

// Gasto por mês: uma série só, colunas na cor de destaque; o mês atual em cor cheia.
export function GastoPorMes({ meses }: { meses: { mes: string; total: number }[] }) {
  const max = Math.max(...meses.map((m) => m.total), 1);
  return (
    <>
      <div className="colunas" role="img" aria-label="Gasto por mês">
        {meses.map((m, i) => (
          <div key={m.mes} className={'coluna' + (i === meses.length - 1 ? ' atual' : '')} title={`${mesAno(m.mes)}: ${reais(m.total)}`}>
            <i style={{ height: `${(m.total / max) * 100}%` }}>
              {i === meses.length - 1 && m.total > 0 && <em>{reaisCurto(m.total)}</em>}
            </i>
            <small>{mesAno(m.mes)}</small>
          </div>
        ))}
      </div>
      <table className="esconder">
        <caption>Gasto por mês</caption>
        <tbody>
          {meses.map((m) => (
            <tr key={m.mes}><th>{mesAno(m.mes)}</th><td>{reais(m.total)}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

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
      {linhas.map((f) => (
        <div key={f.categoria} style={{ display: 'contents' }}>
          <span className="categoria">{f.categoria}</span>
          <span className="valor">{reais(f.total)} <small className="sub">· {Math.round(f.parte * 100)}%</small></span>
          <div className="trilho" title={`${f.categoria}: ${reais(f.total)}`}>
            <i style={{ width: `${(f.total / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
