import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RecSim, montar } from './simuladorVoz';
import {
  LIMITE_MS, MAX_VAZIOS, NOVA_TENTATIVA_MS, PEDINDO_MS, SEM_FALA_MS, SILENCIO_MS,
  mensagemErro, unirSemRepetir,
} from './sessaoVoz';

beforeEach(() => { vi.useFakeTimers(); RecSim.reset(); });
afterEach(() => { vi.useRealTimers(); });

type R = ReturnType<typeof montar>;
const estado = (r: R) => r.estados[r.estados.length - 1];
const texto = (r: R) => r.textos[r.textos.length - 1];
/** Abre uma sessão, deixa o microfone abrir e entrega os resultados já "finais". */
function falando(...frases: string[]) {
  const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
  for (const f of frases) RecSim.ultima().resultados([f, true]);
  return r;
}
/** O Safari corta a instância (pausa) e a próxima já começa a ouvir. */
function reiniciar() { RecSim.ultima().fim(); RecSim.ultima().abriu(); }

describe('fluxo normal', () => {
  it('fala, silêncio, o navegador responde ao stop: termina com o texto', () => {
    const r = falando('paguei 360 de cimento');
    expect(estado(r)).toBe('ouvindo');
    vi.advanceTimersByTime(SILENCIO_MS);
    expect(estado(r)).toBe('processando');
    RecSim.ultima().fim();
    expect(r.fins).toEqual([{ texto: 'paguei 360 de cimento', erro: null }]);
    expect(estado(r)).toBe('pronto'); expect(vi.getTimerCount()).toBe(0);
  });
  it('parciais mudam e a tela mostra sempre o último', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    for (const p of ['pag', 'paguei', 'paguei 36']) RecSim.ultima().resultados([p, false]);
    expect(r.textos).toEqual(['pag', 'paguei', 'paguei 36']);
  });
  it('parcial pendente no onend vira texto (nada se perde)', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados(['paguei', true], ['360', false]); RecSim.ultima().fim();
    RecSim.ultima().abriu(); RecSim.ultima().resultados(['no pix', true]);
    expect(texto(r)).toBe('paguei 360 no pix');
  });
  it('resultado final que chega depois do stop ainda entra', () => {
    const r = falando(); RecSim.ultima().resultados(['paguei', false]);
    r.sessao.parar(); RecSim.ultima().resultados(['paguei 360', true]); RecSim.ultima().fim();
    expect(r.fins[0].texto).toBe('paguei 360');
  });
  it('espaços que o Safari põe entre os finais não atrapalham', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    RecSim.ultima().resultados([' paguei', true], [' 360 ', true], [' de cimento', false]);
    expect(texto(r)).toBe('paguei 360 de cimento');
  });
});

