import { describe, expect, it } from 'vitest';
import { dataBR, lerReais, reaisParaCampo } from './formato';

describe('lerReais', () => {
  it.each([
    ['1.234,56', 123456],
    ['1234,56', 123456],
    ['R$ 1.234,56', 123456],
    ['1234.56', 123456],
    ['1.234', 123400],
    ['1.234.567', 123456700],
    ['350', 35000],
    ['0,5', 50],
    ['12,345', 1235],
  ])('%s -> %i centavos', (texto, centavos) => {
    expect(lerReais(texto)).toBe(centavos);
  });

  it.each(['', 'abc', '1,2,3', '1.2.3,4.5'])('rejeita %j', (texto) => {
    expect(lerReais(texto)).toBeNull();
  });

  it('volta do formato do campo sem perder valor', () => {
    expect(lerReais(reaisParaCampo(98765432))).toBe(98765432);
  });
});

it('dataBR', () => {
  expect(dataBR('2026-10-26')).toBe('26/10/2026');
  expect(dataBR(null)).toBe('—');
});
