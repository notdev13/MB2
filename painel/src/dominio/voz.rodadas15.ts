import type { Caso } from './voz.corpus';

// Rodadas 53 em diante. Mesmo formato: r(frase, valor em reais ou null).
const r = (frase: string, reais: number | null, extra: Caso['esperado'] = {}, tipo = 'rodada'): Caso =>
  ({ frase, tipo, esperado: { valor: reais === null ? null : Math.round(reais * 100), ...extra } });

// Rodada 53: hora do dia, quantidade 1 e plurais de serviço junto do valor.
export const CASOS_ROD53: Caso[] = [
  r('às 14:30 paguei R$ 300 de areia', 300), r('às 14:30 paguei 300 de areia', 300), r('saí às 7:45 e paguei 90 de frete', 90),
  r('1 pedreiro 450', 450), r('1 saco de cimento 38', 38), r('1 diária 180', 180), r('1 servente 150 reais', 150), r('1 caçamba 350', 350),
  r('3 encanadores 900', null), r('4 eletricistas 1.600', null), r('2 pintores 700 reais', 700), r('5 carpinteiros 1.250', null),
  r('2 marceneiros, 1.800', null), r('3 gesseiros 2.100', null), r('2 azulejistas 1.200 reais', 1200), r('6 ajudantes 960', null),
  r('uma betoneira 180', 180), r('um andaime 220', 220), r('uma máquina 600', 600), r('um caminhão 750', 750), r('dois caminhões 1.500', 1500),
  r('um guincho por 450', 450), r('uma retroescavadeira 4 horas 1.040', 1040), r('um pedreiro e um servente 700', 700),
];
