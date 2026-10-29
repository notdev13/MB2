import type { Categoria, Custo, FormaPagamento, Obra } from './tipos';

// Corpus de teste do interpretador de voz (voz.ts): frases escritas à mão e frases geradas por
// modelos, cada uma com o resultado esperado. Tudo sintético: nenhum dado real de cliente ou obra.
// Campo ausente em `esperado` = não conferir; `null` = o interpretador DEVE devolver null.

export interface Esperado {
  valor?: number | null; // centavos
  data?: string | null;
  pagamento?: FormaPagamento | null;
  pago?: boolean | null;
  categoria?: Categoria | null;
  obraId?: string | null;
  fornecedor?: string;
}
export interface Caso {
  frase: string;
  esperado: Esperado;
  tipo: string; // etiqueta do tipo de erro/assunto, para agrupar as falhas
  pendente?: boolean; // falha conhecida e aceita (aparece no relatório, não quebra o teste)
}

// ---- contexto sintético ----

const obra = (id: string, nome: string): Obra => ({
  id, nome, endereco: '', cliente: '', orcamento: 0, areaM2: null, inicio: null, previsaoFim: null,
  status: 'em_andamento', observacoes: '', criadoEm: '', atualizadoEm: '',
});
let seq = 0;
const custo = (categoria: Categoria, descricao: string, fornecedor = ''): Custo => ({
  id: String(seq++), obraId: 'l39', data: '2026-09-01', categoria, descricao, fornecedor, valor: 100_00,
  pagamento: 'outro', pago: true, criadoEm: '', atualizadoEm: '',
});
export const HOJE = '2026-10-28'; // quarta-feira
export const CONTEXTO = {
  hoje: HOJE,
  obras: [
    obra('l39', 'Obra Geminada JD Campeche – Lote 39'),
    obra('l12', 'Casa 12 Rio Tavares'),
    obra('eco', 'Terreno Ecovillas'),
    obra('oli', 'Olindina Maria Lopes'),
    obra('lau', 'Projeto Laureano'),
  ],
  custos: [
    custo('Mão de obra', 'MÃO DE OBRA – ULISSES', 'Ulisses'),
    custo('Mão de obra', 'MÃO DE OBRA – ADRIANO', 'Adriano'),
    custo('Materiais (M)', 'CASSOL'),
  ],
};

// ---- casos fixos (regressão) ----

const MAT: Categoria = 'Materiais (M)';
const MO: Categoria = 'Mão de obra';
const SERV: Categoria = 'Serviços (S)';

export const CASOS_FIXOS: Caso[] = [
  { tipo: 'base', frase: 'paguei trezentos e sessenta de cimento no lote 39 ontem no pix', esperado: { valor: 360_00, obraId: 'l39', data: '2026-10-27', pagamento: 'pix', pago: true, categoria: MAT } },
  { tipo: 'base', frase: 'mil e quinhentos pro Ulisses de mão de obra na casa 12', esperado: { valor: 1500_00, obraId: 'l12', categoria: MO } },
  { tipo: 'base', frase: 'comprei 20 sacos de cimento por 1.200 reais no boleto a pagar dia 15', esperado: { valor: 1200_00, data: null, pagamento: 'boleto', pago: false } },
  { tipo: 'meio', frase: 'dois mil e meio de areia', esperado: { valor: 2500_00, categoria: MAT } },
  { tipo: 'base', frase: 'R$ 850 de telha na Ecovilas hoje no cartão', esperado: { valor: 850_00, obraId: 'eco', data: HOJE, pagamento: 'cartao' } },
  { tipo: 'data', frase: 'pedreiro 450 sexta passada', esperado: { valor: 450_00, data: '2026-10-23', categoria: MO } },
  { tipo: 'conto', frase: 'um conto e duzentos', esperado: { valor: null } },
  { tipo: 'base', frase: 'cento e vinte e cinco reais de prego', esperado: { valor: 125_00, categoria: MAT } },
  { tipo: 'prazo', frase: 'vinte mil de laje a prazo', esperado: { valor: 20000_00, pago: false } },
  { tipo: 'data', frase: 'quinze de março', esperado: { valor: null, data: '2026-03-15' } },
  { tipo: 'data', frase: 'segunda-feira passada', esperado: { valor: null, data: '2026-10-26' } },
  { tipo: 'base', frase: 'setecentos e cinquenta reais de eletricista, pago em dinheiro', esperado: { valor: 750_00, pagamento: 'dinheiro', pago: true, categoria: SERV } },
  { tipo: 'virgula', frase: 'cimento 1,200', esperado: { valor: 1200_00 } },
  { tipo: 'virgula', frase: 'cimento 1.200,50', esperado: { valor: 1200_50 } },
  { tipo: 'virgula', frase: 'paguei 1,200 de cimento', esperado: { valor: 1200_00 } },
  { tipo: 'mil', frase: 'mil reais de areia', esperado: { valor: 1000_00 } },
  { tipo: 'milhao', frase: 'meio milhão de terreno', esperado: { valor: 500000_00 } },
  { tipo: 'milhao', frase: 'dois milhões e meio de terreno', esperado: { valor: 2500000_00 } },
  { tipo: 'colado', frase: 'R$360 de cimento', esperado: { valor: 360_00 } },
  { tipo: 'centavos', frase: 'trezentos reais e cinquenta centavos de areia', esperado: { valor: 300_50 } },
  { tipo: 'centavos', frase: 'noventa centavos de parafuso', esperado: { valor: 90 } },
  { tipo: 'centavos', frase: 'cinquenta e oito reais e noventa centavos de cola', esperado: { valor: 58_90 } },
  { tipo: 'pagamento', frase: 'pix de 300', esperado: { valor: 300_00, pagamento: 'pix' } },
  { tipo: 'verbo', frase: 'foi 90 de frete', esperado: { valor: 90_00, categoria: SERV } },
  { tipo: 'ruido-pix', frase: 'paguei 1.500 de tijolo no lote 39 pelo pique', esperado: { valor: 1500_00, obraId: 'l39', pagamento: 'pix' } },
  { tipo: 'ruido-boleto', frase: 'bolheto de 800 de tinta', esperado: { valor: 800_00, pagamento: 'boleto' } },
  { tipo: 'ruido', frase: 'então tá, paguei 200 de areia', esperado: { valor: 200_00, pago: true } },
  { tipo: 'ruido', frase: 'hum é 200 de areia', esperado: { valor: 200_00 } },
  { tipo: 'virgula', frase: '2.5 mil de madeira', esperado: { valor: 2500_00 } },
  { tipo: 'parcela', frase: 'três mil e quinhentos de concreto em 3 vezes', esperado: { valor: null, pago: false } },
  { tipo: 'parcela', frase: 'parcelado em 3x de 500 de piso', esperado: { valor: null, pago: false } },
  { tipo: 'parcela', frase: 'dez parcelas de 300 de azulejo', esperado: { valor: null } },
  { tipo: 'extenso', frase: 'mil trezentos e vinte de ferro', esperado: { valor: 1320_00 } },
  { tipo: 'extenso', frase: 'mil e vinte e cinco reais de fio', esperado: { valor: 1025_00 } },
  { tipo: 'extenso', frase: 'duzentos e cinquenta e um reais de cabo', esperado: { valor: 251_00 } },
  { tipo: 'duvida', frase: 'dois e meio de madeira', esperado: { valor: null } },
  { tipo: 'duvida', frase: 'quinhentos e meia de brita', esperado: { valor: null } },
  { tipo: 'duvida', frase: 'vinte e cinco e cinquenta de prego', esperado: { valor: null } },
  { tipo: 'duvida', frase: 'três e cinquenta de areia', esperado: { valor: null } },
  { tipo: 'duvida', frase: 'paguei 15 sacos de cimento a 40 reais cada', esperado: { valor: null } },
  { tipo: 'duvida', frase: 'dois mil de ferro e quinhentos de areia', esperado: { valor: null } },
  { tipo: 'obra-data', frase: 'Laureano 2 mil de armador dia 5 no pix', esperado: { valor: 2000_00, obraId: 'lau', data: '2026-10-05', pagamento: 'pix' } },
  { tipo: 'pagamento', frase: 'paguei 780 de tubo no débito', esperado: { valor: 780_00, pagamento: 'cartao' } },
  { tipo: 'mil', frase: 'paguei o pedreiro 1,5 mil', esperado: { valor: 1500_00, categoria: MO } },
  { tipo: 'mil', frase: 'sessenta e cinco mil reais de empreitada', esperado: { valor: 65000_00 } },
  { tipo: 'data', frase: 'quarta-feira passada 300 de areia', esperado: { valor: 300_00, data: '2026-10-21' } },
  { tipo: 'parcela', frase: 'R$ 1.200 de brita no cartão em 6 vezes', esperado: { valor: 1200_00, pagamento: 'cartao', pago: false } },
  { tipo: 'extenso', frase: 'quinhentos e cinquenta e nove', esperado: { valor: 559_00 } },
  { tipo: 'extenso', frase: 'mil duzentos e cinquenta', esperado: { valor: 1250_00 } },
  { tipo: 'extenso', frase: 'mil e duzentos e cinquenta', esperado: { valor: 1250_00 } },
  { tipo: 'numero-obra', frase: 'lote 39 trezentos reais de areia', esperado: { valor: 300_00, obraId: 'l39' } },
];

// Rodada 3: frases escritas à mão, mais difíceis (nenhuma foi vista antes pelo interpretador).
export const CASOS_ROD3: Caso[] = [
  { tipo: 'dois-valores', frase: 'paguei duzentos e cinquenta reais de areia e cem de brita', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'paguei trezentos e quarenta e cinco reais de cimento, quinhentos e vinte de areia', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'paguei cem reais pro servente e duzentos pro pedreiro', esperado: { valor: null } },
  { tipo: 'mil', frase: 'R$ 1.500,00 pro Adriano', esperado: { valor: 1500_00, categoria: MO, fornecedor: 'Adriano' } },
  { tipo: 'base', frase: 'mil e quinhentos reais pro Adriano ontem no pix', esperado: { valor: 1500_00, categoria: MO, data: '2026-10-27', pagamento: 'pix' } },
  { tipo: 'base', frase: 'o Ulisses recebeu 1.800', esperado: { valor: 1800_00, categoria: MO, fornecedor: 'Ulisses' } },
  { tipo: 'base', frase: 'dei 500 pro Adrian de diária', esperado: { valor: 500_00, categoria: MO } },
  { tipo: 'quantidade', frase: 'comprei 3 sacos de cimento por 120 reais', esperado: { valor: 120_00 } },
  { tipo: 'quantidade', frase: 'comprei três latas de tinta por duzentos e dez reais', esperado: { valor: 210_00 } },
  { tipo: 'quantidade', frase: 'ferro de 8 milímetros 300 reais', esperado: { valor: 300_00 } },
  { tipo: 'quantidade', frase: 'disjuntor de 20 por 85 reais', esperado: { valor: 85_00 } },
  { tipo: 'quantidade', frase: 'brita 1 por 450', esperado: { valor: 450_00 } },
  { tipo: 'base', frase: 'cimento: 360', esperado: { valor: 360_00 } },
  { tipo: 'base', frase: 'valor 1500', esperado: { valor: 1500_00 } },
  { tipo: 'mil', frase: '15 mil', esperado: { valor: 15000_00 } },
  { tipo: 'mil', frase: 'quinze mil e quinhentos reais', esperado: { valor: 15500_00 } },
  { tipo: 'milhao', frase: 'um milhão de terreno', esperado: { valor: 1000000_00 } },
  { tipo: 'conto', frase: 'oitocentos pila', esperado: { valor: 800_00 } },
  { tipo: 'conto', frase: 'cinquenta contos de areia', esperado: { valor: 50_00 } },
  { tipo: 'centavos', frase: 'um real e cinquenta centavos', esperado: { valor: 1_50 } },
  { tipo: 'duvida', frase: 'três reais e 50 de prego', esperado: { valor: null } },
  { tipo: 'centavos', frase: 'R$ 0,50 de parafuso', esperado: { valor: 50 } },
  { tipo: 'centavos', frase: 'cinquenta centavos', esperado: { valor: 50 } },
  { tipo: 'centavos', frase: 'R$ 12,5 de cola', esperado: { valor: 12_50 } },
  { tipo: 'duvida', frase: 'doze e cinquenta de prego', esperado: { valor: null } },
  { tipo: 'data', frase: 'paguei 400 no dia 5', esperado: { valor: 400_00, data: '2026-10-05' } },
  { tipo: 'fornecedor', frase: 'quinhentos de cimento na Cassol', esperado: { valor: 500_00, categoria: MAT } },
  { tipo: 'digitos', frase: '1 mil e 200 de areia', esperado: { valor: 1200_00 } },
  { tipo: 'extenso', frase: 'duzentos e vinte mil de laje', esperado: { valor: 220000_00 } },
  { tipo: 'virgula', frase: '3.5 mil de telha', esperado: { valor: 3500_00 } },
  { tipo: 'extenso', frase: 'mil duzentos e trinta e quatro reais de fio', esperado: { valor: 1234_00 } },
  { tipo: 'moeda', frase: 'R$ 360 reais de cimento', esperado: { valor: 360_00 } },
  { tipo: 'categoria', frase: 'paguei 45 reais de gasolina no pix', esperado: { valor: 45_00, categoria: 'Locação e consumo', pagamento: 'pix' } },
  { tipo: 'categoria', frase: 'paguei a conta de luz 230', esperado: { valor: 230_00, categoria: 'Locação e consumo' } },
  { tipo: 'categoria', frase: 'pagamento do ISS 1.200 no boleto', esperado: { valor: 1200_00, categoria: 'Impostos e taxas', pagamento: 'boleto' } },
  { tipo: 'categoria', frase: 'pintor 600 reais', esperado: { valor: 600_00, categoria: MO } },
  { tipo: 'categoria', frase: 'rejunte 80 reais', esperado: { valor: 80_00, categoria: MAT } },
  { tipo: 'data', frase: '100 de areia 10/10/26', esperado: { valor: 100_00, data: '2026-10-10' } },
  { tipo: 'data', frase: 'sábado passado 100 de areia', esperado: { valor: 100_00, data: '2026-10-24' } },
  { tipo: 'data', frase: '100 de areia semana passada', esperado: { valor: 100_00, data: null } },
  { tipo: 'data-futura', frase: '100 de areia segunda que vem', esperado: { valor: 100_00, data: null } },
  { tipo: 'data-futura', frase: 'próxima sexta 100 de areia', esperado: { valor: 100_00, data: null } },
  { tipo: 'data-futura', frase: 'pagar amanhã 100 de areia', esperado: { valor: 100_00, data: null, pago: false } },
  { tipo: 'data', frase: 'ontem à noite 100 de areia', esperado: { valor: 100_00, data: '2026-10-27' } },
  { tipo: 'data', frase: '100 de areia dia 31', esperado: { valor: 100_00, data: null } },
  { tipo: 'pago', frase: '300 de areia não foi pago', esperado: { valor: 300_00, pago: false } },
  { tipo: 'pago', frase: '300 de areia fica pra pagar depois', esperado: { valor: 300_00, pago: false } },
  { tipo: 'pago', frase: 'ainda não pagou os 300 de areia', esperado: { valor: 300_00, pago: false } },
  { tipo: 'pago', frase: 'já quitei 300 de areia', esperado: { valor: 300_00, pago: true } },
  { tipo: 'pagamento', frase: '300 de areia no cheque', esperado: { valor: 300_00, pagamento: 'outro' } },
  { tipo: 'pagamento', frase: 'depositei 300 pro Ulisses', esperado: { valor: 300_00, pagamento: 'transferencia', categoria: MO } },
  { tipo: 'pagamento', frase: 'cartão de crédito em 10 vezes 1.000 de piso', esperado: { valor: null, pagamento: 'cartao', pago: false } },
  { tipo: 'aprox', frase: 'uns quinhentos reais de gesso', esperado: { valor: null } },
  { tipo: 'ruido', frase: 'ééé então tá é paguei assim, tipo, 300 de areia', esperado: { valor: null, pago: true } },
];

