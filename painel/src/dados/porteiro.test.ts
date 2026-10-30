import { describe, expect, it } from 'vitest';
import { decidirPorteiro } from './porteiro';

describe('decidirPorteiro', () => {
  it('sem nuvem configurada: livre, com ou sem sessão', () => {
    expect(decidirPorteiro({ configurada: false, sessao: false })).toBe('livre');
    expect(decidirPorteiro({ configurada: false, sessao: true })).toBe('livre');
  });
  it('com nuvem e sem sessão: login', () => {
    expect(decidirPorteiro({ configurada: true, sessao: false })).toBe('login');
    expect(decidirPorteiro({ configurada: true, sessao: false, falhaRenovacao: 'rede' })).toBe('login');
  });
  it('com sessão: abre, inclusive sem internet, 429 e 5xx', () => {
    expect(decidirPorteiro({ configurada: true, sessao: true })).toBe('abrir');
    expect(decidirPorteiro({ configurada: true, sessao: true, falhaRenovacao: null })).toBe('abrir');
    expect(decidirPorteiro({ configurada: true, sessao: true, falhaRenovacao: 'rede' })).toBe('abrir');
    for (const s of [429, 500, 502, 503, 504, 403, 404]) {
      expect(decidirPorteiro({ configurada: true, sessao: true, falhaRenovacao: s })).toBe('abrir');
    }
  });
  it('com sessão e refresh recusado com 400 ou 401: volta ao login', () => {
    expect(decidirPorteiro({ configurada: true, sessao: true, falhaRenovacao: 400 })).toBe('login');
    expect(decidirPorteiro({ configurada: true, sessao: true, falhaRenovacao: 401 })).toBe('login');
  });
});
