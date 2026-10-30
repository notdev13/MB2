import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Nuvem } from '../dados/nuvem';
import { gravarConta } from '../dados/ultimaSincronizacao';
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
function armazemFalso() {
  const loja = new Map<string, string>();
  return { getItem: (k: string) => loja.get(k) ?? null, setItem: (k: string, v: string) => void loja.set(k, v), removeItem: (k: string) => void loja.delete(k) };
}
const desenhar = (nuvem: Nuvem | null, armazem = armazemFalso()) =>
  renderToString(<Porteiro nuvem={nuvem} armazem={armazem}>{FILHOS}</Porteiro>);

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

describe('Porteiro: aparelho que já foi de outra conta', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('conta gravada diferente da sessão: faz a pergunta e não mostra os filhos', () => {
    const armazem = armazemFalso();
    gravarConta('a@exemplo.invalid', armazem);
    const html = desenhar(nuvemFalsa('b@exemplo.invalid'), armazem);
    expect(html).toContain('Outra conta');
    expect(html).toContain('a@exemplo.invalid');
    expect(html).toContain('b@exemplo.invalid');
    expect(html).not.toContain(FILHOS);
  });

  it('mesma conta (mesmo com maiúsculas): mostra os filhos', () => {
    const armazem = armazemFalso();
    gravarConta('a@exemplo.invalid', armazem);
    const html = desenhar(nuvemFalsa('A@Exemplo.invalid'), armazem);
    expect(html).toContain(FILHOS);
    expect(html).not.toContain('Outra conta');
  });

  it('sem conta gravada (aparelho antigo): mostra os filhos', () => {
    const html = desenhar(nuvemFalsa('b@exemplo.invalid'), armazemFalso());
    expect(html).toContain(FILHOS);
    expect(html).not.toContain('Outra conta');
  });
});
