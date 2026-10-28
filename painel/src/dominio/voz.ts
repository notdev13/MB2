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
const MULTIPLICADORES: Record<string, number> = { mil: 1000, milhao: 1_000_000, milhoes: 1_000_000 };

// "5.800", "5800", "360,50", "2,5", "1.234,56" -> número; "17/09" e afins não são número.
function numeroEscrito(p: string): number | null {
  if (!/^\d[\d.,]*$/.test(p)) return null;
  let s = p;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const ehNumero = (p: string) => numeroEscrito(p) !== null || p in NUMEROS;
const valorDe = (p: string) => numeroEscrito(p) ?? NUMEROS[p];

interface Grupo { inicio: number; fim: number; valor: number } // fim exclusivo

// Junta sequências como "cinco mil e oitocentos" ou "2,5 mil" num número só.
function gruposNumericos(ps: string[]): Grupo[] {
  const grupos: Grupo[] = [];
  let i = 0;
  while (i < ps.length) {
    if (!ehNumero(ps[i]) && !(ps[i] in MULTIPLICADORES)) { i++; continue; }
    const inicio = i;
    let total = 0;
    let atual = 0;
    let ultimo = i;
    while (i < ps.length) {
      const p = ps[i];
      if (ehNumero(p)) {
        // "17 30" (dois números escritos seguidos) são coisas diferentes.
        if (i > inicio && numeroEscrito(p) !== null && numeroEscrito(ps[i - 1]) !== null) break;
        atual += valorDe(p);
      } else if (p in MULTIPLICADORES) {
        total += (atual || 1) * MULTIPLICADORES[p];
        atual = 0;
      } else if (p === 'e' && i + 1 < ps.length && (ehNumero(ps[i + 1]) || ps[i + 1] in MULTIPLICADORES)) {
        // "mil e oitocentos"
      } else break;
      ultimo = i;
      i++;
    }
    grupos.push({ inicio, fim: ultimo + 1, valor: total + atual });
    i = ultimo + 1;
  }
  return grupos;
}

const UNIDADES = new Set([
  'saco', 'sacos', 'metro', 'metros', 'm', 'm2', 'm3', 'unidade', 'unidades', 'peca', 'pecas', 'lata', 'latas',
  'kg', 'quilo', 'quilos', 'tonelada', 'toneladas', 'caminhao', 'caminhoes', 'barra', 'barras', 'milheiro',
  'rolo', 'rolos', 'caixa', 'caixas', 'galao', 'galoes', 'litro', 'litros', 'dias', 'horas', 'vezes', 'parcelas',
]);
const MOEDA = new Set(['reais', 'real', 'conto', 'contos', 'pila']);

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
    if (mes === null) { m -= 1; if (m === 0) { m = 12; a -= 1; } } else a -= 1;
    d = new Date(a, m - 1, dia);
    if (d.getDate() !== dia) return null;
  }
  return paraTexto(d);
}

function acharData(ps: string[], usadas: Set<number>, hoje: string): string | null {
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    if (p === 'hoje') { usadas.add(i); return hoje; }
    if (p === 'ontem') { usadas.add(i); return diasAntes(hoje, 1); }
    if (p === 'anteontem') { usadas.add(i); return diasAntes(hoje, 2); }
    const barra = p.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
    if (barra) {
      usadas.add(i);
      return montarData(Number(barra[1]), Number(barra[2]), barra[3] ? Number(barra[3]) : null, hoje);
    }
    const dia = numeroEscrito(p) ?? NUMEROS[p];
    // "17 de setembro", "dia 17 de setembro"
    if (dia !== undefined && Number.isInteger(dia) && ps[i + 1] === 'de' && ps[i + 2] in MESES) {
      [i, i + 1, i + 2].forEach((k) => usadas.add(k));
      if (ps[i - 1] === 'dia') usadas.add(i - 1);
      return montarData(dia, MESES[ps[i + 2]], null, hoje);
    }
    // "dia 17"
    if (p === 'dia' && i + 1 < ps.length) {
      const n = numeroEscrito(ps[i + 1]) ?? NUMEROS[ps[i + 1]];
      if (n !== undefined && Number.isInteger(n)) {
        usadas.add(i); usadas.add(i + 1);
        return montarData(n, null, null, hoje);
      }
    }
    const semana = SEMANA[p.replace(/-?feira$/, '')];
    if (semana !== undefined) {
      usadas.add(i);
      if (ps[i + 1] === 'feira') usadas.add(i + 1);
      if (ps[i + 1] === 'passada' || ps[i + 2] === 'passada') usadas.add(ps[i + 1] === 'passada' ? i + 1 : i + 2);
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
    if (ps[i - 1] === 'lote' || ps[i - 1] === 'obra') usadas.add(i - 1);
  }
  return melhor.id;
}