describe('tempos: silêncio, sem fala e limite total (bordas)', () => {
  it('silêncio de 2s: 1999ms não para, 2000ms para, e novo resultado zera a contagem', () => {
    const r = falando('a');
    vi.advanceTimersByTime(SILENCIO_MS - 1); expect(RecSim.ultima().parou).toBe(0);
    RecSim.ultima().resultados(['a b', false]);
    vi.advanceTimersByTime(SILENCIO_MS - 1); expect(RecSim.ultima().parou).toBe(0);
    vi.advanceTimersByTime(1); expect(RecSim.ultima().parou).toBe(1); expect(estado(r)).toBe('processando');
  });
  it('sem nenhuma fala: para em 6s e avisa que não ouviu nada', () => {
    const r = falando();
    vi.advanceTimersByTime(SEM_FALA_MS - 1); expect(RecSim.ultima().parou).toBe(0);
    vi.advanceTimersByTime(1); RecSim.ultima().fim();
    expect(r.fins).toEqual([{ texto: '', erro: 'no-speech' }]); expect(estado(r)).toBe('erro');
  });
  it('limite total de 30s mesmo falando sem parar', () => {
    const r = falando();
    for (let t = 0; t < LIMITE_MS - 1; t += 1000) {
      RecSim.ultima().resultados([`x${t}`, false]); vi.advanceTimersByTime(Math.min(1000, LIMITE_MS - 1 - t));
    }
    expect(RecSim.ultima().parou).toBe(0);
    vi.advanceTimersByTime(1); expect(RecSim.ultima().parou).toBe(1);
    RecSim.ultima().fim(); expect(r.fins).toHaveLength(1);
  });
  it('a demora da permissão (15s) não gasta o tempo de espera pela fala', () => {
    const r = montar(); r.sessao.iniciar(); vi.advanceTimersByTime(15000);
    RecSim.ultima().abriu(); vi.advanceTimersByTime(SEM_FALA_MS - 1);
    expect(RecSim.ultima().parou).toBe(0);
  });
  it('só onstart (permissão ainda aberta): não arma o silêncio e fica em "pedindo"', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().soStart();
    vi.advanceTimersByTime(SEM_FALA_MS + 1000);
    expect(RecSim.ultima().parou).toBe(0); expect(estado(r)).toBe('pedindo');
    vi.advanceTimersByTime(PEDINDO_MS);
    expect(r.fins).toEqual([{ texto: '', erro: 'start' }]);
  });
  it('onaudiostart arma o silêncio; primeiro resultado sem áudio também arma', () => {
    const a = montar(); a.sessao.iniciar(); RecSim.ultima().soStart(); RecSim.ultima().soAudio();
    expect(estado(a)).toBe('ouvindo'); vi.advanceTimersByTime(SEM_FALA_MS); expect(RecSim.ultima().parou).toBe(1);
    RecSim.reset();
    const b = montar(); b.sessao.iniciar(); RecSim.ultima().resultados(['areia', false]);
    vi.advanceTimersByTime(SILENCIO_MS); expect(RecSim.ultima().parou).toBe(1);
  });
  it('permissão que nunca responde: sai do estado "pedindo"', () => {
    const r = montar(); r.sessao.iniciar(); vi.advanceTimersByTime(PEDINDO_MS + 1000);
    expect(estado(r)).toBe('erro'); expect(r.fins[0].erro).toBe('start');
  });
});

describe('o Safari corta a escuta (reinício automático)', () => {
  it('pausa no meio da frase: reinicia e junta os trechos', () => {
    const r = falando('paguei 360'); reiniciar();
    RecSim.ultima().resultados(['de cimento', true]);
    expect(texto(r)).toBe('paguei 360 de cimento'); expect(RecSim.todas).toHaveLength(2);
  });
  it('pausas de 1,9s entre quatro pedaços: nunca corta a fala', () => {
    const r = montar(); r.sessao.iniciar(); RecSim.ultima().abriu();
    for (const p of ['paguei', '360', 'de cimento', 'no lote 39']) {
      RecSim.ultima().resultados([p, true]); RecSim.ultima().fim();
      vi.advanceTimersByTime(SILENCIO_MS - 100); RecSim.ultima().abriu();
    }
    expect(r.fins).toEqual([]); expect(texto(r)).toBe('paguei 360 de cimento no lote 39');
  });
  it('no-speech no começo reinicia e depois captura', () => {
    const r = falando(); vi.advanceTimersByTime(3000);
    RecSim.ultima().erro('no-speech'); reiniciar();
    RecSim.ultima().resultados(['areia', true]); vi.advanceTimersByTime(SILENCIO_MS); RecSim.ultima().fim();
    expect(r.fins).toEqual([{ texto: 'areia', erro: null }]);
  });
  it('onend sem resultado, sempre: não vira laço infinito', () => {
    const r = falando();
    for (let i = 0; i < 20 && r.fins.length === 0; i++) RecSim.ultima().fim();
    expect(RecSim.todas.length).toBeLessThanOrEqual(MAX_VAZIOS);
    expect(r.fins).toEqual([{ texto: '', erro: 'no-speech' }]);
  });
  it('laço apertado (resultado e fim instantâneos) também termina', () => {
    const r = falando();
    for (let i = 0; i < 200 && r.fins.length === 0; i++) {
      RecSim.ultima().abriu(); RecSim.ultima().resultados(['oi', true]); RecSim.ultima().fim();
    }
    expect(r.fins).toHaveLength(1); expect(RecSim.todas.length).toBeLessThan(20);
  });
  it('instância velha que fala depois do fim não contamina', () => {
    const r = falando('areia'); const velha = RecSim.ultima(); velha.fim();
    velha.resultados(['fantasma', true]); velha.erro('network');
    expect(r.fins).toEqual([]); expect(RecSim.todas).toHaveLength(2);
  });
});

