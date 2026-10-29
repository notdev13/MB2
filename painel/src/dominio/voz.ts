import { CATEGORIAS, type Categoria, type Custo, type FormaPagamento, type Obra } from './tipos';

// Entende um lançamento falado ou digitado em português ("paguei 360 de cimento no Lote 39 ontem,
// no pix") e devolve os campos do formulário. Roda no aparelho, sem internet. O que não entender
// fica em branco (null) e a pessoa confere tudo antes de salvar.
// Usa o histórico da própria MB2: nomes de quem trabalha na obra, fornecedores e descrições
// já lançadas ensinam a categoria e mantêm o padrão da planilha ("MÃO DE OBRA – ULISSES").

export interface Interpretacao {
  valor: number | null; // centavos
  data: string | null; // AAAA-MM-DD
  obraId: string | null;
  categoria: Categoria | null;
  descricao: string;
  fornecedor: string;
  pagamento: FormaPagamento | null;
  pago: boolean | null;
  faltou: ('valor' | 'obra')[];
}

// ---- texto ----

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
// "Ecovillas" e "eco vilas" ficam iguais: sem acento, minúsculo, sem letra repetida.
const simplificar = (s: string) => semAcento(s.toLowerCase()).replace(/[^a-z0-9]/g, '').replace(/(.)\1+/g, '$1');

