import type { Caso } from './voz.corpus';

// Rodadas 30 em diante (continuação de voz.rodadas2.ts). Mesmo formato: r(frase, valor em reais ou null).
const r = (frase: string, reais: number | null, extra: Caso['esperado'] = {}, tipo = 'rodada'): Caso =>
  ({ frase, tipo, esperado: { valor: reais === null ? null : Math.round(reais * 100), ...extra } });

// Rodada 30: relato falado, em primeira pessoa, com listas de itens e quantidades por extenso ou em dígitos.
export const CASOS_ROD30: Caso[] = [
  r('Olha, hoje de manhã eu passei na Cassol e comprei 12 sacos de argamassa, deu 480 reais', 480, { data: '2026-10-28' }),
  r('Fui no depósito, peguei 3 baldes de tinta e uma lixa, saiu 390', 390),
  r('O Ulisses trabalhou 4 dias essa semana, paguei 1.600', 1600, { categoria: 'Mão de obra' }),
  r('Adriano veio sábado e domingo, dei 500 pra ele', 500, { data: null }),
  r('Chegou o caminhão de brita, 2 viagens, 1.100 reais', 1100),
  r('Paguei o pessoal da quinzena, foram 6 pessoas, 9.600', 9600),
  r('Pintura do muro, 2 demãos, 3 pintores, 2.400 reais', 2400),
  r('Comprei 10 metros de mangueira por 85 reais', 85),
  r('A caçamba de entulho custou 350, vem buscar dia 20', 350),
  r('Ferragens do telhado: 14 parafusos, 6 ganchos, tudo 210 reais', 210),
  r('Material elétrico: 5 tomadas, 3 interruptores, 2 disjuntores, 380', 380),
  r('Compra do material elétrico 5 tomadas 3 interruptores 2 disjuntores total 380', 380),
  r('Dei 200 de gorjeta pros ajudantes', 200), r('Paguei 500 pelos serviços do eletricista', 500),
  r('Levei 40 blocos e 2 sacos de cal, ficou 520', 520), r('Foram 3 viagens de areia, 1.350 reais no total', 1350),
  r('Quatro serventes por três dias, 2.160', 2160), r('Seis funcionários, quinze dias, folha de 18 mil', 18000),
  r('Comprei dois tubos de 100 e cinco joelhos, 187 reais', 187), r('Dez telhas quebradas, repus por 70 reais', 70),
  r('Troquei 3 lâmpadas e 2 tomadas, 95 reais de material', 95), r('Instalei 4 janelas, mão de obra 1.200', 1200),
  r('Paguei o frete das 40 caixas de piso, 280', 280), r('Reboco do 2º pavimento, 150 m², 6.000 reais', 6000),
  r('Muro de 30 metros, 8.500 de mão de obra', 8500), r('Vala de 12 metros, retroescavadeira 4 horas, 1.040', 1040),
  r('Concreto 6 m³ bombeado, 4.800 reais', 4800), r('Laje de 80 m², 14 mil de ferro e 9 mil de concreto', null),
  r('Dois pedreiros e um servente, 3 diárias, 2.700', 2700), r('Conta de luz de outubro 287,35', 287.35),
  r('Água e esgoto, vencimento dia 10, 142,80', 142.8), r('Internet da obra 119,90 mensal', 119.9),
  r('Taxa de lixo 2 parcelas de 87,50', null), r('Seguro 12x de 210', null), r('Pedi 5 orçamentos, fechei o de 7.300', 7300),
  r('Gastei 20 reais de pão e 35 de café pro pessoal', null), r('Almoço da equipe, 9 marmitas, 117 reais', 117),
  r('Seis marmitas a 13 reais', null), r('Vale transporte 22 dias, 440 reais', 440), r('EPI: 8 capacetes, 8 luvas, 8 botas, 1.150', 1150),
];

// Rodada 31: reconhecimento de voz com numeral errado ("sesenta", "quinhento", "sinco") e "2 mil 500".
export const CASOS_ROD31: Caso[] = [
  r('trezentos e sesenta de cimento', 360), r('quinhento e vinte reais de prego', 520), r('duzento e cinquenta reais de areia', 250),
  r('cetenta e cinco reais de prego', 75), r('oitocento reais de telha', 800), r('mil e quinhento de areia', 1500),
  r('dois mil e quinhento de areia', 2500), r('quatro mil e trezento de tinta', 4300), r('cinquenta e sinco reais de lixa', 55),
  r('trinta e ceis reais de fita', 36), r('vinte e oto reais de cola', 28), r('sessenta e dois mil de laje', 62000),
  r('quarenta e nove mil e novecento de laje', 49900), r('Tres mil e quinhentos de piso', 3500), r('Dois mil, e quinhentos de piso', 2500),
  r('R$ 2 mil 500 de piso', 2500), r('2 mil 500 reais de piso', 2500), r('2 500 reais de piso', 2500), r('2.50 de prego', 2.5),
  r('noventa e nove reais de prego', 99), r('cento e vinte e cinco mil de terreno', 125000), r('um mil e duzentos de piso', 1200),
  r('trezentos e cinquenta e oito reais', 358), r('mil e cento e dez reais', 1110), r('dois mil e cem reais', 2100),
  r('cem reais e vinte centavos', 100.2), r('oitocentos e dezoito reais', 818), r('dezenove mil de laje', 19000),
];
