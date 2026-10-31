import type { FatiaCategoria } from './calculos';
import type { SaldoConta } from './tipos';

// Contas dos gráficos (gasto do período, pico, escala do eixo, tendência dos saldos, barras do orçamento).

export const PERIODOS = { '3M': 3, '6M': 6, '1A': 12 } as const;
export type Periodo = keyof typeof PERIODOS;

export const totalDoPeriodo = (meses: { total: number }[]) => meses.reduce((t, m) => t + m.total, 0);

// Mês ('AAAA-MM') de maior gasto; null quando não houve gasto no período. Empate: o mais recente.
export function mesDoPico(meses: { mes: string; total: number }[]): string | null {
  let pico: { mes: string; total: number } | null = null;
  for (const m of meses) if (m.total > 0 && (!pico || m.total >= pico.total)) pico = m;
  return pico?.mes ?? null;
}

// Saldos de uma conta em ordem de data, um por dia (vale o último digitado no dia), os `max` mais recentes.
export function historicoSaldo(contaId: string, saldos: SaldoConta[], max = 8): number[] {
  const porDia = new Map<string, SaldoConta>();
  for (const s of saldos) {
    if (s.contaId !== contaId) continue;
    const atual = porDia.get(s.data);
    if (!atual || s.criadoEm >= atual.criadoEm) porDia.set(s.data, s);
  }
  return [...porDia.values()].sort((a, b) => (a.data < b.data ? -1 : 1)).slice(-max).map((s) => s.valor);
}

// Variação em % do primeiro para o último valor. null com menos de 2 valores ou primeiro valor zero.
export function variacaoSerie(serie: number[]): number | null {
  if (serie.length < 2 || serie[0] === 0) return null;
  return ((serie[serie.length - 1] - serie[0]) / Math.abs(serie[0])) * 100;
}

// Comprimento das duas barras do orçamento (cheia = gasto, tracejada = orçamento), de 0 a 1.
// A maior das duas ocupa a largura toda: quando a obra passa do orçamento, a cheia ultrapassa a tracejada.
export function barrasOrcamento(gasto: number, orcamento: number): { gasto: number; orcamento: number } {
  const g = Math.max(gasto, 0), o = Math.max(orcamento, 0), base = Math.max(g, o);
  return base === 0 ? { gasto: 0, orcamento: 0 } : { gasto: g / base, orcamento: o / base };
}

// Passo da grade do eixo: 1, 2 ou 5 vezes uma potência de 10, para cair em números redondos (cerca de 4 linhas).
export function passoDaEscala(max: number): number {
  if (max <= 0) return 1;
  const bruto = max / 4;
  const pot = 10 ** Math.floor(Math.log10(bruto));
  const n = bruto / pot;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pot;
}

// As `limite` maiores categorias e, se sobrar, uma linha "Demais (n)" somando o resto.
export type LinhaCategoria = Omit<FatiaCategoria, 'categoria'> & { categoria: string };
export function agruparCategorias(fatias: FatiaCategoria[], limite: number): LinhaCategoria[] {
  if (fatias.length <= limite) return fatias;
  const resto = fatias.slice(limite);
  return [...fatias.slice(0, limite), {
    categoria: `Demais (${resto.length})`,
    total: resto.reduce((t, f) => t + f.total, 0),
    parte: resto.reduce((t, f) => t + f.parte, 0),
  }];
}
