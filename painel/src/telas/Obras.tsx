import { useState } from 'react';
import { BarraOrcamento } from '../componentes/Graficos';
import { useDados } from '../dados/contexto';
import { resumirObra, situacaoOrcamento } from '../dominio/calculos';
import { porcentagem, reais, reaisCurto } from '../dominio/formato';
import { STATUS_OBRA, type StatusObra } from '../dominio/tipos';
import { ir } from '../navegacao';

type Filtro = 'abertas' | StatusObra | 'todas';
const FILTROS: [Filtro, string][] = [
  ['abertas', 'Em aberto'], ['em_andamento', 'Em andamento'], ['planejamento', 'Planejamento'],
  ['pausada', 'Pausadas'], ['concluida', 'Concluídas'], ['todas', 'Todas'],
];

export function Obras({ aoNovaObra }: { aoNovaObra: () => void }) {
  const { obras, custos } = useDados();
  const [filtro, setFiltro] = useState<Filtro>('abertas');
  const lista = obras.filter((o) =>
    filtro === 'todas' ? true : filtro === 'abertas' ? o.status !== 'concluida' : o.status === filtro);

  return (
    <>
      <div className="chips" role="group" aria-label="Filtrar obras">
        {FILTROS.map(([k, v]) => (
          <button key={k} className="chip" aria-pressed={filtro === k} onClick={() => setFiltro(k)}>{v}</button>
        ))}
      </div>
      <div className="lista">
        {lista.length === 0 && (
          <div className="vazio cartao">
            <h3>{obras.length === 0 ? 'Nenhuma obra ainda' : 'Nada neste filtro'}</h3>
            {obras.length === 0 && <button className="botao" onClick={aoNovaObra}>Cadastrar obra</button>}
          </div>
        )}
        {lista.map((o) => {
          const r = resumirObra(o, custos);
          return (
            <button key={o.id} className={'cartao clicavel situacao-' + situacaoOrcamento(r.gasto, o.orcamento)} onClick={() => ir({ tela: 'obra', id: o.id })}>
              <div className="linha">
                <strong>{o.nome}</strong>
                <span className={'selo' + (o.status === 'em_andamento' ? ' ativo' : o.status === 'planejamento' ? '' : ' neutro')}>
                  {STATUS_OBRA[o.status]}
                </span>
              </div>
              {o.endereco && <div className="nota">{o.endereco}</div>}
              <BarraOrcamento gasto={r.gasto} orcamento={o.orcamento} />
              <div className="linha nota">
                <span>{reais(r.gasto)} gastos</span>
                <span>
                  {o.orcamento > 0
                    ? r.saldo >= 0
                      ? `${porcentagem(r.gasto, o.orcamento)}% · saldo ${reaisCurto(r.saldo)}`
                      : `${reaisCurto(-r.saldo)} acima do orçado`
                    : 'sem orçamento'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {obras.length > 0 && (
        <div className="acoes" style={{ marginTop: 16 }}>
          <button className="botao secundario cheio" onClick={aoNovaObra}>+ Nova obra</button>
        </div>
      )}
    </>
  );
}
