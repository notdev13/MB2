import { describe, expect, it } from 'vitest';
import { NOMES_OFICIAIS, obrasParaRenomear } from './nomesObras';
import type { Obra } from './tipos';

const obra = (id: string, nome: string): Obra => ({
  id, nome, endereco: '', cliente: '', orcamento: 0, areaM2: null, inicio: null, previsaoFim: null,
  status: 'planejamento', observacoes: '', criadoEm: 't', atualizadoEm: 't',
});

describe('nomes oficiais das obras', () => {
  it('aponta só as obras conhecidas com nome diferente', () => {
    const [id39, idLau] = Object.keys(NOMES_OFICIAIS);
    const r = obrasParaRenomear([obra(id39, 'Obra Geminada JD Campeche – Lote 39'), obra(idLau, 'Laureano'), obra('outra', 'Casa 12')]);
    expect(r.map((o) => o.id)).toEqual([id39]);
  });
});
