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
  it('com escala fixa, zero fica na base e o topo da escala no alto', () => {
    const c = curvaSuave([0, 50], 100, 100, 0, 0, { min: 0, max: 200 });
    expect(c.pontos).toEqual([[0, 100], [100, 75]]);
  });
  it('não desce abaixo do menor valor nem sobe acima do maior', () => {
    const ys = curvaSuave([0, 0, 0, 10, 0], 100, 50, 0, 0).d.match(/-?[\d.]+/g)!.map(Number).filter((_, i) => i % 2 === 1);
    expect(Math.max(...ys)).toBeLessThanOrEqual(50);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
  });
  it('valores iguais, um valor só ou nenhum não quebram (linha no meio)', () => {
    expect(curvaSuave([5, 5, 5], 100, 40).fim[1]).toBe(20);
    expect(curvaSuave([5], 100, 40).d).toMatch(/^M/);
    expect(curvaSuave([], 100, 40).d).toMatch(/^M/);
  });
});
