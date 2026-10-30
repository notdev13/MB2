import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { criarRepositorioLocal } from './indexeddb';
import { custosEmCsv, validarBackup } from './backup';
import type { NovaObra, NovoCusto } from '../dominio/tipos';

const novaObra: NovaObra = {
  nome: 'Casa Campeche 01', endereco: 'Rua do Gramal', cliente: '', orcamento: 850_000_00, areaM2: 220,
  inicio: '2026-03-01', previsaoFim: null, status: 'em_andamento', observacoes: '',
};
const novoCusto = (obraId: string, valor = 12_345_67): NovoCusto => ({
  obraId, data: '2026-10-20', categoria: 'Materiais (M)', descricao: 'Aço CA-50', fornecedor: 'Gerdau; filial',
  valor, pagamento: 'boleto', pago: false,
});

describe('repositório local', () => {
  it('cria, edita e lista obras e custos', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    const o = await repo.salvarObra(novaObra);
    const c = await repo.salvarCusto(novoCusto(o.id));
    const editado = await repo.salvarCusto({ ...novoCusto(o.id), pago: true }, c.id);
    expect(editado.criadoEm).toBe(c.criadoEm);
    expect(await repo.listarObras()).toHaveLength(1);
    expect(await repo.listarCustos()).toEqual([editado]);
  });

  it('excluir obra apaga só os custos dela', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    const a = await repo.salvarObra(novaObra);
    const b = await repo.salvarObra({ ...novaObra, nome: 'Outra' });
    await repo.salvarCusto(novoCusto(a.id));
    await repo.salvarCusto(novoCusto(a.id));
    const fica = await repo.salvarCusto(novoCusto(b.id));
    await repo.excluirObra(a.id);
    expect((await repo.listarObras()).map((o) => o.id)).toEqual([b.id]);
    expect(await repo.listarCustos()).toEqual([fica]);
  });

  it('backup exportado passa na validação e restaura igual', async () => {
    const origem = criarRepositorioLocal(new IDBFactory());
    const o = await origem.salvarObra(novaObra);
    await origem.salvarCusto(novoCusto(o.id));
    const backup = JSON.parse(JSON.stringify(await origem.exportar()));
    const v = validarBackup(backup);
    expect(v.ok).toBe(true);

    const destino = criarRepositorioLocal(new IDBFactory());
    await destino.salvarObra({ ...novaObra, nome: 'some na restauração' });
    if (v.ok) await destino.substituirTudo(v.backup);
    expect(await destino.listarObras()).toEqual(await origem.listarObras());
    expect(await destino.listarCustos()).toEqual(await origem.listarCustos());
  });
});

describe('validarBackup', () => {
  it('recusa arquivo de outro app', () => {
    expect(validarBackup({ foo: 1 }).ok).toBe(false);
    expect(validarBackup(null).ok).toBe(false);
  });
  it('recusa custo de obra que não existe', () => {
    const r = validarBackup({
      app: 'mb2-painel', versao: 1, geradoEm: '', obras: [],
      custos: [{ ...novoCusto('x'), id: '1', criadoEm: '', atualizadoEm: '' }],
    });
    expect(r.ok).toBe(false);
  });
});

it('CSV usa ; e vírgula decimal e protege texto com ;', () => {
  const csv = custosEmCsv([{ ...novoCusto('o'), id: '1', criadoEm: '', atualizadoEm: '' }], () => 'Casa 01');
  const [cab, linha] = csv.replace('﻿', '').split('\r\n');
  expect(cab.startsWith('Data;Obra;')).toBe(true);
  expect(linha).toBe('20/10/2026;Casa 01;Materiais (M);Aço CA-50;"Gerdau; filial";12345,67;Boleto;Não');
});

it('restaurar guarda cópia e dá para desfazer', async () => {
  const repo = criarRepositorioLocal(new IDBFactory());
  const o = await repo.salvarObra(novaObra);
  await repo.salvarCusto(novoCusto(o.id));
  const antes = await repo.exportar();
  expect(await repo.copiaAnterior()).toBeNull();
  await repo.substituirTudo({ app: 'mb2-painel', versao: 1, geradoEm: '', obras: [], custos: [] });
  expect(await repo.listarObras()).toEqual([]);
  expect((await repo.copiaAnterior())?.obras).toEqual(antes.obras);
  await repo.desfazerRestauracao();
  expect(await repo.listarObras()).toEqual(antes.obras);
  expect(await repo.listarCustos()).toEqual(antes.custos);
  expect(await repo.copiaAnterior()).toBeNull();
});