describe('erros e mensagens', () => {
  it('network sem fala: erro, sem reinício', () => {
    const r = falando(); RecSim.ultima().erro('network'); RecSim.ultima().fim();
    expect(RecSim.todas).toHaveLength(1); expect(r.fins).toEqual([{ texto: '', erro: 'network' }]); expect(estado(r)).toBe('erro');
  });
  it('erro depois de já ter falado: guarda o texto e volta a "pronto"', () => {
    const r = falando('cimento'); RecSim.ultima().erro('network'); RecSim.ultima().fim();
    expect(r.fins).toEqual([{ texto: 'cimento', erro: 'network' }]); expect(estado(r)).toBe('pronto');
  });
  it('permissão negada depois de aceita (segunda instância)', () => {
    const r = falando('paguei'); RecSim.ultima().fim(); RecSim.ultima().erro('not-allowed'); RecSim.ultima().fim();
    expect(r.fins).toEqual([{ texto: 'paguei', erro: 'not-allowed' }]);
  });
  it('not-allowed no início e aborted que não fomos nós encerram com o código certo', () => {
    const a = falando(); RecSim.ultima().erro('not-allowed'); RecSim.ultima().fim();
    expect(a.fins[0].erro).toBe('not-allowed');
    RecSim.reset();
    const b = falando(); RecSim.ultima().erro('aborted'); RecSim.ultima().fim();
    expect(b.fins).toEqual([{ texto: '', erro: 'aborted' }]);
  });
  it('aborted logo depois do nosso stop é ignorado', () => {
    const r = falando('areia'); r.sessao.parar(); RecSim.ultima().erro('aborted'); RecSim.ultima().fim();
    expect(r.fins).toEqual([{ texto: 'areia', erro: null }]);
  });
  it('erro fatal vira "processando" até fechar (nunca fica preso em ouvindo)', () => {
    const r = falando(); RecSim.ultima().erro('network');
    expect(estado(r)).toBe('processando'); vi.advanceTimersByTime(2000);
    expect(estado(r)).toBe('erro'); expect(vi.getTimerCount()).toBe(0);
  });
  it('mensagens em pt-BR, sem código técnico; as que travam a voz apontam o teclado', () => {
    for (const c of ['not-allowed', 'service-not-allowed', 'audio-capture', 'network', 'start', 'coisa-nova']) {
      expect(mensagemErro(c)).not.toMatch(/not-allowed|network|audio-capture|undefined/);
      expect(mensagemErro(c)).toMatch(/teclado|digite/);
    }
  });
});

