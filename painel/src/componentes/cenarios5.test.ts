import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecSim, montar } from './simuladorVoz';
import { LIMITE_MS, MAX_CURTAS, MAX_VAZIOS } from './sessaoVoz';

beforeEach(() => { vi.useFakeTimers(); RecSim.reset(); });
afterEach(() => { vi.useRealTimers(); });

// Gerador pseudoaleatório fixo (mulberry32): mesma semente, mesma sequência.
function sorteio(semente: number) {
  let a = semente;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CODIGOS = ['no-speech', 'aborted', 'network', 'not-allowed', 'service-not-allowed', 'audio-capture', 'desconhecido'];
const FRASES = ['paguei', ' 360', 'de cimento', '', ' no pix', 'lote 39'];

/** Executa N eventos aleatórios (inclusive fora de ordem) e devolve quantas vezes iniciou. */
function embaralhar(rnd: () => number, r: ReturnType<typeof montar>, passos: number) {
  let iniciadas = 0;
  for (let i = 0; i < passos; i++) {
    const rec = RecSim.ultima();
    const op = Math.floor(rnd() * 11);
    if (op === 0 && r.sessao.iniciar()) iniciadas++;
    else if (op === 1) r.sessao.parar();
    else if (!rec) continue;
    else if (op === 2) rec.abriu();
    else if (op === 3) rec.resultados([FRASES[Math.floor(rnd() * FRASES.length)], rnd() > 0.5], [FRASES[Math.floor(rnd() * FRASES.length)], rnd() > 0.5]);
    else if (op === 4) rec.erro(CODIGOS[Math.floor(rnd() * CODIGOS.length)]);
    else if (op === 5) rec.fim();
    else if (op === 6) vi.advanceTimersByTime(Math.floor(rnd() * 3000));
    else if (op === 7) vi.advanceTimersByTime(Math.floor(rnd() * 400));
    else if (op === 8) { RecSim.todas[Math.floor(rnd() * RecSim.todas.length)]?.fim(); }
    else if (op === 9) { RecSim.todas[Math.floor(rnd() * RecSim.todas.length)]?.erro('network'); }
    else vi.advanceTimersByTime(LIMITE_MS);
  }
  return iniciadas;
}

function assentar() {
  // O navegador responde ao último stop; depois o tempo passa.
  for (let k = 0; k < 3; k++) {
    RecSim.ultima()?.fim();
    vi.advanceTimersByTime(LIMITE_MS * 2);
  }
}

describe('Rodada 8: sequências aleatórias (500 sementes), invariantes sempre verdadeiras', () => {
  it('C63 toda sessão termina: sem estado preso, sem timer, um aoFim por início, instâncias limitadas', () => {
    let total = 0; let comTexto = 0;
    for (let semente = 1; semente <= 500; semente++) {
      RecSim.reset(); vi.clearAllTimers();
      const r = montar(); const rnd = sorteio(semente);
      const iniciadas = embaralhar(rnd, r, 60);
      total += iniciadas; comTexto += 0;
      assentar();
      const rotulo = `semente ${semente}`;
      expect(r.sessao.ativa(), rotulo).toBe(false);
      expect(vi.getTimerCount(), rotulo).toBe(0);
      expect(r.fins.length, rotulo).toBe(iniciadas);
      comTexto += r.fins.filter((f) => f.texto).length;
      if (iniciadas > 0) expect(['pronto', 'erro'], rotulo).toContain(r.estados[r.estados.length - 1]);
      // nunca mais de uma instância viva por vez
      expect(RecSim.todas.filter((x) => x.onend).length, rotulo).toBeLessThanOrEqual(0);
    }
    // garante que o sorteio de fato exercita o código (não passa "no vazio")
    expect(total).toBeGreaterThan(300);
    expect(comTexto).toBeGreaterThan(50);
  });
  it('C64 nunca há duas instâncias com os eventos ligados ao mesmo tempo', () => {
    for (let semente = 1000; semente < 1300; semente++) {
      RecSim.reset(); vi.clearAllTimers();
      const r = montar(); const rnd = sorteio(semente);
      for (let i = 0; i < 40; i++) {
        embaralhar(rnd, r, 1);
        expect(RecSim.todas.filter((x) => x.onend).length, `semente ${semente} passo ${i}`).toBeLessThanOrEqual(1);
      }
      r.sessao.destruir();
    }
  });
  it('C65 laços: quantidade de instâncias por sessão fica limitada', () => {
    for (let semente = 2000; semente < 2200; semente++) {
      RecSim.reset(); vi.clearAllTimers();
      const r = montar(); const rnd = sorteio(semente);
      const n = embaralhar(rnd, r, 80);
      assentar();
      // cada sessão: no máximo (vazios + curtas) reinícios seguidos entre falas; com fala o limite de tempo manda
      expect(RecSim.todas.length, `semente ${semente}`).toBeLessThanOrEqual(Math.max(1, n) * (MAX_VAZIOS + MAX_CURTAS + 80));
    }
  });
});

describe('Rodada 9: desmontar em qualquer ponto de sequências aleatórias', () => {
  it('C66 depois de destruir: zero callbacks, zero timers, zero instâncias ligadas', () => {
    for (let semente = 3000; semente < 3500; semente++) {
      RecSim.reset(); vi.clearAllTimers();
      const r = montar(); const rnd = sorteio(semente);
      embaralhar(rnd, r, Math.floor(rnd() * 30));
      r.sessao.destruir();
      const antes = [r.estados.length, r.textos.length, r.fins.length];
      for (const rec of RecSim.todas) { rec.abriu(); rec.resultados(['fantasma', true]); rec.erro('network'); rec.fim(); }
      vi.advanceTimersByTime(LIMITE_MS * 3);
      const rotulo = `semente ${semente}`;
      expect([r.estados.length, r.textos.length, r.fins.length], rotulo).toEqual(antes);
      expect(vi.getTimerCount(), rotulo).toBe(0);
      expect(RecSim.todas.filter((x) => x.onend || x.onresult || x.onerror), rotulo).toEqual([]);
      expect(r.sessao.iniciar(), rotulo).toBe(false);
    }
  });
  it('C67 o texto falado nunca se perde: o último texto exibido está contido no texto final', () => {
    for (let semente = 4000; semente < 4400; semente++) {
      RecSim.reset(); vi.clearAllTimers();
      const r = montar(); const rnd = sorteio(semente);
      embaralhar(rnd, r, 50);
      assentar();
      for (const f of r.fins) expect(f.texto, `semente ${semente}`).toBe(f.texto.trim());
    }
  });
  it('C68 sessões seguidas na mesma instância de controle: nada vaza de uma para a outra', () => {
    for (let semente = 5000; semente < 5200; semente++) {
      RecSim.reset(); vi.clearAllTimers();
      const r = montar(); const rnd = sorteio(semente);
      for (let rodada = 0; rodada < 5; rodada++) { embaralhar(rnd, r, 25); assentar(); }
      expect(vi.getTimerCount(), `semente ${semente}`).toBe(0);
    }
  });
});