it('validarBackup recusa status do protótipo, campo faltando e id repetido', () => {
  const o = { ...novaObra, id: 'o1', criadoEm: '', atualizadoEm: '' };
  const c = { ...novoCusto('o1'), id: 'c1', criadoEm: '', atualizadoEm: '' };
  const base = { app: 'mb2-painel', versao: 1, geradoEm: '2026-10-26T00:00:00Z' };
  expect(validarBackup({ ...base, obras: [o], custos: [c] }).ok).toBe(true);
  expect(validarBackup({ ...base, obras: [{ ...o, status: 'toString' }], custos: [] }).ok).toBe(false);
  expect(validarBackup({ ...base, obras: [o], custos: [{ ...c, criadoEm: undefined }] }).ok).toBe(false);
  expect(validarBackup({ ...base, obras: [o], custos: [c, c] }).ok).toBe(false);
  expect(validarBackup({ ...base, obras: [o, o], custos: [] }).ok).toBe(false);
  expect(validarBackup({ ...base, geradoEm: 5, obras: [], custos: [] }).ok).toBe(false);
});

it('substituirTudo com semCopia não guarda cópia', async () => {
  const repo = criarRepositorioLocal(new IDBFactory());
  await repo.salvarObra(novaObra);
  await repo.substituirTudo({ app: 'mb2-painel', versao: 1, geradoEm: '', obras: [], custos: [] }, { semCopia: true });
  expect(await repo.copiaAnterior()).toBeNull();
});

describe('dinheiro em conta', () => {
  const novaConta = (obraId: string | null) => ({ nome: 'Conta', banco: 'Banco X', obraId, ativa: true });
  const novoSaldo = (contaId: string, valor: number, data = '2026-10-29') => ({ contaId, data, valor, fonte: 'manual' as const, obs: '' });

  it('cada conferência é uma linha nova; aceita negativo; excluir tira só a linha', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    const conta = await repo.salvarConta(novaConta(null));
    const a = await repo.salvarSaldo(novoSaldo(conta.id, 10_000_00));
    const b = await repo.salvarSaldo(novoSaldo(conta.id, -2_500_00));
    expect(a.id).not.toBe(b.id);
    expect((await repo.listarSaldos()).map((s) => s.valor).sort((x, y) => x - y)).toEqual([-2_500_00, 10_000_00]);
    await repo.excluirSaldo(b.id);
    expect(await repo.listarSaldos()).toEqual([a]);
    expect(await repo.listarContas()).toEqual([conta]);
  });

  it('editar conta mantém criadoEm; excluir conta leva os saldos dela', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    const c1 = await repo.salvarConta(novaConta(null));
    const c2 = await repo.salvarConta(novaConta(null));
    const editada = await repo.salvarConta({ ...novaConta(null), nome: 'Outro nome' }, c1.id);
    expect(editada.criadoEm).toBe(c1.criadoEm);
    await repo.salvarSaldo(novoSaldo(c1.id, 1_00));
    const fica = await repo.salvarSaldo(novoSaldo(c2.id, 2_00));
    await repo.excluirConta(c1.id);
    expect((await repo.listarContas()).map((c) => c.id)).toEqual([c2.id]);
    expect(await repo.listarSaldos()).toEqual([fica]);
  });

  it('subir o banco da versão 2 para a 3 só acrescenta lojas e mantém os dados', async () => {
    const fabrica = new IDBFactory();
    const v2 = await new Promise<IDBDatabase>((ok, erro) => {
      const req = fabrica.open('mb2-painel', 2);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('obras', { keyPath: 'id' });
        db.createObjectStore('custos', { keyPath: 'id' }).createIndex('obraId', 'obraId');
        db.createObjectStore('copias');
        db.createObjectStore('pendentes');
        db.createObjectStore('meta');
      };
      req.onsuccess = () => ok(req.result);
      req.onerror = () => erro(req.error);
    });
    const obra = { ...novaObra, id: 'o1', criadoEm: '', atualizadoEm: '' };
    const tx = v2.transaction('obras', 'readwrite');
    tx.objectStore('obras').put(obra);
    await new Promise((ok) => { tx.oncomplete = ok; });
    v2.close();

    const repo = criarRepositorioLocal(fabrica);
    expect(await repo.listarObras()).toEqual([obra]);
    expect(await repo.listarContas()).toEqual([]);
    const conta = await repo.salvarConta(novaConta('o1'));
    expect(await repo.listarContas()).toEqual([conta]);
  });
});

