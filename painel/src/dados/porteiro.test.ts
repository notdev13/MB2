import { describe, expect, it } from 'vitest';
import { decidirPorteiro, esperaAposErro, precisaConfirmarConta } from './porteiro';

describe('decidirPorteiro', () => {
  it('sem nuvem configurada: livre, com ou sem sessão', () => {
    expect(decidirPorteiro({ configurada: false, sessao: false })).toBe('livre');
    expect(decidirPorteiro({ configurada: false, sessao: true })).toBe('livre');
  });
  it('com nuvem e sem sessão: login', () => {
    expect(decidirPorteiro({ configurada: true, sessao: false })).toBe('login');
  });
  it('com nuvem e sessão guardada: abre', () => {
    expect(decidirPorteiro({ configurada: true, sessao: true })).toBe('abrir');
  });
});

describe('esperaAposErro', () => {
  it('senha errada espera pouco, limite de tentativas espera mais, outros erros não esperam', () => {
    expect(esperaAposErro('sessao')).toBe(3);
    expect(esperaAposErro('limite')).toBeGreaterThan(esperaAposErro('sessao'));
    expect(esperaAposErro('rede')).toBe(0);
    expect(esperaAposErro('servidor')).toBe(0);
  });
});

describe('precisaConfirmarConta', () => {
  it('só pergunta quando o aparelho já tinha outra conta', () => {
    expect(precisaConfirmarConta(null, 'a@b')).toBe(false);
    expect(precisaConfirmarConta('a@b', 'A@B ')).toBe(false);
    expect(precisaConfirmarConta('a@b', 'c@d')).toBe(true);
  });
});
