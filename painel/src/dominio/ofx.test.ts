import { describe, expect, it } from 'vitest';
import { MAX_SALDO } from './saldos';
import { decodificarOfx, lerOfx, TAMANHO_MAX_OFX } from './ofx';
import { aleatorio, bytesUtf8, bytesWindows1252, ofxCartao, ofxSgml, ofxVariasContas, ofxXml } from './ofx.fixtures';

const ok = (t: string) => {
  const r = lerOfx(t);
  if (!r.ok) throw new Error('esperava ok, veio: ' + r.erro);
  return r.extrato;
};
const erro = (t: string) => {
  const r = lerOfx(t);
  if (r.ok) throw new Error('esperava erro');
  return r.erro;
};

describe('lerOfx · formas do arquivo', () => {
  it('lê SGML (tags sem fechar): saldo contábil, data, final e banco', () => {
    expect(ok(ofxSgml())).toEqual({
      banco: 'Banco Teste', contaFinal: '0001', tipoConta: 'corrente', moeda: 'BRL',
      saldo: 123_456, data: '2026-10-30', dataFim: '2026-10-30',
    });
  });
  it('lê XML com todas as tags fechadas e o mesmo resultado', () => {
    expect(ok(ofxXml())).toEqual(ok(ofxSgml()));
  });
  it('lê XML com valores em várias linhas', () => {
    const t = ofxXml().replace('<BALAMT>1234.56</BALAMT>', '<BALAMT>\n   1234.56\n  </BALAMT>');
    expect(ok(t).saldo).toBe(123_456);
  });
  it('usa o saldo CONTÁBIL, não o disponível', () => {
    expect(ok(ofxSgml({ saldo: '10.00', disponivel: '777.00' })).saldo).toBe(1000);
  });
  it('poupança', () => expect(ok(ofxSgml({ tipo: 'SAVINGS' })).tipoConta).toBe('poupanca'));
  it('guarda só os 4 últimos dígitos da conta, ignorando traço', () => {
    expect(ok(ofxSgml({ conta: '12345-6' })).contaFinal).toBe('3456');
  });
  it('tags em minúsculas também valem', () => {
    expect(ok(ofxSgml().replace(/<(\/?)(LEDGERBAL|BALAMT|DTASOF)>/g, (_m, b, t) => `<${b}${t.toLowerCase()}>`)).saldo).toBe(123_456);
  });
});

describe('lerOfx · valor do saldo (texto, sem float)', () => {
  const saldo = (v: string) => ok(ofxSgml({ saldo: v })).saldo;
  it('ponto, vírgula, sinais e inteiros', () => {
    expect(saldo('1234.56')).toBe(123_456);
    expect(saldo('1234,56')).toBe(123_456);
    expect(saldo('-1234.56')).toBe(-123_456);
    expect(saldo('+10')).toBe(1000);
    expect(saldo('-50,5')).toBe(-5050);
    expect(saldo('0.07')).toBe(7);
    expect(saldo('100')).toBe(10_000);
    expect(saldo('19.99')).toBe(1999); // 19.99*100 em float dá 1998.9999999999998
    expect(saldo('0.29')).toBe(29);
  });
  it('zero negativo vira 0 (nunca -0)', () => expect(Object.is(saldo('-0.00'), 0)).toBe(true));
  it('aceita o limite e rejeita acima dele', () => {
    expect(saldo('999999999.99')).toBe(MAX_SALDO);
    expect(erro(ofxSgml({ saldo: '1000000000.00' }))).toMatch(/saldo/i);
    expect(erro(ofxSgml({ saldo: '99999999999999999999.00' }))).toMatch(/saldo/i);
  });
  it.each(['1e5', 'NaN', '', '   ', '1.234', '1,234', '12.3456', '1.234,56', '1,234.56', '--1', '1 000', 'Infinity', '0x10', '.5', '5.', 'abc', '١٢٣', '１２３'])(
    'rejeita %j', (v) => expect(erro(ofxSgml({ saldo: v }))).toMatch(/saldo/i));
});

