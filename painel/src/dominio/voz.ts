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
  duvidaValor?: boolean; // havia número na fala mas não deu para ter certeza de qual é o valor
  faltou: ('valor' | 'obra')[];
}

// ---- texto ----

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
// "Ecovillas" e "eco vilas" ficam iguais: sem acento, minúsculo, sem letra repetida.
const simplificar = (s: string) => semAcento(s.toLowerCase()).replace(/[^a-z0-9]/g, '').replace(/(.)\1+/g, '$1');

// Palavras na forma original (acento e maiúsculas); palavras() devolve as mesmas, na mesma ordem.
function palavrasOriginais(texto: string): string[] {
  return texto
    .replace(/\bbom dia\b/gi, ' ') // saudação, não é "dia 12"
    .replace(/(\d{1,2}):(\d{2})/g, '$1h$2') // "14:30" é hora, não dois números
    .replace(/(\d)(mil|reais|real)\b/gi, '$1 $2') // "1mil e 200", "360reais"
    .replace(/\b(lote|casa|lt|qd|obra)[-\s]?(\d)/gi, '$1 $2') // "lote39", "lote-39"
    .replace(/\b(lote|casa|obra|lt)(\s+\d{1,3}),\s+(?=mil(\s|$))/gi, '$1$2 | ') // "casa 12, mil e duzentos": a vírgula separa a obra do valor
    .replace(/\brs\s*(?=\d)/gi, 'R$ ') // "rs 500"
    .replace(/(\d)\s*rs\b/gi, '$1 reais') // "500rs"
    .replace(/\s*r\$\s*/gi, ' R$ ')
    .replace(/[.;!?…]+(?=\s|$)/g, ' | ') // fim de frase: "doze mil. cem" são duas coisas
    .replace(/(\d)[ºª°]/g, '$1º') // "dia 1º", "13º salário": ordinal não é número solto
    .replace(/[–—]/g, ' ')
    .replace(/([a-zA-ZÀ-ÿ])\/([a-zA-ZÀ-ÿ])/g, '$1 $2') // "pix/boleto"; datas como 17/09 ficam
    .replace(/(\d)\/([a-zA-ZÀ-ÿ])/g, '$1 por $2') // "38/saco" = 38 por saco
    .replace(/(^|\s)-(\d)/g, '$1menos $2') // "-300": desconto ou estorno
    .replace(/=/g, ' igual ')
    .split(/[\s!?;:()"\[\]{}<>#*]+/)
    .map((p) => p.replace(/^[.,…'“”‘’«»*_–—-]+|[.,…'“”‘’«»*_–—-]+$/g, ''))
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
  duzentas: 200, trezentas: 300, quatrocentas: 400, quinhentas: 500, seiscentas: 600, setecentas: 700, oitocentas: 800,
  novecentas: 900, dezasseis: 16, dezassete: 17, dezanove: 19, // feminino e português de Portugal
};

// "5.800", "5800", "360,50", "2,5", "1.234,56", "1,200" -> número; "17/09" e afins não são número.
// "1,200" e "1.200" são mil e duzentos (centavos nunca têm 3 casas).
function numeroEscrito(p: string): number | null {
  if (!/^\d[\d.,]*$/.test(p) || /^\d{8,}$/.test(p)) return null; // 8+ dígitos corridos: telefone, CEP
  let s = p;
  if (/^[1-9]\d{0,2}(,\d{3})+(\.\d{1,2})?$/.test(s)) s = s.replace(/,/g, ''); // 1,200 ou 1,200.50
  else if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  if (/\.\d{3,}$/.test(s)) return null; // centavos têm no máximo 2 casas: "0,125" não é dinheiro
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Palavras que, logo depois de "2 mil 500", mostram que o 500 era outra coisa (quantidade).
const UNIDADES_NUMERO = new Set(['sacos', 'metros', 'dias', 'horas', 'unidades', 'pecas', 'caixas', 'latas', 'kg']);
const palavraNum = (p: string | undefined) => (p !== undefined && Object.hasOwn(NUMEROS, p) ? NUMEROS[p] : undefined);
const ehMilhar = (p: string | undefined) => p === 'mil';
const ehMilhao = (p: string | undefined) => p === 'milhao' || p === 'milhoes';
const ehMeio = (p: string | undefined) => p === 'meio' || p === 'meia';
// "2,5k" = 2.500
const numeroK = (p: string) => { const m = p.match(/^(\d[\d.,]*)k$/); const n = m ? numeroEscrito(m[1]) : null; return n !== null && n <= 99 ? n : null; }; // 500k não é custo de obra
const começaNumero = (p: string | undefined) =>
  p !== undefined && (numeroEscrito(p) !== null || numeroK(p) !== null || palavraNum(p) !== undefined || ehMilhar(p));

// Um grupo de 1 a 999 por extenso ("cento e vinte e cinco"), a partir de i. Com `digitos`, aceita também o
// número em dígitos que o ditado mistura ("quinhentos e 20", "dois mil e 500").
function lerGrupo(ps: string[], i: number, digitos = false): { valor: number; fim: number } | null {
  const soDigitos = (p: string | undefined, max: number) => (p !== undefined && new RegExp(`^\\d{1,${max}}$`).test(p) ? Number(p) : undefined);
  const primeiro = digitos ? soDigitos(ps[i], 3) : undefined;
  if (primeiro) return { valor: primeiro, fim: i + 1 };
  // Dígito depois de "e" também vale, menos quando é quantidade ("300 e 20 sacos").
  const depoisDeE = (k: number) => {
    const d = digitos ? soDigitos(ps[k], 2) : undefined;
    return d !== undefined && !UNIDADES.has(ps[k + 1] ?? '') ? d : palavraNum(ps[k]);
  };
  let j = i;
  let v = 0;
  const n0 = palavraNum(ps[j]);
  if (!n0) return null;
  if (n0 >= 100) {
    v = n0; j++;
    const semE = ps[j] !== 'e' && (palavraNum(ps[j]) ?? 100) < 100 && (palavraNum(ps[j]) ?? 0) > 0; // "trezentos sessenta" (ditado sem o "e")
    const e = ps[j] === 'e' ? depoisDeE(j + 1) : semE ? palavraNum(ps[j]) : undefined;
    if (!e || e >= 100) return { valor: v, fim: j };
    if (!semE) j++; // o "e" de "cento e vinte"
  }
  const n = n0 >= 100 ? depoisDeE(j) : palavraNum(ps[j]);
  if (!n || n >= 100) return v ? { valor: v, fim: j } : null;
  v += n; j++;
  if (n >= 20 && ps[j] === 'e') {
    const u = depoisDeE(j + 1);
    if (u && u <= 9) { v += u; j += 2; }
  } else if (n >= 20 && n % 10 === 0 && n < 100 && (palavraNum(ps[j]) ?? 0) >= 1 && (palavraNum(ps[j]) ?? 0) <= 9) {
    v += palavraNum(ps[j]) as number; j++; // "trinta nove" sem o "e" (ditado)
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
  // "1.2" pode ser R$ 1,20 ou 1.200: só vale com "mil"/"milhão" depois
  if (escrito !== null && /^\d+\.\d$/.test(ps[j]) && !/^0\./.test(ps[j]) && !ehMilhar(ps[j + 1]) && !ehMilhao(ps[j + 1])) return null;
  const emK = numeroK(ps[j]);
  const simples = /^\d{1,3}$/.test(ps[j] ?? '') && (ehMilhar(ps[j + 1]) || ehMilhao(ps[j + 1])); // "2 mil e quinhentos"
  if ((escrito !== null || emK !== null) && !simples) {
    total = escrito ?? (emK as number) * 1000; j++;
    const mult = emK !== null ? 1000 : ehMilhar(ps[j]) ? 1000 : ehMilhao(ps[j]) ? 1_000_000 : 0;
    if (emK !== null) escala = 1000;
    else if (mult) { total *= mult; escala = mult; j++; }
    // "5 mil e 500"
    const comE = ps[j] === 'e';
    const resto = mult === 1000 && emK === null ? numeroEscrito(ps[comE ? j + 1 : j] ?? '') : null;
    const fimResto = comE ? j + 2 : j + 1;
    if (resto !== null && Number.isInteger(resto) && resto >= 1 && resto < 1000 && /^\d+$/.test(ps[comE ? j + 1 : j]) &&
      !(UNIDADES_NUMERO.has(ps[fimResto] ?? ''))) { total += resto; j = fimResto; escala = 0; } // "5 mil e 500", "2 mil 500"
  } else {
    let algo = false;
    for (const [teste, mult] of [[ehMilhao, 1_000_000], [ehMilhar, 1000]] as const) {
      const s = algo && ps[j] === 'e' ? j + 1 : j;
      const g = lerGrupo(ps, s, true);
      const k = g ? g.fim : s;
      if (!teste(ps[k]) || (!g && mult === 1_000_000)) continue;
      total += (g?.valor ?? 1) * mult; j = k + 1; escala = mult; algo = true;
    }
    if (algo) {
      const g = lerGrupo(ps, ps[j] === 'e' ? j + 1 : j, true);
      const ini = ps[j] === 'e' ? j + 1 : j;
      if (g && !(/^\d+$/.test(ps[ini] ?? '') && UNIDADES.has(ps[g.fim] ?? ''))) {
        if (escala === 1_000_000) ambiguo = true; // "um milhão e quinhentos": 1,5 milhão ou 1.000.500?
        total += g.valor; j = g.fim; escala = 0;
      }
    } else {
      const g = lerGrupo(ps, j, true);
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

// "200 telhas", "30 blocos": número seguido do plural de um material é quantidade (sem "R$" antes).
function contagemDeMaterial(ps: string[], g: { inicio: number; fim: number }): boolean {
  const w = ps[g.fim];
  if (!w || ps[g.inicio - 1] === 'r$' || !w.endsWith('s')) return false;
  return daCategoria(w.slice(0, -1)) === 'Materiais (M)';
}

// "40 reais o saco", "300 a janela": depois de "o/a/por" vem a unidade ou o material, então é preço de cada.
function precoPorUnidade(w: string | undefined, nomeProprio = false): boolean {
  if (!w) return false;
  if (UNIDADES.has(w) || TEMPO.has(w) || PRECO_POR.has(w)) return true;
  // "R$ 650 à Tintas Colorado": com maiúscula é fornecedor, não material
  // só o singular: "a janela", "o saco"; "Tintas Colorado" (plural) é nome de loja
  return !nomeProprio && daCategoria(w) === 'Materiais (M)';
}

// "5 tomadas", "6 marmitas", "3 orçamentos": número pequeno seguido de substantivo no plural é quantidade.
const NAO_E_PLURAL = /^(pelos|pelas|nos|nas|dos|das|aos|uns|umas|mais|menos|depois|antes|reais|todos|todas|sempre|apenas|ainda|talvez|pratas|mangos|contos|centavos|paus|pilas|mensais|anos|meses)$/;
function contagemPlural(ps: string[], g: Numero): boolean {
  const w = ps[g.fim];
  return g.valor !== null && Number.isInteger(g.valor) && g.valor >= 2 && g.valor <= 99 && w !== undefined && /^[a-z]{4,}s$/.test(w) && !NAO_E_PLURAL.test(w);
}

function numerosDe(ps: string[]): Numero[] {
  const lista: Numero[] = [];
  for (let i = 0; i < ps.length;) {
    const n = começaNumero(ps[i]) || ehMeio(ps[i]) ? lerNumero(ps, i) : null;
    if (n) { lista.push(n); i = n.fim; } else i++;
  }
  return lista;
}

// Unidades de contagem (peças que se compram aos montes): "20 sacos", "3 baldes".
// Equipe no plural: "dois pedreiros 450" não diz se são 450 de cada um ou no total.
const EQUIPE = /^(pedreiros|serventes|ajudantes|encarregados|mestres|operarios|homens|eletricistas|encanadores|pintores|carpinteiros|marceneiros|gesseiros|azulejistas|soldadores|serralheiros|armadores|vigias|diaristas|jardineiros|motoristas)$/;
const CONTAGEM = /^(sacos?|sacas?|latas?|caixas?|baldes?|rolos?|barras?|galao|galoes|fardos?|cargas?|tambores?)$/; // embalagens que custam mais de R$ 5 cada; "10 folhas 25" (lixa) pode ser total
const UNIDADES = new Set([
  'saco', 'sacos', 'metro', 'metros', 'm', 'm2', 'm3', 'unidade', 'unidades', 'peca', 'pecas', 'lata', 'latas',
  'kg', 'quilo', 'quilos', 'tonelada', 'toneladas', 'caminhao', 'caminhoes', 'barra', 'barras', 'milheiro',
  'rolo', 'rolos', 'caixa', 'caixas', 'galao', 'galoes', 'litro', 'litros', 'dias', 'horas', 'vezes', 'parcelas',
  'pessoa', 'cabeca', 'folha', 'chapa', 'vara', 'par', 'pares', 'comodo', 'comodos', 'ponto', 'tomada', 'lampada', 'pacote', 'pacotes', 'saca', 'sacas', 'balde', 'baldes', 'tambor', 'tambores', 'carrada', 'carradas', 'carga',
  'cargas', 'carreta', 'carretas', 'fardo', 'fardos', 'm²', 'm³', 'parcela', 'etapa', 'fase', 'viagem', 'viagens', 'pessoas', 'homens', 'funcionarios', 'operarios', 'pedreiros', 'serventes',
  'ajudantes', 'quartos', 'andares', 'casas', 'lotes', 'pontos', 'tomadas', 'lampadas', 'milimetro', 'milimetros', 'mm', 'centimetro', 'centimetros', 'cm', 'polegada', 'polegadas', 'banheiros', 'andar', 'volt', 'volts', 'v', 'ampere', 'amperes', 'watts', 'w', 'hz', 'btu', 'btus', 'kva', 'kw', 'kwh', 'demao', 'demaos',
  'diaria', 'diarias', 'meses', 'anos', 'semestre', 'semestres', 'trimestre', 'trimestres', 'quinzena', 'quinzenas', 'vias', 'paginas', 'copias', 'assinaturas', 'km', 'sc', 'un', 'pc', 'pcs', 'cx', 'mt', 'mts', 'ton', 'tn', 'lt', 'lts', 'gl', 'pav', 'pavimento', 'pavimentos',
]);
const MOEDA = new Set(['reais', 'real', 'conto', 'contos', 'pila', 'pilas', 'pratas', 'mangos']);
// "lote 39", "casa 12": o número é da obra, não é valor.
const NUMERADORES = new Set(['lote', 'casa', 'lt', 'quadra', 'qd']);
const OBRA_NUM = new Set(['lote', 'casa', 'lt', 'obra']); // "quadra 12" e "nota n 12" não são o número da obra
// Número que identifica documento ("nota fiscal 1234", "pedido 4521"), não dinheiro.
const DOCUMENTOS = new Set(['nf-e', 'nfs', 'nfse', 'cei', 'cno', 'recibo', 'fatura', 'duplicata', 'comprovante', 'cupom', 'romaneio', 'nota', 'nf', 'pedido', 'orcamento', 'ordem', 'cheque', 'protocolo', 'contrato', 'processo',
  'matricula', 'cpf', 'cnpj', 'telefone', 'fone', 'cep', 'fiscal', 'apto', 'apartamento',
  'sala', 'andar', 'ano', 'parcela', 'agencia', 'conta', 'numero', 'nfe', 'nº', 'n°', 'n', 'codigo', 'cod', 'ref', 'referencia', 'item', 'modelo', 'serie']);
// Estes só são documento quando o número tem 4 dígitos ou mais ("RRT 130" ainda pode ser o valor).
const DOCUMENTOS_LONGOS = new Set(['solda', 'eletrodo', 'art', 'rrt', 'crea', 'apolice', 'inscricao']);
// Só para "X reais a dúzia": preço por unidade; "duas dúzias" sozinho continua valendo como número solto.
const PRECO_POR = new Set(['duzia', 'duzias', 'metro', 'dia', 'degrau', 'lance', 'trecho', 'pe', 'centimetro']);
const TEMPO = new Set(['dias', 'hora', 'horas', 'diaria', 'diarias', 'semana', 'semanas', 'meses']);
// Palavras que tiram o valor falado do lançamento: conta, receita, empréstimo, dúvida de quem fala.
// Só entram palavras que quase nunca aparecem num serviço ou material de obra; o resto fica em FRASES_SEM_VALOR,
// que exige o contexto ("subiu 200", "proposta de 12 mil", "acho que").
const CALCULO = new Set(['cada', 'metade', 'dobro', 'triplo', 'terco', 'abatimento', 'troco', 'sobrou', 'restou',
  'diferenca', 'estorno', 'estornei', 'reembolso', 'reembolsei', 'devolveram', 'devolvi', 'devolucao', 'cotei',
  'recebi', 'recebemos', 'talvez', 'provavelmente', 'possivelmente', 'chutando', 'chutei', 'chute', 'aparentemente',
  'precisar', 'precisarei', 'comprarei', 'compraremos', 'pagaram', 'depositaram', 'transferiram', 'recebimento', 'repasse',
  'venda', 'vendas', 'vendi', 'vendemos', 'lucro', 'faturamento', 'orcar', 'contratar', 'quanto', 'quantos', 'qual', 'quais']);
// "recebi" é entrada de dinheiro, a não ser que a fala diga que foi gasto ("recebi o cimento, paguei 360").
const GASTO_NA_FALA = /^(paguei|pagamos|gastei|gastamos|comprei|compramos|nota|boleto|fatura|cupom|recibo)$/;
// "meio fio", "meia cana", "meia parede", "meio tijolo": nome de peça, não metade de nada.
const PECA_COM_MEIO = /^(fio|cana|parede|tijolo|agua|bloco|esquadria)$/;
// Palavras de quem fala de saldo, verba, previsão, tabela, aporte ou conferência: o número é outra coisa, não um gasto.
const NAO_CUSTO = / (ate agora|ate hoje|ate aqui|ate o momento|acumulado|desde o comeco|desde o inicio|saldo (da|do|de|em) (conta|caixa|banco)|saldo (bancario|disponivel|atual)|verba|limite|previsto|prevista|tabela|sinapi|aporte|extrato|meta|teto|estoque|poupanca|lembrar|lembrete|conferir|revisar|verificar|checar|medindo|mede|(a )?media de|estimado|estimada|capital|patrimonio|nota de credito|entrada de dinheiro|pe direito) /;
const ESTRANGEIRA =new Set(['dolar', 'dolares', 'euro', 'euros', 'libra', 'libras']);
const SIMBOLO_ESTRANGEIRO = new Set(['us$', 'usd', 'u$s', 'eur', 'dolar', 'dolares', 'euro', 'euros']);
// Flexões dos mesmos verbos ('estornaram', 'devolveu'...)
const RAIZ_CALCULO = /^(estorn|reembols|devolv|emprest|ressarc|(sobr|rest)(a|am|aram|ando)$)/;
// Começo de um número escrito: "R$", dígitos ou palavra de número ("dois", "cem", "mil").
const COMECO_DE_NUMERO = '(r\\$|[0-9][0-9.,]*|' + Object.keys(NUMEROS).join('|') + '|mil|meio|meia)';
const ENTRE_VERBOS = '(apaga|apague|exclui|exclua|remove|remova|cancela|cancele|desfaz|desfaca|corrige|corrija|altera|altere|edita|edite|' +
  'atualiza|atualize|substitui|substitua|anula|anule|esquece|ignora|retira|tira|troca|troque|muda|mude)';
// Frases de dúvida, intenção, comando e receita (olham o texto todo, não uma palavra solta).
const FRASES_SEM_VALOR = new RegExp(' (' + [
  // comando de edição: "apaga o último", "corrige para 700", "exclui o de 300"; "troca de fechadura" é serviço e passa
  ENTRE_VERBOS + ' ((o|a|os|as) )?(ultimo|ultima|lancamento|gasto|custo|anterior|esse|essa|isso|aquele|aquela|primeiro|para|pra)',
  ENTRE_VERBOS + ' (o|a|os|as) de',
  // intenção e pergunta
  '(vou|vamos|preciso|precisamos|pretendo|pretendemos|queria|quero|tenho que|tenho de|temos que|precisa|planejo) (comprar|gastar|orcar|contratar|fechar)',
  '(preciso|precisamos|precisa) de', '(iremos|vamos|ia) gastar', '(custa|custam|custaria|custara|seria|sera) ' + COMECO_DE_NUMERO,
  // quem fala não tem certeza
  '(acho|creio|penso|imagino|suponho|aposto|recordo|estimo|calculo) (que|q)', 'deve (ter|ser)', 'nao sei', 'sei la', 'nao lembro',
  'nao me engano', 'nao tenho certeza', 'sem certeza', 'por alto', 'a olho', 'parece que', 'me parece', 'mais ou menos', 'a menos',
  // "desconto de 100", "100 de desconto"; "com desconto" sozinho é o preço já descontado
  '(desconto|abatimento) (de |em |uns )?' + COMECO_DE_NUMERO, COMECO_DE_NUMERO + ' (reais )?(de |em )?(desconto|abatimento)',
  // variação de preço, proposta e receita: só com o número logo depois
  '(subiu|caiu|baixou|aumentou|aumentaram|aumento|reajuste|reajustou|acrescimo) (de |em |uns )?' + COMECO_DE_NUMERO,
  '(proposta|cotacao|orcamento|estimativa|previsao|simulacao) de ' + COMECO_DE_NUMERO, 'receita (de|da|do)',
  // combinado ou pedido ainda não é pagamento: "combinei 3 mil com o pintor", "o pintor pediu 3 mil"
  '(combinei|combinamos|pediu|pediram|ofereceu|ofereceram|prometi|prometeu|propos) (de |em |uns )?' + COMECO_DE_NUMERO,
  'cliente (me |nos )?(pagou|pagaram|depositou|transferiu|mandou|enviou|passou)',
  // alguém pagou ou liberou dinheiro PARA nós: entrada, não custo
  '(me|nos) (pagou|pagaram|depositou|depositaram|transferiu|transferiram|mandou|mandaram|devolveu|devolveram)', '(banco|financeira|caixa) (liberou|liberaram|creditou|aprovou)', '(liberou|liberaram|creditou|creditaram|emprestou|emprestaram)',
  // desejo, conversa em andamento e comando de edição com o valor no fim
  '(quer|querem|quero|queremos|querendo) (de |uns |por )?' + COMECO_DE_NUMERO,
  'ainda (nao )?(vou )?(aceitei|aceitamos|conferir|confirmar|fechei|fechamos|decidi|decidimos|defini|definimos|sei|combinei)', 'nao (aceitei|aceitamos|fechei|fechamos|confirmei|decidi|conferi|combinei)',
  'vou (conferir|confirmar|ver|checar|pensar)', 'a (conferir|confirmar|combinar|definir)', 'se (der|puder|conseguir|fechar|rolar|precisar|tiver|a gente)',
  'pode (ser|custar|ficar|sair)', 'vai (custar|sair|ficar)', 'deve (custar|ficar|sair)', 'custe',
  ENTRE_VERBOS + ' ((o|a) )?(valor|preco|total)', ENTRE_VERBOS + '( [a-z]+){1,3} (para|pra) ' + COMECO_DE_NUMERO,
  // faturamento e cobrança ao cliente são receita: "fatura para o cliente", "cobrei 12 mil do cliente", "a medição do mês fechou em 56 mil"
  'pagamento (do|da|de) cliente', '(fatura|faturei|faturamos|nota|emiti|emitimos|cobrei|cobramos) (para|pra|pro|ao|do|de|de|a)? ?(o |a )?cliente', 'cobrei', 'cobramos', 'emiti', 'emitimos', 'faturei', 'faturamos',
  'cliente (deve|deve a gente|esta devendo|ficou devendo)', 'a receber', 'medicao (do|da|de)', 'ja (foram|somam|somou|passou de|chegou a)',
  // "o preço do m2 de piso 85", "o m2 sai a 42 reais": preço de tabela, não pagamento
  'preco( [a-z0-9]+){0,4} ' + COMECO_DE_NUMERO, 'sai (a|por|em) ' + COMECO_DE_NUMERO, 'ainda nao (lancei|lancamos|registrei|anotei|incluimos)',
  // preço combinado ou de tabela no presente: "o orçamento da cobertura é 22 mil", "o preço do saco é 39"
  '(orcamento|preco|proposta|cotacao|tabela)( [a-z]+){0,4} (esta|ta|seria|sera|fica) ' + COMECO_DE_NUMERO,
].join('|') + ') ');
// Espaço, bairro ou prédio: o número que vem depois é endereço, não dinheiro.
const NOME_LUGAR = new Set(['rua', 'avenida', 'av', 'travessa', 'alameda', 'rodovia', 'estrada', 'residencial', 'edificio',
  'condominio', 'sitio', 'chacara', 'loteamento']);
const RUAS = new Set(['rua', 'avenida', 'av', 'travessa', 'alameda', 'rodovia', 'estrada']);
const TELEFONE = new Set(['telefone', 'fone', 'tel', 'celular', 'whats', 'whatsapp', 'zap', 'contato']);
// Número que descreve o lugar ou o material, não é valor: "banheiro 2", "cômodo 25", "cp 2", "brita 1".
const TAMANHOS = new Set(['tamanho', 'tam', 'bota', 'botina', 'calca', 'camisa', 'camiseta', 'sapato', 'tenis', 'luva']); // numeração de roupa/calçado vai até 99
const SPEC_PREFIX =new Set(['tamanho', 'tam', 'bota', 'botina', 'calca', 'camisa', 'camiseta', 'sapato', 'tenis', 'luva', 'dn', 'km', 'etapa', 'fase', 'parte', 'medicao', 'boletim', 'pav', 'pavimento', 'cp', 'classe', 'banheiro', 'quarto', 'suite', 'cozinha', 'comodo', 'bloco', 'galpao', 'torre', 'andar']);
// Medida técnica logo depois do número ("8 milímetros", "220 volts"): o número descreve o material, não é valor nem quantidade.
const MEDIDA_TECNICA = new Set(['km', 'gb', 'mb', 'tb', 'mega', 'gbps', 'mbps', 'va', 'dbi', 'milimetro', 'milimetros', 'mm', 'centimetro', 'centimetros', 'cm', 'polegada', 'polegadas', 'volt', 'volts', 'v',
  'ampere', 'amperes', 'watts', 'w', 'hz', 'btu', 'btus', 'kva', 'kw', 'kwh', 'kwp', 'cv', 'hp', 'graus', 'rpm', 'bar', 'psi', 'ohms', 'mpa', 'kgf',
  'kelvin', 'lumens', 'lux', 'micras', 'kcal', 'newtons', 'decibeis', 'hectares', 'alqueires', 'pes', 'jardas', 'milhas', 'gramas', 'miligramas',
  'megapixels', 'megapixel', 'mp', 'mah', 'gigas', 'giga', 'watt', 'lumen', 'amp', 'kelvins', 'centilitros', 'ml', 'cl','demao', 'demaos', 'metros', 'm2', 'm3', 'm²', 'm³']);
// "paguei dez de frete": depois de verbo de gasto, até número falado pequeno é dinheiro.
// Verbos e palavras que mostram gasto ou situação de pagamento. Frase LONGA sem nenhuma delas (e sem R$/reais, forma de pagamento
// ou item de obra) é comentário, não lançamento: "a laje tem 48 m2 e o prazo de entrega é 22 depois do feriado".
const VERBO_DE_LANCAMENTO = /^(paguei|pagou|pagamos|pago|paga|pagos|pagas|pagaram|pagar|gastei|gastou|gastamos|gasto|gastaram|comprei|compramos|compra|comprou|custou|custa|saiu|ficou|deu|foi|foram|fechei|fechou|fechamos|liquidei|quitei|quitamos|acertei|acertamos|repassei|mandei|transferi|depositei|enviei|dei|passei|investi|desembolsei|custeei|bancou|arcamos|lanca|lancar|lance|lancei|anota|anotar|registra|registrar|adiciona|inclui|coloca|bota|poe|marca|salva|devo|devendo|vence|venc|vencimento|pendente|pendurado|fiado|aberto|atrasado|vencido|vencida|total|totalizou|somou|importou|aluguel|alugamos|aluguei|recebeu|levou|pegou|cobrou|peguei|gastos|comprados|pagamento)$/;
const VERBO_GASTO = /^(paguei|gastei|gastamos|pagamos|custou|saiu|dei|mandei|passei|comprei|foi|deu)$/;

const PERTO_DE_OUTRO_VALOR = /^(de|pro|pra|para|na|no|ou|ate)$/;
const PISTAS = new Set(['por', 'total', 'tot', 'valor', 'vlr', 'custou', 'ficou', 'igual']);

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
  if (ps[i] === 'zero' && (palavraNum(ps[i + 1]) ?? 0) >= 1 && (palavraNum(ps[i + 1]) ?? 0) <= 9) return { dia: palavraNum(ps[i + 1]) as number, fim: i + 2 }; // "dia zero cinco"
  const ordinal = (ps[i] ?? '').match(/^(\d{1,2})º$/);
  if (ordinal && Number(ordinal[1]) >= 1 && Number(ordinal[1]) <= 31) return { dia: Number(ordinal[1]), fim: i + 1 };
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

function acharData(ps: string[], usadas: Set<number>, hoje: string, info: { semMes: boolean }, primeira = true): string | null {
  // "ano passado", "mês passado", "semana passada": o interpretador não sabe contar isso, a data fica em branco.
  if (primeira) {
    for (let i = 0; i + 1 < ps.length; i++) {
      const relativo = /^(passado|passada|retrasado|retrasada)$/.test(ps[i + 1]) || (ps[i + 1] === 'que' && ps[i + 2] === 'vem');
      if (relativo && (ps[i] === 'ano' || ps[i] === 'mes' || ps[i] === 'semana')) { usadas.add(i); usadas.add(i + 1); return null; }
    }
  }
  for (let i = 0; i < ps.length; i++) {
    if (usadas.has(i)) continue; // já foi lido como outra data
    const p = ps[i];
    if (p === 'hoje' || p === 'agora' || p === 'agorinha') { usadas.add(i); return hoje; }
    if (p === 'ontem' && ps[i - 1] === 'de' && ps[i - 2] === 'antes') { usadas.add(i); usadas.add(i - 1); usadas.add(i - 2); return diasAntes(hoje, 2); }
    if (p === 'ontem') { usadas.add(i); return diasAntes(hoje, 1); }
    if (p === 'anteontem') { usadas.add(i); return diasAntes(hoje, 2); }
    const atras = haQuantosDias(ps, i);
    if (atras) {
      for (let k = i; k < atras.fim; k++) usadas.add(k);
      return diasAntes(hoje, atras.dias);
    }
    // 3/4, 3/8, 1/2: fração de polegada ou de medida, não data (e ninguém sabe qual era; a data fica em branco)
    const fracao = p.match(/^(\d)\/(2|4|8)$/);
    if (fracao && Number(fracao[1]) < Number(fracao[2])) { usadas.add(i); continue; }
    if (/^\d\/\d$/.test(p) && /^pol/.test(ps[i + 1] ?? ps[i + 2] ?? '')) { usadas.add(i); continue; } // 3/4 de polegada
    if (/^\d\/\d$/.test(p) && ps[i + 1] === 'de' && /^pol/.test(ps[i + 2] ?? '')) { usadas.add(i); continue; }
    const barra = p.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (barra) {
      usadas.add(i);
      return montarData(Number(barra[1]), Number(barra[2]), barra[3] ? Number(barra[3]) : null, hoje);
    }
    // "17 de setembro", "dia 17 de setembro", "dia vinte e cinco", "dia 17"
    // "rua 15 de novembro", "residencial dez de abril": nome de lugar, não data
    if (NOME_LUGAR.has(ps[i - 1] ?? '')) continue;
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
        // "dia 10, 11 e 12": os outros dias da lista também saem do caminho do valor
        for (let k = d.fim; k < ps.length; ) {
          const proximo = ps[k] === 'e' ? k + 1 : k;
          const n = /^\d{1,2}$/.test(ps[proximo] ?? '') ? Number(ps[proximo]) : 0;
          const fimDia = proximo + 1;
          if (n < 1 || n > 31 || MOEDA.has(ps[fimDia] ?? '') || UNIDADES.has(ps[fimDia] ?? '') || ps[fimDia] === 'de' || ps[fimDia] === 'mil') break;
          for (let m = k; m < fimDia; m++) usadas.add(m);
          k = fimDia;
        }
        info.semMes = true;
        return montarData(d.dia, null, null, hoje);
      }
    }
    // Data no futuro ("amanhã", "segunda que vem", "próxima sexta") não vira data de custo: fica em branco.
    if (p === 'amanha' || (p === 'que' && ps[i + 1] === 'vem') || p === 'proxima' || p === 'proximo') { usadas.add(i); return null; }
    const semana = SEMANA[p.replace(/-?feira$/, '')];
    // "segunda parcela", "quarta etapa" não são dias da semana
    // "de segunda a sexta": mais de um dia da semana, sem como saber qual é a data
    const outroDia = ps.some((q, k) => k !== i && SEMANA[q.replace(/-?feira$/, '')] !== undefined);
    if (semana !== undefined && outroDia && !/^(parcela|parcelas|etapa|medicao|fase|vez|parte|rodada|opcao|quinzena)$/.test(ps[i + 1] ?? '') || (ps[i + 1] === 'via' && /^(do|da|de)$/.test(ps[i + 2] ?? ''))) {
      usadas.add(i); return null;
    }
    if (semana !== undefined && !/^(parcela|parcelas|etapa|medicao|fase|vez|parte|rodada|opcao|quinzena)$/.test(ps[i + 1] ?? '') || (ps[i + 1] === 'via' && /^(do|da|de)$/.test(ps[i + 2] ?? ''))) {
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

// Palavras do dia a dia que aparecem em nome de obra mas não a identificam sozinhas ("tinta azul", "comprei pedras").
const PALAVRAS_COMUNS = new Set(['azul', 'verde', 'branco', 'branca', 'amarelo', 'rio', 'morro', 'pedra', 'pedras', 'praia', 'serra', 'vila', 'bairro',
  'parque', 'alto', 'baixo', 'novo', 'nova', 'velho', 'sobrado', 'dona', 'seu', 'dom', 'sao', 'santa', 'santo', 'condominio', 'edificio', 'vale', 'campo', 'centro']);

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
        const peso = PALAVRAS_COMUNS.has(alvo) ? 0.5 : 1; // "azul" ou "rio" sozinhos não identificam a obra
        if (simples[i] === alvo) { pontos += /^\d+$/.test(alvo) ? 2 : peso; posicoes.push(i); break; }
        if (alvo.length >= 7 && !/^\d+$/.test(alvo) && quase(simples[i], alvo)) { pontos += peso; posicoes.push(i); break; }
        if (alvo.length >= 6 && junto === alvo) { pontos += peso; posicoes.push(i, i + 1); break; }
      }
    }
    if (pontos < 1) continue;
    if (!melhor || pontos > melhor.pontos) { melhor = { id: o.id, pontos, posicoes }; empate = false; }
    else { empate = true; } // duas obras citadas na mesma fala: não escolhe
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
  [/^(transferencia|transferi|ted|doc|depositei)$/, 'transferencia'], // "depósito" sozinho é a loja de material, não a forma de pagamento
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
// Chaves simplificadas (sem acento, letra repetida vira uma): "terraplenagem" e "ferro" casam com o que a fala vira.
const MAPA_CATEGORIA = new Map(PALAVRAS_CATEGORIA.map(([p, c]) => [simplificar(p), c] as [string, Categoria]));
const daCategoria = (w: string) => MAPA_CATEGORIA.get(simplificar(w));

const VAZIAS = new Set([
  '', // o "|" de fim de frase
  'paguei', 'pagou', 'pago', 'paga', 'pagamos', 'pagar', 'pagamento', 'gastei', 'gasto', 'gastamos', 'comprei',
  'compra', 'compramos', 'lancar', 'lanca', 'lancamento', 'custo', 'foi', 'de', 'do', 'da', 'dos', 'das', 'no',
  'na', 'nos', 'nas', 'em', 'com', 'o', 'a', 'os', 'as', 'ao', 'aos', 'um', 'uma', 'pro', 'pra', 'para', 'por',
  'r$', 'valor', 'total', 'e', 'que', 'via', 'pelo', 'pela', 'feito', 'feita', 'hoje', 'ontem', 'obra', 'reais',
  'real', 'ainda', 'falta', 'vou', 'vai', 'fica', 'ficou', 'aberto', 'fiado', 'prazo', 'passada', 'passado', 'feira', 'mais', 'agora', 'agorinha', 'vem', 'noite', 'manha', 'tarde', 'cedo', 'amanha', 'proxima', 'proximo',
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

// Uma letra a mais, a menos ou trocada: "olindinha" ~ "olindina".
function quase(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i === a.length && i === b.length) return true;
  const [x, y] = [a.slice(i), b.slice(i)];
  return x.slice(1) === y.slice(1) || x.slice(1) === y || x === y.slice(1);
}

// "adrian" acha "ADRIANO"; "ulisses" acha "ULISSES".
const parecido = (falado: string, nome: string) =>
  falado === nome || (falado.length >= 5 && (nome.startsWith(falado) || falado.startsWith(nome)));

// Valor do lançamento em centavos. Marca em `usadas` os números que leu. Quando há números mas não dá para
// ter certeza qual é o valor, devolve null com `duvida` verdadeiro (a tela pode avisar "confira o valor").
// Princípio: número com "R$"/"reais" colado é dinheiro e nunca é descartado como quantidade ou documento;
// o resto só vale se for o único que sobra e nada na fala o contradiz. Na dúvida, null.
function acharValor(ps: string[], originais: string[], usadas: Set<number>, outrasObras: Set<number>): { valor: number | null; duvida: boolean } {
  const junto = ' ' + ps.join(' ') + ' ';
  const ehDigitos = (p: string | undefined) => /^\d+$/.test(p ?? '');
  const escritoEmCaixaAlta = !originais.some((w) => /[a-zà-ÿ]/.test(w)); // "300 A JANELA": tudo maiúsculo não diz nada sobre nome próprio
  const crase = (i: number) => (originais[i] ?? '').toLowerCase() === 'à'; // "480 à Tintas Colorado": ao fornecedor, não "a tantos por unidade"
  const maiuscula = (i: number) => !escritoEmCaixaAlta && /^[A-ZÀ-Ý]/.test(originais[i] ?? '');
  const inteiro = (p: string | undefined) => { const n = p === undefined ? null : numeroEscrito(p); return n !== null && Number.isInteger(n) ? n : null; };

  // Números que descrevem endereço, telefone ou medida ("rua 7", "telefone 48 99999 8888", "40 por 40").
  const ruido = new Set<number>();
  let diasAbsurdos = false;
  ps.forEach((p, i) => {
    if (RUAS.has(p)) {
      // "rua 15 de novembro, 340": o nome da rua e o número da casa; mas "340 de areia" (com "de") já é valor
      let achados = 0;
      for (let k = i + 1; k <= i + 4 && k < ps.length && achados < 2; k++) {
        const n = ehDigitos(ps[k]) || achados === 0 ? começaNumero(ps[k]) : false;
        const marcado = ps[k - 1] === 'r$' || MOEDA.has(ps[k + 1] ?? '') || (ps[k + 1] === 'r$' && !começaNumero(ps[k + 2]));
        if (n && !marcado && (achados === 0 || !/^(de|reais|por|pro|pra|para)$/.test(ps[k + 1] ?? ''))) { ruido.add(k); achados++; }
      }
    }
    if (NOME_LUGAR.has(p) && !RUAS.has(p) && começaNumero(ps[i + 1])) ruido.add(i + 1); // "residencial dez de abril"
    // "pedreiro 450 faz 450 dias": ninguém sabe de que dia
    if ((p === 'faz' || p === 'ha') && (inteiro(ps[i + 1]) ?? 0) > 365 && TEMPO.has(ps[i + 2] ?? '')) diasAbsurdos = true;
    if (TELEFONE.has(p)) {
      // "telefone 48 3333 4455" ou "telefone do Jair 48 3333 4455": até 3 palavras de nome antes dos números
      let k = i + 1;
      while (k <= i + 4 && !ehDigitos(ps[k]) && /^[a-z]+$/.test(ps[k] ?? '') && !começaNumero(ps[k])) k++;
      const seq: number[] = [];
      for (let q = k; ehDigitos(ps[q]); q++) seq.push(q);
      if (seq.length && (k === i + 1 || seq.reduce((t, q) => t + ps[q].length, 0) >= 8)) seq.forEach((q) => ruido.add(q));
    }
    if (p === 'parcela' && inteiro(ps[i + 1]) !== null && ps[i + 2] === 'de' && inteiro(ps[i + 3]) !== null) { ruido.add(i + 1); ruido.add(i + 3); } // "parcela 3 de 10"
    // "4 de 12", "1 de 3": posição numa série (parcela, boleto), não valor
    const serieA = /^\d{1,2}$/.test(p) ? Number(p) : null;
    const serieB = /^\d{1,2}$/.test(ps[i + 2] ?? '') ? Number(ps[i + 2]) : null;
    if (serieA !== null && serieB !== null && ps[i + 1] === 'de' && serieA <= serieB && serieB <= 30 && !MOEDA.has(ps[i + 3] ?? '') && ps[i + 3] !== 'r$') { ruido.add(i); ruido.add(i + 2); }
    if (p === 'x') for (const k of [i - 1, i + 1]) if (começaNumero(ps[k])) ruido.add(k); // "38 x 20 = 760"
    // Período de dias: "dias 5 e 6", "semana de 5 a 9", "de 5 a 7 pedreiro": os dois números são dias, não dinheiro.
    const periodo = (k: number) => /^\d{1,2}$/.test(ps[k] ?? '') && /^(e|a)$/.test(ps[k + 1] ?? '') && /^\d{1,2}$/.test(ps[k + 2] ?? '') &&
      Number(ps[k]) < Number(ps[k + 2]) && Number(ps[k + 2]) <= 31 && !MOEDA.has(ps[k + 3] ?? '') && !UNIDADES.has(ps[k + 3] ?? '') && ps[k + 3] !== 'r$' && !ehMilhar(ps[k + 3]);
    if (/^(dias|semana|quinzena|periodo|de)$/.test(p)) {
      const k = i + (p !== 'de' && p !== 'dias' && ps[i + 1] === 'de' ? 2 : 1); // "semana de 5 a 9": o número vem depois do "de"
      if (periodo(k)) { ruido.add(k); ruido.add(k + 2); }
    }
    const a = numeroEscrito(p);
    const c = numeroEscrito(ps[i + 2] ?? '');
    if (a !== null && a <= 999 && ps[i + 1] === 'por' && c !== null && c <= 999 && !usadas.has(i) && !usadas.has(i + 2) &&
      // medidas do mesmo objeto são da mesma ordem de grandeza ("82 por 210", "2 por 4"); "12 por 480" é quantidade e preço
      ((a > 0 && c > 0 && Math.max(a, c) / Math.min(a, c) <= 5) || ps[i + 3] === 'de') && // "120 por 100 de alumínio" (medida em cm)
      !MOEDA.has(ps[i + 3] ?? '') && !(ps[i + 3] === 'r$' && !começaNumero(ps[i + 4])) &&
      ps[i - 1] !== 'r$' && ps[i + 1 - 1] !== 'r$') { ruido.add(i); ruido.add(i + 2); } // "tábua de 2 por 4", "telha 40 por 40"
  });

  // Tokens já lidos como data ou obra viram "|" para não se juntarem ao número seguinte ("casa 12: mil e duzentos").
  const soltos0 = numerosDe(ps.map((p, i) => (usadas.has(i) ? '|' : p))).filter((g) => ![...Array(g.fim - g.inicio).keys()].some((k) => usadas.has(g.inicio + k)));
  // "1 250 reais", "paguei 12 500": o ditado separa o milhar com espaço. Só junta quando nada antes ou depois mostra que o
  // primeiro número descreve outra coisa (material, cômodo, documento, unidade); em "brita 1 400" o 1 é da brita.
  const livres: Numero[] = [];
  for (let k = 0; k < soltos0.length; k++) {
    const a = soltos0[k];
    const b = soltos0[k + 1];
    const antes = ps[a.inicio - 1] ?? '';
    const depoisB = ps[(b?.fim ?? 0)] ?? '';
    // Só com sinal de dinheiro ("R$", "reais" ou verbo de gasto): "17 150" depois de "às" é hora e número, e "300 300" é gagueira.
    const sinalDeDinheiro = antes === 'r$' || MOEDA.has(depoisB) || VERBO_GASTO.test(antes) || /^(lancei|lanco|pague|gasto|foram|lanca)$/.test(antes);
    if (b && !ruido.has(a.inicio) && a.fim === b.inicio && a.fim === a.inicio + 1 && b.fim === b.inicio + 1 && /^[1-9]\d?$/.test(ps[a.inicio]) && /^\d{3}(,\d{1,2})?$/.test(ps[b.inicio]) &&
      sinalDeDinheiro && !/^(as|ate|das|dos|desde|entre)$/.test(antes) && daCategoria(antes) === undefined && !SPEC_PREFIX.has(antes) && !NUMERADORES.has(antes) && !OBRA_NUM.has(antes) && !DOCUMENTOS.has(antes) && !UNIDADES.has(antes) &&
      !UNIDADES.has(depoisB) && !MEDIDA_TECNICA.has(depoisB) && depoisB !== 'x' && depoisB !== 'por' && !/^\d{1,2}\/\d{1,2}$/.test(depoisB)) {
      livres.push({ inicio: a.inicio, fim: b.fim, valor: Number(ps[a.inicio]) * 1000 + (numeroEscrito(ps[b.inicio]) ?? 0) });
      k++;
    } else livres.push(a);
  }
  const temQuantidade = livres.some((n) => UNIDADES.has(ps[n.fim] ?? '') || contagemPlural(ps, n));

  // Cada número vira: candidato, ruído (descreve outra coisa) ou descartado (parece quantidade/documento).
  type Papel = 'candidato' | 'ruido' | 'descartado';
  const marcadoDe = (g: Numero) => {
    const depois = ps[g.fim] ?? '';
    return ps[g.inicio - 1] === 'r$' || (depois === 'r$' && !começaNumero(ps[g.fim + 1])) || MOEDA.has(depois) || ESTRANGEIRA.has(depois) || depois === 'centavo' || depois === 'centavos';
  };
  const papelDe = (g: Numero): Papel => {
    if (ruido.has(g.inicio)) return 'ruido';
    if (marcadoDe(g)) return 'candidato'; // "R$ 480 cômodo 2", "nota 800 reais": o dinheiro vence
    const prev = ps[g.inicio - 1] ?? '';
    const depois = ps[g.fim] ?? '';
    // "às 7 da manhã", "às 14h": hora, não dinheiro
    if ((originais[g.inicio - 1] === 'às' || originais[g.inicio - 1] === 'as' && /^(da|de|h|horas?)$/.test(depois)) && g.fim === g.inicio + 1 && (g.valor ?? 99) <= 24) return 'ruido';
    if (depois === 'a' && originais[g.fim] === 'A' && !começaNumero(ps[g.fim + 1])) return 'ruido'; // "disjuntor 32 A": ampere
    if (MEDIDA_TECNICA.has(depois) && depois !== 'metros' && depois !== 'm2' && depois !== 'm3' && depois !== 'm²' && depois !== 'm³') return 'ruido';
    const maoDeObra = prev === 'obra' && ps[g.inicio - 2] === 'de' && ps[g.inicio - 3] === 'mao'; // "mão de obra 95": é o valor
    // "ordem de serviço 17", "OS 17": número do documento, qualquer tamanho
    if ((prev === 'servico' && ps[g.inicio - 2] === 'de' && ps[g.inicio - 3] === 'ordem') || (prev === 'os' && originais[g.inicio - 1] === 'OS')) return 'ruido';
    if (NUMERADORES.has(prev) || (OBRA_NUM.has(prev) && !maoDeObra && /^\d{1,2}$/.test(ps[g.inicio] ?? ''))) return 'ruido'; // "lote 41", "obra 7": número da obra
    if (prev === 'final' && /^\d{4}$/.test(ps[g.inicio]) && g.fim === g.inicio + 1) return 'ruido'; // "cartão final 4455"
    const n = g.fim === g.inicio + 1 ? inteiro(ps[g.inicio]) : null;
    // "brita 200 reais e lixa 9": depois do valor, "e" + item + número já é outro lançamento, não descrição
    const segundoItem = /^(e|mais)$/.test(ps[g.inicio - 2] ?? '') && livres.some((o) => o.fim <= g.inicio && marcadoDe(o));
    // "2º andar 18": o andar vem antes do número, então o 18 continua sendo dinheiro
    const andarAntes = prev === 'andar' && (/^\d+º$/.test(ps[g.inicio - 2] ?? '') || /^(primeiro|segundo|terceiro|quarto|quinto|sexto|setimo|oitavo|nono|decimo)$/.test(ps[g.inicio - 2] ?? ''));
    // "ferro de 10 20 barras": "de 10" depois de material e seguido de outro número é bitola
    if (prev === 'de' && daCategoria(ps[g.inicio - 2] ?? '') === 'Materiais (M)' && g.fim === g.inicio + 1 && começaNumero(ps[g.fim]) && !marcadoDe(g)) return 'ruido';
    // "lixa 220 8 reais": a numeração da lixa (grão) não é valor quando há outro valor com "reais"
    if (prev === 'lixa' && g.fim === g.inicio + 1 && (g.valor ?? 0) >= 40 && livres.some((o) => o.inicio > g.inicio && marcadoDe(o))) return 'ruido'; // grão de lixa começa em 40
    if (n !== null && ((SPEC_PREFIX.has(prev) && !andarAntes && n <= (prev === 'dn' ? 999 : TAMANHOS.has(prev) ? 99 : 30)) ||
      (n >= 1 && n <= 9 && daCategoria(prev) === 'Materiais (M)' && !PERTO_DE_OUTRO_VALOR.test(depois) && !segundoItem &&
        // "areia 1 200 reais": 1 e 200 colados, sem saber se é mil e duzentos; só a brita tem número de graduação ("brita 1 400")
        !(prev !== 'brita' && /^\d{3}$/.test(ps[g.fim] ?? ''))))) return 'ruido';
    // "2º andar 480": o andar vem antes do número, então o 480 continua sendo dinheiro
    const andarComOrdinal = prev === 'andar' && (numeroEscrito(ps[g.inicio - 2] ?? '') !== null || /^\d+º$/.test(ps[g.inicio - 2] ?? '') || /^(primeiro|segundo|terceiro|quarto|quinto|sexto|setimo|oitavo|nono|decimo)$/.test(ps[g.inicio - 2] ?? ''));
    // "parcela 3" é índice; "última parcela 2.000" é valor
    const documento = DOCUMENTOS.has(prev) && !(/[.,]/.test(ps[g.inicio] ?? '') && /^(cheque|recibo|fatura|duplicata|comprovante|parcela|conta|orcamento|contrato)$/.test(prev)) && !andarComOrdinal && !(prev === 'parcela' && (g.valor ?? 0) > 99); // "segundo andar 480": o andar vem antes
    const minDigitos = ['crea', 'art', 'rrt', 'apolice', 'inscricao'].includes(prev) ? 5 : 4; // "anuidade do CREA 1150" é valor
    if ((documento || DOCUMENTOS_LONGOS.has(prev)) && ps[g.inicio].length >= minDigitos && /^\d+$/.test(ps[g.inicio])) return 'ruido'; // "nota fiscal 4521": número de documento
    if (/^(metros?|m|m2|m3|m²|m³|kg|quilos?|litros?|toneladas?)$/.test(depois)) return 'ruido'; // "25 kg", "6 metros": medida, não quantidade a conferir
    const rotuloDeLugar = SPEC_PREFIX.has(depois) && inteiro(ps[g.fim + 1]) !== null && (g.valor ?? 0) > 99; // "1200 andar 8", "480 cômodo 2": o 8 e o 2 são o lugar
    // "4 1/2" (disco de 4 1/2), "caixa com 100": o número descreve o material, não é valor nem quantidade
    if (/^\d\/\d$/.test(depois) || (prev === 'com' && UNIDADES.has(ps[g.inicio - 2] ?? ''))) return 'ruido';
    // "1 pedreiro 450", "1 diária 180": o 1 é a quantidade
    if (ps[g.inicio] === '1' && g.fim === g.inicio + 1 && depois !== '' && !começaNumero(depois) && !PERTO_DE_OUTRO_VALOR.test(depois) && !/^(real|reais|por|vez|conto|r\$)$/.test(depois)) return 'ruido';
    // Quantidade de peças, sacos, unidades, lugar ou documento: sai do caminho, mas guarda o tamanho para conferir depois
    // (se o número descartado era maior que o que sobrou, o que sobrou provavelmente não é o valor: "480 sacos 2").
    if ((UNIDADES.has(depois) && !rotuloDeLugar) || documento || /^\d{4,5}-?\d{4}$/.test(depois)) return 'descartado';
    if (contagemPlural(ps, g) || contagemDeMaterial(ps, g)) return 'ruido';
    return 'candidato';
  };
  const papeis = livres.map(papelDe);
  const descartados = papeis.filter((p) => p === 'descartado').length;
  const maiorDescartado = Math.max(0, ...livres.filter((_, k) => papeis[k] === 'descartado').map((g) => g.valor ?? 0));
  const aberto = livres.filter((_, k) => papeis[k] === 'candidato');

  // Dois números escritos colados ("1 200", "R$ 1 250,00") podem ser um valor só ou dois: dúvida nos dois.
  const colados = new Set<Numero>();
  aberto.forEach((n, k) => {
    const antes = aberto[k - 1];
    if (antes && antes.fim === n.inicio && inteiro(ps[n.inicio]) !== null && inteiro(ps[antes.fim - 1]) !== null &&
      antes.valor !== n.valor && !/^(19|20)\d\d$/.test(ps[antes.inicio])) { // gagueira ("300 300") e ano ("IPTU 2026 1.340") não são número colado
      colados.add(n); colados.add(antes);
    }
  });

  let cadaConsumido = false;
  const removidos: number[] = []; // preços de cada unidade que saíram do caminho
  const candidatos = aberto
    .map((g) => {
      let centavos = g.valor === null || colados.has(g) ? null : Math.round(g.valor * 100);
      let fim = g.fim;
      let moeda = ps[g.inicio - 1] === 'r$';
      let remover = false; // é preço de cada unidade: some, não atrapalha o resto
      const depois = ps[g.fim];
      const ant = ps[g.inicio - 1] === 'r$' ? g.inicio - 2 : g.inicio - 1; // pula o "R$"
      if (SIMBOLO_ESTRANGEIRO.has(ps[ant] ?? '')) centavos = null; // "US$ 300", "dólares 300"
      const MEDIDAS = /^(metros?|m2|m3|m²|m³|kg|quilos?|litros?|toneladas?)$/;
      // "40 metros por 45 reais" é preço do metro; acima de R$ 1.000 já é o total ("12 metros por 1.400")
      if (ps[g.inicio - 1] === 'por' && MEDIDAS.test(ps[g.inicio - 2] ?? '') && começaNumero(ps[g.inicio - 3]) && (g.valor ?? 0) < 1000) remover = true;
      // "deu 480 a areia", "foi 360 o cimento": depois de verbo de total, "o/a" + material nomeia o que foi pago.
      // Só "o saco", "a diária" (unidade ou tempo) é preço de cada.
      const proxPalavra = ps[g.fim + 1] ?? '';
      const nomeiaOItem = (depois === 'o' || depois === 'a') && !UNIDADES.has(proxPalavra) && !TEMPO.has(proxPalavra) && !PRECO_POR.has(proxPalavra) &&
        /^(foi|deu|saiu|ficou|custou|paguei|pagamos|gastei|gastamos|fechou|fechamos|foram|ficaram|sairam|pago|pagou|dei)$/.test(ps[ant] === 'em' ? ps[ant - 1] ?? '' : ps[ant] ?? '');
      if (depois === 'cada' || (/^(por|ao|a|o)$/.test(depois ?? '') && !crase(g.fim) && !nomeiaOItem && precoPorUnidade(ps[g.fim + 1], maiuscula(g.fim + 1)))) { remover = true; if (depois === 'cada') cadaConsumido = true; } // "150 por dia", "40 o saco"
      if (depois === 'por' && ps[g.fim + 1] === 'ai') centavos = null; // "trezentos por aí"
      if (ps[ant] === 'ai' && ps[ant - 1] === 'por') centavos = null; // "por aí 600"
      if (depois === 'por' && ps[g.fim + 1] === 'mes' && ps.includes('meses')) remover = true; // "3 mil por mês durante seis meses"
      if (depois === 'pau' || depois === 'paus') centavos = null; // gíria que pode ser outra coisa
      if (depois === 'k') centavos = null; // "ferro 12 k": mil reais ou quilos? ("12k" colado já é lido como 12 mil)
      if (depois === 'centavo' || depois === 'centavos') { // "noventa centavos"
        centavos = g.valor !== null && Number.isInteger(g.valor) && g.valor < 100 ? g.valor : null;
        // "...reais e cinquenta centavos" cujo começo foi descartado: os centavos sozinhos não são o valor
        if (ps[g.inicio - 1] === 'e' && MOEDA.has(ps[g.inicio - 2] ?? '')) centavos = null;
        fim++; moeda = true;
      } else if (depois === 'r$' && !começaNumero(ps[g.fim + 1])) { // "450 R$"
        moeda = true; fim++;
      } else if (depois && ESTRANGEIRA.has(depois)) { // dólar não é real: a pessoa converte
        centavos = null; moeda = true; fim++;
      } else if (depois && MOEDA.has(depois)) {
        moeda = true; fim++;
        const unid = ps[fim + 1] ?? '';
        // "200 reais por dia", "40 reais o saco", "10 reais cada": preço de cada, não o total
        if (ps[fim] === 'por' && unid && !começaNumero(unid) && !PAGAMENTOS.some(([re]) => re.test(unid)) &&
          !/^(mes|ano|ai|ali|aqui|isso|tudo|conta|fora|dentro|todo|total|favor|gentileza|exemplo|enquanto|volta|baixo|cima|ele|ela|eles|elas|mim|nada|fim|sinal|causa|ultimo|primeiro)$/.test(unid)) remover = true;
        if (ps[fim] === 'por' && unid === 'ai') centavos = null; // "trezentos reais por aí"
        if (ps[fim] === 'cada') cadaConsumido = true;
        if (ps[fim] === 'cada' || (/^(por|ao|a|o)$/.test(ps[fim] ?? '') && !crase(fim) && precoPorUnidade(unid, maiuscula(fim + 1)))) remover = true;
        else if (ps[fim] === 'e' && começaNumero(ps[fim + 1])) {
          // "360 reais e 50 centavos" (só vale com a palavra "centavos"; "reais e 50" é dúvida)
          const resto = lerNumero(ps, fim + 1);
          const centavo = resto && (ps[resto.fim] === 'centavos' || ps[resto.fim] === 'centavo');
          if (resto && centavo && centavos !== null && resto.valor !== null && Number.isInteger(resto.valor) && resto.valor < 100 && (depois === 'reais' || depois === 'real')) {
            centavos += resto.valor; fim = resto.fim + 1;
          } else if (resto && (UNIDADES.has(ps[resto.fim] ?? '') || (/^[a-z]{4,}s$/.test(ps[resto.fim] ?? '') && !NAO_E_PLURAL.test(ps[resto.fim] ?? '')))) {
            // "480 reais e 7 sacos": o que vem depois do "e" é outra coisa (quantidade), não os centavos
          } else { centavos = null; if (resto) fim = resto.fim; }
        }
        if (ps[g.fim + 1] === 'mais' && /^(caro|barato)$/.test(ps[g.fim + 2] ?? '')) centavos = null; // "200 reais mais caro"
      }
      if (ps[g.fim] === 'mais' && /^(caro|barato)$/.test(ps[g.fim + 1] ?? '')) centavos = null; // "200 mais caro"
      // "uns 500", "mais ou menos 500": estimativa, não é o valor do lançamento
      const prefixo = ps.slice(Math.max(0, ant + 1 - 3), ant + 1).join(' ');
      if (/ (uns|umas|cerca|cerca de|aproximadamente|quase|mais ou menos|perto de|em torno de|tipo|mais de|menos de|na casa dos|na casa de|casa dos|acima de|abaixo de|ate|no maximo|no minimo|a partir de|por volta de|na faixa de|em media|media de)$/.test(' ' + prefixo)) centavos = null;
      // "mais 500 de areia": soma ou subtração, não um valor sozinho
      if ((ps[ant] === 'mais' && ps[ant - 1] !== 'a') || ps[ant] === 'menos') centavos = null; // "paguei a mais, 350" é advérbio
      // "mil e pouco", "mil e tantos"
      if (ps[g.fim] === 'e' && /^(pouco|poucos|picos|tanto|tantos|alguma)$/.test(ps[g.fim + 1] ?? '')) centavos = null;
      // "3 vezes de 400", "10 parcelas de 300": não dá para saber se o lançamento é a parcela ou o total
      if (ps[ant] === 'de' && (/^(parcelas|vezes|x)$/.test(ps[ant - 1] ?? '') || /^\d+x$/.test(ps[ant - 1] ?? ''))) centavos = null;
      // "3 diárias de 150", "10 dias de 300": preço de cada dia
      if (ps[ant] === 'de' && TEMPO.has(ps[ant - 1] ?? '') && começaNumero(ps[ant - 2]) && !/^(um|uma|1)$/.test(ps[ant - 2] ?? '')) remover = true;
      // "dois fretes de 300", "fiz 3 pagamentos hoje de 100": quantidade + substantivo plural + "de V" é o valor de cada
      if (ps[ant] === 'de' && [1, 2].some((d) => /^[a-z]{4,}s$/.test(ps[ant - d] ?? '') && !NAO_E_PLURAL.test(ps[ant - d] ?? '') && !/^(parcelas|prestacoes|vezes)$/.test(ps[ant - d] ?? '') && começaNumero(ps[ant - d - 1]) &&
        (inteiro(ps[ant - d - 1]) ?? palavraNum(ps[ant - d - 1]) ?? 0) >= 2)) remover = true;
      // "3 baldes de tinta de 180": depois de quantidade + item, o "de 180" é o preço de cada
      if (ps[ant] === 'de' && ps[ant - 2] === 'de' && UNIDADES.has(ps[ant - 3] ?? '') && começaNumero(ps[ant - 4])) remover = true;
      // "20 sacos a 30 reais": o 30 é o preço de cada saco, não o total
      if (ps[ant] === 'a' && temQuantidade) remover = true;
      // "dia 200", "dia onze mil reais": não é data; pode ser valor ou dia seguido de valor
      if (ps[ant] === 'dia' && !moeda && !/^(do|da|de)$/.test(ps[ant - 1] ?? '')) centavos = null; // "total do dia 540" passa
      const dia = ps[g.inicio - 1] === 'dia' ? (inteiro(ps[g.inicio]) ?? lerGrupo(ps, g.inicio)?.valor ?? null) : null;
      if (dia !== null && dia <= 31 && g.valor !== null && g.valor > 31) centavos = null;
      // "1 de 3", "20-10": traços e barras de data
      // "gastei 2,5", "ferro 2,5": uma casa decimal sem "R$"/"reais" é medida ou "2,5 mil", não R$ 2,50
      if (!moeda && g.fim === g.inicio + 1 && /^\d+,\d$/.test(ps[g.inicio])) centavos = null;
      if (remover && centavos !== null) removidos.push(centavos);
      return { inicio: g.inicio, fim, centavos, moeda, remover };
    })
    .filter((g) => !g.remover)
    // o "50" de "300 reais e 50 centavos" já foi lido junto com o 300
    .filter((g, k, todos) => !todos.slice(0, k).some((o) => g.inicio < o.fim))
    // Acima de R$ 50 milhões é telefone, CEP ou erro de reconhecimento, não custo de obra.
    .filter((g) => g.centavos === null || g.centavos <= 5_000_000_000)
    // "um" sozinho é artigo ("um frete de 300"), a não ser que venha com "real"/"conto".
    .filter((g) => !(g.fim - g.inicio === 1 && (ps[g.inicio] === 'um' || ps[g.inicio] === 'uma')) && (g.centavos === null || g.centavos > 0));

  // Com outro candidato na fala, ano ("em 2026") e número falado pequeno ("Quatro Irmãos") são ruído.
  const soltos = candidatos.length > 1 ? candidatos.filter((g) => {
    if (g.moeda || PISTAS.has(ps[g.inicio - 1] ?? '')) return true;
    if (g.fim === g.inicio + 1 && /^20\d\d$/.test(ps[g.inicio])) return false;
    const falado = palavraNum(ps[g.inicio]) !== undefined && g.centavos !== null && g.centavos < 2000;
    if (falado && VERBO_GASTO.test(ps[g.inicio - 1] ?? '')) return true;
    return !(falado && !PERTO_DE_OUTRO_VALOR.test(ps[g.fim] ?? '') && !(ps[g.fim] === 'a' && começaNumero(ps[g.fim + 1])));
  }) : candidatos;

  // O mesmo valor repetido ("200 de areia (duzentos reais)") conta uma vez.
  const unicos = soltos.filter((g, k) => g.centavos === null || !soltos.slice(0, k).some((o) => o.centavos === g.centavos));
  for (const g of unicos) if (soltos.some((o) => o.centavos === g.centavos && o.moeda)) g.moeda = true;
  const comMoeda = unicos.filter((g) => g.moeda);
  // "200 telhas por 780": o número depois de "por"/"total" é o valor, o outro é quantidade.
  const pista = (g: { inicio: number }) => PISTAS.has(ps[g.inicio - 1] ?? '');
  const comPista = unicos.filter((g) => g.moeda || pista(g));
  // "total do dia: 540", "= 760": o resultado da conta é o valor, os outros números são parcelas.
  // "tudo junto 1.370", "ao todo 1.370", "somando 1.370", "fechou em 1.370"; "deu 1.370" só depois de uma lista de valores.
  const FILLER = /^(do|da|de|dia|geral|final|foi|e|ficou|fica|deu|ser|ta|ao|no|em|junto|fechou|fechamos)$/;
  const pistaForte = (g: { inicio: number; fim?: number }) => {
    if (g.fim !== undefined && aberto.length === 1 && /^(no total|total|ao todo|no final)$/.test((ps[g.fim] ?? '') + (ps[g.fim] === 'no' || ps[g.fim] === 'ao' ? ' ' + (ps[g.fim + 1] ?? '') : '')) ) return true; // "1.350 reais no total"
    for (let k = g.inicio - 1; k >= Math.max(0, g.inicio - 3); k--) {
      if (/^(total|tot|igual|soma|somando|somou|tudo|todo)$/.test(ps[k] ?? '')) return true;
      if (/^(fechou|fechamos|deu|ficou)$/.test(ps[k] ?? '') && aberto.filter((o) => o.fim <= k).length >= 2) return true;
      if (!FILLER.test(ps[k] ?? '') && ps[k] !== 'r$') return false;
    }
    return false;
  };
  const fortes = unicos.filter(pistaForte);
  let escolhido = unicos.length === 1 ? unicos[0] : fortes.length === 1 ? fortes[0] : comMoeda.length === 1 ? comMoeda[0] : comPista.length === 1 ? comPista[0] : null;
  let viaLista = false;
  // "100 blocos, 2 sacos de cimento, 1 de areia 390": uma lista de "N de item" são quantidades; o único número que sobra é o valor.
  if (!escolhido) {
    const ehItem = (w: string | undefined) => /^[a-z]{3,}$/.test(w ?? '') && !VAZIAS.has(w ?? '') && !começaNumero(w) && !MOEDA.has(w ?? '');
    const contagem = (g: { fim: number; moeda: boolean }) => !g.moeda && ps[g.fim] === 'de' && ehItem(ps[g.fim + 1]);
    const restantes = unicos.filter((g) => !contagem(g));
    const quantasListas = (unicos.length - restantes.length) + livres.filter((g, k) => papeis[k] === 'descartado' && ps[g.fim + 1] === 'de' && ehItem(ps[g.fim + 2])).length;
    if (restantes.length === 1 && quantasListas >= 2 && unicos.length - restantes.length >= 1) { escolhido = restantes[0]; viaLista = true; }
  }
  const anula = () => { if (escolhido) escolhido = { ...escolhido, centavos: null }; };

  if (escolhido) {
    const e = escolhido;
    // "bloco 14 de 400 reais": o 14 só descreve o 400
    const descritor = (g: { fim: number }) => ps[g.fim] === 'de' && (g.fim + 1 === e.inicio || (ps[g.fim + 1] === 'r$' && g.fim + 2 === e.inicio));
    // "200 reais de areia e 100 de brita", "entrada de 1.200 e 3 parcelas de 500": dois valores, na dúvida não escolhe.
    // "3 de cal e 2 de cimento por 215 reais": uma lista de "N de item" são quantidades; o valor é o que tem "reais"/"por".
    const item = (w: string | undefined) => /^[a-z]{3,}$/.test(w ?? '') && !VAZIAS.has(w ?? '') && !começaNumero(w) && !MOEDA.has(w ?? '');
    const itensContados = unicos.filter((g) => g !== e && !g.moeda && ps[g.fim] === 'de' && item(ps[g.fim + 1]));
    // "3 sacos de cal" (já descartado como quantidade) também conta como item da lista
    const outrasQuantidades = livres.filter((g, k) => papeis[k] === 'descartado' && ps[g.fim + 1] === 'de' && item(ps[g.fim + 2])).length;
    const quantidadeDeItem = (g: { inicio: number; fim: number }) => (e.moeda || pista(e) || viaLista) && itensContados.length + outrasQuantidades >= 2 && itensContados.some((o) => o.inicio === g.inicio);
    const outroValor = (g: { inicio: number; fim: number; moeda: boolean }) => !g.moeda && !descritor(g) && !quantidadeDeItem(g) && (
      PERTO_DE_OUTRO_VALOR.test(ps[g.fim] ?? '') || /^(comprei|compramos|pedi|levei|trouxe|entregaram)$/.test(ps[g.inicio - 1] ?? '') ||
      ps[g.inicio - 1] === 'ou' || ps[g.inicio - 1] === 'ate' ||
      (ps[g.fim] === 'a' && começaNumero(ps[g.fim + 1])) || (ps[g.inicio - 1] === 'a' && unicos.some((o) => o.fim === g.inicio - 1)) ||
      (/^(parcelas?|vezes|x)$/.test(ps[g.inicio - 2] ?? '') && ps[g.inicio - 1] === 'de') ||
      (ps[g.inicio - 1] === 'r$' && ps[g.inicio - 2] === 'de' && /^(parcelas|vezes|x)$/.test(ps[g.inicio - 3] ?? '')));
    const fechado = pistaForte(e); // "total 1.200" / "= 760": a pessoa já fez a conta
    if (!fechado && unicos.some((g) => g !== e && outroValor(g))) anula();
    // Quantidade ao lado do valor, sem "por"/"total": não dá para saber se o número é o total ou o preço de cada.
    // - dias, horas, semanas, viagens ("pedreiro 450 3 dias") e equipe ("dois pedreiros 450"): diária ou total?
    // - unidades de contagem ("20 sacos 38"): um total menor que R$ 2 por unidade é improvável, então o número
    //   é o preço de cada (menos de R$ 2 por saco/lata é improvável). Acima disso ("10 sacos de cimento 360") o total é a leitura natural.
    // - preço de cada já tirado ("38 reais cada"): o total nunca é menor que o preço de uma unidade ("comprei 10").
    if (!fechado && !pista(e)) {
      // Só conta quantidade colada ao valor (até 3 palavras de distância): longe dele, não fala do mesmo preço.
      const perto = (g: Numero) => (g.fim <= e.inicio ? e.inicio - g.fim : g.inicio - e.fim) <= 3;
      const contados = livres.filter((g, k) => papeis[k] !== 'candidato' && g.valor !== null && Number.isInteger(g.valor) && g.valor >= 2 && !marcadoDe(g) && perto(g));
      // Tempo DEPOIS do valor ("pedreiro 450 3 dias") lê-se como "450 por dia"; tempo antes ("3 dias 900") é o total.
      // Equipe colada no valor sem "reais" ("dois pedreiros 450") também não diz se é de cada um.
      const tempoOuEquipe = contados.some((g) => (g.inicio >= e.fim && /^(dias|horas|semanas|diarias)$/.test(ps[g.fim] ?? '') && !/^(em|ate|daqui|apos)$/.test(ps[g.inicio - 1] ?? '')) || // "vence em 10 dias" é prazo
        (!e.moeda && /^viagens$/.test(ps[g.fim] ?? '') && ps[g.inicio - 1] !== 'de') || // "frete de 2 viagens 300": o "de" descreve o serviço, o preço é do todo
        (!e.moeda && g.fim + 1 === e.inicio && EQUIPE.test(ps[g.fim] ?? '')));
      const maiorContagem = Math.max(0, ...livres.filter((g, k) => papeis[k] === 'descartado' && g.valor !== null && perto(g) && CONTAGEM.test(ps[g.fim] ?? '') &&
        // "frete de 20 sacos de cimento 60": o que se paga é o transporte, não os sacos
        !ps.slice(Math.max(0, g.inicio - 3), g.inicio).some((w) => /^(frete|entrega|transporte|carreto|descarga|munck|guincho)$/.test(w))).map((g) => g.valor ?? 0));
      if (tempoOuEquipe || (maiorContagem >= 2 && e.centavos !== null && e.centavos < maiorContagem * 200)) anula();
    }
    if (!fechado && e.centavos !== null && removidos.some((c) => e.centavos! < c)) anula();
    // Valor com "R$"/"reais" e sobrou outro número solto ("tinta R$ 250 e depois frete 150"): dois lançamentos numa fala.
    // Passa se o valor veio depois de "por"/"total", ou se a sobra é prazo, ano, número falado pequeno ou descrição.
    const sobraSemValor = (g: { inicio: number; fim: number; centavos: number | null }) =>
      /^(ano|anos|mes|meses)$/.test(ps[g.fim] ?? '') || /^(19|20)\d\d$/.test(ps[g.inicio]) || descritor(g) || quantidadeDeItem(g) ||
      (ps[g.inicio - 1] === 'de' && (daCategoria(ps[g.inicio - 2] ?? '') === 'Materiais (M)' || daCategoria((ps[g.inicio - 2] ?? '').replace(/s$/, '')) === 'Materiais (M)')) || // "tubos de 100"
      (g.fim === e.inicio && g.centavos !== null && g.centavos % 100 !== 0 && g.centavos < 1000) ||
      // inteiro de 1 a 9 solto ("Ferragens 3 Marias"), a não ser que some outro valor ("e 5", "mais 5") ou seja "5 de ..."
      // "R$ 480 caixas 12": número logo depois de unidade é o rótulo (caixa 12), não outro valor
      (g.centavos !== null && g.centavos % 100 === 0 && g.centavos <= 9900 && inteiro(ps[g.inicio]) !== null && g.fim === g.inicio + 1 && UNIDADES.has(ps[g.inicio - 1] ?? '') &&
        (g.fim <= e.inicio || ps[g.inicio - 2] !== 'e' && ps[g.inicio - 2] !== 'mais')) || // depois do valor, "e rolo 18" já é outro item
      // "brita 12 R$ 480": inteiro até 20 logo depois de material ou de lugar descreve o material
      // Só vale ANTES do valor: o número que vem depois de "e"/"mais" + item ("360 reais e prego 18") é um segundo lançamento.
      (g.fim <= e.inicio && g.centavos !== null && g.centavos % 100 === 0 && g.centavos <= 2000 && g.fim === g.inicio + 1 && inteiro(ps[g.inicio]) !== null &&
        (daCategoria(ps[g.inicio - 1] ?? '') === 'Materiais (M)' || SPEC_PREFIX.has(ps[g.inicio - 1] ?? '')) && !PERTO_DE_OUTRO_VALOR.test(ps[g.fim] ?? '')) ||
      (g.fim <= e.inicio && g.centavos !== null && g.centavos % 100 === 0 && g.centavos <= 900 && g.fim === g.inicio + 1 && inteiro(ps[g.inicio]) !== null &&
        !PERTO_DE_OUTRO_VALOR.test(ps[g.fim] ?? '') && !/^(e|mais|menos|ou|ate|a)$/.test(ps[g.inicio - 1] ?? '')) || // "fio 2,5 150 reais"
      (palavraNum(ps[g.inicio]) !== undefined && g.centavos !== null && g.centavos < 2000);
    if (!fechado && e === comMoeda[0] && comMoeda.length === 1 && !pista(e) && unicos.some((g) => g !== e && !sobraSemValor(g))) anula();
    // De "dois" a "nove" por extenso, sem "reais"/"por" ("paguei duas de areia"), é quantidade, não dinheiro.
    if (!fechado && !e.moeda && !pista(e) && e.fim === e.inicio + 1 && (palavraNum(ps[e.inicio]) ?? 0) >= 2 && (palavraNum(ps[e.inicio]) ?? 0) <= 9) anula();
    // "500 mil de terreno" / "500 mil de tijolo": "N mil de ..." sem "R$"/"reais", a partir de R$ 100 mil, pode ser quantidade: dúvida.
    if (!fechado && !e.moeda && !pista(e) && e.centavos !== null && e.centavos >= 10_000_000 && /^\d+$/.test(ps[e.inicio]) && ehMilhar(ps[e.inicio + 1]) && ps[e.fim] === 'de') anula();
    // Número falado menor que 20 sem "reais"/"por" ("dez de frete") é nome ou quantidade.
    if (!fechado && !e.moeda && !pista(e) && !VERBO_GASTO.test(ps[e.inicio - 1] ?? '') && palavraNum(ps[e.inicio]) !== undefined && e.centavos !== null && e.centavos < 2000) anula();
    // Um filtro jogou fora algum número ("2º andar", "480 cômodo") e sobrou só um inteiro pequeno: provavelmente não é o valor.
    if (!fechado && descartados > 0 && !e.moeda && !pista(e) && e.centavos !== null && e.centavos < 5000 && e.centavos % 100 === 0 && maiorDescartado > e.centavos / 100) anula();
    // "lote 39 cimento 12": o 12 pode ser o número de outra obra (casa 12)
    if (!e.moeda && !pista(e) && e.centavos !== null && e.centavos % 100 === 0 && outrasObras.has(e.centavos / 100)) anula();
    // "o preço do saco é 39", "a diária é 450": "é"/"está" no presente diante do número é preço ou combinado, não pagamento.
    // "o valor da empreitada é 38 mil" (valor/total/custo/gasto) é o lançamento.
    {
      const k = ps[e.inicio - 1] === 'r$' ? e.inicio - 2 : e.inicio - 1;
      const kk = ps[k] === 'de' && /^(é|está|esta)$/.test(originais[k - 1] ?? '') ? k - 1 : k; // "é de 22 mil"
      if (!fechado && !pista(e) && /^(é|está|esta)$/.test(originais[kk] ?? '') && kk > 0 && !VAZIAS.has(ps[kk - 1]) && !ps.slice(Math.max(0, kk - 3), kk).some((w) => /^(valor|total|custo|gasto|gastos)$/.test(w))) anula();
    }
    // Parcelado sem "reais"/"R$": o número pode ser a parcela ou o total.
    if (!fechado && !e.moeda && / (\d+x|em \d+ x|\d+ vezes|[a-z]+ vezes|parcelas) /.test(junto)) anula();
    // Frases de dúvida, estimativa, receita ou comando; palavras de conta; datas com traço ("20-10").
    const negou = ps.some((p, k) => p === 'nao' && /^(foi|era|e|sao|eram|ficou|fica|vai|sera)$/.test(ps[k + 1] ?? '') &&
      !/^(pago|paga|pagos|pagas)$/.test(ps[k + 2] ?? ''));
    // "casa 12 mil reais", "dia 5 mil reais": o 12 era da obra ou o valor era 12 mil?
    const usadoColadoAMil = ps.some((p, i) => usadas.has(i) && !usadas.has(i + 1) && (ehMilhar(ps[i + 1]) || ehMilhao(ps[i + 1])) && numeroEscrito(p) !== null);
    // Assuntos que não são custo: saldo, verba, previsão, tabela de preço, aporte, lembrete, conferência.
    const naoECusto = NAO_CUSTO.test(junto);
    // Frase longa (6+ palavras) sem verbo de gasto, sem R$/reais, sem forma de pagamento e sem item de obra: comentário.
    const palavrasDeFala = ps.filter((w, i) => !usadas.has(i) && w.length >= 3 && !começaNumero(w) && !ehMilhao(w) && !/^[\d.,]+$/.test(w) && !VAZIAS.has(simplificar(w))).length;
    const singularW = (w: string) => (w.endsWith('s') ? w.slice(0, -1) : w);
    const comoGasto = e.moeda || ps.some((w) => VERBO_DE_LANCAMENTO.test(w) || daCategoria(w) !== undefined || daCategoria(singularW(w)) !== undefined ||
      UNIDADES.has(w) || MEDIDA_TECNICA.has(w) || DOCUMENTOS.has(w) || TEMPO.has(w) || PAGAMENTOS.some(([re]) => re.test(w)) ||
      /^(guia|gps|darf|inss|fgts|iss|das|mei|simples|imposto|tributo|competencia|honorarios|custas|emolumentos|seguro|apolice)$/.test(w));
    if (!fechado && palavrasDeFala >= 5 && !comoGasto) anula();
    const dataComTraco = ps.some((p) => /^\d{1,2}-\d{1,2}$/.test(p));
    if (negou || naoECusto || usadoColadoAMil || dataComTraco || diasAbsurdos || (ps.includes('financiamento') && ps.some((p) => p === 'meses' || p === 'anos')) || FRASES_SEM_VALOR.test(junto) ||
      // "orçamento do pintor 4 mil mas ainda não fechei": orçamento que ainda não foi aceito não é custo
      (ps.some((p) => /^(orcamento|cotacao|proposta|estimativa)$/.test(p)) && / (ainda nao|nao fechei|nao fechamos|nao fechou|nao aprovei|nao aprovamos|aguardando|esperando|sem fechar) /.test(junto)) ||
      / pagou( [a-z0-9$.,]+){1,4} (o|a|pelo|pela) cliente /.test(junto) || // "pagou 450 de areia o cliente": o cliente pagou, é receita
      ps.some((p, i) => (CALCULO.has(p) && !(p === 'cada' && (cadaConsumido || /^(total|tot|igual)$/.test(ps[e.inicio - 1] ?? ''))) &&
        !(p === 'troco' && ps[i + 1] === 'de' && !começaNumero(ps[i + 2]) && ps[i + 2] !== 'r$') && // "troco de fechadura" é serviço; "troco de 50" é conta
        !(/^(recebi|recebemos)$/.test(p) && ps.some((q) => GASTO_NA_FALA.test(q)) && !ps.slice(i + 1, i + 3).some((q) => começaNumero(q) || q === 'r$'))) || RAIZ_CALCULO.test(p))) anula(); // "recebi o cimento, paguei 360"
    // "meio dia de servente 150", "meia hora": metade de alguma coisa que não é "dois e meio"/"meio milhão";
    // "meio fio", "meia cana", "meia parede" são nomes de peça.
    const lidos = numerosDe(ps);
    if (ps.some((p, i) => ehMeio(p) && !lidos.some((n) => i >= n.inicio && i < n.fim) && !PECA_COM_MEIO.test(ps[i + 1] ?? ''))) anula();
    // Porcentagem ("50% de 2.000", "dez por cento de entrada"): o valor depende de conta que a pessoa não disse.
    if (/\d%/.test(junto) || / por cento /.test(junto)) anula();
    for (let k = e.inicio; k < e.fim; k++) usadas.add(k);
    if (ps[e.inicio - 1] === 'r$') usadas.add(e.inicio - 1);
  }
  const valor = escolhido?.centavos ?? null;
  return { valor, duvida: valor === null && (candidatos.length > 0 || descartados > 0) };
}

// O reconhecimento de voz erra a grafia de numeral ("sesenta", "quinhento", "sinco"). Sem corrigir, o número
// pararia no pedaço certo e o valor sairia errado ("trezentos e sesenta" virava 300). Troca por uma edição só.
const PALAVRAS_DE_NUMERO = [...Object.keys(NUMEROS), 'mil', 'milhao', 'milhoes'];
function corrigeNumerais(ps: string[]): string[] {
  return ps.map((w, i) => {
    if (Object.hasOwn(NUMEROS, w) || ehMilhar(w) || ehMilhao(w) || !/^[a-z]+$/.test(w)) return w;
    const depoisDeDezena = i >= 2 && ps[i - 1] === 'e' && (palavraNum(ps[i - 2]) ?? 0) >= 20;
    if (w.length < 7 && !(depoisDeDezena && w.length >= 3)) return w;
    const alvos = PALAVRAS_DE_NUMERO.filter((a) => quase(w, a) && (w.length >= 7 || (palavraNum(a) ?? 99) <= 9));
    // "sesenta" está a uma letra de "sessenta" (faltou o s) e de "setenta" (trocou o s): vale o que só tem letra a mais ou a menos
    const insDel = alvos.filter((a) => a.length !== w.length);
    return alvos.length === 1 ? alvos[0] : insDel.length === 1 ? insDel[0] : w;
  });
}

// ---- tudo junto ----

export function interpretarFala(texto: string, contexto: { obras: Obra[]; custos: Custo[]; hoje: string }): Interpretacao {
  const ps = corrigeNumerais(palavras(texto));
  const usadas = new Set<number>();
  const simples = ps.map(simplificar);

  const obraId = acharObra(ps, contexto.obras, usadas);
  const dataInfo = { semMes: false };
  // A primeira data falada vale; as outras ("ontem ... a pagar dia 10") só saem do caminho do valor.
  // Data de vencimento ("o boleto que venceu ontem, paguei hoje") não é a data do pagamento: vale a outra.
  const datas: { data: string | null; venceu: boolean }[] = [];
  for (let primeira = true; ; primeira = false) {
    const antes = new Set(usadas);
    const achada = acharData(ps, usadas, contexto.hoje, dataInfo, primeira);
    if (usadas.size === antes.size) break;
    const inicio = Math.min(...[...usadas].filter((i) => !antes.has(i)));
    datas.push({ data: achada, venceu: /^(venceu|vencia|vencido|vencida)$/.test(ps[inicio - 1] ?? '') });
  }
  const dataFalada: string | null = (datas.find((d) => !d.venceu) ?? datas[0])?.data ?? null;

  let pagamento: FormaPagamento | null = null;
  let duasFormas = false;
  // "depósito" sozinho é a loja de material; é forma de pagamento em "fiz um depósito", "depósito na conta", "via depósito".
  const juntoPag = ' ' + ps.join(' ') + ' ';
  const depositoEPagamento = / deposito (na conta|em conta|bancario|identificado) /.test(juntoPag) || / (fiz|fez|fizemos|via|por) (um |o |a )?deposito /.test(juntoPag);
  ps.forEach((p, i) => {
    for (const [re, forma] of PAGAMENTOS) {
      if (!(re.test(p) || (p === 'deposito' && depositoEPagamento && forma === 'transferencia'))) continue;
      if (pagamento && pagamento !== forma) duasFormas = true; // "pix e boleto": dúvida
      pagamento ??= forma; usadas.add(i);
    }
  });
  if (duasFormas) pagamento = null;

  // A pagar: "a pagar", "falta pagar", "vou pagar", "em aberto", "fiado", "a prazo", "pagar dia 30".
  // Parcelado ("em 3 vezes", "3x", "10 parcelas") também fica a pagar, mas se a pessoa disse
  // "paguei" junto fica em dúvida (null): pode ser o cartão já pago ou só a primeira parcela.
  const junto = ' ' + ps.join(' ') + ' ';
  const parcelado = / (parcelad[oa]s?|parcelei|financiad[oa]|\d+x|em \d+ x|\d+ (vezes|parcelas)|[a-z]+ (vezes|parcelas)) /.test(junto);
  const disseuPago = / (paguei|pagou|pagamos|pago|pagos|pagas|paga|mandei|transferi|depositei|quitei|quitamos|quitado|quitada|liquidei|liquidamos) /.test(junto);
  let pago: boolean | null = null;
  // Sinais fortes: dizem que ainda não foi pago. "paguei"/"quitei" vencem os fracos (boleto atrasado, fiado,
  // "pagar" solto), que só descrevem a conta: "paguei o boleto atrasado" já está pago.
  if (/ (a pagar|falta pagar|vou pagar|vamos pagar|vai pagar|para pagar|pra pagar|em aberto|a prazo|ainda nao paguei|nao paguei|nao quitei|nao quitamos|ainda nao quitei|nao foi pago|nao foi paga|nao pagou|ainda nao pagou|nao pago|pendente|pendurado|pendurei|devo|vence|venc|vencimento|a vencer|vai vencer|vencer|vencendo|preciso pagar|(vai|vou|vao) cobrar|tenho que pagar|tenho de pagar|pagar (dia|ate|amanha|depois|segunda|terca|quarta|quinta|sexta|sabado|domingo)|(amanha|depois|semana|vem|mes|proximo|proxima|tarde|noite|segunda|terca|quarta|quinta|sexta|sabado|domingo) pagar|mais tarde pago|mais tarde pagar) /.test(junto)) pago = false;
  else if (parcelado) pago = disseuPago ? null : false;
  else if (disseuPago) pago = true;
  else if (/ (acabei de|terminei de|acabamos de) pagar /.test(junto)) pago = true;
  else if (/ (fiado|vencido|vencida|vencidos|vencidas|em atraso|atrasado|atrasada|atrasados|atrasadas|devendo) /.test(junto)) pago = false;
  // "pagar" solto ("fui pagar a areia") não diz se pagou: fica em branco, nunca "a pagar" por chute.

  // "A pagar sexta" / "a pagar dia 30" é vencimento no futuro; o interpretador só sabe voltar no tempo, então deixa em branco.
  const data = pago === false && dataInfo.semMes ? null : dataFalada;

  const numerosDeOutrasObras = new Set<number>();
  // Só desconfia de número igual ao de outra obra quando a fala já citou uma obra ("lote 39 cimento 12"): sem obra citada, 12 é só 12.
  if (obraId !== null) for (const o of contexto.obras) if (o.id !== obraId) for (const w of palavras(o.nome)) if (/^\d+$/.test(w)) numerosDeOutrasObras.add(Number(w));
  const { valor, duvida: duvidaValor } = acharValor(ps, palavrasOriginais(texto), usadas, numerosDeOutrasObras);

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
    descricao, fornecedor, pagamento, pago, faltou, ...(duvidaValor ? { duvidaValor } : {}),
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