describe('cancelar, toque duplo e desmontar', () => {
  it('cancelar sem ter falado (ou ainda na permissão) não vira erro', () => {
    const a = montar(); a.sessao.iniciar(); a.sessao.parar(); RecSim.ultima().fim();
    expect(a.fins).toEqual([{ texto: '', erro: null }]); expect(estado(a)).toBe('pronto');
  });
  it('toque duplo: só uma instância; parar duas vezes fecha uma vez', () => {
    const r = montar();
    expect(r.sessao.iniciar()).toBe(true); expect(r.sessao.iniciar()).toBe(false);
    expect(RecSim.todas).toHaveLength(1);
    RecSim.ultima().abriu(); RecSim.ultima().resultados(['areia', true]);
    r.sessao.parar(); r.sessao.parar(); RecSim.ultima().fim();
    expect(RecSim.ultima().parou).toBe(1); expect(r.fins).toHaveLength(1);
  });
  it('depois de terminar dá para iniciar de novo', () => {
    const r = falando(); RecSim.ultima().erro('network'); RecSim.ultima().fim();
    expect(r.sessao.iniciar()).toBe(true); expect(RecSim.todas).toHaveLength(2);
  });
  it('onend que nunca chega depois do stop: fecha sozinho com o texto', () => {
    const r = falando('cimento'); r.sessao.parar(); vi.advanceTimersByTime(2000);
    expect(r.fins).toEqual([{ texto: 'cimento', erro: null }]); expect(vi.getTimerCount()).toBe(0);
  });
  it('desmontar em qualquer fase: aborta, silencia callbacks e não deixa timer', () => {
    for (const fase of ['pedindo', 'ouvindo', 'processando']) {
      RecSim.reset(); vi.clearAllTimers();
      const r = montar(); r.sessao.iniciar();
      if (fase !== 'pedindo') { RecSim.ultima().abriu(); RecSim.ultima().resultados(['a', true]); }
      if (fase === 'processando') r.sessao.parar();
      const rec = RecSim.ultima(); const n = r.estados.length + r.textos.length;
      r.sessao.destruir();
      rec.resultados(['tarde', true]); rec.erro('network'); rec.fim(); vi.advanceTimersByTime(60000);
      expect(r.estados.length + r.textos.length, fase).toBe(n);
      expect(r.fins, fase).toEqual([]); expect(vi.getTimerCount(), fase).toBe(0); expect(rec.abortou, fase).toBe(1);
    }
  });
  it('destruir de dentro dos próprios avisos não cria instância nem deixa timer', () => {
    for (const quando of ['pedindo', 'processando', 'ouvindo']) {
      RecSim.reset(); vi.clearAllTimers();
      const ref: { r?: R } = {};
      const r = montar({ aoEstado: (e) => { if (e === quando) ref.r?.sessao.destruir(); } }); ref.r = r;
      r.sessao.iniciar();
      if (quando !== 'pedindo') { RecSim.ultima().resultados(['a', true]); if (quando === 'processando') r.sessao.parar(); }
      vi.advanceTimersByTime(60000);
      expect(r.fins, quando).toEqual([]); expect(vi.getTimerCount(), quando).toBe(0);
    }
    expect(RecSim.todas.filter((x) => x.iniciou > 0 && x.onend)).toEqual([]);
  });
  it('parar ou destruir sem nunca ter iniciado não quebra', () => {
    const r = montar(); r.sessao.parar(); r.sessao.destruir(); r.sessao.destruir();
    expect(r.fins).toEqual([]);
  });
});

describe('o navegador falha de formas feias', () => {
  it('start() lança na primeira vez: erro de início, sem timers', () => {
    RecSim.falhaNoStart = 'x'; const r = montar();
    expect(r.sessao.iniciar()).toBe(false); expect(r.fins).toEqual([{ texto: '', erro: 'start' }]);
    expect(estado(r)).toBe('erro'); expect(vi.getTimerCount()).toBe(0);
  });
  it('stop() lança: fecha na hora com o texto; abort() lançando não propaga', () => {
    const a = falando('areia'); RecSim.ultima().stop = () => { throw new Error('InvalidStateError'); };
    a.sessao.parar(); expect(a.fins).toEqual([{ texto: 'areia', erro: null }]);
    RecSim.reset();
    const b = falando('areia'); RecSim.ultima().abort = () => { throw new Error('x'); };
    b.sessao.parar(); vi.advanceTimersByTime(2000); expect(b.fins).toHaveLength(1);
  });
  it('resultado vazio ou malformado não quebra', () => {
    const r = falando();
    RecSim.ultima().onresult?.({ resultIndex: 0, results: [] });
    RecSim.ultima().onresult?.({ resultIndex: 0, results: [{ isFinal: true } as never] });
    RecSim.ultima().resultados(['', true]);
    expect(r.textos).toEqual([]);
  });
  it('erro depois do fim é ignorado', () => {
    const r = falando('areia'); r.sessao.parar(); const rec = RecSim.ultima();
    rec.fim(); rec.erro('network'); rec.fim();
    expect(r.fins).toEqual([{ texto: 'areia', erro: null }]);
  });
});

