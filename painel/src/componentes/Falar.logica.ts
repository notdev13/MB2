import {
  criarSessao, juntarTexto, mensagemErro, vibrar,
  type ConstrutorVoz, type EstadoVoz, type Sessao,
} from './sessaoVoz';

// Lógica do campo "fale ou escreva": quem manda no texto (o que a pessoa digitou, o que o microfone
// está escrevendo ao vivo e o texto que já existia). Sem React, para poder ser testada.
//
// Regra de ouro: o texto digitado nunca é sobrescrito. O texto ao vivo só é aplicado enquanto o campo
// ainda tem exatamente o último valor que este código escreveu (`ultimo`). Qualquer edição manual
// pára a escuta e passa a valer como nova base; o que o microfone entregar depois é descartado.

export interface EstadoTexto {
  texto: string;
  base: string;                 // texto que existia quando a escuta começou (ou o último digitado)
  ultimo: string | null;        // último valor escrito por este código; null = a pessoa editou
  entenderNoFim: boolean;       // ao terminar a escuta normalmente, preenche o formulário
}

export type Acao =
  | { t: 'ouvir' }
  | { t: 'vivo'; falado: string }
  | { t: 'fim'; falado: string }
  | { t: 'digitar'; valor: string; ativa: boolean }
  | { t: 'focar'; ativa: boolean }
  | { t: 'enter'; ativa: boolean }
  | { t: 'preencher' }
  | { t: 'limpar' };

export interface Transicao { estado: EstadoTexto; parar: boolean; entender: string | null }

export const textoInicial = (): EstadoTexto => ({ texto: '', base: '', ultimo: '', entenderNoFim: true });

export function transicao(e: EstadoTexto, a: Acao): Transicao {
  const igual = (estado: EstadoTexto, parar = false, entender: string | null = null): Transicao => ({ estado, parar, entender });
  switch (a.t) {
    case 'ouvir':
      return igual({ texto: e.texto, base: e.texto.trim(), ultimo: e.texto, entenderNoFim: true });
    case 'vivo': {
      if (e.ultimo === null || e.texto !== e.ultimo) return igual(e);
      const texto = juntarTexto(e.base, a.falado);
      return igual({ ...e, texto, ultimo: texto });
    }
    case 'fim': {
      if (e.ultimo === null || e.texto !== e.ultimo || !a.falado.trim()) return igual(e);
      const texto = juntarTexto(e.base, a.falado);
      return igual({ ...e, texto, ultimo: texto }, false, e.entenderNoFim ? texto : null);
    }
    case 'digitar':
      return igual({ texto: a.valor, base: a.valor.trim(), ultimo: null, entenderNoFim: false }, a.ativa);
    case 'focar':
      return a.ativa ? igual({ ...e, entenderNoFim: false }, true) : igual(e);
    case 'enter': {
      const t = e.texto.trim();
      if (!t) return igual(e);
      // Durante a escuta: pára e entende o que está na tela; o que chegar depois não muda mais nada.
      return a.ativa ? igual({ ...e, ultimo: null, entenderNoFim: false }, true, t) : igual(e, false, t);
    }
    case 'preencher':
      return igual(e, false, e.texto.trim() || null);
    case 'limpar':
      return igual({ texto: '', base: '', ultimo: null, entenderNoFim: false });
  }
}

export interface Visao { texto: string; estado: EstadoVoz; erro: string | null }

export interface ControleFalar {
  visao(): Visao;
  ouvir(): void;               // alterna: se está escutando, pára
  digitar(valor: string): void;
  focar(): void;
  enter(): void;
  preencher(): void;
  limpar(): void;
  destruir(): void;
}

export interface OpcoesControle {
  obterConstrutor: () => ConstrutorVoz | null;
  aoEntender: (texto: string) => void;
  aoMudar: (v: Visao) => void;
}

export function construtorDoNavegador(): ConstrutorVoz | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: ConstrutorVoz; webkitSpeechRecognition?: ConstrutorVoz };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function criarControleFalar(o: OpcoesControle): ControleFalar {
  let e = textoInicial();
  let estado: EstadoVoz = 'pronto';
  let erro: string | null = null;
  let sessao: Sessao | null = null;
  let vivo = true;

  const ativa = () => estado === 'pedindo' || estado === 'ouvindo' || estado === 'processando';
  const visao = (): Visao => ({ texto: e.texto, estado, erro });
  const emitir = () => { if (vivo) o.aoMudar(visao()); };

  function aplicar(a: Acao) {
    if (!vivo) return;
    const res = transicao(e, a);
    e = res.estado;               // primeiro o estado novo: o parar() pode chamar de volta (aoFim)
    if (res.parar) sessao?.parar();
    emitir();
    if (res.entender && vivo) o.aoEntender(res.entender);
  }

  return {
    visao,
    ouvir() {
      if (!vivo) return;
      if (estado === 'pedindo' || estado === 'ouvindo') { sessao?.parar(); return; }
      if (estado === 'processando') return;
      const R = o.obterConstrutor();
      if (!R) return;
      e = transicao(e, { t: 'ouvir' }).estado;
      erro = null;
      vibrar(10);
      const s = criarSessao({
        construtor: R,
        aoEstado: (novo) => { if (!vivo) return; estado = novo; emitir(); },
        aoTexto: (falado) => aplicar({ t: 'vivo', falado }),
        aoFim: (falado, codigo) => {
          if (!vivo) return;
          sessao = null;
          vibrar(falado ? [20, 40, 20] : 40);
          if (codigo) erro = mensagemErro(codigo);
          aplicar({ t: 'fim', falado });
        },
      });
      sessao = s;
      s.iniciar();
    },
    digitar: (valor) => aplicar({ t: 'digitar', valor, ativa: ativa() }),
    focar: () => aplicar({ t: 'focar', ativa: ativa() }),
    enter: () => aplicar({ t: 'enter', ativa: ativa() }),
    preencher: () => aplicar({ t: 'preencher' }),
    limpar() {
      if (!vivo) return;
      erro = null;
      if (!ativa()) estado = 'pronto';
      aplicar({ t: 'limpar' });
    },
    destruir() {
      vivo = false;
      sessao?.destruir();
      sessao = null;
    },
  };
}
