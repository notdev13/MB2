import { describe, expect, it } from 'vitest';
import { impactoNoOrcamento, porCategoria, porMes, resumirObra, resumoGeral } from './calculos';
import type { Custo, Obra } from './tipos';

const obra = (id: string, orcamento: number, extra: Partial<Obra> = {}): Obra => ({
  id, nome: id, endereco: '', cliente: '', orcamento, areaM2: null, inicio: null, previsaoFim: null,
  status: 'em_andamento', observacoes: '', criadoEm: '', atualizadoEm: '', ...extra,
});
const custo = (obraId: string, valor: number, data: string, extra: Partial<Custo> = {}): Custo => ({
  id: Math.random().toString(), obraId, valor, data, categoria: 'Materiais (M)', descricao: '', fornecedor: '',
  pagamento: 'pix', pago: true, criadoEm: '', atualizadoEm: '', ...extra,
});

describe('resumirObra', () => {
  it('soma só os custos da obra e calcula saldo, uso e custo/m²', () => {
    const o = obra('a', 100_000_00, { areaM2: 200 });
    const r = resumirObra(o, [
      custo('a', 30_000_00, '2026-09-01'),
      custo('a', 10_000_00, '2026-10-02', { pago: false }),
      custo('b', 99_999_00, '2026-10-03'),
    ]);
    expect(r.gasto).toBe(40_000_00);
    expect(r.aPagar).toBe(10_000_00);
    expect(r.saldo).toBe(60_000_00);
    expect(r.usoOrcamento).toBeCloseTo(0.4);
    expect(r.custoM2).toBe(200_00);
    expect(r.ultimoLancamento).toBe('2026-10-02');
  });

  it('obra sem orçamento e sem área não divide por zero', () => {
    const r = resumirObra(obra('a', 0), [custo('a', 500, '2026-10-01')]);
    expect(r.usoOrcamento).toBe(0);
    expect(r.custoM2).toBeNull();
    expect(r.saldo).toBe(-500);
  });
});

it('porCategoria ordena do maior para o menor', () => {
  const r = porCategoria([
    custo('a', 100, '2026-10-01', { categoria: 'Serviços (S)' }),
    custo('a', 300, '2026-10-01', { categoria: 'Mão de obra' }),
    custo('a', 100, '2026-10-01', { categoria: 'Serviços (S)' }),
  ]);
  expect(r.map((f) => [f.categoria, f.total])).toEqual([['Mão de obra', 300], ['Serviços (S)', 200]]);
  expect(r[0].parte).toBeCloseTo(0.6);
});

it('porMes inclui meses zerados e atravessa a virada do ano', () => {
  const r = porMes([custo('a', 100, '2026-01-15'), custo('a', 50, '2025-11-30')], '2026-02-10', 4);
  expect(r).toEqual([
    { mes: '2025-11', total: 50 },
    { mes: '2025-12', total: 0 },
    { mes: '2026-01', total: 100 },
    { mes: '2026-02', total: 0 },
  ]);
});

it('resumoGeral ignora obras concluídas no orçamento e conta as estouradas', () => {
  const obras = [obra('a', 1000), obra('b', 100), obra('c', 5000, { status: 'concluida' })];
  const custos = [
    custo('a', 500, '2026-10-01'),
    custo('b', 200, '2026-10-05', { pago: false }),
    custo('c', 4000, '2026-09-01'),
  ];
  expect(resumoGeral(obras, custos, '2026-10-26')).toEqual({
    obrasAtivas: 2,
    orcamentoAtivas: 1100,
    gastoAtivas: 700,
    aPagar: 200,
    gastoNoMes: 700,
    estouradas: 1,
  });
});

describe('impactoNoOrcamento', () => {
  const o = obra('a', 100_000_00);

  it('mostra antes e depois em % do orçamento', () => {
    const r = impactoNoOrcamento(o, [custo('a', 62_000_00, '2026-10-01'), custo('b', 50_000_00, '2026-10-01')], 3_000_00)!;
    expect(r.percAntes).toBe(62);
    expect(r.percDepois).toBe(65);
    expect(r.gastoDepois).toBe(65_000_00);
    expect(r.estoura).toBe(false);
    expect(r.excedente).toBe(0);
  });

  it('não mostra nada sem orçamento ou sem valor válido', () => {
    expect(impactoNoOrcamento(obra('a', 0), [], 1_000_00)).toBeNull();
    expect(impactoNoOrcamento(o, [], null)).toBeNull();
    expect(impactoNoOrcamento(o, [], 0)).toBeNull();
    expect(impactoNoOrcamento(o, [], -5_00)).toBeNull();
    expect(impactoNoOrcamento(o, [], 10.5)).toBeNull();
  });

  it('na edição desconta o valor original do próprio lançamento', () => {
    const editado = custo('a', 10_000_00, '2026-10-01', { id: 'x' });
    const r = impactoNoOrcamento(o, [editado, custo('a', 50_000_00, '2026-10-02')], 12_000_00, 'x')!;
    expect(r.gastoAntes).toBe(50_000_00);
    expect(r.percAntes).toBe(50);
    expect(r.percDepois).toBe(62);
  });

  it('avisa o estouro e o excedente em centavos inteiros', () => {
    const r = impactoNoOrcamento(o, [custo('a', 95_000_00, '2026-10-01')], 5_000_01)!;
    expect(r.estoura).toBe(true);
    expect(r.excedente).toBe(1);
    expect(Number.isInteger(r.excedente)).toBe(true);
    expect(impactoNoOrcamento(o, [custo('a', 95_000_00, '2026-10-01')], 5_000_00)!.estoura).toBe(false);
  });
});
