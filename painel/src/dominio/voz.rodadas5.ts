import type { Caso } from './voz.corpus';

// Rodadas 35 em diante. Mesmo formato: r(frase, valor em reais ou null).
const r = (frase: string, reais: number | null, extra: Caso['esperado'] = {}, tipo = 'rodada'): Caso =>
  ({ frase, tipo, esperado: { valor: reais === null ? null : Math.round(reais * 100), ...extra } });

// Rodada 35: pedido educado, de assistente ("anota aí", "por favor", "pode lançar"), com data e pagamento.
export const CASOS_ROD35: Caso[] = [
  r('Por favor, lance 450 reais de eletricista', 450), r('Pode lançar 1.250 de cimento na Cassol', 1250),
  r('Anota aí: paguei 320 de areia ontem no pix', 320, { data: '2026-10-27', pagamento: 'pix', pago: true }),
  r('Preciso registrar um gasto de 780 reais com tinta', 780), r('Gostaria de lançar 2.300 de laje', 2300),
  r('Me ajuda a lançar 90 reais de frete?', 90), r('Lança aí, por favor, 1.100 de pedreiro dia 15', 1100),
  r('Registre uma despesa de 560 reais com brita no cartão', 560, { pagamento: 'cartao' }),
  r('Adicione 3.400 de ferro em boleto a pagar', 3400, { pagamento: 'boleto', pago: false }),
  r('Cadastra um custo: 640, areia, lote 39', 640, { obraId: 'l39' }), r('Novo gasto, telha, 2.750 reais, hoje', 2750, { data: '2026-10-28' }),
  r('Quero lançar o pagamento do Ulisses, 1.800', 1800, { categoria: 'Mão de obra' }),
  r('Pode registrar que paguei 150 de gasolina?', 150), r('Fiz um pix de 3 mil para o Adriano', 3000, { pagamento: 'pix' }),
  r('Vou querer lançar 420 de cola, tá?', 420), r('É o seguinte: 900 de piso na Olindina', 900, { obraId: 'oli' }),
  r('Então, deixa eu ver, foi 275 de fio', 275), r('Beleza, lança 380 de cabo', 380), r('Obrigado, e lança também 95 de fita', 95),
  r('Faz o seguinte, anota 1.020 de pintura', 1020), r('Segue o gasto: 4.500, empreitada do telhado', 4500),
  r('Lançamento novo, valor de 1.340 reais, descrição reboco', 1340), r('Tipo de gasto: material, valor: 870', 870),
  r('Categoria materiais, valor 870, obra Laureano', 870, { obraId: 'lau' }), r('Fornecedor Cassol, valor 1.050, data 20/10', 1050, { data: '2026-10-20' }),
  r('Data 20/10 valor 1.050 forma de pagamento boleto', 1050, { data: '2026-10-20', pagamento: 'boleto' }),
  r('Valor: 1.050,00; Data: 20/10/2026; Pagamento: pix', 1050, { data: '2026-10-20', pagamento: 'pix' }),
];

// Rodada 36: números de endereço, condomínio e CNPJ junto do valor.
export const CASOS_ROD36: Caso[] = [
  r('Rua 15 de novembro, 340, areia 500 reais', 500), r('Avenida Beira Mar Norte 2100 frete 200', 200),
  r('Condomínio Dois Irmãos bloco 4 apto 22 pintura 3.200', 3200), r('Rodovia SC 405 km 12 terraplenagem 8.000', 8000),
  r('Servidão João Batista Pires número 80 cimento 450', 450), r('Av. Pequeno Príncipe, 1200, ferro 3.100 reais', 3100),
  r('Travessa 3 casa 12 areia 380', 380), r('Estrada Geral do Campeche 5500 brita 1.200', 1200),
  r('CNPJ 12.345.678/0001-90 material 2.300', 2300), r('CPF 123.456.789-09 pedreiro 600', 600),
  r('Inscrição estadual 255123456 taxa 340', 340), r('Alvará 2026/1234 taxa 1.450 reais', 1450),
  r('ART 8899001 engenheiro 98', 98), r('Matrícula 56789 registro cartório 1.380', 1380),
  r('Processo 1234567-89.2026 custas 420', 420), r('Boleto linha digitável 34191.79001 pagamento 780', 780),
  r('Chave pix 48 99999 8888 valor 300', 300), r('Contrato 2026-045 mão de obra 12.000', 12000),
  r('Apólice 998877 seguro 1.250', 1250), r('Nota 8812 série 1 areia 350', 350),
];

// Rodada 37: valores grandes e formatos incomuns.
export const CASOS_ROD37: Caso[] = [
  r('R$ 1.234.567,89 de terreno', 1234567.89), r('um milhão e quinhentos de terreno', null), r('um milhão e quinhentos mil de terreno', 1500000),
  r('3 milhões e 500 mil de terreno', 3500000), r('R$ 3,5 milhões de terreno', 3500000), r('2,75 milhões de terreno', 2750000),
  r('quatrocentos e cinquenta mil reais de casa', 450000), r('450 mil de casa', 450000), r('450k de casa', null),
  r('R$ 450.000 de casa', 450000), r('450.000,00 de casa', 450000), r('quinhentos mil e duzentos reais', 500200),
  r('dois milhões trezentos e cinquenta mil', 2350000), r('trinta e cinco milhões de terreno', 35000000), r('oitenta milhões de terreno', null),
  r('R$ 0,99 de parafuso', 0.99), r('R$ 0,05 de arruela', 0.05), r('cinco centavos de arruela', 0.05), r('um real de arruela', 1),
  r('R$ 1 de arruela', 1), r('R$ 10,5 de arruela', 10.5), r('R$ 10,05 de arruela', 10.05), r('R$ 1.005 de peça', 1005),
];