describe('start() logo após o onend falha no iOS: novas tentativas', () => {
  function ate(falhas: number) {
    const r = falando('areia'); RecSim.falhasRestantes = falhas; RecSim.ultima().fim(); return r;
  }
  it('falha duas vezes e a terceira funciona; o texto segue juntando', () => {
    const r = ate(2); vi.advanceTimersByTime(NOVA_TENTATIVA_MS * 2);
    expect(RecSim.ultima().iniciou).toBe(1); expect(r.fins).toEqual([]);
    RecSim.ultima().abriu(); RecSim.ultima().resultados(['no pix', true]);
    expect(texto(r)).toBe('areia no pix');
  });
  it('falha sempre mas já há texto: guarda o texto e NÃO mostra erro', () => {
    RecSim.reset(); const r = falando('areia'); RecSim.falhaNoStart = 'x'; RecSim.ultima().fim();
    vi.advanceTimersByTime(1000);
    expect(r.fins).toEqual([{ texto: 'areia', erro: null }]); expect(estado(r)).toBe('pronto'); expect(vi.getTimerCount()).toBe(0);
  });
  it('falha sempre e nunca houve fala: erro de início', () => {
    const r = falando(); RecSim.falhaNoStart = 'x'; RecSim.ultima().fim(); vi.advanceTimersByTime(1000);
    expect(r.fins).toEqual([{ texto: '', erro: 'start' }]);
  });
  it('desmontar, parar, silêncio ou limite durante a nova tentativa: fecha limpo, sem timer', () => {
    const d = ate(3); d.sessao.destruir(); vi.advanceTimersByTime(1000);
    expect(d.fins).toEqual([]); expect(vi.getTimerCount()).toBe(0);
    RecSim.reset(); const p = ate(3); p.sessao.parar(); vi.advanceTimersByTime(3000);
    expect(p.fins).toEqual([{ texto: 'areia', erro: null }]);
    RecSim.reset(); const s = ate(1); vi.advanceTimersByTime(SILENCIO_MS + 2000);
    expect(s.fins).toHaveLength(1);
    RecSim.reset(); const l = ate(3); vi.advanceTimersByTime(LIMITE_MS + 5000);
    expect(l.fins).toHaveLength(1); expect(vi.getTimerCount()).toBe(0);
  });
});

