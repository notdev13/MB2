import type { Categoria } from './tipos';
import type { Caso, Esperado } from './voz.casos';
import type { FormaPagamento } from './tipos';

// Geradores de frases para testar o interpretador de voz: o mesmo modelo, com sementes diferentes, dá frases novas a cada vez.
// Em todos o valor verdadeiro é conhecido; o que se mede é valor errado (tem que ser 0) e valor em branco.

// ---- gerador principal (níveis 1 a 6), caos, duplos e famílias ----

const MAT: Categoria = 'Materiais (M)';
const MO: Categoria = 'Mão de obra';
const SERV: Categoria = 'Serviços (S)';

// Caos: uma frase com UM valor claro (com "R$" ou "reais") misturado a números que não são dinheiro,
// em ordem aleatória. O valor certo ou null passam; qualquer outro número é erro grave.
export function gerarCaos(semente: number, quantidade: number, perigoso = false): Caso[] {
  const r = aleatorio(semente * 104729 + 7);
  const esc = <T,>(l: T[]): T => l[Math.floor(r() * l.length)];
  const casos: Caso[] = [];
  while (casos.length < quantidade) {
    const reais = esc([35, 90, 120, 250, 360, 780, 1200, 2500, 4800, 12000, 65000]);
    const cent = r() < 0.2 ? esc([10, 50, 75]) : 0;
    const valorFala = esc([
      `R$ ${milhar(reais)}${cent ? ',' + centavosTexto(cent) : ''}`,
      `${milhar(reais)}${cent ? ',' + centavosTexto(cent) : ''} reais`,
      cent ? `${porExtenso(reais)} reais e ${porExtenso(cent)} centavos` : `${porExtenso(reais)} reais`,
    ]);
    const n = () => esc([2, 3, 5, 8, 10, 12, 20, 40, 100, 250, 889, 4521]);
    const palavra = () => esc(['dois', 'três', 'cinco', 'dez', 'vinte', 'cem', 'trinta e cinco']);
    // Inofensivas: números que um humano não confunde com o valor. Perigosas: o valor passa a ser
    // incerto (conta, estimativa, parcela); lá, null também é resposta certa.
    const inofensivas = [
      () => `${n()} ${esc(['sacos', 'metros', 'mm', 'dias', 'horas', 'm2', 'kg', 'latas', 'milímetros'])}`,
      () => `de ${n()} mm`, () => `dia ${1 + Math.floor(r() * 27)}`, () => `${1 + Math.floor(r() * 27)} de março`,
      () => `lote ${n()}`, () => `casa ${n()}`, () => `nota fiscal ${n()}`, () => `pedido ${n()}`,
      () => `às ${1 + Math.floor(r() * 23)}h`, () => `cep 88063000`, () => `número ${n()}`,
      () => `${palavra()} sacos`, () => `${n()}h`, () => `rua ${n()}`, () => `ano 2026`,
    ];
    const perigosas = [
      () => `${n()}%`, () => `${palavra()} por cento`, () => `uns ${n()}`, () => `mais de ${n()}`, () => `quase ${palavra()}`,
      () => `${n()} cada`, () => `em ${n()}x`, () => `em ${n()} vezes`, () => `${n()} parcelas`, () => `${palavra()} de entrada`,
      () => `${n()} de desconto`, () => `metade`, () => `desconto`, () => `${n()} e meio`, () => `${palavra()} e meia`,
    ];
    const distracoes = perigoso ? [...inofensivas, ...perigosas] : inofensivas;
    const enchimento = ['paguei', 'comprei', 'de cimento', 'de areia', 'no pix', 'ontem', 'hoje', 'no boleto', 'pro Ulisses', 'foi', 'então', 'tá', 'a pagar', 'no cartão', 'em dinheiro'];
    const pedacos = [valorFala];
    for (let i = r() * 3; i > 0; i--) pedacos.push(esc(distracoes)());
    for (let i = r() * 4; i > 0; i--) pedacos.push(esc(enchimento));
    for (let i = pedacos.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pedacos[i], pedacos[j]] = [pedacos[j], pedacos[i]]; }
    // Número colado no começo do valor ("ano 2026 mil e duzentos reais") ninguém sabe ler: não entra
    const NUM = '(\\d[\\d.,]*|um|uma|dois|duas|tres|três|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|cento|duzentos|trezentos|quatrocentos|quinhentos|seiscentos|setecentos|oitocentos|novecentos|mil|meio|meia|e)';
    const k = pedacos.indexOf(valorFala);
    if (k > 0 && new RegExp(`(^|\\s)${NUM}$`).test(pedacos[k - 1]) && new RegExp(`^${NUM}(\\s|$)`).test(valorFala)) continue;
    casos.push({ frase: pedacos.join(' '), esperado: { valor: reais * 100 + cent }, tipo: perigoso ? 'caos-perigoso' : 'caos' });
  }
  return casos;
}

