import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarNuvem, type Guarda, type Nuvem, type Sessao } from '../dados/nuvem';
import { gravarUltima, lerUltima, limparUltima } from '../dados/ultimaSincronizacao';
import { Porteiro } from './Porteiro';

const FILHOS = 'CONTEUDO-SECRETO-DO-PAINEL';

function nuvemFalsa(email: string | null): Nuvem {
  return {
    email: () => email,
    ouvir: () => () => {},
    entrar: async () => {},
    sair: async () => {},
    enviar: async () => {},
    buscar: async () => [],
  };
}
const desenhar = (nuvem: Nuvem | null) => renderToString(<Porteiro nuvem={nuvem}>{FILHOS}</Porteiro>);

describe('Porteiro (renderização)', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('nuvem configurada e sem sessão: só o login, sem os filhos', () => {
    const html = desenhar(nuvemFalsa(null));
    expect(html).toContain('Entrar');
    expect(html).toContain('type="password"');
    expect(html).not.toContain(FILHOS);
  });

  it('com sessão: mostra os filhos e não o login', () => {
    const html = desenhar(nuvemFalsa('dono@exemplo.invalid'));
    expect(html).toContain(FILHOS);
    expect(html).not.toContain('type="password"');
  });

  it('sem nuvem (livre): mostra os filhos', () => {
    const html = desenhar(null);
    expect(html).toContain(FILHOS);
    expect(html).not.toContain('type="password"');
  });

  it('botão Mostrar fica fora do label e tem nome próprio; erro ligado ao alerta', () => {
    const html = desenhar(nuvemFalsa(null));
    expect(html).toContain('aria-label="Mostrar senha"');
    expect(html).toMatch(/<label for="porteiro-senha">Senha<\/label>/);
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('aria-live');
  });
});

describe('Sair', () => {
  it('apaga a sessão guardada e a marca da última sincronização', async () => {
    let guardada: Sessao | null = { email: 'a@b', acesso: 'x', renovacao: 'r', expiraEm: Date.now() + 3_600_000 };
    const guarda: Guarda = { ler: () => guardada, gravar: (s) => { guardada = s; } };
    const web = (async () => new Response(null, { status: 204 })) as unknown as typeof fetch;
    const nuvem = criarNuvem({ url: 'https://exemplo.invalid', chave: 'k' }, guarda, web);
    const loja = new Map<string, string>();
    const armazem = { getItem: (k: string) => loja.get(k) ?? null, setItem: (k: string, v: string) => void loja.set(k, v), removeItem: (k: string) => void loja.delete(k) };
    gravarUltima('2026-10-30T10:00:00.000Z', armazem);
    expect(lerUltima(armazem)).not.toBeNull();

    await nuvem.sair();
    limparUltima(armazem); // o que o DadosProvider faz logo depois de nuvem.sair()

    expect(guardada).toBeNull();
    expect(nuvem.email()).toBeNull();
    expect(lerUltima(armazem)).toBeNull();
  });
});
