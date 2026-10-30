import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { saldoAtual } from '../dominio/saldos';
import { lerOfx } from '../dominio/ofx';
import { ofxSgml } from '../dominio/ofx.fixtures';
import type { Conta } from '../dominio/tipos';
import { contaValida, saldoValido, validarBackup } from './backup';
import { gravarImportacao } from './importar';
import { criarRepositorioLocal } from './indexeddb';

const HOJE = '2026-10-30';
const extratoDe = (o: Parameters<typeof ofxSgml>[0]) => {
  const r = lerOfx(ofxSgml(o));
  if (!r.ok) throw new Error(r.erro);
  return r.extrato;
};

describe('validação de conta e saldo (backup e nuvem)', () => {
  const conta = { id: 'c', nome: 'n', banco: 'b', obraId: null, ativa: true, criadoEm: 'x', atualizadoEm: 'x' };
  const saldo = { id: 's', contaId: 'c', data: '2026-10-30', valor: -5, fonte: 'manual', obs: '', criadoEm: 'x' };
  it('registro antigo continua válido', () => {
    expect(contaValida(conta)).toBe(true);
    expect(saldoValido(saldo)).toBe(true);
  });
  it('fonte "extrato" é aceita; fonte desconhecida continua inválida', () => {
    expect(saldoValido({ ...saldo, fonte: 'extrato' })).toBe(true);
    for (const f of ['pdf', 'Manual', '', null, undefined, 1, 'extrato ']) expect(saldoValido({ ...saldo, fonte: f })).toBe(false);
  });
  it('finalConta é opcional e só aceita 4 dígitos', () => {
    expect(contaValida({ ...conta, finalConta: '0001' })).toBe(true);
    for (const f of ['001', '00001', 'abcd', '', null, 1234, '12 4']) expect(contaValida({ ...conta, finalConta: f })).toBe(false);
  });
  it('o resto da validação não afrouxou', () => {
    expect(saldoValido({ ...saldo, valor: 1.5, fonte: 'extrato' })).toBe(false);
    expect(saldoValido({ ...saldo, data: '30/10/2026', fonte: 'extrato' })).toBe(false);
    expect(contaValida({ ...conta, ativa: 'sim', finalConta: '0001' })).toBe(false);
  });
  it('backup versão antiga (sem finalConta, fonte manual) continua restaurando; o novo também', () => {
    const base = { app: 'mb2-painel', versao: 2, geradoEm: 'x', obras: [], custos: [] };
    expect(validarBackup({ ...base, contas: [conta], saldos: [saldo] }).ok).toBe(true);
    expect(validarBackup({ ...base, contas: [{ ...conta, finalConta: '0001' }], saldos: [{ ...saldo, fonte: 'extrato' }] }).ok).toBe(true);
    expect(validarBackup({ ...base, contas: [conta], saldos: [{ ...saldo, fonte: 'pdf' }] }).ok).toBe(false);
  });
});

describe('importação de PDF (valor e data escolhidos pelo dono)', () => {
  it('grava fonte "extrato" com a obs do PDF, sem finalConta e sem nada do arquivo', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    const conta = await repo.salvarConta({ nome: 'C', banco: '', obraId: null, ativa: true });
    const r = await gravarImportacao(repo, { saldo: -12_345, data: '2026-10-28' }, conta, [], HOJE, { origem: 'pdf' });
    expect(r).toMatchObject({ ok: true, finalGravado: false });
    const [s] = await repo.listarSaldos();
    expect(s).toMatchObject({ valor: -12_345, data: '2026-10-28', fonte: 'extrato', obs: 'Importado do extrato (PDF), conferido pelo dono' });
    expect((await repo.listarContas())[0].finalConta).toBeUndefined();
  });
  it('conta que já tem final aceita o PDF e mantém o final', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    const conta = await repo.salvarConta({ nome: 'C', banco: '', obraId: null, ativa: true, finalConta: '0001' });
    expect(await gravarImportacao(repo, { saldo: 1, data: HOJE }, conta, [], HOJE, { origem: 'pdf' })).toMatchObject({ ok: true });
    expect((await repo.listarContas())[0].finalConta).toBe('0001');
  });
  it('a regra de ouro vale para PDF na hora de gravar: data antiga é recusada e nada é gravado', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    const conta = await repo.salvarConta({ nome: 'C', banco: '', obraId: null, ativa: true });
    await repo.salvarSaldo({ contaId: conta.id, data: '2026-10-29', valor: 5, fonte: 'manual', obs: '' });
    const r = await gravarImportacao(repo, { saldo: 9, data: '2026-10-01' }, conta, await repo.listarSaldos(), HOJE, { origem: 'pdf' });
    expect(r).toMatchObject({ ok: false, motivo: 'antigo' });
    expect(await repo.listarSaldos()).toHaveLength(1);
  });
});