// Duplos: duas despesas na mesma fala ("360 de cimento e 200 de areia"). Qualquer valor devolvido é erro:
// o certo é null e a pessoa lança um de cada vez.
export function gerarDuplos(semente: number, quantidade: number): Caso[] {
  const r = aleatorio(semente * 15485863 + 11);
  const esc = <T,>(l: T[]): T => l[Math.floor(r() * l.length)];
  const casos: Caso[] = [];
  const forma = (reais: number) => esc([
    String(reais), milhar(reais), `${milhar(reais)} reais`, `R$ ${milhar(reais)}`, `R$ ${milhar(reais)},00`,
    porExtenso(reais), `${porExtenso(reais)} reais`,
  ]);
  while (casos.length < quantidade) {
    const [a, b] = [esc([35, 90, 120, 250, 360, 780, 1200, 2500, 4800, 12000]), esc([40, 100, 150, 300, 450, 900, 1500, 3000, 6500])];
    if (a === b) continue;
    const item = () => esc(['cimento', 'areia', 'brita', 'frete', 'tinta', 'prego', 'telha', 'eletricista']);
    const ligacao = esc([' e ', ', ', ' mais ', ' e depois ', ' e também ', ' além disso ', '. ', '; ']);
    const parte = (v: number) => esc([`${forma(v)} de ${item()}`, `${item()} ${forma(v)}`, `${forma(v)} pro ${esc(['Ulisses', 'Adriano'])}`]);
    const verbo = esc(['', 'paguei ', 'comprei ', 'foi ']);
    const [pa, pb] = [parte(a), parte(b)];
    // "mil e duzentos" + " e " + "quarenta reais" vira "mil e duzentos e quarenta reais": ninguém separa, nem uma pessoa
    const NUM = /(^|\s)(\d[\d.,]*|um|uma|dois|duas|tres|três|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|quatorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|cento|duzentos|trezentos|quatrocentos|quinhentos|seiscentos|setecentos|oitocentos|novecentos|mil|e)$/;
    const comecaNum = /^(\d|um |uma |dois |duas |tr[eê]s |quatro |cinco |seis |sete |oito |nove |dez |onze |doze |treze |quatorze |quinze |dezesseis |dezessete |dezoito |dezenove |vinte |trinta |quarenta |cinquenta |sessenta |setenta |oitenta |noventa |cem |cento |duzentos |trezentos |quatrocentos |quinhentos |seiscentos |setecentos |oitocentos |novecentos |mil )/;
    if ((ligacao === ' e ' || ligacao === ', ') && NUM.test(pa) && comecaNum.test(pb)) continue;
    casos.push({ frase: verbo + pa + ligacao + pb, esperado: { valor: null }, tipo: 'duplo' });
  }
  return casos;
}

