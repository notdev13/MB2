import { aleatorio, milhar, porExtenso, type Caso } from './voz.corpus';

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
    const k = esc([1, 2, 3, 4, 5, 6, 8, 12, 25]);
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
    'ajuste do orçamento', 'cálculo de carga', 'corretagem do terreno', 'altura do muro', 'desconto na compra de tinta'];
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
      'Ferragens 3 Marias', 'Loja do Zé', 'Tintas Colorado', 'Ulisses', 'Adriano', 'Cassol']);
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
