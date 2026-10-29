import { describe, expect, it } from 'vitest';
import { porCategoria, porMes, resumirObra, gastoComOrcamento, resumoGeral, situacaoOrcamento, textoSituacao } from './calculos';
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

describe('situacaoOrcamento', () => {
  const orc = 100_000_00; // R$ 100.000,00 em centavos
  it('sem orçamento (0 ou negativo) não compara', () => {
    expect(situacaoOrcamento(0, 0)).toBe('sem-orcamento');
    expect(situacaoOrcamento(5_000_00, 0)).toBe('sem-orcamento');
    expect(situacaoOrcamento(5_000_00, -1)).toBe('sem-orcamento');
  });
  it('gasto zero é folga', () => {
    expect(situacaoOrcamento(0, orc)).toBe('folga');
  });
  it('80% exato vira atenção; 1 centavo antes ainda é folga', () => {
    expect(situacaoOrcamento(80_000_00 - 1, orc)).toBe('folga');
    expect(situacaoOrcamento(80_000_00, orc)).toBe('atencao');
  });
  it('95% exato vira limite; 1 centavo antes ainda é atenção', () => {
    expect(situacaoOrcamento(95_000_00 - 1, orc)).toBe('atencao');
    expect(situacaoOrcamento(95_000_00, orc)).toBe('limite');
  });
  it('100% exato ainda não estourou; 1 centavo a mais estourou', () => {
    expect(situacaoOrcamento(orc, orc)).toBe('limite');
    expect(situacaoOrcamento(orc + 1, orc)).toBe('estourou');
  });
  it('funciona com valores pequenos em centavos', () => {
    expect(situacaoOrcamento(79, 100)).toBe('folga');
    expect(situacaoOrcamento(80, 100)).toBe('atencao');
    expect(situacaoOrcamento(1, 1)).toBe('limite');
    expect(situacaoOrcamento(2, 1)).toBe('estourou');
  });
});

describe('textoSituacao', () => {
  const orc = 100_000_00;
  it('folga não mostra porcentagem', () => {
    expect(textoSituacao(50_000_00, orc)).toBe('Tranquilo');
  });
  it('o número nunca contradiz a faixa', () => {
    expect(textoSituacao(94_600_00, orc)).toBe('Atenção · 94%');
    expect(textoSituacao(99_600_00, orc)).toBe('No limite · 99%');
    expect(textoSituacao(orc, orc)).toBe('No limite · 100%');
    expect(textoSituacao(orc + 1, orc)).toBe('Estourou · 101%');
    expect(textoSituacao(112_000_00, orc)).toBe('Estourou · 112%');
  });
});

describe('gastoComOrcamento', () => {
  it('ignora obras sem orçamento e obras concluídas', () => {
    const obras = [obra('a', 100_000_00), obra('b', 0), obra('c', 5_000_00, { status: 'concluida' })];
    const custos = [custo('a', 50_000_00, '2026-10-01'), custo('b', 60_000_00, '2026-10-01'), custo('c', 1_000_00, '2026-10-01')];
    expect(gastoComOrcamento(obras, custos)).toBe(50_000_00);
    expect(resumoGeral(obras, custos, '2026-10-26').estouradas).toBe(0);
  });
});
