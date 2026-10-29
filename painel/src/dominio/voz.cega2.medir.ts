import { interpretarFala } from './voz';
import type { Interpretacao } from './voz';
import { F1, F2, F3, type O } from './voz.cega2';
import type { Custo, Obra } from './tipos';

// Conjunto "cega2": escrito por revisor independente (sintético). Mede valor errado, branco e campos secundários.
export type Linha = [string, number | null, O?];
export const CEGA2: Linha[] = [...F1, ...F2, ...F3];

const obras = ([['c12', 'Casa 12 Rio Tavares'], ['l39', 'Lote 39 Campeche'], ['lag', 'Residencial Lagoa Azul'], ['mar', 'Sobrado Dona Marlene'], ['mor', 'Geminadas Morro das Pedras']] as const)
  .map(([id, nome]) => ({ id, nome, endereco: '', cliente: '', orcamento: 0, areaM2: null, inicio: null, previsaoFim: null, status: 'em_andamento', observacoes: '', criadoEm: '', atualizadoEm: '' }) as Obra);
let n = 0;
const mk = (categoria: string, descricao: string, fornecedor: string): Custo => ({ id: 'x' + n++, obraId: 'c12', data: '2026-09-01', categoria, descricao, fornecedor, valor: 10000, pagamento: 'pix', pago: true, criadoEm: '', atualizadoEm: '' }) as Custo;
const custos = [mk('Mão de obra', 'MÃO DE OBRA – ULISSES', 'Ulisses'), mk('Materiais (M)', 'Cimento', 'Depósito São José'), mk('Serviços (S)', 'Frete', '')];
export const CONTEXTO_CEGA2 = { obras, custos, hoje: '2026-10-29' };

export type Medida = { total: number; errados: string[]; brancos: string[]; secundarios: string[] };
export function medirLinhas(linhas: Linha[], ler: (t: string, c: typeof CONTEXTO_CEGA2) => Interpretacao = interpretarFala as never): Medida {
  const m: Medida = { total: linhas.length, errados: [], brancos: [], secundarios: [] };
  for (const [t, v, o = {}] of linhas) {
    const r = ler(t, CONTEXTO_CEGA2);
    if (v === null) { if (r.valor !== null) m.errados.push(`${t} => ${r.valor}`); }
    else if (r.valor === null) { if (!o.T) m.brancos.push(t); }
    else if (r.valor !== Math.round(v * 100)) m.errados.push(`${t} => ${r.valor} (esperado ${Math.round(v * 100)})`);
    const sec: string[] = [];
    if (o.d !== undefined && r.data !== o.d) sec.push(`data:${r.data}!=${o.d}`);
    if (o.o !== undefined && r.obraId !== o.o) sec.push(`obra:${r.obraId}!=${o.o}`);
    if (o.pg !== undefined && r.pagamento !== o.pg) sec.push(`pg:${r.pagamento}!=${o.pg}`);
    if (o.pa !== undefined && r.pago !== o.pa) sec.push(`pago:${r.pago}!=${o.pa}`);
    if (sec.length) m.secundarios.push(`${t} => ${sec.join(',')}`);
  }
  return m;
}
