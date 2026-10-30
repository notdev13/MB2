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

// As mesmas categorias da planilha de despesas da MB2.
export const CATEGORIAS = [
  'Terreno e aquisição',
  'Projetos e documentação',
  'Impostos e taxas',
  'Materiais (M)',
  'Mão de obra',
  'Serviços (S)',
  'Locação e consumo',
  'Consórcio',
  'A classificar',
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

// Dinheiro em conta. Cada obra (SPE) tem a sua conta; obraId null = conta da MB2 (empresa).
export interface Conta {
  id: string;
  nome: string;
  banco: string;
  obraId: string | null;
  ativa: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

// Saldo digitado numa data. Cada conferência é uma linha nova; nunca se sobrescreve.
export interface SaldoConta {
  id: string;
  contaId: string;
  data: string; // AAAA-MM-DD
  valor: number; // centavos, pode ser negativo
  fonte: 'manual';
  obs: string;
  criadoEm: string;
}

export type NovaConta = Omit<Conta, 'id' | 'criadoEm' | 'atualizadoEm'>;
export type NovoSaldo = Omit<SaldoConta, 'id' | 'criadoEm'>;
