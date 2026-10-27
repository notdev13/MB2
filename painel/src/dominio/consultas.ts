import { soma } from './calculos';
import type { Categoria, Custo } from './tipos';

// Consultas sobre os lançamentos: filtros, ordenação e agrupamentos usados nas tabelas
// da versão para computador. Funções puras: recebem a lista e devolvem uma nova.

export type Situacao = 'todos' | 'pago' | 'a_pagar';

export interface FiltroCustos {
  obraId?: string;
  categoria?: Categoria;
  de?: string; // 'AAAA-MM-DD', inclusive
  ate?: string; // 'AAAA-MM-DD', inclusive
  situacao?: Situacao;
  busca?: string; // procura na descrição e no fornecedor, sem ligar para acento ou maiúscula
}

// "Mão de Obra" e "MAO DE OBRA" viram a mesma coisa para a busca.
export const normalizar = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function filtrarCustos(custos: Custo[], f: FiltroCustos): Custo[] {
  const termos = f.busca ? normalizar(f.busca).split(/\s+/).filter(Boolean) : [];
  return custos.filter((c) => {
    if (f.obraId && c.obraId !== f.obraId) return false;
    if (f.categoria && c.categoria !== f.categoria) return false;
    if (f.de && c.data < f.de) return false;
    if (f.ate && c.data > f.ate) return false;
    if (f.situacao === 'pago' && !c.pago) return false;
    if (f.situacao === 'a_pagar' && c.pago) return false;
    if (termos.length) {
      const texto = normalizar(`${c.descricao} ${c.fornecedor}`);
      if (!termos.every((t) => texto.includes(t))) return false;
    }
    return true;
  });
}

export type CampoOrdem = 'data' | 'valor' | 'descricao' | 'fornecedor' | 'categoria';
export type Direcao = 'asc' | 'desc';

const comparar: Record<CampoOrdem, (a: Custo, b: Custo) => number> = {
  data: (a, b) => a.data.localeCompare(b.data) || a.criadoEm.localeCompare(b.criadoEm),
  valor: (a, b) => a.valor - b.valor,
  descricao: (a, b) => a.descricao.localeCompare(b.descricao, 'pt-BR', { sensitivity: 'base' }),
  fornecedor: (a, b) => a.fornecedor.localeCompare(b.fornecedor, 'pt-BR', { sensitivity: 'base' }),
  categoria: (a, b) => a.categoria.localeCompare(b.categoria, 'pt-BR'),
};

// Ordena sem mexer na lista original. Empates ficam do mais recente para o mais antigo.
export function ordenarCustos(custos: Custo[], campo: CampoOrdem, direcao: Direcao): Custo[] {
  const sinal = direcao === 'asc' ? 1 : -1;
  return [...custos].sort((a, b) => sinal * comparar[campo](a, b) || comparar.data(b, a));
}

export interface TotalFornecedor {
  fornecedor: string;
  total: number;
  lancamentos: number;
}

export const SEM_FORNECEDOR = 'Sem fornecedor';

// Quanto foi para cada fornecedor ou prestador. Nomes iguais com acento ou caixa diferente somam juntos
// (fica o nome mais usado).
export function porFornecedor(custos: Custo[]): TotalFornecedor[] {
  const grupos = new Map<string, { nomes: Map<string, number>; total: number; lancamentos: number }>();
  for (const c of custos) {
    const nome = c.fornecedor.trim() || SEM_FORNECEDOR;
    const chave = normalizar(nome);
    const g = grupos.get(chave) ?? { nomes: new Map(), total: 0, lancamentos: 0 };
    g.nomes.set(nome, (g.nomes.get(nome) ?? 0) + 1);
    g.total += c.valor;
    g.lancamentos += 1;
    grupos.set(chave, g);
  }
  return [...grupos.values()]
    .map((g) => ({
      fornecedor: [...g.nomes.entries()].sort((a, b) => b[1] - a[1])[0][0],
      total: g.total,
      lancamentos: g.lancamentos,
    }))
    .sort((a, b) => b.total - a.total);
}

// Mês anterior a 'AAAA-MM' (ou a uma data 'AAAA-MM-DD'), no formato 'AAAA-MM'.
export function mesAnterior(referencia: string): string {
  const [a, m] = referencia.split('-').map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`;
}

// Variação entre dois totais (0,25 = 25% a mais). Sem base de comparação, devolve null.
export const variacao = (atual: number, anterior: number): number | null =>
  anterior > 0 ? (atual - anterior) / anterior : null;

export const totalDoMes = (custos: Custo[], mes: string) => soma(custos.filter((c) => c.data.startsWith(mes)));
