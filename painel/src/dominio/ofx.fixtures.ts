// Arquivos OFX SINTÉTICOS para teste. Tudo inventado: "Banco Teste", contas 0000000001 etc.
// Nunca cole aqui um extrato real.

export interface OpcoesOfx {
  conta?: string; saldo?: string; dtasof?: string | null; dtend?: string | null; moeda?: string | null;
  tipo?: string | null; org?: string; semLedger?: boolean; disponivel?: string;
}

const CAB_SGML = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

`;

function miolo(o: OpcoesOfx, xml: boolean): string {
  const f = (t: string, v: string) => (xml ? `<${t}>${v}</${t}>` : `<${t}>${v}`);
  const conta = o.conta ?? '0000000001';
  const moeda = o.moeda === null ? '' : f('CURDEF', o.moeda ?? 'BRL');
  const tipo = o.tipo === null ? '' : f('ACCTTYPE', o.tipo ?? 'CHECKING');
  const dtend = o.dtend === null ? '' : f('DTEND', o.dtend ?? '20261030');
  const asof = o.dtasof === null ? '' : f('DTASOF', o.dtasof ?? '20261030120000[-3:BRT]');
  const ledger = o.semLedger ? '' : `<LEDGERBAL>${f('BALAMT', o.saldo ?? '1234.56')}${asof}</LEDGERBAL>`;
  return `<STMTRS>${moeda}
<BANKACCTFROM>${f('BANKID', '999')}${f('ACCTID', conta)}${tipo}</BANKACCTFROM>
<BANKTRANLIST>${f('DTSTART', '20261001')}${dtend}
<STMTTRN>${f('TRNTYPE', 'DEBIT')}${f('DTPOSTED', '20261015')}${f('TRNAMT', '-10.00')}${f('FITID', '1')}${f('NAME', 'LOJA TESTE 11111111000191')}${f('MEMO', 'Compra teste CPF 00000000000')}</STMTTRN>
</BANKTRANLIST>
${ledger}
<AVAILBAL>${f('BALAMT', o.disponivel ?? '999.99')}${f('DTASOF', '20261030120000[-3:BRT]')}</AVAILBAL>
</STMTRS>`;
}

const STATUS = (xml: boolean) => (xml ? '<CODE>0</CODE><SEVERITY>INFO</SEVERITY>' : '<CODE>0<SEVERITY>INFO');
const ENVELOPE = (org: string, corpo: string, xml: boolean) => {
  const f = (t: string, v: string) => (xml ? `<${t}>${v}</${t}>` : `<${t}>${v}`);
  return `<OFX>
<SIGNONMSGSRSV1><SONRS><STATUS>${STATUS(xml)}</STATUS>${f('DTSERVER', '20261030120000[-3:BRT]')}${f('LANGUAGE', 'POR')}<FI>${f('ORG', org)}${f('FID', '999')}</FI></SONRS></SIGNONMSGSRSV1>
<BANKMSGSRSV1><STMTTRNRS>${f('TRNUID', '1')}<STATUS>${STATUS(xml)}</STATUS>
${corpo}
</STMTTRNRS></BANKMSGSRSV1>
</OFX>
`;
};

// SGML: tags sem fechamento nos valores (o formato mais comum no Brasil).
export const ofxSgml = (o: OpcoesOfx = {}) => CAB_SGML + ENVELOPE(o.org ?? 'Banco Teste', miolo(o, false), false);

// XML: todas as tags fechadas, com cabeçalho <?xml ?>.
export const ofxXml = (o: OpcoesOfx = {}) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<?OFX OFXHEADER="200" VERSION="211" SECURITY="NONE" OLDFILEUID="NONE" NEWFILEUID="NONE"?>\n` +
  ENVELOPE(o.org ?? 'Banco Teste', miolo(o, true), true);

// Dois extratos (duas contas) no mesmo arquivo.
export const ofxVariasContas = () => {
  const a = ofxSgml({ conta: '0000000001' });
  const b = miolo({ conta: '0000000002' }, false);
  return a.replace('</STMTTRNRS>', `</STMTTRNRS><STMTTRNRS><TRNUID>2<STATUS><CODE>0<SEVERITY>INFO</STATUS>${b}</STMTTRNRS>`);
};

// Cartão de crédito: outra estrutura (CREDITCARDMSGSRSV1 / CCSTMTRS).
export const ofxCartao = () => `${CAB_SGML}<OFX><CREDITCARDMSGSRSV1><CCSTMTTRNRS><TRNUID>1<STATUS><CODE>0<SEVERITY>INFO</STATUS>
<CCSTMTRS><CURDEF>BRL<CCACCTFROM><ACCTID>0000000009</CCACCTFROM>
<BANKTRANLIST><DTSTART>20261001<DTEND>20261030</BANKTRANLIST>
<LEDGERBAL><BALAMT>-500.00<DTASOF>20261030</LEDGERBAL></CCSTMTRS></CCSTMTTRNRS></CREDITCARDMSGSRSV1></OFX>`;

// Bytes em windows-1252 (acentos como um byte só), como os bancos antigos geram.
export function bytesWindows1252(texto: string): ArrayBuffer {
  const mapa: Record<string, number> = {
    'ç': 0xe7, 'ã': 0xe3, 'õ': 0xf5, 'é': 0xe9, 'á': 0xe1, 'í': 0xed, 'ó': 0xf3, 'ú': 0xfa, 'ê': 0xea, 'Ç': 0xc7, 'Ã': 0xc3,
  };
  const u = new Uint8Array(texto.length);
  for (let i = 0; i < texto.length; i++) u[i] = mapa[texto[i]] ?? (texto.charCodeAt(i) & 0xff);
  return u.buffer;
}

export const bytesUtf8 = (texto: string): ArrayBuffer => new TextEncoder().encode(texto).buffer as ArrayBuffer;

// Gerador pseudoaleatório com semente (mulberry32): os testes de propriedade são repetíveis.
export function aleatorio(semente: number): () => number {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
