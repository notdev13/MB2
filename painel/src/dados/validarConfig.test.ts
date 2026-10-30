import { describe, expect, it } from 'vitest';
import { exigirLogin, validarConfigNuvem } from './validarConfig';

describe('validarConfigNuvem', () => {
  it('vazio: dois problemas', () => {
    expect(validarConfigNuvem(undefined, undefined)).toHaveLength(2);
    expect(validarConfigNuvem('', '  ')).toHaveLength(2);
  });
  it('só a URL: falta a chave', () => {
    const p = validarConfigNuvem('https://exemplo.invalid', '');
    expect(p).toHaveLength(1);
    expect(p[0]).toContain('chave');
  });
  it('só a chave: falta a URL', () => {
    const p = validarConfigNuvem(undefined, 'k');
    expect(p).toHaveLength(1);
    expect(p[0]).toContain('SUPABASE_URL');
  });
  it('http:// sem s é recusado', () => {
    const p = validarConfigNuvem('http://exemplo.invalid', 'k');
    expect(p).toHaveLength(1);
    expect(p[0]).toContain('https://');
  });
  it('tudo certo: nenhum problema', () => {
    expect(validarConfigNuvem('https://exemplo.invalid', 'k')).toEqual([]);
  });

  it('endereço mal formado ou com caminho é recusado com mensagem clara', () => {
    expect(validarConfigNuvem('https://', 'k')[0]).toContain('SUPABASE_URL');
    const caminho = validarConfigNuvem('https://abc.supabase.co/rest/v1', 'k');
    expect(caminho).toHaveLength(1);
    expect(caminho[0]).toContain('sem caminho');
    expect(validarConfigNuvem('abc.supabase.co', 'k')).toHaveLength(1);
  });
  it('aceita espaços nas pontas, porta, barra final e protocolo em maiúsculas', () => {
    expect(validarConfigNuvem('  https://abc.supabase.co  ', 'k')).toEqual([]);
    expect(validarConfigNuvem('https://abc.supabase.co/', 'k')).toEqual([]);
    expect(validarConfigNuvem('https://abc.supabase.co:8443', 'k')).toEqual([]);
    expect(validarConfigNuvem('HTTPS://abc.supabase.co', 'k')).toEqual([]);
  });
  it('http (mesmo em maiúsculas) é recusado', () => {
    expect(validarConfigNuvem('HTTP://abc.supabase.co', 'k')).toHaveLength(1);
  });
});

describe('exigirLogin (VITE_EXIGIR_LOGIN)', () => {
  it('qualquer valor definido, exceto vazio, 0 e false, liga a exigência', () => {
    for (const v of ['1', 'true', 'TRUE', 'sim', 'yes', 'on', ' 1 ']) expect(exigirLogin(v)).toBe(true);
  });
  it('indefinido, vazio, 0 e false deixam livre', () => {
    for (const v of [undefined, '', '  ', '0', 'false', 'FALSE', ' False ']) expect(exigirLogin(v)).toBe(false);
  });
});