// Rodada 4: números que não são dinheiro (especificação, parcela, preço por unidade, percentual).
export const CASOS_ROD4: Caso[] = [
  { tipo: 'especificacao', frase: 'cimento CP2 por 360 reais', esperado: { valor: 360_00 } },
  { tipo: 'especificacao', frase: 'tubo de 100 mm 80 reais', esperado: { valor: 80_00 } },
  { tipo: 'especificacao', frase: 'brita 2 por 450', esperado: { valor: 450_00 } },
  { tipo: 'especificacao', frase: 'fio 2,5 mm 300 reais', esperado: { valor: 300_00 } },
  { tipo: 'especificacao', frase: 'telha 40 por 40 custou 800 reais', esperado: { valor: 800_00 } },
  { tipo: 'parcela', frase: '2ª parcela de 500', esperado: { valor: 500_00 } },
  { tipo: 'parcela', frase: 'segunda parcela de 500 da laje', esperado: { valor: 500_00, data: null } },
  { tipo: 'parcela', frase: 'R$ 1.200,00 de entrada e 3 parcelas de 500', esperado: { valor: null } },
  { tipo: 'parcela', frase: 'paguei a primeira parcela de 1.000', esperado: { valor: 1000_00, pago: true } },
  { tipo: 'percentual', frase: 'paguei 50% de 2.000', esperado: { valor: null } },
  { tipo: 'percentual', frase: 'paguei dez por cento de entrada de 3 mil', esperado: { valor: null } },
  { tipo: 'duvida', frase: '3 x 500', esperado: { valor: null } },
  { tipo: 'duvida', frase: '500 mais 200 de areia', esperado: { valor: null } },
  { tipo: 'hora', frase: '14:30 paguei 200 de areia', esperado: { valor: null } },
  { tipo: 'hora', frase: 'às 14h paguei 200 de areia', esperado: { valor: 200_00 } },
  { tipo: 'repetido', frase: 'paguei 200 de areia (duzentos reais)', esperado: { valor: 200_00 } },
  { tipo: 'repetido', frase: 'R$ 360 (trezentos e sessenta)', esperado: { valor: 360_00 } },
  { tipo: 'centavos', frase: 'paguei 1 real e 50 centavos de prego', esperado: { valor: 1_50 } },
  { tipo: 'centavos', frase: 'dez reais e cinquenta centavos', esperado: { valor: 10_50 } },
  { tipo: 'centavos', frase: 'cinco mil e duzentos reais e cinquenta centavos', esperado: { valor: 5200_50 } },
  { tipo: 'extenso', frase: 'paguei quatro mil e trezentos', esperado: { valor: 4300_00 } },
  { tipo: 'extenso', frase: 'duzentos e cinco', esperado: { valor: 205_00 } },
  { tipo: 'extenso', frase: 'cento e um reais', esperado: { valor: 101_00 } },
  { tipo: 'extenso', frase: 'mil e um reais', esperado: { valor: 1001_00 } },
  { tipo: 'extenso', frase: 'dois mil e dez reais', esperado: { valor: 2010_00 } },
  { tipo: 'extenso', frase: 'dezoito mil e quinhentos', esperado: { valor: 18500_00 } },
  { tipo: 'extenso', frase: 'cem mil e quinhentos', esperado: { valor: 100500_00 } },
  { tipo: 'extenso', frase: 'seiscentos e sessenta e seis', esperado: { valor: 666_00 } },
  { tipo: 'extenso', frase: 'trinta e um reais', esperado: { valor: 31_00 } },
  { tipo: 'extenso', frase: 'um mil e duzentos', esperado: { valor: 1200_00 } },
  { tipo: 'quantidade', frase: 'duas mil telhas por 3 mil reais', esperado: { valor: 3000_00 } },
  { tipo: 'quantidade', frase: '200 telhas, 300 reais', esperado: { valor: 300_00 } },
  { tipo: 'unitario', frase: 'uma hora de máquina 150', esperado: { valor: 150_00, categoria: SERV } },
  { tipo: 'quantidade', frase: 'duas horas de máquina por 300', esperado: { valor: 300_00 } },
  { tipo: 'unitario', frase: 'quatro diárias de 150 cada', esperado: { valor: null } },
  { tipo: 'unitario', frase: 'paguei 3 diárias de 150', esperado: { valor: null } },
  { tipo: 'unitario', frase: 'servente 3 dias a 150', esperado: { valor: null } },
  { tipo: 'unitario', frase: 'paguei 3 dias de servente 150', esperado: { valor: 150_00 } },
  { tipo: 'unitario', frase: 'paguei duzentos reais por dia', esperado: { valor: null } },
  { tipo: 'unitario', frase: 'ajudante duzentos reais por dia durante cinco dias', esperado: { valor: null } },
  { tipo: 'unitario', frase: 'cimento 40 reais o saco', esperado: { valor: null } },
  { tipo: 'mensal', frase: 'aluguel de 1.500 por mês', esperado: { valor: 1500_00, categoria: 'Locação e consumo' } },
  { tipo: 'data', frase: '30 de setembro 100 de areia', esperado: { valor: 100_00, data: '2026-09-30' } },
  { tipo: 'data', frase: 'dia 5 de maio de 2025 100 de areia', esperado: { valor: 100_00, data: '2025-05-05' } },
  { tipo: 'data', frase: 'quinta 100 de areia', esperado: { valor: 100_00, data: '2026-10-22' } },
  { tipo: 'data', frase: '100 de areia quarta', esperado: { valor: 100_00, data: '2026-10-21' } },
  { tipo: 'data-futura', frase: 'boleto de 400 vence dia 5 de novembro', esperado: { valor: 400_00, pago: false, pagamento: 'boleto', data: null } },
  { tipo: 'pago', frase: 'boleto vence dia 20 de 400 de piso', esperado: { valor: 400_00, pago: false, pagamento: 'boleto', data: null } },
  { tipo: 'pago', frase: 'paguei 800 de piso no cartão em 12 vezes', esperado: { valor: null, pago: null, pagamento: 'cartao' } },
  { tipo: 'documento', frase: 'nota fiscal 1234 de cimento 500 reais', esperado: { valor: 500_00 } },
  { tipo: 'documento', frase: 'pedido 4521 cimento 800 reais', esperado: { valor: 800_00 } },
  { tipo: 'documento', frase: 'orçamento 7788 aprovado em 15 mil', esperado: { valor: 15000_00 } },
  { tipo: 'documento', frase: 'cheque 123456 de 2 mil', esperado: { valor: 2000_00, pagamento: 'outro' } },
  { tipo: 'obra', frase: 'obra Olindina Maria 300 de areia', esperado: { valor: 300_00, obraId: 'oli' } },
  { tipo: 'obra', frase: 'Laureano e Olindina 500', esperado: { valor: 500_00, obraId: null } },
  { tipo: 'obra', frase: 'terreno 700 reais', esperado: { valor: 700_00, obraId: null } },
];

// Rodada 5: fala corrida, verbos soltos, valores longos e datas de pagamento futuro.
export const CASOS_ROD5: Caso[] = [
  { tipo: 'conversa', frase: 'olha, o Ulisses veio hoje e eu paguei mil e duzentos', esperado: { valor: 1200_00, categoria: MO, data: HOJE, pago: true } },
  { tipo: 'conversa', frase: 'lança aí 360 de cimento no lote 39', esperado: { valor: 360_00, obraId: 'l39' } },
  { tipo: 'conversa', frase: 'registra dois mil de areia pra Ecovilas', esperado: { valor: 2000_00, obraId: 'eco' } },
  { tipo: 'conversa', frase: 'gastei hoje dois mil e trezentos reais com tijolo no lote trinta e nove', esperado: { valor: 2300_00, obraId: 'l39', data: HOJE } },
  { tipo: 'conversa', frase: 'adiantamento de 500 pro Adriano', esperado: { valor: 500_00, categoria: MO } },
  { tipo: 'conversa', frase: 'foram 90 reais de frete', esperado: { valor: 90_00 } },
  { tipo: 'conversa', frase: 'deu 1.200 o cimento', esperado: { valor: null } },
  { tipo: 'conversa', frase: 'o total ficou em 4.350,75', esperado: { valor: 4350_75 } },
  { tipo: 'conversa', frase: 'ficou em quatro mil e trezentos e cinquenta reais', esperado: { valor: 4350_00 } },
  { tipo: 'conversa', frase: 'pix de mil reais pro Adriano', esperado: { valor: 1000_00, pagamento: 'pix', categoria: MO } },
  { tipo: 'conversa', frase: 'transferência de dois mil e quinhentos', esperado: { valor: 2500_00, pagamento: 'transferencia' } },
  { tipo: 'parcela', frase: 'cartão 3 vezes de 400', esperado: { valor: null, pagamento: 'cartao', pago: false } },
  { tipo: 'conversa', frase: 'sinal de 5 mil', esperado: { valor: 5000_00 } },
  { tipo: 'digitos', frase: 'pagamento final 8 mil e 200', esperado: { valor: 8200_00 } },
  { tipo: 'extenso', frase: 'mil e quatrocentos e cinquenta reais', esperado: { valor: 1450_00 } },
  { tipo: 'colado', frase: 'R$1.250', esperado: { valor: 1250_00 } },
  { tipo: 'centavos', frase: 'R$ 1.250,5', esperado: { valor: 1250_50 } },
  { tipo: 'centavos', frase: '1250 reais e 50 centavos', esperado: { valor: 1250_50 } },
  { tipo: 'centavos', frase: 'mil duzentos e cinquenta e dois reais e dez centavos', esperado: { valor: 1252_10 } },
  { tipo: 'virgula', frase: 'quatro mil, duzentos e trinta', esperado: { valor: 4230_00 } },
  { tipo: 'virgula', frase: '1,200.50 de areia', esperado: { valor: 1200_50 } },
  { tipo: 'extenso', frase: 'dez mil duzentos e vinte', esperado: { valor: 10220_00 } },
  { tipo: 'extenso', frase: 'oitenta e cinco mil', esperado: { valor: 85000_00 } },
  { tipo: 'extenso', frase: 'duzentos e cinquenta mil e quinhentos reais', esperado: { valor: 250500_00 } },
  { tipo: 'extenso', frase: 'novecentos e noventa e nove', esperado: { valor: 999_00 } },
  { tipo: 'milhao', frase: 'um milhão duzentos mil', esperado: { valor: 1200000_00 } },
  { tipo: 'milhao', frase: 'dois milhões', esperado: { valor: 2000000_00 } },
  { tipo: 'meio', frase: 'dois mil e meio reais', esperado: { valor: 2500_00 } },
  { tipo: 'duvida', frase: 'um e meio', esperado: { valor: null } },
  { tipo: 'data', frase: 'dia 1º 100 de areia', esperado: { valor: 100_00, data: '2026-10-01' } },
  { tipo: 'data', frase: 'segunda de manhã 100 de areia', esperado: { valor: 100_00, data: '2026-10-26' } },
  { tipo: 'data', frase: 'semana retrasada 100 de areia', esperado: { valor: 100_00, data: null } },
  { tipo: 'data-futura', frase: 'ainda vou pagar o pedreiro 800 sexta', esperado: { valor: 800_00, pago: false, data: null } },
  { tipo: 'data-futura', frase: '800 de piso a pagar dia 30', esperado: { valor: 800_00, pago: false, data: null } },
  { tipo: 'data-futura', frase: '800 de piso a pagar ontem', esperado: { valor: 800_00, pago: false, data: '2026-10-27' } },
];

