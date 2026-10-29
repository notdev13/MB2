import type { Caso } from './voz.corpus';

// Rodadas 54 em diante. Mesmo formato: r(frase, valor em reais ou null).
const r = (frase: string, reais: number | null, extra: Caso['esperado'] = {}, tipo = 'rodada'): Caso =>
  ({ frase, tipo, esperado: { valor: reais === null ? null : Math.round(reais * 100), ...extra } });

// Rodada 54: logística, aluguel de máquina, limpeza e gestão de pessoal (vocabulário novo, sem mexer no código antes).
export const CASOS_ROD54: Caso[] = [
  r('Frete do material de Palhoça 520', 520), r('Entrega de 4 paletes de tijolo, 380 de frete', 380), r('Munck 3 horas 1.350 reais', 1350),
  r('Aluguel de gerador 5 dias 1.250', 1250), r('Aluguel de compactador por 2 dias 640', 640), r('Locação de escora 100 unidades por 30 dias 900', 900),
  r('Diária da diarista de limpeza 160', 160), r('Limpeza pós-obra 80 m² 960 reais', 960), r('Produto de limpeza 3 galões 87', 87),
  r('Pagamento do vigia 15 dias 2.250', 2250), r('Vale-alimentação 22 dias 660 reais', 660), r('Hora extra do pedreiro 6 horas 180', 180),
  r('Rescisão do servente 1.380', 1380), r('Férias do mestre de obras 2.940', 2940), r('13º do ajudante 760', 760),
  r('Exame médico 2 funcionários 190', 190), r('Treinamento NR-35 3 pessoas 840', 840), r('Seguro de vida em grupo 138,50', 138.5),
  r('Plano de saúde do mestre 412', 412), r('Transporte do pessoal 22 dias 880', 880), r('Combustível da van 250 km 310 reais', 310),
  r('Pedágio ida e volta 14,40', 14.4), r('Balsa 2 viagens 36', null), r('Lavagem da betoneira 40', 40), r('Descarte de resíduo 2 caçambas 700 reais', 700),
];

// Rodada 55: dictation escreve o dinheiro de jeitos estranhos (espaços, dois-pontos, vírgula-traço, "RS").
export const CASOS_ROD55: Caso[] = [
  r('R $ 300 de areia', 300), r('300 R $ de areia', 300), r('RS 300 de areia', 300), r('R$:300 de areia', 300), r('areia R$: 300', 300),
  r('areia 300,- reais', 300), r('areia 300,00.', 300), r('areia 300.00', 300), r('areia 3 0 0', null), r('areia R$ 3.000,00', 3000),
  r('areia R$3000', 3000), r('areia 3000$', null), r('areia trezentos', 300), r('areia 300 reais.', 300), r('areia, 300 reais!', 300),
  r('areia (R$ 300)', 300), r('areia "300"', 300), r('areia - 300 -', 300), r('areia / 300', 300), r('areia = 300', 300), r('areia: R$300,00', 300),
  r('areia R$ 1,2 mil', 1200), r('areia R$ 1 mil', 1000), r('areia 1 mil e 200', 1200), r('areia mil e duzentos reais', 1200),
];

// Rodada 56: siglas e palavras em inglês no meio da fala.
export const CASOS_ROD56: Caso[] = [
  r('Pix de 300 pro fornecedor', 300, { pagamento: 'pix' }), r('TED de 2.500 pra construtora', 2500, { pagamento: 'transferencia' }),
  r('NF 4521 R$ 800 cimento', 800), r('NF-e 5512 cimento 800', 800), r('Cupom fiscal 3321 areia 150', 150), r('App do banco, pix 90 reais', 90, { pagamento: 'pix' }),
  r('Notebook i5 8 GB 3.490', 3490), r('Câmera 4K 2 unidades 1.100', null),
  r('Cabo HDMI 2 metros 29,90', 29.9), r('Led 12 volts 5 metros 78', 78), r('Placa de 5G 1.980', 1980), r('Fibra 500 mega mensalidade 129,90', 129.9),
  r('Antena 12 dbi 240', 240), r('Switch 8 portas 189', 189), r('Roteador 4 antenas 259 reais', 259), r('Nobreak 600 va 780', 780),
];
