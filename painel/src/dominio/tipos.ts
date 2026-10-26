// Modelo de dados do painel. Valores em dinheiro são sempre centavos inteiros
// (evita erro de arredondamento ao somar). Datas são texto 'AAAA-MM-DD'.

export type StatusObra = 'planejamento' | 'em_andamento' | 'pausada' | 'concluida';

export const STATUS_OBRA: Record<StatusObra, string> = {
  planejamento: 'Planejamento',
  em_andamento: 'Em andamento',
  pausada: 'Pausada',
  concluida: 'Concluída',
};

export interface Obra {
  id: string;
  nome: string;
  endereco: string;
  cliente: string;
  orcamento: number; // centavos
  areaM2: number | null;
  inicio: string | null;
  previsaoFim: string | null;
  status: StatusObra;
  observacoes: string;
  criadoEm: string; // ISO
  atualizadoEm: string; // ISO
}

export const CATEGORIAS = [
  'Projeto e aprovações',
  'Terreno e taxas',
  'Fundação',
  'Estrutura',
  'Alvenaria',
  'Cobertura',
  'Instalações elétricas',
  'Instalações hidráulicas',
  'Esquadrias',
  'Revestimentos',
  'Pintura',
  'Acabamento',
  'Mão de obra',
  'Equipamentos e locação',
  'Paisagismo',
  'Administração',
  'Outros',
] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export type FormaPagamento = 'pix' | 'boleto' | 'cartao' | 'transferencia' | 'dinheiro' | 'outro';

export const FORMAS_PAGAMENTO: Record<FormaPagamento, string> = {
  pix: 'Pix',
  boleto: 'Boleto',
  cartao: 'Cartão',
  transferencia: 'Transferência',
  dinheiro: 'Dinheiro',
  outro: 'Outro',
};

export interface Custo {
  id: string;
  obraId: string;
  data: string;
  categoria: Categoria;
  descricao: string;
  fornecedor: string;
  valor: number; // centavos
  pagamento: FormaPagamento;
  pago: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export type NovaObra = Omit<Obra, 'id' | 'criadoEm' | 'atualizadoEm'>;
export type NovoCusto = Omit<Custo, 'id' | 'criadoEm' | 'atualizadoEm'>;
