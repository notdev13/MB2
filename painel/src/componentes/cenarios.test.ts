import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecSim, montar } from './simuladorVoz';
import { LIMITE_MS, MAX_VAZIOS, SEM_FALA_MS, SILENCIO_MS } from './sessaoVoz';

beforeEach(() => { vi.useFakeTimers(); RecSim.reset(); });
afterEach(() => { vi.useRealTimers(); });

const ultimoEstado = (r: ReturnType<typeof montar>) => r.estados[r.estados.length - 1];

describe('Rodada 1: básico', () => {
  it('C01 fala e silêncio: termina com o texto', () => {
    const r = montar(); r.sessao.iniciar();
    expect(ultimoEstado(r)).toBe('pedindo');
    RecSim.ultima().abriu();
    expect(ultimoEstado(r)).toBe('ouvindo');
    RecSim.ultima().resultados(['paguei 360 de cimento', false]);
    RecSim.ultima().resultados(['paguei 360 de cimento', true]);
    vi.advanceTimersByTime(SILENCIO_MS);
    expect(RecSim.ultima().parou).toBe(1);
    expect(ultimoEstado(r)).toBe('processando');
    RecSim.ultima().fim();
    expect(r.fins).toEqual([{ texto: 'paguei 360 de cimento', erro: null }]);
    expect(ultimoEstado(r)).toBe('pronto');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('C02 parciais mudam: mostra o último', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['pag', false]);
    RecSim.ultima().resultados(['paguei', false]);
    RecSim.ultima().resultados(['paguei 36', false]);
    expect(r.textos).toEqual(['pag', 'paguei', 'paguei 36']);
  });
  it('C03 toque para parar encerra', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['cimento', true]);
    r.sessao.parar(); RecSim.ultima().fim();
    expect(r.fins[0].texto).toBe('cimento');
  });
  it('C04 nada falado: erro no-speech depois do tempo sem fala', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    vi.advanceTimersByTime(SEM_FALA_MS); RecSim.ultima().fim();
    expect(r.fins).toEqual([{ texto: '', erro: 'no-speech' }]);
    expect(ultimoEstado(r)).toBe('erro');
  });
  it('C05 limite total de 30s mesmo falando sempre', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    for (let t = 0; t < LIMITE_MS; t += 1000) {
      RecSim.ultima().resultados([`palavra ${t}`, false]);
      vi.advanceTimersByTime(1000);
    }
    expect(RecSim.ultima().parou).toBe(1);
    RecSim.ultima().fim();
    expect(r.fins).toHaveLength(1);
  });
});

