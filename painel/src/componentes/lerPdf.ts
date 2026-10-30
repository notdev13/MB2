import { agruparEmLinhas, candidatosDoTexto, type CandidatosPdf, type ItemTexto } from '../dominio/extratoPdf';
import { ehPdf, MAX_PAGINAS, TAMANHO_MAX_PDF } from './pdfLimites';

// Lê o TEXTO de um PDF, só neste aparelho. O pdf.js (biblioteca grande) só é baixado quando alguém
// importa um PDF (import() dinâmico em um pedaço à parte). Nada é enviado: o arquivo vem da memória,
// não há endereço para buscar, o worker vem do mesmo endereço do painel (CSP: worker-src 'self').
// Sem OCR: PDF que é só imagem é recusado.

const MIN_CARACTERES = 40; // menos texto que isso = PDF escaneado (imagem)
const MAX_CARACTERES = 2_000_000;
const TEMPO_MAX_MS = 30_000;

export type LeituraPdf =
  | { ok: true; linhas: string[]; paginas: number; lidas: number }
  | { ok: false; erro: string };

const falha = (erro: string): LeituraPdf => ({ ok: false, erro });

export type CandidatosDoPdf =
  | { ok: true; candidatos: CandidatosPdf; paginas: number; lidas: number }
  | { ok: false; erro: string };

// Do PDF sai só a lista de candidatos (trechos já mascarados): o texto inteiro não é guardado.
export async function lerCandidatosDoPdf(bytes: ArrayBuffer): Promise<CandidatosDoPdf> {
  const r = await lerLinhasDoPdf(bytes);
  return r.ok ? { ok: true, candidatos: candidatosDoTexto(r.linhas), paginas: r.paginas, lidas: r.lidas } : r;
}

export async function lerLinhasDoPdf(bytes: ArrayBuffer): Promise<LeituraPdf> {
  let tarefa: { promise: Promise<unknown>; destroy: () => Promise<void> } | null = null;
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  try {
    if (bytes.byteLength > TAMANHO_MAX_PDF) return falha('O PDF é grande demais (o limite é 10 MB).');
    if (!ehPdf(new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 1024)))) return falha('Este arquivo não é um PDF válido.');

    const [pdfjs, worker] = await Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
    ]);
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

    const carregando = pdfjs.getDocument({
      data: new Uint8Array(bytes),
      // Só texto: sem fontes, sem imagens, sem scripts, sem buscar nada fora.
      disableFontFace: true, useSystemFonts: false, enableXfa: false, isImageDecoderSupported: false,
      useWorkerFetch: false, disableAutoFetch: true, disableStream: true, disableRange: true, verbosity: 0,
    });
    tarefa = carregando;
    const limite = new Promise<never>((_, rejeitar) => {
      temporizador = setTimeout(() => rejeitar(new Error('tempo')), TEMPO_MAX_MS);
    });
    const doc = await Promise.race([carregando.promise, limite]);

    const paginas = doc.numPages;
    const lidas = Math.min(paginas, MAX_PAGINAS);
    const linhas: string[] = [];
    let caracteres = 0;
    for (let n = 1; n <= lidas && caracteres <= MAX_CARACTERES; n++) {
      const pagina = await doc.getPage(n);
      const conteudo = await pagina.getTextContent();
      const itens: ItemTexto[] = [];
      for (const it of conteudo.items) {
        if (!('str' in it) || typeof it.str !== 'string') continue;
        caracteres += it.str.length;
        // transform = [a, b, c, d, x, y]
        itens.push({ str: it.str, x: it.transform[4], y: it.transform[5] });
      }
      // Cada página no seu "bloco": a altura reinicia a cada página.
      linhas.push(...agruparEmLinhas(itens));
      pagina.cleanup();
    }
    if (caracteres < MIN_CARACTERES) {
      return falha('Este PDF é uma imagem, não tem texto. Baixe o extrato em OFX.');
    }
    return { ok: true, linhas, paginas, lidas };
  } catch (e) {
    const nome = (e as { name?: string } | null)?.name;
    if (nome === 'PasswordException') return falha('Este PDF tem senha. Baixe o extrato sem senha.');
    if ((e as Error | null)?.message === 'tempo') return falha('O PDF demorou demais para ser lido.');
    return falha('Não consegui ler este PDF. O arquivo pode estar corrompido.');
  } finally {
    clearTimeout(temporizador);
    try {
      await tarefa?.destroy(); // encerra o worker e solta o arquivo da memória
    } catch {
      /* já encerrado */
    }
  }
}
