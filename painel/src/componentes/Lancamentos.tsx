import { dataBR, mesAno, reais } from '../dominio/formato';
import type { Custo } from '../dominio/tipos';

// Lista de lançamentos agrupada por mês, do mais recente para o mais antigo.
export function Lancamentos({ custos, nomeObra, aoAbrir, agrupar = true }: {
  custos: Custo[];
  nomeObra?: (id: string) => string;
  aoAbrir: (c: Custo) => void;
  agrupar?: boolean;
}) {
  const grupos = new Map<string, Custo[]>();
  for (const c of custos) {
    const k = agrupar ? c.data.slice(0, 7) : '';
    grupos.set(k, [...(grupos.get(k) ?? []), c]);
  }
  return (
    <>
      {[...grupos.entries()].map(([mes, lista]) => (
        <div key={mes}>
          {agrupar && (
            <div className="mes"><span>{mesAno(mes)}</span><span>{reais(lista.reduce((t, c) => t + c.valor, 0))}</span></div>
          )}
          <div className="cartao" style={{ padding: '0 16px', marginTop: agrupar ? 8 : 0 }}>
            {lista.map((c) => (
              <button key={c.id} className="lanc" onClick={() => aoAbrir(c)}>
                <div>
                  <div className="desc">{c.descricao || c.categoria}</div>
                  <div className="meta">
                    {[dataBR(c.data), c.descricao ? c.categoria : '', c.fornecedor, nomeObra?.(c.obraId) ?? '']
                      .filter(Boolean).join(' · ')}
                  </div>
                </div>
                <div className="direita">
                  <span className="valor">{reais(c.valor)}</span>
                  {!c.pago && <span className="selo pendente">A pagar</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