// Famílias: frases em que o valor falado NÃO é o do lançamento (preço por unidade, estimativa, receita,
// comando, dúvida de quem fala). O certo é null; qualquer número devolvido é erro.
export function gerarFamilias(semente: number, quantidade: number): Caso[] {
  const r = aleatorio(semente * 32452843 + 5);
  const esc = <T,>(l: T[]): T => l[Math.floor(r() * l.length)];
  const casos: Caso[] = [];
  const valor = () => {
    const v = esc([35, 90, 120, 250, 360, 780, 1200, 2500, 4800, 12000]);
    return esc([`R$ ${milhar(v)}`, `${milhar(v)} reais`, `${porExtenso(v)} reais`, `${v}`, porExtenso(v)]);
  };
  const item = () => esc(['cimento', 'areia', 'brita', 'frete', 'tinta', 'prego', 'telha', 'eletricista', 'piso']);
  const unidade = () => esc(['saco', 'metro', 'quilo', 'litro', 'lata', 'rolo', 'peça', 'caixa', 'unidade', 'dia', 'hora', 'm2', 'saca', 'milheiro', 'pessoa', 'folha', 'chapa', 'vara', 'par', 'dúzia', 'tonelada', 'barra', 'ponto', 'viagem', 'cômodo', 'degrau', 'janela', 'porta', 'tijolo', 'bloco', 'galão', 'balde']);
  const familias: (() => string)[] = [
    () => `${valor()} ${esc(['cada', 'cada um', 'cada ' + unidade()])} de ${item()}`,
    () => `${item()} ${valor()} ${esc(['por', 'a', 'o', 'ao'])} ${unidade()}`,
    () => `${valor()} ${esc(['por', 'a', 'o', 'ao'])} ${unidade()} de ${item()}`,
    () => `${esc(['uns', 'cerca de', 'quase', 'mais ou menos', 'aproximadamente', 'em torno de', 'por volta de', 'na faixa de', 'em média', 'até', 'mais de', 'menos de', 'acima de', 'abaixo de', 'no máximo', 'no mínimo', 'a partir de', 'na casa dos'])} ${valor()} de ${item()}`,
    () => `${esc(['acho que foi', 'talvez', 'creio que foi', 'se não me engano foi', 'não lembro, foi', 'provavelmente', 'chutando foi', 'sei lá, foi', 'imagino que foi', 'suponho que foi', 'deve ter sido', 'parece que foi', 'aposto que foi', 'aparentemente foi', 'penso que foi', 'recordo que foi', 'estimo que foi', 'calculo que foi', 'por alto foi', 'a olho foi'])} ${valor()} de ${item()}`,
    () => `${esc(['estorno de', 'reembolso de', 'devolveram', 'o cliente pagou', 'recebi', 'recebemos', 'vendi por', 'vendemos por', 'empréstimo de', 'ressarcimento de', 'lucro de', 'faturamento de', 'receita de', 'vou comprar', 'preciso comprar', 'vou precisar de', 'comprarei', 'iremos gastar', 'pagaram', 'depositaram', 'transferiram', 'recebimento de', 'repasse de', 'quanto custa', 'qual foi', 'não foi', 'não era', 'tenho que comprar', 'queria gastar', 'custa', 'o orçamento seria', 'quanto foi o de'])} ${valor()} de ${item()}`,
    () => `${esc(['apaga', 'exclui', 'remove', 'cancela', 'desfaz', 'corrige', 'altera', 'muda', 'edita', 'atualiza', 'troca', 'substitui', 'apague', 'corrija', 'cancele', 'esquece', 'ignora', 'anula', 'retira', 'tira', 'edite', 'troque'])} ${esc(['o de', 'o lançamento de', 'aquele de', 'o último de'])} ${valor()}`,
    () => `${esc(['metade de', 'o dobro de', 'um terço de', 'desconto de', 'troco de', 'sobrou', 'restou', 'diferença de', 'aumento de', 'reajuste de'])} ${valor()} de ${item()}`,
    () => `${esc([String(esc([120, 360, 4800])), porExtenso(esc([120, 360, 4800]))])} ${esc(['dólares', 'euros', 'dólar'])} de ${item()}`,
  ];
  while (casos.length < quantidade) {
    const frase = esc(familias)();
    let prefixo = esc(['', 'paguei ', 'foi ', 'hoje ']);
    // "paguei 1.200 a porta", "foi 250 o bloco": depois de verbo de gasto, "o/a" + peça nomeia o que foi pago (rodada 58)
    if (/ (janela|porta|tijolo|bloco)( |$)/.test(frase) && /^(paguei|foi) $/.test(prefixo)) prefixo = '';
    casos.push({ frase: prefixo + frase, esperado: { valor: null }, tipo: 'familia' });
  }
  return casos;
}

// ---- gerador de frases ----