describe('importação ponta a ponta com repositório em memória', () => {
  it('A ok -> A repetido -> mais antigo rejeitado -> mais novo ok -> outro final rejeitado', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    let conta: Conta = await repo.salvarConta({ nome: 'Conta Teste', banco: 'Banco Teste', obraId: null, ativa: true });
    const importar = async (o: Parameters<typeof ofxSgml>[0]) => {
      const r = await gravarImportacao(repo, extratoDe(o), conta, await repo.listarSaldos(), HOJE);
      conta = (await repo.listarContas()).find((c) => c.id === conta.id)!;
      return r;
    };

    const a = await importar({ saldo: '1000.00', dtasof: '20261020' });
    expect(a).toMatchObject({ ok: true, finalGravado: true });
    expect(conta.finalConta).toBe('0001');
    const gravado = (await repo.listarSaldos())[0];
    expect(gravado).toMatchObject({ valor: 100_000, data: '2026-10-20', fonte: 'extrato', obs: 'Importado do extrato (OFX)' });
    expect(JSON.stringify(gravado)).not.toContain('0000000001');

    expect(await importar({ saldo: '1000.00', dtasof: '20261020' })).toMatchObject({ ok: false, motivo: 'repetido' });
    expect(await importar({ saldo: '900.00', dtasof: '20261015' })).toMatchObject({ ok: false, motivo: 'antigo' });
    expect(await repo.listarSaldos()).toHaveLength(1);

    expect(await importar({ saldo: '1100.00', dtasof: '20261025' })).toMatchObject({ ok: true, finalGravado: false });
    expect(saldoAtual(conta.id, await repo.listarSaldos())).toMatchObject({ valor: 110_000, data: '2026-10-25' });

    expect(await importar({ saldo: '50.00', dtasof: '20261028', conta: '9999999999' })).toMatchObject({ ok: false, motivo: 'outra-conta' });
    expect(await repo.listarSaldos()).toHaveLength(2);
    expect(conta.finalConta).toBe('0001');
  });

  it('a regra é conferida de novo na hora de gravar (a tela não consegue burlar)', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    const conta = await repo.salvarConta({ nome: 'C', banco: '', obraId: null, ativa: true });
    await repo.salvarSaldo({ contaId: conta.id, data: '2026-10-29', valor: 5, fonte: 'manual', obs: '' });
    const r = await gravarImportacao(repo, extratoDe({ dtasof: '20261001' }), conta, await repo.listarSaldos(), HOJE);
    expect(r).toMatchObject({ ok: false, motivo: 'antigo' });
    expect(await repo.listarSaldos()).toHaveLength(1);
  });

  it('o final gravado aparece no backup exportado e ele restaura', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    const conta = await repo.salvarConta({ nome: 'C', banco: '', obraId: null, ativa: true });
    await gravarImportacao(repo, extratoDe({}), conta, [], HOJE);
    const v = validarBackup(JSON.parse(JSON.stringify(await repo.exportar())));
    expect(v.ok).toBe(true);
    expect(v.ok && v.backup.contas?.[0].finalConta).toBe('0001');
    expect(v.ok && v.backup.saldos?.[0].fonte).toBe('extrato');
  });

  it('saldo manual futuro por engano não trava a importação', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    const conta = await repo.salvarConta({ nome: 'C', banco: '', obraId: null, ativa: true });
    await repo.salvarSaldo({ contaId: conta.id, data: '2027-05-01', valor: 5, fonte: 'manual', obs: '' });
    const r = await gravarImportacao(repo, extratoDe({}), conta, await repo.listarSaldos(), HOJE);
    expect(r.ok).toBe(true);
  });
});
