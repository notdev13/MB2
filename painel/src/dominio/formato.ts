// Formatação e leitura de valores no padrão brasileiro.

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brlCurto = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export const reais = (centavos: number) => brl.format(centavos / 100);

// "R$ 1,2 mi" para os números grandes dos cartões de resumo.
export const reaisCurto = (centavos: number) =>
  Math.abs(centavos) < 1_000_000 ? reais(centavos) : brlCurto.format(centavos / 100);

// Cartões da página da obra no computador: valor inteiro abaixo de 1 milhão ("R$ 513.423,98"),
// abreviado a partir dele ("R$ 1,3 mi").
export const reaisCartao = (centavos: number) =>
  Math.abs(centavos) < 100_000_000 ? reais(centavos) : brlCurto.format(centavos / 100);

// Aceita "1.234,56", "1234,56", "1234.56", "R$ 1.234", "1234". Devolve centavos ou null.
// Recusa o que é ambíguo ou parece erro de digitação ("1.234.5", "12,345", ".").
const INTEIRO = String.raw`(\d+|\d{1,3}(?:\.\d{3})+)`;
const COM_VIRGULA = new RegExp(`^${INTEIRO},(\\d{1,2})$`);
const SO_INTEIRO = new RegExp(`^${INTEIRO}$`);
const PONTO_DECIMAL = /^(\d+)\.(\d{1,2})$/;

export function lerReais(texto: string): number | null {
  const t = texto.replace(/R\$|\s/g, '');
  let inteiro: string;
  let decimais = '';
  let m: RegExpMatchArray | null;
  if ((m = t.match(COM_VIRGULA))) [, inteiro, decimais] = m;
  else if ((m = t.match(PONTO_DECIMAL))) [, inteiro, decimais] = m;
  else if ((m = t.match(SO_INTEIRO))) [, inteiro] = m;
  else return null;
  return Number(inteiro.replace(/\./g, '')) * 100 + Number(decimais.padEnd(2, '0'));
}

// Número com vírgula decimal (área em m²): "1.200" = mil e duzentos, "85,5" = 85,5.
export function lerNumero(texto: string): number | null {
  const centavos = lerReais(texto);
  return centavos === null ? null : centavos / 100;
}

// Centavos -> texto para o campo de edição ("1.234,56").
export const reaisParaCampo = (centavos: number) =>
  (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function dataBR(iso: string | null): string {
  if (!iso) return '—';
  const [a, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export function mesAno(chave: string): string {
  const [a, m] = chave.split('-');
  return `${MESES[Number(m) - 1]}/${a.slice(2)}`;
}

export function hoje(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const porcentagem = (parte: number, total: number) =>
  total > 0 ? Math.round((parte / total) * 100) : 0;

// Momento (ISO) em hora local: "hoje às 14:05" ou "27/10 às 09:30".
export function quando(iso: string, agora: Date = new Date()): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  const hora = `${p(d.getHours())}:${p(d.getMinutes())}`;
  const mesmoDia = d.getFullYear() === agora.getFullYear() && d.getMonth() === agora.getMonth() && d.getDate() === agora.getDate();
  return mesmoDia ? `hoje às ${hora}` : `${p(d.getDate())}/${p(d.getMonth() + 1)} às ${hora}`;
}
