import { describe, expect, it } from 'vitest';
import { lerSaldo } from './saldos';
import { candidatosDoPrint, valoresDaLinha, valorParaCampo } from './saldoPrint';

const v = (t: string) => valoresDaLinha(t).map((x) => x.valor);

describe('valoresDaLinha', () => {
  it('lê os formatos de saldo dos apps de banco', () => {
    expect(v('R$ 96.400,00')).toEqual([9_640_000]);
    expect(v('R$ 128.750,45')).toEqual([12_875_045]);
    expect(v('872.300,00')).toEqual([87_230_000]);
    expect(v('R$ 7,10')).toEqual([710]);
    expect(v('Saldo disponível R$ 94.000,00')).toEqual([9_400_000]);
  });
  it('lê negativo com o sinal antes ou depois do R$', () => {
    expect(v('-R$ 1.234,56')).toEqual([-123_456]);
    expect(v('R$ -1.234,56')).toEqual([-123_456]);
    expect(v('− R$ 50,00')).toEqual([-5_000]);
  });
  it('aceita os erros comuns do OCR (espaço depois da vírgula, RS no lugar de R$)', () => {
    expect(v('R$ 872.300, 00')).toEqual([87_230_000]);
    expect(v('RS 18.900,00')).toEqual([1_890_000]);
  });
  it('ignora o que não é valor com centavos', () => {
    expect(v('30/10/2026 14:35')).toEqual([]);
    expect(v('Ag 1234 Conta 56789-0')).toEqual([]);
    expect(v('R$ 96.400')).toEqual([]);
    expect(v('1.234,567')).toEqual([]);
  });
  it('recusa valor absurdo (acima de R$ 999.999.999,99)', () => {
    expect(v('R$ 9.999.999.999,00')).toEqual([]);
  });
  it('acha mais de um valor na mesma linha', () => {
    expect(v('Saldo R$ 10,00 Limite R$ 2.000,00')).toEqual([1_000, 200_000]);
  });
});

describe('candidatosDoPrint', () => {
  it('um valor só com boa confiança vem sugerido', () => {
    const r = candidatosDoPrint([{ texto: 'R$ 96.400,00', altura: 40 }], 92);
    expect(r.sugerido?.valor).toBe(9_640_000);
    expect(r.incerto).toBe(false);
  });
  it('vários valores: só sugere se um tem letra bem maior', () => {
    const tela = [{ texto: 'R$ 96.400,00', altura: 48 }, { texto: 'Limite R$ 5.000,00', altura: 20 }];
    expect(candidatosDoPrint(tela, 90).sugerido?.valor).toBe(9_640_000);
    const parecidos = [{ texto: 'R$ 96.400,00', altura: 30 }, { texto: 'R$ 5.000,00', altura: 28 }];
    const r = candidatosDoPrint(parecidos, 90);
    expect(r.sugerido).toBeNull();
    expect(r.candidatos.map((c) => c.valor)).toEqual([9_640_000, 500_000]);
  });
  it('pouca confiança: lista, mas não sugere', () => {
    const r = candidatosDoPrint([{ texto: 'R$ 872.300, 00', altura: 40 }], 45);
    expect(r.sugerido).toBeNull();
    expect(r.incerto).toBe(true);
    expect(r.candidatos[0].valor).toBe(87_230_000);
  });
  it('mesmo valor em duas linhas conta uma vez; nada achado = lista vazia', () => {
    const r = candidatosDoPrint([{ texto: 'R$ 10,00', altura: 20 }, { texto: 'R$ 10,00', altura: 30 }], 90);
    expect(r.candidatos).toHaveLength(1);
    expect(r.candidatos[0].altura).toBe(30);
    expect(candidatosDoPrint([{ texto: 'Olá', altura: 20 }], 90).candidatos).toEqual([]);
  });
});

describe('valorParaCampo', () => {
  it('vai e volta pelo campo de saldo', () => {
    for (const c of [0, 5, 710, 9_640_000, -123_456, 99_999_999_999, -1]) expect(lerSaldo(valorParaCampo(c))).toBe(c);
  });
});
