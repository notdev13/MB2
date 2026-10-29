// Sessão de reconhecimento de voz: lógica pura (sem React), testável com relógio falso.
// Resolve o que o Safari do iPhone faz de ruim: encerra cedo em pausas (continuous=false),
// manda erros diversos e às vezes termina sem resultado. Não grava nem guarda áudio.

export interface ResultadoVoz { 0: { transcript: string }; isFinal: boolean }
export interface ReconhecedorVoz {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart?: (() => void) | null;
  onaudiostart?: (() => void) | null;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ResultadoVoz> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort?(): void;
}
export type ConstrutorVoz = new () => ReconhecedorVoz;

export type EstadoVoz = 'pronto' | 'pedindo' | 'ouvindo' | 'processando' | 'erro';

export const SILENCIO_MS = 2000;       // depois que a pessoa já falou
export const SEM_FALA_MS = 6000;       // antes de ouvir qualquer palavra
export const LIMITE_MS = 30000;        // tempo total da escuta
export const ESPERA_FIM_MS = 1500;     // se o navegador não avisar o fim, fechamos sozinhos
export const PEDINDO_MS = 20000;      // permissão que nunca responde
export const NOVA_TENTATIVA_MS = 100;  // start() logo após onend pode falhar no iOS
export const MAX_TENTATIVAS = 2;       // novas tentativas antes de desistir
export const MAX_VAZIOS = 4;           // reinícios seguidos sem nenhum resultado
export const CURTA_MS = 300;           // instância que acaba antes disso é suspeita
export const MAX_CURTAS = 5;           // reinícios seguidos curtíssimos (laço)

const CAMINHO = ' Toque no campo e use o microfone do teclado, ou digite.';

export function mensagemErro(codigo: string): string {
  switch (codigo) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'O microfone não foi liberado para este site.' + CAMINHO;
    case 'audio-capture':
      return 'Não encontrei um microfone funcionando.' + CAMINHO;
    case 'network':
      return 'Sem conexão para entender a voz agora.' + CAMINHO;
    case 'no-speech':
      return 'Não ouvi nada. Toque no microfone e fale de novo, ou digite.';
    case 'aborted':
      return 'A escuta foi interrompida. Toque no microfone para tentar de novo.';
    case 'start':
      return 'Não consegui ligar o microfone.' + CAMINHO;
    default:
      return 'Não consegui ouvir.' + CAMINHO;
  }
}

// Erros que não adianta tentar de novo na hora.
const FATAIS = new Set(['not-allowed', 'service-not-allowed', 'audio-capture', 'network']);

export interface OpcoesSessao {
  construtor: ConstrutorVoz;
  lang?: string;
  silencioMs?: number;
  semFalaMs?: number;
  limiteMs?: number;
  aoEstado: (e: EstadoVoz) => void;
  /** Texto falado até agora (sem o texto que já existia antes). Parcial muda ao vivo. */
  aoTexto: (falado: string) => void;
  /** Fim da escuta. `erro` é o código quando algo deu errado (mesmo com texto aproveitável). */
  aoFim: (falado: string, erro: string | null) => void;
}

export interface Sessao {
  iniciar(): boolean;
  parar(): void;
  destruir(): void;
  ativa(): boolean;
}

