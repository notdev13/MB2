import type { Categoria, Custo, FormaPagamento, Obra } from './tipos';

// Corpus de teste do interpretador de voz (voz.ts): frases escritas à mão e frases geradas por
// modelos, cada uma com o resultado esperado. Tudo sintético: nenhum dado real de cliente ou obra.
// Campo ausente em `esperado` = não conferir; `null` = o interpretador DEVE devolver null.

export interface Esperado {
  valor?: number | null; // centavos
  data?: string | null;
  pagamento?: FormaPagamento | null;
  pago?: boolean | null;
  categoria?: Categoria | null;
  obraId?: string | null;
}
export interface Caso {
  frase: string;
  esperado: Esperado;
  tipo: string; // etiqueta do tipo de erro/assunto, para agrupar as falhas
  pendente?: boolean; // falha conhecida e aceita (aparece no relatório, não quebra o teste)
}

// ---- contexto sintético ----

const obra = (id: string, nome: string): Obra => ({
  id, nome, endereco: '', cliente: '', orcamento: 0, areaM2: null, inicio: null, previsaoFim: null,
  status: 'em_andamento', observacoes: '', criadoEm: '', atualizadoEm: '',
});
let seq = 0;
const custo = (categoria: Categoria, descricao: string, fornecedor = ''): Custo => ({
  id: String(seq++), obraId: 'l39', data: '2026-09-01', categoria, descricao, fornecedor, valor: 100_00,
  pagamento: 'outro', pago: true, criadoEm: '', atualizadoEm: '',
});
export const HOJE = '2026-10-28'; // quarta-feira
export const CONTEXTO = {
  hoje: HOJE,
  obras: [
    obra('l39', 'Obra Geminada JD Campeche – Lote 39'),
    obra('l12', 'Casa 12 Rio Tavares'),
    obra('eco', 'Terreno Ecovillas'),
    obra('oli', 'Olindina Maria Lopes'),
    obra('lau', 'Projeto Laureano'),
  ],
  custos: [
    custo('Mão de obra', 'MÃO DE OBRA – ULISSES', 'Ulisses'),
    custo('Mão de obra', 'MÃO DE OBRA – ADRIANO', 'Adriano'),
    custo('Materiais (M)', 'CASSOL'),
  ],
};

// ---- casos fixos (regressão) ----

const MAT: Categoria = 'Materiais (M)';
const MO: Categoria = 'Mão de obra';
const SERV: Categoria = 'Serviços (S)';