// Rodada 7: armadilhas de valor (cálculo, unitário, moeda estrangeira, números colados) e de data.
export const CASOS_ROD7: Caso[] = [
  { tipo: 'dois-valores', frase: 'paguei 30 de cimento e 20 de areia', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'paguei trinta reais de cimento e vinte de areia', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'cimento 30, areia 20', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'cimento 30 e areia 20', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'duzentos reais mais cinquenta de frete', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'duzentos reais e cinquenta de frete', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'duzentos e cinquenta reais, cem de frete', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'mil e quinhentos menos 200', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'paguei 1.200 mas era 1.500', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'não foi 500, foi 600', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'cinco mil reais mais cem de frete', esperado: { valor: null } },
  { tipo: 'unitario', frase: 'paguei cem reais pra cada um dos dois', esperado: { valor: null } },
  { tipo: 'unitario', frase: 'o pedreiro e o servente, 300 cada', esperado: { valor: null } },
  { tipo: 'calculo', frase: 'metade de 1.000', esperado: { valor: null } },
  { tipo: 'calculo', frase: 'desconto de 100 em 1.500', esperado: { valor: null } },
  { tipo: 'calculo', frase: 'sobrou 300 do cimento', esperado: { valor: null } },
  { tipo: 'moeda-estrangeira', frase: 'mil dólares de ferro', esperado: { valor: null } },
  { tipo: 'moeda-estrangeira', frase: 'paguei 500 euros', esperado: { valor: null } },
  { tipo: 'colado', frase: 'R$ 1 200 de areia', esperado: { valor: null } },
  { tipo: 'colado', frase: 'lote 39 200 reais de areia', esperado: { valor: 200_00, obraId: 'l39' } },
  { tipo: 'colado', frase: 'mil duzentos cinquenta de areia', esperado: { valor: null } },
  { tipo: 'nome', frase: 'Quatro Irmãos 500 reais', esperado: { valor: 500_00 } },
  { tipo: 'nome', frase: 'Quatro Irmãos 500', esperado: { valor: 500_00 } },
  { tipo: 'unidade', frase: '10 m³ de areia 800 reais', esperado: { valor: 800_00 } },
  { tipo: 'unidade', frase: '10 metros cúbicos de areia por 800', esperado: { valor: 800_00 } },
  { tipo: 'sem-valor', frase: 'cancela o último lançamento', esperado: { valor: null } },
  { tipo: 'sem-valor', frase: 'paguei o pedreiro hoje', esperado: { valor: null, data: HOJE, categoria: MO } },
  { tipo: 'extenso', frase: 'dois mil e quinhentos e cinquenta', esperado: { valor: 2550_00 } },
  { tipo: 'extenso', frase: 'mil, duzentos', esperado: { valor: 1200_00 } },
  { tipo: 'extenso', frase: 'R$ 5 mil reais', esperado: { valor: 5000_00 } },
  { tipo: 'prazo', frase: 'a prazo de 30 dias 1.500 reais', esperado: { valor: 1500_00, pago: false } },
  { tipo: 'data', frase: 'segunda via do boleto 120 reais', esperado: { valor: 120_00, data: null, pagamento: 'boleto' } },
  { tipo: 'data', frase: 'mil e quinhentos pro Ulisses de segunda a sexta', esperado: { valor: 1500_00, data: null, categoria: MO } },
  { tipo: 'data', frase: '15 de março do ano passado 100 de areia', esperado: { valor: 100_00, data: null } },
  { tipo: 'data', frase: 'dia 10 do mês passado 100 de areia', esperado: { valor: 100_00, data: null } },
  { tipo: 'data', frase: 'dia 29 de fevereiro 100 de areia', esperado: { valor: 100_00, data: null } },
  { tipo: 'data', frase: 'ontem 100 de areia dia 10', esperado: { valor: 100_00, data: '2026-10-27' } },
  { tipo: 'pagamento', frase: 'pix e boleto 300 de areia', esperado: { valor: 300_00, pagamento: null } },
  { tipo: 'pagamento', frase: 'transferi 2 mil pro Adriano', esperado: { valor: 2000_00, pagamento: 'transferencia', categoria: MO } },
  { tipo: 'pagamento', frase: 'cartão de débito 300 de areia', esperado: { valor: 300_00, pagamento: 'cartao' } },
];

// Rodada 8: erros de reconhecimento, pontuação estranha, estimativas e nomes de obra mal ouvidos.
export const CASOS_ROD8: Caso[] = [
  { tipo: 'digitos-e', frase: '300 e 60 reais de cimento', esperado: { valor: null } },
  { tipo: 'digitos-e', frase: 'paguei 1.000 e 500 de areia', esperado: { valor: null } },
  { tipo: 'feminino', frase: 'duzentas e cinquenta reais de telha', esperado: { valor: 250_00 } },
  { tipo: 'feminino', frase: 'trezentas telhas por quatrocentas e vinte', esperado: { valor: 420_00 } },
  { tipo: 'portugal', frase: 'dezasseis mil de laje', esperado: { valor: 16000_00 } },
  { tipo: 'portugal', frase: 'dezassete reais de prego', esperado: { valor: 17_00 } },
  { tipo: 'estimativa', frase: 'mil e pouco de areia', esperado: { valor: null } },
  { tipo: 'estimativa', frase: 'mil e tantos reais de areia', esperado: { valor: null } },
  { tipo: 'estimativa', frase: 'mais de quinhentos reais de areia', esperado: { valor: null } },
  { tipo: 'estimativa', frase: 'no máximo 300 de areia', esperado: { valor: null } },
  { tipo: 'estimativa', frase: 'por volta de 300 reais de areia', esperado: { valor: null } },
  { tipo: 'estimativa', frase: 'na faixa de 300 reais de areia', esperado: { valor: null } },
  { tipo: 'estimativa', frase: 'quase 300 reais de areia', esperado: { valor: null } },
  { tipo: 'espaco', frase: 'R$\u00a01.200 de areia', esperado: { valor: 1200_00 } },
  { tipo: 'pontuacao', frase: 'paguei… 300 de areia', esperado: { valor: 300_00, pago: true } },
  { tipo: 'pontuacao', frase: '“trezentos” reais de areia', esperado: { valor: 300_00 } },
  { tipo: 'pontuacao', frase: 'paguei - 300 - de areia - no pix', esperado: { valor: 300_00, pagamento: 'pix', pago: true } },
  { tipo: 'pontuacao', frase: 'PAGUEI 300 DE AREIA NO PIX!!!', esperado: { valor: 300_00, pagamento: 'pix', pago: true } },
  { tipo: 'pontuacao', frase: 'pix/boleto 300 de areia', esperado: { valor: 300_00, pagamento: null } },
  { tipo: 'dois-valores', frase: 'paguei 360 pro Ulisses e 500 pro Adriano', esperado: { valor: null } },
  { tipo: 'obra', frase: '300 de areia na olindinha', esperado: { valor: 300_00, obraId: 'oli' } },
  { tipo: 'obra', frase: '300 de areia no lauriano', esperado: { valor: 300_00, obraId: 'lau' } },
  { tipo: 'obra', frase: '300 de areia na ecovilla', esperado: { valor: 300_00, obraId: 'eco' } },
  { tipo: 'obra', frase: '300 de areia no Rio Tavares', esperado: { valor: 300_00, obraId: 'l12' } },
  { tipo: 'obra', frase: '300 de areia no Campeche', esperado: { valor: 300_00, obraId: 'l39' } },
  { tipo: 'data', frase: 'sábado via pix 450 de aluguel de andaime', esperado: { valor: 450_00, data: '2026-10-24', pagamento: 'pix' } },
];

// Rodada 9: formatos de número escrito, ruído de moeda e metade/meio fora de conta.
export const CASOS_ROD9: Caso[] = [
  { tipo: 'formato', frase: '1.234,567 de areia', esperado: { valor: null } },
  { tipo: 'formato', frase: '0,125 de prego', esperado: { valor: null } },
  { tipo: 'formato', frase: '360.00 de areia', esperado: { valor: 360_00 } },
  { tipo: 'formato', frase: '1.200.000 de terreno', esperado: { valor: 1200000_00 } },
  { tipo: 'formato', frase: '1,200,000 de terreno', esperado: { valor: 1200000_00 } },
  { tipo: 'formato', frase: 'R$ 1200,5 de cola', esperado: { valor: 1200_50 } },
  { tipo: 'formato', frase: '10.000 de brita', esperado: { valor: 10000_00 } },
  { tipo: 'formato', frase: '3,50 de prego', esperado: { valor: 3_50 } },
  { tipo: 'formato', frase: '12.34.56 de areia', esperado: { valor: null } },
  { tipo: 'artigo', frase: 'um saco de cimento por 40', esperado: { valor: 40_00 } },
  { tipo: 'artigo', frase: 'um saco de cimento 40 reais o saco', esperado: { valor: null } },
  { tipo: 'artigo', frase: 'dois cimentos por 80 reais', esperado: { valor: 80_00 } },
  { tipo: 'artigo', frase: 'dois cimentos 80', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: '20 reais de gasolina e 30 de óleo', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: '20 de gasolina, 30 reais', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'o terreno custou 350 mil reais, paguei 50 de entrada', esperado: { valor: null } },
  { tipo: 'mil', frase: 'entrada 50 mil e o resto em 10 vezes', esperado: { valor: null } },
  { tipo: 'meio', frase: '2 mil e meio', esperado: { valor: 2500_00 } },
  { tipo: 'meio', frase: '2,5 milhões', esperado: { valor: 2500000_00 } },
  { tipo: 'meio', frase: '1,1 mil', esperado: { valor: 1100_00 } },
  { tipo: 'meio', frase: '4,35 mil de ferro', esperado: { valor: 4350_00 } },
  { tipo: 'meio', frase: 'dois mil, duzentos e dez', esperado: { valor: 2210_00 } },
  { tipo: 'meio', frase: 'oito e meia', esperado: { valor: null } },
  { tipo: 'meio', frase: 'meio dia de servente 150', esperado: { valor: null } },
  { tipo: 'meio', frase: 'meia hora de máquina 100', esperado: { valor: null } },
  { tipo: 'moeda', frase: 'R$ R$ 300', esperado: { valor: 300_00 } },
  { tipo: 'moeda', frase: '300,00R$ de areia', esperado: { valor: 300_00 } },
  { tipo: 'moeda', frase: 'um real', esperado: { valor: 1_00 } },
  { tipo: 'data', frase: 'dia 15 de setembro de 2025 100 de areia', esperado: { valor: 100_00, data: '2025-09-15' } },
  { tipo: 'data', frase: '15/9 100 de areia', esperado: { valor: 100_00, data: '2026-09-15' } },
  { tipo: 'data', frase: '15/09/25 100 de areia', esperado: { valor: 100_00, data: '2025-09-15' } },
  { tipo: 'data', frase: '32/10 100 de areia', esperado: { valor: 100_00, data: null } },
  { tipo: 'parcela', frase: 'cartão de crédito parcelado em 12 vezes de 150', esperado: { valor: null, pagamento: 'cartao', pago: false } },
];