export function aleatorio(semente: number) {
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

export const milhar = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
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
  const OBRAS_N = nivel >= 5 ? [...OBRAS, [['no lote trinta e nove', 'na casa doze'], 'x'] as [string[], string]] : OBRAS;

  while (casos.length < quantidade) {
    // valor
    const tipoValor = esc(nivel === 1
      ? ['num', 'num', 'reais', 'rs', 'extenso']
      : nivel === 2
        ? ['num', 'reais', 'rs', 'extenso', 'extenso', 'centavos', 'milvirg', 'conto', 'mil']
        : nivel <= 4
          ? ['num', 'extenso', 'centavos', 'milvirg', 'conto', 'mil', 'colado', 'milhar3', 'ext-centavos', 'meio', 'virg-cent']
          : ['num', 'extenso', 'centavos', 'milvirg', 'mil', 'milhar3', 'ext-centavos', 'meio', 'k', 'dmil', 'rs00', 'rs-pos',
            'qtd-preco', 'aprox', 'duvida-meio', 'dois-valores', 'reais-cada']);
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
      case 'k': reais = esc([2000, 2500, 3000, 12000]); fala = `${String(reais / 1000).replace('.', ',')}k`; break;
      case 'dmil': reais = esc([2000, 3000, 2500, 5500]); fala = reais % 1000 ? `${Math.floor(reais / 1000)} mil e ${reais % 1000}` : `${reais / 1000} mil`; break;
      case 'rs00': fala = `R$ ${milhar(reais)},00`; break;
      case 'rs-pos': fala = `${reais} R$`; break;
      case 'qtd-preco': fala = `${esc([20, 200, 50])} ${esc(['telhas', 'tijolos', 'pregos'])} por ${milhar(reais)}`; break;
      case 'aprox': fala = `${esc(['uns', 'cerca de', 'mais ou menos'])} ${reais}`; break;
      case 'duvida-meio': fala = `${esc(['dois', 'cinco', 'vinte'])} e meio`; break;
      case 'dois-valores': fala = `${reais} de cimento e ${esc([300, 700])} de areia`; break;
      case 'reais-cada': fala = `${esc([10, 20, 30])} sacos a ${esc([40, 55])} reais cada`; break;
      default: fala = String(reais);
    }
    const semDe = ['qtd-preco', 'dois-valores', 'reais-cada'].includes(tipoValor);
    const duvida = ['aprox', 'duvida-meio', 'dois-valores', 'reais-cada'].includes(tipoValor);
    const valor = duvida ? null : reais * 100 + cent; // "uns 500", "dois e meio": na dúvida, null
    let [item, categoria] = esc(ITENS);
    if (tipoValor === 'qtd-preco') { item = fala.split(' ')[1]; categoria = MAT; }
    const esperado: Esperado = { valor };
    if ((nivel >= 2 || r() < 0.7) && !['dois-valores', 'reais-cada'].includes(tipoValor)) esperado.categoria = categoria;

    // obra
    let obraTxt = '';
    if (r() < 0.6) {
      const [frases, id] = esc(OBRAS_N);
      obraTxt = esc(frases);
      esperado.obraId = id === 'x' ? (obraTxt.includes('39') || obraTxt.includes('trinta') ? 'l39' : 'l12') : id;
    }
    // data
    let dataTxt = '';
    let dataRelativa = false; // "dia 15" e dia da semana: em lançamento a pagar a data fica em branco
    const sorteioData = r();
    if (nivel >= 5 && r() < 0.45) {
      const forma = esc(['atras', 'primeiro', 'barra', 'extenso']);
      if (forma === 'atras') {
        const n = 2 + Math.floor(r() * 18);
        dataTxt = esc([`há ${n} dias`, `${n} dias atrás`, `faz ${porExtenso(n)} dias`]);
        const d = new Date(hoje); d.setDate(d.getDate() - n); esperado.data = ymd(d);
      } else if (forma === 'primeiro') {
        const m = r() < 0.5 ? null : Math.floor(r() * 9);
        dataTxt = m === null ? 'dia primeiro' : `primeiro de ${MESES[m]}`; if (m === null) dataRelativa = true;
        esperado.data = `2026-${m === null ? '10' : doisDig(m + 1)}-01`;
      } else if (forma === 'barra') {
        let dia = 1 + Math.floor(r() * 27); const m = 1 + Math.floor(r() * 9);
        if ([2, 4, 8].includes(m) && dia < m) dia = 10 + dia; // 3/4 e 1/2 parecem fração, não data
        dataTxt = `${dia}/${doisDig(m)}${r() < 0.3 ? '/2026' : ''}`; esperado.data = `2026-${doisDig(m)}-${doisDig(dia)}`;
      } else {
        const dia = 1 + Math.floor(r() * 27); const m = Math.floor(r() * 9);
        dataTxt = `${porExtenso(dia)} de ${MESES[m]}`; esperado.data = `2026-${doisDig(m + 1)}-${doisDig(dia)}`;
      }
    } else if (sorteioData < 0.5) {
      const dia = 1 + Math.floor(r() * 27);
      const m = nivel >= 2 && r() < 0.5 ? Math.floor(r() * 9) : null; // até setembro
      if (m === null) { dataTxt = esc([`dia ${dia}`, `dia ${nivel >= 3 ? porExtenso(dia) : dia}`]); esperado.data = `2026-10-${doisDig(dia)}`; dataRelativa = true; }
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
      dataRelativa = true;
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
      if (nivel >= 5) { opcoes[2][0].push('no cartão de crédito', 'pelo cartão'); opcoes[3][0].push('em espécie'); opcoes[4][0].push('via transferência'); }
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
      if (nivel >= 5) pagoTxt = esc([pagoTxt, 'pendente', 'preciso pagar', 'em 3 vezes', 'em 3x', 'parcelado', 'devo']);
      if (nivel >= 5 && r() < 0.2) { pagoTxt = esc(['quitado', 'já quitei']); esperado.pago = true; }
    } else if (nivel >= 5 && verbo === 'paguei' && r() < 0.15) {
      pagoTxt = esc(['em 3 vezes', 'parcelado']); esperado.pago = null; // "paguei" + parcelado: não dá para saber
    }
    if (verbo === 'mandei' && /vezes|3x|parcelado/.test(pagoTxt)) esperado.pago = null;
    // parcelado sem "reais"/"R$": o número pode ser a parcela ou o total, então fica em branco
    if (/vezes|3x/.test(pagoTxt) && !/reais|R\$|conto/.test(fala)) esperado.valor = null;
    if (nivel >= 5 && verbo === 'mandei' && esperado.pago === undefined) esperado.pago = true;
    // ruído de transcrição
    const ruidoIni = nivel >= 2 && r() < 0.4 ? esc(['então', 'tá', 'hum', 'é', 'ah', 'então tá', 'olha']) + ' ' : '';
    const ruidoFim = nivel >= 2 && r() < 0.2 ? ' ' + esc(['né', 'tá', 'certo', 'pronto']) : '';

    // ordem das palavras
    const modelo = Math.floor(r() * (nivel >= 3 ? 5 : 3));
    // Números que não são dinheiro, jogados no meio da frase: o valor tem que continuar certo (ou null)
    const distracao = nivel >= 6 && r() < 0.6 ? esc(['nota fiscal 4521', 'pedido 889', 'às 14h', 'CP2', 'de 8 milímetros', 'de 100 mm', '20 sacos', 'lote 41']) : '';
    const sobra = [obraTxt, dataTxt, pagTxt, pagoTxt, distracao].filter(Boolean);
    if (nivel >= 2) for (let i = sobra.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [sobra[i], sobra[j]] = [sobra[j], sobra[i]]; }
    const corpoItem = semDe ? fala : `${fala} de ${item}`;
    let frase: string;
    if (modelo === 0) frase = [verbo, corpoItem, ...sobra].filter(Boolean).join(' ');
    else if (modelo === 1) frase = [item, fala, ...sobra].join(' ');
    else if (modelo === 2) frase = [...sobra.slice(0, 1), verbo, corpoItem, ...sobra.slice(1)].filter(Boolean).join(' ');
    else if (modelo === 3) frase = [item, ...sobra, fala].join(' ');
    else frase = [...sobra, verbo, fala, ...(semDe ? [] : ['de', item])].filter(Boolean).join(' ');
    if (modelo === 1 || modelo === 3) { // "paguei" some do início; "mandei" também
      if (verbo === 'paguei' && esperado.pago === true) esperado.pago = undefined;
      if (verbo === 'mandei' && esperado.pago === true) esperado.pago = undefined;
      if (esperado.pago === null) esperado.pago = false; // sem o "paguei", parcelado é a pagar
    }
    frase = (ruidoIni + frase + ruidoFim).replace(/\s+/g, ' ').trim();
    if (nivel >= 5) { // o iPhone põe maiúscula, vírgulas e ponto final
      const ps = frase.split(' ').map((p) => (r() < 0.12 ? p + ',' : p));
      ps[0] = ps[0][0].toUpperCase() + ps[0].slice(1);
      frase = ps.join(' ').replace(/,$/, '') + (r() < 0.3 ? '.' : '');
    }
    // "dia 21 mil e quinhentos" ninguém sabe ler (nem uma pessoa): não entra no corpus
    const semVirgula = frase.replace(/,/g, '').toLowerCase();
    if ((dataTxt && semVirgula.includes((dataTxt + ' ' + fala).toLowerCase())) || (obraTxt && semVirgula.includes((obraTxt + ' ' + fala).toLowerCase())) || (distracao && semVirgula.includes((distracao + ' ' + fala).toLowerCase()))) continue;
    if (esperado.pago === undefined) delete esperado.pago;
    if (esperado.pago === false && dataRelativa) esperado.data = null;
    // a pessoa pode ter dito "mão de obra" por nome; evita ambiguidade item x obra
    casos.push({ frase, esperado, tipo: `${tipo}/m${modelo}` });
  }
  return casos;
}

