import { diasDeFolga, progresso } from './dados';
import { supabase } from './supabase';

// Visão da carteira inteira (painel do computador). Usa só o que o banco já guarda.
export type SituacaoObra = 'andamento' | 'nao_iniciada' | 'arquivada';
export type LinhaObra = {
  id: string;
  nome: string;
  cidade: string | null;
  situacao: SituacaoObra;
  etapaAtual: string | null;
  executado: number;
  previsto: number;
  folga: number | null; // dias: + adiantada, - atrasada
  entrega: string | null;
  orcado: number | null;
  gasto: number | null; // null = esta pessoa não vê custos desta obra
  ocorrencias: number;
  pedidos: number; // pedidos aguardando aprovação
};

type EtapaLinha = { obra_id: string; nome: string; percentual: number; inicio_previsto: string | null; fim_previsto: string | null; status: string; ordem: number };

export async function carregarCarteira(): Promise<LinhaObra[]> {
  // O RLS devolve só as obras em que a pessoa é membro (diretoria vê todas).
  const obras = await supabase.from('obras').select('id, nome, cidade, entrega_prevista, orcamento_total, arquivada').order('nome');
  if (obras.error) throw obras.error;
  const lista = obras.data ?? [];
  if (lista.length === 0) return [];
  const ids = lista.map((o) => o.id);

  const [etapas, ocorrencias, pedidos, custos] = await Promise.all([
    supabase.from('etapas').select('obra_id, nome, percentual, inicio_previsto, fim_previsto, status, ordem').in('obra_id', ids).order('ordem'),
    supabase.from('ocorrencias').select('obra_id').in('obra_id', ids).eq('resolvida', false),
    supabase.from('pedidos_material').select('obra_id').in('obra_id', ids).eq('status', 'solicitado'),
    // Custos: o RLS só devolve lançamentos de obras onde a pessoa pode aprovar.
    Promise.all(ids.map((id) => supabase.rpc('pode_aprovar', { p_obra: id }).then(({ data }) => [id, data === true] as const))),
  ]);
  if (etapas.error) throw etapas.error;
  if (ocorrencias.error) throw ocorrencias.error;
  if (pedidos.error) throw pedidos.error;

  const veCusto = new Set(custos.filter(([, ok]) => ok).map(([id]) => id));
  const gastos = new Map<string, number>();
  if (veCusto.size > 0) {
    const l = await supabase.from('lancamentos').select('obra_id, valor').in('obra_id', [...veCusto]);
    if (!l.error) for (const r of l.data ?? []) gastos.set(r.obra_id, (gastos.get(r.obra_id) ?? 0) + Number(r.valor));
  }
  const contar = (linhas: { obra_id: string }[] | null) => {
    const m = new Map<string, number>();
    for (const r of linhas ?? []) m.set(r.obra_id, (m.get(r.obra_id) ?? 0) + 1);
    return m;
  };
  const nOcorr = contar(ocorrencias.data);
  const nPed = contar(pedidos.data);
  const porObra = new Map<string, EtapaLinha[]>();
  for (const e of (etapas.data ?? []) as EtapaLinha[]) porObra.set(e.obra_id, [...(porObra.get(e.obra_id) ?? []), { ...e, percentual: Number(e.percentual) }]);

  return lista.map((o) => {
    const es = porObra.get(o.id) ?? [];
    const { executado, previsto } = progresso(es);
    const inicios = es.map((e) => e.inicio_previsto).filter((d): d is string => !!d).sort();
    const fins = es.map((e) => e.fim_previsto).filter((d): d is string => !!d).sort();
    const termino = fins[fins.length - 1] ?? null;
    const atual = es.find((e) => e.status === 'em_andamento');
    const situacao: SituacaoObra = o.arquivada ? 'arquivada' : executado > 0 ? 'andamento' : 'nao_iniciada';
    return {
      id: o.id,
      nome: o.nome,
      cidade: o.cidade ?? null,
      situacao,
      etapaAtual: atual?.nome ?? null,
      executado,
      previsto,
      folga: diasDeFolga(executado, previsto, inicios[0] ?? null, termino),
      entrega: o.entrega_prevista ?? termino,
      orcado: o.orcamento_total !== null ? Number(o.orcamento_total) : null,
      gasto: veCusto.has(o.id) ? (gastos.get(o.id) ?? 0) : null,
      ocorrencias: nOcorr.get(o.id) ?? 0,
      pedidos: nPed.get(o.id) ?? 0,
    };
  });
}

// R$ 1,46 mi · R$ 312 mil · R$ 9.360
export function reaisCurto(v: number) {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mi`;
  if (a >= 10_000) return `R$ ${Math.round(v / 1000).toLocaleString('pt-BR')} mil`;
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}
