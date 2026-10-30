import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it, vi } from 'vitest';
import type { NovaObra } from '../dominio/tipos';
import { criarRepositorioLocal } from './indexeddb';
import { criarNuvem, type Guarda, type Nuvem, type Sessao } from './nuvem';
import type { RegistroNuvem } from './repositorio';
import { confirmarOutraConta, limparSessaoLocal } from './sessaoLocal';
import { sincronizar } from './sincronizacao';
import { gravarConta, gravarUltima, lerConta, lerUltima } from './ultimaSincronizacao';

function armazemFalso() {
  const loja = new Map<string, string>();
  return { getItem: (k: string) => loja.get(k) ?? null, setItem: (k: string, v: string) => void loja.set(k, v), removeItem: (k: string) => void loja.delete(k) };
}

// Nuvem de uma conta (cada conta tem o seu banco): guarda o que recebeu e conta as chamadas.
function nuvemDaConta(inicial: RegistroNuvem[] = []) {
  const linhas = new Map<string, RegistroNuvem>(inicial.map((r) => [`${r.tipo}:${r.id}`, r]));
  const chamadas = { enviar: [] as number[], buscar: [] as (string | null)[] };
  const nuvem: Nuvem = {
    email: () => 'b@exemplo.invalid', ouvir: () => () => {}, entrar: async () => {}, sair: async () => {},
    async enviar(rs) { chamadas.enviar.push(rs.length); rs.forEach((r, i) => linhas.set(`${r.tipo}:${r.id}`, { ...r, servidorEm: `2026-02-01T00:00:${String(10 + i).padStart(2, '0')}Z` })); },
    async buscar(desde) { chamadas.buscar.push(desde); return [...linhas.values()].filter((l) => !desde || l.servidorEm! > desde); },
  };
  return { nuvem, linhas, chamadas };
}

const obra = (nome: string): NovaObra => ({ nome, endereco: '', cliente: '', orcamento: 0, areaM2: null, inicio: null, previsaoFim: null, status: 'em_andamento', observacoes: '' });

describe('Continuar com outra conta: o texto da tela é verdade', () => {
  it('a primeira sincronização com a conta B envia tudo e busca tudo', async () => {
    const aparelho = criarRepositorioLocal(new IDBFactory());
    const armazem = armazemFalso();
    await aparelho.salvarObra(obra('Obra da conta A'));
    // Conta A sincronizou: fila vazia e marca gravada (como fica depois de uma sincronização).
    const contaA = nuvemDaConta();
    await sincronizar(aparelho, contaA.nuvem);
    expect(await aparelho.lerMarca()).not.toBeNull();
    gravarConta('a@exemplo.invalid', armazem);

    // A sessão cai e entra a conta B, que já tem um registro seu na nuvem.
    const doB: RegistroNuvem = { tipo: 'obra', id: 'obra-do-b', dados: null, excluido: true, alteradoEm: '2026-02-01T00:00:00Z', servidorEm: '2026-02-01T00:00:01Z' };
    const contaB = nuvemDaConta([doB]);
    await confirmarOutraConta({ repo: aparelho, email: 'b@exemplo.invalid', armazem });
    await sincronizar(aparelho, contaB.nuvem);

    expect(contaB.chamadas.enviar).toEqual([1]); // a obra do aparelho subiu para B
    expect(contaB.chamadas.buscar).toEqual([null]); // buscou tudo, sem marca da conta A
    expect(lerConta(armazem)).toBe('b@exemplo.invalid');
  });

  it('zera a marca e a última sincronização', async () => {
    const gravarMarca = vi.fn(async () => {});
    const armazem = armazemFalso();
    gravarUltima('2026-10-30T10:00:00.000Z', armazem);
    await confirmarOutraConta({ repo: { gravarMarca }, email: 'B@x', armazem });
    expect(gravarMarca).toHaveBeenCalledWith(null);
    expect(lerUltima(armazem)).toBeNull();
  });
});

describe('limparSessaoLocal (Sair)', () => {
  it('encerra a sessão, zera a marca e a última sincronização; guarda a conta do aparelho', async () => {
    let guardada: Sessao | null = { email: 'a@b', acesso: 'x', renovacao: 'r', expiraEm: Date.now() + 3_600_000 };
    const guarda: Guarda = { ler: () => guardada, gravar: (s) => { guardada = s; } };
    const web = (async () => new Response(null, { status: 204 })) as unknown as typeof fetch;
    const nuvem = criarNuvem({ url: 'https://exemplo.invalid', chave: 'k' }, guarda, web);
    const gravarMarca = vi.fn(async () => {});
    const armazem = armazemFalso();
    gravarUltima('2026-10-30T10:00:00.000Z', armazem);
    gravarConta('a@b', armazem);

    await limparSessaoLocal({ nuvem, repo: { gravarMarca }, armazem });

    expect(guardada).toBeNull();
    expect(nuvem.email()).toBeNull();
    expect(gravarMarca).toHaveBeenCalledWith(null);
    expect(lerUltima(armazem)).toBeNull();
    // A conta fica de propósito: se outra pessoa entrar depois, o painel pergunta antes de enviar os dados daqui.
    expect(lerConta(armazem)).toBe('a@b');
  });
});