describe('backup versão 2 e compatibilidade com a versão 1', () => {
  const obra = { ...novaObra, id: 'o1', criadoEm: '', atualizadoEm: '' };
  const conta = { id: 'c1', nome: 'Conta', banco: 'Banco', obraId: 'o1', ativa: true, criadoEm: '', atualizadoEm: '' };
  const saldo = { id: 's1', contaId: 'c1', data: '2026-10-29', valor: -1_00, fonte: 'manual', obs: '', criadoEm: '' };
  const base = { app: 'mb2-painel', geradoEm: '2026-10-26T00:00:00Z', obras: [obra], custos: [] };

  it('exporta versão 2 com contas e saldos e restaura igual', async () => {
    const origem = criarRepositorioLocal(new IDBFactory());
    const o = await origem.salvarObra(novaObra);
    const c = await origem.salvarConta({ nome: 'Conta', banco: 'B', obraId: o.id, ativa: true });
    await origem.salvarSaldo({ contaId: c.id, data: '2026-10-29', valor: -5_00, fonte: 'manual', obs: 'no vermelho' });
    const backup = JSON.parse(JSON.stringify(await origem.exportar()));
    expect(backup.versao).toBe(2);
    const v = validarBackup(backup);
    expect(v.ok).toBe(true);
    const destino = criarRepositorioLocal(new IDBFactory());
    if (v.ok) await destino.substituirTudo(v.backup);
    expect(await destino.listarContas()).toEqual(await origem.listarContas());
    expect(await destino.listarSaldos()).toEqual(await origem.listarSaldos());
  });

  it('valida: v1 vira contas/saldos vazios; v2 confere contas e saldos', () => {
    const v1 = validarBackup({ ...base, versao: 1 });
    expect(v1.ok && v1.backup.contas).toEqual([]);
    expect(validarBackup({ ...base, versao: 2, contas: [conta], saldos: [saldo] }).ok).toBe(true);
    expect(validarBackup({ ...base, versao: 2 }).ok).toBe(false);
    expect(validarBackup({ ...base, versao: 3, contas: [], saldos: [] }).ok).toBe(false);
    expect(validarBackup({ ...base, versao: 2, contas: [{ ...conta, obraId: 'nao-existe' }], saldos: [] }).ok).toBe(false);
    expect(validarBackup({ ...base, versao: 2, contas: [{ ...conta, obraId: null }], saldos: [saldo] }).ok).toBe(true);
    expect(validarBackup({ ...base, versao: 2, contas: [conta], saldos: [{ ...saldo, contaId: 'x' }] }).ok).toBe(false);
    expect(validarBackup({ ...base, versao: 2, contas: [conta], saldos: [{ ...saldo, valor: 1.5 }] }).ok).toBe(false);
    expect(validarBackup({ ...base, versao: 2, contas: [conta], saldos: [saldo, saldo] }).ok).toBe(false);
  });

  it('custo continua só >= 0, mesmo com saldo aceitando negativo', () => {
    const c = { ...novoCusto('o1'), id: 'c1', valor: -1, criadoEm: '', atualizadoEm: '' };
    expect(validarBackup({ ...base, versao: 2, custos: [c], contas: [], saldos: [] }).ok).toBe(false);
  });

  it('restaurar backup versão 1 NÃO apaga contas e saldos do aparelho', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    const c = await repo.salvarConta({ nome: 'Conta', banco: 'B', obraId: null, ativa: true });
    const s = await repo.salvarSaldo({ contaId: c.id, data: '2026-10-29', valor: 7_00, fonte: 'manual', obs: '' });
    const v = validarBackup({ ...base, versao: 1 });
    if (v.ok) await repo.substituirTudo(v.backup);
    expect(await repo.listarObras()).toHaveLength(1);
    expect(await repo.listarContas()).toEqual([c]);
    expect(await repo.listarSaldos()).toEqual([s]);
  });

  it('restaurar versão 2 troca contas e saldos, e desfazer devolve os de antes', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    const c = await repo.salvarConta({ nome: 'Conta', banco: 'B', obraId: null, ativa: true });
    await repo.salvarSaldo({ contaId: c.id, data: '2026-10-29', valor: 7_00, fonte: 'manual', obs: '' });
    const antes = await repo.exportar();
    await repo.substituirTudo({ app: 'mb2-painel', versao: 2, geradoEm: '', obras: [], custos: [], contas: [], saldos: [] });
    expect(await repo.listarContas()).toEqual([]);
    expect(await repo.listarSaldos()).toEqual([]);
    await repo.desfazerRestauracao();
    expect(await repo.listarContas()).toEqual(antes.contas);
    expect(await repo.listarSaldos()).toEqual(antes.saldos);
  });
});

