import { supabase } from './supabase';

// Mesmos valores do tipo papel_obra no banco.
export type PapelObra = 'responsavel' | 'engenheiro' | 'mestre' | 'visualizador';
export type Membro = { perfil_id: string; nome: string; email: string | null; papel: PapelObra };

export const PAPEIS: Record<PapelObra, string> = {
  responsavel: 'Responsável',
  engenheiro: 'Engenheiro',
  mestre: 'Mestre',
  visualizador: 'Visualizador',
};

// Erro com mensagem pronta para mostrar (as funções do banco já respondem em português).
export class ErroEquipe extends Error {}

// 42501 = sem permissão; P0002 = e-mail sem conta; 22023 = papel inválido
function traduzir(error: { code?: string; message: string }) {
  if (error.code === '42501' || error.code === 'P0002' || error.code === '22023') return new ErroEquipe(error.message);
  return error;
}

export async function listarEquipe(obraId: string): Promise<Membro[]> {
  const { data, error } = await supabase.rpc('listar_equipe', { p_obra: obraId });
  if (error) throw traduzir(error);
  return (data ?? []) as Membro[];
}

// Devolve o nome da pessoa adicionada.
export async function adicionarMembro(obraId: string, email: string, papel: PapelObra): Promise<string> {
  const { data, error } = await supabase.rpc('adicionar_membro', { p_obra: obraId, p_email: email.trim(), p_papel: papel });
  if (error) throw traduzir(error);
  return String(data ?? email);
}

export async function removerMembro(obraId: string, perfilId: string) {
  const { error } = await supabase.rpc('remover_membro', { p_obra: obraId, p_perfil: perfilId });
  if (error) throw traduzir(error);
}
