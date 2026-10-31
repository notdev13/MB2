import { useMemo } from 'react';
import { MiniGrafico, VariacaoSaldo } from '../../componentes/MiniGrafico';
import { useDados } from '../../dados/contexto';
import { dataBR, hoje, reais } from '../../dominio/formato';
import { historicoSaldo } from '../../dominio/graficos';
import { contasComSaldo, totalConsolidado, totalMB2, type ContaComSaldo } from '../../dominio/saldos';
import { Painel, Vazio } from '../componentes/Base';
import { Tabela } from '../componentes/Tabela';

const DIAS_PARA_CONFERIR = 7;

// "Contas e saldos" no computador: as contas ativas, o saldo de cada uma e os totais.
// As contas de somar estão em dominio/saldos.ts; aqui só se mostra.
export function ContasD({ aoAtualizarSaldo, aoImportar, aoNovaConta }: {
  aoAtualizarSaldo: (contaId?: string) => void; aoImportar: () => void; aoNovaConta: () => void;
}) {
  const { obras, contas, saldos } = useDados();
  const itens = useMemo(() => contasComSaldo(contas, saldos, hoje()), [contas, saldos]);
  const nomeObra = new Map(obras.map((o) => [o.id, o.nome]));

  const botoes = (
    <div className="d-contas-acoes">
      <button type="button" className="d-botao secundario" onClick={aoNovaConta}>Nova conta</button>
      {itens.length > 0 && <button type="button" className="d-botao secundario" onClick={aoImportar}>Importar extrato</button>}
      {itens.length > 0 && <button type="button" className="d-botao primario" onClick={() => aoAtualizarSaldo()}>Atualizar saldo</button>}
    </div>
  );

  return (
    <Painel className="span-12" titulo="Contas e saldos" acao={botoes} semPadding>
      {itens.length === 0 ? (
        <Vazio titulo="Nenhuma conta cadastrada" texto="Cadastre a conta da MB2 e a de cada obra para acompanhar quanto há em caixa.">
          <button type="button" className="d-botao primario" onClick={aoNovaConta}>Nova conta</button>
        </Vazio>
      ) : (
        <Tabela<ContaComSaldo> rotulo="Contas e saldos" linhas={itens} chaveLinha={(i) => i.conta.id}
          aoClicar={(i) => aoAtualizarSaldo(i.conta.id)}
          colunas={[
            { chave: 'conta', titulo: 'Conta', render: (i) => <span className="d-corta forte">{i.conta.obraId === null ? `MB2 · ${i.conta.nome}` : i.conta.nome}</span> },
            { chave: 'dona', titulo: 'Banco / obra', render: (i) => <span className="d-corta">{[i.conta.banco, i.conta.obraId ? nomeObra.get(i.conta.obraId) : ''].filter(Boolean).join(' · ') || '—'}</span>, largura: '200px' },
            {
              chave: 'data', titulo: 'Saldo de', largura: '220px',
              render: (i) => i.saldo && i.dias !== null
                ? <>{dataBR(i.saldo.data)} · {i.dias === 0 ? 'hoje' : `há ${i.dias} dia${i.dias === 1 ? '' : 's'}`}
                  {i.dias > DIAS_PARA_CONFERIR && ' · ⚠ atualize'}{i.saldo.fonte === 'extrato' && ' · extrato'}</>
                : 'sem saldo digitado',
            },
            {
              chave: 'tendencia', titulo: 'Tendência', largura: '200px',
              render: (i) => {
                const serie = historicoSaldo(i.conta.id, saldos);
                return serie.length > 1
                  ? <span className="d-tendencia"><MiniGrafico serie={serie} largura={96} altura={26} /><VariacaoSaldo serie={serie} /></span>
                  : <span className="d-apagado">um registro só</span>;
              },
            },
            {
              chave: 'saldo', titulo: 'Saldo', numero: true, largura: '170px',
              render: (i) => i.saldo ? <>{i.saldo.valor < 0 && '⚠ Negativo: '}{reais(i.saldo.valor)}</> : '—',
            },
          ]}
          rodape={
            <>
              <tr><td colSpan={4}>Total MB2 (empresa)</td><td className="num">{reais(totalMB2(itens))}</td></tr>
              <tr><td colSpan={4}>Total em todas as contas</td><td className="num">{reais(totalConsolidado(itens))}</td></tr>
            </>
          } />
      )}
    </Painel>
  );
}
