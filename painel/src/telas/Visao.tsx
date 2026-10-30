import { BarraOrcamento, GastoPorMes, PorCategoria } from '../componentes/Graficos';
import { EstadoVazio } from '../componentes/EstadoVazio';
import { Lancamentos } from '../componentes/Lancamentos';
import { useDados } from '../dados/contexto';
import { gastoComOrcamento, porCategoria, porMes, resumirObra, resumoContas, resumoGeral, situacaoOrcamento } from '../dominio/calculos';
import { hoje, porcentagem, reais, reaisCurto } from '../dominio/formato';
import type { Custo } from '../dominio/tipos';
import { ir } from '../navegacao';

export function Visao({ aoNovaObra, aoLancar, aoAbrirCusto }: {
  aoNovaObra: () => void; aoLancar: () => void; aoAbrirCusto: (c: Custo) => void;
}) {
  const { obras, custos, contas } = useDados();
  const ref = hoje();

  if (obras.length === 0) {
    return (
      <EstadoVazio icone="obras" titulo="Bem-vindo ao Painel MB²"
        texto="Comece cadastrando a primeira obra. Depois é só lançar os custos pelo botão + lá embaixo.">
        <button className="botao" onClick={aoNovaObra}>Cadastrar obra</button>
      </EstadoVazio>
    );
  }

  const geral = resumoGeral(obras, custos, ref);
  const gastoOrcado = gastoComOrcamento(obras, custos);
  const ativas = obras.filter((o) => o.status !== 'concluida').map((o) => resumirObra(o, custos))
    .sort((a, b) => b.usoOrcamento - a.usoOrcamento);
  const perto = ativas.filter((r) => {
    const f = situacaoOrcamento(r.gasto, r.obra.orcamento);
    return f === 'atencao' || f === 'limite';
  }).length;
  const rc = resumoContas(obras, custos, contas, ref);
  const nomeObra = (id: string) => obras.find((o) => o.id === id)?.nome ?? '—';

  return (
    <>
      <div className="grade">
        <div className="cartao largo destaque">
          <div className="rotulo">Gasto nas obras em aberto</div>
          <div className="numero">{reaisCurto(geral.gastoAtivas)}</div>
          <div className="nota">
            {geral.orcamentoAtivas > 0
              ? <>de {reaisCurto(geral.orcamentoAtivas)} orçados em {geral.obrasAtivas} obra{geral.obrasAtivas === 1 ? '' : 's'}
                {' · '}{porcentagem(gastoOrcado, geral.orcamentoAtivas)}%</>
              : <>em {geral.obrasAtivas} obra{geral.obrasAtivas === 1 ? '' : 's'} · cadastre os orçamentos para comparar</>}
          </div>
          <BarraOrcamento gasto={gastoOrcado} orcamento={geral.orcamentoAtivas} />
        </div>
        <div className="cartao">
          <div className="rotulo">Gasto no mês</div>
          <div className="numero menor">{reaisCurto(geral.gastoNoMes)}</div>
        </div>
        <div className="cartao">
          <div className="rotulo">A pagar</div>
          <div className="numero menor">{reaisCurto(geral.aPagar)}</div>
        </div>
      </div>
      <button className="cartao clicavel" onClick={() => ir({ tela: 'contas' })}>
        <div className="linha">
          <strong>Dinheiro em conta</strong>
          <span className="valor">{contas.length > 0 ? reais(rc.totalEmConta) : 'Cadastrar'}</span>
        </div>
        <div className="nota">
          {contas.length === 0 ? 'Cadastre as contas da empresa e das obras para ver os saldos.'
            : rc.obrasSemConta > 0 ? `${rc.obrasSemConta} obra${rc.obrasSemConta === 1 ? '' : 's'} sem conta cadastrada`
            : 'Todas as obras com conta'}
        </div>
      </button>
      {geral.estouradas > 0 && (
        <div className="aviso" role="alert">
          ⚠ {geral.estouradas} obra{geral.estouradas === 1 ? ' passou' : 's passaram'} do orçamento.
        </div>
      )}
      {perto > 0 && (
        <div className="aviso atencao" role="status">
          Atenção: {perto} obra{perto === 1 ? ' está' : 's estão'} perto do limite do orçamento.
        </div>
      )}

      <h2>Obras em aberto</h2>
      <div className="lista">
        {ativas.length === 0 && (
          <EstadoVazio icone="obras" titulo="Nenhuma obra em aberto"
            texto="Todas as obras estão concluídas. Cadastre uma nova para voltar a acompanhar os gastos.">
            <button className="botao" onClick={aoNovaObra}>Cadastrar obra</button>
            <a className="botao secundario" href="#/obras">Ver todas as obras</a>
          </EstadoVazio>
        )}
        {ativas.map((r) => (
          <button key={r.obra.id} className={'cartao clicavel situacao-' + situacaoOrcamento(r.gasto, r.obra.orcamento)} onClick={() => ir({ tela: 'obra', id: r.obra.id })}>
            <div className="linha">
              <strong>{r.obra.nome}</strong>
              <span className="valor">{reais(r.gasto)}</span>
            </div>
            <BarraOrcamento gasto={r.gasto} orcamento={r.obra.orcamento} />
            <div className="nota">
              {r.obra.orcamento > 0
                ? r.saldo < 0
                  ? `${reaisCurto(-r.saldo)} acima de ${reaisCurto(r.obra.orcamento)}`
                  : `${porcentagem(r.gasto, r.obra.orcamento)}% de ${reaisCurto(r.obra.orcamento)}`
                : 'Sem orçamento cadastrado'}
              {r.aPagar > 0 && ` · ${reaisCurto(r.aPagar)} a pagar`}
            </div>
          </button>
        ))}
      </div>

      <h2>Gasto por mês</h2>
      {custos.length === 0 ? (
        <EstadoVazio icone="grafico" titulo="Ainda sem gastos"
          texto="Lance o primeiro custo e o gráfico mês a mês aparece aqui.">
          <button className="botao" onClick={aoLancar}>Lançar primeiro custo</button>
        </EstadoVazio>
      ) : (
        <div className="cartao"><GastoPorMes meses={porMes(custos, ref)} /></div>
      )}

      {custos.length > 0 && (
        <>
          <h2>Para onde vai o dinheiro</h2>
          <div className="cartao"><PorCategoria fatias={porCategoria(custos)} /></div>

          <h2>Últimos lançamentos</h2>
          <Lancamentos custos={custos.slice(0, 6)} nomeObra={nomeObra} aoAbrir={aoAbrirCusto} agrupar={false} />
        </>
      )}
    </>
  );
}
