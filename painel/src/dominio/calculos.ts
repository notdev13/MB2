import type { Categoria, Custo, Obra } from './tipos';

export interface ResumoObra {
  obra: Obra;
  gasto: number;
  aPagar: number; // lançado e ainda não pago
  saldo: number; // orçamento - gasto (negativo = estourou)
  usoOrcamento: number; // 0..n (1 = 100%)
  custoM2: number | null;
  ultimoLancamento: string | null;
}

export function resumirObra(obra: Obra, custos: Custo[]): ResumoObra {
  const meus = custos.filter((c) => c.obraId === obra.id);
  const gasto = soma(meus);
  const aPagar = soma(meus.filter((c) => !c.pago));
  return {
    obra,
    gasto,
    aPagar,
    saldo: obra.orcamento - gasto,
    usoOrcamento: obra.orcamento > 0 ? gasto / obra.orcamento : 0,
    custoM2: obra.areaM2 && obra.areaM2 > 0 ? Math.round(gasto / obra.areaM2) : null,
    ultimoLancamento: meus.reduce<string | null>((m, c) => (m === null || c.data > m ? c.data : m), null),
  };
}

export interface ImpactoOrcamento {
  gastoAntes: number; // centavos, sem o lançamento (e sem o valor original, se for edição)
  gastoDepois: number; // centavos, com o valor novo
  percAntes: number; // % inteira do orçamento
  percDepois: number;
  usoDepois: number; // 0..n (1 = 100%), sem arredondar
  estoura: boolean;
  excedente: number; // centavos acima do orçamento (0 se não estoura)
}

// Prévia do lançamento: quanto do orçamento a obra terá usado com este valor.
// Em edição, informe `editandoId` para o valor original não ser contado em dobro.
// Devolve null sem orçamento ou sem valor válido (centavos inteiros maiores que zero).
export function impactoNoOrcamento(obra: Obra, custos: Custo[], valor: number | null, editandoId?: string): ImpactoOrcamento | null {
  if (valor === null || !Number.isInteger(valor) || valor <= 0 || obra.orcamento <= 0) return null;
  const gastoAntes = soma(custos.filter((c) => c.obraId === obra.id && c.id !== editandoId));
  const gastoDepois = gastoAntes + valor;
  return {
    gastoAntes,
    gastoDepois,
    percAntes: Math.round((gastoAntes / obra.orcamento) * 100),
    percDepois: Math.round((gastoDepois / obra.orcamento) * 100),
    usoDepois: gastoDepois / obra.orcamento,
    estoura: gastoDepois > obra.orcamento,
    excedente: Math.max(0, gastoDepois - obra.orcamento),
  };
}

export const soma = (custos: Custo[]) => custos.reduce((t, c) => t + c.valor, 0);

export interface FatiaCategoria {
  categoria: Categoria;
  total: number;
  parte: number; // 0..1 do total geral
}

export function porCategoria(custos: Custo[]): FatiaCategoria[] {
  const mapa = new Map<Categoria, number>();
  for (const c of custos) mapa.set(c.categoria, (mapa.get(c.categoria) ?? 0) + c.valor);
  const total = soma(custos);
  return [...mapa.entries()]
    .map(([categoria, t]) => ({ categoria, total: t, parte: total > 0 ? t / total : 0 }))
    .sort((a, b) => b.total - a.total);
}

// Total por mês ('AAAA-MM') nos últimos `meses` meses até `referencia`, incluindo meses zerados.
export function porMes(custos: Custo[], referencia: string, meses = 6): { mes: string; total: number }[] {
  const [a, m] = referencia.split('-').map(Number);
  const chaves: string[] = [];
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(a, m - 1 - i, 1);
    chaves.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  const totais = new Map(chaves.map((k) => [k, 0]));
  for (const c of custos) {
    const k = c.data.slice(0, 7);
    if (totais.has(k)) totais.set(k, totais.get(k)! + c.valor);
  }
  return chaves.map((mes) => ({ mes, total: totais.get(mes)! }));
}

export interface ResumoGeral {
  obrasAtivas: number;
  orcamentoAtivas: number;
  gastoAtivas: number;
  aPagar: number;
  gastoNoMes: number;
  estouradas: number;
}

