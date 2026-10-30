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
