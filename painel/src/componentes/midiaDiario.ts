import { LIMITES_DIARIO, medidaReduzida } from '../dominio/diario';

// Preparo das fotos e vídeos no próprio aparelho, antes de guardar.

// Reduz a foto (lado maior até 1920 px, JPEG 82%). Uma foto de 12 MP do iPhone (3–5 MB) cai para
// perto de 400–700 KB. Se o navegador não conseguir abrir a imagem, guarda o arquivo original.
export async function comprimirFoto(arq: Blob): Promise<{ blob: Blob; largura: number | null; altura: number | null }> {
  try {
    const bmp = await createImageBitmap(arq, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    const { largura, altura } = medidaReduzida(bmp.width, bmp.height);
    const canvas = document.createElement('canvas');
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('sem canvas');
    ctx.drawImage(bmp, 0, 0, largura, altura);
    bmp.close?.();
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', LIMITES_DIARIO.fotoQualidade));
    if (!blob) throw new Error('sem jpeg');
    // Se a "reduzida" ficou maior (foto já pequena), fica a original.
    return blob.size < arq.size ? { blob, largura, altura } : { blob: arq, largura, altura };
  } catch {
    return { blob: arq, largura: null, altura: null };
  }
}

// Lê duração e medidas do vídeo sem tocá-lo. O vídeo é guardado como veio (o iPhone já comprime em HEVC/H.264).
export function lerVideo(arq: Blob): Promise<{ duracaoSeg: number | null; largura: number | null; altura: number | null }> {
  return new Promise((ok) => {
    const url = URL.createObjectURL(arq);
    const v = document.createElement('video');
    const fim = (r: { duracaoSeg: number | null; largura: number | null; altura: number | null }) => {
      URL.revokeObjectURL(url);
      ok(r);
    };
    const tempo = setTimeout(() => fim({ duracaoSeg: null, largura: null, altura: null }), 8000);
    v.preload = 'metadata';
    v.muted = true;
    v.onloadedmetadata = () => {
      clearTimeout(tempo);
      fim({ duracaoSeg: Number.isFinite(v.duration) ? v.duration : null, largura: v.videoWidth || null, altura: v.videoHeight || null });
    };
    v.onerror = () => { clearTimeout(tempo); fim({ duracaoSeg: null, largura: null, altura: null }); };
    v.src = url;
  });
}
