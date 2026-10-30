// Limites e conferência de cabeçalho do PDF. Arquivo pequeno de propósito: fica no pacote principal,
// enquanto a leitura de verdade (pdf.js) só é baixada quando alguém importa um PDF.
export const TAMANHO_MAX_PDF = 10 * 1024 * 1024; // 10 MB
export const MAX_PAGINAS = 30;

// Todo PDF começa com "%PDF-" (nos primeiros bytes).
export function ehPdf(inicio: Uint8Array): boolean {
  const cab = new TextDecoder('latin1').decode(inicio.subarray(0, 1024));
  return cab.includes('%PDF-');
}
