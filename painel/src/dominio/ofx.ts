import { MAX_SALDO } from './saldos';

// Leitura de extrato OFX (o arquivo que o banco deixa baixar). Função pura: recebe o texto e
// devolve só o que o painel precisa (saldo, data e os 4 últimos dígitos da conta).
// Nada do arquivo além disso é devolvido: nem nome, nem descrição de lançamento, nem CPF/CNPJ,
// nem o número completo da conta. As mensagens de erro também nunca repetem trechos do arquivo.

export const TAMANHO_MAX_OFX = 5 * 1024 * 1024; // 5 MB

export interface ExtratoOfx {
  banco?: string; // nome do banco como o arquivo informa (texto sem < >)
  contaFinal: string; // últimos 4 dígitos
  tipoConta: 'corrente' | 'poupanca' | 'desconhecido';
  moeda: string; // sempre 'BRL' (outras são recusadas)
  saldo: number; // centavos, saldo contábil (LEDGERBAL), pode ser negativo
  data: string; // AAAA-MM-DD da data do saldo (DTASOF, ou DTEND do período)
  dataFim?: string; // fim do período do extrato (DTEND), se válido
}

export type ResultadoOfx = { ok: true; extrato: ExtratoOfx } | { ok: false; erro: string };

const falha = (erro: string): ResultadoOfx => ({ ok: false, erro });

// Valor de uma tag, nas duas formas do OFX: SGML (`<TAG>valor` sem fechar) e XML (`<TAG>valor</TAG>`).
// O valor vai até o próximo "<". Devolve null se a tag não existe.
function valorDa(tag: string, texto: string): string | null {
  const m = new RegExp(`<${tag}>([^<]*)`, 'i').exec(texto);
  return m ? m[1].trim() : null;
}

// Trecho entre <TAG> e </TAG> (agregados sempre fecham, também no SGML). null se não achar.
function blocoDe(tag: string, texto: string): string | null {
  const m = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i').exec(texto);
  return m ? m[1] : null;
}

const contar = (re: RegExp, texto: string) => (texto.match(re) ?? []).length;

// "1234.56", "-50,5", "+10" -> centavos. Só por texto: nunca parseFloat * 100.
function lerValor(bruto: string): number | null {
  const m = /^([+-])?(\d{1,15})(?:[.,](\d{1,2}))?$/.exec(bruto);
  if (!m) return null;
  const inteiros = m[2].replace(/^0+(?=\d)/, '');
  if (inteiros.length > 12) return null;
  const centavos = Number(inteiros) * 100 + Number((m[3] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(centavos) || centavos > MAX_SALDO) return null;
  return m[1] === '-' && centavos !== 0 ? -centavos : centavos;
}

// "20261030120000[-3:BRT]" -> "2026-10-30" (os 8 primeiros dígitos, como escritos). null se não for data real.
function lerData(bruto: string | null): string | null {
  const m = bruto ? /^(\d{4})(\d{2})(\d{2})/.exec(bruto) : null;
  if (!m) return null;
  const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (a < 1990 || mes < 1 || mes > 12 || d < 1) return null;
  const ultimo = new Date(Date.UTC(a, mes, 0)).getUTCDate();
  if (d > ultimo) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

const limparNome = (v: string | null): string | undefined => {
  const t = (v ?? '').replace(/[<>&"'`\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  return t || undefined;
};

export function lerOfx(texto: string): ResultadoOfx {
  try {
    if (typeof texto !== 'string') return falha('Não consegui ler este arquivo.');
    if (texto.length > TAMANHO_MAX_OFX) return falha('O arquivo é muito grande para ser um extrato (o limite é 5 MB).');
    if (texto.trim() === '') return falha('O arquivo está vazio.');

    if (/<CREDITCARDMSGSRSV1|<CCSTMTRS/i.test(texto)) return falha('Extrato de cartão ainda não é aceito.');
    const quantas = contar(/<STMTRS[\s>]/gi, texto);
    if (quantas === 0) return falha('Este arquivo não parece um extrato OFX de conta corrente ou poupança.');
    if (quantas > 1) return falha('O arquivo tem mais de uma conta. Baixe um arquivo por conta.');

    const moeda = (valorDa('CURDEF', texto) ?? '').toUpperCase();
    if (!moeda) return falha('Não encontrei a moeda do extrato.');
    if (moeda !== 'BRL') return falha('Só aceito extrato em reais.');

    const tipoBruto = (valorDa('ACCTTYPE', texto) ?? '').toUpperCase();
    if (tipoBruto && tipoBruto !== 'CHECKING' && tipoBruto !== 'SAVINGS') {
      return falha('Este tipo de conta ainda não é aceito. Só conta corrente e poupança.');
    }
    const tipoConta = tipoBruto === 'CHECKING' ? 'corrente' : tipoBruto === 'SAVINGS' ? 'poupanca' : 'desconhecido';

    const digitos = (valorDa('ACCTID', texto) ?? '').replace(/\D/g, '');
    if (digitos.length < 4) return falha('Não consegui identificar a conta no arquivo.');
    const contaFinal = digitos.slice(-4);

    if (contar(/<LEDGERBAL>/gi, texto) > 1) return falha('O arquivo tem mais de um saldo. Baixe o extrato de uma conta só.');
    const saldoBloco = blocoDe('LEDGERBAL', texto);
    if (saldoBloco === null) return falha('Este extrato não traz o saldo da conta.');
    const saldo = lerValor(valorDa('BALAMT', saldoBloco) ?? '');
    if (saldo === null) return falha('Não consegui entender o valor do saldo do extrato.');

    const dataFim = lerData(valorDa('DTEND', texto)) ?? undefined;
    const data = lerData(valorDa('DTASOF', saldoBloco)) ?? dataFim;
    if (!data) return falha('Não encontrei uma data válida para o saldo do extrato.');

    const extrato: ExtratoOfx = { contaFinal, tipoConta, moeda: 'BRL', saldo, data };
    const banco = limparNome(valorDa('ORG', texto));
    if (banco) extrato.banco = banco;
    if (dataFim) extrato.dataFim = dataFim;
    return { ok: true, extrato };
  } catch {
    return falha('Não consegui ler este arquivo.');
  }
}

// Bytes do arquivo -> texto. O cabeçalho diz o charset (1252 é o comum nos bancos brasileiros).
// Sem cabeçalho claro: tenta UTF-8 estrito e, se houver byte inválido, windows-1252.
export function decodificarOfx(bytes: ArrayBuffer): string {
  try {
    const cabecalho = new TextDecoder('latin1').decode(new Uint8Array(bytes, 0, Math.min(bytes.byteLength, 1024)));
    const diz1252 = /CHARSET:\s*(1252|windows-1252|iso-8859-1|latin1)/i.test(cabecalho) && !/ENCODING:\s*UTF-?8/i.test(cabecalho);
    if (!diz1252) {
      try {
        return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      } catch {
        /* não é UTF-8: cai no windows-1252 */
      }
    }
    return new TextDecoder('windows-1252').decode(bytes);
  } catch {
    return '';
  }
}
