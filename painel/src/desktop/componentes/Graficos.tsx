import { situacaoOrcamento, textoSituacao, type FatiaCategoria } from '../../dominio/calculos';
import { mesAno, porcentagem, reais } from '../../dominio/formato';

const compacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 });

// Gráficos do desktop. Dourado só nos dados; eixos e grade em linhas finas.
// Cada gráfico tem uma tabela escondida com os mesmos números, para leitor de tela.

// Colunas por mês com grade e valor no topo ao passar o mouse.
export function ColunasMes({ meses, altura = 220 }: { meses: { mes: string; total: number }[]; altura?: number }) {
  const max = Math.max(...meses.map((m) => m.total), 1);
  const passo = escalaBonita(max);
  const topo = Math.ceil(max / passo) * passo;
  const linhas = Array.from({ length: Math.round(topo / passo) + 1 }, (_, i) => i * passo).reverse();
  return (
    <>
      <div className="d-colunas" style={{ height: altura }} role="img" aria-label="Gasto por mês">
        <div className="d-eixo">
          {linhas.map((v) => <span key={v}>{compacto.format(v / 100)}</span>)}
        </div>
        <div className="d-area">
          {linhas.map((v) => <i key={v} className="d-grade" style={{ bottom: `${(v / topo) * 100}%` }} />)}
          {meses.map((m, i) => (
            <div key={m.mes} className={'d-col' + (i === meses.length - 1 ? ' atual' : '')}>
              <div className="d-barra" style={{ height: `${(m.total / topo) * 100}%` }}>
                <em>{reais(m.total)}</em>
              </div>
              <small>{mesAno(m.mes)}</small>
            </div>
          ))}
        </div>
      </div>
      <table className="esconder">
        <caption>Gasto por mês</caption>
        <tbody>{meses.map((m) => <tr key={m.mes}><th>{mesAno(m.mes)}</th><td>{reais(m.total)}</td></tr>)}</tbody>
      </table>
    </>
  );
}

// 1, 2 ou 5 vezes uma potência de 10, para a grade cair em números redondos.
function escalaBonita(max: number): number {
  const bruto = max / 4;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const n = bruto / pot;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pot;
}

export function BarrasCategoria({ fatias }: { fatias: FatiaCategoria[] }) {
  const max = Math.max(...fatias.map((f) => f.total), 1);
  return (
    <ul className="d-barras">
      {fatias.map((f) => (
        <li key={f.categoria} title={`${f.categoria}: ${reais(f.total)}`}>
          <div className="d-barras-linha">
            <span className="categoria">{f.categoria}</span>
            <span className="d-num">{reais(f.total)}</span>
            <span className="d-pct">{Math.round(f.parte * 100)}%</span>
          </div>
          <div className="d-trilho"><i style={{ width: `${(f.total / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

// Uso do orçamento em linha: barra + percentual + faixa em texto (mesmo vocabulário do celular).
// Marcador de 80% no trilho; preenchimento animado (desligado com prefers-reduced-motion).
export function UsoOrcamento({ gasto, orcamento }: { gasto: number; orcamento: number }) {
  const faixa = situacaoOrcamento(gasto, orcamento);
  if (faixa === 'sem-orcamento') return <span className="d-apagado">sem orçamento</span>;
  const pct = porcentagem(gasto, orcamento);
  const base = textoSituacao(gasto, orcamento);
  const texto = faixa === 'folga' ? `${base} · ${pct}%` : base; // no desktop a folga também mostra o percentual
  return (
    <span className={'d-uso ' + faixa} title={`${reais(gasto)} de ${reais(orcamento)}`}>
      <span className="d-trilho" role="meter" aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={Math.min(pct, 100)} aria-valuetext={texto} aria-label="Uso do orçamento">
        <i style={{ width: `${Math.min(gasto / orcamento, 1) * 100}%` }} />
      </span>
      <span className={'d-faixa ' + faixa}>{texto}</span>
    </span>
  );
}
