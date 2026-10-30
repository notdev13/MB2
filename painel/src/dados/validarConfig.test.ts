import { describe, expect, it } from 'vitest';
import { validarConfigNuvem } from './validarConfig';

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
});
