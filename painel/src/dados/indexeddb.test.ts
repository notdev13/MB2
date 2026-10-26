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
  obraId, data: '2026-10-20', categoria: 'Estrutura', descricao: 'Aço CA-50', fornecedor: 'Gerdau; filial',
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
  expect(linha).toBe('20/10/2026;Casa 01;Estrutura;Aço CA-50;"Gerdau; filial";12345,67;Boleto;Não');
});