// ---- fuzz com modelos escritos de outro jeito (adjacentes, serviços, cego) ----

// Fuzz do interpretador de voz, com três famílias escritas de forma diferente do gerador principal.
// Em todas o valor verdadeiro é V. Com "R$"/"reais" colado (`marcado`) tem que sair V; sem marca, V ou null.
// Qualquer outro número é erro grave. O tipo da frase diz se é marcada ou solta.

const VALORES = [380, 480, 650, 1200, 2500, 4800, 12000];

function sorteador(semente: number, sal: number) {
  const r = aleatorio(semente * 2654435761 + sal);
  return { r, esc: <T,>(l: T[]): T => l[Math.floor(r() * l.length)] };
}

// Escreve V de um jeito marcado ("R$ 480", "480 reais", "quatrocentos e oitenta reais") ou solto ("480").
function falarValor(esc: <T,>(l: T[]) => T, v: number, marcado: boolean): string {
  return marcado ? esc([`R$ ${milhar(v)}`, `${milhar(v)} reais`, `${porExtenso(v)} reais`, `R$${v},00`]) : esc([String(v), milhar(v), porExtenso(v)]);
}

// "protocolo 8920 mil e duzentos reais": número colado no valor ninguém sabe ler (nem uma pessoa)
function coladoAoValor(frase: string, t: string): boolean {
  const antes = frase.slice(0, frase.indexOf(t)).trim().split(' ').pop() ?? '';
  return /\d[º]?[:;,.)]*$/.test(antes) && !t.startsWith('R$');
}

