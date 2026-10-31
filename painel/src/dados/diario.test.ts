import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { criarRepositorioDiario } from './diario';
import type { MidiaDiario } from '../dominio/diario';

const midia = (id: string): MidiaDiario => ({ id, tipo: 'foto', mime: 'image/jpeg', bytes: 3, duracaoSeg: null, largura: 1, altura: 1 });

describe('repositório do diário', () => {
  it('grava registro com arquivos, troca mídias e apaga tudo', async () => {
    const repo = criarRepositorioDiario(new IDBFactory());
    const r = await repo.salvar({ obraId: 'o1', data: '2026-10-31', resumo: 'reboco', midias: [midia('m1'), midia('m2')] },
      { m1: new Blob(['abc']), m2: new Blob(['def']) });
    expect((await repo.listar()).length).toBe(1);
    expect(await repo.arquivo('m1')).not.toBeNull();

    await repo.salvar({ obraId: 'o1', data: '2026-10-31', resumo: 'reboco e pintura', midias: [midia('m2')] }, {}, r.id);
    expect(await repo.arquivo('m1')).toBeNull();
    expect(await repo.arquivo('m2')).not.toBeNull();
    const [atual] = await repo.listar();
    expect(atual.resumo).toBe('reboco e pintura');
    expect(atual.criadoEm).toBe(r.criadoEm);

    await repo.excluir(r.id);
    expect(await repo.listar()).toEqual([]);
    expect(await repo.arquivo('m2')).toBeNull();
  });

  it('apaga o diário de uma obra', async () => {
    const repo = criarRepositorioDiario(new IDBFactory());
    await repo.salvar({ obraId: 'o1', data: '2026-10-30', resumo: 'a', midias: [midia('x')] }, { x: new Blob(['1']) });
    await repo.salvar({ obraId: 'o2', data: '2026-10-30', resumo: 'b', midias: [] }, {});
    await repo.excluirDaObra('o1');
    expect((await repo.listar()).map((r) => r.obraId)).toEqual(['o2']);
    expect(await repo.arquivo('x')).toBeNull();
  });
});
