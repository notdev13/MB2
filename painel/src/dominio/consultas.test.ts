import { describe, expect, it } from 'vitest';
import { filtrarCustos, mesAnterior, ordenarCustos, porFornecedor, SEM_FORNECEDOR, totalDoMes, variacao } from './consultas';
import type { Custo } from './tipos';

const custo = (id: string, extra: Partial<Custo> = {}): Custo => ({
  id, obraId: 'a', valor: 100, data: '2026-10-01', categoria: 'Materiais (M)', descricao: '', fornecedor: '',
  pagamento: 'pix', pago: true, criadoEm: '', atualizadoEm: '', ...extra,
});

describe('filtrarCustos', () => {
  const lista = [
    custo('1', { obraId: 'a', data: '2026-09-10', descricao: 'Cimento', fornecedor: 'Casa do Construtor' }),
    custo('2', { obraId: 'b', data: '2026-10-02', categoria: 'Mão de obra', descricao: 'MÃO DE OBRA – ULISSES', pago: false }),
    custo('3', { obraId: 'a', data: '2026-10-20', categoria: 'Serviços (S)', descricao: 'Elétrica', fornecedor: 'João' }),
  ];
  const ids = (cs: Custo[]) => cs.map((c) => c.id);

  it('sem filtro devolve tudo', () => expect(ids(filtrarCustos(lista, {}))).toEqual(['1', '2', '3']));
  it('filtra por obra e categoria', () => {
    expect(ids(filtrarCustos(lista, { obraId: 'a' }))).toEqual(['1', '3']);
    expect(ids(filtrarCustos(lista, { categoria: 'Mão de obra' }))).toEqual(['2']);
  });
  it('período inclui as duas pontas', () => {
    expect(ids(filtrarCustos(lista, { de: '2026-10-02', ate: '2026-10-20' }))).toEqual(['2', '3']);
  });
  it('situação pago / a pagar', () => {
    expect(ids(filtrarCustos(lista, { situacao: 'a_pagar' }))).toEqual(['2']);
    expect(ids(filtrarCustos(lista, { situacao: 'pago' }))).toEqual(['1', '3']);
  });
  it('busca ignora acento e caixa, em descrição e fornecedor, com todas as palavras', () => {
    expect(ids(filtrarCustos(lista, { busca: 'mao de obra' }))).toEqual(['2']);
    expect(ids(filtrarCustos(lista, { busca: 'CONSTRUTOR' }))).toEqual(['1']);
    expect(ids(filtrarCustos(lista, { busca: 'eletrica joao' }))).toEqual(['3']);
    expect(ids(filtrarCustos(lista, { busca: 'cimento joao' }))).toEqual([]);
  });
});

describe('ordenarCustos', () => {
  const lista = [
    custo('1', { data: '2026-10-01', valor: 300, descricao: 'b' }),
    custo('2', { data: '2026-10-03', valor: 100, descricao: 'A' }),
    custo('3', { data: '2026-10-02', valor: 300, descricao: 'c' }),
  ];
  it('por data, nos dois sentidos, sem alterar a original', () => {
    expect(ordenarCustos(lista, 'data', 'desc').map((c) => c.id)).toEqual(['2', '3', '1']);
    expect(ordenarCustos(lista, 'data', 'asc').map((c) => c.id)).toEqual(['1', '3', '2']);
    expect(lista.map((c) => c.id)).toEqual(['1', '2', '3']);
  });
  it('empate de valor desempata pelo mais recente', () => {
    expect(ordenarCustos(lista, 'valor', 'desc').map((c) => c.id)).toEqual(['3', '1', '2']);
  });
  it('texto ignora maiúscula', () => {
    expect(ordenarCustos(lista, 'descricao', 'asc').map((c) => c.id)).toEqual(['2', '1', '3']);
  });
});

describe('porFornecedor', () => {
  it('soma nomes iguais com caixa/acento diferente e põe os vazios em "Sem fornecedor"', () => {
    const r = porFornecedor([
      custo('1', { fornecedor: 'ULISSES', valor: 500 }),
      custo('2', { fornecedor: 'Ulisses ', valor: 300 }),
      custo('3', { fornecedor: 'ULISSES', valor: 200 }),
      custo('4', { fornecedor: '', valor: 2000 }),
      custo('5', { fornecedor: 'José', valor: 10 }),
      custo('6', { fornecedor: 'jose', valor: 10 }),
    ]);
    expect(r).toEqual([
      { fornecedor: SEM_FORNECEDOR, total: 2000, lancamentos: 1 },
      { fornecedor: 'ULISSES', total: 1000, lancamentos: 3 },
      { fornecedor: 'José', total: 20, lancamentos: 2 },
    ]);
  });
});

describe('meses e variação', () => {
  it('mês anterior vira o ano em janeiro', () => {
    expect(mesAnterior('2026-10')).toBe('2026-09');
    expect(mesAnterior('2026-01-15')).toBe('2025-12');
  });
  it('variação sem base é null', () => {
    expect(variacao(150, 100)).toBeCloseTo(0.5);
    expect(variacao(50, 0)).toBeNull();
  });
  it('total do mês', () => {
    expect(totalDoMes([custo('1', { data: '2026-10-05' }), custo('2', { data: '2026-09-30' })], '2026-10')).toBe(100);
  });
});