// Rodada 10: não é custo (estorno, cotação), números de endereço/telefone/ano, alternativas e gíria de dinheiro.
export const CASOS_ROD10: Caso[] = [
  { tipo: 'nao-custo', frase: 'estorno de 300 do cimento', esperado: { valor: null } },
  { tipo: 'nao-custo', frase: 'devolveram 300 reais de areia', esperado: { valor: null } },
  { tipo: 'nao-custo', frase: 'reembolso de 450 reais', esperado: { valor: null } },
  { tipo: 'nao-custo', frase: 'cotação de 2 mil de telha', esperado: { valor: null } },
  { tipo: 'nao-custo', frase: 'proposta de 12 mil do pedreiro', esperado: { valor: null } },
  { tipo: 'giria', frase: '300 pratas de areia', esperado: { valor: 300_00 } },
  { tipo: 'giria', frase: 'dois mil mangos de ferro', esperado: { valor: 2000_00 } },
  { tipo: 'unidade', frase: 'contrato de 12 meses 1.500 reais', esperado: { valor: 1500_00 } },
  { tipo: 'unidade', frase: 'garantia de 5 anos 800 reais', esperado: { valor: 800_00 } },
  { tipo: 'endereco', frase: 'rua 7 300 reais de areia', esperado: { valor: 300_00 } },
  { tipo: 'endereco', frase: 'avenida 25 de agosto 300 reais', esperado: { valor: 300_00 } },
  { tipo: 'endereco', frase: 'apartamento 302 pintura 800 reais', esperado: { valor: 800_00 } },
  { tipo: 'telefone', frase: 'ligar 48999998888 pagar 300 de areia', esperado: { valor: 300_00 } },
  { tipo: 'telefone', frase: 'cep 88063000 areia 300 reais', esperado: { valor: 300_00 } },
  { tipo: 'telefone', frase: 'pagar 48999998888', esperado: { valor: null } },
  { tipo: 'ano', frase: 'em 2026 paguei 300 reais de areia', esperado: { valor: 300_00 } },
  { tipo: 'ano', frase: 'ano 2026 areia 300', esperado: { valor: 300_00 } },
  { tipo: 'alternativa', frase: '300 ou 400 de areia', esperado: { valor: null } },
  { tipo: 'alternativa', frase: 'entre 300 e 400 de areia', esperado: { valor: null } },
  { tipo: 'alternativa', frase: '300 a 400 de areia', esperado: { valor: null } },
  { tipo: 'alternativa', frase: '300, 400 de areia', esperado: { valor: null } },
  { tipo: 'alternativa', frase: 'primeiro 300 depois 200 de areia', esperado: { valor: null } },
  { tipo: 'alternativa', frase: 'trezentos ou quatrocentos reais', esperado: { valor: null } },
  { tipo: 'limite', frase: 'cinquenta milhões de terreno', esperado: { valor: 50000000_00 } },
  { tipo: 'limite', frase: 'cem milhões de terreno', esperado: { valor: null } },
];

// Caos: uma frase com UM valor claro (com "R$" ou "reais") misturado a números que não são dinheiro,
// em ordem aleatória. O valor certo ou null passam; qualquer outro número é erro grave.
export function gerarCaos(semente: number, quantidade: number, perigoso = false): Caso[] {
  const r = aleatorio(semente * 104729 + 7);
  const esc = <T,>(l: T[]): T => l[Math.floor(r() * l.length)];
  const casos: Caso[] = [];
  while (casos.length < quantidade) {
    const reais = esc([35, 90, 120, 250, 360, 780, 1200, 2500, 4800, 12000, 65000]);
    const cent = r() < 0.2 ? esc([10, 50, 75]) : 0;
    const valorFala = esc([
      `R$ ${milhar(reais)}${cent ? ',' + centavosTexto(cent) : ''}`,
      `${milhar(reais)}${cent ? ',' + centavosTexto(cent) : ''} reais`,
      cent ? `${porExtenso(reais)} reais e ${porExtenso(cent)} centavos` : `${porExtenso(reais)} reais`,
    ]);
    const n = () => esc([2, 3, 5, 8, 10, 12, 20, 40, 100, 250, 889, 4521]);
    const palavra = () => esc(['dois', 'três', 'cinco', 'dez', 'vinte', 'cem', 'trinta e cinco']);
    // Inofensivas: números que um humano não confunde com o valor. Perigosas: o valor passa a ser
    // incerto (conta, estimativa, parcela); lá, null também é resposta certa.
    const inofensivas = [
      () => `${n()} ${esc(['sacos', 'metros', 'mm', 'dias', 'horas', 'm2', 'kg', 'latas', 'milímetros'])}`,
      () => `de ${n()} mm`, () => `dia ${1 + Math.floor(r() * 27)}`, () => `${1 + Math.floor(r() * 27)} de março`,
      () => `lote ${n()}`, () => `casa ${n()}`, () => `nota fiscal ${n()}`, () => `pedido ${n()}`,
      () => `às ${1 + Math.floor(r() * 23)}h`, () => `cep 88063000`, () => `número ${n()}`,
      () => `${palavra()} sacos`, () => `${n()}h`, () => `rua ${n()}`, () => `ano 2026`,
    ];
    const perigosas = [
      () => `${n()}%`, () => `${palavra()} por cento`, () => `uns ${n()}`, () => `mais de ${n()}`, () => `quase ${palavra()}`,
      () => `${n()} cada`, () => `em ${n()}x`, () => `em ${n()} vezes`, () => `${n()} parcelas`, () => `${palavra()} de entrada`,
      () => `${n()} de desconto`, () => `metade`, () => `desconto`, () => `${n()} e meio`, () => `${palavra()} e meia`,
    ];
    const distracoes = perigoso ? [...inofensivas, ...perigosas] : inofensivas;
    const enchimento = ['paguei', 'comprei', 'de cimento', 'de areia', 'no pix', 'ontem', 'hoje', 'no boleto', 'pro Ulisses', 'foi', 'então', 'tá', 'a pagar', 'no cartão', 'em dinheiro'];
    const pedacos = [valorFala];
    for (let i = r() * 3; i > 0; i--) pedacos.push(esc(distracoes)());
    for (let i = r() * 4; i > 0; i--) pedacos.push(esc(enchimento));
    for (let i = pedacos.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pedacos[i], pedacos[j]] = [pedacos[j], pedacos[i]]; }
    // Número colado no começo do valor ("ano 2026 mil e duzentos reais") ninguém sabe ler: não entra
    const NUM = '(\\d[\\d.,]*|um|uma|dois|duas|tres|três|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|cento|duzentos|trezentos|quatrocentos|quinhentos|seiscentos|setecentos|oitocentos|novecentos|mil|meio|meia|e)';
    const k = pedacos.indexOf(valorFala);
    if (k > 0 && new RegExp(`(^|\\s)${NUM}$`).test(pedacos[k - 1]) && new RegExp(`^${NUM}(\\s|$)`).test(valorFala)) continue;
    casos.push({ frase: pedacos.join(' '), esperado: { valor: reais * 100 + cent }, tipo: perigoso ? 'caos-perigoso' : 'caos' });
  }
  return casos;
}

// Rodada 12: duas frases numa, preço por unidade com "a", prazos mensais, receita (não é custo) e obras em conflito.
export const CASOS_ROD12: Caso[] = [
  { tipo: 'duas-frases', frase: 'paguei 300 de areia. depois paguei 200 de brita', esperado: { valor: null } },
  { tipo: 'centavos', frase: 'mil e quinhentos reais e vinte centavos', esperado: { valor: 1500_20 } },
  { tipo: 'centavos', frase: 'dois reais', esperado: { valor: 2_00 } },
  { tipo: 'centavos', frase: 'R$ 0,99', esperado: { valor: 99 } },
  { tipo: 'centavos', frase: '99 centavos', esperado: { valor: 99 } },
  { tipo: 'centavos', frase: 'R$ 1,00 de prego', esperado: { valor: 1_00 } },
  { tipo: 'zero', frase: 'R$ 0 de prego', esperado: { valor: null } },
  { tipo: 'zero', frase: 'zero reais de prego', esperado: { valor: null } },
  { tipo: 'zero', frase: 'paguei nada', esperado: { valor: null } },
  { tipo: 'mensal', frase: 'dez mil reais por mês', esperado: { valor: 10000_00 } },
  { tipo: 'mensal', frase: 'três mil por mês durante seis meses', esperado: { valor: null } },
  { tipo: 'mensal', frase: 'quatro mil e quinhentos reais em seis meses', esperado: { valor: 4500_00 } },
  { tipo: 'mensal', frase: 'aluguel 1.500 reais por mês', esperado: { valor: 1500_00 } },
  { tipo: 'unitario', frase: 'cimento 30 reais o saco, 20 sacos', esperado: { valor: null } },
  { tipo: 'unitario', frase: 'vinte sacos de cimento a trinta reais', esperado: { valor: null } },
  { tipo: 'unitario', frase: 'vinte sacos a trinta', esperado: { valor: null } },
  { tipo: 'unitario', frase: 'dois pedreiros a cem', esperado: { valor: null } },
  { tipo: 'quantidade', frase: 'vinte sacos por seiscentos reais', esperado: { valor: 600_00 } },
  { tipo: 'quantidade', frase: 'vinte sacos, seiscentos reais', esperado: { valor: 600_00 } },
  { tipo: 'quantidade', frase: 'vinte sacos ficou seiscentos', esperado: { valor: 600_00 } },
  { tipo: 'quantidade', frase: 'vinte sacos seiscentos', esperado: { valor: 600_00 } },
  { tipo: 'obra', frase: 'lote 39 e lote 12 areia 300 reais', esperado: { valor: 300_00, obraId: null } },
  { tipo: 'obra', frase: 'do Ulisses na casa 12 mil reais', esperado: { valor: null } },
  { tipo: 'pago', frase: 'boleto pago 400 de piso', esperado: { valor: 400_00, pago: true, pagamento: 'boleto' } },
  { tipo: 'pago', frase: 'boleto não pago 400 de piso', esperado: { valor: 400_00, pago: false, pagamento: 'boleto' } },
  { tipo: 'pago', frase: 'boleto a vencer 400 de piso', esperado: { valor: 400_00, pago: false, pagamento: 'boleto' } },
  { tipo: 'pago', frase: 'boleto vencido 400 de piso', esperado: { valor: 400_00, pago: false, pagamento: 'boleto' } },
  { tipo: 'pago', frase: 'conta de luz paga 230', esperado: { valor: 230_00, pago: true } },
  { tipo: 'receita', frase: 'recebi 300 do cliente', esperado: { valor: null } },
  { tipo: 'receita', frase: 'recebemos 5 mil de entrada do cliente', esperado: { valor: null } },
];

// Rodada 13: quantidade sem unidade conhecida, nome com número, telefone, fração e faixa de preço.
export const CASOS_ROD13: Caso[] = [
  { tipo: 'quantidade', frase: 'comprei 200 telhas', esperado: { valor: null } },
  { tipo: 'quantidade', frase: 'comprei dois mil tijolos', esperado: { valor: null } },
  { tipo: 'quantidade', frase: 'paguei 30 blocos hoje', esperado: { valor: null, data: HOJE } },
  { tipo: 'quantidade', frase: '3 viagens de caminhão', esperado: { valor: null } },
  { tipo: 'quantidade', frase: '3 viagens de caminhão por 900', esperado: { valor: 900_00 } },
  { tipo: 'quantidade', frase: 'cinco pedreiros e dois serventes', esperado: { valor: null } },
  { tipo: 'quantidade', frase: '200 telhas, R$ 300', esperado: { valor: 300_00 } },
  { tipo: 'quantidade', frase: 'telhas 200 reais', esperado: { valor: 200_00 } },
  { tipo: 'sem-quantidade', frase: '250 pedreiro', esperado: { valor: 250_00, categoria: MO } },
  { tipo: 'nome', frase: 'Madeireira Dois Irmãos', esperado: { valor: null } },
  { tipo: 'nome', frase: 'Madeireira Dois Irmãos 800 reais', esperado: { valor: 800_00 } },
  { tipo: 'nome', frase: 'paguei dez de frete', esperado: { valor: 10_00 } },
  { tipo: 'nome', frase: 'paguei dez reais de frete', esperado: { valor: 10_00 } },
  { tipo: 'nome', frase: 'paguei vinte e cinco de frete', esperado: { valor: 25_00 } },
  { tipo: 'telefone', frase: 'ligar (48) 99999-8888 e pagar 300 de areia', esperado: { valor: 300_00 } },
  { tipo: 'telefone', frase: 'ligar 999998888 pagar 300 de areia', esperado: { valor: 300_00 } },
  { tipo: 'telefone', frase: 'pagar 999998888', esperado: { valor: null } },
  { tipo: 'fracao', frase: 'tubo 3/4 de polegada 80 reais', esperado: { valor: 80_00, data: null } },
  { tipo: 'faixa', frase: 'R$ 360 a 400', esperado: { valor: null } },
  { tipo: 'faixa', frase: 'dois a três mil reais', esperado: { valor: null } },
  { tipo: 'faixa', frase: 'de 300 a 400 reais', esperado: { valor: null } },
];

