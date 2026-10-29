import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecSim, montar } from './simuladorVoz';
import { LIMITE_MS, SILENCIO_MS, mensagemErro } from './sessaoVoz';

beforeEach(() => { vi.useFakeTimers(); RecSim.reset(); });
afterEach(() => { vi.useRealTimers(); });

const ultimoEstado = (r: ReturnType<typeof montar>) => r.estados[r.estados.length - 1];

describe('Rodada 5: combinações e laços', () => {
  it('C37 laço apertado: resultado + onend instantâneos, sem tempo passar, não roda para sempre', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    for (let i = 0; i < 200 && r.fins.length === 0; i++) {
      RecSim.ultima().abriu();
      RecSim.ultima().resultados(['oi', true]);
      RecSim.ultima().fim();
    }
    expect(r.fins).toHaveLength(1);
    expect(RecSim.todas.length).toBeLessThan(20);
  });
  it('C38 espaços do Safari entre finais não duplicam nem juntam errado', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados([' paguei', true], [' 360 ', true], [' de cimento', false]);
    expect(r.textos[r.textos.length - 1]).toBe('paguei 360 de cimento');
  });
  it('C39 final + parcial na mesma lista, depois reinício e mais fala', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['paguei', true], ['360', false]);
    RecSim.ultima().fim(); // parcial pendente vira texto, não se perde
    RecSim.ultima().abriu(); RecSim.ultima().resultados(['no pix', true]);
    expect(r.textos[r.textos.length - 1]).toBe('paguei 360 no pix');
  });
  it('C40 onend antes do onerror (ordem trocada): erro tardio da instância velha é ignorado', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['areia', true]);
    const velha = RecSim.ultima(); velha.fim(); velha.erro('network');
    expect(r.fins).toEqual([]);
    expect(RecSim.todas).toHaveLength(2);
  });
  it('C41 aoFim reiniciando a escuta (retoque rápido) funciona', () => {
    let r!: ReturnType<typeof montar>;
    r = montar({ aoFim: (t, e) => { r.fins.push({ texto: t, erro: e }); if (r.fins.length === 1) r.sessao.iniciar(); } });
    r.sessao.iniciar(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['a', true]);
    r.sessao.parar(); RecSim.ultima().fim();
    expect(r.sessao.ativa()).toBe(true); expect(RecSim.todas).toHaveLength(2);
    r.sessao.destruir(); expect(vi.getTimerCount()).toBe(0);
  });
  it('C42 destruir de dentro do aoTexto (desmonta no meio de um resultado)', () => {
    let r!: ReturnType<typeof montar>;
    r = montar({ aoTexto: () => r.sessao.destruir() });
    r.sessao.iniciar(); RecSim.ultima().abriu(); RecSim.ultima().resultados(['a', false]);
    vi.advanceTimersByTime(LIMITE_MS * 2);
    expect(r.fins).toEqual([]); expect(vi.getTimerCount()).toBe(0);
  });
  it('C43 fala longa em 4 pedaços com pausas de 1,9s: nunca corta', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    for (const p of ['paguei', '360', 'de cimento', 'no lote 39']) {
      RecSim.ultima().resultados([p, true]); RecSim.ultima().fim();
      vi.advanceTimersByTime(SILENCIO_MS - 100);
      RecSim.ultima().abriu();
    }
    expect(r.fins).toEqual([]);
    expect(r.textos[r.textos.length - 1]).toBe('paguei 360 de cimento no lote 39');
  });
  it('C44 pedaços acumulam entre reinícios', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    for (const p of ['paguei', '360', 'de cimento']) {
      RecSim.ultima().resultados([p, true]); RecSim.ultima().fim(); RecSim.ultima().abriu();
    }
    expect(r.textos[r.textos.length - 1]).toBe('paguei 360 de cimento');
  });
  it('C45 no-speech fatal após fala em outra instância mantém o texto, sem erro', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['areia', true]); RecSim.ultima().fim();
    RecSim.ultima().abriu(); RecSim.ultima().erro('no-speech'); RecSim.ultima().fim();
    for (let i = 0; i < 6 && r.fins.length === 0; i++) { RecSim.ultima().fim(); }
    expect(r.fins).toEqual([{ texto: 'areia', erro: null }]);
  });
  it('C46 mensagens de erro: todas em pt-BR, sem código técnico, fatais apontam o teclado', () => {
    for (const c of ['not-allowed', 'service-not-allowed', 'audio-capture', 'network', 'start', 'coisa-nova']) {
      const m = mensagemErro(c);
      expect(m).not.toMatch(/not-allowed|network|audio-capture|undefined/);
      expect(m).toMatch(/teclado|digite/);
    }
    expect(mensagemErro('no-speech')).toMatch(/Não ouvi/);
    expect(mensagemErro('aborted')).toMatch(/interrompida/);
  });
  it('C47 dez sessões seguidas não vazam timers nem instâncias vivas', () => {
    const r = montar();
    for (let i = 0; i < 10; i++) {
      r.sessao.iniciar(); RecSim.ultima().abriu(); RecSim.ultima().resultados([`t${i}`, true]);
      vi.advanceTimersByTime(SILENCIO_MS); RecSim.ultima().fim();
    }
    expect(r.fins).toHaveLength(10); expect(vi.getTimerCount()).toBe(0);
    expect(RecSim.todas.filter((x) => x.onend || x.onresult)).toEqual([]);
  });
  it('C48 estados nunca terminam presos: toda sequência termina em pronto ou erro', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['a', false]);
    RecSim.ultima().erro('aborted'); // sem onend nenhum
    vi.advanceTimersByTime(2000);
    expect(['pronto', 'erro']).toContain(ultimoEstado(r));
    expect(vi.getTimerCount()).toBe(0);
  });
  it('C49 estado "ouvindo" volta após reinício sem piscar para outro estado', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['a', true]); RecSim.ultima().fim(); RecSim.ultima().abriu();
    expect(r.estados.filter((e) => e === 'pedindo' || e === 'processando')).toEqual(['pedindo']);
  });
});
