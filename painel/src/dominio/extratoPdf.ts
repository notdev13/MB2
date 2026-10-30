import { MAX_SALDO } from './saldos';

// Candidatos de saldo e de data a partir do TEXTO de um PDF de extrato. Funções puras.
//
// PDF de banco não tem formato padrão: cada banco tem o seu layout. Por isso nada aqui decide
// sozinho: o painel LISTA o que achou e o dono escolhe (valor, sinal e data). A heurística é
// conservadora: só olha linhas com a palavra "saldo", só pega o primeiro valor depois dela, e
// nunca escolhe por conta própria um candidato duvidoso (ver candidatoPreSelecionado).

export interface CandidatoSaldo {
  valor: number; // centavos; negativo = devedor. Se sinalIncerto, o dono escolhe o sinal
  trecho: string; // linha de origem, MASCARADA (sem sequências de 6+ dígitos, CPF, CNPJ)
  pontuacao: number; // 0 a 100: quão provável é ser o saldo atual da conta
  anterior: boolean; // "saldo anterior"/"inicial": quase nunca é o que se quer
  sinalIncerto: boolean; // marcas de sinal contraditórias ou ausentes onde deveriam existir
  data?: string; // AAAA-MM-DD, se a linha do saldo traz a data ("saldo em 30/10/2026")
}

export interface CandidatoData { data: string; trecho: string; pontuacao: number }

export interface CandidatosPdf {
  saldos: CandidatoSaldo[];
  datas: CandidatoData[];
  periodoFim?: string; // fim do período do extrato ("de 01/10/2026 a 30/10/2026")
}

export interface ItemTexto { str: string; x: number; y: number }

// Só candidato com pontuação a partir daqui pode vir destacado (e ainda assim o dono confirma).
export const PONTUACAO_MIN_PRESELECAO = 70;
export const MAX_CANDIDATOS = 12;

