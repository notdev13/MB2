// Gerador mínimo de planilha .xlsx (sem biblioteca): pacote ZIP sem compressão com as peças
// que o Excel, o Numbers e o Google Planilhas precisam. Funções puras, com teste.

export type Celula = string | number | null | { data: string } | { dinheiro: number } | { percentual: number };
export interface Aba { nome: string; larguras?: number[]; linhas: Celula[][] }

const te = new TextEncoder();
const esc = (t: string) =>
  t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

const TABELA_CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = TABELA_CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// Letra da coluna: 0 -> A, 26 -> AA.
export function letraColuna(i: number): string {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

// 'AAAA-MM-DD' -> número de série do Excel (dias desde 30/12/1899).
export function serialDaData(d: string): number {
  const [a, m, dia] = d.split('-').map(Number);
  return Math.round((Date.UTC(a, m - 1, dia) - Date.UTC(1899, 11, 30)) / 86400000);
}

const E_TEXTO = 0, E_TITULO = 1, E_DATA = 2, E_DINHEIRO = 3, E_PERCENTUAL = 4;

function celulaXml(v: Celula, ref: string, titulo: boolean): string {
  if (v === null || v === '') return '';
  if (typeof v === 'number') return `<c r="${ref}"><v>${v}</v></c>`;
  if (typeof v === 'string')
    return `<c r="${ref}" t="inlineStr" s="${titulo ? E_TITULO : E_TEXTO}"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  if ('data' in v) return `<c r="${ref}" s="${E_DATA}"><v>${serialDaData(v.data)}</v></c>`;
  if ('dinheiro' in v) return `<c r="${ref}" s="${E_DINHEIRO}"><v>${(v.dinheiro / 100).toFixed(2)}</v></c>`;
  return `<c r="${ref}" s="${E_PERCENTUAL}"><v>${v.percentual}</v></c>`;
}

function abaXml(a: Aba): string {
  const cols = a.larguras?.length
    ? `<cols>${a.larguras.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : '';
  const linhas = a.linhas
    .map((l, r) => `<row r="${r + 1}">${l.map((v, c) => celulaXml(v, letraColuna(c) + (r + 1), r === 0)).join('')}</row>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `${cols}<sheetData>${linhas}</sheetData></worksheet>`;
}

const ESTILOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="&quot;R$&quot; #,##0.00"/></numFmts>` +
  `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
  `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
  `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>` +
  `<xf numFmtId="9" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

interface Peca { nome: string; dados: Uint8Array }

function zip(pecas: Peca[]): Uint8Array<ArrayBuffer> {
  const partes: Uint8Array[] = [], central: Uint8Array[] = [];
  let pos = 0;
  const u16 = (n: number) => [n & 255, (n >> 8) & 255];
  const u32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  for (const p of pecas) {
    const nome = te.encode(p.nome), crc = crc32(p.dados), t = p.dados.length;
    const base = [...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(t), ...u32(t), ...u16(nome.length), ...u16(0)];
    partes.push(Uint8Array.from([0x50, 0x4b, 3, 4, ...base]), nome, p.dados);
    central.push(Uint8Array.from([0x50, 0x4b, 1, 2, ...u16(20), ...base, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(pos)]), nome);
    pos += 30 + nome.length + t;
  }
  const tamCentral = central.reduce((s, b) => s + b.length, 0);
  const fim = Uint8Array.from([0x50, 0x4b, 5, 6, 0, 0, 0, 0, ...u16(pecas.length), ...u16(pecas.length), ...u32(tamCentral), ...u32(pos), 0, 0]);
  const todos = [...partes, ...central, fim];
  const saida = new Uint8Array(todos.reduce((s, b) => s + b.length, 0));
  let o = 0;
  for (const b of todos) { saida.set(b, o); o += b.length; }
  return saida;
}

export function gerarXlsx(abas: Aba[]): Uint8Array<ArrayBuffer> {
  const x = (nome: string, s: string): Peca => ({ nome, dados: te.encode(s) });
  const cab = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  return zip([
    x('[Content_Types].xml', `${cab}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${abas.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`),
    x('_rels/.rels', `${cab}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    x('xl/workbook.xml', `${cab}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${abas.map((a, i) => `<sheet name="${esc(a.nome.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`),
    x('xl/_rels/workbook.xml.rels', `${cab}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${abas.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${abas.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
    x('xl/styles.xml', ESTILOS),
    ...abas.map((a, i) => x(`xl/worksheets/sheet${i + 1}.xml`, abaXml(a))),
  ]);
}