export function resumoGeral(obras: Obra[], custos: Custo[], referencia: string): ResumoGeral {
  const ativas = obras.filter((o) => o.status !== 'concluida');
  const idsAtivas = new Set(ativas.map((o) => o.id));
  const custosAtivas = custos.filter((c) => idsAtivas.has(c.obraId));
  const mes = referencia.slice(0, 7);
  return {
    obrasAtivas: ativas.length,
    orcamentoAtivas: ativas.reduce((t, o) => t + o.orcamento, 0),
    gastoAtivas: soma(custosAtivas),
    aPagar: soma(custos.filter((c) => !c.pago)),
    gastoNoMes: soma(custos.filter((c) => c.data.startsWith(mes))),
    estouradas: ativas.filter((o) => o.orcamento > 0 && soma(custos.filter((c) => c.obraId === o.id)) > o.orcamento)
      .length,
  };
}

// Faixa de situação do orçamento, para o dono ler a obra "de relance".
// Limites (gasto / orçamento, comparados só com centavos inteiros, sem arredondar):
//   sem-orcamento: orçamento 0 (ou negativo): não há o que comparar
//   folga:         abaixo de 80%
//   atencao:       de 80% até menos de 95%
//   limite:        de 95% até exatamente 100% (ainda não passou)
//   estourou:      acima de 100% (1 centavo a mais já conta)
export type SituacaoOrcamento = 'sem-orcamento' | 'folga' | 'atencao' | 'limite' | 'estourou';

export const LIMITE_ATENCAO_PCT = 80;
export const LIMITE_LIMITE_PCT = 95;

export function situacaoOrcamento(gasto: number, orcamento: number): SituacaoOrcamento {
  if (!(orcamento > 0)) return 'sem-orcamento';
  if (gasto > orcamento) return 'estourou';
  // gasto/orcamento >= N/100  <=>  gasto*100 >= orcamento*N (evita erro de ponto flutuante)
  if (gasto * 100 >= orcamento * LIMITE_LIMITE_PCT) return 'limite';
  if (gasto * 100 >= orcamento * LIMITE_ATENCAO_PCT) return 'atencao';
  return 'folga';
}

// Palavra curta de cada faixa (mesmo vocabulário no celular e no computador).
export const ROTULO_SITUACAO: Record<SituacaoOrcamento, string> = {
  'sem-orcamento': 'Sem orçamento',
  folga: 'Tranquilo',
  atencao: 'Atenção',
  limite: 'No limite',
  estourou: 'Estourou',
};

// Texto curto da faixa ("Tranquilo", "Atenção · 85%", "Estourou · 112%"): a cor nunca fala sozinha.
export function textoSituacao(gasto: number, orcamento: number): string {
  const faixa = situacaoOrcamento(gasto, orcamento);
  return faixa === 'atencao' || faixa === 'limite' || faixa === 'estourou'
    ? `${ROTULO_SITUACAO[faixa]} · ${percentualDaFaixa(gasto, orcamento, faixa)}%`
    : ROTULO_SITUACAO[faixa];
}

// Percentual ao lado do rótulo, coerente com a faixa: nunca arredonda para cima até cruzar o limite
// ("Atenção" não mostra 95%, "No limite" não mostra 100% se ainda não chegou) e "Estourou" mostra 101% ou mais.
function percentualDaFaixa(gasto: number, orcamento: number, faixa: SituacaoOrcamento): number {
  const piso = Math.floor((gasto * 100) / orcamento);
  return faixa === 'estourou' ? Math.max(101, piso) : piso;
}

// Gasto das obras em aberto que têm orçamento: a base certa para comparar com `orcamentoAtivas`
// (obras sem orçamento ficam de fora, senão o total estoura sem nenhuma obra ter estourado).
export function gastoComOrcamento(obras: Obra[], custos: Custo[]): number {
  const comOrcamento = new Set(obras.filter((o) => o.status !== 'concluida' && o.orcamento > 0).map((o) => o.id));
  return soma(custos.filter((c) => comOrcamento.has(c.obraId)));
}
