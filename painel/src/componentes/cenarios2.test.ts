import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecSim, montar } from './simuladorVoz';
import { LIMITE_MS, SEM_FALA_MS, SILENCIO_MS } from './sessaoVoz';

beforeEach(() => { vi.useFakeTimers(); RecSim.reset(); });
afterEach(() => { vi.useRealTimers(); });

const ultimoEstado = (r: ReturnType<typeof montar>) => r.estados[r.estados.length - 1];

describe('Rodada 4: cancelar, ordem estranha, bordas de tempo', () => {
  it('C24 cancelar enquanto pede permissão não vira erro', () => {
    const r = montar(); r.sessao.iniciar(); r.sessao.parar(); RecSim.ultima().fim();
    expect(r.fins).toEqual([{ texto: '', erro: null }]);
    expect(ultimoEstado(r)).toBe('pronto');
  });
  it('C25 parar sem falar nada (toque do usuário) não é erro', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    r.sessao.parar(); RecSim.ultima().fim();
    expect(r.fins).toEqual([{ texto: '', erro: null }]);
  });
  it('C26 erro fatal vira "processando" até fechar (não fica preso em ouvindo)', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().erro('network');
    expect(ultimoEstado(r)).toBe('processando');
    vi.advanceTimersByTime(2000);
    expect(ultimoEstado(r)).toBe('erro'); expect(vi.getTimerCount()).toBe(0);
  });
  it('C27 resultado final que chega depois do stop ainda entra', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['paguei', false]);
    r.sessao.parar();
    RecSim.ultima().resultados(['paguei 360', true]); RecSim.ultima().fim();
    expect(r.fins[0].texto).toBe('paguei 360');
  });
  it('C28 resultado antes do onstart também vale', () => {
    const r = montar(); r.sessao.iniciar();
    RecSim.ultima().resultados(['areia', true]);
    expect(ultimoEstado(r)).toBe('ouvindo');
    vi.advanceTimersByTime(SILENCIO_MS); expect(RecSim.ultima().parou).toBe(1);
  });
  it('C29 borda do silêncio: 1999ms não para, 2000ms para; novo resultado zera', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['a', false]);
    vi.advanceTimersByTime(SILENCIO_MS - 1); expect(RecSim.ultima().parou).toBe(0);
    RecSim.ultima().resultados(['a b', false]);
    vi.advanceTimersByTime(SILENCIO_MS - 1); expect(RecSim.ultima().parou).toBe(0);
    vi.advanceTimersByTime(1); expect(RecSim.ultima().parou).toBe(1);
  });
  it('C30 borda do limite: 29999ms não para, 30000ms para', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    for (let t = 0; t < LIMITE_MS - 1; t += 1000) {
      RecSim.ultima().resultados([`x${t}`, false]);
      vi.advanceTimersByTime(Math.min(1000, LIMITE_MS - 1 - t));
    }
    expect(RecSim.ultima().parou).toBe(0);
    vi.advanceTimersByTime(1); expect(RecSim.ultima().parou).toBe(1);
  });
  it('C31 borda sem fala: 5999 não, 6000 sim', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    vi.advanceTimersByTime(SEM_FALA_MS - 1); expect(RecSim.ultima().parou).toBe(0);
    vi.advanceTimersByTime(1); expect(RecSim.ultima().parou).toBe(1);
  });
  it('C32 permissão demorada (15s) não gasta o tempo sem fala', () => {
    const r = montar(); r.sessao.iniciar(); vi.advanceTimersByTime(15000);
    RecSim.ultima().abriu(); vi.advanceTimersByTime(SEM_FALA_MS - 1);
    expect(RecSim.ultima().parou).toBe(0);
  });
  it('C33 erro depois do fim é ignorado', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['areia', true]); r.sessao.parar();
    const rec = RecSim.ultima(); rec.fim(); rec.erro('network'); rec.fim();
    expect(r.fins).toHaveLength(1); expect(r.fins[0].erro).toBeNull();
  });
  it('C34 parar duas vezes (toque duplo para parar) só fecha uma vez', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['areia', true]);
    r.sessao.parar(); r.sessao.parar(); RecSim.ultima().fim();
    expect(RecSim.ultima().parou).toBe(1); expect(r.fins).toHaveLength(1);
  });
  it('C35 desmontar durante o "processando"', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['areia', true]); r.sessao.parar(); r.sessao.destruir();
    vi.advanceTimersByTime(5000);
    expect(r.fins).toEqual([]); expect(vi.getTimerCount()).toBe(0);
  });
  it('C36 parar/destruir sem nunca ter iniciado não quebra', () => {
    const r = montar(); r.sessao.parar(); r.sessao.destruir(); r.sessao.destruir();
    expect(r.fins).toEqual([]);
  });
});