export function criarSessao(o: OpcoesSessao): Sessao {
  const silencioMs = o.silencioMs ?? SILENCIO_MS;
  const semFalaMs = o.semFalaMs ?? SEM_FALA_MS;
  const limiteMs = o.limiteMs ?? LIMITE_MS;

  let morta = false;
  let ativa = false;
  let encerrando = false;
  let r: ReconhecedorVoz | null = null;
  let acumulado = '';        // frases já fechadas em instâncias anteriores
  let instFinal = '';        // finais da instância atual
  let instParcial = '';      // parcial da instância atual
  let ouviuAlgo = false;     // alguma palavra desde o início
  let teveResultado = false; // a instância atual devolveu algo
  let vazios = 0;
  let curtas = 0;            // instâncias seguidas que acabaram em menos de 300ms
  let inicioInst = 0;
  let erro: string | null = null;
  let tSilencio: ReturnType<typeof setTimeout> | null = null;
  let tLimite: ReturnType<typeof setTimeout> | null = null;
  let tFim: ReturnType<typeof setTimeout> | null = null;
  let tPedindo: ReturnType<typeof setTimeout> | null = null;
  let tTentativa: ReturnType<typeof setTimeout> | null = null;
  let armado = false;        // relógios de silêncio/limite já começaram
  let manual = false;        // a pessoa tocou para parar (sem fala não é erro)

  const limpar = (t: ReturnType<typeof setTimeout> | null) => { if (t) clearTimeout(t); return null; };
  const limparTimers = () => { tSilencio = limpar(tSilencio); tLimite = limpar(tLimite); tFim = limpar(tFim); tPedindo = limpar(tPedindo); tTentativa = limpar(tTentativa); };
  const falado = () => unirSemRepetir(acumulado, juntarTexto(instFinal, instParcial));
  const estado = (e: EstadoVoz) => { if (!morta) o.aoEstado(e); };

  function soltar() {
    if (!r) return;
    r.onstart = r.onaudiostart = null;
    r.onresult = r.onerror = r.onend = null;
    r = null;
  }

  function fechar() {
    if (!ativa) return;
    ativa = false;
    limparTimers();
    acumulado = falado();
    instFinal = instParcial = '';
    const antigo = r;
    soltar();
    if (antigo) { try { antigo.abort ? antigo.abort() : antigo.stop(); } catch { /* já parado */ } }
    if (morta) return;
    const texto = acumulado.trim();
    const cod = erro === 'start' && texto ? null : erro ?? (texto || manual ? null : 'no-speech');
    estado(cod && !texto ? 'erro' : 'pronto');
    o.aoFim(texto, cod);
  }

  function armarSilencio() {
    if (!ativa) return;
    tSilencio = limpar(tSilencio);
    tSilencio = setTimeout(pedirParada, ouviuAlgo ? silencioMs : semFalaMs);
  }

  // Os relógios só começam quando o microfone realmente abriu (a permissão pode demorar).
  function armar() {
    tPedindo = limpar(tPedindo);
    if (armado || !ativa) return;
    armado = true;
    tLimite = setTimeout(pedirParada, limiteMs);
    armarSilencio();
  }

  function pedirParada() {
    if (!ativa || encerrando) return;
    encerrando = true;
    limparTimers();
    estado('processando');
    if (!ativa) return;
    try { r?.stop(); } catch { fechar(); return; }
    tFim = setTimeout(fechar, ESPERA_FIM_MS); // se o onend nunca vier
  }

  // start() logo depois do onend pode lançar InvalidStateError no iOS: tenta de novo antes de desistir.
  function tentarStart(tentativa: number) {
    const atual = r;
    if (!atual || !ativa) return;
    try { atual.start(); } catch {
      if (tentativa >= MAX_TENTATIVAS) { erro = erro ?? 'start'; fechar(); return; }
      tTentativa = setTimeout(() => { tTentativa = null; if (r === atual && ativa) tentarStart(tentativa + 1); }, NOVA_TENTATIVA_MS);
    }
  }

  function novaInstancia(): boolean {
    const Ctor = o.construtor;
    let n: ReconhecedorVoz;
    try { n = new Ctor(); } catch { return false; }
    n.lang = o.lang ?? 'pt-BR';
    n.interimResults = true;
    n.continuous = false;
    instFinal = instParcial = '';
    teveResultado = false;
    inicioInst = Date.now();
    r = n;
    // Só o áudio aberto (ou o primeiro resultado) conta: o onstart pode vir antes do "Permitir".
    n.onaudiostart = () => { if (r === n && ativa && !encerrando) { estado('ouvindo'); armar(); } };
    n.onresult = (e) => {
      if (r !== n || !ativa) return;
      let f = '';
      let p = '';
      for (let i = 0; i < e.results.length; i++) {
        const item = e.results[i];
        if (!item || !item[0]) continue;
        if (item.isFinal) f += item[0].transcript; else p += item[0].transcript;
      }
      instFinal = f;
      instParcial = p;
      if (f.trim() || p.trim()) {
        teveResultado = true;
        ouviuAlgo = true;
        vazios = 0;
        if (!encerrando) { estado('ouvindo'); armar(); armarSilencio(); }
        if (!morta) o.aoTexto(falado());
      }
    };
    n.onerror = (e) => {
      if (r !== n || !ativa) return;
      if (e.error === 'aborted' && encerrando) return; // fomos nós
      if (FATAIS.has(e.error) || (e.error === 'aborted' && !encerrando)) {
        erro = e.error;
        encerrando = true; // não reiniciar; o onend (ou o tempo de espera) fecha
        estado('processando');
        if (!ativa) return;
        limparTimers();
        tFim = setTimeout(fechar, ESPERA_FIM_MS);
      }
      // no-speech: o onend decide se reinicia ou encerra
    };
    n.onend = () => {
      if (r !== n || !ativa) return;
      tFim = limpar(tFim);
      acumulado = falado();
      instFinal = instParcial = '';
      if (!teveResultado) vazios++;
      curtas = Date.now() - inicioInst < CURTA_MS ? curtas + 1 : 0;
      if (encerrando || vazios >= MAX_VAZIOS || curtas >= MAX_CURTAS) {
        if (!encerrando && !ouviuAlgo) erro = erro ?? 'no-speech';
        fechar();
        return;
      }
      // Safari encerrou cedo (pausa): continua ouvindo até o silêncio ou o limite.
      soltar();
      if (!novaInstancia()) { erro = erro ?? 'start'; fechar(); return; }
      tentarStart(0);
    };
    return true;
  }

  return {
    iniciar() {
      if (morta || ativa) return false; // toque duplo
      ativa = true;
      encerrando = false;
      acumulado = '';
      ouviuAlgo = false;
      vazios = 0;
      curtas = 0;
      erro = null;
      armado = false;
      manual = false;
      estado('pedindo');
      if (morta) return false;
      if (!novaInstancia()) { erro = 'start'; ativa = true; fechar(); return false; }
      try { r!.start(); } catch { erro = 'start'; fechar(); return false; }
      tPedindo = setTimeout(() => { if (ativa && !armado) { erro = 'start'; fechar(); } }, PEDINDO_MS);
      return true;
    },
    parar() {
      if (!ativa || morta) return;
      manual = true;
      pedirParada();
    },
    destruir() {
      morta = true;
      ativa = false;
      limparTimers();
      const antigo = r;
      soltar();
      if (antigo) { try { antigo.abort ? antigo.abort() : antigo.stop(); } catch { /* ok */ } }
    },
    ativa: () => ativa,
  };
}

