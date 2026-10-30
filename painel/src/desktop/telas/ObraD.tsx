import { useMemo } from 'react';
import { useDados } from '../../dados/contexto';
import { porCategoria, porMes, resumirObra, situacaoDaConta } from '../../dominio/calculos';
import { porFornecedor } from '../../dominio/consultas';
import { dataBR, hoje, reais, reaisCurto } from '../../dominio/formato';
import { EstadoVazio } from '../../componentes/EstadoVazio';
import type { Custo, Obra } from '../../dominio/tipos';
import { IconeD, Kpi, Painel, Vazio } from '../componentes/Base';
import { BarrasCategoria, ColunasMes, UsoOrcamento } from '../componentes/Graficos';
import { TabelaLancamentos } from '../componentes/TabelaLancamentos';
import { linkD } from '../rotas';
import { textoSituacaoD, type PedidoContaD } from './ContasD';

export function ObraD({ id, aoLancar, aoAbrirCusto, aoConta }: {
  id: string; aoLancar: () => void; aoAbrirCusto: (c: Custo) => void; aoConta: (p: PedidoContaD) => void;
}) {
  const { obras, custos, contas } = useDados();
  const obra = obras.find((o) => o.id === id);
  const meus = useMemo(() => custos.filter((c) => c.obraId === id), [custos, id]);
  const r = useMemo(() => obra && resumirObra(obra, custos), [obra, custos]);
  const meses = useMemo(() => porMes(meus, hoje(), 12), [meus]);
  const fatias = useMemo(() => porCategoria(meus), [meus]);
  const fornecedores = useMemo(() => porFornecedor(meus).slice(0, 8), [meus]);

  if (!obra || !r) {
    return (
      <Vazio titulo="Obra não encontrada" texto="Ela pode ter sido excluída.">
        <a className="d-botao secundario" href={linkD({ tela: 'obras' })}>Voltar para obras</a>
      </Vazio>
    );
  }

  const contaObra = contas.find((c) => c.obraId === id);
  const sc = contaObra ? situacaoDaConta(contaObra, r.aPagar, hoje()) : null;
  const estourou = obra.orcamento > 0 && r.saldo < 0;
  return (
    <div className="d-grade-12">
      <div className="d-kpis span-12">
        <Kpi rotulo="Gasto até agora" valor={reaisCurto(r.gasto)}
          detalhe={`${reais(r.gasto)} · ${meus.length} lançamento${meus.length === 1 ? '' : 's'}`} />
        <Kpi rotulo="Orçamento" valor={obra.orcamento > 0 ? reaisCurto(obra.orcamento) : '—'}
          detalhe={obra.orcamento > 0
            ? <><UsoOrcamento gasto={r.gasto} orcamento={obra.orcamento} /></>
            : 'cadastre em “Editar obra”'} />
        <Kpi rotulo={estourou ? 'Acima do orçamento' : 'Saldo'} tom={estourou ? 'alerta' : undefined}
          valor={obra.orcamento > 0 ? reaisCurto(Math.abs(r.saldo)) : '—'}
          detalhe={obra.orcamento > 0 ? (estourou ? 'gasto passou do orçado' : 'ainda disponível') : 'sem orçamento'} />
        <Kpi rotulo="Custo por m²" valor={r.custoM2 !== null ? reais(r.custoM2) : '—'}
          detalhe={obra.areaM2 ? `${obra.areaM2.toLocaleString('pt-BR')} m²` : 'informe a área da obra'} />
        <Kpi rotulo="A pagar" valor={reaisCurto(r.aPagar)} detalhe={r.aPagar > 0 ? 'lançado e não pago' : 'nada pendente'} />
        <Kpi rotulo="Saldo da conta"
          tom={sc && sc.faltaCobrir > 0 ? 'alerta' : undefined}
          valor={contaObra ? reaisCurto(contaObra.saldo) : '—'}
          detalhe={sc && contaObra ? (
            <>
              <span>{reais(contaObra.saldo)} · {textoSituacaoD(sc, r.aPagar)} · saldo de {dataBR(contaObra.saldoEm)}{sc.desatualizado ? ` (faz ${sc.diasDesde} dias)` : ''}</span>
              <button type="button" className="d-botao secundario" onClick={() => aoConta({ conta: contaObra, soSaldo: true })}>Atualizar saldo</button>
            </>
          ) : (
            <button type="button" className="d-botao secundario" onClick={() => aoConta({ obraId: id })}>Cadastrar conta desta obra</button>
          )} />
      </div>

      <Painel className="span-8" titulo="Gasto por mês · últimos 12 meses">
        <ColunasMes meses={meses} altura={200} />
      </Painel>
      <Painel className="span-4" titulo="Dados da obra">
        <Ficha obra={obra} ultimo={r.ultimoLancamento} />
      </Painel>

      <Painel className="span-6" titulo="Por categoria">
        {fatias.length ? <BarrasCategoria fatias={fatias} /> : <p className="d-apagado">Sem lançamentos.</p>}
      </Painel>
      <Painel className="span-6" titulo="Maiores fornecedores e prestadores" semPadding>
        {fornecedores.length ? (
          <ol className="d-ranking">
            {fornecedores.map((f) => (
              <li key={f.fornecedor}>
                <span className="d-corta">{f.fornecedor}</span>
                <small>{f.lancamentos} lanç.</small>
                <span className="d-num">{reais(f.total)}</span>
              </li>
            ))}
          </ol>
        ) : <p className="d-apagado d-painel-corpo">Sem lançamentos.</p>}
      </Painel>

      <Painel className="span-12" titulo="Lançamentos da obra" semPadding>
        {meus.length === 0 ? (
          <EstadoVazio icone="recibo" titulo="Nenhum custo lançado"
            texto="Registre o primeiro gasto desta obra para acompanhar o saldo. Atalho: tecle N.">
            <button className="d-botao primario" onClick={aoLancar}>Lançar primeiro custo</button>
          </EstadoVazio>
        ) : <TabelaLancamentos custos={meus} aoAbrir={aoAbrirCusto} />}
      </Painel>
    </div>
  );
}

function Ficha({ obra, ultimo }: { obra: Obra; ultimo: string | null }) {
  const itens: [string, string][] = [
    ['Endereço', obra.endereco || '—'],
    ['Cliente', obra.cliente || '—'],
    ['Início', dataBR(obra.inicio)],
    ['Previsão de término', dataBR(obra.previsaoFim)],
    ['Último lançamento', dataBR(ultimo)],
  ];
  return (
    <>
      <dl className="d-ficha">
        {itens.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
      </dl>
      {obra.observacoes && (
        <details className="d-obs">
          <summary><IconeD nome="seta" tamanho={14} /> Observações</summary>
          <p>{obra.observacoes}</p>
        </details>
      )}
    </>
  );
}
