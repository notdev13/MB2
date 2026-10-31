import { describe, expect, it } from 'vitest';
import { abasDeExportacao } from './exportacao';
import { crc32, gerarXlsx, letraColuna, serialDaData } from './xlsx';
import type { Custo, Obra } from './tipos';

const obra: Obra = { id: 'o1', nome: 'Lote 39', endereco: '', cliente: '', orcamento: 100000, areaM2: null, inicio: null,
  previsaoFim: null, status: 'em_andamento', observacoes: '', criadoEm: '', atualizadoEm: '' };
const custo = (id: string, valor: number, pago: boolean, data = '2026-10-05'): Custo => ({ id, obraId: 'o1', data, categoria: 'Materiais (M)',
  descricao: 'Cimento & areia <50kg>', fornecedor: 'Ferro "Sul"', valor, pagamento: 'pix', pago, criadoEm: '', atualizadoEm: '' });

// Lê as entradas do ZIP gerado (sem compressão) e confere o CRC de cada uma.
function entradas(z: Uint8Array): Map<string, string> {
  const v = new DataView(z.buffer, z.byteOffset), mapa = new Map<string, string>();
  let p = 0;
  while (v.getUint32(p, true) === 0x04034b50) {
    const crc = v.getUint32(p + 14, true), t = v.getUint32(p + 18, true), n = v.getUint16(p + 26, true);
    const nome = new TextDecoder().decode(z.slice(p + 30, p + 30 + n)), dados = z.slice(p + 30 + n, p + 30 + n + t);
    expect(crc32(dados)).toBe(crc);
    mapa.set(nome, new TextDecoder().decode(dados));
    p += 30 + n + t;
  }
  expect(v.getUint32(z.length - 22, true)).toBe(0x06054b50);
  return mapa;
}

describe('xlsx', () => {
  it('crc32 de referência', () => expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926));
  it('letras de coluna e datas', () => {
    expect([letraColuna(0), letraColuna(25), letraColuna(26), letraColuna(27)]).toEqual(['A', 'Z', 'AA', 'AB']);
    expect(serialDaData('1900-01-01')).toBe(2);
    expect(serialDaData('2026-10-05')).toBe(46300);
  });
  it('monta o pacote com as peças e escapa o texto', () => {
    const e = entradas(gerarXlsx(abasDeExportacao([custo('a', 12345, true)], [obra])));
    expect([...e.keys()]).toEqual(expect.arrayContaining(['[Content_Types].xml', 'xl/workbook.xml', 'xl/styles.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet3.xml']));
    const s1 = e.get('xl/worksheets/sheet1.xml')!;
    expect(s1).toContain('Cimento &amp; areia &lt;50kg&gt;');
    expect(s1).toContain('Ferro &quot;Sul&quot;');
    expect(s1).toContain('<v>123.45</v>');
    expect(s1).toContain('<v>46300</v>');
  });
  it('resumo por obra soma gasto, a pagar e uso do orçamento', () => {
    const [, resumo] = abasDeExportacao([custo('a', 30000, true), custo('b', 20000, false)], [obra]);
    expect(resumo.linhas[1]).toEqual(['Lote 39', 'Em andamento', { dinheiro: 100000 }, { dinheiro: 50000 }, { dinheiro: 20000 }, { dinheiro: 50000 }, { percentual: 0.5 }, 2]);
    expect(resumo.linhas[2][3]).toEqual({ dinheiro: 50000 });
  });
  it('sem lançamentos gera só o cabeçalho', () => {
    const [l] = abasDeExportacao([], [obra]);
    expect(l.linhas).toHaveLength(1);
  });
});
