import { useDados } from '../../dados/contexto';
import { resumoContas, type SaldoConta } from '../../dominio/calculos';
import { dataBR, hoje, reais, reaisCurto } from '../../dominio/formato';
import type { Conta } from '../../dominio/tipos';
import { Kpi, Painel } from '../componentes/Base';
import { linkD } from '../rotas';

export interface PedidoContaD { conta?: Conta; obraId?: string; soSaldo?: boolean }

export function textoSituacaoD(s: SaldoConta, aPagar: number): string {
  if (aPagar <= 0) return 'nada a pagar em aberto';
  return s.faltaCobrir > 0 ? `faltam ${reais(s.faltaCobrir)} para o que está a pagar` : `cobre os ${reais(aPagar)} a pagar`;
}

export function ContasD({ aoConta }: { aoConta: (p: PedidoContaD) => void }) {
  const { obras, custos, contas } = useDados();
  const r = resumoContas(obras, custos, contas, hoje());
  const faltaTotal = r.obras.reduce((t, l) => t + (l.situacao?.faltaCobrir ?? 0), 0);
  const velha = (s: SaldoConta) => (s.desatualizado ? ` · confira, faz ${s.diasDesde} dias` : '');

  return (
    <div className="d-grade-12">
      <div className="d-kpis span-12">
        <Kpi rotulo="Total em todas as contas" valor={reaisCurto(r.totalEmConta)}
          detalhe={`${contas.length} conta${contas.length === 1 ? '' : 's'} cadastrada${contas.length === 1 ? '' : 's'}`} />
        <Kpi rotulo="Nas contas das obras" valor={reaisCurto(r.totalNasObras)}
          detalhe={r.totalEmConta > 0 ? `${Math.round((r.totalNasObras / r.totalEmConta) * 100)}% do total` : '—'} />
        <Kpi rotulo="Conta principal" valor={r.principal ? reaisCurto(r.principal.conta.saldo) : '—'}
          detalhe={r.principal ? `saldo de ${dataBR(r.principal.conta.saldoEm)}` : 'ainda não cadastrada'} />
        <Kpi rotulo="A pagar nas obras" valor={reaisCurto(r.aPagarTotal)} tom={faltaTotal > 0 ? 'alerta' : undefined}
          detalhe={faltaTotal > 0 ? `contas das obras sem cobrir ${reais(faltaTotal)}` : 'sem falta de saldo nas obras'} />
      </div>

      <Painel className="span-12" titulo="Conta principal da empresa"
        acao={r.principal ? undefined : <button className="d-botao secundario" onClick={() => aoConta({})}>Cadastrar conta principal</button>}>
        {r.principal ? (
          <div className="d-conta">
            <div><strong>{r.principal.conta.nome}</strong><small>saldo de {dataBR(r.principal.conta.saldoEm)}{velha(r.principal)}</small></div>
            <span className="d-conta-saldo">{reais(r.principal.conta.saldo)}</span>
            <div className="d-conta-acoes">
              <button className="d-botao primario" onClick={() => aoConta({ conta: r.principal!.conta, soSaldo: true })}>Atualizar saldo</button>
              <button className="d-botao secundario" onClick={() => aoConta({ conta: r.principal!.conta })}>Editar</button>
            </div>
          </div>
        ) : <p className="d-apagado">Cadastre a conta principal para ver o total em caixa.</p>}
      </Painel>

      <div className="d-cabecalho-secao span-12">
        <h2>Contas das obras</h2>
        <button className="d-botao secundario" onClick={() => aoConta({})}>Nova conta</button>
      </div>
      {r.obras.length === 0 && <p className="d-apagado span-12">Nenhuma obra em aberto.</p>}
      {r.obras.map(({ obra, aPagar, situacao }) => (
        <Painel key={obra.id} className="span-4" titulo={obra.nome}
          acao={<a className="d-link" href={linkD({ tela: 'obra', id: obra.id })}>Abrir obra</a>}>
          {situacao ? (
            <div className="d-conta cartao">
              <span className={'d-conta-saldo' + (situacao.faltaCobrir > 0 ? ' alerta' : '')}>{reais(situacao.conta.saldo)}</span>
              <small>{situacao.conta.nome} · saldo de {dataBR(situacao.conta.saldoEm)}{velha(situacao)}</small>
              <small className={situacao.faltaCobrir > 0 ? 'd-alerta' : undefined}>{textoSituacaoD(situacao, aPagar)}</small>
              <div className="d-conta-acoes">
                <button className="d-botao primario" onClick={() => aoConta({ conta: situacao.conta, soSaldo: true })}>Atualizar saldo</button>
                <button className="d-botao secundario" onClick={() => aoConta({ conta: situacao.conta })}>Editar</button>
              </div>
            </div>
          ) : (
            <div className="d-conta cartao">
              <span className="d-conta-saldo d-apagado">—</span>
              <small>Esta obra ainda não tem conta cadastrada.</small>
              <div className="d-conta-acoes">
                <button className="d-botao secundario" onClick={() => aoConta({ obraId: obra.id })}>Cadastrar conta</button>
              </div>
            </div>
          )}
        </Painel>
      ))}
    </div>
  );
}
