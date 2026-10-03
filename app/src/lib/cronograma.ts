import { supabase } from './supabase';

export type StatusEtapa = 'nao_iniciada' | 'em_andamento' | 'concluida';
export type Etapa = {
  id: string;
  nome: string;
  ordem: number;
  inicio_previsto: string | null;
  fim_previsto: string | null;
  inicio_real: string | null;
  fim_real: string | null;
  percentual: number;
  status: StatusEtapa;
};
export type ObraDetalhe = {
  id: string;
  nome: string;
  endereco: string | null;
  cidade: string | null;
  entrega_prevista: string | null;
  orcamento_total: number | null;
};

const DIA = 86_400_000;
const data = (iso: string) => {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
};
const meiaNoite = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Quanto a etapa já deveria estar feita hoje, pela linha reta entre início e fim previstos.
export function previstoHoje(e: Pick<Etapa, 'inicio_previsto' | 'fim_previsto'>, hoje = new Date()) {
  if (!e.inicio_previsto || !e.fim_previsto) return null;
  const ini = data(e.inicio_previsto).getTime();
  const fim = data(e.fim_previsto).getTime();
  const h = meiaNoite(hoje).getTime();
  if (fim <= ini) return h >= fim ? 100 : 0;
  return Math.min(100, Math.max(0, ((h - ini) / (fim - ini)) * 100));
}

// Dias de atraso: a diferença entre hoje e o dia em que o percentual atual deveria ter sido atingido.
export function diasDeAtraso(e: Pick<Etapa, 'inicio_previsto' | 'fim_previsto' | 'percentual'>, hoje = new Date()) {
  if (!e.inicio_previsto || !e.fim_previsto || Number(e.percentual) >= 100) return 0;
  const ini = data(e.inicio_previsto).getTime();
  const fim = data(e.fim_previsto).getTime();
  const alvo = ini + (Math.max(fim - ini, 0) * Number(e.percentual)) / 100;
  const atraso = Math.floor((meiaNoite(hoje).getTime() - alvo) / DIA);
  // Etapa que ainda não começou e nem deveria ter começado não está atrasada.
  return atraso > 0 ? atraso : 0;
}

export function statusPorPercentual(p: number): StatusEtapa {
  return p >= 100 ? 'concluida' : p > 0 ? 'em_andamento' : 'nao_iniciada';
}

export async function carregarObra(obraId: string) {
  const [obra, etapas] = await Promise.all([
    supabase.from('obras').select('id, nome, endereco, cidade, entrega_prevista, orcamento_total').eq('id', obraId).single(),
    supabase
      .from('etapas')
      .select('id, nome, ordem, inicio_previsto, fim_previsto, inicio_real, fim_real, percentual, status')
      .eq('obra_id', obraId)
      .order('ordem'),
  ]);
  if (obra.error) throw obra.error;
  if (etapas.error) throw etapas.error;
  return { obra: obra.data as ObraDetalhe, etapas: (etapas.data ?? []).map((e) => ({ ...e, percentual: Number(e.percentual) })) as Etapa[] };
}

// Só quem aprova enxerga custos (o RLS devolve vazio para os demais).
export async function totalGasto(obraId: string) {
  const { data: linhas, error } = await supabase.from('lancamentos').select('valor').eq('obra_id', obraId);
  if (error) return null;
  return (linhas ?? []).reduce((s, l) => s + Number(l.valor), 0);
}

export async function atualizarPercentual(e: Etapa, percentual: number) {
  const hoje = new Date();
  const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
  const status = statusPorPercentual(percentual);
  const { error } = await supabase
    .from('etapas')
    .update({
      percentual,
      status,
      inicio_real: e.inicio_real ?? (percentual > 0 ? iso : null),
      fim_real: percentual >= 100 ? (e.fim_real ?? iso) : null,
    })
    .eq('id', e.id);
  if (error) throw error;
}
