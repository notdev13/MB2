// Reconhecedor simulado para testes: reproduz o que o Safari do iPhone faz, sob controle do teste.
import type { ConstrutorVoz, EstadoVoz, ReconhecedorVoz, ResultadoVoz } from './sessaoVoz';
import { criarSessao, type OpcoesSessao, type Sessao } from './sessaoVoz';

export class RecSim implements ReconhecedorVoz {
  static todas: RecSim[] = [];
  static falhaNoStart: string | null = null; // faz start() lançar exceção
  lang = ''; interimResults = false; continuous = true;
  onstart: (() => void) | null = null;
  onaudiostart: (() => void) | null = null;
  onresult: ReconhecedorVoz['onresult'] = null;
  onerror: ReconhecedorVoz['onerror'] = null;
  onend: (() => void) | null = null;
  iniciou = 0; parou = 0; abortou = 0;
  vivo = false;
  constructor() { RecSim.todas.push(this); }
  start() {
    if (RecSim.falhaNoStart) throw new Error(RecSim.falhaNoStart);
    if (this.vivo) throw new Error('InvalidStateError');
    this.vivo = true; this.iniciou++;
  }
  stop() { this.parou++; }
  abort() { this.abortou++; }
  // ----- comandos do teste -----
  abriu() { this.onstart?.(); this.onaudiostart?.(); }
  /** itens: [texto, final?] — a lista inteira de resultados da instância. */
  resultados(...itens: [string, boolean][]) {
    const results = itens.map(([t, f]) => ({ 0: { transcript: t }, isFinal: f }) as ResultadoVoz);
    this.onresult?.({ resultIndex: 0, results });
  }
  erro(codigo: string) { this.onerror?.({ error: codigo }); }
  fim() { this.vivo = false; this.onend?.(); }
  static ultima() { return RecSim.todas[RecSim.todas.length - 1]; }
  static reset() { RecSim.todas = []; RecSim.falhaNoStart = null; }
}

export interface Registro {
  estados: EstadoVoz[]; textos: string[]; fins: { texto: string; erro: string | null }[];
  sessao: Sessao;
}

export function montar(extra: Partial<OpcoesSessao> = {}): Registro {
  const reg = { estados: [], textos: [], fins: [] } as unknown as Registro;
  reg.sessao = criarSessao({
    construtor: RecSim as unknown as ConstrutorVoz,
    aoEstado: (e) => reg.estados.push(e),
    aoTexto: (t) => reg.textos.push(t),
    aoFim: (texto, erro) => reg.fins.push({ texto, erro }),
    ...extra,
  });
  return reg;
}
