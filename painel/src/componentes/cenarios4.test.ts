import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecSim, montar } from './simuladorVoz';
import { SILENCIO_MS } from './sessaoVoz';

beforeEach(() => { vi.useFakeTimers(); RecSim.reset(); });
afterEach(() => { vi.useRealTimers(); });

describe('Rodada 6: reentrância (desmontar de dentro dos próprios avisos)', () => {
  it('C50 destruir dentro do aoEstado("pedindo"): nenhuma instância nasce', () => {
    let r!: ReturnType<typeof montar>;
    r = montar({ aoEstado: (e) => { if (e === 'pedindo') r.sessao.destruir(); } });
    r.sessao.iniciar();
    vi.advanceTimersByTime(60000);
    expect(RecSim.todas.filter((x) => x.iniciou > 0)).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('C51 destruir dentro do aoEstado("processando"): não deixa timer', () => {
    let r!: ReturnType<typeof montar>;
    r = montar({ aoEstado: (e) => { if (e === 'processando') r.sessao.destruir(); } });
    r.sessao.iniciar(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['a', true]);
    vi.advanceTimersByTime(SILENCIO_MS);
    vi.advanceTimersByTime(5000);
    expect(r.fins).toEqual([]); expect(vi.getTimerCount()).toBe(0);
  });
  it('C52 destruir dentro do aoEstado("processando") de erro fatal: sem timer', () => {
    let r!: ReturnType<typeof montar>;
    r = montar({ aoEstado: (e) => { if (e === 'processando') r.sessao.destruir(); } });
    r.sessao.iniciar(); RecSim.ultima().abriu(); RecSim.ultima().erro('network');
    vi.advanceTimersByTime(5000);
    expect(r.fins).toEqual([]); expect(vi.getTimerCount()).toBe(0);
  });
  it('C53 destruir dentro do aoFim: sem erro e sem timer', () => {
    let r!: ReturnType<typeof montar>;
    r = montar({ aoFim: () => r.sessao.destruir() });
    r.sessao.iniciar(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['a', true]);
    r.sessao.parar(); RecSim.ultima().fim();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('C54 destruir dentro do aoEstado("ouvindo") do reinício', () => {
    let r!: ReturnType<typeof montar>; let n = 0;
    r = montar({ aoEstado: (e) => { if (e === 'ouvindo' && ++n === 3) r.sessao.destruir(); } });
    r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['a', true]); RecSim.ultima().fim(); RecSim.ultima().abriu();
    vi.advanceTimersByTime(60000);
    expect(r.fins).toEqual([]); expect(vi.getTimerCount()).toBe(0);
  });
  it('C55 destruir dentro do aoEstado("ouvindo") de um resultado: não arma timers', () => {
    let r!: ReturnType<typeof montar>;
    r = montar({ aoEstado: (e) => { if (e === 'ouvindo') r.sessao.destruir(); } });
    r.sessao.iniciar(); RecSim.ultima().resultados(['a', true]);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('Rodada 7: o navegador falha de formas feias', () => {
  it('C56 stop() lança (InvalidState): fecha na hora com o texto', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['areia', true]);
    RecSim.ultima().stop = () => { throw new Error('InvalidStateError'); };
    r.sessao.parar();
    expect(r.fins).toEqual([{ texto: 'areia', erro: null }]); expect(vi.getTimerCount()).toBe(0);
  });
  it('C57 abort() lança ao fechar: não propaga', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['areia', true]);
    RecSim.ultima().abort = () => { throw new Error('x'); };
    r.sessao.parar(); vi.advanceTimersByTime(2000);
    expect(r.fins).toHaveLength(1);
  });
  it('C58 sem abort() disponível usa stop()', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    const rec = RecSim.ultima(); (rec as unknown as { abort?: unknown }).abort = undefined;
    r.sessao.destruir(); expect(rec.parou).toBe(1);
  });
  it('C59 construtor lança no reinício: guarda o texto', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['areia', true]);
    const antigo = RecSim.todas.slice();
    const rec = RecSim.ultima(); rec.fim.bind(rec);
    // próxima construção falha
    const original = RecSim.todas.push.bind(RecSim.todas);
    RecSim.todas.push = () => { throw new Error('ctor'); };
    rec.fim();
    RecSim.todas.push = original;
    expect(antigo.length).toBe(1);
    expect(r.fins).toEqual([{ texto: 'areia', erro: null }]);
  });
  it('C60 resultado com lista vazia e item sem [0] não quebra', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().onresult?.({ resultIndex: 0, results: [] });
    RecSim.ultima().onresult?.({ resultIndex: 0, results: [{ isFinal: true } as never] });
    expect(r.textos).toEqual([]);
  });
  it('C61 toque duplo rápido: iniciar, parar, iniciar antes do onend fica ignorado', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    r.sessao.parar();
    expect(r.sessao.iniciar()).toBe(false);
    RecSim.ultima().fim();
    expect(r.sessao.iniciar()).toBe(true);
    expect(RecSim.todas).toHaveLength(2);
  });
  it('C62 instância velha, depois de fechada por tempo, não contamina a nova sessão', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['velho', true]); r.sessao.parar();
    const velha = RecSim.ultima(); vi.advanceTimersByTime(2000); // fechou sem onend
    r.sessao.iniciar(); RecSim.ultima().abriu();
    velha.resultados(['fantasma', true]); velha.erro('network'); velha.fim();
    RecSim.ultima().resultados(['novo', true]);
    expect(r.textos[r.textos.length - 1]).toBe('novo');
    expect(r.sessao.ativa()).toBe(true);
  });
});
