import type { Caso } from './voz.corpus';

// Rodadas do laço depois da reprovação do revisor (26 em diante): frases escritas em estilo diferente do
// gerador, com gabarito. `r(frase, reais)`: reais = valor esperado em reais, null = tem que ficar em branco.
// Cada rodada traz frases novas; as que já falharam ficam aqui como regressão.
const r = (frase: string, reais: number | null, extra: Caso['esperado'] = {}, tipo = 'rodada'): Caso =>
  ({ frase, tipo, esperado: { valor: reais === null ? null : Math.round(reais * 100), ...extra } });

// Rodada 26: o que o revisor apontou (B1: valor verdadeiro descartado e sobra inteiro pequeno).
export const CASOS_ROD26: Caso[] = [
  r('areia pro 2º andar 480', 480), r('laje do 2º andar 480 reais', 480), r('pedreiro R$ 480 cômodo 2', 480),
  r('480 cômodo 2', 480), r('pedreiro R$ 480 cômodo 25', 480), r('R$ 480 sala 3', 480), r('piso do 3º andar R$ 1.200', 1200),
  r('quarto 2 pintura R$ 400', 400), r('480 reais cômodo 2', 480), r('paguei 480 reais no cômodo 25', 480),
  r('paguei 500 de mais um servente', 500), r('comprei mais cimento, 380 reais', 380), r('paguei 500 de areia pro cliente', 500),
  r('material do cliente Marcos 900 reais', 900), r('paguei 300 de cimento a mais', 300), r('paguei 700 de tinta e mais nada', 700),
  r('esqueci de lançar, ontem paguei 300 de areia', 300, { data: '2026-10-27' }), r('troca de fechadura 120 reais', 120),
  r('retirada de entulho 400 reais', 400), r('cancela automática 1.800 reais', 1800), r('cálculo estrutural 1.500 reais', 1500),
  r('paguei a proposta do eletricista 4.500', 4500), r('comprei barato, 300 de tinta', 300), r('receita federal darf 320 reais', 320),
  r('brita 2 400 reais', 400), r('bloco 14 de 400 reais', 400), r('chuveiro 220 volts 180 reais', 180), r('disjuntor 20 amperes 25 reais', 25),
  r('pintura 2 demãos 900 reais', 900), r('piso do quarto 2 480', 480), r('parcela 3 do terreno 5.000', 5000),
  r('paguei 380 de cimento em 2026', 380), r('pedreiro por 10 dias 4.500', 4500),
];

// Rodada 27: fala corrida, serviços com nome de verbo, "quero lançar", "restante", "recebido", "aumento da casa".
export const CASOS_ROD27: Caso[] = [
  r('Paguei a retirada do entulho, 400 reais.', 400), r('Troca do telhado inteiro, 18 mil.', 18000),
  r('Mão de obra da troca de piso 2.300', 2300), r('Cancelamento do contrato, multa de 1.500 reais', 1500),
  r('Cancelei o pedido mas paguei 300 de taxa', 300), r('Corrigi a laje, 850 reais de mão de obra', 850),
  r('Alteração do projeto elétrico 1.200 reais', 1200), r('Atualização do projeto 600', 600),
  r('Retirada de 5 caçambas de entulho 1.750 reais', 1750), r('Tira-teima do pedreiro, 300 reais', 300),
  r('Mudança do canteiro 900 reais', 900), r('Receita Federal, guia 410,50', 410.5),
  r('Pagamento do restante da laje, 3.000', 3000), r('Material recebido 800 reais', 800), r('Caução do aluguel 3.000 reais', 3000),
  r('Previsão do tempo atrapalhou, paguei 500 de lona', 500), r('Aumento da casa, mão de obra 4.000', 4000),
  r('Subiu a laje, 2.000 de pedreiro', 2000), r('Quando o caminhão chegou paguei 700 de brita', 700),
  r('Seria bom comprar mais, mas paguei 500 de areia', 500), r('Custa caro, mas paguei 500 de areia', 500),
  r('Eu quero lançar um gasto de 450 com eletricista', 450), r('Queria registrar um custo de 450 de eletricista', 450),
  r('Preciso lançar 300 de areia', 300), r('Não acho a nota, mas paguei 500 de areia', 500),
  r('Tenho certeza que foi 500 de areia', 500), r('Não tenho certeza, mas foi 500 de areia', null),
  r('Acho que paguei 500 de areia ontem', null), r('Deve ter sido 500, vou conferir', null),
  r('Dois pedreiros, cada um 250, total 500', 500), r('o cimento subiu 20 reais', null), r('aumentou 200 o cimento', null),
  r('Retira o entulho 400 reais', 400), r('Remove o entulho da obra, 300 reais', 300), r('Corrige a laje 800 reais', 800),
  r('Altera o projeto 1.200 reais', 1200), r('Apaga o último de 450', null), r('Exclui o de 300 reais', null),
  r('Proposta de reforma 4.500', 4500), r('Proposta de 12 mil do pedreiro', null), r('Orçamento aprovado 7.000', 7000),
];

// Rodada 28: texto digitado estilo WhatsApp/planilha (abreviações, "=", "->", colchetes, sinais).
export const CASOS_ROD28: Caso[] = [
  r('cimento - 20 sc - R$ 800', 800), r('vlr 350 tijolo', 350), r('rs 120 prego', 120), r('1.200,00 (laje)', 1200),
  r('areia: 500 pix', 500, { pagamento: 'pix' }), r('ferro 8mm x 12m 540', 540), r('obs: pago ontem 300 de areia', 300, { pago: true, data: '2026-10-27' }),
  r('sinal -> 2000', 2000), r('pedreiro = 450', 450), r('frete=90', 90), r('ted 5.000 p/ ulisses', 5000, { pagamento: 'transferencia' }),
  r('pix 300 p/ cassol ref nf 4455', 300, { pagamento: 'pix' }), r('paguei 2x de 500', null), r('R$ 85,00/m² piso', null),
  r('cimento 38/saco x 20', null), r('cimento 20 sc 38 cada = 760', 760), r('total: 760', 760), r('tot 760 (20 sc)', 760),
  r('pagamento ulisses 15/10 -> 1.500,00', 1500, { data: '2026-10-15' }), r('#obra12 cimento 300', 300), r('laje 3º pav 12.000', 12000),
  r('reboco 120 m² a 25 = 3.000', 3000), r('piso 60m2 x R$ 45 = R$ 2.700', 2700), r('cimento 38 x 20 = 760', 760),
  r('frete 90 / pedreiro 450', null), r('frete: 90; pedreiro: 450', null), r('total do dia: 540 (frete 90 + pedreiro 450)', 540),
  r('+ 300 areia', 300), r('-300 areia', null), r('areia 500,00', 500), r('AREIA R$500', 500), r('areia R$500.', 500), r('areia (500)', 500),
  r('areia [500]', 500), r('areia 500,-', 500), r('mil e quinhentos reais = 1500', 1500),
  r('orçamento 3 fornecedores: 500, 520, 480 -> fechou em 480', 480), r('sinal 30% = 900', null),
];