// Palavras na forma original (acento e maiúsculas); palavras() devolve as mesmas, na mesma ordem.
function palavrasOriginais(texto: string): string[] {
  return texto
    .replace(/r\$\s*/gi, 'R$ ')
    .replace(/(\d)[ºª°]/g, '$1') // "dia 1º"
    .replace(/[–—]/g, ' ')
    .split(/[\s!?;:()"]+/)
    .map((p) => p.replace(/^[.,]+|[.,]+$/g, ''))
    .filter(Boolean);
}
const palavras = (texto: string) => palavrasOriginais(texto).map((p) => semAcento(p.toLowerCase()));

// ---- números ----

const NUMEROS: Record<string, number> = {
  zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9,
  dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17,
  dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70,
  oitenta: 80, noventa: 90, cem: 100, cento: 100, duzentos: 200, trezentos: 300, quatrocentos: 400,
  quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900,
};

// "5.800", "5800", "360,50", "2,5", "1.234,56", "1,200" -> número; "17/09" e afins não são número.
// "1,200" e "1.200" são mil e duzentos (centavos nunca têm 3 casas).
function numeroEscrito(p: string): number | null {
  if (!/^\d[\d.,]*$/.test(p)) return null;
  let s = p;
  if (/^[1-9]\d{0,2}(,\d{3})+(\.\d{1,2})?$/.test(s)) s = s.replace(/,/g, ''); // 1,200 ou 1,200.50
  else if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const palavraNum = (p: string | undefined) => (p !== undefined && Object.hasOwn(NUMEROS, p) ? NUMEROS[p] : undefined);
const ehMilhar = (p: string | undefined) => p === 'mil';
const ehMilhao = (p: string | undefined) => p === 'milhao' || p === 'milhoes';
const ehMeio = (p: string | undefined) => p === 'meio' || p === 'meia';
// "2,5k" = 2.500
const numeroK = (p: string) => { const m = p.match(/^(\d[\d.,]*)k$/); return m ? numeroEscrito(m[1]) : null; };
const começaNumero = (p: string | undefined) =>
  p !== undefined && (numeroEscrito(p) !== null || numeroK(p) !== null || palavraNum(p) !== undefined || ehMilhar(p));

// Um grupo de 1 a 999 por extenso ("cento e vinte e cinco"), a partir de i.
function lerGrupo(ps: string[], i: number): { valor: number; fim: number } | null {
  let j = i;
  let v = 0;
  const n0 = palavraNum(ps[j]);
  if (!n0) return null;
  if (n0 >= 100) {
    v = n0; j++;
    const e = ps[j] === 'e' ? palavraNum(ps[j + 1]) : undefined;
    if (!e || e >= 100) return { valor: v, fim: j };
    j++; // o "e" de "cento e vinte"
  }
  const n = palavraNum(ps[j]);
  if (!n || n >= 100) return v ? { valor: v, fim: j } : null;
  v += n; j++;
  if (n >= 20 && ps[j] === 'e') {
    const u = palavraNum(ps[j + 1]);
    if (u && u <= 9) { v += u; j += 2; }
  }
  return { valor: v, fim: j };
}

interface Numero { inicio: number; fim: number; valor: number | null } // fim exclusivo; null = ambíguo

// Lê o número que começa em i: "cinco mil e oitocentos", "2,5 mil", "dois mil e meio", "meio milhão".
// Se a fala tem mais de uma leitura possível ("dois e meio", "vinte e cinco e cinquenta"), valor = null.
function lerNumero(ps: string[], i: number): Numero | null {
  let j = i;
  let total = 0;
  let escala = 0; // última escala usada (mil, milhão) quando nada vem depois dela
  let ambiguo = false;
  if (ehMeio(ps[j]) && ehMilhao(ps[j + 1])) return { inicio: i, fim: j + 2, valor: 500_000 };
  const escrito = numeroEscrito(ps[j]);
  const emK = numeroK(ps[j]);
  if (escrito !== null || emK !== null) {
    total = escrito ?? (emK as number) * 1000; j++;
    const mult = emK !== null ? 1000 : ehMilhar(ps[j]) ? 1000 : ehMilhao(ps[j]) ? 1_000_000 : 0;
    if (emK !== null) escala = 1000;
    else if (mult) { total *= mult; escala = mult; j++; }
    // "5 mil e 500"
    const resto = ps[j] === 'e' && mult === 1000 && emK === null ? numeroEscrito(ps[j + 1] ?? '') : null;
    if (resto !== null && Number.isInteger(resto) && resto >= 1 && resto < 1000) { total += resto; j += 2; escala = 0; }
  } else {
    let algo = false;
    for (const [teste, mult] of [[ehMilhao, 1_000_000], [ehMilhar, 1000]] as const) {
      const s = algo && ps[j] === 'e' ? j + 1 : j;
      const g = lerGrupo(ps, s);
      const k = g ? g.fim : s;
      if (!teste(ps[k]) || (!g && mult === 1_000_000)) continue;
      total += (g?.valor ?? 1) * mult; j = k + 1; escala = mult; algo = true;
    }
    if (algo) {
      const g = lerGrupo(ps, ps[j] === 'e' ? j + 1 : j);
      if (g) { total += g.valor; j = g.fim; escala = 0; }
    } else {
      const g = lerGrupo(ps, j);
      if (!g) return null;
      total = g.valor; j = g.fim;
    }
  }
  // "e meio": metade da escala ("dois mil e meio" = 2.500); sem escala ("dois e meio") é dúvida.
  if (ps[j] === 'e' && ehMeio(ps[j + 1])) {
    if (escala) total += escala / 2; else ambiguo = true;
    j += 2;
  }
  // Outro número colado por "e" ("vinte e cinco e cinquenta"): não dá para saber o que é, deixa em dúvida.
  if (ps[j] === 'e' && começaNumero(ps[j + 1])) {
    const resto = lerNumero(ps, j + 1);
    if (resto) { ambiguo = true; j = resto.fim; }
  }
  return { inicio: i, fim: j, valor: ambiguo ? null : total };
}

function numerosDe(ps: string[]): Numero[] {
  const lista: Numero[] = [];
  for (let i = 0; i < ps.length;) {
    const n = começaNumero(ps[i]) || ehMeio(ps[i]) ? lerNumero(ps, i) : null;
    if (n) { lista.push(n); i = n.fim; } else i++;
  }
  return lista;
}

const UNIDADES = new Set([
  'saco', 'sacos', 'metro', 'metros', 'm', 'm2', 'm3', 'unidade', 'unidades', 'peca', 'pecas', 'lata', 'latas',
  'kg', 'quilo', 'quilos', 'tonelada', 'toneladas', 'caminhao', 'caminhoes', 'barra', 'barras', 'milheiro',
  'rolo', 'rolos', 'caixa', 'caixas', 'galao', 'galoes', 'litro', 'litros', 'dias', 'horas', 'vezes', 'parcelas',
  'parcela', 'etapa', 'fase', 'milimetro', 'milimetros', 'mm', 'centimetro', 'centimetros', 'cm', 'polegada', 'polegadas', 'semanas', 'semana',
]);
const MOEDA = new Set(['reais', 'real', 'conto', 'contos', 'pila', 'pilas']);
// "lote 39", "casa 12": o número é da obra, não é valor.
const NUMERADORES = new Set(['lote', 'casa', 'lt', 'quadra', 'qd']);
const OBRA_NUM = new Set([...NUMERADORES, 'obra', 'numero', 'n']);
// Número que identifica documento ("nota fiscal 1234", "pedido 4521"), não dinheiro.
const DOCUMENTOS = new Set(['nota', 'nf', 'pedido', 'orcamento', 'ordem', 'cheque', 'protocolo', 'contrato', 'processo',
  'matricula', 'cpf', 'cnpj', 'telefone', 'fone', 'cep', 'fiscal']);
// Quantidade de tempo: o número solto que sobra costuma ser preço por dia/hora, não o total.
const TEMPO = new Set(['dias', 'hora', 'horas', 'diaria', 'diarias', 'semana', 'semanas', 'meses']);
const PISTAS = new Set(['por', 'total', 'valor', 'custou', 'ficou']);

// ---- datas ----

const MESES: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6, julho: 7, agosto: 8, setembro: 9,
  outubro: 10, novembro: 11, dezembro: 12,
};
const SEMANA: Record<string, number> = {
  domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6,
};

const doisDig = (n: number) => String(n).padStart(2, '0');
const paraTexto = (d: Date) => `${d.getFullYear()}-${doisDig(d.getMonth() + 1)}-${doisDig(d.getDate())}`;
const deTexto = (s: string) => { const [a, m, d] = s.split('-').map(Number); return new Date(a, m - 1, d); };
const diasAntes = (hoje: string, n: number) => { const d = deTexto(hoje); d.setDate(d.getDate() - n); return paraTexto(d); };

function montarData(dia: number, mes: number | null, ano: number | null, hoje: string): string | null {
  const h = deTexto(hoje);
  let m = mes ?? h.getMonth() + 1;
  let a = ano ?? h.getFullYear();
  if (a < 100) a += 2000;
  if (dia < 1 || dia > 31 || m < 1 || m > 12) return null;
  let d = new Date(a, m - 1, dia);
  if (d.getDate() !== dia) return null; // 31/02
  // Sem mês ou sem ano, a data falada é a última que já passou.
  if (d > h && ano === null) {
    // Mês falado que ainda vai chegar logo ("vence dia 5 de novembro") é vencimento, não custo passado: fica em branco.
    if (mes !== null && (d.getTime() - h.getTime()) / 86_400_000 <= 62) return null;
    if (mes === null) { m -= 1; if (m === 0) { m = 12; a -= 1; } } else a -= 1;
    d = new Date(a, m - 1, dia);
    if (d.getDate() !== dia) return null;
  }
  return paraTexto(d);
}

// Dia do mês (1 a 31) em número ou por extenso, a partir de i. O número inteiro tem que caber
// num dia: "dia dois mil e quinhentos reais" não é dia 2.
function diaDe(ps: string[], i: number): { dia: number; fim: number } | null {
  if (ps[i] === 'primeiro') return { dia: 1, fim: i + 1 };
  const n = começaNumero(ps[i]) ? lerNumero(ps, i) : null;
  return n && n.valor !== null && Number.isInteger(n.valor) && n.valor >= 1 && n.valor <= 31 ? { dia: n.valor, fim: n.fim } : null;
}

// "há 3 dias", "faz dez dias", "3 dias atrás", "duas semanas atrás".
function haQuantosDias(ps: string[], i: number): { dias: number; fim: number } | null {
  const comHa = ps[i] === 'ha' || ps[i] === 'faz';
  if (!comHa && !começaNumero(ps[i])) return null;
  const n = lerNumero(ps, comHa ? i + 1 : i);
  if (!n || n.valor === null || !Number.isInteger(n.valor) || n.valor < 1 || n.valor > 365) return null;
  const unidade = ps[n.fim];
  const mult = unidade === 'dias' || unidade === 'dia' ? 1 : unidade === 'semanas' || unidade === 'semana' ? 7 : 0;
  if (!mult) return null;
  const atras = ps[n.fim + 1] === 'atras';
  if (!comHa && !atras) return null;
  return { dias: n.valor * mult, fim: n.fim + (atras ? 2 : 1) };
}

function acharData(ps: string[], usadas: Set<number>, hoje: string, info: { semMes: boolean }): string | null {
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    if (p === 'hoje') { usadas.add(i); return hoje; }
    if (p === 'ontem') { usadas.add(i); return diasAntes(hoje, 1); }
    if (p === 'anteontem') { usadas.add(i); return diasAntes(hoje, 2); }
    const atras = haQuantosDias(ps, i);
    if (atras) {
      for (let k = i; k < atras.fim; k++) usadas.add(k);
      return diasAntes(hoje, atras.dias);
    }
    const barra = p.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (barra) {
      usadas.add(i);
      return montarData(Number(barra[1]), Number(barra[2]), barra[3] ? Number(barra[3]) : null, hoje);
    }
    // "17 de setembro", "dia 17 de setembro", "dia vinte e cinco", "dia 17"
    const ini = p === 'dia' ? i + 1 : i;
    const d = diaDe(ps, ini);
    if (d) {
      const mes = ps[d.fim] === 'de' ? MESES[ps[d.fim + 1]] : undefined;
      if (mes !== undefined) {
        let fim = d.fim + 2;
        const ano = ps[fim] === 'de' && /^20\d\d$/.test(ps[fim + 1] ?? '') ? Number(ps[fim + 1]) : null;
        if (ano) fim += 2;
        for (let k = i; k < fim; k++) usadas.add(k);
        return montarData(d.dia, mes, ano, hoje);
      }
      if (p === 'dia') {
        for (let k = i; k < d.fim; k++) usadas.add(k);
        info.semMes = true;
        return montarData(d.dia, null, null, hoje);
      }
    }
    // Data no futuro ("amanhã", "segunda que vem", "próxima sexta") não vira data de custo: fica em branco.
    if (p === 'amanha' || (p === 'que' && ps[i + 1] === 'vem') || p === 'proxima' || p === 'proximo') { usadas.add(i); return null; }
    const semana = SEMANA[p.replace(/-?feira$/, '')];
    // "segunda parcela", "quarta etapa" não são dias da semana
    if (semana !== undefined && !/^(parcela|parcelas|via|etapa|medicao|fase|vez|parte|rodada|opcao)$/.test(ps[i + 1] ?? '')) {
      usadas.add(i);
      if (ps[i + 1] === 'feira') usadas.add(i + 1);
      for (const k of [i + 1, i + 2]) if (ps[k] === 'passada' || ps[k] === 'passado') usadas.add(k);
      if (ps[i + 1] === 'que' || ps[i + 2] === 'que' || ps[i - 1] === 'proxima' || ps[i - 1] === 'proximo') return null;
      info.semMes = true;
      const h = deTexto(hoje);
      const volta = (h.getDay() - semana + 7) % 7 || 7;
      return diasAntes(hoje, volta);
    }
  }
  return null;
}

// ---- obra ----

const GENERICAS = new Set(['obra', 'obras', 'projeto', 'terreno', 'servidao', 'rua', 'casa', 'residencial',
  'lote', 'jd', 'jardim', 'geminada', 'geminadas', 'de', 'da', 'do', 'das', 'dos', 'e']);

function acharObra(ps: string[], obras: Obra[], usadas: Set<number>): string | null {
  const simples = ps.map(simplificar);
  // "lote trinta e nove" vale como "lote 39"
  const ate = new Map<number, number>();
  ps.forEach((p, i) => {
    if (!OBRA_NUM.has(ps[i - 1] ?? '') || palavraNum(p) === undefined) return;
    const n = lerNumero(ps, i);
    if (n && n.valor !== null && Number.isInteger(n.valor)) { simples[i] = String(n.valor); ate.set(i, n.fim); }
  });
  let melhor: { id: string; pontos: number; posicoes: number[] } | null = null;
  let empate = false;
  for (const o of obras) {
    let pontos = 0;
    const posicoes: number[] = [];
    for (const w of palavras(o.nome)) {
      if (GENERICAS.has(w) || (w.length < 3 && !/^\d+$/.test(w))) continue;
      const alvo = simplificar(w);
      for (let i = 0; i < simples.length; i++) {
        const junto = simples[i] + (simples[i + 1] ?? ''); // "eco vilas" = "ecovilas"
        // número da obra só vale como "lote 39"; "39 de prego" é dinheiro
        if (/^\d+$/.test(alvo) && !OBRA_NUM.has(ps[i - 1] ?? '')) continue;
        if (simples[i] === alvo) { pontos += /^\d+$/.test(alvo) ? 2 : 1; posicoes.push(i); break; }
        if (alvo.length >= 6 && junto === alvo) { pontos += 1; posicoes.push(i, i + 1); break; }
      }
    }
    if (pontos === 0) continue;
    if (!melhor || pontos > melhor.pontos) { melhor = { id: o.id, pontos, posicoes }; empate = false; }
    else if (pontos === melhor.pontos) empate = true;
  }
  if (!melhor || empate) return null;
  for (const i of melhor.posicoes) {
    usadas.add(i);
    for (let k = i + 1; k < (ate.get(i) ?? 0); k++) usadas.add(k);
    if (GENERICAS.has(ps[i - 1] ?? '') && !['de', 'da', 'do', 'das', 'dos', 'e'].includes(ps[i - 1])) usadas.add(i - 1);
  }
  return melhor.id;
}

// ---- pagamento ----

const PAGAMENTOS: [RegExp, FormaPagamento][] = [
  // O reconhecimento de voz erra: "pix" vira "pique"/"piks", "boleto" vira "bolheto".
  [/^(pix|pique|piques|piks|pics|pixe)$/, 'pix'],
  [/^(boletos?|bolhetos?|bolletos?|boleta)$/, 'boleto'],
  [/^(cartao|credito|debito)$/, 'cartao'],
  [/^(transferencia|ted|doc|deposito|depositei)$/, 'transferencia'],
  [/^(dinheiro|especie|cash)$/, 'dinheiro'],
  [/^(cheque|cheques)$/, 'outro'],
];

// ---- categoria e descrição ----

// Palavras que já indicam a categoria (o histórico da MB2 completa o resto).
const grupo = (categoria: Categoria, lista: string): [string, Categoria][] =>
  lista.split(' ').map((p) => [p, categoria]);
const PALAVRAS_CATEGORIA: [string, Categoria][] = [
  ...grupo('Materiais (M)', 'cimento areia brita pedra ferro aco vergalhao madeira escora tabua tijolo bloco tinta ' +
    'argamasa reboco piso porcelanato ceramica azulejo telha tubo cano conexao conexoes fio cabo disjuntor material ' +
    'materiais prego parafuso vidro janela porta esquadria concreto cal manta impermeabilizante gesso drywal louca ' +
    'loucas metais torneira uniforme uniformes epi seguranca pedrisco lona siporex rejunte massa cola verniz selador lixa ' +
    'luva pincel trincha broca calha rufo forro rodape soleira granito marmore cuba pia vaso registro'),
  ...grupo('Mão de obra', 'pedreiro pedreiros servente ajudante ajudantes diaria diarias empreiteiro empreitada mestre pintor gesseiro carpinteiro ' +
    'azulejista marceneiro serralheiro soldador encarregado'),
  ...grupo('Serviços (S)', 'eletrica eletricista hidraulica encanador maquina retroescavadeira escavadeira ' +
    'terraplenagem percolacao limpeza armador frete servico servicos instalacao sondagem topografia bomba ' +
    'transporte transportadora demolicao'),
  ...grupo('Impostos e taxas', 'is itbi imposto impostos taxa taxas ins prefeitura alvara iptu habitese mei multa tarifa juros'),
  ...grupo('Projetos e documentação', 'projeto projetos rt art cartorio escritura certidao certidoes registro ' +
    'emolumentos impresao plotagem arquiteto engenheiro despachante avaliacao usucapiao'),
  ...grupo('Locação e consumo', 'aluguel locacao container betoneira andaime andaimes cacamba energia luz agua ' +
    'celesc casan copel internet combustivel gasolina diesel'),
  ['consorcio', 'Consórcio'],
];
const MAPA_CATEGORIA = new Map(PALAVRAS_CATEGORIA);

const VAZIAS = new Set([
  'paguei', 'pagou', 'pago', 'paga', 'pagamos', 'pagar', 'pagamento', 'gastei', 'gasto', 'gastamos', 'comprei',
  'compra', 'compramos', 'lancar', 'lanca', 'lancamento', 'custo', 'foi', 'de', 'do', 'da', 'dos', 'das', 'no',
  'na', 'nos', 'nas', 'em', 'com', 'o', 'a', 'os', 'as', 'ao', 'aos', 'um', 'uma', 'pro', 'pra', 'para', 'por',
  'r$', 'valor', 'total', 'e', 'que', 'via', 'pelo', 'pela', 'feito', 'feita', 'hoje', 'ontem', 'obra', 'reais',
  'real', 'ainda', 'falta', 'vou', 'vai', 'fica', 'ficou', 'aberto', 'fiado', 'prazo', 'passada', 'passado', 'feira', 'mais', 'vem', 'noite', 'manha', 'tarde', 'cedo', 'amanha', 'proxima', 'proximo',
  // ruído de fala e verbos que não dizem o que foi comprado
  'entao', 'ta', 'hum', 'hm', 'ah', 'eh', 'ne', 'olha', 'certo', 'pronto', 'bom', 'tipo', 'assim', 'ok', 'deu', 'dei',
  'mandei', 'transferi', 'depositei', 'acertei', 'cada', 'meio', 'meia', 'parcelado', 'parcelada', 'parcelas', 'vezes',
  'centavos', 'conto', 'contos',
]);
const significativas = (texto: string) =>
  palavras(texto).map(simplificar).filter((w) => w.length >= 3 && !/^\d+$/.test(w) && !VAZIAS.has(w));

const MAO_DE_OBRA = /^m[aã]o de obra\s*[–-]\s*/i;

interface Historico {
  pessoas: { chave: string; fornecedor: string; descricao: string }[];
  votos: Map<string, Map<Categoria, number>>;
  descricoes: { palavras: string[]; descricao: string; categoria: Categoria }[];
  fornecedores: { chave: string; nome: string; categoria: Categoria }[];
}

function aprender(custos: Custo[]): Historico {
  const pessoas = new Map<string, { chave: string; fornecedor: string; descricao: string }>();
  const votos = new Map<string, Map<Categoria, number>>();
  const descricoes = new Map<string, { palavras: string[]; descricao: string; categoria: Categoria }>();
  const fornecedores = new Map<string, { chave: string; nome: string; categoria: Categoria }>();
  for (const c of custos) {
    if (c.categoria === 'Mão de obra' && MAO_DE_OBRA.test(c.descricao)) {
      const nome = c.descricao.replace(MAO_DE_OBRA, '').trim();
      const chave = simplificar(palavras(nome)[0] ?? '');
      if (chave.length >= 4 && !pessoas.has(chave)) {
        pessoas.set(chave, { chave, fornecedor: c.fornecedor || nome, descricao: c.descricao });
      }
      continue;
    }
    for (const w of new Set(significativas(c.descricao))) {
      const m = votos.get(w) ?? new Map<Categoria, number>();
      m.set(c.categoria, (m.get(c.categoria) ?? 0) + 1);
      votos.set(w, m);
    }
    const ps = significativas(c.descricao);
    const chaveDesc = ps.join(' ');
    if (ps.length && !descricoes.has(chaveDesc)) descricoes.set(chaveDesc, { palavras: ps, descricao: c.descricao, categoria: c.categoria });
    const f = simplificar(palavras(c.fornecedor)[0] ?? '');
    if (f.length >= 4 && !fornecedores.has(f)) fornecedores.set(f, { chave: f, nome: c.fornecedor, categoria: c.categoria });
  }
  return { pessoas: [...pessoas.values()], votos, descricoes: [...descricoes.values()], fornecedores: [...fornecedores.values()] };
}

// "adrian" acha "ADRIANO"; "ulisses" acha "ULISSES".
const parecido = (falado: string, nome: string) =>
  falado === nome || (falado.length >= 5 && (nome.startsWith(falado) || falado.startsWith(nome)));

// ---- tudo junto ----

export function interpretarFala(texto: string, contexto: { obras: Obra[]; custos: Custo[]; hoje: string }): Interpretacao {
  const ps = palavras(texto);
  const usadas = new Set<number>();
  const simples = ps.map(simplificar);

  const obraId = acharObra(ps, contexto.obras, usadas);
  const dataInfo = { semMes: false };
  const dataFalada = acharData(ps, usadas, contexto.hoje, dataInfo);

  let pagamento: FormaPagamento | null = null;
  ps.forEach((p, i) => {
    for (const [re, forma] of PAGAMENTOS) if (re.test(p)) { pagamento ??= forma; usadas.add(i); }
  });

  // A pagar: "a pagar", "falta pagar", "vou pagar", "em aberto", "fiado", "a prazo", "pagar dia 30".
  // Parcelado ("em 3 vezes", "3x", "10 parcelas") também fica a pagar, mas se a pessoa disse
  // "paguei" junto fica em dúvida (null): pode ser o cartão já pago ou só a primeira parcela.
  const junto = ' ' + ps.join(' ') + ' ';
  const parcelado = / (parcelad[oa]s?|parcelei|financiad[oa]|\d+ ?x|\d+ (vezes|parcelas)|[a-z]+ (vezes|parcelas)) /.test(junto);
  const disseuPago = / (paguei|pagou|pagamos|pago|paga|mandei|transferi|depositei|quitei|quitamos|quitado|quitada) /.test(junto);
  let pago: boolean | null = null;
  if (/ (a pagar|falta pagar|vou pagar|vamos pagar|vai pagar|para pagar|pra pagar|em aberto|fiado|a prazo|ainda nao paguei|nao paguei|nao foi pago|nao foi paga|nao pagou|ainda nao pagou|nao pago|pagar|pendente|devo|devendo|vence|vencimento|preciso pagar|tenho que pagar|tenho de pagar|pagar depois) /.test(junto)) pago = false;
  else if (parcelado) pago = disseuPago ? null : false;
  else if (disseuPago) pago = true;

  // "A pagar sexta" / "a pagar dia 30" é vencimento no futuro; o interpretador só sabe voltar no tempo, então deixa em branco.
  const data = pago === false && dataInfo.semMes ? null : dataFalada;

  // Valor: o único número do lançamento, ou o único com "reais"/"R$"/"centavos" perto. Quantidade,
  // data, número da obra e preço por unidade não contam. Na dúvida fica null (a pessoa digita).
  const candidatos = numerosDe(ps)
    .filter((g) => ![...Array(g.fim - g.inicio).keys()].some((k) => usadas.has(g.inicio + k)))
    .filter((g) => !UNIDADES.has(ps[g.fim] ?? '') && !NUMERADORES.has(ps[g.inicio - 1] ?? '') &&
      !DOCUMENTOS.has(ps[g.inicio - 1] ?? ''))
    .map((g) => {
      let centavos = g.valor === null ? null : Math.round(g.valor * 100);
      let fim = g.fim;
      let moeda = ps[g.inicio - 1] === 'r$';
      const depois = ps[g.fim];
      if (depois === 'centavo' || depois === 'centavos') { // "noventa centavos"
        centavos = g.valor !== null && Number.isInteger(g.valor) && g.valor < 100 ? g.valor : null;
        fim++; moeda = true;
      } else if (depois === 'r$') { // "450 R$"
        moeda = true; fim++;
      } else if (depois && MOEDA.has(depois)) {
        moeda = true; fim++;
        // preço por unidade ("200 reais por dia", "40 reais o saco", "10 reais cada"), não o total
        const unid = ps[fim + 1] ?? '';
        if (ps[fim] === 'cada' || (/^(por|ao|a|o)$/.test(ps[fim] ?? '') && (UNIDADES.has(unid) || TEMPO.has(unid) || unid === 'dia'))) centavos = null;
        else if (ps[fim] === 'e' && começaNumero(ps[fim + 1])) {
          // "360 reais e 50 centavos" (só vale com a palavra "centavos"; "reais e 50" é dúvida)
          const resto = lerNumero(ps, fim + 1);
          const centavo = resto && (ps[resto.fim] === 'centavos' || ps[resto.fim] === 'centavo');
          if (resto && centavo && centavos !== null && resto.valor !== null && Number.isInteger(resto.valor) && resto.valor < 100 && (depois === 'reais' || depois === 'real')) {
            centavos += resto.valor; fim = resto.fim + 1;
          } else { centavos = null; if (resto) fim = resto.fim; }
        }
      }
      // "uns 500", "mais ou menos 500": estimativa, não é o valor do lançamento
      if (/ (uns|umas|cerca|cerca de|aproximadamente|quase|mais ou menos|perto de|em torno de)$/.test(' ' + ps.slice(Math.max(0, g.inicio - 3), g.inicio).join(' '))) centavos = null;
      // "3 vezes de 400", "10 parcelas de 300": não dá para saber se o lançamento é a parcela ou o total
      if (ps[g.inicio - 1] === 'de' && (/^(parcelas|vezes|x)$/.test(ps[g.inicio - 2] ?? '') || /^\d+x$/.test(ps[g.inicio - 2] ?? ''))) centavos = null;
      // "dia onze mil reais": pode ser dia 11 e mil reais, ou onze mil reais
      const dia = ps[g.inicio - 1] === 'dia' ? lerGrupo(ps, g.inicio) : null;
      if (dia && dia.valor <= 31 && g.valor !== null && g.valor > 31) centavos = null;
      return { inicio: g.inicio, fim, centavos, moeda };
    })
    // o "50" de "300 reais e 50 centavos" já foi lido junto com o 300
    .filter((g, k, todos) => !todos.slice(0, k).some((o) => g.inicio < o.fim))
    // "um" sozinho é artigo ("um frete de 300"), a não ser que venha com "real"/"conto".
    .filter((g) => !(g.fim - g.inicio === 1 && (ps[g.inicio] === 'um' || ps[g.inicio] === 'uma')) && (g.centavos === null || g.centavos > 0));
  // O mesmo valor repetido ("200 de areia (duzentos reais)") conta uma vez.
  const unicos = candidatos.filter((g, k) => g.centavos === null || !candidatos.slice(0, k).some((o) => o.centavos === g.centavos));
  for (const g of unicos) if (candidatos.some((o) => o.centavos === g.centavos && o.moeda)) g.moeda = true;
  const comMoeda = unicos.filter((g) => g.moeda);
  // "200 telhas por 780": o número depois de "por"/"total" é o valor, o outro é quantidade.
  const comPista = unicos.filter((g) => g.moeda || PISTAS.has(ps[g.inicio - 1] ?? ''));
  let escolhido = unicos.length === 1 ? unicos[0] : comMoeda.length === 1 ? comMoeda[0] : comPista.length === 1 ? comPista[0] : null;
  // "200 reais de areia e 100 de brita", "entrada de 1.200 e 3 parcelas de 500": dois valores, na dúvida não escolhe.
  const outroValor = (g: { inicio: number; fim: number; moeda: boolean }) =>
    !g.moeda && (/^(de|pro|pra|para|na|no)$/.test(ps[g.fim] ?? '') || (/^(parcelas?|vezes|x)$/.test(ps[g.inicio - 2] ?? '') && ps[g.inicio - 1] === 'de'));
  if (escolhido && unicos.some((g) => g !== escolhido && outroValor(g))) escolhido = { ...escolhido, centavos: null };
  // "3 dias de servente 150": sem "reais" nem "por", o 150 pode ser a diária, não o total.
  const tempoSolto = numerosDe(ps).some((n) => TEMPO.has(ps[n.fim] ?? '') && !usadas.has(n.inicio));
  if (escolhido && tempoSolto && !escolhido.moeda && !PISTAS.has(ps[escolhido.inicio - 1] ?? '')) escolhido = { ...escolhido, centavos: null };
  // Porcentagem ("50% de 2.000", "dez por cento de entrada"): o valor depende de conta que a pessoa não disse.
  if (escolhido && (/\d%/.test(junto) || / por cento /.test(junto))) escolhido = { ...escolhido, centavos: null };
  if (escolhido) {
    for (let k = escolhido.inicio; k < escolhido.fim; k++) usadas.add(k);
    if (ps[escolhido.inicio - 1] === 'r$') usadas.add(escolhido.inicio - 1);
  }
  const valor = escolhido?.centavos ?? null;

  // Categoria, descrição e fornecedor, do mais certo para o menos certo.
  const hist = aprender(contexto.custos);
  let categoria: Categoria | null = null;
  let descricao = '';
  let fornecedor = '';

  const pessoa = hist.pessoas.find((p) => simples.some((w) => parecido(w, p.chave)));
  if (pessoa) {
    categoria = 'Mão de obra';
    descricao = pessoa.descricao;
    fornecedor = pessoa.fornecedor;
  } else {
    const falado = new Set(simples.filter((w, i) => !usadas.has(i) && w.length >= 2));
    const conhecido = hist.descricoes
      .filter((d) => d.palavras.every((w) => falado.has(w)))
      .sort((a, b) => b.palavras.length - a.palavras.length)[0];
    const loja = hist.fornecedores.find((f) => [...falado].some((w) => parecido(w, f.chave)));
    if (loja) fornecedor = loja.nome;

    const pontos = new Map<Categoria, number>();
    const somar = (c: Categoria, n: number) => pontos.set(c, (pontos.get(c) ?? 0) + n);
    for (const w of falado) {
      const direta = MAPA_CATEGORIA.get(w) ?? (w.endsWith('s') ? MAPA_CATEGORIA.get(w.slice(0, -1)) : undefined);
      if (direta) somar(direta, 3);
      const v = hist.votos.get(w);
      if (v) {
        const total = [...v.values()].reduce((a, b) => a + b, 0);
        for (const [c, n] of v) somar(c, (2 * n) / total);
      }
    }
    if (conhecido) somar(conhecido.categoria, 2);
    if (loja) somar(loja.categoria, 1);
    if (/ mao de obra /.test(junto)) somar('Mão de obra', 5);
    const ordem = [...pontos.entries()].sort((a, b) => b[1] - a[1]);
    if (ordem.length && (ordem.length === 1 || ordem[0][1] > ordem[1][1])) categoria = ordem[0][0];

    if (conhecido) descricao = conhecido.descricao;
    else {
      const nomeLoja = loja ? simplificar(palavras(loja.nome)[0]) : null;
      const fica = ps.map((p, i) => !usadas.has(i) && !VAZIAS.has(simplificar(p)) && simplificar(p) !== nomeLoja &&
        !PAGAMENTOS.some(([re]) => re.test(p)));
      // "30 sacos de cimento": o "de" entre duas palavras que ficam também fica.
      const proxima = (i: number) => { let k = i + 1; while (k < ps.length && !fica[k] && !usadas.has(k)) k++; return k; };
      const anterior = (i: number) => { let k = i - 1; while (k >= 0 && !fica[k] && !usadas.has(k)) k--; return k; };
      const meio = ps.map((_, i) => fica[i] || (!usadas.has(i) && fica[anterior(i)] === true && fica[proxima(i)] === true));
      const originais = palavrasOriginais(texto);
      const original = originais.filter((_, i) => meio[i]).join(' ');
      descricao = original ? original[0].toUpperCase() + original.slice(1) : '';
    }
  }

  const faltou: Interpretacao['faltou'] = [];
  if (valor === null) faltou.push('valor');
  if (!obraId && contexto.obras.length > 1) faltou.push('obra');
  return {
    valor, data, obraId, categoria: categoria && CATEGORIAS.includes(categoria) ? categoria : null,
    descricao, fornecedor, pagamento, pago, faltou,
  };
}

// Lançamentos parecidos já feitos (mesma obra e valor, até 7 dias de diferença). Só avisa:
// pagamentos repetidos de verdade existem e devem ser mantidos.
export function possiveisRepetidos(custos: Custo[], novo: { obraId: string; valor: number; data: string }, ignorar?: string): Custo[] {
  const dia = 86_400_000;
  const alvo = deTexto(novo.data).getTime();
  return custos.filter((c) => c.id !== ignorar && c.obraId === novo.obraId && c.valor === novo.valor &&
    Math.abs(deTexto(c.data).getTime() - alvo) <= 7 * dia);
}