describe('Rodada 2: sequências do iOS Safari', () => {
  it('C06 pausa no meio da frase: onend precoce reinicia e junta o texto', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['paguei 360', true]);
    RecSim.ultima().fim(); // Safari cortou
    expect(RecSim.todas).toHaveLength(2);
    expect(RecSim.ultima().iniciou).toBe(1);
    RecSim.ultima().abriu();
    RecSim.ultima().resultados(['de cimento', true]);
    expect(r.textos[r.textos.length - 1]).toBe('paguei 360 de cimento');
    vi.advanceTimersByTime(SILENCIO_MS); RecSim.ultima().fim();
    expect(r.fins[0].texto).toBe('paguei 360 de cimento');
  });
  it('C07 no-speech no começo reinicia, e depois captura', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    vi.advanceTimersByTime(3000);
    RecSim.ultima().erro('no-speech'); RecSim.ultima().fim();
    expect(RecSim.todas).toHaveLength(2);
    RecSim.ultima().abriu(); RecSim.ultima().resultados(['areia', true]);
    vi.advanceTimersByTime(SILENCIO_MS); RecSim.ultima().fim();
    expect(r.fins).toEqual([{ texto: 'areia', erro: null }]);
  });
  it('C08 network: erro fatal, mensagem, sem reinício', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().erro('network'); RecSim.ultima().fim();
    expect(RecSim.todas).toHaveLength(1);
    expect(r.fins).toEqual([{ texto: '', erro: 'network' }]);
    expect(ultimoEstado(r)).toBe('erro');
  });
  it('C09 network depois de já ter falado: mantém o texto', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['cimento', true]);
    RecSim.ultima().erro('network'); RecSim.ultima().fim();
    expect(r.fins).toEqual([{ texto: 'cimento', erro: 'network' }]);
    expect(ultimoEstado(r)).toBe('pronto');
  });
  it('C10 not-allowed logo no início', () => {
    const r = montar(); r.sessao.iniciar();
    RecSim.ultima().erro('not-allowed'); RecSim.ultima().fim();
    expect(r.fins[0].erro).toBe('not-allowed');
    expect(ultimoEstado(r)).toBe('erro');
  });
  it('C11 permissão negada depois de aceita (2ª instância)', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['paguei', true]); RecSim.ultima().fim();
    RecSim.ultima().erro('not-allowed'); RecSim.ultima().fim();
    expect(r.fins).toEqual([{ texto: 'paguei', erro: 'not-allowed' }]);
    expect(RecSim.todas).toHaveLength(2);
  });
  it('C12 onend sem resultado repetido não vira loop infinito', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    for (let i = 0; i < 20 && r.fins.length === 0; i++) RecSim.ultima().fim();
    expect(RecSim.todas.length).toBeLessThanOrEqual(MAX_VAZIOS);
    expect(r.fins).toEqual([{ texto: '', erro: 'no-speech' }]);
  });
  it('C13 resultado final vazio conta como vazio', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['', true]); RecSim.ultima().fim();
    expect(r.textos).toEqual([]);
    expect(RecSim.todas).toHaveLength(2);
  });
  it('C14 aborted que não fomos nós: encerra com mensagem', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().erro('aborted'); RecSim.ultima().fim();
    expect(r.fins).toEqual([{ texto: '', erro: 'aborted' }]);
  });
  it('C15 aborted logo após nosso stop é ignorado', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['areia', true]);
    r.sessao.parar(); RecSim.ultima().erro('aborted'); RecSim.ultima().fim();
    expect(r.fins).toEqual([{ texto: 'areia', erro: null }]);
  });
});

describe('Rodada 3: toque duplo, desmontar, falhas', () => {
  it('C16 toque duplo no microfone cria só uma instância', () => {
    const r = montar();
    expect(r.sessao.iniciar()).toBe(true);
    expect(r.sessao.iniciar()).toBe(false);
    expect(RecSim.todas).toHaveLength(1);
  });
  it('C17 desmontar durante a escuta: aborta, sem callbacks, sem timers', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    const rec = RecSim.ultima(); const n = r.estados.length;
    r.sessao.destruir();
    expect(rec.abortou).toBe(1);
    rec.resultados(['tarde', true]); rec.erro('network'); rec.fim();
    vi.advanceTimersByTime(60000);
    expect(r.estados).toHaveLength(n); expect(r.textos).toEqual([]); expect(r.fins).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('C18 desmontar enquanto pede permissão', () => {
    const r = montar(); r.sessao.iniciar(); r.sessao.destruir();
    vi.advanceTimersByTime(60000);
    expect(r.fins).toEqual([]); expect(vi.getTimerCount()).toBe(0);
  });
  it('C19 start() lança na primeira vez', () => {
    RecSim.falhaNoStart = 'x';
    const r = montar();
    expect(r.sessao.iniciar()).toBe(false);
    expect(r.fins).toEqual([{ texto: '', erro: 'start' }]);
    expect(ultimoEstado(r)).toBe('erro');
    expect(r.sessao.ativa()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('C20 start() lança no reinício: guarda o texto', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['cimento', true]);
    RecSim.falhaNoStart = 'x'; RecSim.ultima().fim();
    expect(r.fins).toEqual([{ texto: 'cimento', erro: 'start' }]);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('C21 onend nunca chega depois do stop: fecha sozinho', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['cimento', true]);
    r.sessao.parar(); vi.advanceTimersByTime(2000);
    expect(r.fins).toEqual([{ texto: 'cimento', erro: null }]);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('C22 permissão que nunca responde: sai do estado pedindo', () => {
    const r = montar(); r.sessao.iniciar(); vi.advanceTimersByTime(25000);
    expect(ultimoEstado(r)).toBe('erro'); expect(r.fins[0].erro).toBe('start');
  });
  it('C23 reiniciar depois de terminar funciona', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().erro('network'); RecSim.ultima().fim();
    expect(r.sessao.iniciar()).toBe(true);
    expect(RecSim.todas).toHaveLength(2);
  });
});
