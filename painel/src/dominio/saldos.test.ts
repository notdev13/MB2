import { describe, expect, it } from 'vitest';
import { contasComSaldo, diasDesde, lerSaldo, mudancaGrande, saldoAtual, sobraSePagarTudo, totalConsolidado, totalMB2 } from './saldos';
import type { Conta, Custo, Obra, SaldoConta } from './tipos';

const conta = (id: string, obraId: string | null, ativa = true): Conta =>
  ({ id, nome: id, banco: 'Banco', obraId, ativa, criadoEm: '', atualizadoEm: '' });
const saldo = (id: string, contaId: string, data: string, valor: number, criadoEm = '2026-10-01T10:00:00Z'): SaldoConta =>
  ({ id, contaId, data, valor, fonte: 'manual', obs: '', criadoEm });
const obra = { id: 'o1', nome: 'Casa 1', orcamento: 100_000_00 } as Obra;
const custo = (valor: number, pago: boolean, obraId = 'o1'): Custo => ({ obraId, valor, pago } as Custo);

describe('saldoAtual', () => {
  it('pega o de data mais recente, não o último lançado', () => {
    const s = [saldo('a', 'c', '2026-10-20', 100), saldo('b', 'c', '2026-10-10', 999, '2026-10-25T00:00:00Z')];
    expect(saldoAtual('c', s)?.id).toBe('a');
  });
  it('empate de data: vale o criado por último', () => {
    const s = [saldo('a', 'c', '2026-10-20', 100, '2026-10-20T09:00:00Z'), saldo('b', 'c', '2026-10-20', 200, '2026-10-20T15:00:00Z')];
    expect(saldoAtual('c', s)?.id).toBe('b');
    expect(saldoAtual('c', [...s].reverse())?.id).toBe('b');
  });
  it('conta sem saldo devolve null e ignora saldo de outra conta', () => {
    expect(saldoAtual('c', [saldo('a', 'x', '2026-10-20', 1)])).toBeNull();
  });
  it('aceita saldo negativo', () => {
    expect(saldoAtual('c', [saldo('a', 'c', '2026-10-20', -5_000_00)])?.valor).toBe(-5_000_00);
  });
});

describe('diasDesde', () => {
  it('conta dias, inclusive na virada de mês e ano', () => {
    expect(diasDesde('2026-10-30', '2026-10-30')).toBe(0);
    expect(diasDesde('2026-10-23', '2026-10-30')).toBe(7);
    expect(diasDesde('2025-12-31', '2026-01-02')).toBe(2);
  });
  it('data futura vira 0', () => expect(diasDesde('2026-11-05', '2026-10-30')).toBe(0));
});

describe('totais', () => {
  const contas = [conta('mb', null), conta('mb2', null), conta('c1', 'o1'), conta('velha', null, false), conta('vazia', 'o2')];
  const saldos = [
    saldo('1', 'mb', '2026-10-28', 10_000_00), saldo('2', 'mb2', '2026-10-28', -2_000_00),
    saldo('3', 'c1', '2026-10-29', 30_000_00), saldo('4', 'velha', '2026-10-29', 999_00),
  ];
  const itens = contasComSaldo(contas, saldos, '2026-10-30');
  it('ignora conta inativa e traz os dias; conta sem saldo fica com null', () => {
    expect(itens).toHaveLength(4);
    expect(itens.find((i) => i.conta.id === 'mb')?.dias).toBe(2);
    expect(itens.find((i) => i.conta.id === 'vazia')).toMatchObject({ saldo: null, dias: null });
  });
  it('total da MB2 soma só contas da empresa, com negativo', () => expect(totalMB2(itens)).toBe(8_000_00));
  it('consolidado soma tudo, sem contar conta sem saldo', () => expect(totalConsolidado(itens)).toBe(38_000_00));
});

describe('sobraSePagarTudo', () => {
  const itens = (valor: number | null) =>
    contasComSaldo([conta('c1', 'o1')], valor === null ? [] : [saldo('1', 'c1', '2026-10-29', valor)], '2026-10-30');
  const custos = [custo(8_000_00, false), custo(5_000_00, true), custo(1_000_00, false), custo(7_000_00, false, 'outra')];

  it('saldo da conta menos o a pagar da obra', () => {
    expect(sobraSePagarTudo(obra, itens(20_000_00), custos)).toEqual({ saldo: 20_000_00, aPagar: 9_000_00, sobra: 11_000_00 });
  });
  it('fica negativa quando falta dinheiro', () => {
    expect(sobraSePagarTudo(obra, itens(4_000_00), custos)?.sobra).toBe(-5_000_00);
  });
  it('saldo negativo piora a conta', () => {
    expect(sobraSePagarTudo(obra, itens(-1_000_00), custos)?.sobra).toBe(-10_000_00);
  });
  it('sem conta ou sem saldo digitado devolve null', () => {
    expect(sobraSePagarTudo(obra, itens(null), custos)).toBeNull();
    expect(sobraSePagarTudo(obra, [], custos)).toBeNull();
  });
});

describe('lerSaldo', () => {
  it('lê positivo e negativo', () => {
    expect(lerSaldo('1.234,56')).toBe(123_456);
    expect(lerSaldo('-1.234,56')).toBe(-123_456);
    expect(lerSaldo('R$ -50')).toBe(-5_000);
    expect(lerSaldo('−10,5')).toBe(-1_050);
    expect(lerSaldo('0')).toBe(0);
  });
  it('recusa lixo', () => {
    expect(lerSaldo('')).toBeNull();
    expect(lerSaldo('-')).toBeNull();
    expect(lerSaldo('abc')).toBeNull();
    expect(lerSaldo('--5')).toBeNull();
  });
});

describe('mudancaGrande', () => {
  it('só passa de 30% do saldo anterior', () => {
    expect(mudancaGrande(100_00, 130_00)).toBe(false);
    expect(mudancaGrande(100_00, 131_00)).toBe(true);
    expect(mudancaGrande(100_00, 60_00)).toBe(true);
  });
  it('funciona com saldo anterior negativo ou zero', () => {
    expect(mudancaGrande(-100_00, -120_00)).toBe(false);
    expect(mudancaGrande(-100_00, 50_00)).toBe(true);
    expect(mudancaGrande(0, 1_00)).toBe(true);
    expect(mudancaGrande(0, 0)).toBe(false);
  });
});
