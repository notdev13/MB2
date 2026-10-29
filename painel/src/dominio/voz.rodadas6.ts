import type { Caso } from './voz.corpus';

// Rodadas 40 em diante. Mesmo formato: r(frase, valor em reais ou null).
const r = (frase: string, reais: number | null, extra: Caso['esperado'] = {}, tipo = 'rodada'): Caso =>
  ({ frase, tipo, esperado: { valor: reais === null ? null : Math.round(reais * 100), ...extra } });

// Rodada 40: fala de obra variada (verbos, ordem, obra, forma de pagamento e data trocados), tudo comum.
export const CASOS_ROD40: Caso[] = [
  r('Ontem no pix paguei trezentos e sessenta de cimento no lote 39', 360, { data: '2026-10-27', pagamento: 'pix', obraId: 'l39', pago: true }),
  r('No lote 39, cimento, trezentos e sessenta, ontem, pix', 360, { data: '2026-10-27', pagamento: 'pix', obraId: 'l39' }),
  r('Lote 39 pix ontem cimento 360', 360, { data: '2026-10-27', pagamento: 'pix', obraId: 'l39' }),
  r('Gastei trezentos e sessenta com cimento na obra do Campeche', 360, { obraId: 'l39' }),
  r('Na Ecovillas, paguei dois mil e oitocentos de terraplenagem, em dinheiro', 2800, { obraId: 'eco', pagamento: 'dinheiro', pago: true }),
  r('Olindina: mil e duzentos de pedreiro na sexta', 1200, { obraId: 'oli', data: '2026-10-23' }),
  r('Laureano, eletricista, setecentos e cinquenta reais, anteontem', 750, { obraId: 'lau', data: '2026-10-26' }),
  r('Casa 12 reboco 4.600 reais boleto', 4600, { obraId: 'l12', pagamento: 'boleto' }),
  r('Paguei no débito 89,90 de torneira na casa 12', 89.9, { pagamento: 'cartao', obraId: 'l12' }),
  r('Cento e oitenta de gasolina hoje no cartão', 180, { data: '2026-10-28', pagamento: 'cartao' }),
  r('Dois mil e quinhentos de laje, a prazo, Laureano', 2500, { pago: false, obraId: 'lau' }),
  r('Mandei três mil e duzentos pro Ulisses por transferência', 3200, { pagamento: 'transferencia', categoria: 'Mão de obra' }),
  r('Dei quinhentos pro Adriano ontem', 500, { data: '2026-10-27', categoria: 'Mão de obra' }),
  r('Pedreiro, quatrocentos e cinquenta reais, quarta passada', 450, { data: '2026-10-21' }),
  r('Servente cento e oitenta, hoje', 180, { data: '2026-10-28' }),
  r('Comprei 30 sacos de cimento na Cassol por 1.140 no boleto, vence dia 10 de novembro', 1140, { pagamento: 'boleto', pago: false, data: null }),
  r('Foi 640 de ferro na Cassol, boleto, a pagar', 640, { pagamento: 'boleto', pago: false }),
  r('Frete de areia 220 reais lote 39', 220, { obraId: 'l39' }), r('Aluguel de caçamba 350 Olindina', 350, { obraId: 'oli' }),
  r('Conta de água da obra 98,40', 98.4), r('Conta de luz lote 39, 276 reais, pago no pix', 276, { obraId: 'l39', pagamento: 'pix', pago: true }),
  r('ISS do Laureano 1.620', 1620, { obraId: 'lau', categoria: 'Impostos e taxas' }), r('ITBI 18 mil terreno Ecovillas transferência', 18000, { obraId: 'eco', pagamento: 'transferencia' }),
  r('Certidão do cartório 140 reais', 140), r('RRT 120 reais Laureano', 120, { obraId: 'lau' }),
  r('Projeto elétrico 3.500 Olindina em duas vezes', null, { obraId: 'oli' }), r('Projeto estrutural quatro mil reais', 4000),
  r('Desconto de 10 por cento no cimento, 342 reais', null), r('Paguei 342 no cimento com desconto', 342),
  r('Cimento 38 o saco, quinze sacos, 570', 570), r('Quinze sacos de cimento, 570 reais', 570), r('15 sacos de cimento por 570', 570),
  r('Brita 1, três metros, 480 reais', 480), r('Areia média 2 metros 260', 260), r('Pedra 3 metros cúbicos 900 reais', 900),
  r('Madeira para a laje: 40 tábuas e 12 caibros, 2.180', 2180), r('Prego, parafuso e bucha, 64 reais', 64),
  r('Tinta 2 latas de 18 litros, 760 reais', 760), r('Lixa 10 folhas 25 reais', 25), r('Massa corrida 25 kg 68', 68),
  r('Disjuntor 2 polos 32 amperes 38 reais', 38), r('Fio 2,5 mm rolo de 100 metros 290 reais', 290), r('Tomada 10 amperes 6 unidades 54', 54),
  r('Registro de gaveta 3/4 78 reais', 78), r('Cano de 50 mm barra de 6 metros 42', 42), r('Joelho 90 graus de 100 mm 12 reais', 12),
  r('Vaso sanitário e pia, 1.480 reais', 1480), r('Janela 120 por 100 de alumínio 640 reais', 640),
  r('Esquadria de 2 folhas 1.250', 1250), r('Portão de 3 metros 2.900', 2900), r('Grade 5 peças 980', 980),
];
