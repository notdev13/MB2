import { candidatosDoPrint, type LeituraPrint, type LinhaOcr } from '../dominio/saldoPrint';

// Lê o valor do saldo num print de tela, só neste aparelho. O leitor (tesseract.js) e o idioma só são
// baixados quando alguém usa "Ler do print" (import() dinâmico, em pedaços à parte). A imagem nunca
// sai do aparelho e não é guardada: fica na memória só durante a leitura. Tudo vem do mesmo endereço
// do painel (CSP: script-src/worker-src/connect-src 'self'). Guia: docs/privacidade.md

export const TAMANHO_MAX_IMAGEM = 15 * 1024 * 1024;
const LADO_MAX = 2000; // reduz prints enormes (memória do iPhone)
const LADO_MIN = 900; // amplia recortes pequenos: o leitor erra menos com letra maior
const TEMPO_MAX_MS = 45_000;

export type ResultadoPrint =
  | { ok: true; leitura: LeituraPrint }
  | { ok: false; erro: string };

const falha = (erro: string): ResultadoPrint => ({ ok: false, erro });

// Prepara a imagem: escala, tons de cinza e letra escura em fundo claro (app de banco no modo escuro
// vem ao contrário, e o leitor lê melhor texto escuro).
async function prepararImagem(arquivo: Blob): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(arquivo);
  try {
    const maior = Math.max(bmp.width, bmp.height);
    const escala = maior > LADO_MAX ? LADO_MAX / maior : maior < LADO_MIN ? Math.min(LADO_MIN / maior, 4) : 1;
    const tela = document.createElement('canvas');
    tela.width = Math.max(1, Math.round(bmp.width * escala));
    tela.height = Math.max(1, Math.round(bmp.height * escala));
    const ctx = tela.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('canvas');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, tela.width, tela.height);
    ctx.drawImage(bmp, 0, 0, tela.width, tela.height);
    const px = ctx.getImageData(0, 0, tela.width, tela.height);
    const d = px.data;
    let soma = 0;
    for (let i = 0; i < d.length; i += 4) {
      const g = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
      d[i] = d[i + 1] = d[i + 2] = g;
      soma += g;
    }
    if (soma / (d.length / 4) < 128) for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = 255 - d[i];
    ctx.putImageData(px, 0, 0);
    return tela;
  } finally {
    bmp.close();
  }
}

// Miniatura (data: URL, que o CSP já permite) para o dono conferir o que foi lido, sem liberar blob: nas imagens.
export async function miniaturaDoPrint(arquivo: Blob, lado = 480): Promise<string> {
  const bmp = await createImageBitmap(arquivo);
  try {
    const escala = Math.min(1, lado / Math.max(bmp.width, bmp.height));
    const tela = document.createElement('canvas');
    tela.width = Math.max(1, Math.round(bmp.width * escala));
    tela.height = Math.max(1, Math.round(bmp.height * escala));
    tela.getContext('2d')?.drawImage(bmp, 0, 0, tela.width, tela.height);
    return tela.toDataURL('image/jpeg', 0.8);
  } finally {
    bmp.close();
  }
}

const absoluto = (u: string) => new URL(u, window.location.href).href;

export async function lerSaldoDoPrint(arquivo: Blob): Promise<ResultadoPrint> {
  if (!/^image\//.test(arquivo.type)) return falha('Escolha uma imagem (print de tela).');
  if (arquivo.size > TAMANHO_MAX_IMAGEM) return falha('A imagem é grande demais (o limite é 15 MB).');

  let worker: { terminate: () => Promise<unknown> } | null = null;
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  try {
    const leitura = (async (): Promise<ResultadoPrint> => {
      const [{ createWorker }, trabalho, nucleo, tela] = await Promise.all([
        import('tesseract.js'),
        import('tesseract.js/dist/worker.min.js?url'),
        import('tesseract.js-core/tesseract-core-lstm.wasm.js?url'),
        prepararImagem(arquivo),
      ]);
      const w = await createWorker('eng', 1, {
        workerPath: absoluto(trabalho.default),
        corePath: absoluto(nucleo.default),
        langPath: absoluto('ocr'), // ocr/eng.traineddata.gz (vite.config.ts); o worker descompacta se vier .gz
        gzip: true,
        workerBlobURL: false, // CSP: sem worker por blob:
        cacheMethod: 'none',
        logger: () => {},
      });
      worker = w;
      // Só dígitos e símbolos de dinheiro: não inventa letras nem confunde 0 com O.
      await w.setParameters({ tessedit_char_whitelist: '0123456789.,-−R$S5 ' });
      for (const modo of ['6', '11'] as const) { // bloco de texto; depois texto solto (tela inteira)
        await w.setParameters({ tessedit_pageseg_mode: modo as never });
        const { data } = await w.recognize(tela, {}, { blocks: true });
        const linhas: LinhaOcr[] = (data.blocks ?? [])
          .flatMap((b) => b.paragraphs.flatMap((p) => p.lines))
          .map((l) => ({ texto: l.text, altura: l.bbox.y1 - l.bbox.y0 }));
        const r = candidatosDoPrint(linhas, data.confidence);
        if (r.candidatos.length > 0) return { ok: true, leitura: r };
      }
      return { ok: true, leitura: { candidatos: [], sugerido: null, incerto: false } };
    })();
    const limite = new Promise<ResultadoPrint>((ok) => {
      temporizador = setTimeout(() => ok(falha('A leitura demorou demais. Tente um recorte menor, só com o saldo.')), TEMPO_MAX_MS);
    });
    return await Promise.race([leitura, limite]);
  } catch {
    return falha('Não consegui ler esta imagem neste aparelho. Digite o saldo.');
  } finally {
    clearTimeout(temporizador);
    await (worker as { terminate: () => Promise<unknown> } | null)?.terminate().catch(() => {});
  }
}
