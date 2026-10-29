import { describe, expect, it } from 'vitest';
import { CASOS_FIXOS, CONTEXTO, gerarCasos, type Caso } from './voz.corpus';
import { interpretarFala } from './voz';

// Mede o interpretador de voz contra o corpus (fixo + gerado). `npm run voz:medir` imprime a taxa
// de acerto por campo e a lista de falhas; no `npm run check` só confere as garantias abaixo.

const ENV = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;
const CAMPOS = ['valor', 'data', 'pagamento', 'pago', 'categoria', 'obraId'] as const;
type Campo = (typeof CAMPOS)[number];

interface Falha { frase: string; campo: Campo; esperado: unknown; veio: unknown; tipo: string; valorErrado: boolean }

function medir(casos: Caso[]) {
  const certos: Record<string, number> = {};
  const total: Record<string, number> = {};
  const falhas: Falha[] = [];
  let valorErrado = 0;
  let valorNaoEntendido = 0;
  for (const c of casos) {
    const r = interpretarFala(c.frase, CONTEXTO);
    for (const campo of CAMPOS) {
      if (!(campo in c.esperado)) continue;
      const esperado = c.esperado[campo];
      const veio = r[campo];
      total[campo] = (total[campo] ?? 0) + 1;
      if (veio === esperado) { certos[campo] = (certos[campo] ?? 0) + 1; continue; }
      const errado = campo === 'valor' && veio !== null;
      if (campo === 'valor') { if (errado) valorErrado++; else valorNaoEntendido++; }
      falhas.push({ frase: c.frase, campo, esperado, veio, tipo: c.tipo, valorErrado: errado });
    }
  }
  return { certos, total, falhas, valorErrado, valorNaoEntendido };
}

const RODADAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const NIVEL = (rodada: number) => Math.min(4, Math.ceil(rodada / 2)); // frases mais difíceis a cada rodada
const BASE = Number(ENV.VOZ_BASE ?? 0); // VOZ_BASE=100 testa frases novas, nunca vistas
const gerados = RODADAS.flatMap((rod) => gerarCasos(BASE + rod, 150, NIVEL(rod)));

describe('corpus da voz', () => {
  const fixos = medir(CASOS_FIXOS.filter((c) => !c.pendente));
  const ger = medir(gerados);

  it('imprime o relatório (npm run voz:medir)', () => {
    if (!ENV.VOZ_MEDIR) return;
    const linhas: string[] = [];
    for (const [nome, m, n] of [['fixos', medir(CASOS_FIXOS), CASOS_FIXOS.length], ['gerados', ger, gerados.length]] as const) {
      linhas.push(`\n== ${nome}: ${n} frases`);
      for (const campo of CAMPOS) {
        if (m.total[campo]) linhas.push(`  ${campo.padEnd(9)} ${(((m.certos[campo] ?? 0) / m.total[campo]) * 100).toFixed(1)}%  (${m.certos[campo] ?? 0}/${m.total[campo]})`);
      }
      linhas.push(`  VALOR ERRADO: ${m.valorErrado}   valor não entendido: ${m.valorNaoEntendido}`);
      const porTipo = new Map<string, number>();
      for (const f of m.falhas) porTipo.set(`${f.campo} ${f.tipo.replace(/\/m\d$/, '')}`, (porTipo.get(`${f.campo} ${f.tipo.replace(/\/m\d$/, '')}`) ?? 0) + 1);
      linhas.push('  falhas por tipo: ' + [...porTipo].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join(', '));
      const max = Number(ENV.VOZ_MAX ?? 40);
      for (const f of m.falhas.slice(0, max)) {
        linhas.push(`   - [${f.campo}${f.valorErrado ? ' ERRADO' : ''}] "${f.frase}" esperado=${JSON.stringify(f.esperado)} veio=${JSON.stringify(f.veio)}`);
      }
    }
    console.log(linhas.join('\n'));
  });

  it('casos fixos: todos passam (regressão)', () => {
    expect(fixos.falhas).toEqual([]);
  });

  it('nunca devolve valor errado (na dúvida, null)', () => {
    expect(ger.falhas.filter((f) => f.valorErrado)).toEqual([]);
  });

  it('entende o valor na grande maioria das frases geradas', () => {
    expect((ger.certos.valor ?? 0) / ger.total.valor).toBeGreaterThan(0.97);
  });
});
