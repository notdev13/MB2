// Confere a configuração da nuvem na hora de gerar o painel (usada pelo vite.config.ts).
// Funções puras, sem dependências. Problemas voltam em português; lista vazia = tudo certo.

// VITE_EXIGIR_LOGIN: qualquer valor definido, exceto vazio, 0 e false, liga a exigência.
export function exigirLogin(valor: string | undefined): boolean {
  const v = (valor ?? '').trim().toLowerCase();
  return v !== '' && v !== '0' && v !== 'false';
}

function problemaDaUrl(bruta: string | undefined): string | null {
  const texto = (bruta ?? '').trim();
  if (!texto) return 'falta o endereço do banco (variável SUPABASE_URL no GitHub)';
  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    return 'o endereço do banco (SUPABASE_URL) não é válido; ele deve ser parecido com https://seu-projeto.supabase.co';
  }
  if (url.protocol !== 'https:') return 'o endereço do banco (SUPABASE_URL) precisa começar com https://';
  if (!url.hostname) return 'o endereço do banco (SUPABASE_URL) está sem o nome do site';
  if ((url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) {
    return 'o endereço do banco (SUPABASE_URL) deve ser só o endereço do projeto, sem caminho (sem /rest/v1 ou parecido)';
  }
  return null;
}

export function validarConfigNuvem(url: string | undefined, chave: string | undefined): string[] {
  const problemas: string[] = [];
  const da = problemaDaUrl(url);
  if (da) problemas.push(da);
  if (!(chave ?? '').trim()) problemas.push('falta a chave pública do banco (variável SUPABASE_CHAVE no GitHub)');
  return problemas;
}
