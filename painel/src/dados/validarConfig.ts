// Confere a configuração da nuvem na hora de gerar o painel (usada pelo vite.config.ts).
// Função pura, sem dependências. Devolve a lista de problemas, em português; vazia = tudo certo.
export function validarConfigNuvem(url: string | undefined, chave: string | undefined): string[] {
  const problemas: string[] = [];
  const u = (url ?? '').trim();
  if (!u) problemas.push('falta o endereço do banco (variável SUPABASE_URL no GitHub)');
  else if (!u.startsWith('https://')) problemas.push('o endereço do banco (SUPABASE_URL) precisa começar com https://');
  if (!(chave ?? '').trim()) problemas.push('falta a chave pública do banco (variável SUPABASE_CHAVE no GitHub)');
  return problemas;
}