// ---- junção de trechos (o Safari às vezes repete o final do trecho anterior ao reiniciar) ----
// Regra: na dúvida, prefere duplicar a apagar fala real (a pessoa vê o texto e confere).
// Só se descarta repetição de 3 ou mais palavras, e nunca quando ela é só valor/unidade.
describe('unirSemRepetir', () => {
  it('repetição longa (3+ palavras) do Safari é descartada, em qualquer posição', () => {
    expect(unirSemRepetir('paguei 360 de cimento', 'paguei 360 de cimento no pix')).toBe('paguei 360 de cimento no pix');
    expect(unirSemRepetir('paguei 360 de cimento', 'paguei 360 de cimento')).toBe('paguei 360 de cimento');
    expect(unirSemRepetir('paguei 360 de cimento', '360 de cimento no pix')).toBe('paguei 360 de cimento no pix');
    expect(unirSemRepetir('360', 'paguei 360 de cimento')).toBe('360 paguei 360 de cimento');
    expect(unirSemRepetir('paguei 360 de cimento', 'ontem paguei 360 de cimento no pix')).toBe('ontem paguei 360 de cimento no pix');
  });
  it('ignora maiúsculas, acentos e pontuação, e mantém o texto original', () => {
    expect(unirSemRepetir('Fundação concluída hoje,', 'fundacao concluida hoje no lote')).toBe('Fundação concluída hoje, no lote');
  });
  it('1 ou 2 palavras repetidas ficam como vieram (as duas)', () => {
    expect(unirSemRepetir('paguei 360', '360 de areia')).toBe('paguei 360 360 de areia');
    expect(unirSemRepetir('paguei 2 mil', '2 mil de cimento')).toBe('paguei 2 mil 2 mil de cimento');
    expect(unirSemRepetir('paguei 50', '50 de cimento e 50 de areia')).toBe('paguei 50 50 de cimento e 50 de areia');
    expect(unirSemRepetir('paguei 360 de', '360 de cimento')).toBe('paguei 360 de 360 de cimento');
    expect(unirSemRepetir('paguei 360', 'paguei 360')).toBe('paguei 360 paguei 360');
  });
  it('nunca descarta repetição que seja só valor/unidade, mesmo longa', () => {
    expect(unirSemRepetir('paguei dois mil e quinhentos', 'dois mil e quinhentos de cimento'))
      .toBe('paguei dois mil e quinhentos dois mil e quinhentos de cimento');
    expect(unirSemRepetir('dois mil', 'e dois mil')).toBe('dois mil e dois mil');
    expect(unirSemRepetir('paguei 2 mil reais', '2 mil reais de cimento')).toBe('paguei 2 mil reais 2 mil reais de cimento');
    expect(unirSemRepetir('mil e quinhentos reais', 'mil e quinhentos reais')).toBe('mil e quinhentos reais mil e quinhentos reais');
  });
  it('dois valores iguais legítimos, separados por um reinício, continuam os dois', () => {
    expect(unirSemRepetir('paguei 360 de cimento', '360 de areia')).toBe('paguei 360 de cimento 360 de areia');
    const r = falando('paguei 360 de cimento'); reiniciar(); RecSim.ultima().resultados(['360 de areia', true]);
    expect(texto(r)).toBe('paguei 360 de cimento 360 de areia');
  });
  it('dentro de uma mesma instância nada é descartado', () => {
    expect(texto(falando('360 360 360'))).toBe('360 360 360');
  });
  it('trechos vazios, só pontuação, quebras de linha e texto longo', () => {
    expect(unirSemRepetir('', 'a b')).toBe('a b'); expect(unirSemRepetir('a b', '')).toBe('a b'); expect(unirSemRepetir('', '')).toBe('');
    expect(unirSemRepetir('a - -', '- - b')).toBe('a - - - - b');
    expect(unirSemRepetir(' paguei\n360 de cimento ', '\t360   de cimento no pix')).toBe('paguei 360 de cimento no pix');
    const a = Array.from({ length: 500 }, (_, i) => `p${i}`).join(' ');
    expect(unirSemRepetir(a, 'p497 p498 p499 novo').split(' ')).toHaveLength(501);
  });
  it('em cadeia, três instâncias repetindo o final: sem duplicar', () => {
    const r = falando('a1 b2 c3'); reiniciar(); RecSim.ultima().resultados(['a1 b2 c3 d4', true]);
    reiniciar(); RecSim.ultima().resultados(['b2 c3 d4 e5', true]);
    expect(texto(r)).toBe('a1 b2 c3 d4 e5');
  });
  it('parcial que cresce na nova instância repetindo o anterior não duplica a cada atualização', () => {
    const r = falando('paguei 360 de'); reiniciar();
    RecSim.ultima().resultados(['paguei 360 de', false]);
    RecSim.ultima().resultados(['paguei 360 de cimento', true]);
    expect(texto(r)).toBe('paguei 360 de cimento');
  });
});
