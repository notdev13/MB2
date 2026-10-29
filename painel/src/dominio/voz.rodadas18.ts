import type { Caso } from './voz.corpus';

// Rodada 58 (treino): variações escritas por mim a partir das falhas da revisão cega "cega2".
// Cada grupo traz frases de estilos diferentes do mesmo problema, para a correção não ficar colada nas frases do revisor.
const r = (frase: string, reais: number | null, extra: Caso['esperado'] = {}, tipo = 'rodada58'): Caso =>
  ({ frase, tipo, esperado: { valor: reais === null ? null : Math.round(reais * 100), ...extra } });

// 1. Dois valores com palavra de saldo/entrada/combinado: não escolhe, mesmo com "reais" num deles.
export const CASOS_ROD58_SALDO: Caso[] = [
  r('paguei 800 falta 300 reais', null), r('cimento 900 restam 400 reais', null), r('paguei 700 devendo 300 reais', null),
  r('laje 3.000 entrada 1.000 reais', null), r('ferro 2.000 sinal 500 reais', null), r('paguei 600 mas o acordado era 900 reais', null),
  r('telha 1.800 saldo 600 reais', null), r('porta 900 restante 300 reais', null), r('paguei 500, o resto são 700 reais', null),
  r('paguei 1.500 e faltam 2.500 reais', null), r('ferro 1.200 sendo 600 reais de entrada', null), r('paguei 2 mil e sobram 800 reais', null),
  r('areia 480 adiantamento 200 reais', null), r('paguei mil e faltam quinhentos reais', null),
  // unidade de verdade ao lado do número: o valor com "reais" continua valendo
  r('areia 12 sacos 480 reais', 480), r('projetor 3000 lumens 1.200 reais', 1200), r('tinta 18 litros 340 reais', 340),
  r('câmera 8 megapixels 450 reais', 450), r('cabo 5 metros 89 reais', 89), r('bateria 5000 mah 320 reais', 320),
  r('nobreak 1200 va 680 reais', 680), r('compressor 50 litros 890 reais', 890), r('Ar-condicionado 12 mil btus R$ 2.790', 2790),
];

// 2. Segundo valor pequeno depois de "e"/"mais" + item: dois lançamentos numa fala.
export const CASOS_ROD58_DOIS: Caso[] = [
  r('cimento 360 reais e prego 18', null), r('areia 480 reais e cal 15', null), r('areia 480 reais e cola 12', null),
  r('areia 480 reais mais diária 90', null), r('tinta 120 reais e rolo 18', null), r('tijolo 900 reais mais fita 14', null),
  r('frete 150 reais e pedágio 12', null), r('brita 200 reais e lixa 9', null), r('madeira 700 reais e prego 20', null),
  r('pedreiro 450 reais e almoço 25', null), r('luz 189 reais e água 45', null), r('ferro 2.000 reais e arame 60', null),
  // descrição do material ANTES do valor continua sendo descrição
  r('brita 12 R$ 480', 480), r('brita 1 R$ 480', 480), r('R$ 480 de areia, 3 caminhões', 480), r('areia 480 reais 2 caminhões', 480),
  r('R$ 480 cômodo 2', 480),
];

// 3. "depósito" é a loja de material, não forma de pagamento.
export const CASOS_ROD58_DEPOSITO: Caso[] = [
  r('depósito Santa Rita 480 ontem', 480, { pagamento: null }), r('comprei no depósito Santa Rita 480 no pix', 480, { pagamento: 'pix' }),
  r('comprei no depósito 480', 480, { pagamento: null }), r('depósito de material 480', 480, { pagamento: null }),
  r('paguei 300 no depósito do Beto no cartão', 300, { pagamento: 'cartao' }), r('depósito São José 480 boleto', 480, { pagamento: 'boleto' }),
  r('fui no depósito e paguei 150 em dinheiro', 150, { pagamento: 'dinheiro' }), r('depositei 500 pro pedreiro', 500, { pagamento: 'transferencia' }),
  r('depósito 250 de cimento', 250, { pagamento: null }), r('depósito do Zé pix 90 de lixa', 90, { pagamento: 'pix' }),
  r('paguei 3 mil no depósito do Beto', 3000, { pagamento: null }),
];

// 4. "paguei/quitei" vencem "atrasado/vencido/fiado"; "pagar" solto nunca vira "a pagar".
export const CASOS_ROD58_PAGO: Caso[] = [
  r('paguei o boleto atrasado de 480', 480, { pago: true }), r('quitei o boleto vencido do ferro 480', 480, { pago: true }),
  r('paguei a conta que estava em atraso 345', 345, { pago: true }), r('paguei a duplicata vencida de 1.200', 1200, { pago: true }),
  r('quitei a parcela atrasada 650', 650, { pago: true }), r('paguei o fiado do Zé 300', 300, { pago: true }),
  r('boleto atrasado de 480', 480, { pago: false }), r('conta em atraso 345', 345, { pago: false }), r('ferro vencido 1.200', 1200, { pago: false }),
  r('fui pagar a areia 480', 480, { pago: null }), r('acabei de pagar 450 pro pedreiro', 450, { pago: true }), r('pagar 450 pro pedreiro', 450, { pago: null }),
  r('ainda vou pagar 450', 450, { pago: false }), r('pagar dia 30 o ferro 900', 900, { pago: false }), r('terminei de pagar o ferro 1.200', 1200, { pago: true }),
];