describe('lerOfx · data do saldo', () => {
  it('DTASOF com fuso [-3:BRT] vale pelos 8 primeiros dígitos, como escritos', () => {
    expect(ok(ofxSgml({ dtasof: '20261030235959[-3:BRT]' })).data).toBe('2026-10-30');
    expect(ok(ofxSgml({ dtasof: '20261030' })).data).toBe('2026-10-30');
  });
  it('DTASOF com fuso é convertido para a data local do Brasil (UTC-3)', () => {
    expect(ok(ofxSgml({ dtasof: '20261031010000[0:GMT]' })).data).toBe('2026-10-30');
    expect(ok(ofxSgml({ dtasof: '20261031030000[0:GMT]' })).data).toBe('2026-10-31'); // 03:00 GMT = 00:00 BRT
    expect(ok(ofxSgml({ dtasof: '20261031025959[0:GMT]' })).data).toBe('2026-10-30');
    expect(ok(ofxSgml({ dtasof: '20261031010000[+5:XXX]' })).data).toBe('2026-10-30'); // 20:00 GMT do dia 30 = 17:00 BRT
    expect(ok(ofxSgml({ dtasof: '20261031230000[-3:BRT]' })).data).toBe('2026-10-31');
    expect(ok(ofxSgml({ dtasof: '20261101010000[-5:EST]' })).data).toBe('2026-11-01'); // 06:00 GMT = 03:00 BRT
    expect(ok(ofxSgml({ dtasof: '20260101010000[0:GMT]' })).data).toBe('2025-12-31'); // vira o ano
  });
  it('DTASOF sem fuso, ou sem hora, vale como escrito', () => {
    expect(ok(ofxSgml({ dtasof: '20261031010000' })).data).toBe('2026-10-31');
    expect(ok(ofxSgml({ dtasof: '20261031[0:GMT]' })).data).toBe('2026-10-31');
  });
  it('sem DTASOF usa o DTEND do período', () => {
    expect(ok(ofxSgml({ dtasof: null, dtend: '20261028' })).data).toBe('2026-10-28');
  });
  it('DTASOF inválido cai no DTEND; sem nenhuma data válida é ERRO (não chuta)', () => {
    expect(ok(ofxSgml({ dtasof: '20261340', dtend: '20261028' })).data).toBe('2026-10-28');
    expect(erro(ofxSgml({ dtasof: null, dtend: null }))).toMatch(/data/i);
    expect(erro(ofxSgml({ dtasof: '2026', dtend: '20260230' }))).toMatch(/data/i);
    expect(erro(ofxSgml({ dtasof: 'ontem', dtend: null }))).toMatch(/data/i);
  });
  it('rejeita dias que não existem (30 de fevereiro) e bissexto vale', () => {
    expect(erro(ofxSgml({ dtasof: '20260230', dtend: null }))).toMatch(/data/i);
    expect(ok(ofxSgml({ dtasof: '20280229' })).data).toBe('2028-02-29');
    expect(erro(ofxSgml({ dtasof: '20270229', dtend: null }))).toMatch(/data/i);
  });
});

describe('lerOfx · arquivos que não aceitamos', () => {
  it('moeda diferente de real', () => expect(erro(ofxSgml({ moeda: 'USD' }))).toMatch(/reais/i));
  it('sem moeda informada', () => expect(erro(ofxSgml({ moeda: null }))).toMatch(/moeda/i));
  it('cartão de crédito', () => expect(erro(ofxCartao())).toBe('Extrato de cartão ainda não é aceito.'));
  it('mais de uma conta no arquivo', () => expect(erro(ofxVariasContas())).toMatch(/um arquivo por conta/i));
  it('sem saldo (LEDGERBAL)', () => expect(erro(ofxSgml({ semLedger: true }))).toMatch(/saldo/i));
  it('tipo de conta que não é corrente nem poupança', () => expect(erro(ofxSgml({ tipo: 'CREDITLINE' }))).toMatch(/tipo de conta/i));
  it('sem número de conta', () => expect(erro(ofxSgml({ conta: 'ab' }))).toMatch(/conta/i));
  it('arquivo vazio, só espaços e texto qualquer', () => {
    expect(erro('')).toMatch(/vazio/i);
    expect(erro('  \n ')).toMatch(/vazio/i);
    expect(erro('olá, isto é uma carta')).toMatch(/OFX/);
  });
  it('lixo binário', () => {
    const lixo = Array.from({ length: 3000 }, (_, i) => String.fromCharCode((i * 7919) % 256)).join('');
    expect(erro(lixo)).toMatch(/OFX/);
  });
  it('mais de 5 MB (6 MB)', () => {
    const grande = ofxSgml() + ' '.repeat(6 * 1024 * 1024);
    expect(grande.length).toBeGreaterThan(TAMANHO_MAX_OFX);
    expect(erro(grande)).toMatch(/grande/i);
  });
  it('entrada que não é texto não lança', () => {
    expect(lerOfx(undefined as never).ok).toBe(false);
    expect(lerOfx(null as never).ok).toBe(false);
    expect(lerOfx(42 as never).ok).toBe(false);
    expect(lerOfx({} as never).ok).toBe(false);
  });
});