// Rodada 14: dois pagamentos na mesma fala, variação ("aumentou", "mais caro"), medidas e "agora".
export const CASOS_ROD14: Caso[] = [
  { tipo: 'dois-valores', frase: 'paguei o Ulisses, 1.500, e o Adriano, 1.200', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'ulisses 1500 adriano 1200', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'total de 2.700 sendo 1.500 pro Ulisses', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'foi 300 de cimento e 200 de areia, total 500', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'paguei 1.000 de entrada e o restante 2.000 em 4 vezes', esperado: { valor: null } },
  { tipo: 'total', frase: 'dois mil e setecentos no total', esperado: { valor: 2700_00 } },
  { tipo: 'variacao', frase: 'o cimento aumentou 200 reais', esperado: { valor: null } },
  { tipo: 'variacao', frase: 'ficou 200 reais mais caro', esperado: { valor: null } },
  { tipo: 'variacao', frase: 'reajuste de 5 mil no pedreiro', esperado: { valor: null } },
  { tipo: 'variacao', frase: 'pagamos mais 200 de areia', esperado: { valor: null } },
  { tipo: 'medida', frase: '200 l de tinta por 450', esperado: { valor: 450_00 } },
  { tipo: 'medida', frase: '3 m de largura 900 reais de porta', esperado: { valor: 900_00 } },
  { tipo: 'medida', frase: 'R$ 2k de ferro', esperado: { valor: 2000_00 } },
  { tipo: 'hora', frase: 'pedreiro das 8 às 17 150 reais', esperado: { valor: null } },
  { tipo: 'hora', frase: 'pedreiro das 8 às 17, 150 reais', esperado: { valor: null } },
  { tipo: 'data', frase: 'paguei 300 de areia agora', esperado: { valor: 300_00, data: HOJE } },
  { tipo: 'data', frase: 'dia 01 paguei 300 de areia', esperado: { valor: 300_00, data: '2026-10-01' } },
  { tipo: 'data', frase: 'dia 31 de outubro 300 de areia', esperado: { valor: 300_00, data: null } },
  { tipo: 'data', frase: '28 de outubro 300 de areia', esperado: { valor: 300_00, data: HOJE } },
  { tipo: 'data', frase: 'em dois mil e vinte e seis paguei 300 de areia', esperado: { valor: null } },
  { tipo: 'pago', frase: 'vou pagar 300 de areia no pix', esperado: { valor: 300_00, pago: false, pagamento: 'pix' } },
  { tipo: 'obra', frase: 'Olindina e Laureano 300 de areia', esperado: { valor: 300_00, obraId: null } },
];

// Rodada 15: comandos (apagar/corrigir), dólar com símbolo, valor por dia sem "reais", repetição e autocorreção na fala.
export const CASOS_ROD15: Caso[] = [
  { tipo: 'comando', frase: 'apaga o de 300 reais', esperado: { valor: null } },
  { tipo: 'comando', frase: 'cancela o lançamento de 450 de areia', esperado: { valor: null } },
  { tipo: 'comando', frase: 'corrige para 700 reais', esperado: { valor: null } },
  { tipo: 'dolar', frase: 'US$ 300 de ferro', esperado: { valor: null } },
  { tipo: 'dolar', frase: 'usd 300 de ferro', esperado: { valor: null } },
  { tipo: 'dolar', frase: 'dólares 300 de ferro', esperado: { valor: null } },
  { tipo: 'unitario', frase: 'pedreiro 150 por dia', esperado: { valor: null } },
  { tipo: 'unitario', frase: 'servente 120 ao dia', esperado: { valor: null } },
  { tipo: 'unitario', frase: 'pedreiro uma diária de 150', esperado: { valor: 150_00, categoria: MO } },
  { tipo: 'unitario', frase: 'três diárias de pedreiro', esperado: { valor: null } },
  { tipo: 'centavos', frase: '3,5 mil reais e 50 centavos', esperado: { valor: 3500_50 } },
  { tipo: 'centavos', frase: 'R$ 360,50 centavos', esperado: { valor: null } },
  { tipo: 'centavos', frase: 'trezentos e sessenta e cinquenta centavos', esperado: { valor: null } },
  { tipo: 'repeticao', frase: 'paguei 300 300 de areia', esperado: { valor: 300_00 } },
  { tipo: 'repeticao', frase: 'paguei trezentos reais, trezentos reais de areia', esperado: { valor: 300_00 } },
  { tipo: 'autocorrecao', frase: 'paguei 300, não, 360 de areia', esperado: { valor: null } },
  { tipo: 'autocorrecao', frase: 'paguei trezentos, quer dizer, trezentos e sessenta', esperado: { valor: null } },
  { tipo: 'prefixo', frase: 'reais 300 de areia', esperado: { valor: 300_00 } },
  { tipo: 'prefixo', frase: 'valor em reais 300', esperado: { valor: 300_00 } },
  { tipo: 'terceiros', frase: 'paguei 300 pro Ulisses de 2 dias', esperado: { valor: 300_00 } },
  { tipo: 'terceiros', frase: 'MIL E QUINHENTOS PRO ULISSES', esperado: { valor: 1500_00, categoria: MO } },
  { tipo: 'pergunta', frase: 'quanto gastei no lote 39', esperado: { valor: null, obraId: 'l39' } },
];

// Rodada 16: variações das armadilhas já corrigidas (a regra vale só para a frase em que foi achada?).
export const CASOS_ROD16: Caso[] = [
  { tipo: 'calculo', frase: 'a metade de 600 reais', esperado: { valor: null } },
  { tipo: 'calculo', frase: 'o dobro de 300 reais', esperado: { valor: null } },
  { tipo: 'calculo', frase: 'um terço de 900 reais', esperado: { valor: null } },
  { tipo: 'estimativa', frase: 'tipo 300 reais de areia', esperado: { valor: null } },
  { tipo: 'estimativa', frase: 'trezentos reais por aí de areia', esperado: { valor: null } },
  { tipo: 'estimativa', frase: 'uns 300 e poucos reais de areia', esperado: { valor: null } },
  { tipo: 'estimativa', frase: 'aproximadamente 300 reais de areia', esperado: { valor: null } },
  { tipo: 'unitario', frase: '300 reais a unidade de torneira', esperado: { valor: null } },
  { tipo: 'unitario', frase: '40 reais por metro de cano', esperado: { valor: null } },
  { tipo: 'unitario', frase: '12 reais o quilo de prego', esperado: { valor: null } },
  { tipo: 'unitario', frase: '150 reais por pessoa', esperado: { valor: null } },
  { tipo: 'unitario', frase: '80 reais por hora de máquina', esperado: { valor: null } },
  { tipo: 'quantidade', frase: '3 baldes de tinta por 540', esperado: { valor: 540_00 } },
  { tipo: 'quantidade', frase: '4 cargas de areia por 1.200', esperado: { valor: 1200_00 } },
  { tipo: 'quantidade', frase: '2 pacotes de prego 90 reais', esperado: { valor: 90_00 } },
  { tipo: 'quantidade', frase: '50 m² de piso por 2.500', esperado: { valor: 2500_00 } },
  { tipo: 'quantidade', frase: '10 m³ de areia por 800', esperado: { valor: 800_00 } },
  { tipo: 'documento', frase: 'nº 1234 cimento 500 reais', esperado: { valor: 500_00 } },
  { tipo: 'documento', frase: 'código 889 prego 20 reais', esperado: { valor: 20_00 } },
  { tipo: 'documento', frase: 'NFe 5521 areia 300', esperado: { valor: 300_00 } },
  { tipo: 'data', frase: 'próxima semana pagar 300 de areia', esperado: { valor: 300_00, data: null, pago: false } },
  { tipo: 'data', frase: 'última sexta 300 de areia', esperado: { valor: 300_00, data: '2026-10-23' } },
  { tipo: 'pago', frase: 'deixei pendurado 300 de areia', esperado: { valor: 300_00, pago: false } },
  { tipo: 'pagamento', frase: 'paguei 300 de areia no crédito parcelado', esperado: { valor: 300_00, pagamento: 'cartao', pago: null } },
];

// Rodada 17: mais variações (mesmas classes de erro, outras palavras).
export const CASOS_ROD17: Caso[] = [
  { tipo: 'dois-valores', frase: 'paguei a Cassol 800 e a madeireira 650', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'cimento: 800; areia: 650; brita: 300', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'R$ 800 de cimento mais R$ 650 de areia', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'R$ 800 de cimento e R$ 650 de areia', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'oitocentos reais de cimento, seiscentos e cinquenta de areia', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'foi 800 no cimento e 650 na areia', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'dois lançamentos: 800 de cimento e 650 de areia', esperado: { valor: null } },
  { tipo: 'dois-valores', frase: 'paguei 800 reais de cimento ontem e 650 reais de areia hoje', esperado: { valor: null } },
  { tipo: 'unitario', frase: 'a diária do pedreiro é 250 reais', esperado: { valor: 250_00, categoria: MO } },
  { tipo: 'unitario', frase: 'pedreiro 250 reais cada dia', esperado: { valor: null } },
  { tipo: 'unitario', frase: 'o saco de cimento custou 38 reais, comprei 40', esperado: { valor: null } },
  { tipo: 'unitario', frase: 'a 38 reais cada, 40 sacos de cimento', esperado: { valor: null } },
  { tipo: 'unitario', frase: 'trinta e oito reais a unidade', esperado: { valor: null } },
  { tipo: 'estimativa', frase: 'em torno de 900 reais de piso', esperado: { valor: null } },
  { tipo: 'estimativa', frase: 'na casa dos 900 reais de piso', esperado: { valor: null } },
  { tipo: 'estimativa', frase: 'acima de 900 reais de piso', esperado: { valor: null } },
  { tipo: 'estimativa', frase: 'menos de 900 reais de piso', esperado: { valor: null } },
  { tipo: 'estimativa', frase: 'até 900 reais de piso', esperado: { valor: null } },
  { tipo: 'nao-custo', frase: 'cliente pagou 5 mil de entrada', esperado: { valor: null } },
  { tipo: 'nao-custo', frase: 'recebi o sinal de 5 mil', esperado: { valor: null } },
  { tipo: 'nao-custo', frase: 'estornaram 300 reais', esperado: { valor: null } },
  { tipo: 'nao-custo', frase: 'cotei o piso em 4.500', esperado: { valor: null } },
  { tipo: 'nao-custo', frase: 'orçamento do piso 4.500 reais', esperado: { valor: 4500_00 } },
  { tipo: 'formato', frase: '4.500,000 de piso', esperado: { valor: null } },
  { tipo: 'formato', frase: '4,5.00 de piso', esperado: { valor: null } },
  { tipo: 'formato', frase: '45000000000 de piso', esperado: { valor: null } },
  { tipo: 'formato', frase: 'R$ 4 500 de piso', esperado: { valor: null } },
  { tipo: 'formato', frase: '4500 R$ de piso', esperado: { valor: 4500_00 } },
  { tipo: 'formato', frase: '4.500 reais e 50', esperado: { valor: null } },
  { tipo: 'comando', frase: 'exclui o último de 4.500', esperado: { valor: null } },
  { tipo: 'comando', frase: 'desfaz o lançamento de piso de 4.500 reais', esperado: { valor: null } },
  { tipo: 'quantidade', frase: '40 sacos de cimento', esperado: { valor: null } },
  { tipo: 'quantidade', frase: 'quarenta sacas de cimento', esperado: { valor: null } },
  { tipo: 'quantidade', frase: '12 caixas de piso', esperado: { valor: null } },
  { tipo: 'quantidade', frase: '12 caixas de piso por 4.500', esperado: { valor: 4500_00 } },
  { tipo: 'quantidade', frase: 'dez pessoas no almoço 350 reais', esperado: { valor: 350_00 } },
  { tipo: 'quantidade', frase: 'dois caminhões de areia 900', esperado: { valor: 900_00 } },
  { tipo: 'quantidade', frase: 'dois caminhões de areia', esperado: { valor: null } },
];

// Duplos: duas despesas na mesma fala ("360 de cimento e 200 de areia"). Qualquer valor devolvido é erro:
// o certo é null e a pessoa lança um de cada vez.
export function gerarDuplos(semente: number, quantidade: number): Caso[] {
  const r = aleatorio(semente * 15485863 + 11);
  const esc = <T,>(l: T[]): T => l[Math.floor(r() * l.length)];
  const casos: Caso[] = [];
  const forma = (reais: number) => esc([
    String(reais), milhar(reais), `${milhar(reais)} reais`, `R$ ${milhar(reais)}`, `R$ ${milhar(reais)},00`,
    porExtenso(reais), `${porExtenso(reais)} reais`,
  ]);
  while (casos.length < quantidade) {
    const [a, b] = [esc([35, 90, 120, 250, 360, 780, 1200, 2500, 4800, 12000]), esc([40, 100, 150, 300, 450, 900, 1500, 3000, 6500])];
    if (a === b) continue;
    const item = () => esc(['cimento', 'areia', 'brita', 'frete', 'tinta', 'prego', 'telha', 'eletricista']);
    const ligacao = esc([' e ', ', ', ' mais ', ' e depois ', ' e também ', ' além disso ', '. ', '; ']);
    const parte = (v: number) => esc([`${forma(v)} de ${item()}`, `${item()} ${forma(v)}`, `${forma(v)} pro ${esc(['Ulisses', 'Adriano'])}`]);
    const verbo = esc(['', 'paguei ', 'comprei ', 'foi ']);
    const [pa, pb] = [parte(a), parte(b)];
    // "mil e duzentos" + " e " + "quarenta reais" vira "mil e duzentos e quarenta reais": ninguém separa, nem uma pessoa
    const NUM = /(^|\s)(\d[\d.,]*|um|uma|dois|duas|tres|três|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|cento|duzentos|trezentos|quatrocentos|quinhentos|seiscentos|setecentos|oitocentos|novecentos|mil|e)$/;
    const comecaNum = /^(\d|um |uma |dois |duas |tr[eê]s |quatro |cinco |seis |sete |oito |nove |dez |onze |doze |treze |quatorze |quinze |dezesseis |dezessete |dezoito |dezenove |vinte |trinta |quarenta |cinquenta |sessenta |setenta |oitenta |noventa |cem |cento |duzentos |trezentos |quatrocentos |quinhentos |seiscentos |setecentos |oitocentos |novecentos |mil )/;
    if ((ligacao === ' e ' || ligacao === ', ') && NUM.test(pa) && comecaNum.test(pb)) continue;
    casos.push({ frase: verbo + pa + ligacao + pb, esperado: { valor: null }, tipo: 'duplo' });
  }
  return casos;
}