// 5. Quantidade ou preço de cada unidade tomado como total.
export const CASOS_ROD58_QTD: Caso[] = [
  r('cimento 50 kg 38 reais cada, comprei 10', null), r('20 sacos de cimento, 38 reais', null), r('cimento 20 sacos 38', null),
  r('cimento 38 reais, 20 sacos', null), r('30 sacos de cal 17 reais', null), r('areia 15 sacos 29', null),
  r('pedreiro 450 3 dias', null), r('dois pedreiros 450', null), r('servente diária de 120 reais, trabalhou 4 dias', null),
  r('hora da retro 220 por 8 horas', null), r('ajudante 900 5 dias', null), r('eletricista 700 reais 2 dias', null), r('ajudante 5 dias 900', 900), r('eletricista 2 dias 700 reais', 700),
  r('comprei 3 baldes de tinta de 180', null), r('comprei 4 latas de verniz de 95', null),
  // com pista de total ou valor que só pode ser total, continua valendo
  r('10 sacos de cimento 360', 360), r('5 sacos de cal 120 reais', 120), r('12 sacos de cimento por 456', 456),
  r('cimento 20 sacos total 760', 760), r('20 sacos 700 de cimento', 700), r('vinte sacos de cimento setecentos', 700),
  r('pedreiro 3 dias total 900', 900), r('pedreiro 3 dias por 900', 900), r('um pedreiro 450', 450), r('diária do pedreiro 450', 450),
];

// 6. "X o material": o número é o total, o material vem depois ("deu 480 a areia").
export const CASOS_ROD58_ARTIGO: Caso[] = [
  r('foi 360 o cimento', 360), r('deu 480 a areia', 480), r('saiu 2.400 a porta', 2400), r('ficou 5.730 o ferro lá do Morro das Pedras', 5730),
  r('custou 1.200 o ferro', 1200), r('paguei 1.200 o ferro', 1200), r('paguei 3 mil a madeira', 3000), r('no fim deu 2.100 o ferro todo', 2100),
  r('saiu 900 o vergalhão', 900), r('pô eu tinha dito que ia dar 5 mil mas no final ficou 5.730 o ferro', 5730),
  r('fechou em 2.300 a laje', 2300), r('ficou 640 a brita', 640),
  // preço de cada continua sendo preço de cada
  r('40 reais o saco', null), r('ficou 38 o saco', null), r('150 reais a diária', null),
];

// 7. Dígitos soltos e colados.
export const CASOS_ROD58_DIGITOS: Caso[] = [
  r('paguei 1 250 reais de areia', 1250), r('paguei 2 500 reais de brita', 2500), r('gastei 3 400 de ferro', 3400),
  r('lancei 12 500 de laje', 12500), r('paguei 1 200 de areia', 1200), r('paguei R$ 1 250,00 de areia', 1250),
  r('ferro 12 k', null), r('ferro 1,5 k', null), r('paguei 1mil e 200 de ferro', 1200), r('paguei 5mil de brita', 5000),
  r('paguei 360reais de cimento', 360), r('gastei 90reais de lixa', 90), r('ferro 2,5k', 2500), r('cimento 12 360', null),
  r('brita 1 400 reais', 400),
];

// 8. Excesso de cautela em frases comuns.
export const CASOS_ROD58_CAUTELA: Caso[] = [
  r('comprei 3 de cal e 2 de cimento por 215 reais', 215), r('3 de cal 2 de cimento 215 reais', 215), r('comprei 2 de brita e 4 de areia 530 reais', 530),
  r('levei 5 de prego e 2 de arame, 90 reais', 90), r('cimento 360, areia 480, brita 530, tudo junto 1.370', 1370),
  r('cimento 360, areia 480, brita 530, ao todo 1.370', 1370), r('cimento 360, areia 480, brita 530, somando 1.370', 1370),
  r('cimento 360, areia 480, brita 530, fechou em 1.370', 1370), r('cimento 360, areia 480, brita 530, deu 1.370', 1370),
  r('lixa 40, cola 35, fita 25, ao todo 100', 100),
  r('meio fio 1.800', 1800), r('telha meia cana 2.400', 2400), r('meia parede 900', 900), r('meio tijolo 380', 380), r('paguei 640 de meio fio', 640),
  r('recebi o cimento hoje, paguei 360', 360), r('recebi a nota do cimento 360', 360), r('troco de fechadura 280', 280),
  r('dias 5 e 6 pedreiro 900', 900), r('nos dias 5 e 6 pedreiro 900', 900), r('semana de 5 a 9 de outubro pedreiro 2.250', 2250),
  r('ordem de serviço 17 pintura 2.800', 2800), r('OS 17 pintura 2.800', 2800), r('ordem de serviço 4521 pintura 2.800', 2800),
  // continuam vetados: receita, troco e meio de verdade
  r('recebi 500 do cliente', null), r('recebi do cliente 3 mil', null), r('o troco foi 20', null), r('meio dia de servente 150', null),
];
