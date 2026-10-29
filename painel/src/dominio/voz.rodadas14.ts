import type { Caso } from './voz.corpus';

// Rodadas 50 em diante. Mesmo formato: r(frase, valor em reais ou null).
const r = (frase: string, reais: number | null, extra: Caso['esperado'] = {}, tipo = 'rodada'): Caso =>
  ({ frase, tipo, esperado: { valor: reais === null ? null : Math.round(reais * 100), ...extra } });

// Rodada 50: continuação de conversa ("e mais", "esqueci", "na verdade", "além disso").
export const CASOS_ROD50: Caso[] = [
  r('e mais 200 de frete', null), r('ah, esqueci: 150 de lixa', 150), r('corrigindo: foi 350 e não 300', null), r('na verdade foram 420', 420),
  r('aliás, 90 de frete', 90), r('só mais uma coisa, 60 de cola', 60), r('além disso 40 de prego', 40), r('ah, e 25 de fita', 25),
  r('ontem também 80 de brita', 80, { data: '2026-10-27' }), r('mais uma de 120 de areia', 120), r('só 70 de areia', 70), r('apenas 85 de tinta', 85),
  r('exatamente 1.250 de laje', 1250), r('foram 640 certinhos de ferro', 640), r('fechou em 2.300 a laje', 2300), r('deu 410 redondos', 410),
  r('ficou em 780 no total', 780), r('saiu por 530 a hora da máquina', null), r('o combinado era 900 e paguei 900', 900),
  r('combinamos 1.200 e eu paguei 1.000', null), r('paguei o combinado, 2.500', 2500), r('paguei o acordado de 3.000 reais', 3000),
];

// Rodada 51: parcelas, entrada e saldo falados de várias formas.
export const CASOS_ROD51: Caso[] = [
  r('primeira parcela da laje 5.000', 5000), r('última parcela 2.000', 2000), r('entrada e mais 3 parcelas', null),
  r('paguei a entrada de 10 mil', 10000), r('entrada de 10 mil e saldo em 5 parcelas', null), r('o saldo de 8.000 vence dia 30', 8000, { pago: false }),
  r('quitei o saldo, 8.000', 8000, { pago: true }), r('parcela 4 de 12, 650 reais', 650), r('4/12 650 reais', 650), r('parcela 4/12 650', 650),
  r('pagamento 4 de 12 no valor de 650', 650), r('mensalidade 650', 650), r('prestação do terreno 1.480', 1480), r('financiamento parcela 2.350', 2350),
  r('consórcio 3.120', 3120, { categoria: 'Consórcio' }), r('consórcio parcela 14 3.120 reais', 3120), r('boleto 2 de 3 1.100', 1100),
  r('carnê 7 de 10 de 430 reais', 430), r('pago 1 de 3, 3.300 reais', 3300), r('carnê da obra 6 parcelas de 400', null),
];

// Rodada 52: "mais", "menos", "a mais", "a menos", "mais caro", "mais barato", comparações.
export const CASOS_ROD52: Caso[] = [
  r('mais barato, 420 de tinta', 420), r('tinta mais cara, 520 reais', 520), r('paguei a mais, 350 de areia', 350), r('paguei 350 de areia a menos', null),
  r('menos mal, paguei 90 de frete', 90), r('mais ou menos 500 de areia', null), r('foi mais caro que o outro, 600 de ferro', 600),
  r('ficou 100 mais caro, 700', null), r('300 a mais', 300), r('300 de areia, 50 a mais', null), r('o mais barato foi 410', 410),
  r('comprei o mais barato, 410 reais', 410), r('pesquisei, o mais em conta era 410', 410), r('menos de 500 não tinha', null),
  r('mais de 500 não pago', null), r('pelo menos 300 de areia', null), r('no mínimo 300 de areia', null), r('no máximo 300 de areia', null),
];
