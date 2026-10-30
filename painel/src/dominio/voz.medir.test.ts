import { describe, expect, it } from 'vitest';
import { interpretarFala } from './voz';
import { contextoDe, CONTEXTO, TODOS_OS_CASOS, type Caso } from './voz.casos';
import { gerarAdjacentes, gerarCaos, gerarCasos, gerarCego, gerarCegoB, gerarDuplos, gerarFamilias, gerarServicos } from './voz.fuzz';

// Mede o interpretador de voz contra os casos escritos à mão (voz.casos.*.ts) e contra os gerados (voz.fuzz.ts).
// `npm run voz:medir` imprime a taxa de acerto por campo e a lista de falhas; no `npm run check` só confere as garantias abaixo.

const ENV = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env;
const CAMPOS = ['valor', 'data', 'pagamento', 'pago', 'categoria', 'obraId', 'fornecedor'] as const;
type Campo = (typeof CAMPOS)[number];

interface Falha { frase: string; campo: Campo; esperado: unknown; veio: unknown; tipo: string; valorErrado: boolean }

function medir(casos: Caso[]) {
  const certos: Record<string, number> = {};
  const total: Record<string, number> = {};
  const falhas: Falha[] = [];
  let valorErrado = 0;
  let valorNaoEntendido = 0;
  for (const c of casos) {
    const r = interpretarFala(c.frase, contextoDe(c));
    for (const campo of CAMPOS) {
      if (!(campo in c.esperado)) continue;
      const esperado = c.esperado[campo];
      const veio = r[campo];
      total[campo] = (total[campo] ?? 0) + 1;
      if (veio === esperado || (campo === 'valor' && c.tolerante && veio === null)) { certos[campo] = (certos[campo] ?? 0) + 1; continue; }
      const errado = campo === 'valor' && veio !== null;
      if (campo === 'valor') { if (errado) valorErrado++; else valorNaoEntendido++; }
      falhas.push({ frase: c.frase, campo, esperado, veio, tipo: c.tipo, valorErrado: errado });
    }
  }
  return { certos, total, falhas, valorErrado, valorNaoEntendido };
}

const NIVEIS = [1, 2, 3, 4, 5, 6]; // do simples ao difícil; 3 sementes de 120 frases por nível
const BASE = Number(ENV.VOZ_BASE ?? 0); // VOZ_BASE=100 testa frases novas, nunca vistas
const gerados = NIVEIS.flatMap((nivel) => [1, 2, 3].flatMap((k) => gerarCasos(BASE + nivel * 10 + k, 120, nivel)));

// Frases de caos: o valor tem que ser o certo ou null
const caosPerigoso = [1, 2, 3, 4, 5].flatMap((k) => gerarCaos(BASE + 1000 + k, 600, true));
const duplos = [1, 2, 3].flatMap((k) => gerarDuplos(BASE + 3000 + k, 800));
const familias = [1, 2, 3].flatMap((k) => gerarFamilias(BASE + 4000 + k, 800));
const fuzz = [1, 2, 3].flatMap((k) => [...gerarAdjacentes(BASE + 5000 + k, 700), ...gerarServicos(BASE + 6000 + k, 700), ...gerarCego(BASE + 7000 + k, 700), ...gerarCegoB(BASE + 8000 + k, 700)]);
const caos = [1, 2, 3, 4, 5].flatMap((k) => gerarCaos(BASE + 2000 + k, 600));