// ---- pagamento ----

const PAGAMENTOS: [RegExp, FormaPagamento][] = [
  [/^pix$/, 'pix'],
  [/^boleto$/, 'boleto'],
  [/^(cartao|credito|debito)$/, 'cartao'],
  [/^(transferencia|ted|doc)$/, 'transferencia'],
  [/^(dinheiro|especie)$/, 'dinheiro'],
];

// ---- categoria e descrição ----

// Palavras que já indicam a categoria (o histórico da MB2 completa o resto).
const grupo = (categoria: Categoria, lista: string): [string, Categoria][] =>
  lista.split(' ').map((p) => [p, categoria]);
const PALAVRAS_CATEGORIA: [string, Categoria][] = [
  ...grupo('Materiais (M)', 'cimento areia brita pedra ferro aco vergalhao madeira escora tabua tijolo bloco tinta ' +
    'argamasa reboco piso porcelanato ceramica azulejo telha tubo cano conexao conexoes fio cabo disjuntor material ' +
    'materiais prego parafuso vidro janela porta esquadria concreto cal manta impermeabilizante gesso drywal louca ' +
    'loucas metais torneira uniforme uniformes epi seguranca pedrisco lona siporex'),
  ...grupo('Mão de obra', 'pedreiro servente ajudante diaria diarias empreiteiro empreitada mestre'),
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
  'real', 'ainda', 'falta', 'vou', 'vai', 'fica', 'ficou', 'aberto', 'fiado', 'prazo', 'passada', 'feira', 'mais',
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
  const data = acharData(ps, usadas, contexto.hoje);

  let pagamento: FormaPagamento | null = null;
  ps.forEach((p, i) => {
    for (const [re, forma] of PAGAMENTOS) if (re.test(p)) { pagamento ??= forma; usadas.add(i); }
  });

  // A pagar: "a pagar", "falta pagar", "vou pagar", "em aberto", "fiado", "a prazo", "pagar dia 30".
  const junto = ' ' + ps.join(' ') + ' ';
  let pago: boolean | null = null;
  if (/ (a pagar|falta pagar|vou pagar|vamos pagar|vai pagar|para pagar|pra pagar|em aberto|fiado|a prazo|ainda nao paguei|nao paguei) /.test(junto)) pago = false;
  else if (/ (paguei|pagou|pagamos|pago|paga) /.test(junto)) pago = true;

  // Valor: o número com "reais"/"R$" perto; senão o maior que não é data, quantidade nem obra.
  const candidatos = gruposNumericos(ps)
    .filter((g) => ![...Array(g.fim - g.inicio).keys()].some((k) => usadas.has(g.inicio + k)))
    .map((g) => {
      const antes = ps[g.inicio - 1];
      const depois = ps[g.fim];
      let centavos = Math.round(g.valor * 100);
      let fim = g.fim;
      // "360 reais e 50 centavos"
      if (depois && MOEDA.has(depois) && ps[g.fim + 1] === 'e') {
        const resto = gruposNumericos(ps.slice(g.fim + 2)).find((r) => r.inicio === 0);
        if (resto && ps[g.fim + 2 + resto.fim] === 'centavos') {
          centavos += Math.round(resto.valor);
          fim = g.fim + 3 + resto.fim;
        }
      }
      const moeda = antes === 'r$' || (depois !== undefined && MOEDA.has(depois));
      const quantidade = depois !== undefined && UNIDADES.has(depois);
      return { ...g, fim, centavos, moeda, quantidade };
    })
    .filter((g) => !g.quantidade && g.centavos > 0);
  const escolhido = candidatos.find((g) => g.moeda) ??
    candidatos.reduce<(typeof candidatos)[number] | null>((m, g) => (!m || g.centavos > m.centavos ? g : m), null);
  if (escolhido) {
    for (let k = escolhido.inicio; k < escolhido.fim; k++) usadas.add(k);
    if (ps[escolhido.inicio - 1] === 'r$') usadas.add(escolhido.inicio - 1);
    if (MOEDA.has(ps[escolhido.fim] ?? '')) usadas.add(escolhido.fim);
  }

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
  if (!escolhido) faltou.push('valor');
  if (!obraId && contexto.obras.length > 1) faltou.push('obra');
  return {
    valor: escolhido?.centavos ?? null, data, obraId, categoria: categoria && CATEGORIAS.includes(categoria) ? categoria : null,
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
