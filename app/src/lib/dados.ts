import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export type Etapa = { percentual: number; inicio_previsto: string | null; fim_previsto: string | null };
export type Pedido = { id: string; material: string; quantidade: number; unidade: string; fornecedor: string | null; entrega_em: string; status: string };
export type Resumo = {
  nome: string;
  obra: {
    id: string;
    nome: string;
    cidade: string | null;
    etapaAtual: string | null;
    etapaNumero: number | null; // posição da etapa atual (1 = primeira)
    etapasTotal: number;
    inicio: string | null; // menor início previsto entre as etapas
    termino: string | null; // maior fim previsto entre as etapas
  } | null;
  obras: { id: string; nome: string }[];
  executado: number;
  previsto: number;
  entregasHoje: Pedido[];
  ocorrenciasAbertas: number;
};

// Média simples das etapas. Quando houver peso por etapa (orçamento), trocar por média ponderada.
export function progresso(etapas: Etapa[], hoje = new Date()) {
  if (etapas.length === 0) return { executado: 0, previsto: 0 };
  const executado = etapas.reduce((s, e) => s + Number(e.percentual), 0) / etapas.length;
  const previsto =
    etapas.reduce((s, e) => {
      if (!e.inicio_previsto || !e.fim_previsto) return s;
      const ini = new Date(e.inicio_previsto).getTime();
      const fim = new Date(e.fim_previsto).getTime();
      if (fim <= ini) return s + (hoje.getTime() >= fim ? 100 : 0);
      return s + Math.min(100, Math.max(0, ((hoje.getTime() - ini) / (fim - ini)) * 100));
    }, 0) / etapas.length;
  return { executado: Math.round(executado), previsto: Math.round(previsto) };
}

// Diferença entre executado e previsto convertida em dias do cronograma total.
// É uma estimativa (o progresso é média simples das etapas): serve para dar a ordem de grandeza.
// Positivo = adiantada, negativo = atrasada, null = sem datas para calcular.
export function diasDeFolga(executado: number, previsto: number, inicio: string | null, termino: string | null) {
  if (!inicio || !termino) return null;
  const duracao = (new Date(termino).getTime() - new Date(inicio).getTime()) / 86_400_000;
  if (!(duracao > 0)) return null;
  return Math.round(((executado - previsto) / 100) * duracao);
}

// Última obra escolhida neste aparelho.
const CHAVE_OBRA = 'mb2:obra-escolhida';
export const lembrarObra = (obraId: string) => AsyncStorage.setItem(CHAVE_OBRA, obraId).catch(() => {});

export async function carregarResumo(userId: string): Promise<Resumo> {
  const perfil = await supabase.from('perfis').select('nome').eq('id', userId).maybeSingle();
  if (perfil.error) throw perfil.error;
  const nome = (perfil.data?.nome ?? '').split(/[\s@]/)[0];

  // O RLS já devolve só as obras em que a pessoa é membro.
  const obras = await supabase.from('obras').select('id, nome, cidade').eq('arquivada', false).order('nome');
  if (obras.error) throw obras.error;
  const listaObras = obras.data ?? [];
  const escolhida = await AsyncStorage.getItem(CHAVE_OBRA).catch(() => null);
  const obra = listaObras.find((o) => o.id === escolhida) ?? listaObras[0];
  if (!obra) return { nome, obra: null, obras: [], executado: 0, previsto: 0, entregasHoje: [], ocorrenciasAbertas: 0 };

  const inicioDia = new Date();
  inicioDia.setHours(0, 0, 0, 0);
  const fimDia = new Date(inicioDia);
  fimDia.setDate(fimDia.getDate() + 1);

  const [etapas, pedidos, ocorrencias] = await Promise.all([
    supabase.from('etapas').select('nome, percentual, inicio_previsto, fim_previsto, status').eq('obra_id', obra.id).order('ordem'),
    supabase
      .from('pedidos_material')
      .select('id, material, quantidade, unidade, fornecedor, entrega_em, status')
      .eq('obra_id', obra.id)
      .neq('status', 'recusado')
      .gte('entrega_em', inicioDia.toISOString())
      .lt('entrega_em', fimDia.toISOString())
      .order('entrega_em'),
    supabase.from('ocorrencias').select('id', { count: 'exact', head: true }).eq('obra_id', obra.id).eq('resolvida', false),
  ]);
  if (etapas.error) throw etapas.error;
  if (pedidos.error) throw pedidos.error;
  if (ocorrencias.error) throw ocorrencias.error;

  const lista = etapas.data ?? [];
  const indiceAtual = lista.findIndex((e) => e.status === 'em_andamento');
  const atual = indiceAtual >= 0 ? lista[indiceAtual] : null;
  const inicios = lista.map((e) => e.inicio_previsto).filter((d): d is string => !!d).sort();
  const fins = lista.map((e) => e.fim_previsto).filter((d): d is string => !!d).sort();
  return {
    nome,
    obra: {
      id: obra.id,
      nome: obra.nome,
      cidade: obra.cidade ?? null,
      etapaAtual: atual?.nome ?? null,
      etapaNumero: indiceAtual >= 0 ? indiceAtual + 1 : null,
      etapasTotal: lista.length,
      inicio: inicios[0] ?? null,
      termino: fins[fins.length - 1] ?? null,
    },
    obras: listaObras.map(({ id, nome }) => ({ id, nome })),
    ...progresso(lista),
    entregasHoje: (pedidos.data ?? []) as Pedido[],
    ocorrenciasAbertas: ocorrencias.count ?? 0,
  };
}