describe('casos da voz', () => {
  const ativos = TODOS_OS_CASOS.filter((c) => !c.pendente);
  const fixos = medir(ativos);
  // a taxa de brancos conta também os casos pendentes (falhas conhecidas), para não maquiar o resultado
  const comValor = TODOS_OS_CASOS.filter((c) => typeof c.esperado.valor === 'number');
  const comuns = comValor.filter((c) => !c.tolerante && !c.dificil);
  const ger = medir(gerados);
  const cao = medir(caos);
  const duplo = medir(duplos);
  const fz = medir(fuzz);
  const fzMarcadas = fuzz.filter((c) => c.tipo.endsWith('marcado'));
  const fzBranco = fzMarcadas.filter((c) => interpretarFala(c.frase, CONTEXTO).valor === null);
  const familia = medir(familias);
  const caoPerigoso = medir(caosPerigoso);
  const brancosComuns = comuns.filter((c) => interpretarFala(c.frase, contextoDe(c)).valor === null);

  it('imprime o relatório (npm run voz:medir)', () => {
    if (!ENV.VOZ_MEDIR) return;
    const linhas: string[] = [`\nfrases em branco entre as ${comuns.length} comuns: ${brancosComuns.length} (${((brancosComuns.length / comuns.length) * 100).toFixed(2)}%)`, ...brancosComuns.map((c) => `   - ${c.frase}`)];
    for (const [nome, m, n] of [['casos escritos à mão', medir(TODOS_OS_CASOS), TODOS_OS_CASOS.length], ['gerados', ger, gerados.length], ['caos', cao, caos.length], ['duplos', duplo, duplos.length], ['fuzz (adjacentes, serviços, cego)', fz, fuzz.length], ['famílias', familia, familias.length], ['caos-perigoso', caoPerigoso, caosPerigoso.length]] as const) {
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

  it('casos escritos à mão com ruído de fala (prefixo, sufixo, caixa): o valor não muda', () => {
    const mutacoes: [string, (f: string) => string][] = [
      ['então… né', (f) => `Então, ${f} né`], ['por favor', (f) => `${f}, por favor`], ['bom dia', (f) => `Bom dia, ${f}`],
      ['caixa alta', (f) => f.toUpperCase()], ['maiúscula e ponto', (f) => f[0].toUpperCase() + f.slice(1) + '.'],
      ['pra mim', (f) => `Olha, ${f} pra mim, obrigado`],
    ];
    const amostra = comuns.filter((_, k) => k % 3 === 0); // um terço dos casos comuns, para o teste ser rápido
    for (const [nome, mutar] of mutacoes) {
      const errados: string[] = [];
      const brancos: string[] = [];
      for (const c of amostra) {
        const v = interpretarFala(mutar(c.frase), contextoDe(c)).valor;
        if (v === null) brancos.push(mutar(c.frase));
        else if (v !== c.esperado.valor) errados.push(`${mutar(c.frase)} => ${v} (esperado ${c.esperado.valor})`);
      }
      if (ENV.VOZ_MEDIR) console.log(`  mutação "${nome}": errados=${errados.length}, em branco=${brancos.length}/${amostra.length}`, errados.slice(0, 8), brancos.slice(0, 8));
      expect(errados, nome).toEqual([]);
      expect(brancos.length / amostra.length, nome).toBeLessThan(0.03);
    }
  });

  it('casos escritos à mão: todos passam (regressão), nenhum valor errado', () => {
    expect(fixos.falhas).toEqual([]);
  });

  it('frases comuns quase nunca ficam em branco (excesso de cautela)', () => {
    expect(brancosComuns.length / comuns.length).toBeLessThan(0.01);
  });

  it('nunca devolve valor errado (na dúvida, null)', () => {
    expect(ger.falhas.filter((f) => f.valorErrado)).toEqual([]);
  });

  it('caos: nunca devolve outro número como valor', () => {
    expect(cao.falhas.filter((f) => f.valorErrado)).toEqual([]);
    expect(caoPerigoso.falhas.filter((f) => f.valorErrado)).toEqual([]);
    expect(duplo.falhas.filter((f) => f.valorErrado)).toEqual([]);
    expect(familia.falhas.filter((f) => f.valorErrado)).toEqual([]);
    expect(fz.falhas.filter((f) => f.valorErrado)).toEqual([]);
  });

  it('caos com números inofensivos: ainda acha o valor', () => {
    // 0,95: quantidade colada ao valor ("cem sacos R$ 250", "R$ 90 5 horas") é dúvida de propósito
    expect((cao.certos.valor ?? 0) / cao.total.valor).toBeGreaterThan(0.95);
  });

  it('fuzz: valor com "R$"/"reais" colado quase nunca fica em branco', () => {
    if (ENV.VOZ_MEDIR) console.log(`fuzz marcadas em branco: ${fzBranco.length}/${fzMarcadas.length}`, fzBranco.slice(0, 15).map((c) => c.frase));
    expect(fzBranco.length / fzMarcadas.length).toBeLessThan(0.03);
  });

  it('entende o valor na grande maioria das frases geradas', () => {
    expect((ger.certos.valor ?? 0) / ger.total.valor).toBeGreaterThan(0.97);
  });
});
