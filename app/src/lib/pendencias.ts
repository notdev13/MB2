import { contarPendentes } from './acesso';
import { supabase } from './supabase';

// Caixa de entrada de decisões, juntando TODAS as obras da pessoa.
// Só entra aqui o que a própria pessoa pode resolver (as regras são as mesmas do banco).
export type TipoPendencia = 'pedido' | 'ocorrencia' | 'contas';
export type Pendencia = {
  chave: string;
  tipo: TipoPendencia;
  id: string; // id do pedido ou da ocorrência ('' para contas)
  obraId: string | null;
  obraNome: string | null;
  titulo: string;
  sub: string;
  criadoEm: string | null;
  urgente: boolean;
};

const nomeDaObra = (o: unknown) => {
  const r = Array.isArray(o) ? o[0] : o;
  return (r as { nome?: string } | null)?.nome ?? 'Obra';
};

// Uma consulta por obra distinta (são poucas), com o mesmo critério das regras do banco.
async function obrasQuePosso(funcao: 'pode_aprovar' | 'pode_editar', obras: string[]) {
  const unicas = [...new Set(obras)];
  const r = await Promise.all(unicas.map((id) => supabase.rpc(funcao, { p_obra: id }).then(({ data }) => [id, data === true] as const)));
  return new Set(r.filter(([, ok]) => ok).map(([id]) => id));
}

const numero = (n: number) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const diaMes = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export async function carregarPendencias(diretoria: boolean): Promise<Pendencia[]> {
  // O RLS já devolve só as obras em que a pessoa é membro.
  const [pedidos, ocorrencias, contas] = await Promise.all([
    supabase
      .from('pedidos_material')
      .select('id, obra_id, material, quantidade, unidade, fornecedor, entrega_em, criado_em, obras(nome, arquivada)')
      .eq('status', 'solicitado')
      .order('criado_em'),
    supabase
      .from('ocorrencias')
      .select('id, obra_id, titulo, gravidade, criado_em, obras(nome, arquivada)')
      .eq('resolvida', false)
      .order('criado_em'),
    diretoria ? contarPendentes() : Promise.resolve(0),
  ]);
  if (pedidos.error) throw pedidos.error;
  if (ocorrencias.error) throw ocorrencias.error;

  const ativa = (o: unknown) => !(Array.isArray(o) ? o[0] : (o as { arquivada?: boolean } | null))?.arquivada;
  const listaPedidos = (pedidos.data ?? []).filter((p) => ativa(p.obras));
  const listaOcorrencias = (ocorrencias.data ?? []).filter((o) => ativa(o.obras));
  const [aprova, edita] = await Promise.all([
    obrasQuePosso('pode_aprovar', listaPedidos.map((p) => p.obra_id)),
    obrasQuePosso('pode_editar', listaOcorrencias.map((o) => o.obra_id)),
  ]);

  const itens: Pendencia[] = [];
  if (contas > 0) {
    itens.push({
      chave: 'contas', tipo: 'contas', id: '', obraId: null, obraNome: null,
      titulo: contas === 1 ? '1 conta aguardando liberação' : `${contas} contas aguardando liberação`,
      sub: 'Contas e convites', criadoEm: null, urgente: false,
    });
  }
  for (const o of listaOcorrencias) {
    if (!edita.has(o.obra_id)) continue;
    itens.push({
      chave: `o-${o.id}`, tipo: 'ocorrencia', id: o.id, obraId: o.obra_id, obraNome: nomeDaObra(o.obras),
      titulo: o.titulo, sub: o.gravidade === 'alta' ? 'Gravidade alta' : o.gravidade === 'media' ? 'Gravidade média' : 'Gravidade baixa',
      criadoEm: o.criado_em, urgente: o.gravidade === 'alta',
    });
  }
  for (const p of listaPedidos) {
    if (!aprova.has(p.obra_id)) continue;
    const entrega = p.entrega_em ? ` · entrega ${diaMes(p.entrega_em)}` : '';
    itens.push({
      chave: `p-${p.id}`, tipo: 'pedido', id: p.id, obraId: p.obra_id, obraNome: nomeDaObra(p.obras),
      titulo: p.material, sub: `${numero(p.quantidade)} ${p.unidade}${p.fornecedor ? ` · ${p.fornecedor}` : ''}${entrega}`,
      criadoEm: p.criado_em,
      // Entrega em até 2 dias e ainda sem aprovação.
      urgente: !!p.entrega_em && new Date(p.entrega_em).getTime() - Date.now() < 2 * 86_400_000,
    });
  }
  // Urgentes primeiro; depois as mais antigas.
  return itens.sort((a, b) => Number(b.urgente) - Number(a.urgente) || (a.criadoEm ?? '').localeCompare(b.criadoEm ?? ''));
}

// "há 3 h", "há 2 d"
export function idade(iso: string | null, agora = new Date()) {
  if (!iso) return '';
  const min = Math.max(0, Math.round((agora.getTime() - new Date(iso).getTime()) / 60_000));
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} d`;
}

// Desfazer uma aprovação ou recusa: o pedido volta a "solicitado", sem aprovador.
export async function voltarPedido(id: string) {
  const { error } = await supabase.from('pedidos_material').update({ status: 'solicitado', aprovador_id: null }).eq('id', id);
  if (error) throw error;
}
