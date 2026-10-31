import { describe, expect, it } from 'vitest';
import { agruparPorDia, conferirMidia, diarioEmTexto, duracaoLegivel, LIMITES_DIARIO, medidaReduzida, registroValido, registroVazio, tamanhoLegivel, type RegistroDiario } from './diario';

const reg = (id: string, obraId: string, data: string, criadoEm: string, extra: Partial<RegistroDiario> = {}): RegistroDiario => ({
  id, obraId, data, resumo: 'concretagem da laje', midias: [], criadoEm, atualizadoEm: criadoEm, ...extra,
});

describe('diário', () => {
  it('confere fotos e vídeos', () => {
    expect(conferirMidia({ mime: 'image/heic', bytes: 3_000_000 }, 0)).toBeNull();
    expect(conferirMidia({ mime: 'video/quicktime', bytes: 50_000_000, duracaoSeg: 45 }, 0)).toBeNull();
    expect(conferirMidia({ mime: 'video/mp4', bytes: 1, duracaoSeg: 61 }, 0)).toBe('video-longo');
    expect(conferirMidia({ mime: 'video/mp4', bytes: 200 * 1024 * 1024, duracaoSeg: 30 }, 0)).toBe('video-grande');
    expect(conferirMidia({ mime: 'application/pdf', bytes: 10 }, 0)).toBe('tipo');
    expect(conferirMidia({ mime: 'image/jpeg', bytes: 10 }, LIMITES_DIARIO.midiasPorRegistro)).toBe('muitas');
  });

  it('reduz a foto mantendo a proporção', () => {
    expect(medidaReduzida(4032, 3024)).toEqual({ largura: 1920, altura: 1440 });
    expect(medidaReduzida(3024, 4032)).toEqual({ largura: 1440, altura: 1920 });
    expect(medidaReduzida(800, 600)).toEqual({ largura: 800, altura: 600 });
  });

  it('agrupa por dia, mais novo em cima, e filtra por obra', () => {
    const lista = [
      reg('a', 'o1', '2026-10-30', '2026-10-30T10:00:00Z'),
      reg('b', 'o2', '2026-10-31', '2026-10-31T09:00:00Z'),
      reg('c', 'o1', '2026-10-31', '2026-10-31T15:00:00Z'),
    ];
    const dias = agruparPorDia(lista);
    expect(dias.map((d) => d.data)).toEqual(['2026-10-31', '2026-10-30']);
    expect(dias[0].registros.map((r) => r.id)).toEqual(['c', 'b']);
    expect(agruparPorDia(lista, 'o1').flatMap((d) => d.registros.map((r) => r.id))).toEqual(['c', 'a']);
  });

  it('valida registro e exige texto ou mídia', () => {
    expect(registroValido(reg('a', 'o', '2026-10-31', 'x') as never)).toBe(true);
    expect(registroValido({ ...reg('a', 'o', '31/10/2026', 'x') } as never)).toBe(false);
    expect(registroVazio('  ', 0)).toBe(true);
    expect(registroVazio('', 1)).toBe(false);
  });

  it('formata tamanho, duração e texto exportado', () => {
    expect(tamanhoLegivel(500_000)).toBe('488 KB');
    expect(tamanhoLegivel(5 * 1024 * 1024)).toBe('5,0 MB');
    expect(duracaoLegivel(65.4)).toBe('1:05');
    const dias = agruparPorDia([reg('a', 'o1', '2026-10-31', 'x', {
      midias: [{ id: 'm', tipo: 'foto', mime: 'image/jpeg', bytes: 1, duracaoSeg: null, largura: 1, altura: 1 }],
    })]);
    expect(diarioEmTexto(dias, () => 'Lote 39', (d) => d)).toContain('- Lote 39: concretagem da laje [1 foto]');
  });
});
