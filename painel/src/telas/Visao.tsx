import { BarraOrcamento, corDaSerie, GastoPorMes, PorCategoria } from '../componentes/Graficos';
import { EstadoVazio } from '../componentes/EstadoVazio';
import { Lancamentos } from '../componentes/Lancamentos';
import { MiniGrafico, VariacaoSaldo } from '../componentes/MiniGrafico';
import { TituloItalico } from '../componentes/TituloItalico';
import { useDados } from '../dados/contexto';
import { gastoComOrcamento, porCategoria, porMes, resumirObra, resumoGeral, situacaoOrcamento } from '../dominio/calculos';
import { historicoSaldo } from '../dominio/graficos';
import { hoje, porcentagem, reais, reaisCurto } from '../dominio/formato';
import { contasComSaldo, sobraSePagarTudo, totalConsolidado, totalMB2 } from '../dominio/saldos';
import type { Custo } from '../dominio/tipos';
import { ir } from '../navegacao';

const DIAS_PARA_CONFERIR = 7;

export function Visao({ aoNovaObra, aoLancar, aoAbrirCusto, aoAtualizarSaldo, aoNovaConta, aoImportarExtrato }: {
  aoNovaObra: () => void; aoLancar: () => void; aoAbrirCusto: (c: Custo) => void;
  aoAtualizarSaldo: () => void; aoNovaConta: () => void; aoImportarExtrato: () => void;
}) {
  const { obras, custos, contas, saldos } = useDados();
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
  const itensConta = contasComSaldo(contas, saldos, ref);
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

      <h2><TituloItalico texto="Dinheiro em conta" /></h2>
      {itensConta.every((i) => !i.saldo) ? (
        <EstadoVazio icone="recibo" titulo="Dinheiro em conta"
          texto="Ainda não sei quanto tem em conta. Digite o saldo de hoje.">
          <button className="botao" onClick={itensConta.length === 0 ? aoNovaConta : aoAtualizarSaldo}>Atualizar saldo</button>
          {itensConta.length > 0 && <button className="botao secundario" onClick={aoImportarExtrato}>Importar extrato</button>}
          <button className="botao secundario" onClick={aoNovaConta}>Nova conta</button>
        </EstadoVazio>
      ) : (
        <div className="cartao">
          <div className="rotulo">Total em todas as contas</div>
          <div className="numero menor">
            {totalConsolidado(itensConta) < 0 && <>⚠ Negativo: </>}{reaisCurto(totalConsolidado(itensConta))}
          </div>
          <div className="nota">MB2 (empresa): {reaisCurto(totalMB2(itensConta))}</div>
          <div className="lista conta-lista">
            {itensConta.map(({ conta, saldo, dias }) => {
              const obra = conta.obraId ? obras.find((o) => o.id === conta.obraId) : undefined;
              const r = obra ? resumirObra(obra, custos) : null;
              const sobra = obra ? sobraSePagarTudo(obra, itensConta, custos) : null;
              const serie = historicoSaldo(conta.id, saldos);
              return (
                <div key={conta.id} className="conta-item">
                  <div className="linha">
                    <strong>{conta.obraId === null ? `MB2 · ${conta.nome}` : conta.nome}</strong>
                    <span className="valor">
                      {saldo ? <>{saldo.valor < 0 && '⚠ Negativo: '}{reais(saldo.valor)}</> : 'Sem saldo digitado'}
                    </span>
                  </div>
                  {serie.length > 1 && (
                    <div className="conta-tendencia">
                      <MiniGrafico serie={serie} />
                      <VariacaoSaldo serie={serie} />
                    </div>
                  )}
                  <div className="nota">
                    {dias === null
                      ? 'Digite o saldo para acompanhar.'
                      : <>{dias > DIAS_PARA_CONFERIR && '⚠ '}conferido {dias === 0 ? 'hoje' : `há ${dias} dia${dias === 1 ? '' : 's'}`}
                        {dias > DIAS_PARA_CONFERIR && ' · atualize o saldo'}</>}
                    {conta.banco && ` · ${conta.banco}`}
                  </div>
                  {r && obra && obra.orcamento > 0 && (
                    <div className="nota">Resta do orçamento: {r.saldo < 0 ? '⚠ ' : ''}{reais(r.saldo)}</div>
                  )}
                  {sobra && (
                    <div className="nota">
                      {sobra.sobra < 0
                        ? <>⚠ Falta {reais(-sobra.sobra)} para pagar tudo ({reais(sobra.aPagar)} a pagar)</>
                        : <>Sobra {reais(sobra.sobra)} se pagar tudo ({reais(sobra.aPagar)} a pagar)</>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="acoes">
            <button className="botao cheio" onClick={aoAtualizarSaldo}>Atualizar saldo</button>
            <button className="botao secundario cheio" onClick={aoImportarExtrato}>Importar extrato</button>
            <button className="botao secundario cheio" onClick={aoNovaConta}>Nova conta</button>
          </div>
        </div>
      )}

      <h2><TituloItalico texto="Obras em aberto" /></h2>
      <div className="lista">
        {ativas.length === 0 && (
          <EstadoVazio icone="obras" titulo="Nenhuma obra em aberto"
            texto="Todas as obras estão concluídas. Cadastre uma nova para voltar a acompanhar os gastos.">
            <button className="botao" onClick={aoNovaObra}>Cadastrar obra</button>
            <a className="botao secundario" href="#/obras">Ver todas as obras</a>
          </EstadoVazio>
        )}
        {ativas.map((r, i) => (
          <button key={r.obra.id} className={'cartao clicavel situacao-' + situacaoOrcamento(r.gasto, r.obra.orcamento)} onClick={() => ir({ tela: 'obra', id: r.obra.id })}>
            <div className="linha">
              <strong>{r.obra.nome}</strong>
              <span className="valor">{reais(r.gasto)}</span>
            </div>
            <BarraOrcamento gasto={r.gasto} orcamento={r.obra.orcamento} cor={corDaSerie(i)} />
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

      <h2><TituloItalico texto="Gasto por mês" /></h2>
      {custos.length === 0 ? (
        <EstadoVazio icone="grafico" titulo="Ainda sem gastos"
          texto="Lance o primeiro custo e o gráfico mês a mês aparece aqui.">
          <button className="botao" onClick={aoLancar}>Lançar primeiro custo</button>
        </EstadoVazio>
      ) : (
        <div className="cartao"><GastoPorMes meses={porMes(custos, ref, 12)} /></div>
      )}

      {custos.length > 0 && (
        <>
          <h2><TituloItalico texto="Para onde vai o dinheiro" /></h2>
          <div className="cartao"><PorCategoria fatias={porCategoria(custos)} /></div>

          <h2><TituloItalico texto="Últimos lançamentos" /></h2>
          <Lancamentos custos={custos.slice(0, 6)} nomeObra={nomeObra} aoAbrir={aoAbrirCusto} agrupar={false} />
        </>
      )}
    </>
  );
}