export function vibrar(ms: number | number[]) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(ms);
  } catch { /* iOS não tem */ }
}

/** Junta o texto que já existia com o que acabou de ser falado, sem apagar nada. */
export function juntarTexto(base: string, falado: string): string {
  return [base.trim(), falado.trim()].filter(Boolean).join(' ');
}

const normalizar = (p: string) => p.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Junta o que já foi entendido com o trecho de uma nova instância do reconhecedor. O Safari às vezes
 * repete o final do trecho anterior ao reiniciar: o começo do trecho novo que repete o final do
 * anterior (ignorando maiúsculas, acentos e pontuação) é descartado. Vale também para números: na
 * dúvida, não duplica. Repetições dentro de uma mesma instância não passam por aqui.
 */
export function unirSemRepetir(anterior: string, novo: string): string {
  const a = anterior.trim().split(/\s+/).filter(Boolean);
  const n = novo.trim().split(/\s+/).filter(Boolean);
  const na = a.map(normalizar);
  const nn = n.map(normalizar);
  // O trecho novo já contém tudo o que havia (o Safari reescreveu com mais contexto): vale o novo.
  // Uma palavra sozinha só conta se for número; "de" ou "a" soltos poderiam ser fala nova.
  if (na.length > 0 && na.length <= nn.length && (na.length >= 2 || /\d/.test(na[0]))) {
    for (let i = 0; i + na.length <= nn.length; i++) {
      if (na.every((p, j) => p !== '' && p === nn[i + j])) return [...n.slice(0, i), ...a, ...n.slice(i + na.length)].join(' ');
    }
  }
  for (let k = Math.min(na.length, nn.length); k > 0; k--) {
    let igual = true;
    for (let i = 0; i < k && igual; i++) igual = na[na.length - k + i] === nn[i] && nn[i] !== '';
    if (igual) return [...a, ...n.slice(k)].join(' ');
  }
  return [...a, ...n].join(' ');
}
