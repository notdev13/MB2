import { describe, expect, it } from 'vitest';
import { barrasOrcamento, historicoSaldo, mesDoPico, passoDaEscala, totalDoPeriodo, variacaoSerie } from './graficos';
import type { SaldoConta } from './tipos';

const saldo = (contaId: string, data: string, valor: number, criadoEm = '2026-10-01T10:00:00Z'): SaldoConta =>
  ({ id: `${contaId}-${data}-${criadoEm}`, contaId, data, valor, fonte: 'manual', obs: '', criadoEm });

describe('totalDoPeriodo e mesDoPico', () => {
  const meses = [{ mes: '2026-08', total: 500 }, { mes: '2026-09', total: 900 }, { mes: '2026-10', total: 100 }];
  it('soma o período', () => expect(totalDoPeriodo(meses)).toBe(1500));
  it('acha o mês de maior gasto', () => expect(mesDoPico(meses)).toBe('2026-09'));
  it('sem gasto, não há pico', () => expect(mesDoPico([{ mes: '2026-10', total: 0 }])).toBeNull());
  it('empate fica com o mês mais recente', () =>
    expect(mesDoPico([{ mes: '2026-09', total: 7 }, { mes: '2026-10', total: 7 }])).toBe('2026-10'));
});

describe('historicoSaldo', () => {
  it('ordena por data e ignora outras contas', () => {
    const s = [saldo('c', '2026-10-20', 300), saldo('x', '2026-10-15', 999), saldo('c', '2026-10-01', 100)];
    expect(historicoSaldo('c', s)).toEqual([100, 300]);
  });
  it('no mesmo dia vale o último digitado', () => {
    const s = [saldo('c', '2026-10-20', 1, '2026-10-20T15:00:00Z'), saldo('c', '2026-10-20', 2, '2026-10-20T09:00:00Z')];
    expect(historicoSaldo('c', s)).toEqual([1]);
  });
  it('fica só com os mais recentes', () => {
    const s = Array.from({ length: 10 }, (_, i) => saldo('c', `2026-10-${String(i + 10)}`, i));
    expect(historicoSaldo('c', s, 3)).toEqual([7, 8, 9]);
  });
});

describe('variacaoSerie', () => {
  it('calcula a variação do primeiro ao último', () => expect(variacaoSerie([100, 50, 150])).toBe(50));
  it('queda dá negativo', () => expect(variacaoSerie([200, 100])).toBe(-50));
  it('saldo inicial negativo usa o valor absoluto', () => expect(variacaoSerie([-100, 0])).toBe(100));
  it('sem dois valores ou começando em zero, não há variação', () => {
    expect(variacaoSerie([100])).toBeNull();
    expect(variacaoSerie([0, 100])).toBeNull();
  });
});

describe('barrasOrcamento', () => {
  it('dentro do orçamento, a tracejada é a largura toda', () => expect(barrasOrcamento(25, 100)).toEqual({ gasto: 0.25, orcamento: 1 }));
  it('passou do orçamento, a cheia é a largura toda', () => expect(barrasOrcamento(200, 100)).toEqual({ gasto: 1, orcamento: 0.5 }));
  it('sem valores, nada aparece', () => expect(barrasOrcamento(0, 0)).toEqual({ gasto: 0, orcamento: 0 }));
  it('gasto negativo conta como zero', () => expect(barrasOrcamento(-5, 100)).toEqual({ gasto: 0, orcamento: 1 }));
});

describe('passoDaEscala', () => {
  it('cai em 1, 2 ou 5 vezes potência de 10', () => {
    expect(passoDaEscala(1000)).toBe(500);
    expect(passoDaEscala(700)).toBe(200);
    expect(passoDaEscala(30)).toBe(10);
  });
  it('sem valor, passo 1', () => expect(passoDaEscala(0)).toBe(1));
});