// Famílias: frases em que o valor falado NÃO é o do lançamento (preço por unidade, estimativa, receita,
// comando, dúvida de quem fala). O certo é null; qualquer número devolvido é erro.
export function gerarFamilias(semente: number, quantidade: number): Caso[] {
  const r = aleatorio(semente * 32452843 + 5);
  const esc = <T,>(l: T[]): T => l[Math.floor(r() * l.length)];
  const casos: Caso[] = [];
  const valor = () => {
    const v = esc([35, 90, 120, 250, 360, 780, 1200, 2500, 4800, 12000]);
    return esc([`R$ ${milhar(v)}`, `${milhar(v)} reais`, `${porExtenso(v)} reais`, `${v}`, porExtenso(v)]);
  };
  const item = () => esc(['cimento', 'areia', 'brita', 'frete', 'tinta', 'prego', 'telha', 'eletricista', 'piso']);
  const unidade = () => esc(['saco', 'metro', 'quilo', 'litro', 'lata', 'rolo', 'peça', 'caixa', 'unidade', 'dia', 'hora', 'm2', 'saca', 'milheiro', 'pessoa', 'folha', 'chapa', 'vara', 'par', 'dúzia', 'tonelada', 'barra', 'ponto', 'viagem', 'cômodo', 'degrau', 'janela', 'porta', 'tijolo', 'bloco', 'galão', 'balde']);
  const familias: (() => string)[] = [
    () => `${valor()} ${esc(['cada', 'cada um', 'cada ' + unidade()])} de ${item()}`,
    () => `${item()} ${valor()} ${esc(['por', 'a', 'o', 'ao'])} ${unidade()}`,
    () => `${valor()} ${esc(['por', 'a', 'o', 'ao'])} ${unidade()} de ${item()}`,
    () => `${esc(['uns', 'cerca de', 'quase', 'mais ou menos', 'aproximadamente', 'em torno de', 'por volta de', 'na faixa de', 'em média', 'até', 'mais de', 'menos de', 'acima de', 'abaixo de', 'no máximo', 'no mínimo', 'a partir de', 'na casa dos'])} ${valor()} de ${item()}`,
    () => `${esc(['acho que foi', 'talvez', 'creio que foi', 'se não me engano foi', 'não lembro, foi', 'provavelmente', 'chutando foi', 'sei lá, foi', 'imagino que foi', 'suponho que foi', 'deve ter sido', 'parece que foi', 'aposto que foi', 'aparentemente foi', 'penso que foi', 'recordo que foi', 'estimo que foi', 'calculo que foi', 'por alto foi', 'a olho foi'])} ${valor()} de ${item()}`,
    () => `${esc(['estorno de', 'reembolso de', 'devolveram', 'o cliente pagou', 'recebi', 'recebemos', 'vendi por', 'vendemos por', 'empréstimo de', 'ressarcimento de', 'lucro de', 'faturamento de', 'receita de', 'vou comprar', 'preciso comprar', 'vou precisar de', 'comprarei', 'iremos gastar', 'pagaram', 'depositaram', 'transferiram', 'recebimento de', 'repasse de', 'quanto custa', 'qual foi', 'não foi', 'não era', 'tenho que comprar', 'queria gastar', 'custa', 'o orçamento seria', 'quanto foi o de'])} ${valor()} de ${item()}`,
    () => `${esc(['apaga', 'exclui', 'remove', 'cancela', 'desfaz', 'corrige', 'altera', 'muda', 'edita', 'atualiza', 'troca', 'substitui', 'apague', 'corrija', 'cancele', 'esquece', 'ignora', 'anula', 'retira', 'tira', 'edite', 'troque'])} ${esc(['o de', 'o lançamento de', 'aquele de', 'o último de'])} ${valor()}`,
    () => `${esc(['metade de', 'o dobro de', 'um terço de', 'desconto de', 'troco de', 'sobrou', 'restou', 'diferença de', 'aumento de', 'reajuste de'])} ${valor()} de ${item()}`,
    () => `${esc([String(esc([120, 360, 4800])), porExtenso(esc([120, 360, 4800]))])} ${esc(['dólares', 'euros', 'dólar'])} de ${item()}`,
  ];
  while (casos.length < quantidade) {
    const frase = esc(familias)();
    casos.push({ frase: esc(['', 'paguei ', 'foi ', 'hoje ']) + frase, esperado: { valor: null }, tipo: 'familia' });
  }
  return casos;
}

// Rodada 20: intenção (ainda não é custo), pergunta, negação, aproximação coloquial e quinzena.
export const CASOS_ROD20: Caso[] = [
  { tipo: 'intencao', frase: 'vou comprar 300 de cimento', esperado: { valor: null } },
  { tipo: 'intencao', frase: 'preciso comprar 300 de cimento', esperado: { valor: null } },
  { tipo: 'intencao', frase: 'pretendo gastar 3 mil de tinta', esperado: { valor: null } },
  { tipo: 'intencao', frase: 'tenho que comprar 300 de cimento', esperado: { valor: null } },
  { tipo: 'intencao', frase: 'queria orçar 300 de cimento', esperado: { valor: null } },
  { tipo: 'pergunta', frase: 'quanto custa 300 de cimento', esperado: { valor: null } },
  { tipo: 'pergunta', frase: 'qual foi o de 300 reais', esperado: { valor: null } },
  { tipo: 'negacao', frase: 'não foi 300 de cimento', esperado: { valor: null } },
  { tipo: 'negacao', frase: 'não era 300 reais', esperado: { valor: null } },
  { tipo: 'negacao', frase: 'não paguei 300 de cimento', esperado: { valor: 300_00, pago: false } },
  { tipo: 'coloquial', frase: 'cento e poucos reais de cimento', esperado: { valor: null } },
  { tipo: 'coloquial', frase: 'vinte e poucos reais de cimento', esperado: { valor: null } },
  { tipo: 'coloquial', frase: 'quase mil reais de cimento', esperado: { valor: null } },
  { tipo: 'coloquial', frase: 'uns mil reais de cimento', esperado: { valor: null } },
  { tipo: 'coloquial', frase: 'dois milhares de cimento', esperado: { valor: null } },
  { tipo: 'coloquial', frase: 'meia dúzia de torneiras 300', esperado: { valor: null } },
  { tipo: 'coloquial', frase: 'duas dúzias de tijolo 300', esperado: { valor: 300_00 } },
  { tipo: 'medida', frase: 'R$ 90/m² de piso', esperado: { valor: null } },
  { tipo: 'medida', frase: 'piso a R$ 90 o metro quadrado', esperado: { valor: null } },
  { tipo: 'data', frase: 'segunda quinzena 300 de areia', esperado: { valor: 300_00, data: null } },
  { tipo: 'data', frase: 'mês que vem pagar 300 de areia', esperado: { valor: 300_00, data: null, pago: false } },
  { tipo: 'data', frase: 'sábado e domingo 300 de areia', esperado: { valor: 300_00, data: null } },
];

// Rodada 23: fala corriqueira de dono de obra, sem armadilha (a taxa de acerto aqui é o que importa no dia a dia).
export const CASOS_ROD23: Caso[] = [
  { tipo: 'corriqueira', frase: 'paguei 1.850 reais de ferro na Cassol hoje no pix', esperado: { valor: 1850_00, data: HOJE, pagamento: 'pix', pago: true, categoria: MAT } },
  { tipo: 'corriqueira', frase: 'comprei 15 sacos de cimento por 640 reais', esperado: { valor: 640_00, categoria: MAT } },
  { tipo: 'corriqueira', frase: 'mandei 2 mil e 500 pro Adriano ontem', esperado: { valor: 2500_00, data: '2026-10-27', categoria: MO, fornecedor: 'Adriano' } },
  { tipo: 'corriqueira', frase: 'o Ulisses recebeu mil e duzentos reais na sexta', esperado: { valor: 1200_00, data: '2026-10-23', categoria: MO } },
  { tipo: 'corriqueira', frase: 'gastei 380 de tinta na casa 12', esperado: { valor: 380_00, obraId: 'l12', categoria: MAT } },
  { tipo: 'corriqueira', frase: 'frete de 250 reais da areia no lote 39', esperado: { valor: 250_00, obraId: 'l39' } },
  { tipo: 'corriqueira', frase: 'paguei o eletricista, 900 reais, no dinheiro', esperado: { valor: 900_00, categoria: SERV, pagamento: 'dinheiro', pago: true } },
  { tipo: 'corriqueira', frase: 'boleto de 4.200 do piso, vence dia 10 de novembro', esperado: { valor: 4200_00, pagamento: 'boleto', pago: false, data: null } },
  { tipo: 'corriqueira', frase: 'aluguel da betoneira 180 reais por semana', esperado: { valor: null } },
  { tipo: 'corriqueira', frase: 'aluguel do andaime 1.100 reais', esperado: { valor: 1100_00, categoria: 'Locação e consumo' } },
  { tipo: 'corriqueira', frase: 'conta de luz da obra 312,40', esperado: { valor: 312_40, categoria: 'Locação e consumo' } },
  { tipo: 'corriqueira', frase: 'conta de água 87 reais e 50 centavos', esperado: { valor: 87_50, categoria: 'Locação e consumo' } },
  { tipo: 'corriqueira', frase: 'ISS de 1.350 pago no boleto', esperado: { valor: 1350_00, categoria: 'Impostos e taxas', pagamento: 'boleto', pago: true } },
  { tipo: 'corriqueira', frase: 'taxa da prefeitura 460 reais', esperado: { valor: 460_00, categoria: 'Impostos e taxas' } },
  { tipo: 'corriqueira', frase: 'RRT do projeto 120 reais', esperado: { valor: 120_00 } },
  { tipo: 'corriqueira', frase: 'cartório 2 mil e 300 na Olindina', esperado: { valor: 2300_00, obraId: 'oli', categoria: 'Projetos e documentação' } },
  { tipo: 'corriqueira', frase: 'comprei porta e janela por 3.800 no cartão', esperado: { valor: 3800_00, pagamento: 'cartao', categoria: MAT } },
  { tipo: 'corriqueira', frase: 'pedreiro 6 mil e 400 no Laureano dia 15', esperado: { valor: 6400_00, obraId: 'lau', categoria: MO } },
  { tipo: 'corriqueira', frase: 'Laureano: 780 reais de brita e frete', esperado: { valor: 780_00, obraId: 'lau' } },
  { tipo: 'corriqueira', frase: 'dois mil de armador na Ecovilas, a pagar', esperado: { valor: 2000_00, obraId: 'eco', pago: false } },
  { tipo: 'corriqueira', frase: 'sessenta reais de gasolina da máquina', esperado: { valor: 60_00 } },
  { tipo: 'corriqueira', frase: 'seiscentos reais de eletricista ontem no pix', esperado: { valor: 600_00, data: '2026-10-27', pagamento: 'pix', categoria: SERV } },
  { tipo: 'corriqueira', frase: 'R$ 45.000 de laje no lote 39 em 3 vezes no boleto', esperado: { valor: 45000_00, obraId: 'l39', pagamento: 'boleto', pago: false } },
  { tipo: 'corriqueira', frase: 'dezoito mil de terraplenagem na Ecovilas', esperado: { valor: 18000_00, obraId: 'eco', categoria: SERV } },
  { tipo: 'corriqueira', frase: 'comprei material elétrico 940', esperado: { valor: 940_00 } },
  { tipo: 'corriqueira', frase: 'pintor 1.800 reais terça passada', esperado: { valor: 1800_00, data: '2026-10-27', categoria: MO } },
  { tipo: 'corriqueira', frase: 'paguei a diária do servente 150', esperado: { valor: 150_00, categoria: MO, pago: true } },
  { tipo: 'corriqueira', frase: '3 diárias do servente 450', esperado: { valor: 450_00 } },
  { tipo: 'corriqueira', frase: 'cimento 22 sacos 880 reais', esperado: { valor: 880_00 } },
  { tipo: 'corriqueira', frase: 'seguro da obra 1.250 hoje', esperado: { valor: 1250_00, data: HOJE } },
  { tipo: 'corriqueira', frase: 'fiz um pix de 3 mil pro Ulisses', esperado: { valor: 3000_00, pagamento: 'pix', categoria: MO } },
  { tipo: 'corriqueira', frase: 'transferência de 7.500 pra madeireira', esperado: { valor: 7500_00, pagamento: 'transferencia' } },
];

