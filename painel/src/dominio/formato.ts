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

// Aceita "1.234,56", "1234,56", "1234.56", "R$ 1.234", "1234". Devolve centavos ou null.
export function lerReais(texto: string): number | null {
  let t = texto.replace(/R\$|\s/g, '');
  if (!t) return null;
  if (!/^-?[\d.,]+$/.test(t)) return null;
  const virgula = t.lastIndexOf(',');
  const ponto = t.lastIndexOf('.');
  if (virgula >= 0) {
    // vírgula é o decimal; pontos são milhar (e só antes dela)
    if (ponto > virgula || t.indexOf(',') !== virgula) return null;
    t = t.replace(/\./g, '').replace(',', '.');
  } else if (ponto >= 0) {
    // só pontos: decimal se tiver 1 ou 2 dígitos depois do último ponto, senão milhar
    const depois = t.length - ponto - 1;
    t = depois > 0 && depois <= 2 && t.indexOf('.') === ponto ? t : t.replace(/\./g, '');
  }
  if ((t.match(/\./g) ?? []).length > 1) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
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
