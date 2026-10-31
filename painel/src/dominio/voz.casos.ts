import type { Categoria, Custo, FormaPagamento, Obra } from './tipos';
import { VALOR } from './voz.casos.valor';
import { DATA_PAGAMENTO } from './voz.casos.data-pagamento';
import { NAO_GASTO } from './voz.casos.nao-gasto';

// Casos de teste do interpretador de voz (voz.ts): frases escritas à mão, cada uma com o resultado esperado,
// separadas por tema em voz.casos.valor.ts, voz.casos.data-pagamento.ts e voz.casos.nao-gasto.ts.
// Tudo sintético: nomes e valores inventados, nenhum dado real de cliente, fornecedor ou obra.
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
  tipo: string; // etiqueta do assunto, para agrupar as falhas
  ctx?: 'b'; // contexto B (hoje = 2026-10-29, outras obras); sem etiqueta = contexto A
  tolerante?: boolean; // em branco é aceitável (valor ambíguo), mas número errado não
  dificil?: boolean; // caso difícil: fica de fora da taxa de "frases comuns em branco"
  pendente?: boolean; // falha conhecida e aceita (aparece no relatório, não quebra o teste)
}

// Forma curta de escrever um caso: [frase, valor em reais ou null, opções].
export interface Opcoes {
  d?: string | null; pg?: FormaPagamento | null; pa?: boolean | null; o?: string | null; cat?: Categoria | null; forn?: string;
  T?: boolean; dificil?: boolean; pendente?: boolean; b?: boolean; tipo?: string;
}
export type Linha = [string, number | null | undefined, Opcoes?];

export function deLinha([frase, v, o = {}]: Linha): Caso {
  const esperado: Esperado = {};
  if (v !== undefined) esperado.valor = v === null ? null : Math.round(v * 100);
  if (o.d !== undefined) esperado.data = o.d;
  if (o.pg !== undefined) esperado.pagamento = o.pg;
  if (o.pa !== undefined) esperado.pago = o.pa;
  if (o.o !== undefined) esperado.obraId = o.o;
  if (o.cat !== undefined) esperado.categoria = o.cat;
  if (o.forn !== undefined) esperado.fornecedor = o.forn;
  return { frase, esperado, tipo: o.tipo ?? 'geral', ...(o.b ? { ctx: 'b' as const } : {}), ...(o.T ? { tolerante: true } : {}),
    ...(o.dificil ? { dificil: true } : {}), ...(o.pendente ? { pendente: true } : {}) };
}

// ---- contextos sintéticos ----

const obra = (id: string, nome: string): Obra => ({
  id, nome, endereco: '', cliente: '', orcamento: 0, areaM2: null, inicio: null, previsaoFim: null,
  status: 'em_andamento', observacoes: '', criadoEm: '', atualizadoEm: '',
});
let seq = 0;
const custo = (categoria: Categoria, descricao: string, fornecedor = '', obraId = 'l39'): Custo => ({
  id: String(seq++), obraId, data: '2026-09-01', categoria, descricao, fornecedor, valor: 100_00,
  pagamento: 'outro', pago: true, criadoEm: '', atualizadoEm: '',
});

export const HOJE = '2026-10-28'; // quarta-feira
// Contexto A: as cinco obras e os históricos dos casos mais antigos.
export const CONTEXTO = {
  hoje: HOJE,
  obras: [
    obra('l39', 'Jardim Campeche Geminada 39'),
    obra('l12', 'Casa 12 Rio Tavares'),
    obra('eco', 'Ecovillas'),
    obra('oli', 'Olindina Maria Lopes'),
    obra('lau', 'Laureano'),
  ],
  custos: [
    custo('Mão de obra', 'MÃO DE OBRA – ULISSES', 'Ulisses'),
    custo('Mão de obra', 'MÃO DE OBRA – ADRIANO', 'Adriano'),
    custo('Materiais (M)', 'MATSUL'),
  ],
};
// Contexto B: outro dia (quinta-feira) e outras obras, usado pelos casos marcados com b.
export const CONTEXTO_B = {
  hoje: '2026-10-29',
  obras: [
    obra('c12', 'Casa 12 Rio Tavares'),
    obra('l39', 'Lote 39 Campeche'),
    obra('lag', 'Residencial Lagoa Azul'),
    obra('mar', 'Sobrado Dona Marlene'),
    obra('mor', 'Geminadas Morro das Pedras'),
  ],
  custos: [
    custo('Mão de obra', 'MÃO DE OBRA – ULISSES', 'Ulisses', 'c12'),
    custo('Materiais (M)', 'Cimento', 'Depósito São José', 'c12'),
    custo('Serviços (S)', 'Frete', '', 'c12'),
  ],
};
export const contextoDe = (c: Caso) => (c.ctx === 'b' ? CONTEXTO_B : CONTEXTO);

// ---- os casos ----

export const CASOS_VALOR: Caso[] = VALOR.map(deLinha);
export const CASOS_DATA_PAGAMENTO: Caso[] = DATA_PAGAMENTO.map(deLinha);
export const CASOS_NAO_GASTO: Caso[] = NAO_GASTO.map(deLinha);
export const TODOS_OS_CASOS: Caso[] = [...CASOS_VALOR, ...CASOS_DATA_PAGAMENTO, ...CASOS_NAO_GASTO];