// Rodada 24: mais fala corriqueira, agora com ruído de ditado (maiúsculas, vírgulas, "né", "tá").
export const CASOS_ROD24: Caso[] = [
  { tipo: 'ditado', frase: 'Então, tá, paguei 2.340 reais de telha, né, na Olindina.', esperado: { valor: 2340_00, obraId: 'oli', pago: true, categoria: MAT } },
  { tipo: 'ditado', frase: 'Hum, o Adriano, 1.900 reais, ontem, no pix.', esperado: { valor: 1900_00, data: '2026-10-27', pagamento: 'pix', categoria: MO } },
  { tipo: 'ditado', frase: 'Lançar 560 reais de areia no lote 39, por favor.', esperado: { valor: 560_00, obraId: 'l39' } },
  { tipo: 'ditado', frase: 'Eu paguei, é, mil e oitocentos pro Ulisses.', esperado: { valor: 1800_00, categoria: MO, pago: true } },
  { tipo: 'ditado', frase: 'foi 75 reais de prego e parafuso, tá?', esperado: { valor: 75_00, categoria: MAT } },
  { tipo: 'ditado', frase: 'Cimento, 30 sacos, 1.140 reais, boleto.', esperado: { valor: 1140_00, pagamento: 'boleto' } },
  { tipo: 'ditado', frase: 'Material hidráulico: 620 reais.', esperado: { valor: 620_00 } },
  { tipo: 'ditado', frase: 'Pedreiro - 5.200 reais - Laureano', esperado: { valor: 5200_00, obraId: 'lau', categoria: MO } },
  { tipo: 'ditado', frase: 'ITBI da Ecovilas, 18 mil reais, transferência', esperado: { valor: 18000_00, obraId: 'eco', pagamento: 'transferencia', categoria: 'Impostos e taxas' } },
  { tipo: 'ditado', frase: 'Paguei hoje, 14 de outubro? Não, hoje mesmo, 90 reais de cola.', esperado: { valor: 90_00 } },
  { tipo: 'ditado', frase: 'dia 14 de outubro paguei 90 reais de cola', esperado: { valor: 90_00, data: '2026-10-14' } },
  { tipo: 'ditado', frase: '14/10 cola 90', esperado: { valor: 90_00, data: '2026-10-14' } },
  { tipo: 'ditado', frase: 'ontem foram 130 reais de lixa e pincel', esperado: { valor: 130_00, data: '2026-10-27' } },
  { tipo: 'ditado', frase: 'Betoneira, aluguel de 650 reais, a pagar', esperado: { valor: 650_00, pago: false, categoria: 'Locação e consumo' } },
  { tipo: 'ditado', frase: 'Caçamba 380 reais, paga no dinheiro', esperado: { valor: 380_00, pago: true, pagamento: 'dinheiro', categoria: 'Locação e consumo' } },
  { tipo: 'ditado', frase: 'Projeto elétrico, 3.500 reais, em 2 vezes', esperado: { valor: 3500_00, pago: false } },
  { tipo: 'ditado', frase: 'Tijolos e blocos 4.100 reais', esperado: { valor: 4100_00, categoria: MAT } },
  { tipo: 'ditado', frase: 'Quinhentos e vinte reais de gesso', esperado: { valor: 520_00 } },
  { tipo: 'ditado', frase: 'Seis mil e trezentos de armador', esperado: { valor: 6300_00 } },
  { tipo: 'ditado', frase: 'Setenta e cinco mil reais de empreitada do telhado', esperado: { valor: 75000_00 } },
  { tipo: 'ditado', frase: 'um mil e quinhentos de mão de obra', esperado: { valor: 1500_00, categoria: MO } },
  { tipo: 'ditado', frase: '1,5 mil de mão de obra', esperado: { valor: 1500_00, categoria: MO } },
  { tipo: 'ditado', frase: 'R$ 1,5 mil de mão de obra', esperado: { valor: 1500_00, categoria: MO } },
  { tipo: 'ditado', frase: 'R$2.800,00 de pedreiro, pix', esperado: { valor: 2800_00, pagamento: 'pix', categoria: MO } },
  { tipo: 'ditado', frase: 'Tá, anota aí: 430 reais de frete na Olindina', esperado: { valor: 430_00, obraId: 'oli', categoria: SERV } },
  { tipo: 'ditado', frase: 'Tinta: dois baldes, 420 reais', esperado: { valor: 420_00 } },
  { tipo: 'ditado', frase: 'Dois baldes de tinta por 420 reais', esperado: { valor: 420_00 } },
  { tipo: 'ditado', frase: 'foi 1.000 em dinheiro pro Adrian', esperado: { valor: 1000_00, pagamento: 'dinheiro', categoria: MO } },
  { tipo: 'ditado', frase: 'Boleto da Cassol de 2.780 reais a pagar dia 20', esperado: { valor: 2780_00, pagamento: 'boleto', pago: false, data: null } },
  { tipo: 'ditado', frase: 'compra de cimento 25 sacos valor total 1.000', esperado: { valor: 1000_00, categoria: MAT } },
];

// Rodada 25: terceira leva de fala corriqueira (frases novas, nenhuma usada para ajustar o interpretador).
export const CASOS_ROD25: Caso[] = [
  { tipo: 'corriqueira', frase: 'paguei 3.200 reais de vergalhão na Ecovilas hoje no boleto', esperado: { valor: 3200_00, obraId: 'eco', data: HOJE, pagamento: 'boleto', categoria: MAT } },
  { tipo: 'corriqueira', frase: 'comprei 8 latas de tinta por 960 reais no cartão', esperado: { valor: 960_00, pagamento: 'cartao', categoria: MAT } },
  { tipo: 'corriqueira', frase: 'transferi 4 mil e 200 pro Ulisses na casa 12', esperado: { valor: 4200_00, obraId: 'l12', categoria: MO, pagamento: 'transferencia' } },
  { tipo: 'corriqueira', frase: 'o encanador cobrou 850 reais, paguei na quarta', esperado: { valor: 850_00, data: '2026-10-21', categoria: SERV, pago: true } },
  { tipo: 'corriqueira', frase: 'sessenta e oito reais de lâmpada', esperado: { valor: 68_00 } },
  { tipo: 'corriqueira', frase: 'cano de esgoto 245 reais', esperado: { valor: 245_00, categoria: MAT } },
  { tipo: 'corriqueira', frase: 'mão de obra do Adriano, 3.600, a pagar', esperado: { valor: 3600_00, categoria: MO, pago: false } },
  { tipo: 'corriqueira', frase: 'caminhão de brita 1.300 reais no Laureano', esperado: { valor: 1300_00, obraId: 'lau' } },
  { tipo: 'corriqueira', frase: 'escavadeira 2.800 reais ontem', esperado: { valor: 2800_00, data: '2026-10-27', categoria: SERV } },
  { tipo: 'corriqueira', frase: 'topografia 1.750 reais Olindina', esperado: { valor: 1750_00, obraId: 'oli', categoria: SERV } },
  { tipo: 'corriqueira', frase: 'alvará 920 reais no boleto', esperado: { valor: 920_00, pagamento: 'boleto', categoria: 'Impostos e taxas' } },
  { tipo: 'corriqueira', frase: 'certidão 150 reais', esperado: { valor: 150_00, categoria: 'Projetos e documentação' } },
  { tipo: 'corriqueira', frase: 'diesel da máquina 640 reais', esperado: { valor: 640_00 } },
  { tipo: 'corriqueira', frase: 'paguei dez mil e quinhentos de laje', esperado: { valor: 10500_00, pago: true } },
  { tipo: 'corriqueira', frase: 'paguei cento e oitenta e cinco de cabo', esperado: { valor: 185_00, categoria: MAT } },
  { tipo: 'corriqueira', frase: 'duzentos e dez reais de tomada', esperado: { valor: 210_00 } },
  { tipo: 'corriqueira', frase: 'paguei 15 de parafuso e 12 de bucha', esperado: { valor: null } },
  { tipo: 'corriqueira', frase: 'vinte e seis mil reais da laje do Laureano', esperado: { valor: 26000_00, obraId: 'lau' } },
  { tipo: 'corriqueira', frase: 'gastei 1,2 mil de areia no lote 39', esperado: { valor: 1200_00, obraId: 'l39' } },
  { tipo: 'corriqueira', frase: 'R$ 399,90 de torneira', esperado: { valor: 399_90, categoria: MAT } },
  { tipo: 'corriqueira', frase: 'cento e noventa e nove reais e noventa centavos de torneira', esperado: { valor: 199_90, categoria: MAT } },
  { tipo: 'corriqueira', frase: 'foi 2.650 de reboco ontem', esperado: { valor: 2650_00, data: '2026-10-27', categoria: MAT } },
  { tipo: 'corriqueira', frase: 'madeira 3.400 reais, a pagar na entrega', esperado: { valor: 3400_00, pago: false, categoria: MAT } },
  { tipo: 'corriqueira', frase: 'empreiteiro 9 mil dia 5 de outubro', esperado: { valor: 9000_00, data: '2026-10-05', categoria: MO } },
  { tipo: 'corriqueira', frase: 'segunda parcela da laje 5 mil reais', esperado: { valor: 5000_00 } },
  { tipo: 'corriqueira', frase: 'sinal de 2 mil e 500 pro pedreiro', esperado: { valor: 2500_00, categoria: MO } },
  { tipo: 'corriqueira', frase: 'peguei material a prazo, 1.480 reais', esperado: { valor: 1480_00, pago: false } },
  { tipo: 'corriqueira', frase: 'R$ 640 de ferro CA-50 no pix', esperado: { valor: 640_00, pagamento: 'pix' } },
  { tipo: 'corriqueira', frase: 'brita 2 cinquenta reais', esperado: { valor: 50_00 } },
  { tipo: 'corriqueira', frase: 'pix 200 pra Cassol', esperado: { valor: 200_00, pagamento: 'pix' } },
];

// ---- gerador de frases ----

export function aleatorio(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const UN = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze',
  'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CEN = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function ate999(n: number): string {
  if (n === 100) return 'cem';
  const partes: string[] = [];
  if (n >= 100) partes.push(CEN[Math.floor(n / 100)]);
  const r = n % 100;
  if (r > 0) partes.push(r < 20 ? UN[r] : DEZ[Math.floor(r / 10)] + (r % 10 ? ' e ' + UN[r % 10] : ''));
  return partes.join(' e ');
}

// 1200 -> "mil e duzentos"; 1320 -> "mil trezentos e vinte" (como o iPhone costuma escrever).
export function porExtenso(n: number): string {
  if (n === 0) return 'zero';
  const milhoes = Math.floor(n / 1_000_000);
  const mil = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (milhoes) partes.push(milhoes === 1 ? 'um milhão' : ate999(milhoes) + ' milhões');
  if (mil) partes.push(mil === 1 ? 'mil' : ate999(mil) + ' mil');
  if (resto) partes.push(ate999(resto));
  let texto = partes[0];
  for (let i = 1; i < partes.length; i++) {
    const ultima = i === partes.length - 1;
    const simples = i === partes.length - 1 && (resto < 100 || resto % 100 === 0);
    texto += (ultima && simples ? ' e ' : ' ') + partes[i];
  }
  return texto;
}

export const milhar = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const centavosTexto = (n: number) => String(n).padStart(2, '0');

const ITENS: [string, Categoria][] = [
  ['cimento', MAT], ['areia', MAT], ['tijolo', MAT], ['telha', MAT], ['tinta', MAT], ['prego', MAT], ['brita', MAT],
  ['pedreiro', MO], ['servente', MO], ['eletricista', SERV], ['frete', SERV], ['encanador', SERV],
  ['ITBI', 'Impostos e taxas'], ['aluguel de andaime', 'Locação e consumo'],
];
const OBRAS: [string[], string][] = [
  [['no lote 39', 'na obra do lote 39', 'lote 39'], 'l39'],
  [['na casa 12', 'casa 12'], 'l12'],
  [['na Ecovilas', 'no terreno Ecovillas', 'na eco vilas'], 'eco'],
  [['na Olindina', 'na obra da Olindina'], 'oli'],
  [['no Laureano', 'no projeto Laureano'], 'lau'],
];
const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro'];