function caso(frase: string, v: number, marcado: boolean, familia: string): Caso {
  return { frase, esperado: { valor: v * 100 }, tipo: `${familia}-${marcado ? 'marcado' : 'solto'}` };
}

// Valor verdadeiro ao lado de palavras de documento, unidade, andar e cômodo, com um inteiro pequeno solto.
export function gerarAdjacentes(semente: number, quantidade: number): Caso[] {
  const { r, esc } = sorteador(semente, 1);
  const casos: Caso[] = [];
  while (casos.length < quantidade) {
    const v = esc(VALORES);
    const marcado = r() < 0.6;
    const t = falarValor(esc, v, marcado);
    const k = esc([1, 2, 3, 4, 5, 6, 8, 12]);
    const doc = String(1000 + Math.floor(r() * 8999));
    const frase = esc([
      () => `${esc(['areia pro', 'laje do', 'pedreiro no', 'reboco do', 'piso do'])} ${k}º andar ${t}`,
      () => `${esc(['quarto', 'banheiro', 'cômodo', 'sala', 'bloco', 'brita', 'cp', 'apto'])} ${k} ${t} ${esc(['de pedreiro', 'de piso', 'de tinta', ''])}`,
      () => `pedreiro ${t} ${esc(['cômodo', 'banheiro', 'quarto', 'andar', 'sala'])} ${k}`,
      () => `${esc(['nota fiscal', 'pedido', 'contrato', 'protocolo', 'código', 'agência'])} ${doc} ${t} ${esc(['de cimento', 'de ferro', ''])}`,
      () => `${t} ${esc(['de cimento', 'de areia', 'de pedreiro'])} ${esc(['cômodo', 'andar', 'quarto', 'banheiro'])} ${k}`,
      () => `${esc(['paguei', 'gastei', 'foi'])} ${t} ${esc(['no', 'do', 'pro'])} ${k}º andar`,
      () => `${t} ${esc(['de cimento', 'de areia'])} ${k} ${esc(['sacos', 'metros', 'caixas', 'latas'])}`,
    ])();
    if (coladoAoValor(frase, t)) continue;
    casos.push(caso(frase.replace(/\s+/g, ' ').trim(), v, marcado, 'adjacente'));
  }
  return casos;
}

