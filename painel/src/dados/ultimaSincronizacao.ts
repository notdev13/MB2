// Guarda no aparelho quando a última sincronização completa terminou (e qual conta usou este aparelho).
// O armazenamento vem por parâmetro para poder testar sem navegador.
type Armazem = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const CHAVE_ULTIMA = 'mb2-nuvem-ultima';
export const CHAVE_CONTA = 'mb2-nuvem-conta';

const padrao = (): Armazem | null => { try { return localStorage; } catch { return null; } };

export function lerUltima(a: Armazem | null = padrao()): string | null {
  try { return a?.getItem(CHAVE_ULTIMA) ?? null; } catch { return null; }
}
export function gravarUltima(iso: string, a: Armazem | null = padrao()) {
  try { a?.setItem(CHAVE_ULTIMA, iso); } catch { /* ignora */ }
}
export function limparUltima(a: Armazem | null = padrao()) {
  try { a?.removeItem(CHAVE_ULTIMA); } catch { /* ignora */ }
}

export function lerConta(a: Armazem | null = padrao()): string | null {
  try { return a?.getItem(CHAVE_CONTA) ?? null; } catch { return null; }
}
export function gravarConta(email: string, a: Armazem | null = padrao()) {
  try { a?.setItem(CHAVE_CONTA, email.trim().toLowerCase()); } catch { /* ignora */ }
}