const doisDig = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${doisDig(d.getMonth() + 1)}-${doisDig(d.getDate())}`;

// Gera `quantidade` frases com gabarito. `nivel` 1 = simples ... 4 = difíceis. Mesma semente, mesmas frases.
export function gerarCasos(semente: number, quantidade: number, nivel: number): Caso[] {
  const r = aleatorio(semente * 7919 + nivel);
  const esc = <T,>(l: T[]): T => l[Math.floor(r() * l.length)];
  const casos: Caso[] = [];
  const hoje = new Date(2026, 9, 28);
  const OBRAS_N = nivel >= 5 ? [...OBRAS, [['no lote trinta e nove', 'na casa doze'], 'x'] as [string[], string]] : OBRAS;

  while (casos.length < quantidade) {
    // valor
    const tipoValor = esc(nivel === 1
      ? ['num', 'num', 'reais', 'rs', 'extenso']
      : nivel === 2
        ? ['num', 'reais', 'rs', 'extenso', 'extenso', 'centavos', 'milvirg', 'conto', 'mil']
        : nivel <= 4
          ? ['num', 'extenso', 'centavos', 'milvirg', 'conto', 'mil', 'colado', 'milhar3', 'ext-centavos', 'meio', 'virg-cent']
          : ['num', 'extenso', 'centavos', 'milvirg', 'mil', 'milhar3', 'ext-centavos', 'meio', 'k', 'dmil', 'rs00', 'rs-pos',
            'qtd-preco', 'aprox', 'duvida-meio', 'dois-valores', 'reais-cada']);
    let reais = esc([35, 90, 120, 250, 360, 450, 780, 850, 1200, 1500, 2300, 4800, 12000, 25000, 65000]);
    let cent = 0;
    let fala: string;
    let tipo = 'valor-' + tipoValor;
    switch (tipoValor) {
      case 'num': fala = esc([String(reais), milhar(reais)]); break;
      case 'reais': fala = `${esc([String(reais), milhar(reais)])} reais`; break;
      case 'rs': fala = `R$ ${milhar(reais)}`; break;
      case 'colado': fala = `R$${reais}`; break;
      case 'extenso': fala = porExtenso(reais) + esc(['', '', ' reais']); break;
      case 'centavos': cent = esc([10, 25, 50, 75, 90]); fala = `${milhar(reais)},${centavosTexto(cent)}`; break;
      case 'virg-cent': cent = esc([50, 99]); fala = `R$ ${milhar(reais)},${centavosTexto(cent)}`; break;
      case 'ext-centavos': cent = esc([10, 25, 50, 75, 90]); fala = `${porExtenso(reais)} reais e ${porExtenso(cent)} centavos`; break;
      case 'milhar3': reais = esc([1200, 1500, 2300, 4800]); fala = `${Math.floor(reais / 1000)},${String(reais % 1000).padStart(3, '0')}`; break;
      case 'milvirg': reais = esc([1500, 2500, 3500, 4500, 12500]); fala = `${reais / 1000 % 1 ? String(reais / 1000).replace('.', ',') : reais / 1000} mil`; break;
      case 'conto': reais = esc([120, 300, 450, 800]); fala = `${esc([String(reais), porExtenso(reais)])} contos`; break;
      case 'mil': reais = esc([1000, 2000, 5000, 30000]); fala = `${reais === 1000 ? 'mil' : porExtenso(reais)} reais`; break;
      case 'meio': { // "dois mil e meio", "meio milhão"
        const k = esc([1, 2, 3, 5, 12]);
        if (r() < 0.2) { reais = 500000; fala = 'meio milhão'; } else { reais = k * 1000 + 500; fala = `${porExtenso(k * 1000)} e meio`; }
        break;
      }
      case 'k': reais = esc([2000, 2500, 3000, 12000]); fala = `${String(reais / 1000).replace('.', ',')}k`; break;
      case 'dmil': reais = esc([2000, 3000, 2500, 5500]); fala = reais % 1000 ? `${Math.floor(reais / 1000)} mil e ${reais % 1000}` : `${reais / 1000} mil`; break;
      case 'rs00': fala = `R$ ${milhar(reais)},00`; break;
      case 'rs-pos': fala = `${reais} R$`; break;
      case 'qtd-preco': fala = `${esc([20, 200, 50])} ${esc(['telhas', 'tijolos', 'pregos'])} por ${milhar(reais)}`; break;
      case 'aprox': fala = `${esc(['uns', 'cerca de', 'mais ou menos'])} ${reais}`; break;
      case 'duvida-meio': fala = `${esc(['dois', 'cinco', 'vinte'])} e meio`; break;
      case 'dois-valores': fala = `${reais} de cimento e ${esc([300, 700])} de areia`; break;
      case 'reais-cada': fala = `${esc([10, 20, 30])} sacos a ${esc([40, 55])} reais cada`; break;
      default: fala = String(reais);
    }
    const semDe = ['qtd-preco', 'dois-valores', 'reais-cada'].includes(tipoValor);
    const duvida = ['aprox', 'duvida-meio', 'dois-valores', 'reais-cada'].includes(tipoValor);
    const valor = duvida ? null : reais * 100 + cent; // "uns 500", "dois e meio": na dúvida, null
    let [item, categoria] = esc(ITENS);
    if (tipoValor === 'qtd-preco') { item = fala.split(' ')[1]; categoria = MAT; }
    const esperado: Esperado = { valor };
    if ((nivel >= 2 || r() < 0.7) && !['dois-valores', 'reais-cada'].includes(tipoValor)) esperado.categoria = categoria;

    // obra
    let obraTxt = '';
    if (r() < 0.6) {
      const [frases, id] = esc(OBRAS_N);
      obraTxt = esc(frases);
      esperado.obraId = id === 'x' ? (obraTxt.includes('39') || obraTxt.includes('trinta') ? 'l39' : 'l12') : id;
    }
    // data
    let dataTxt = '';
    let dataRelativa = false; // "dia 15" e dia da semana: em lançamento a pagar a data fica em branco
    const sorteioData = r();
    if (nivel >= 5 && r() < 0.45) {
      const forma = esc(['atras', 'primeiro', 'barra', 'extenso']);
      if (forma === 'atras') {
        const n = 2 + Math.floor(r() * 18);
        dataTxt = esc([`há ${n} dias`, `${n} dias atrás`, `faz ${porExtenso(n)} dias`]);
        const d = new Date(hoje); d.setDate(d.getDate() - n); esperado.data = ymd(d);
      } else if (forma === 'primeiro') {
        const m = r() < 0.5 ? null : Math.floor(r() * 9);
        dataTxt = m === null ? 'dia primeiro' : `primeiro de ${MESES[m]}`; if (m === null) dataRelativa = true;
        esperado.data = `2026-${m === null ? '10' : doisDig(m + 1)}-01`;
      } else if (forma === 'barra') {
        const dia = 1 + Math.floor(r() * 27); const m = 1 + Math.floor(r() * 9);
        dataTxt = `${dia}/${doisDig(m)}${r() < 0.3 ? '/2026' : ''}`; esperado.data = `2026-${doisDig(m)}-${doisDig(dia)}`;
      } else {
        const dia = 1 + Math.floor(r() * 27); const m = Math.floor(r() * 9);
        dataTxt = `${porExtenso(dia)} de ${MESES[m]}`; esperado.data = `2026-${doisDig(m + 1)}-${doisDig(dia)}`;
      }
    } else if (sorteioData < 0.5) {
      const dia = 1 + Math.floor(r() * 27);
      const m = nivel >= 2 && r() < 0.5 ? Math.floor(r() * 9) : null; // até setembro
      if (m === null) { dataTxt = esc([`dia ${dia}`, `dia ${nivel >= 3 ? porExtenso(dia) : dia}`]); esperado.data = `2026-10-${doisDig(dia)}`; dataRelativa = true; }
      else { dataTxt = `${esc([String(dia), 'dia ' + dia])} de ${MESES[m]}`; esperado.data = `2026-${doisDig(m + 1)}-${doisDig(dia)}`; }
    } else if (sorteioData < 0.75) {
      const o = esc([['hoje', 0], ['ontem', 1], ['anteontem', 2]] as [string, number][]);
      dataTxt = o[0]; const d = new Date(hoje); d.setDate(d.getDate() - o[1]); esperado.data = ymd(d);
    } else if (sorteioData < 0.9) {
      const sem = Math.floor(r() * 7);
      const volta = (3 - sem + 7) % 7 || 7;
      const d = new Date(hoje); d.setDate(d.getDate() - volta); esperado.data = ymd(d);
      const nome = DIAS_SEMANA[sem];
      dataTxt = esc([nome === 'sábado' || nome === 'domingo' ? nome : nome + '-feira', nome + (sem === 0 || sem === 6 ? '' : '-feira') + ' passada']);
      dataRelativa = true;
    }
    // pagamento
    let pagTxt = '';
    const sorteioPag = r();
    if (sorteioPag < 0.55) {
      const opcoes: [string[], FormaPagamento][] = [
        [['no pix', 'pelo pix', 'via pix'], 'pix'],
        [['no boleto'], 'boleto'],
        [['no cartão', 'no débito', 'no crédito'], 'cartao'],
        [['em dinheiro', 'no dinheiro'], 'dinheiro'],
        [['por transferência', 'por ted'], 'transferencia'],
      ];
      if (nivel >= 5) { opcoes[2][0].push('no cartão de crédito', 'pelo cartão'); opcoes[3][0].push('em espécie'); opcoes[4][0].push('via transferência'); }
      if (nivel >= 2) { opcoes[0][0].push('pelo pique', 'no pique'); opcoes[1][0].push('no bolheto', 'pelo boleto'); }
      const [fr, forma] = esc(opcoes);
      pagTxt = esc(fr); esperado.pagamento = forma;
    }
    // verbo e pago
    const verbo = esc(['paguei', 'comprei', 'foi', 'mandei', 'deu', 'gastei', '']);
    let pagoTxt = '';
    if (verbo === 'paguei') esperado.pago = true;
    if (nivel >= 2 && verbo !== 'paguei' && r() < 0.3) {
      pagoTxt = esc(['a pagar', 'a prazo', 'em aberto', 'fiado']); esperado.pago = false;
      if (nivel >= 5) pagoTxt = esc([pagoTxt, 'pendente', 'preciso pagar', 'em 3 vezes', 'em 3x', 'parcelado', 'devo']);
      if (nivel >= 5 && r() < 0.2) { pagoTxt = esc(['quitado', 'já quitei']); esperado.pago = true; }
    } else if (nivel >= 5 && verbo === 'paguei' && r() < 0.15) {
      pagoTxt = esc(['em 3 vezes', 'parcelado']); esperado.pago = null; // "paguei" + parcelado: não dá para saber
    }
    if (verbo === 'mandei' && /vezes|3x|parcelado/.test(pagoTxt)) esperado.pago = null;
    // parcelado sem "reais"/"R$": o número pode ser a parcela ou o total, então fica em branco
    if (/vezes|3x/.test(pagoTxt) && !/reais|R\$|conto/.test(fala)) esperado.valor = null;
    if (nivel >= 5 && verbo === 'mandei' && esperado.pago === undefined) esperado.pago = true;
    // ruído de transcrição
    const ruidoIni = nivel >= 2 && r() < 0.4 ? esc(['então', 'tá', 'hum', 'é', 'ah', 'então tá', 'olha']) + ' ' : '';
    const ruidoFim = nivel >= 2 && r() < 0.2 ? ' ' + esc(['né', 'tá', 'certo', 'pronto']) : '';

    // ordem das palavras
    const modelo = Math.floor(r() * (nivel >= 3 ? 5 : 3));
    // Números que não são dinheiro, jogados no meio da frase: o valor tem que continuar certo (ou null)
    const distracao = nivel >= 6 && r() < 0.6 ? esc(['nota fiscal 4521', 'pedido 889', 'às 14h', 'CP2', 'de 8 milímetros', 'de 100 mm', '20 sacos', 'lote 41']) : '';
    const sobra = [obraTxt, dataTxt, pagTxt, pagoTxt, distracao].filter(Boolean);
    if (nivel >= 2) for (let i = sobra.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [sobra[i], sobra[j]] = [sobra[j], sobra[i]]; }
    const corpoItem = semDe ? fala : `${fala} de ${item}`;
    let frase: string;
    if (modelo === 0) frase = [verbo, corpoItem, ...sobra].filter(Boolean).join(' ');
    else if (modelo === 1) frase = [item, fala, ...sobra].join(' ');
    else if (modelo === 2) frase = [...sobra.slice(0, 1), verbo, corpoItem, ...sobra.slice(1)].filter(Boolean).join(' ');
    else if (modelo === 3) frase = [item, ...sobra, fala].join(' ');
    else frase = [...sobra, verbo, fala, ...(semDe ? [] : ['de', item])].filter(Boolean).join(' ');
    if (modelo === 1 || modelo === 3) { // "paguei" some do início; "mandei" também
      if (verbo === 'paguei' && esperado.pago === true) esperado.pago = undefined;
      if (verbo === 'mandei' && esperado.pago === true) esperado.pago = undefined;
      if (esperado.pago === null) esperado.pago = false; // sem o "paguei", parcelado é a pagar
    }
    frase = (ruidoIni + frase + ruidoFim).replace(/\s+/g, ' ').trim();
    if (nivel >= 5) { // o iPhone põe maiúscula, vírgulas e ponto final
      const ps = frase.split(' ').map((p) => (r() < 0.12 ? p + ',' : p));
      ps[0] = ps[0][0].toUpperCase() + ps[0].slice(1);
      frase = ps.join(' ').replace(/,$/, '') + (r() < 0.3 ? '.' : '');
    }
    // "dia 21 mil e quinhentos" ninguém sabe ler (nem uma pessoa): não entra no corpus
    const semVirgula = frase.replace(/,/g, '').toLowerCase();
    if ((dataTxt && semVirgula.includes((dataTxt + ' ' + fala).toLowerCase())) || (obraTxt && semVirgula.includes((obraTxt + ' ' + fala).toLowerCase())) || (distracao && semVirgula.includes((distracao + ' ' + fala).toLowerCase()))) continue;
    if (esperado.pago === undefined) delete esperado.pago;
    if (esperado.pago === false && dataRelativa) esperado.data = null;
    // a pessoa pode ter dito "mão de obra" por nome; evita ambiguidade item x obra
    casos.push({ frase, esperado, tipo: `${tipo}/m${modelo}` });
  }
  return casos;
}