// Serviços e materiais de obra cujo nome lembra palavra de dúvida, comando ou conta ("troca", "cancela", "cálculo").
export function gerarServicos(semente: number, quantidade: number): Caso[] {
  const { r, esc } = sorteador(semente, 2);
  const casos: Caso[] = [];
  const servicos = ['troca de fechadura', 'troca de telha', 'troca do registro', 'retirada de entulho', 'retirar entulho', 'cancela automática',
    'cancela do portão', 'cálculo estrutural', 'calculista', 'proposta do eletricista', 'proposta da construtora', 'receita federal darf',
    'tira de entulho', 'retirada de terra', 'troca de óleo da máquina', 'mudança do container', 'esquadro a laser', 'quebra de parede',
    'mais um servente', 'mais uma diária de pedreiro', 'mais cimento', 'mais uma caçamba', 'material do cliente Marcos', 'pro cliente',
    'cálculo de carga', 'corretagem do terreno', 'altura do muro', 'desconto na compra de tinta'];
  while (casos.length < quantidade) {
    const v = esc(VALORES);
    const marcado = r() < 0.6;
    const t = falarValor(esc, v, marcado);
    const s = esc(servicos);
    // "desconto" de verdade anula o valor: só entra frase sem ele
    if (/desconto/.test(s)) continue;
    const frase = esc([
      () => `${s} ${t}`,
      () => `paguei ${t} ${esc(['na', 'no', 'de', 'pra', 'pela'])} ${s}`,
      () => `${s}, ${t}`,
      () => `${esc(['ontem', 'hoje', 'dia 10'])} ${s} ${t} ${esc(['no pix', 'no boleto', 'em dinheiro'])}`,
      () => `esqueci de lançar, ontem paguei ${t} de ${s}`,
    ])();
    if (coladoAoValor(frase, t)) continue;
    casos.push(caso(frase, v, marcado, 'servico'));
  }
  return casos;
}

// Frases escritas em outro estilo: verbos, ordem, fornecedor e obra com número diferentes do gerador principal.
export function gerarCego(semente: number, quantidade: number): Caso[] {
  const { r, esc } = sorteador(semente, 3);
  const casos: Caso[] = [];
  while (casos.length < quantidade) {
    const v = esc(VALORES);
    const marcado = r() < 0.6;
    const t = falarValor(esc, v, marcado);
    const quem = esc(['Construtora Alfa Ltda', 'Madeireira Dois Irmãos', 'Casa do Construtor', 'Sr. Jorge', 'Dona Maria', 'Depósito São José',
      'Ferragens 3 Marias', 'Loja do Zé', 'Tintas Aurora', 'Ulisses', 'Adriano', 'Matsul']);
    const o = esc(['no lote 39', 'na casa 12', 'na Olindina', 'no projeto Laureano', 'Terreno Ecovillas', 'obra 7', 'quadra 5 lote 12', 'no bloco 3']);
    const item = esc(['cimento', 'areia', 'brita', 'ferro', 'telha', 'tinta', 'eletricista', 'encanador', 'frete', 'laje', 'reboco', 'piso', 'madeira']);
    const quando = esc(['', 'ontem', 'hoje', 'anteontem', 'dia 12', 'sexta passada', 'há 3 dias', 'em 15/10']);
    const forma = esc(['', 'no pix', 'no boleto', 'no cartão', 'em dinheiro', 'por transferência']);
    const frase = esc([
      () => `${esc(['Mandei', 'Transferi', 'Debitei', 'Saiu', 'Foi', 'Paguei', 'Gastei', 'Quitei'])} ${t} ${esc(['pro', 'pra', 'na', 'no', 'à', 'ao'])} ${quem} ${o} ${quando} ${forma}`,
      () => `${quem}: ${item} ${t} ${o} ${quando}`,
      () => `Compra de ${item} em ${quem}, ${t}, ${forma} ${quando}`,
      () => `Despesa ${o}: ${t} de ${item} (${quem}) ${quando}`,
      () => `${quando} ${o} ${item} ${t} ${forma}`,
      () => `${item} da ${quem} custou ${t} ${o}`,
      () => `pix de ${t} ${o} ${item} ${quem}`,
    ])();
    if (coladoAoValor(frase, t)) continue;
    casos.push(caso(frase.replace(/\s+/g, ' ').trim(), v, marcado, 'cego'));
  }
  return casos;
}