describe('contas de obra que some', () => {
  const conta = (obraId: string | null) => ({ nome: 'Conta', banco: 'Banco X', obraId, ativa: true });

  it('excluir a obra leva a conta dela e os saldos, e o backup continua válido', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    const a = await repo.salvarObra(novaObra);
    const b = await repo.salvarObra({ ...novaObra, nome: 'Outra' });
    const ca = await repo.salvarConta(conta(a.id));
    const cb = await repo.salvarConta(conta(b.id));
    const cm = await repo.salvarConta(conta(null));
    for (const c of [ca, cb, cm]) await repo.salvarSaldo({ contaId: c.id, data: '2026-10-30', valor: 100_00, fonte: 'manual', obs: '' });
    await repo.excluirObra(a.id);
    expect((await repo.listarContas()).map((c) => c.id).sort()).toEqual([cb.id, cm.id].sort());
    expect((await repo.listarSaldos()).map((s) => s.contaId).sort()).toEqual([cb.id, cm.id].sort());
    expect(validarBackup(await repo.exportar()).ok).toBe(true);
  });

  it('restaurar backup v1 tira as contas de obras que não existem mais e mantém as outras', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    const a = await repo.salvarObra(novaObra);
    const cm = await repo.salvarConta(conta(null));
    await repo.salvarConta(conta(a.id));
    const v1 = { app: 'mb2-painel', versao: 1, geradoEm: '2026-10-01T00:00:00.000Z', obras: [], custos: [] };
    const v = validarBackup(v1);
    if (!v.ok) throw new Error(v.erro);
    await repo.substituirTudo(v.backup);
    expect((await repo.listarContas()).map((c) => c.id)).toEqual([cm.id]);
    expect(validarBackup(await repo.exportar()).ok).toBe(true);
  });
});

