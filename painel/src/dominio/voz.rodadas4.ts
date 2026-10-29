import type { Caso } from './voz.corpus';

// Rodadas 32 em diante. Mesmo formato: r(frase, valor em reais ou null).
const r = (frase: string, reais: number | null, extra: Caso['esperado'] = {}, tipo = 'rodada'): Caso =>
  ({ frase, tipo, esperado: { valor: reais === null ? null : Math.round(reais * 100), ...extra } });

// Rodada 32: números escritos meio em dígito, meio por extenso (o ditado do iPhone mistura) e "rs" no lugar de "R$".
export const CASOS_ROD32: Caso[] = [
  r('2 mil e quinhentos reais de piso', 2500), r('dois mil e 500 reais de piso', 2500), r('mil e 500 reais de piso', 1500),
  r('3 mil e duzentos de laje', 3200), r('R$ 12 mil e 300 de laje', 12300), r('doze mil e 300 de laje', 12300),
  r('1 mil e 200 de piso', 1200), r('2 mil e 500 e 50 centavos', null), r('500 rs de areia', 500), r('rs 500 areia', 500),
  r('areia rs500', 500), r('areia 500rs', 500), r('3 mil e quinhentos e vinte reais', 3520), r('5 milhões e 200 mil de terreno', 5200000),
  r('um milhão e 200 mil de terreno', 1200000), r('2 milhões', 2000000), r('R$ 2,5 milhões de terreno', 2500000),
  r('cem mil e 50 de terreno', 100050), r('quinhentos e 20 reais', 520), r('vinte e 5 reais', 25),
  r('2 e meio reais', null), r('R$ 3 mil, 200', 3200), r('3 mil, 200 reais', 3200), r('3 mil 200 reais', 3200),
  r('três mil 200 reais', 3200), r('oitocentos e 50 reais de brita', 850), r('4 mil e pouco de brita', null),
  r('1.200 e pouco de brita', null), r('uns 2 mil e 500 de brita', null),
];
