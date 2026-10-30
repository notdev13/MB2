import { EstadoVazio } from '../componentes/EstadoVazio';
import { useDados } from '../dados/contexto';
import { resumoContas, type SaldoConta } from '../dominio/calculos';
import { dataBR, hoje, reais } from '../dominio/formato';
import type { Conta } from '../dominio/tipos';

export interface PedidoConta { conta?: Conta; obraId?: string; soSaldo?: boolean }

// Texto de situação de uma conta frente ao que falta pagar (obra ou empresa).
export function textoConta(s: SaldoConta, aPagar: number): string {
  if (aPagar <= 0) return 'Nada a pagar em aberto.';
  return s.faltaCobrir > 0
    ? `⚠ Faltam ${reais(s.faltaCobrir)} para pagar o que está em aberto (${reais(aPagar)}).`
    : `Cobre os ${reais(aPagar)} a pagar.`;
}

export function Contas({ aoConta }: { aoConta: (p: PedidoConta) => void }) {
  const { obras, custos, contas } = useDados();
  const r = resumoContas(obras, custos, contas, hoje());
  const velha = (s: SaldoConta) => (s.desatualizado ? ` · confira, faz ${s.diasDesde} dias` : '');

  return (
    <>
      <div className="grade">
        <div className="cartao largo destaque">
          <div className="rotulo">Total em todas as contas</div>
          <div className="numero">{reais(r.totalEmConta)}</div>
          <div className="nota">nas obras {reais(r.totalNasObras)} · a pagar {reais(r.aPagarTotal)}</div>
        </div>
      </div>

      <h2>Conta principal</h2>
      {r.principal ? (
        <div className="cartao">
          <div className="linha"><strong>{r.principal.conta.nome}</strong><span className="valor">{reais(r.principal.conta.saldo)}</span></div>
          <div className="nota">Saldo de {dataBR(r.principal.conta.saldoEm)}{velha(r.principal)}</div>
          <div className="acoes" style={{ flexDirection: 'row', marginTop: 10 }}>
            <button className="botao secundario" style={{ flex: 1 }} onClick={() => aoConta({ conta: r.principal!.conta, soSaldo: true })}>Atualizar saldo</button>
            <button className="botao secundario" onClick={() => aoConta({ conta: r.principal!.conta })}>Editar</button>
          </div>
        </div>
      ) : (
        <EstadoVazio icone="recibo" titulo="Conta principal não cadastrada"
          texto="Cadastre a conta principal da empresa para ver o total em caixa.">
          <button className="botao" onClick={() => aoConta({})}>Nova conta</button>
        </EstadoVazio>
      )}

      <h2>Contas das obras</h2>
      <div className="lista">
        {r.obras.length === 0 && <p className="sub">Nenhuma obra em aberto.</p>}
        {r.obras.map(({ obra, aPagar, situacao }) => (
          <div key={obra.id} className="cartao" style={situacao && situacao.faltaCobrir > 0 ? { borderColor: 'var(--alerta-borda)' } : undefined}>
            <div className="linha">
              <a href={`#/obra/${encodeURIComponent(obra.id)}`} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600, color: 'var(--white)', textDecoration: 'none' }}>{obra.nome}</a>
              <span className="valor">{situacao ? reais(situacao.conta.saldo) : '—'}</span>
            </div>
            {situacao ? (
              <>
                <div className="nota">{situacao.conta.nome} · saldo de {dataBR(situacao.conta.saldoEm)}{velha(situacao)}</div>
                <div className="nota">{textoConta(situacao, aPagar)}</div>
                <div className="acoes" style={{ flexDirection: 'row', marginTop: 10 }}>
                  <button className="botao secundario" style={{ flex: 1 }} onClick={() => aoConta({ conta: situacao.conta, soSaldo: true })}>Atualizar saldo</button>
                  <button className="botao secundario" onClick={() => aoConta({ conta: situacao.conta })}>Editar</button>
                </div>
              </>
            ) : (
              <button className="botao secundario" style={{ marginTop: 8 }} onClick={() => aoConta({ obraId: obra.id })}>Cadastrar conta desta obra</button>
            )}
          </div>
        ))}
      </div>
      <div className="acoes" style={{ marginTop: 14 }}>
        <button className="botao secundario" onClick={() => aoConta({})}>+ Nova conta</button>
      </div>
    </>
  );
}
