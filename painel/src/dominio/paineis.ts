import type { SaldoConta } from './tipos';

// Contas dos painéis da Visão geral (gasto do período, pico, tendência dos saldos).

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

// Parte do gasto já usada do orçamento, de 0 a 1 (para desenhar a barra). 0 sem orçamento.
export const usoLimitado = (gasto: number, orcamento: number) =>
  orcamento > 0 ? Math.min(Math.max(gasto / orcamento, 0), 1) : 0;
