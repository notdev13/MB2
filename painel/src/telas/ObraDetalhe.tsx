import { useState } from 'react';
import { BarraOrcamento, PorCategoria } from '../componentes/Graficos';
import { Lancamentos } from '../componentes/Lancamentos';
import { useDados } from '../dados/contexto';
import { porCategoria, resumirObra, soma } from '../dominio/calculos';
import { dataBR, porcentagem, reais, reaisCurto } from '../dominio/formato';
import { STATUS_OBRA, type Categoria, type Custo, type Obra } from '../dominio/tipos';

export function ObraDetalhe({ id, aoEditar, aoLancar, aoAbrirCusto }: {
  id: string;
  aoEditar: (o: Obra) => void;
  aoLancar: (obraId: string) => void;
  aoAbrirCusto: (c: Custo) => void;
}) {
  const { obras, custos } = useDados();
  const [categoria, setCategoria] = useState<Categoria | 'todas'>('todas');
  const [soAPagar, setSoAPagar] = useState(false);
  const obra = obras.find((o) => o.id === id);

  if (!obra) {
    return <div className="vazio cartao"><h3>Obra não encontrada</h3><a className="botao" href="#/obras">Ver obras</a></div>;
  }

  const r = resumirObra(obra, custos);
  const daObra = custos.filter((c) => c.obraId === obra.id);
  const fatias = porCategoria(daObra);
  const filtrados = daObra.filter((c) => (categoria === 'todas' || c.categoria === categoria) && (!soAPagar || !c.pago));

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <span className={'selo' + (obra.status === 'em_andamento' ? ' ativo' : obra.status === 'planejamento' ? '' : ' neutro')}>
          {STATUS_OBRA[obra.status]}
        </span>
        <h1 style={{ marginTop: 8 }}>{obra.nome}</h1>
        <p className="sub">
          {[obra.endereco, obra.cliente && `Cliente: ${obra.cliente}`].filter(Boolean).join(' · ')}
        </p>
        {(obra.inicio || obra.previsaoFim) && (
          <p className="sub">Início {dataBR(obra.inicio)} · Término previsto {dataBR(obra.previsaoFim)}</p>
        )}
      </div>

      <div className="grade">
        <div className="cartao largo destaque">
          <div className="rotulo">Gasto até agora</div>
          <div className="numero">{reais(r.gasto)}</div>
          <div className="nota">
            {obra.orcamento > 0
              ? `${porcentagem(r.gasto, obra.orcamento)}% do orçamento de ${reais(obra.orcamento)}`
              : 'Cadastre o orçamento para acompanhar o saldo.'}
          </div>
          <BarraOrcamento gasto={r.gasto} orcamento={obra.orcamento} />
          {obra.orcamento > 0 && r.saldo < 0 && (
            <div className="aviso" role="alert">⚠ Passou do orçamento em {reais(-r.saldo)}.</div>
          )}
        </div>
        <div className="cartao">
          <div className="rotulo">Saldo</div>
          <div className="numero menor">{obra.orcamento > 0 ? reaisCurto(r.saldo) : '—'}</div>
        </div>
        <div className="cartao">
          <div className="rotulo">A pagar</div>
          <div className="numero menor">{reaisCurto(r.aPagar)}</div>
        </div>
        {r.custoM2 !== null && (
          <div className="cartao largo">
            <div className="rotulo">Custo por m² até agora</div>
            <div className="numero menor">{reais(r.custoM2)}</div>
            <div className="nota">{String(obra.areaM2).replace('.', ',')} m² de área</div>
          </div>
        )}
      </div>

      <div className="acoes" style={{ flexDirection: 'row', marginTop: 14 }}>
        <button className="botao secundario" style={{ flex: 1 }} onClick={() => aoLancar(obra.id)}>+ Lançar custo</button>
        <button className="botao secundario" onClick={() => aoEditar(obra)}>Editar obra</button>
      </div>

      {obra.observacoes && (<><h2>Observações</h2><div className="cartao" style={{ whiteSpace: 'pre-wrap', color: 'var(--mist)' }}>{obra.observacoes}</div></>)}

      {fatias.length > 0 && (
        <>
          <h2>Por categoria</h2>
          <div className="cartao"><PorCategoria fatias={fatias} limite={8} /></div>
        </>
      )}

      <h2>Lançamentos ({daObra.length})</h2>
      {daObra.length === 0 ? (
        <p className="sub">Nenhum custo lançado nesta obra ainda.</p>
      ) : (
        <>
          <div className="chips" role="group" aria-label="Filtrar lançamentos">
            <button className="chip" aria-pressed={soAPagar} onClick={() => setSoAPagar(!soAPagar)}>Só a pagar</button>
            <button className="chip" aria-pressed={categoria === 'todas'} onClick={() => setCategoria('todas')}>Todas</button>
            {fatias.map((f) => (
              <button key={f.categoria} className="chip" aria-pressed={categoria === f.categoria}
                onClick={() => setCategoria(f.categoria)}>{f.categoria}</button>
            ))}
          </div>
          {filtrados.length > 0 && (categoria !== 'todas' || soAPagar) && (
            <p className="sub">Total do filtro: <strong>{reais(soma(filtrados))}</strong></p>
          )}
          {filtrados.length === 0
            ? <p className="sub">Nenhum lançamento neste filtro.</p>
            : <Lancamentos custos={filtrados} aoAbrir={aoAbrirCusto} />}
        </>
      )}
    </>
  );
}
