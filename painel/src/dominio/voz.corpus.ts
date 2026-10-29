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
  { tipo: 'base', frase: 'comprei 20 sacos de cimento por 1.200 reais no boleto a pagar dia 15', esperado: { valor: 1200_00, data: '2026-10-15', pagamento: 'boleto', pago: false } },
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
  { tipo: 'parcela', frase: 'três mil e quinhentos de concreto em 3 vezes', esperado: { valor: 3500_00, pago: false } },
  { tipo: 'parcela', frase: 'parcelado em 3x de 500 de piso', esperado: { valor: 500_00, pago: false } },
  { tipo: 'parcela', frase: 'dez parcelas de 300 de azulejo', esperado: { valor: 300_00 } },
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
  { tipo: 'pagamento', frase: 'cartão de crédito em 10 vezes 1.000 de piso', esperado: { valor: 1000_00, pagamento: 'cartao', pago: false } },
  { tipo: 'aprox', frase: 'uns quinhentos reais de gesso', esperado: { valor: null } },
  { tipo: 'ruido', frase: 'ééé então tá é paguei assim, tipo, 300 de areia', esperado: { valor: 300_00, pago: true } },
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
  { tipo: 'unitario', frase: 'uma hora de máquina 150', esperado: { valor: null, categoria: SERV } },
  { tipo: 'quantidade', frase: 'duas horas de máquina por 300', esperado: { valor: 300_00 } },
  { tipo: 'unitario', frase: 'quatro diárias de 150 cada', esperado: { valor: null } },
  { tipo: 'unitario', frase: 'paguei 3 diárias de 150', esperado: { valor: null } },
  { tipo: 'unitario', frase: 'servente 3 dias a 150', esperado: { valor: null } },
  { tipo: 'unitario', frase: 'paguei 3 dias de servente 150', esperado: { valor: null } },
  { tipo: 'unitario', frase: 'paguei duzentos reais por dia', esperado: { valor: null } },
  { tipo: 'unitario', frase: 'ajudante duzentos reais por dia durante cinco dias', esperado: { valor: null } },
  { tipo: 'unitario', frase: 'cimento 40 reais o saco', esperado: { valor: null } },
  { tipo: 'mensal', frase: 'aluguel de 1.500 por mês', esperado: { valor: 1500_00, categoria: 'Locação e consumo' } },
  { tipo: 'data', frase: '30 de setembro 100 de areia', esperado: { valor: 100_00, data: '2026-09-30' } },
  { tipo: 'data', frase: 'dia 5 de maio de 2025 100 de areia', esperado: { valor: 100_00, data: '2025-05-05' } },
  { tipo: 'data', frase: 'quinta 100 de areia', esperado: { valor: 100_00, data: '2026-10-22' } },
  { tipo: 'data', frase: '100 de areia quarta', esperado: { valor: 100_00, data: '2026-10-21' } },
  { tipo: 'data-futura', frase: 'boleto de 400 vence dia 5 de novembro', esperado: { valor: 400_00, pago: false, pagamento: 'boleto', data: null } },
  { tipo: 'pago', frase: 'boleto vence dia 20 de 400 de piso', esperado: { valor: 400_00, pago: false, pagamento: 'boleto', data: '2026-10-20' } },
  { tipo: 'pago', frase: 'paguei 800 de piso no cartão em 12 vezes', esperado: { valor: 800_00, pago: null, pagamento: 'cartao' } },
  { tipo: 'documento', frase: 'nota fiscal 1234 de cimento 500 reais', esperado: { valor: 500_00 } },
  { tipo: 'documento', frase: 'pedido 4521 cimento 800 reais', esperado: { valor: 800_00 } },
  { tipo: 'documento', frase: 'orçamento 7788 aprovado em 15 mil', esperado: { valor: 15000_00 } },
  { tipo: 'documento', frase: 'cheque 123456 de 2 mil', esperado: { valor: 2000_00, pagamento: 'outro' } },
  { tipo: 'obra', frase: 'obra Olindina Maria 300 de areia', esperado: { valor: 300_00, obraId: 'oli' } },
  { tipo: 'obra', frase: 'Laureano e Olindina 500', esperado: { valor: 500_00, obraId: null } },
  { tipo: 'obra', frase: 'terreno 700 reais', esperado: { valor: 700_00, obraId: null } },
];

// ---- gerador de frases ----

function aleatorio(semente: number) {
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

const milhar = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
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
    const sorteioData = r();
    if (nivel >= 5 && r() < 0.45) {
      const forma = esc(['atras', 'primeiro', 'barra', 'extenso']);
      if (forma === 'atras') {
        const n = 2 + Math.floor(r() * 18);
        dataTxt = esc([`há ${n} dias`, `${n} dias atrás`, `faz ${porExtenso(n)} dias`]);
        const d = new Date(hoje); d.setDate(d.getDate() - n); esperado.data = ymd(d);
      } else if (forma === 'primeiro') {
        const m = r() < 0.5 ? null : Math.floor(r() * 9);
        dataTxt = m === null ? 'dia primeiro' : `primeiro de ${MESES[m]}`;
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
      if (m === null) { dataTxt = esc([`dia ${dia}`, `dia ${nivel >= 3 ? porExtenso(dia) : dia}`]); esperado.data = `2026-10-${doisDig(dia)}`; }
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
    if (nivel >= 5 && verbo === 'mandei' && esperado.pago === undefined) esperado.pago = true;
    // ruído de transcrição
    const ruidoIni = nivel >= 2 && r() < 0.4 ? esc(['então', 'tá', 'hum', 'é', 'ah', 'então tá', 'olha']) + ' ' : '';
    const ruidoFim = nivel >= 2 && r() < 0.2 ? ' ' + esc(['né', 'tá', 'certo', 'pronto']) : '';

    // ordem das palavras
    const modelo = Math.floor(r() * (nivel >= 3 ? 5 : 3));
    const sobra = [obraTxt, dataTxt, pagTxt, pagoTxt].filter(Boolean);
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
    if ((dataTxt && semVirgula.includes((dataTxt + ' ' + fala).toLowerCase())) || (obraTxt && semVirgula.includes((obraTxt + ' ' + fala).toLowerCase()))) continue;
    if (esperado.pago === undefined) delete esperado.pago;
    // a pessoa pode ter dito "mão de obra" por nome; evita ambiguidade item x obra
    casos.push({ frase, esperado, tipo: `${tipo}/m${modelo}` });
  }
  return casos;
}
