import { supabase } from './supabase';

export type StatusPedido = 'solicitado' | 'aprovado' | 'recusado' | 'entregue';
export type Pedido = {
  id: string;
  material: string;
  quantidade: number;
  unidade: string;
  fornecedor: string | null;
  entrega_em: string | null;
  status: StatusPedido;
  criado_em: string;
};

export type Gravidade = 'baixa' | 'media' | 'alta';
export type Ocorrencia = {
  id: string;
  titulo: string;
  descricao: string | null;
  gravidade: Gravidade;
  resolvida: boolean;
  criado_em: string;
};

// Diretoria, responsável e engenheiro aprovam pedidos (mesma regra do banco).
export async function podeAprovar(obraId: string) {
  const { data, error } = await supabase.rpc('pode_aprovar', { p_obra: obraId });
  if (error) return false;
  return data === true;
}

export async function listarPedidos(obraId: string): Promise<Pedido[]> {
  const { data, error } = await supabase
    .from('pedidos_material')
    .select('id, material, quantidade, unidade, fornecedor, entrega_em, status, criado_em')
    .eq('obra_id', obraId)
    .order('criado_em', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as Pedido[];
}

export async function criarPedido(p: { obraId: string; material: string; quantidade: number; unidade: string; fornecedor: string; entregaEm: Date | null }) {
  const { error } = await supabase.from('pedidos_material').insert({
    obra_id: p.obraId,
    material: p.material.trim(),
    quantidade: p.quantidade,
    unidade: p.unidade,
    fornecedor: p.fornecedor.trim() || null,
    entrega_em: p.entregaEm ? p.entregaEm.toISOString() : null,
  });
  if (error) throw error;
}

export async function mudarStatusPedido(id: string, status: StatusPedido) {
  const { data: u } = await supabase.auth.getUser();
  const extra = status === 'aprovado' || status === 'recusado' ? { aprovador_id: u.user?.id } : {};
  const { error } = await supabase.from('pedidos_material').update({ status, ...extra }).eq('id', id);
  if (error) throw error;
}

export async function listarOcorrencias(obraId: string): Promise<Ocorrencia[]> {
  const { data, error } = await supabase
    .from('ocorrencias')
    .select('id, titulo, descricao, gravidade, resolvida, criado_em')
    .eq('obra_id', obraId)
    .order('resolvida')
    .order('criado_em', { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as Ocorrencia[];
}

export async function criarOcorrencia(o: { obraId: string; titulo: string; descricao: string; gravidade: Gravidade }) {
  const { error } = await supabase.from('ocorrencias').insert({
    obra_id: o.obraId,
    titulo: o.titulo.trim(),
    descricao: o.descricao.trim() || null,
    gravidade: o.gravidade,
  });
  if (error) throw error;
}

export async function resolverOcorrencia(id: string, resolvida = true) {
  const { error } = await supabase.from('ocorrencias').update({ resolvida }).eq('id', id);
  if (error) throw error;
}