// ---- Contas e saldos na fila da nuvem (dados inventados) ----
describe('contas e saldos na fila da nuvem', () => {
  const nConta = (obraId: string | null = null) => ({ nome: 'Conta A', banco: 'Banco X', obraId, ativa: true });
  const nSaldo = (contaId: string, valor: number, data = '2026-10-29') => ({ contaId, data, valor, fonte: 'manual' as const, obs: '' });
  const chaves = async (r: ReturnType<typeof criarRepositorioLocal>) => (await r.pendentes()).map((p) => `${p.tipo}:${p.id}${p.excluido ? ':x' : ''}`).sort();
  const daNuvem = (tipo: 'conta' | 'saldo', dados: any, alteradoEm = '2099-01-01T00:00:00.000Z', excluido = false) =>
    ({ tipo, id: dados.id, dados: excluido ? null : dados, excluido, alteradoEm }) as never;
  const contaNuvem = (id = 'c1', extra: object = {}) =>
    ({ id, nome: 'Conta N', banco: 'Banco Y', obraId: null, ativa: true, criadoEm: '2026-10-01T00:00:00.000Z', atualizadoEm: '2026-10-01T00:00:00.000Z', ...extra });
  const saldoNuvem = (id = 's1', contaId = 'c1', extra: object = {}) =>
    ({ id, contaId, data: '2026-10-29', valor: -12_34, fonte: 'manual', obs: '', criadoEm: '2026-10-29T00:00:00.000Z', ...extra });

  it('gravar conta e saldo entra na fila; paraEnviar traz o registro atual em centavos', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    const c = await repo.salvarConta(nConta());
    const s = await repo.salvarSaldo(nSaldo(c.id, -1_050_00));
    expect(await chaves(repo)).toEqual([`conta:${c.id}`, `saldo:${s.id}`].sort());
    const env = await repo.paraEnviar(await repo.pendentes());
    expect(env.find((r) => r.tipo === 'conta')!.dados).toEqual(c);
    const rs = env.find((r) => r.tipo === 'saldo')!;
    expect(rs.dados).toEqual(s);
    expect(Number.isSafeInteger((rs.dados as { valor: number }).valor)).toBe(true);
    expect(rs.alteradoEm).toBe(s.criadoEm);
  });

  it('excluir saldo e excluir conta viram exclusões na fila; a conta leva os saldos', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    const c = await repo.salvarConta(nConta());
    const s1 = await repo.salvarSaldo(nSaldo(c.id, 1_00));
    const s2 = await repo.salvarSaldo(nSaldo(c.id, 2_00));
    await repo.excluirSaldo(s1.id);
    expect(await chaves(repo)).toContain(`saldo:${s1.id}:x`);
    await repo.excluirConta(c.id);
    expect(await chaves(repo)).toEqual([`conta:${c.id}:x`, `saldo:${s1.id}:x`, `saldo:${s2.id}:x`].sort());
    const env = await repo.paraEnviar(await repo.pendentes());
    expect(env.every((r) => r.excluido && r.dados === null)).toBe(true);
  });

  it('recebe conta e saldo da nuvem', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    const mudou = await repo.aplicarDaNuvem([daNuvem('conta', contaNuvem()), daNuvem('saldo', saldoNuvem())]);
    expect(mudou).toBe(2);
    expect(await repo.listarContas()).toEqual([contaNuvem()]);
    expect(await repo.listarSaldos()).toEqual([saldoNuvem()]);
    expect(await repo.pendentes()).toEqual([]);
  });

  it('conflito: mudança local mais nova vence; nuvem mais nova vence', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    const c = await repo.salvarConta(nConta());
    await repo.aplicarDaNuvem([daNuvem('conta', { ...c, nome: 'Velha' }, '2000-01-01T00:00:00.000Z')]);
    expect((await repo.listarContas())[0].nome).toBe('Conta A');
    expect(await repo.pendentes()).toHaveLength(1);
    await repo.aplicarDaNuvem([daNuvem('conta', { ...c, nome: 'Nova' }, '2099-01-01T00:00:00.000Z')]);
    expect((await repo.listarContas())[0].nome).toBe('Nova');
    expect(await repo.pendentes()).toEqual([]);
  });

  it('exclusão da nuvem leva a conta e os saldos dela; exclusão mais velha que a edição local não vale', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    await repo.aplicarDaNuvem([daNuvem('conta', contaNuvem()), daNuvem('saldo', saldoNuvem())]);
    await repo.aplicarDaNuvem([daNuvem('conta', contaNuvem(), '2099-01-02T00:00:00.000Z', true)]);
    expect(await repo.listarContas()).toEqual([]);
    expect(await repo.listarSaldos()).toEqual([]);

    const c = await repo.salvarConta(nConta());
    await repo.aplicarDaNuvem([daNuvem('conta', c, '2000-01-01T00:00:00.000Z', true)]);
    expect(await repo.listarContas()).toEqual([c]);
  });

  it('ignora registro inválido da nuvem sem derrubar o lote nem apagar dado local', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    const c = await repo.salvarConta(nConta());
    const s = await repo.salvarSaldo(nSaldo(c.id, 5_00));
    await repo.confirmarEnvio(await repo.pendentes());
    const mudou = await repo.aplicarDaNuvem([
      daNuvem('saldo', { ...s, valor: 10.5 }),
      daNuvem('saldo', { ...s, valor: Number.MAX_SAFE_INTEGER + 2 }),
      daNuvem('saldo', { ...s, data: '29/10/2026' }),
      daNuvem('saldo', { ...s, fonte: 'automatica' }),
      daNuvem('conta', { ...c, ativa: 'sim' }),
      daNuvem('conta', { ...c, nome: 5 }),
      { tipo: 'cofre', id: 'z', dados: { id: 'z' }, excluido: false, alteradoEm: '2099-01-01T00:00:00.000Z' } as never,
      daNuvem('conta', contaNuvem('c-ok')),
    ]);
    expect(mudou).toBe(1);
    expect((await repo.listarContas()).map((x) => x.id).sort()).toEqual([c.id, 'c-ok'].sort());
    expect(await repo.listarSaldos()).toEqual([s]);
  });

  it('ordem: no mesmo lote a conta entra antes do saldo, mesmo que o saldo venha primeiro', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    await repo.aplicarDaNuvem([daNuvem('saldo', saldoNuvem()), daNuvem('conta', contaNuvem())]);
    expect(await repo.listarSaldos()).toEqual([saldoNuvem()]);
  });

  it('saldo que chega antes da conta (lotes separados) fica guardado e entra quando a conta chegar', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    expect(await repo.aplicarDaNuvem([daNuvem('saldo', saldoNuvem())])).toBe(0);
    expect(await repo.listarSaldos()).toEqual([]);
    await repo.aplicarDaNuvem([daNuvem('conta', contaNuvem())]);
    expect(await repo.listarContas()).toEqual([contaNuvem()]);
    expect(await repo.listarSaldos()).toEqual([saldoNuvem()]);
    expect(validarBackup(await repo.exportar()).ok).toBe(true);
  });

  it('saldo guardado de conta que foi excluída não volta', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    await repo.aplicarDaNuvem([daNuvem('saldo', saldoNuvem())]);
    await repo.aplicarDaNuvem([daNuvem('conta', contaNuvem(), '2099-01-02T00:00:00.000Z', true)]);
    await repo.aplicarDaNuvem([daNuvem('conta', contaNuvem(), '2099-01-03T00:00:00.000Z')]);
    expect(await repo.listarSaldos()).toEqual([]);
  });

  it('conta de uma obra que ainda não chegou espera pela obra', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    await repo.aplicarDaNuvem([daNuvem('conta', contaNuvem('c1', { obraId: 'o1' }))]);
    expect(await repo.listarContas()).toEqual([]);
    const obra = { ...novaObra, id: 'o1', criadoEm: '2026-10-01T00:00:00.000Z', atualizadoEm: '2026-10-01T00:00:00.000Z' };
    await repo.aplicarDaNuvem([{ tipo: 'obra', id: 'o1', dados: obra, excluido: false, alteradoEm: '2099-01-01T00:00:00.000Z' }]);
    expect((await repo.listarContas()).map((c) => c.id)).toEqual(['c1']);
  });

  it('primeira entrada (enfileirarTudo) leva contas e saldos', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    const c = await repo.salvarConta(nConta());
    const s = await repo.salvarSaldo(nSaldo(c.id, 3_00));
    await repo.confirmarEnvio(await repo.pendentes());
    expect(await repo.pendentes()).toEqual([]);
    await repo.gravarMarca(null);
    await repo.enfileirarTudo();
    expect(await chaves(repo)).toEqual([`conta:${c.id}`, `saldo:${s.id}`].sort());
  });

  it('restaurar backup v2 enfileira contas e saldos que entram e os que saem', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    const velha = await repo.salvarConta(nConta());
    const sv = await repo.salvarSaldo(nSaldo(velha.id, 1_00));
    await repo.confirmarEnvio(await repo.pendentes());
    const bk = { app: 'mb2-painel' as const, versao: 2 as const, geradoEm: '2026-10-30T00:00:00.000Z', obras: [], custos: [],
      contas: [contaNuvem('cb')] as never, saldos: [saldoNuvem('sb', 'cb')] as never };
    await repo.substituirTudo(bk);
    expect(await chaves(repo)).toEqual([`conta:cb`, `saldo:sb`, `conta:${velha.id}:x`, `saldo:${sv.id}:x`].sort());
  });

  it('backup v1 não mexe nas contas do aparelho nem na fila delas', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    const c = await repo.salvarConta(nConta());
    await repo.confirmarEnvio(await repo.pendentes());
    await repo.substituirTudo({ app: 'mb2-painel', versao: 1, geradoEm: '2026-10-30T00:00:00.000Z', obras: [], custos: [] });
    expect(await repo.listarContas()).toEqual([c]);
    expect(await repo.pendentes()).toEqual([]);
  });

  it('excluir obra enfileira a exclusão da conta dela e dos saldos', async () => {
    const repo = criarRepositorioLocal(new IDBFactory());
    const o = await repo.salvarObra(novaObra);
    const c = await repo.salvarConta(nConta(o.id));
    const s = await repo.salvarSaldo(nSaldo(c.id, 1_00));
    await repo.confirmarEnvio(await repo.pendentes());
    await repo.excluirObra(o.id);
    expect(await chaves(repo)).toEqual([`obra:${o.id}:x`, `conta:${c.id}:x`, `saldo:${s.id}:x`].sort());
  });
});
