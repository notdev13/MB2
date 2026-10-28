import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { criarRepositorioLocal } from './indexeddb';
import type { Nuvem } from './nuvem';
import type { RegistroNuvem } from './repositorio';
import { sincronizar } from './sincronizacao';
import type { NovaObra, NovoCusto } from '../dominio/tipos';

// Nuvem de mentira com a mesma regra do banco (painel.sql): vale o alterado_em mais novo.
function nuvemFalsa(): Nuvem & { linhas: Map<string, RegistroNuvem> } {
  const linhas = new Map<string, RegistroNuvem>();
  let relogio = Date.parse('2026-01-01T00:00:00Z');
  return {
    linhas,
    email: () => 'dono@mb2',
    async entrar() {},
    async sair() {},
    async enviar(registros) {
      for (const r of registros) {
        const chave = `${r.tipo}:${r.id}`;
        const atual = linhas.get(chave);
        if (atual && Date.parse(r.alteradoEm) < Date.parse(atual.alteradoEm)) continue;
        linhas.set(chave, { ...structuredClone(r), servidorEm: new Date((relogio += 1000)).toISOString() });
      }
    },
    async buscar(desde) {
      return [...linhas.values()]
        .filter((l) => !desde || Date.parse(l.servidorEm!) > Date.parse(desde))
        .sort((a, b) => a.servidorEm!.localeCompare(b.servidorEm!))
        .map((l) => structuredClone(l));
    },
  };
}

const novaObra: NovaObra = {
  nome: 'Lote 39', endereco: '', cliente: '', orcamento: 0, areaM2: null,
  inicio: null, previsaoFim: null, status: 'em_andamento', observacoes: '',
};
const novoCusto = (obraId: string, valor = 360_00): NovoCusto => ({
  obraId, data: '2026-09-17', categoria: 'Materiais (M)', descricao: 'Cimento', fornecedor: '',
  valor, pagamento: 'pix', pago: true,
});
const espera = () => new Promise((ok) => setTimeout(ok, 5));

describe('sincronização entre aparelhos', () => {
  it('o que já existe no iPhone aparece no computador', async () => {
    const nuvem = nuvemFalsa();
    const iphone = criarRepositorioLocal(new IDBFactory());
    const pc = criarRepositorioLocal(new IDBFactory());
    const o = await iphone.salvarObra(novaObra);
    await iphone.salvarCusto(novoCusto(o.id));
    await iphone.gravarMarca(null); // como um aparelho que nunca sincronizou

    expect((await sincronizar(iphone, nuvem)).enviados).toBe(2);
    expect(await sincronizar(pc, nuvem)).toEqual({ enviados: 0, recebidos: 2 });
    expect(await pc.listarObras()).toEqual(await iphone.listarObras());
    expect(await pc.listarCustos()).toEqual(await iphone.listarCustos());
    expect(await iphone.pendentes()).toEqual([]);
  });

  it('edição e exclusão num aparelho chegam ao outro', async () => {
    const nuvem = nuvemFalsa();
    const iphone = criarRepositorioLocal(new IDBFactory());
    const pc = criarRepositorioLocal(new IDBFactory());
    const o = await iphone.salvarObra(novaObra);
    const c = await iphone.salvarCusto(novoCusto(o.id));
    await sincronizar(iphone, nuvem);
    await sincronizar(pc, nuvem);

    await espera();
    await pc.salvarCusto({ ...novoCusto(o.id), descricao: 'Areia' }, c.id);
    await sincronizar(pc, nuvem);
    expect((await sincronizar(iphone, nuvem)).recebidos).toBe(1);
    expect((await iphone.listarCustos())[0].descricao).toBe('Areia');

    await iphone.excluirObra(o.id);
    await sincronizar(iphone, nuvem);
    await sincronizar(pc, nuvem);
    expect(await pc.listarObras()).toEqual([]);
    expect(await pc.listarCustos()).toEqual([]);
  });

  it('em conflito vale a mudança mais recente, em qualquer ordem', async () => {
    const nuvem = nuvemFalsa();
    const iphone = criarRepositorioLocal(new IDBFactory());
    const pc = criarRepositorioLocal(new IDBFactory());
    const o = await iphone.salvarObra(novaObra);
    const c = await iphone.salvarCusto(novoCusto(o.id));
    await sincronizar(iphone, nuvem);
    await sincronizar(pc, nuvem);

    // Os dois mexem sem internet; o computador mexe por último, mas o iPhone sincroniza depois.
    await iphone.salvarCusto(novoCusto(o.id, 400_00), c.id);
    await espera();
    await pc.salvarCusto(novoCusto(o.id, 5_800_00), c.id);
    await sincronizar(pc, nuvem);
    await sincronizar(iphone, nuvem);
    await sincronizar(pc, nuvem);
    expect((await iphone.listarCustos())[0].valor).toBe(5_800_00);
    expect((await pc.listarCustos())[0].valor).toBe(5_800_00);
  });

  it('mudança feita enquanto envia continua na fila', async () => {
    const iphone = criarRepositorioLocal(new IDBFactory());
    const o = await iphone.salvarObra(novaObra);
    const fila = await iphone.pendentes();
    await espera();
    await iphone.salvarObra({ ...novaObra, nome: 'Lote 39 Geminadas' }, o.id);
    await iphone.confirmarEnvio(fila);
    expect(await iphone.pendentes()).toHaveLength(1);
  });

  it('restaurar backup também apaga na nuvem o que saiu', async () => {
    const nuvem = nuvemFalsa();
    const iphone = criarRepositorioLocal(new IDBFactory());
    const pc = criarRepositorioLocal(new IDBFactory());
    const fica = await iphone.salvarObra(novaObra);
    const backup = await iphone.exportar();
    await iphone.salvarObra({ ...novaObra, nome: 'Sai' });
    await sincronizar(iphone, nuvem);
    await sincronizar(pc, nuvem);
    expect(await pc.listarObras()).toHaveLength(2);

    await iphone.substituirTudo(backup);
    await sincronizar(iphone, nuvem);
    await sincronizar(pc, nuvem);
    expect((await pc.listarObras()).map((x) => x.id)).toEqual([fica.id]);
  });

  it('ignora registro inválido vindo da nuvem', async () => {
    const pc = criarRepositorioLocal(new IDBFactory());
    const mudou = await pc.aplicarDaNuvem([
      { tipo: 'obra', id: 'x', dados: { id: 'x', nome: 1 } as never, excluido: false, alteradoEm: '2026-10-01T00:00:00Z' },
    ]);
    expect(mudou).toBe(0);
    expect(await pc.listarObras()).toEqual([]);
  });

  it('banco da versão anterior (sem fila) abre com os dados intactos', async () => {
    const fabrica = new IDBFactory();
    await new Promise<void>((ok) => {
      const req = fabrica.open('mb2-painel', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('obras', { keyPath: 'id' }).put({ ...novaObra, id: 'antiga', criadoEm: 'x', atualizadoEm: 'x' });
        db.createObjectStore('custos', { keyPath: 'id' }).createIndex('obraId', 'obraId');
        db.createObjectStore('copias');
      };
      req.onsuccess = () => { req.result.close(); ok(); };
    });
    const repo = criarRepositorioLocal(fabrica);
    expect((await repo.listarObras()).map((o) => o.id)).toEqual(['antiga']);
    expect(await repo.pendentes()).toEqual([]);
    await repo.enfileirarTudo();
    expect(await repo.pendentes()).toHaveLength(1);
  });
});