export const CASOS_FIXOS: Caso[] = [
  { tipo: 'base', frase: 'paguei trezentos e sessenta de cimento no lote 39 ontem no pix', esperado: { valor: 360_00, obraId: 'l39', data: '2026-10-27', pagamento: 'pix', pago: true, categoria: MAT } },
  { tipo: 'base', frase: 'mil e quinhentos pro Ulisses de mão de obra na casa 12', esperado: { valor: 1500_00, obraId: 'l12', categoria: MO } },
  { tipo: 'base', frase: 'comprei 20 sacos de cimento por 1.200 reais no boleto a pagar dia 15', esperado: { valor: 1200_00, data: '2026-10-15', pagamento: 'boleto', pago: false } },
  { tipo: 'meio', frase: 'dois mil e meio de areia', esperado: { valor: 2500_00, categoria: MAT } },
  { tipo: 'base', frase: 'R$ 850 de telha na Ecovilas hoje no cartão', esperado: { valor: 850_00, obraId: 'eco', data: HOJE, pagamento: 'cartao' } },
  { tipo: 'data', frase: 'pedreiro 450 sexta passada', esperado: { valor: 450_00, data: '2026-10-23', categoria: MO } },
  { tipo: 'conto', frase: 'um conto e duzentos', esperado: { valor: null } },
  { tipo: 'base', frase: 'cento e vinte e cinco reais de prego', esperado: { valor: 125_00, categoria: MAT } },
  { tipo: 'prazo', frase: 'vinte mil de laje a prazo', esperado: { valor: 20000_00, pago: false } },
  { tipo: 'data', frase: 'quinze de março', esperado: { valor: null, data: '2026-03-15' } },
  { tipo: 'data', frase: 'segunda-feira passada', esperado: { valor: null, data: '2026-10-26' } },
  { tipo: 'base', frase: 'setecentos e cinquenta reais de eletricista, pago em dinheiro', esperado: { valor: 750_00, pagamento: 'dinheiro', pago: true, categoria: SERV } },
  { tipo: 'virgula', frase: 'cimento 1,200', esperado: { valor: 1200_00 } },
  { tipo: 'virgula', frase: 'cimento 1.200,50', esperado: { valor: 1200_50 } },
  { tipo: 'virgula', frase: 'paguei 1,200 de cimento', esperado: { valor: 1200_00 } },
  { tipo: 'mil', frase: 'mil reais de areia', esperado: { valor: 1000_00 } },
  { tipo: 'milhao', frase: 'meio milhão de terreno', esperado: { valor: 500000_00 } },
  { tipo: 'milhao', frase: 'dois milhões e meio de terreno', esperado: { valor: 2500000_00 } },
  { tipo: 'colado', frase: 'R$360 de cimento', esperado: { valor: 360_00 } },
  { tipo: 'centavos', frase: 'trezentos reais e cinquenta centavos de areia', esperado: { valor: 300_50 } },
  { tipo: 'centavos', frase: 'noventa centavos de parafuso', esperado: { valor: 90 } },
  { tipo: 'centavos', frase: 'cinquenta e oito reais e noventa centavos de cola', esperado: { valor: 58_90 } },
  { tipo: 'pagamento', frase: 'pix de 300', esperado: { valor: 300_00, pagamento: 'pix' } },
  { tipo: 'verbo', frase: 'foi 90 de frete', esperado: { valor: 90_00, categoria: SERV } },
  { tipo: 'ruido-pix', frase: 'paguei 1.500 de tijolo no lote 39 pelo pique', esperado: { valor: 1500_00, obraId: 'l39', pagamento: 'pix' } },
  { tipo: 'ruido-boleto', frase: 'bolheto de 800 de tinta', esperado: { valor: 800_00, pagamento: 'boleto' } },
  { tipo: 'ruido', frase: 'então tá, paguei 200 de areia', esperado: { valor: 200_00, pago: true } },
  { tipo: 'ruido', frase: 'hum é 200 de areia', esperado: { valor: 200_00 } },
  { tipo: 'virgula', frase: '2.5 mil de madeira', esperado: { valor: 2500_00 } },
  { tipo: 'parcela', frase: 'três mil e quinhentos de concreto em 3 vezes', esperado: { valor: 3500_00, pago: false } },
  { tipo: 'parcela', frase: 'parcelado em 3x de 500 de piso', esperado: { valor: 500_00, pago: false } },
  { tipo: 'parcela', frase: 'dez parcelas de 300 de azulejo', esperado: { valor: 300_00 } },
  { tipo: 'extenso', frase: 'mil trezentos e vinte de ferro', esperado: { valor: 1320_00 } },
  { tipo: 'extenso', frase: 'mil e vinte e cinco reais de fio', esperado: { valor: 1025_00 } },
  { tipo: 'extenso', frase: 'duzentos e cinquenta e um reais de cabo', esperado: { valor: 251_00 } },
  { tipo: 'duvida', frase: 'dois e meio de madeira', esperado: { valor: null } },
  { tipo: 'duvida', frase: 'quinhentos e meia de brita', esperado: { valor: null } },
  { tipo: 'duvida', frase: 'vinte e cinco e cinquenta de prego', esperado: { valor: null } },
  { tipo: 'duvida', frase: 'três e cinquenta de areia', esperado: { valor: null } },
  { tipo: 'duvida', frase: 'paguei 15 sacos de cimento a 40 reais cada', esperado: { valor: null } },
  { tipo: 'duvida', frase: 'dois mil de ferro e quinhentos de areia', esperado: { valor: null } },
  { tipo: 'obra-data', frase: 'Laureano 2 mil de armador dia 5 no pix', esperado: { valor: 2000_00, obraId: 'lau', data: '2026-10-05', pagamento: 'pix' } },
  { tipo: 'pagamento', frase: 'paguei 780 de tubo no débito', esperado: { valor: 780_00, pagamento: 'cartao' } },
  { tipo: 'mil', frase: 'paguei o pedreiro 1,5 mil', esperado: { valor: 1500_00, categoria: MO } },
  { tipo: 'mil', frase: 'sessenta e cinco mil reais de empreitada', esperado: { valor: 65000_00 } },
  { tipo: 'data', frase: 'quarta-feira passada 300 de areia', esperado: { valor: 300_00, data: '2026-10-21' } },
  { tipo: 'parcela', frase: 'R$ 1.200 de brita no cartão em 6 vezes', esperado: { valor: 1200_00, pagamento: 'cartao', pago: false } },
  { tipo: 'extenso', frase: 'quinhentos e cinquenta e nove', esperado: { valor: 559_00 } },
  { tipo: 'extenso', frase: 'mil duzentos e cinquenta', esperado: { valor: 1250_00 } },
  { tipo: 'extenso', frase: 'mil e duzentos e cinquenta', esperado: { valor: 1250_00 } },
  { tipo: 'numero-obra', frase: 'lote 39 trezentos reais de areia', esperado: { valor: 300_00, obraId: 'l39' } },
];

