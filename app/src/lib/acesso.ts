import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Mesmos valores do tipo papel_empresa no banco.
export type Funcao = 'diretoria' | 'engenheiro' | 'mestre' | 'visualizador';
export type Situacao = 'pendente' | 'ativo' | 'bloqueado';

export const FUNCOES: Record<Funcao, string> = {
  engenheiro: 'Engenheiro',
  mestre: 'Mestre de obras',
  visualizador: 'Visualizador',
  diretoria: 'Diretoria',
};

export const O_QUE_FAZ: Record<Funcao, string> = {
  engenheiro: 'Vê e edita as obras escolhidas, aprova pedidos e vê custos.',
  mestre: 'Registra diário, fotos, pedidos e ocorrências nas obras escolhidas.',
  visualizador: 'Só acompanha as obras escolhidas, sem editar.',
  diretoria: 'Vê todas as obras, custos, e aprova contas e convites.',
};

export type Conta = { id: string; nome: string; email: string | null; papel: Funcao; situacao: Situacao; criado_em: string; obras: string[] };
export type Convite = { codigo: string; nome: string; email: string | null; papel: Funcao; obras: string[]; expira_em: string; usado_em: string | null };
export type ConvitePublico = { nome: string; email: string | null; papel: Funcao; obras: string[]; expira_em: string };
export type ObraCurta = { id: string; nome: string };

export class ErroAcesso extends Error {}

// 42501 = sem permissão; P0002 = não encontrado; 22023 = faltou dado. O banco já responde em português.
function traduzir(error: { code?: string; message: string }) {
  if (error.code === '42501' || error.code === 'P0002' || error.code === '22023') return new ErroAcesso(error.message);
  return error;
}

// ABCD2345 -> ABCD-2345
export const formatarCodigo = (c: string) => (c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c);
export const limparCodigo = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '');

// Lê o código de links como mb2obras://convite/ABCD2345 ou ...?codigo=ABCD-2345
export function codigoDoLink(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/convite(?:\/|\?codigo=)([A-Za-z0-9-]{8,9})/);
  return m ? limparCodigo(m[1]) : null;
}

export async function minhaSituacao(userId: string): Promise<{ situacao: Situacao; papel: Funcao } | null> {
  const { data, error } = await supabase.from('perfis').select('situacao, papel').eq('id', userId).maybeSingle();
  if (error || !data) return null;
  return data as { situacao: Situacao; papel: Funcao };
}

export async function contarPendentes(): Promise<number> {
  const { count } = await supabase.from('perfis').select('id', { count: 'exact', head: true }).eq('situacao', 'pendente');
  return count ?? 0;
}

export async function listarObras(): Promise<ObraCurta[]> {
  const { data, error } = await supabase.from('obras').select('id, nome').eq('arquivada', false).order('nome');
  if (error) throw error;
  return data ?? [];
}

export async function listarContas(): Promise<Conta[]> {
  const { data, error } = await supabase.rpc('listar_contas');
  if (error) throw traduzir(error);
  return (data ?? []) as Conta[];
}

export async function aprovarConta(perfilId: string, papel: Funcao, obras: string[]) {
  const { error } = await supabase.rpc('aprovar_conta', { p_perfil: perfilId, p_papel: papel, p_obras: obras });
  if (error) throw traduzir(error);
}

export async function bloquearConta(perfilId: string) {
  const { error } = await supabase.rpc('bloquear_conta', { p_perfil: perfilId });
  if (error) throw traduzir(error);
}

export async function criarConvite(nome: string, email: string, papel: Funcao, obras: string[]): Promise<string> {
  const { data, error } = await supabase.rpc('criar_convite', { p_nome: nome.trim(), p_email: email.trim(), p_papel: papel, p_obras: obras });
  if (error) throw traduzir(error);
  return String(data);
}

// Convites ainda não usados nem cancelados (a diretoria lê direto pela tabela).
export async function listarConvites(obras: ObraCurta[]): Promise<Convite[]> {
  const { data, error } = await supabase
    .from('convites')
    .select('codigo, nome, email, papel, obras, expira_em, usado_em')
    .eq('cancelado', false)
    .is('usado_por', null)
    .gt('expira_em', new Date().toISOString())
    .order('criado_em', { ascending: false });
  if (error) throw error;
  const nomes = new Map(obras.map((o) => [o.id, o.nome]));
  return (data ?? []).map((c) => ({ ...c, obras: (c.obras as string[]).map((id) => nomes.get(id) ?? 'Obra') })) as Convite[];
}

export async function cancelarConvite(codigo: string) {
  const { error } = await supabase.from('convites').update({ cancelado: true }).eq('codigo', codigo);
  if (error) throw error;
}

export async function verConvite(codigo: string): Promise<ConvitePublico> {
  const { data, error } = await supabase.rpc('ver_convite', { p_codigo: limparCodigo(codigo) });
  if (error) throw traduzir(error);
  const linha = (data as ConvitePublico[] | null)?.[0];
  if (!linha) throw new ErroAcesso('Código inválido, vencido ou já usado. Peça um novo à diretoria.');
  return linha;
}

export async function usarConvite(codigo: string) {
  const { error } = await supabase.rpc('usar_convite', { p_codigo: limparCodigo(codigo) });
  if (error) throw traduzir(error);
}

export function textoDoConvite(c: { codigo: string; nome: string; papel: Funcao; expira_em: string }) {
  const ate = new Date(c.expira_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const primeiro = c.nome.trim().split(/\s+/)[0];
  return (
    `Olá, ${primeiro}! Seu acesso ao app MB2 Obras está liberado como ${FUNCOES[c.papel]}.\n\n` +
    `1. Abra o app MB2 Obras e toque em "Criar conta".\n` +
    `2. Use o código de convite: ${formatarCodigo(c.codigo)}\n\n` +
    `Com o app instalado, este link já preenche o código: mb2obras://convite/${c.codigo}\n\n` +
    `O código vale até ${ate} e só pode ser usado uma vez.`
  );
}

// Diretoria cria a conta pela pessoa. Usa um cliente separado, sem guardar sessão,
// para não trocar o login de quem está criando. O convite libera as permissões.
export async function criarContaManual(p: { nome: string; email: string; senha: string; papel: Funcao; obras: string[] }) {
  const codigo = await criarConvite(p.nome, p.email, p.papel, p.obras);
  const avulso = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL!, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'mb2-conta-manual' },
  });
  const { data, error } = await avulso.auth.signUp({
    email: p.email.trim(),
    password: p.senha,
    options: { data: { nome: p.nome.trim(), convite: codigo, senha_provisoria: true } },
  });
  // Conta já existente: o Supabase devolve usuário sem identidades em vez de erro.
  const jaExiste = error?.code === 'user_already_exists' || error?.code === 'email_exists' || (data.user && data.user.identities?.length === 0);
  if (jaExiste) {
    await cancelarConvite(codigo);
    throw new ErroAcesso('Já existe uma conta com esse e-mail. Aprove a pessoa na aba Contas.');
  }
  if (error) {
    await cancelarConvite(codigo);
    throw new ErroAcesso(
      error.code === 'weak_password'
        ? 'Senha provisória fraca. Use pelo menos 8 letras e números.'
        : error.code === 'signup_disabled'
          ? 'A criação de contas está desligada no Supabase (Enable sign ups).'
          : 'Não foi possível criar a conta. Confira o e-mail e a conexão.',
    );
  }
  if (data.session) await avulso.auth.signOut({ scope: 'local' });
  return { precisaConfirmarEmail: !data.session };
}