// ---- fuzz B ----

// Segundo gerador cego, com modelos de frase e vocabulário diferentes de voz.fuzz.ts (pagamentos a pessoas, empresas
// com número no nome, notas, quantidades e medidas misturadas). O valor verdadeiro é V; "marcado" = com "R$"/"reais" colado.
// Com marca tem que sair V; sem marca, V ou null. Qualquer outro número é erro grave.

function sorteadorB(semente: number) {
  const r = aleatorio(semente * 2246822519 + 97);
  return { r, esc: <T,>(l: T[]): T => l[Math.floor(r() * l.length)] };
}

export function gerarCegoB(semente: number, quantidade: number): Caso[] {
  const { r, esc } = sorteadorB(semente);
  const casos: Caso[] = [];
  while (casos.length < quantidade) {
    const v = esc([95, 130, 275, 380, 640, 1150, 2800, 7400]);
    const marcado = r() < 0.55;
    const t = marcado ? esc([`R$ ${milhar(v)}`, `${milhar(v)} reais`, `${porExtenso(v)} reais`]) : esc([String(v), milhar(v), porExtenso(v)]);
    const empresa = esc(['3M Distribuidora', 'Casa 7 Materiais', 'Ferragens Dois Irmãos', 'Madeireira 2 Pinheiros', 'Tintas Sul', 'Depósito do Seu Zé', 'Eletro 24 Horas']);
    const pessoa = esc(['Seu Jorge', 'Dona Maria', 'o mestre Antônio', 'o Ulisses', 'o Adriano', 'o eletricista Paulo']);
    const material = esc(['areia', 'cimento', 'ferro', 'tijolo', 'tinta', 'fio', 'cano', 'piso', 'reboco']);
    const medida = esc(['20 sacos', '3 metros', '12 barras', '2 latas', '40 peças', '5 caixas', '150 m²', '8 mm', '25 kg', '4 horas']);
    const nota = `nota ${1000 + Math.floor(r() * 8000)}`;
    const quando = esc(['', '', 'ontem', 'hoje', 'dia 8', 'segunda', 'há 2 dias']);
    const frase = esc([
      () => `Pagamento ${esc(['ao', 'pro', 'para'])} ${pessoa}: ${t} ${quando}`,
      () => `${empresa}, ${material}, ${medida}, ${t}`,
      () => `${esc(['Comprei', 'Peguei', 'Retirei'])} ${medida} de ${material} na ${empresa} ${quando} e paguei ${t}`,
      () => `${nota} ${empresa} ${t} ${quando}`,
      () => `Fechei com ${pessoa} ${t} pelo serviço de ${material}`,
      () => `${quando} ${pessoa} recebeu ${t}`,
      () => `Adiantamento ${esc(['ao', 'pro'])} ${pessoa}, ${t}, ${esc(['no pix', 'em dinheiro', 'por transferência'])}`,
      () => `${medida} de ${material} saiu ${t}`,
      () => `Recibo ${1000 + Math.floor(r() * 8000)}: ${t} ${pessoa}`,
    ])();
    // número colado no valor ("nota 4521 480") ninguém sabe ler
    const antes = frase.slice(0, frase.indexOf(t)).trim().split(' ').pop() ?? '';
    if (/\d[º]?[:;,.)]*$/.test(antes) && !t.startsWith('R$')) continue;
    casos.push({ frase: frase.replace(/\s+/g, ' ').trim(), esperado: { valor: v * 100 }, tipo: `cegoB-${marcado ? 'marcado' : 'solto'}` });
  }
  return casos;
}
