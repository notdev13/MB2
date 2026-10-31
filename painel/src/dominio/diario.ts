// Diário da obra: o resumo do dia (falado ou escrito) com fotos e vídeos curtos.
// Regras puras, com teste. Datas 'AAAA-MM-DD'; tamanhos em bytes; durações em segundos.

export interface MidiaDiario {
  id: string;
  tipo: 'foto' | 'video';
  mime: string;
  bytes: number;
  duracaoSeg: number | null; // só vídeo
  largura: number | null;
  altura: number | null;
}

export interface RegistroDiario {
  id: string;
  obraId: string;
  data: string; // AAAA-MM-DD
  resumo: string;
  midias: MidiaDiario[]; // só a descrição; o arquivo fica guardado à parte, pelo id
  criadoEm: string;
  atualizadoEm: string;
}

export type NovoRegistroDiario = Omit<RegistroDiario, 'id' | 'criadoEm' | 'atualizadoEm'>;

// Limites pensados para o iPhone: vídeo curto não lota o aparelho nem trava a gravação no banco.
export const LIMITES_DIARIO = {
  midiasPorRegistro: 12,
  videoMaxSeg: 60,
  videoMaxBytes: 100 * 1024 * 1024, // 100 MB (1 min em 1080p no iPhone fica perto de 60–130 MB)
  fotoLadoMaxPx: 1920, // foto é reduzida para no máximo este lado
  fotoQualidade: 0.82, // JPEG
  fotoMaxBytesOriginal: 40 * 1024 * 1024,
  resumoMaxCaracteres: 4000,
} as const;

export type ProblemaMidia = 'tipo' | 'video-longo' | 'video-grande' | 'foto-grande' | 'muitas';

// Confere um arquivo escolhido antes de guardar. duracaoSeg só é conhecida para vídeo.
export function conferirMidia(
  arq: { mime: string; bytes: number; duracaoSeg?: number | null },
  jaNoRegistro: number,
): ProblemaMidia | null {
  if (jaNoRegistro >= LIMITES_DIARIO.midiasPorRegistro) return 'muitas';
  const tipo = tipoDaMidia(arq.mime);
  if (!tipo) return 'tipo';
  if (tipo === 'foto') return arq.bytes > LIMITES_DIARIO.fotoMaxBytesOriginal ? 'foto-grande' : null;
  if (arq.duracaoSeg != null && arq.duracaoSeg > LIMITES_DIARIO.videoMaxSeg + 0.5) return 'video-longo';
  if (arq.bytes > LIMITES_DIARIO.videoMaxBytes) return 'video-grande';
  return null;
}

export function tipoDaMidia(mime: string): 'foto' | 'video' | null {
  if (/^image\//i.test(mime)) return 'foto';
  if (/^video\//i.test(mime)) return 'video';
  return null;
}

export const MENSAGEM_PROBLEMA: Record<ProblemaMidia, string> = {
  tipo: 'Esse arquivo não é foto nem vídeo.',
  'video-longo': `O vídeo passa de ${LIMITES_DIARIO.videoMaxSeg} segundos. Grave um trecho mais curto.`,
  'video-grande': 'O vídeo é grande demais (mais de 100 MB). Grave mais curto ou em qualidade menor.',
  'foto-grande': 'A foto é grande demais para guardar.',
  muitas: `Cada registro guarda até ${LIMITES_DIARIO.midiasPorRegistro} fotos ou vídeos. Crie outro registro para o restante.`,
};

// Medidas para reduzir a foto mantendo a proporção.
export function medidaReduzida(largura: number, altura: number, ladoMax: number = LIMITES_DIARIO.fotoLadoMaxPx) {
  const maior = Math.max(largura, altura);
  if (maior <= ladoMax) return { largura, altura };
  const f = ladoMax / maior;
  return { largura: Math.round(largura * f), altura: Math.round(altura * f) };
}

export interface DiaDoDiario {
  data: string;
  registros: RegistroDiario[];
}

// Linha do tempo: dias do mais novo para o mais antigo; no mesmo dia, o mais recente em cima.
export function agruparPorDia(registros: RegistroDiario[], obraId?: string | null): DiaDoDiario[] {
  const filtrados = registros.filter((r) => !obraId || r.obraId === obraId);
  const ordenados = [...filtrados].sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm));
  const dias: DiaDoDiario[] = [];
  for (const r of ordenados) {
    const ult = dias[dias.length - 1];
    if (ult && ult.data === r.data) ult.registros.push(r);
    else dias.push({ data: r.data, registros: [r] });
  }
  return dias;
}

export function registroValido(r: Record<string, unknown>): boolean {
  const txt = (v: unknown) => typeof v === 'string';
  return txt(r.id) && txt(r.obraId) && typeof r.data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.data) &&
    txt(r.resumo) && Array.isArray(r.midias) && txt(r.criadoEm) && txt(r.atualizadoEm) &&
    (r.midias as Record<string, unknown>[]).every((m) => m && txt(m.id) && (m.tipo === 'foto' || m.tipo === 'video') &&
      txt(m.mime) && Number.isSafeInteger(m.bytes));
}

// Precisa de ao menos o resumo ou uma mídia.
export function registroVazio(resumo: string, midias: number): boolean {
  return resumo.trim() === '' && midias === 0;
}

export function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1).replace('.', ',') : Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(1).replace('.', ',')} GB`;
}

export function duracaoLegivel(seg: number | null): string {
  if (seg == null || !Number.isFinite(seg)) return '';
  const s = Math.round(seg);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Exportação em texto (o arquivo das fotos e vídeos não vai junto: eles são baixados um a um).
export function diarioEmTexto(dias: DiaDoDiario[], nomeObra: (id: string) => string, dataBR: (d: string) => string): string {
  const linhas: string[] = ['DIÁRIO DE OBRA · MB2', ''];
  for (const d of dias) {
    linhas.push(dataBR(d.data));
    for (const r of d.registros) {
      const fotos = r.midias.filter((m) => m.tipo === 'foto').length;
      const videos = r.midias.length - fotos;
      const anexos = [fotos && `${fotos} foto${fotos > 1 ? 's' : ''}`, videos && `${videos} vídeo${videos > 1 ? 's' : ''}`].filter(Boolean).join(', ');
      linhas.push(`- ${nomeObra(r.obraId)}: ${r.resumo.trim() || '(sem texto)'}${anexos ? ` [${anexos}]` : ''}`);
    }
    linhas.push('');
  }
  return linhas.join('\n');
}