// ---- gerador de frases ----

function aleatorio(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const UN = ['zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez', 'onze', 'doze',
  'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
const DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const CEN = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function ate999(n: number): string {
  if (n === 100) return 'cem';
  const partes: string[] = [];
  if (n >= 100) partes.push(CEN[Math.floor(n / 100)]);
  const r = n % 100;
  if (r > 0) partes.push(r < 20 ? UN[r] : DEZ[Math.floor(r / 10)] + (r % 10 ? ' e ' + UN[r % 10] : ''));
  return partes.join(' e ');
}

// 1200 -> "mil e duzentos"; 1320 -> "mil trezentos e vinte" (como o iPhone costuma escrever).
export function porExtenso(n: number): string {
  if (n === 0) return 'zero';
  const milhoes = Math.floor(n / 1_000_000);
  const mil = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (milhoes) partes.push(milhoes === 1 ? 'um milhão' : ate999(milhoes) + ' milhões');
  if (mil) partes.push(mil === 1 ? 'mil' : ate999(mil) + ' mil');
  if (resto) partes.push(ate999(resto));
  let texto = partes[0];
  for (let i = 1; i < partes.length; i++) {
    const ultima = i === partes.length - 1;
    const simples = i === partes.length - 1 && (resto < 100 || resto % 100 === 0);
    texto += (ultima && simples ? ' e ' : ' ') + partes[i];
  }
  return texto;
}

const milhar = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const centavosTexto = (n: number) => String(n).padStart(2, '0');

const ITENS: [string, Categoria][] = [
  ['cimento', MAT], ['areia', MAT], ['tijolo', MAT], ['telha', MAT], ['tinta', MAT], ['prego', MAT], ['brita', MAT],
  ['pedreiro', MO], ['servente', MO], ['eletricista', SERV], ['frete', SERV], ['encanador', SERV],
  ['ITBI', 'Impostos e taxas'], ['aluguel de andaime', 'Locação e consumo'],
];
const OBRAS: [string[], string][] = [
  [['no lote 39', 'na obra do lote 39', 'lote 39'], 'l39'],
  [['na casa 12', 'casa 12'], 'l12'],
  [['na Ecovilas', 'no terreno Ecovillas', 'na eco vilas'], 'eco'],
  [['na Olindina', 'na obra da Olindina'], 'oli'],
  [['no Laureano', 'no projeto Laureano'], 'lau'],
];
const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro'];

const doisDig = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${doisDig(d.getMonth() + 1)}-${doisDig(d.getDate())}`;

// Gera `quantidade` frases com gabarito. `nivel` 1 = simples ... 4 = difíceis. Mesma semente, mesmas frases.
export function gerarCasos(semente: number, quantidade: number, nivel: number): Caso[] {
  const r = aleatorio(semente * 7919 + nivel);
  const esc = <T,>(l: T[]): T => l[Math.floor(r() * l.length)];
  const casos: Caso[] = [];
  const hoje = new Date(2026, 9, 28);

  while (casos.length < quantidade) {
    // valor
    const tipoValor = esc(nivel === 1
      ? ['num', 'num', 'reais', 'rs', 'extenso']
      : nivel === 2
        ? ['num', 'reais', 'rs', 'extenso', 'extenso', 'centavos', 'milvirg', 'conto', 'mil']
        : ['num', 'extenso', 'centavos', 'milvirg', 'conto', 'mil', 'colado', 'milhar3', 'ext-centavos', 'meio', 'virg-cent']);
    let reais = esc([35, 90, 120, 250, 360, 450, 780, 850, 1200, 1500, 2300, 4800, 12000, 25000, 65000]);
    let cent = 0;
    let fala: string;
    let tipo = 'valor-' + tipoValor;
    switch (tipoValor) {
      case 'num': fala = esc([String(reais), milhar(reais)]); break;
      case 'reais': fala = `${esc([String(reais), milhar(reais)])} reais`; break;
      case 'rs': fala = `R$ ${milhar(reais)}`; break;
      case 'colado': fala = `R$${reais}`; break;
      case 'extenso': fala = porExtenso(reais) + esc(['', '', ' reais']); break;
      case 'centavos': cent = esc([10, 25, 50, 75, 90]); fala = `${milhar(reais)},${centavosTexto(cent)}`; break;
      case 'virg-cent': cent = esc([50, 99]); fala = `R$ ${milhar(reais)},${centavosTexto(cent)}`; break;
      case 'ext-centavos': cent = esc([10, 25, 50, 75, 90]); fala = `${porExtenso(reais)} reais e ${porExtenso(cent)} centavos`; break;
      case 'milhar3': reais = esc([1200, 1500, 2300, 4800]); fala = `${Math.floor(reais / 1000)},${String(reais % 1000).padStart(3, '0')}`; break;
      case 'milvirg': reais = esc([1500, 2500, 3500, 4500, 12500]); fala = `${reais / 1000 % 1 ? String(reais / 1000).replace('.', ',') : reais / 1000} mil`; break;
      case 'conto': reais = esc([120, 300, 450, 800]); fala = `${esc([String(reais), porExtenso(reais)])} contos`; break;
      case 'mil': reais = esc([1000, 2000, 5000, 30000]); fala = `${reais === 1000 ? 'mil' : porExtenso(reais)} reais`; break;
      case 'meio': { // "dois mil e meio", "meio milhão"
        const k = esc([1, 2, 3, 5, 12]);
        if (r() < 0.2) { reais = 500000; fala = 'meio milhão'; } else { reais = k * 1000 + 500; fala = `${porExtenso(k * 1000)} e meio`; }
        break;
      }
      default: fala = String(reais);
    }
    const valor = reais * 100 + cent;
    const [item, categoria] = esc(ITENS);
    const esperado: Esperado = { valor };
    if (nivel >= 2 || r() < 0.7) esperado.categoria = categoria;

    // obra
    let obraTxt = '';
    if (r() < 0.6) {
      const [frases, id] = esc(OBRAS);
      obraTxt = esc(frases);
      esperado.obraId = id;
    }
    // data
    let dataTxt = '';
    const sorteioData = r();
    if (sorteioData < 0.5) {
      const dia = 1 + Math.floor(r() * 27);
      const m = nivel >= 2 && r() < 0.5 ? Math.floor(r() * 9) : null; // até setembro
      if (m === null) { dataTxt = esc([`dia ${dia}`, `dia ${nivel >= 3 ? porExtenso(dia) : dia}`]); esperado.data = `2026-10-${doisDig(dia)}`; }
      else { dataTxt = `${esc([String(dia), 'dia ' + dia])} de ${MESES[m]}`; esperado.data = `2026-${doisDig(m + 1)}-${doisDig(dia)}`; }
    } else if (sorteioData < 0.75) {
      const o = esc([['hoje', 0], ['ontem', 1], ['anteontem', 2]] as [string, number][]);
      dataTxt = o[0]; const d = new Date(hoje); d.setDate(d.getDate() - o[1]); esperado.data = ymd(d);
    } else if (sorteioData < 0.9) {
      const sem = Math.floor(r() * 7);
      const volta = (3 - sem + 7) % 7 || 7;
      const d = new Date(hoje); d.setDate(d.getDate() - volta); esperado.data = ymd(d);
      const nome = DIAS_SEMANA[sem];
      dataTxt = esc([nome === 'sábado' || nome === 'domingo' ? nome : nome + '-feira', nome + (sem === 0 || sem === 6 ? '' : '-feira') + ' passada']);
    }
    // pagamento
    let pagTxt = '';
    const sorteioPag = r();
    if (sorteioPag < 0.55) {
      const opcoes: [string[], FormaPagamento][] = [
        [['no pix', 'pelo pix', 'via pix'], 'pix'],
        [['no boleto'], 'boleto'],
        [['no cartão', 'no débito', 'no crédito'], 'cartao'],
        [['em dinheiro', 'no dinheiro'], 'dinheiro'],
        [['por transferência', 'por ted'], 'transferencia'],
      ];
      if (nivel >= 2) { opcoes[0][0].push('pelo pique', 'no pique'); opcoes[1][0].push('no bolheto', 'pelo boleto'); }
      const [fr, forma] = esc(opcoes);
      pagTxt = esc(fr); esperado.pagamento = forma;
    }
    // verbo e pago
    const verbo = esc(['paguei', 'comprei', 'foi', 'mandei', 'deu', 'gastei', '']);
    let pagoTxt = '';
    if (verbo === 'paguei') esperado.pago = true;
    if (nivel >= 2 && verbo !== 'paguei' && r() < 0.3) {
      pagoTxt = esc(['a pagar', 'a prazo', 'em aberto', 'fiado']); esperado.pago = false;
    }
    // ruído de transcrição
    const ruidoIni = nivel >= 2 && r() < 0.4 ? esc(['então', 'tá', 'hum', 'é', 'ah', 'então tá', 'olha']) + ' ' : '';
    const ruidoFim = nivel >= 2 && r() < 0.2 ? ' ' + esc(['né', 'tá', 'certo', 'pronto']) : '';

    // ordem das palavras
    const modelo = Math.floor(r() * (nivel >= 3 ? 5 : 3));
    const sobra = [obraTxt, dataTxt, pagTxt, pagoTxt].filter(Boolean);
    if (nivel >= 2) for (let i = sobra.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [sobra[i], sobra[j]] = [sobra[j], sobra[i]]; }
    const corpoItem = `${fala} de ${item}`;
    let frase: string;
    if (modelo === 0) frase = [verbo, corpoItem, ...sobra].filter(Boolean).join(' ');
    else if (modelo === 1) frase = [item, fala, ...sobra].join(' ');
    else if (modelo === 2) frase = [...sobra.slice(0, 1), verbo, corpoItem, ...sobra.slice(1)].filter(Boolean).join(' ');
    else if (modelo === 3) frase = [item, ...sobra, fala].join(' ');
    else frase = [...sobra, verbo, fala, 'de', item].filter(Boolean).join(' ');
    if (modelo === 1 || modelo === 3) { // sem "de" o item é só palavra solta; "paguei" some do início
      if (verbo === 'paguei') esperado.pago = undefined;
    }
    frase = (ruidoIni + frase + ruidoFim).replace(/\s+/g, ' ').trim();
    // "dia 21 mil e quinhentos" ninguém sabe ler (nem uma pessoa): não entra no corpus
    if (dataTxt && frase.includes(dataTxt + ' ' + fala)) continue;
    if (esperado.pago === undefined) delete esperado.pago;
    // a pessoa pode ter dito "mão de obra" por nome; evita ambiguidade item x obra
    casos.push({ frase, esperado, tipo: `${tipo}/m${modelo}` });
  }
  return casos;
}
