import { describe, expect, it } from 'vitest';
import { curvaSuave } from './curva';

describe('curvaSuave', () => {
  it('começa no primeiro ponto e termina no último, dentro da caixa', () => {
    const c = curvaSuave([0, 10, 5], 100, 50, 4, 8);
    expect(c.inicio).toEqual([4, 42]);
    expect(c.fim[0]).toBe(96);
    expect(c.d.startsWith('M4 42 C')).toBe(true);
    expect(c.d.split(' C')).toHaveLength(3);
  });
  it('o maior valor fica no topo', () => {
    const c = curvaSuave([1, 9], 100, 50, 0, 10);
    expect(c.fim[1]).toBe(10);
  });
  it('valores iguais, um valor só ou nenhum não quebram (linha no meio)', () => {
    expect(curvaSuave([5, 5, 5], 100, 40).fim[1]).toBe(20);
    expect(curvaSuave([5], 100, 40).d).toMatch(/^M/);
    expect(curvaSuave([], 100, 40).d).toMatch(/^M/);
  });
});