describe('lerOfx · privacidade', () => {
  const tudo = [
    ofxSgml(), ofxXml(), ofxCartao(), ofxVariasContas(), ofxSgml({ moeda: 'USD' }), ofxSgml({ saldo: '1e5' }),
    ofxSgml({ semLedger: true }), ofxSgml({ dtasof: null, dtend: null }), ofxSgml({ tipo: 'CREDITLINE' }),
  ];
  it('nenhum resultado traz número de conta completo, nome, memo, CPF ou CNPJ', () => {
    for (const t of tudo) {
      const s = JSON.stringify(lerOfx(t));
      for (const proibido of ['0000000001', '0000000002', '0000000009', 'LOJA TESTE', 'Compra teste', '11111111000191', '00000000000']) {
        expect(s).not.toContain(proibido);
      }
    }
  });
  it('o nome do banco com HTML vira texto inofensivo (sem < >)', () => {
    const r = ok(ofxSgml({ org: 'Banco <img src=x onerror=alert(1)> Teste' }));
    expect(r.banco ?? '').not.toMatch(/[<>]/);
  });
});

describe('lerOfx · propriedades (várias sementes)', () => {
  const base = ofxSgml();
  const seguro = (r: ReturnType<typeof lerOfx>) => {
    if (r.ok) {
      expect(Number.isSafeInteger(r.extrato.saldo)).toBe(true);
      expect(Math.abs(r.extrato.saldo)).toBeLessThanOrEqual(MAX_SALDO);
      expect(r.extrato.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.extrato.contaFinal).toMatch(/^\d{4}$/);
    } else expect(typeof r.erro).toBe('string');
  };
  it('lixo aleatório e arquivos estragados nunca lançam nem dão centavos quebrados', () => {
    for (let semente = 1; semente <= 400; semente++) {
      const rnd = aleatorio(semente);
      let t = base;
      const golpes = 1 + Math.floor(rnd() * 6);
      for (let g = 0; g < golpes; g++) {
        const i = Math.floor(rnd() * t.length);
        const modo = Math.floor(rnd() * 4);
        if (modo === 0) t = t.slice(0, i) + t.slice(i + Math.floor(rnd() * 30));
        else if (modo === 1) t = t.slice(0, i) + String.fromCharCode(Math.floor(rnd() * 65536)) + t.slice(i);
        else if (modo === 2) t = t.slice(0, i);
        else t = t.slice(0, i) + ['<', '>', 'e', '-', '.', ',', '9', '</LEDGERBAL>', '<BALAMT>'][Math.floor(rnd() * 9)] + t.slice(i);
      }
      seguro(lerOfx(t));
      const lixo = Array.from({ length: Math.floor(rnd() * 400) }, () => String.fromCharCode(Math.floor(rnd() * 256))).join('');
      seguro(lerOfx(lixo));
    }
  });
  it('valores do saldo aleatórios: ou erro, ou exatamente o número escrito', () => {
    for (let semente = 1; semente <= 400; semente++) {
      const rnd = aleatorio(semente * 31);
      const inteiros = String(Math.floor(rnd() * 10 ** (1 + Math.floor(rnd() * 11))));
      const dec = Math.floor(rnd() * 100);
      const sep = rnd() < 0.5 ? '.' : ',';
      const sinal = ['', '-', '+'][Math.floor(rnd() * 3)];
      const centavos2 = String(dec).padStart(2, '0');
      const r = lerOfx(ofxSgml({ saldo: `${sinal}${inteiros}${sep}${centavos2}` }));
      seguro(r);
      const esperado = Number(BigInt(inteiros) * 100n + BigInt(centavos2)) * (sinal === '-' ? -1 : 1);
      if (Math.abs(esperado) <= MAX_SALDO) {
        expect(r.ok && r.extrato.saldo === esperado).toBe(true);
      } else expect(r.ok).toBe(false);
    }
  });
});

describe('decodificarOfx', () => {
  const comAcento = ofxSgml({ org: 'Banco Teste Ação São João' });
  it('windows-1252 (cabeçalho CHARSET:1252) mantém os acentos', () => {
    const t = decodificarOfx(bytesWindows1252(comAcento));
    expect(t).toContain('Banco Teste Ação São João');
    expect(ok(t).banco).toBe('Banco Teste Ação São João');
  });
  it('windows-1252 sem cabeçalho de charset: cai no windows-1252 porque o UTF-8 estrito falha', () => {
    const t = decodificarOfx(bytesWindows1252(comAcento.replace('CHARSET:1252', 'CHARSET:NONE')));
    expect(t).toContain('Ação São João');
  });
  it('UTF-8 mantém os acentos', () => {
    const t = decodificarOfx(bytesUtf8(ofxXml({ org: 'Banco Teste Ação São João' })));
    expect(ok(t).banco).toBe('Banco Teste Ação São João');
  });
  it('UTF-8 com BOM', () => {
    const b = new TextEncoder().encode('﻿' + ofxXml());
    expect(ok(decodificarOfx(b.buffer as ArrayBuffer)).saldo).toBe(123_456);
  });
  it('não lança com bytes aleatórios nem com buffer vazio', () => {
    const u = new Uint8Array(500).map((_, i) => (i * 37) % 256);
    expect(typeof decodificarOfx(u.buffer)).toBe('string');
    expect(decodificarOfx(new ArrayBuffer(0))).toBe('');
  });
});
