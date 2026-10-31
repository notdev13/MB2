import { describe, expect, it } from 'vitest';
import { dataBR, lerNumero, lerReais, quando, reaisCartao, reaisParaCampo } from './formato';

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
    ['1234.5', 123450],
    [' 2.500 ', 250000],
  ])('%s -> %i centavos', (texto, centavos) => {
    expect(lerReais(texto)).toBe(centavos);
  });

  it.each(['', 'abc', '.', '-5', '1,2,3', '1.2.3,4.5', '1.234.5', '12,345', '1,005', '12.34,5'])('rejeita %j', (texto) => {
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

it('lerNumero lê área com milhar e vírgula', () => {
  expect(lerNumero('1.200')).toBe(1200);
  expect(lerNumero('85,5')).toBe(85.5);
  expect(lerNumero('1.2.0')).toBeNull();
});

describe('quando', () => {
  it('mostra "hoje" ou o dia, com a hora local', () => {
    const agora = new Date(2026, 9, 28, 15, 0);
    expect(quando(new Date(2026, 9, 28, 14, 5).toISOString(), agora)).toBe('hoje às 14:05');
    expect(quando(new Date(2026, 9, 27, 9, 30).toISOString(), agora)).toBe('27/10 às 09:30');
  });
});

describe('reaisCartao', () => {
  it('mostra o valor inteiro abaixo de 1 milhão e abrevia a partir dele', () => {
    const limpo = (t: string) => t.replace(/\s/g, ' ');
    expect(limpo(reaisCartao(51_342_398))).toBe('R$ 513.423,98');
    expect(limpo(reaisCartao(99_999_999))).toBe('R$ 999.999,99');
    expect(limpo(reaisCartao(130_133_254))).toBe('R$ 1,3 mi');
  });
});