const MAX_LINHAS = 20_000;
const MAX_CHARS_LINHA = 2000;
const MAX_TRECHO = 140;

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Tira dos trechos o que identifica pessoa ou conta: CNPJ, CPF, conta com dígito (12345-6) e qualquer
// sequência de 6+ dígitos. Também tira < e > (o trecho só é mostrado como texto, nunca como HTML).
export function mascarar(texto: string): string {
  return String(texto)
    .replace(/[\u0000-\u001f\u007f<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g, '••••')
    .replace(/\d{3}\.\d{3}\.\d{3}-\d{2}/g, '••••')
    .replace(/\d{4,}-[\dxX]/g, '••••')
    .replace(/\d{6,}/g, '••••')
    .slice(0, MAX_TRECHO);
}

// ---- datas ----

const DATA = String.raw`\d{1,2}\/\d{1,2}\/(?:\d{4}|\d{2})`;
const RE_DATA = new RegExp(String.raw`(^|[^\d/])(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})(?![\d/])`, 'g');

function dataValida(d: string, m: string, a: string): string | null {
  let ano = Number(a);
  if (a.length === 2) ano += 2000;
  const mes = Number(m);
  const dia = Number(d);
  if (ano < 1990 || ano > 2100 || mes < 1 || mes > 12 || dia < 1) return null;
  if (dia > new Date(Date.UTC(ano, mes, 0)).getUTCDate()) return null;
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function datasDe(texto: string): string[] {
  const achadas: string[] = [];
  for (const m of texto.matchAll(RE_DATA)) {
    const iso = dataValida(m[2], m[3], m[4]);
    if (iso) achadas.push(iso);
  }
  return achadas;
}

const RE_PERIODO = new RegExp(String.raw`(?:\bde|periodo)[:\s]*(${DATA})\s*(?:a|ate|ao|[-–—])\s*(${DATA})`, 'g');

function fimDoPeriodo(norm: string): string | null {
  let fim: string | null = null;
  for (const m of norm.matchAll(RE_PERIODO)) {
    const [ini, f] = [datasDe(m[1])[0], datasDe(m[2])[0]];
    if (ini && f && f >= ini && (!fim || f > fim)) fim = f;
  }
  return fim;
}

// ---- valores ----

const NUMERO = String.raw`(\d{1,3}(?:\.\d{3})+|\d+),(\d{2})(?!\d)`;
// grupos: 1 prefixo, 2 "(", 3 sinal antes, 4 sinal depois do R$, 5 inteiros, 6 centavos, 7 ")", 8 "-" no fim, 9 D/C
const VALOR = String.raw`(^|[^\d.,])(\()?([+-])?\s?(?:r\$)?\s?([+-])?${NUMERO}(\))?(-)?(?:\s?([dc])(?![a-z0-9/]))?`;
const RE_VALOR = new RegExp(VALOR);
const RE_SO_VALOR = new RegExp(`^\\s*${VALOR.replace('(^|[^\\d.,])', '')}\\s*$`);

function centavos(inteiros: string, cents: string): number | null {
  const limpo = inteiros.replace(/\./g, '').replace(/^0+(?=\d)/, '');
  if (limpo.length > 12) return null;
  const v = Number(limpo) * 100 + Number(cents);
  return Number.isSafeInteger(v) && v <= MAX_SALDO ? v : null;
}

interface Lido { valor: number; sinalIncerto: boolean; fimDoTrecho: number }

function lerValor(m: RegExpExecArray, rotulo: string): Lido | null {
  const abs = centavos(m[5], m[6]);
  if (abs === null) return null;
  const simbNeg = m[3] === '-' || m[4] === '-' || (!!m[2] && !!m[7]) || m[8] === '-' || m[9] === 'd';
  const simbPos = m[3] === '+' || m[4] === '+' || m[9] === 'c';
  const devedor = /devedor|negativo/.test(rotulo);
  const credor = /credor/.test(rotulo);
  const conflito = (simbNeg && simbPos) || (simbNeg && credor) || (simbPos && devedor) || (credor && devedor);
  const incerto = conflito || (!simbNeg && !simbPos && devedor);
  return { valor: simbNeg ? -abs : abs, sinalIncerto: incerto, fimDoTrecho: m.index + m[0].length };
}

function pontuarRotulo(rotulo: string): { pontuacao: number; anterior: boolean } {
  if (/anterior|inicial|abertura/.test(rotulo)) return { pontuacao: 20, anterior: true };
  if (/bloquead|a liberar|retido|limite|cheque especial|investid|aplica/.test(rotulo)) return { pontuacao: 25, anterior: false };
  if (/saldo (?:final|atual|contabil)/.test(rotulo)) return { pontuacao: 90, anterior: false };
  if (/saldo em\s+\d/.test(rotulo)) return { pontuacao: 85, anterior: false };
  if (/saldo (?:do )?dia/.test(rotulo)) return { pontuacao: 80, anterior: false };
  if (/saldo total/.test(rotulo)) return { pontuacao: 75, anterior: false };
  if (/disponivel/.test(rotulo)) return { pontuacao: 60, anterior: false };
  return { pontuacao: 55, anterior: false };
}

// ---- candidatos ----

interface Entrada { c: CandidatoSaldo; ordem: number }

export function candidatosDoTexto(linhas: string[]): CandidatosPdf {
  const vazio: CandidatosPdf = { saldos: [], datas: [] };
  try {
    if (!Array.isArray(linhas)) return vazio;
    const textos = linhas.slice(0, MAX_LINHAS).map((l) => (typeof l === 'string' ? l.slice(0, MAX_CHARS_LINHA) : ''));
    const norms = textos.map(semAcento);

    const saldos: Entrada[] = [];
    const datas = new Map<string, CandidatoData>();
    let periodoFim: string | null = null;

    const guardarData = (iso: string, trecho: string, pontuacao: number) => {
      const atual = datas.get(iso);
      if (!atual || pontuacao > atual.pontuacao) datas.set(iso, { data: iso, trecho, pontuacao });
    };

    textos.forEach((original, i) => {
      const norm = norms[i];
      const fim = fimDoPeriodo(norm);
      if (fim && (!periodoFim || fim > periodoFim)) periodoFim = fim;
      const trecho = mascarar(original);
      const temSaldo = norm.includes('saldo');
      const base = fim ? 70 : temSaldo ? 80 : 30;
      for (const iso of datasDe(norm)) guardarData(iso, trecho, iso === fim ? 70 : base);

      if (!temSaldo) return;
      // Cada "saldo" abre um trecho que vai até o próximo "saldo": ali só vale o primeiro valor.
      const inicios = [...norm.matchAll(/saldo/g)].map((m) => m.index);
      inicios.forEach((ini, k) => {
        const seg = norm.slice(ini, inicios[k + 1] ?? norm.length);
        const m = RE_VALOR.exec(seg);
        let rotulo = seg;
        let lido: Lido | null = null;
        let desconto = 0;
        let origem = trecho;
        if (m) {
          rotulo = seg.slice(0, m.index + m[1].length);
          lido = lerValor(m, rotulo);
        } else if (k === inicios.length - 1 && i + 1 < norms.length) {
          const prox = RE_SO_VALOR.exec(norms[i + 1].trim());
          if (prox) {
            // o regex ancorado não tem o grupo do prefixo: refaz o mapa de grupos
            const ajuste = [prox[0], '', ...prox.slice(1)] as unknown as RegExpExecArray;
            ajuste.index = 0;
            lido = lerValor(ajuste, rotulo);
            desconto = 5;
            origem = mascarar(`${original} ${textos[i + 1]}`);
          }
        }
        if (!lido) return;
        const { pontuacao, anterior } = pontuarRotulo(rotulo);
        const data = datasDe(rotulo)[0];
        const c: CandidatoSaldo = {
          valor: lido.valor, trecho: origem, pontuacao: Math.max(0, pontuacao - desconto), anterior, sinalIncerto: lido.sinalIncerto,
          ...(data ? { data } : {}),
        };
        saldos.push({ c, ordem: i * 1000 + k });
      });
    });

    // Sem repetir o mesmo valor; ordena por pontuação (e, em empate, o que aparece mais embaixo no documento).
    const unicos = new Map<string, Entrada>();
    for (const e of saldos) {
      const chave = `${e.c.valor}|${e.c.anterior}`;
      const atual = unicos.get(chave);
      if (!atual || e.c.pontuacao > atual.c.pontuacao) unicos.set(chave, e);
    }
    const ordenados = [...unicos.values()]
      .sort((a, b) => b.c.pontuacao - a.c.pontuacao || b.ordem - a.ordem)
      .slice(0, MAX_CANDIDATOS)
      .map((e) => e.c);
    const listaDatas = [...datas.values()]
      .sort((a, b) => b.pontuacao - a.pontuacao || b.data.localeCompare(a.data))
      .slice(0, MAX_CANDIDATOS);
    return { saldos: ordenados, datas: listaDatas, ...(periodoFim ? { periodoFim } : {}) };
  } catch {
    return vazio;
  }
}

// Só destaca um saldo quando não há dúvida razoável: pontuação alta, sinal certo, não é "anterior"
// e nenhum outro valor empata com ele. Em qualquer outro caso o dono escolhe do zero.
export function candidatoPreSelecionado(saldos: CandidatoSaldo[]): CandidatoSaldo | null {
  let melhor: CandidatoSaldo | null = null;
  for (const s of saldos) if (!melhor || s.pontuacao > melhor.pontuacao) melhor = s;
  if (!melhor || melhor.anterior || melhor.sinalIncerto || melhor.pontuacao < PONTUACAO_MIN_PRESELECAO) return null;
  const empate = saldos.some((s) => s !== melhor && s.pontuacao === melhor!.pontuacao && s.valor !== melhor!.valor);
  return empate ? null : melhor;
}

// Datas para o dono escolher; a data escrita na linha do saldo que ele escolheu vem primeiro.
export function datasParaEscolher(r: CandidatosPdf, saldo: CandidatoSaldo | null): CandidatoData[] {
  if (!saldo?.data) return r.datas;
  const da = r.datas.find((d) => d.data === saldo.data) ?? { data: saldo.data, trecho: saldo.trecho, pontuacao: 95 };
  return [da, ...r.datas.filter((d) => d.data !== saldo.data)];
}

// Itens de texto do PDF (cada pedaço com posição) -> linhas, de cima para baixo e da esquerda para a direita.
export function agruparEmLinhas(itens: ItemTexto[]): string[] {
  const validos = itens.filter((i) => typeof i.str === 'string' && i.str.trim() !== '' && Number.isFinite(i.x) && Number.isFinite(i.y));
  validos.sort((a, b) => b.y - a.y);
  const linhas: ItemTexto[][] = [];
  let yAtual = Number.NaN;
  for (const item of validos) {
    if (linhas.length === 0 || Math.abs(item.y - yAtual) > 3) {
      linhas.push([]);
      yAtual = item.y;
    }
    linhas[linhas.length - 1].push(item);
  }
  return linhas
    .map((l) => l.sort((a, b) => a.x - b.x).map((i) => i.str.trim()).join(' ').replace(/\s+/g, ' ').trim())
    .filter((l) => l !== '');
}
