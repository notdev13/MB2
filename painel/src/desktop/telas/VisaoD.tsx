import { useMemo } from 'react';
import { useDados } from '../../dados/contexto';
import { gastoComOrcamento, porCategoria, resumirObra, resumoGeral, type ResumoObra } from '../../dominio/calculos';
import { mesAnterior, totalDoMes, variacao } from '../../dominio/consultas';
import { EstadoVazio } from '../../componentes/EstadoVazio';
import { dataBR, hoje, reais, reaisCurto } from '../../dominio/formato';
import type { Custo } from '../../dominio/tipos';
import { Kpi, Painel, SeloStatus, Variacao } from '../componentes/Base';
import { BarrasCategoria, UsoOrcamento } from '../componentes/Graficos';
import { Paineis } from '../../componentes/Paineis';
import { Tabela } from '../componentes/Tabela';
import { irD, linkD } from '../rotas';
import { ContasD } from './ContasD';

export function VisaoD({ aoNovaObra, aoLancar, aoAbrirCusto, aoAtualizarSaldo, aoImportarExtrato, aoNovaConta }: {
  aoNovaObra: () => void; aoLancar: () => void; aoAbrirCusto: (c: Custo) => void;
  aoAtualizarSaldo: (contaId?: string) => void; aoImportarExtrato: () => void; aoNovaConta: () => void;
}) {
  const { obras, custos } = useDados();
  const ref = hoje();
  const geral = useMemo(() => resumoGeral(obras, custos, ref), [obras, custos, ref]);
  const ativas = useMemo(() => new Set(obras.filter((o) => o.status !== 'concluida').map((o) => o.id)), [obras]);
  const custosAtivas = useMemo(() => custos.filter((c) => ativas.has(c.obraId)), [custos, ativas]);
  const resumos = useMemo(
    () => obras.filter((o) => ativas.has(o.id)).map((o) => resumirObra(o, custos)).sort((a, b) => b.gasto - a.gasto),
    [obras, custos, ativas],
  );
  const fatias = useMemo(() => porCategoria(custosAtivas), [custosAtivas]);
  const mesAtual = ref.slice(0, 7);
  const anterior = totalDoMes(custos, mesAnterior(mesAtual));
  const nomeObra = new Map(obras.map((o) => [o.id, o.nome]));

  if (obras.length === 0) {
    return (
      <EstadoVazio icone="obras" titulo="Comece cadastrando uma obra"
        texto="Depois é só lançar os custos e acompanhar aqui o gasto de cada uma.">
        <button className="d-botao primario" onClick={aoNovaObra}>Cadastrar obra</button>
      </EstadoVazio>
    );
  }

  return (
    <div className="d-grade-12">
      <div className="d-kpis span-12">
        <Kpi rotulo="Gasto nas obras em aberto" valor={reaisCurto(geral.gastoAtivas)}
          detalhe={geral.orcamentoAtivas > 0
            ? <>de {reaisCurto(geral.orcamentoAtivas)} orçados<UsoOrcamento gasto={gastoComOrcamento(obras, custos)} orcamento={geral.orcamentoAtivas} /></>
            : `em ${geral.obrasAtivas} obra${geral.obrasAtivas === 1 ? '' : 's'} · sem orçamento cadastrado`} />
        <Kpi rotulo="Gasto no mês" valor={reaisCurto(geral.gastoNoMes)}
          detalhe={<Variacao valor={variacao(geral.gastoNoMes, anterior)} rotulo="do mês passado" />} />
        <Kpi rotulo="A pagar" valor={reais(geral.aPagar)}
          detalhe={geral.aPagar > 0 ? 'lançado e ainda não pago' : 'nada pendente'} />
        <Kpi rotulo="Obras em aberto" valor={geral.obrasAtivas}
          tom={geral.estouradas > 0 ? 'alerta' : undefined}
          detalhe={geral.estouradas > 0 ? `${geral.estouradas} acima do orçamento` : 'nenhuma acima do orçamento'} />
      </div>

      <div className="span-12">
        <Paineis aoAbrirObra={(id) => irD({ tela: 'obra', id })} aoAtualizarSaldo={() => aoAtualizarSaldo()} aoLancar={aoLancar} />
      </div>

      <ContasD aoAtualizarSaldo={aoAtualizarSaldo} aoImportar={aoImportarExtrato} aoNovaConta={aoNovaConta} />

      <Painel className="span-12" titulo="Obras em aberto" semPadding
        acao={<a className="d-link" href={linkD({ tela: 'obras' })}>Ver todas</a>}>
        {resumos.length === 0 ? (
          <EstadoVazio icone="obras" titulo="Nenhuma obra em aberto"
            texto="Todas as obras estão concluídas. Cadastre uma nova para voltar a acompanhar os gastos.">
            <button className="d-botao primario" onClick={aoNovaObra}>Cadastrar obra</button>
            <a className="d-botao secundario" href={linkD({ tela: 'obras' })}>Ver todas as obras</a>
          </EstadoVazio>
        ) : <Tabela<ResumoObra> rotulo="Obras em aberto" linhas={resumos} chaveLinha={(r) => r.obra.id}
          aoClicar={(r) => irD({ tela: 'obra', id: r.obra.id })}
          colunas={[
            { chave: 'nome', titulo: 'Obra', render: (r) => <span className="d-corta forte">{r.obra.nome}</span> },
            { chave: 'status', titulo: 'Status', render: (r) => <SeloStatus status={r.obra.status} />, largura: '128px' },
            { chave: 'uso', titulo: 'Orçamento', render: (r) => <UsoOrcamento gasto={r.gasto} orcamento={r.obra.orcamento} />, largura: '250px' },
            { chave: 'ultimo', titulo: 'Último lanç.', render: (r) => dataBR(r.ultimoLancamento), largura: '108px' },
            { chave: 'gasto', titulo: 'Gasto', render: (r) => reais(r.gasto), numero: true, largura: '140px' },
          ]} />}
      </Painel>

      <Painel className="span-4" titulo="Por categoria" acao={<span className="d-apagado">obras em aberto</span>}>
        <BarrasCategoria fatias={fatias} />
      </Painel>

      <Painel className="span-8" titulo="Últimos lançamentos" semPadding
        acao={<a className="d-link" href={linkD({ tela: 'lancamentos' })}>Ver todos</a>}>
        <ul className="d-recentes">
          {custos.slice(0, 6).map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => aoAbrirCusto(c)}>
                <span>
                  <strong className="d-corta">{c.descricao || c.categoria}</strong>
                  <small className="d-corta">{dataBR(c.data)} · {nomeObra.get(c.obraId)}</small>
                </span>
                <span className="d-num">{reais(c.valor)}</span>
              </button>
            </li>
          ))}
        </ul>
      </Painel>
    </div>
  );
}
