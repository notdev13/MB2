import { describe, expect, it } from 'vitest';
import { resumoContas, situacaoDaConta } from './calculos';
import { comSaldoAtualizado, novaConta } from './contas';
import type { Conta, Custo, Obra } from './tipos';

const obra = (id: string, status: Obra['status'] = 'em_andamento'): Obra => ({
  id, nome: id, endereco: '', cliente: '', orcamento: 0, areaM2: null, inicio: null, previsaoFim: null,
  status, observacoes: '', criadoEm: '', atualizadoEm: '',
});
const conta = (id: string, obraId: string | null, saldo: number, saldoEm: string): Conta => ({
  id, nome: id, tipo: obraId ? 'obra' : 'principal', obraId, saldo, saldoEm, historico: [], criadoEm: '', atualizadoEm: '',
});
const custo = (obraId: string, valor: number, pago: boolean): Custo => ({
  id: Math.random().toString(), obraId, valor, data: '2026-10-01', categoria: 'Materiais (M)', descricao: '',
  fornecedor: '', pagamento: 'pix', pago, criadoEm: '', atualizadoEm: '',
});

describe('situacaoDaConta', () => {
  it('cobre o a pagar', () => {
    const s = situacaoDaConta(conta('c', 'a', 500_000, '2026-10-29'), 200_000, '2026-10-30');
    expect(s.faltaCobrir).toBe(0);
    expect(s.cobertura).toBe(2.5);
    expect(s.diasDesde).toBe(1);
    expect(s.desatualizado).toBe(false);
  });
  it('não cobre e avisa quanto falta; saldo velho é marcado', () => {
    const s = situacaoDaConta(conta('c', 'a', 100_000, '2026-10-01'), 250_000, '2026-10-30');
    expect(s.faltaCobrir).toBe(150_000);
    expect(s.desatualizado).toBe(true);
  });
  it('saldo negativo: falta o a pagar inteiro; sem a pagar não há cobertura', () => {
    expect(situacaoDaConta(conta('c', 'a', -5_000, '2026-10-30'), 20_000, '2026-10-30').faltaCobrir).toBe(20_000);
    expect(situacaoDaConta(conta('c', 'a', 1, '2026-10-30'), 0, '2026-10-30').cobertura).toBeNull();
  });
});

describe('comSaldoAtualizado', () => {
  it('guarda o saldo anterior no histórico', () => {
    const n = comSaldoAtualizado(conta('c', 'a', 100, '2026-10-01'), 250, '2026-10-10');
    expect(n.saldo).toBe(250);
    expect(n.saldoEm).toBe('2026-10-10');
    expect(n.historico).toEqual([{ data: '2026-10-01', saldo: 100 }]);
    expect(n).not.toHaveProperty('id');
  });
  it('no mesmo dia substitui em vez de duplicar', () => {
    const c1 = { ...conta('c', 'a', 100, '2026-10-10'), historico: [{ data: '2026-10-01', saldo: 50 }] };
    const n = comSaldoAtualizado(c1, 130, '2026-10-10');
    expect(n.historico).toEqual([{ data: '2026-10-01', saldo: 50 }]);
    expect(n.saldo).toBe(130);
  });
});

describe('novaConta', () => {
  it('sem obra é a principal', () => {
    expect(novaConta({ nome: 'x', obraId: null, saldo: 1, data: '2026-10-30' }).tipo).toBe('principal');
    expect(novaConta({ nome: 'x', obraId: 'a', saldo: 1, data: '2026-10-30' }).tipo).toBe('obra');
  });
});

describe('resumoContas', () => {
  const obras = [obra('a'), obra('b'), obra('velha', 'concluida')];
  const custos = [custo('a', 300_000, false), custo('a', 50_000, true), custo('b', 100_000, false)];
  const contas = [conta('ca', 'a', 200_000, '2026-10-30'), conta('cp', null, 900_000, '2026-10-30')];
  const r = resumoContas(obras, custos, contas, '2026-10-30');
  it('soma saldos e a pagar das obras em aberto', () => {
    expect(r.totalEmConta).toBe(1_100_000);
    expect(r.totalNasObras).toBe(200_000);
    expect(r.aPagarTotal).toBe(400_000);
    expect(r.obras.map((l) => l.obra.id)).toEqual(['a', 'b']);
  });
  it('cada obra com seu a pagar e a que não tem conta é contada', () => {
    expect(r.obras[0].situacao?.faltaCobrir).toBe(100_000);
    expect(r.obras[1].situacao).toBeNull();
    expect(r.obrasSemConta).toBe(1);
    expect(r.principal?.faltaCobrir).toBe(0);
  });
});
