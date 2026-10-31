import { useState } from 'react';
import { mesAno, reais, reaisCurto } from '../dominio/formato';
import { mesDoPico, passoDaEscala, PERIODOS, totalDoPeriodo, type Periodo } from '../dominio/graficos';
import { curvaSuave } from './curva';

const compacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });
const NOME_PERIODO: Record<Periodo, string> = { '3M': 'últimos 3 meses', '6M': 'últimos 6 meses', '1A': 'últimos 12 meses' };
const L = 1000; // largura interna do desenho; a linha estica com o cartão e o traço não engrossa

// Gasto por mês em linha suave (celular e computador): total do período, pico, ponto no último mês
// e abas de período. `eixo` liga a grade com valores (computador). Tabela escondida para leitor de tela.
export function GraficoLinha({ meses, eixo = false, altura = 150 }: {
  meses: { mes: string; total: number }[]; eixo?: boolean; altura?: number;
}) {
  const opcoes = (Object.keys(PERIODOS) as Periodo[]).filter((p) => PERIODOS[p] <= meses.length);
  const [periodo, setPeriodo] = useState<Periodo>(opcoes[opcoes.length - 1] ?? '3M');
  const vis = meses.slice(-PERIODOS[periodo]);
  const total = totalDoPeriodo(vis);
  const pico = mesDoPico(vis);
  const max = Math.max(...vis.map((m) => m.total), 1);
  const passo = passoDaEscala(max);
  const topo = eixo ? Math.ceil(max / passo) * passo : max;
  const grade = eixo ? Array.from({ length: Math.round(topo / passo) + 1 }, (_, i) => i * passo).reverse() : [];
  const folgaY = eixo ? 0 : 12;
  const c = curvaSuave(vis.map((m) => m.total), L, altura, L / (2 * vis.length), folgaY, { min: 0, max: topo });
  const pos = (i: number) => ({ left: `${(c.pontos[i][0] / L) * 100}%`, top: `${(c.pontos[i][1] / altura) * 100}%` });
  const ultimo = vis.length - 1;

  return (
    <div className={'lg' + (eixo ? ' com-eixo' : '')}>
      <div className="lg-topo">
        <span className="lg-apoio">Gasto de {mesAno(vis[0].mes)} a {mesAno(vis[ultimo].mes)}</span>
        <span className="lg-total">
          <strong>{reaisCurto(total)}</strong>
          {pico && <small>pico em {mesAno(pico)}</small>}
        </span>
      </div>
      <div className="lg-corpo">
        {eixo && <div className="lg-eixo" aria-hidden="true">{grade.map((v) => <span key={v}>{compacto.format(v / 100)}</span>)}</div>}
        <div className="lg-area" style={{ height: altura }} role="img" aria-label={`Gasto por mês, ${NOME_PERIODO[periodo]}`}>
          {grade.map((v) => <i key={v} className="lg-grade" style={{ bottom: `${(v / topo) * 100}%` }} />)}
          <svg viewBox={`0 0 ${L} ${altura}`} preserveAspectRatio="none" aria-hidden="true">
            <path d={c.d} fill="none" stroke="var(--linha)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="lg-ponto fim" style={pos(ultimo)} aria-hidden="true" />
          <div className="lg-meses">
            {vis.map((m, i) => (
              <div key={m.mes} className={'lg-mes' + (i === ultimo ? ' atual' : '')} title={`${mesAno(m.mes)}: ${reais(m.total)}`}>
                <span className="lg-ponto" style={{ top: pos(i).top }} aria-hidden="true" />
                <em style={{ top: pos(i).top }}>{reais(m.total)}</em>
                <small>{mesAno(m.mes)}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
      {opcoes.length > 1 && (
        <div className="lg-periodos" role="group" aria-label="Período do gráfico">
          {opcoes.map((p) => (
            <button key={p} type="button" aria-pressed={periodo === p} aria-label={NOME_PERIODO[p]} onClick={() => setPeriodo(p)}>{p}</button>
          ))}
        </div>
      )}
      <table className="esconder">
        <caption>Gasto por mês</caption>
        <tbody>{vis.map((m) => <tr key={m.mes}><th>{mesAno(m.mes)}</th><td>{reais(m.total)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
