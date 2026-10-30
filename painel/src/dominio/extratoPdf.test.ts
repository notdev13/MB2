import { describe, expect, it } from 'vitest';
import {
  agruparEmLinhas, candidatoPreSelecionado, candidatosDoTexto, datasParaEscolher, mascarar, MAX_CANDIDATOS,
  PONTUACAO_MIN_PRESELECAO, type CandidatoSaldo,
} from './extratoPdf';
import { avaliarImportacaoPdf } from './importacao';
import { aleatorio } from './ofx.fixtures';
import { MAX_SALDO } from './saldos';
import type { Conta, SaldoConta } from './tipos';

const saldos = (...linhas: string[]) => candidatosDoTexto(linhas).saldos;
const um = (linha: string) => {
  const s = saldos(linha);
  expect(s.length, linha).toBeGreaterThan(0);
  return s[0];
};

describe('candidatosDoTexto · valores e sinal', () => {
  it('"Saldo em 30/10/2026 R$ 1.234,56": valor, data e sinal certo', () => {
    const c = um('Saldo em 30/10/2026 R$ 1.234,56');
    expect(c).toMatchObject({ valor: 123_456, data: '2026-10-30', sinalIncerto: false, anterior: false });
    expect(c.pontuacao).toBeGreaterThanOrEqual(PONTUACAO_MIN_PRESELECAO);
  });
  it('"SALDO FINAL 1.234,56 C" é positivo', () => {
    expect(um('SALDO FINAL 1.234,56 C')).toMatchObject({ valor: 123_456, sinalIncerto: false });
  });
  it('"Saldo do dia 30/10 -2.500,00" é negativo', () => {
    expect(um('Saldo do dia 30/10 -2.500,00')).toMatchObject({ valor: -250_000, sinalIncerto: false });
  });
  it('sufixo D, parênteses, menos no fim e menos antes do R$ são negativos', () => {
    expect(um('Saldo final 1.234,56 D').valor).toBe(-123_456);
    expect(um('Saldo final 1.234,56D').valor).toBe(-123_456);
    expect(um('Saldo final (1.234,56)').valor).toBe(-123_456);
    expect(um('Saldo atual 1.234,56-').valor).toBe(-123_456);
    expect(um('Saldo atual -R$ 1.234,56').valor).toBe(-123_456);
    expect(um('Saldo atual R$ -1.234,56').valor).toBe(-123_456);
  });
  it('sem marca é positivo; sem ponto de milhar também lê', () => {
    expect(um('Saldo atual 1234,56').valor).toBe(123_456);
    expect(um('Saldo atual 0,07').valor).toBe(7);
    expect(um('Saldo atual R$ 19,99').valor).toBe(1999); // float daria 1998.99999
  });
  it('sinal ambíguo (marcas que se contradizem ou "devedor" sem marca) vira sinalIncerto', () => {
    expect(um('Saldo final -1.234,56 C').sinalIncerto).toBe(true);
    expect(um('Saldo final (1.234,56) C').sinalIncerto).toBe(true);
    expect(um('Saldo devedor 1.234,56').sinalIncerto).toBe(true);
    expect(um('Saldo credor e devedor 1.234,56').sinalIncerto).toBe(true);
    expect(um('Saldo final 1.234,56 D').sinalIncerto).toBe(false);
  });
  it('só lê valor em linha com "saldo"; compra e pix não viram candidato', () => {
    expect(saldos('Compra no mercado 1.234,56 D', 'Pix recebido 100,00 C', 'Total de entradas 5.000,00')).toEqual([]);
  });
  it('só pega o primeiro valor depois de "saldo", não o limite ao lado', () => {
    const s = saldos('Saldo disponível 1.000,00 Limite 5.000,00');
    expect(s.map((c) => c.valor)).toEqual([100_000]);
  });
  it('rótulo numa linha e valor na linha de baixo', () => {
    const s = saldos('Saldo final', '1.234,56 C');
    expect(s.map((c) => c.valor)).toEqual([123_456]);
  });
  it('rejeita casas decimais erradas, valores absurdos e lixo', () => {
    expect(saldos('Saldo final 1.234,567')).toEqual([]);
    expect(saldos('Saldo final 1.234,5')).toEqual([]);
    expect(saldos('Saldo final 1e5')).toEqual([]);
    expect(saldos('Saldo final 1.234.56')).toEqual([]);
    expect(saldos('Saldo final 9.999.999.999,99')).toEqual([]);
    expect(saldos('Saldo final 99.999.999.999.999.999,99')).toEqual([]);
    expect(saldos('Saldo final 999.999.999,99')[0].valor).toBe(MAX_SALDO);
  });
});

describe('candidatosDoTexto · saldo anterior x final e vários saldos', () => {
  it('saldo anterior fica marcado, com pontuação baixa, abaixo do saldo final', () => {
    const s = saldos('Saldo anterior 100,00 C', 'Saldo final 200,00 C');
    expect(s[0]).toMatchObject({ valor: 20_000, anterior: false });
    const ant = s.find((c) => c.anterior)!;
    expect(ant.valor).toBe(10_000);
    expect(ant.pontuacao).toBeLessThan(PONTUACAO_MIN_PRESELECAO);
    expect(ant.pontuacao).toBeLessThan(s[0].pontuacao);
  });
  it('anterior e final na mesma linha viram dois candidatos', () => {
    const s = saldos('Saldo anterior 100,00 Saldo final 200,00');
    expect(s.map((c) => [c.valor, c.anterior]).sort()).toEqual([[10_000, true], [20_000, false]]);
  });
  it('coluna com vários saldos diários: todos aparecem e nenhum é escolhido sozinho', () => {
    const s = saldos('Saldo do dia 28/10/2026 100,00', 'Saldo do dia 29/10/2026 200,00', 'Saldo do dia 30/10/2026 300,00');
    expect(s).toHaveLength(3);
    expect(candidatoPreSelecionado(s)).toBeNull();
  });
  it('mesmo valor repetido não duplica o candidato', () => {
    expect(saldos('Saldo do dia 29/10/2026 100,00', 'Saldo do dia 30/10/2026 100,00')).toHaveLength(1);
  });
  it('limita a quantidade de candidatos', () => {
    const muitas = Array.from({ length: 80 }, (_, i) => `Saldo do dia ${i + 1},00`).map((_, i) => `Saldo do dia ${1000 + i},00`);
    expect(saldos(...muitas).length).toBeLessThanOrEqual(MAX_CANDIDATOS);
  });
});

describe('candidatoPreSelecionado', () => {
  const c = (o: Partial<CandidatoSaldo>): CandidatoSaldo => ({ valor: 100, trecho: 't', pontuacao: 90, anterior: false, sinalIncerto: false, ...o });
  it('escolhe o primeiro quando é de pontuação alta, sinal certo e sem empate', () => {
    expect(candidatoPreSelecionado([c({ valor: 1 }), c({ valor: 2, pontuacao: 60 })])?.valor).toBe(1);
  });
  it('NUNCA pré-seleciona pontuação baixa', () => {
    expect(candidatoPreSelecionado([c({ pontuacao: PONTUACAO_MIN_PRESELECAO - 1 })])).toBeNull();
    expect(candidatoPreSelecionado([c({ pontuacao: 10 })])).toBeNull();
  });
  it('NUNCA pré-seleciona sinal incerto nem saldo anterior', () => {
    expect(candidatoPreSelecionado([c({ sinalIncerto: true })])).toBeNull();
    expect(candidatoPreSelecionado([c({ anterior: true })])).toBeNull();
  });
  it('empate com outro valor de mesma pontuação: ninguém é escolhido', () => {
    expect(candidatoPreSelecionado([c({ valor: 1 }), c({ valor: 2 })])).toBeNull();
  });
  it('lista vazia', () => expect(candidatoPreSelecionado([])).toBeNull());
});

describe('candidatosDoTexto · datas e período', () => {
  const datas = (...l: string[]) => candidatosDoTexto(l).datas.map((d) => d.data).sort();
  it('lê dd/mm/aaaa e dd/mm/aa (ano de 2 dígitos vira 20aa)', () => {
    expect(datas('Emitido em 30/10/2026', 'Lançamento 05/03/26')).toEqual(['2026-03-05', '2026-10-30']);
    expect(datas('dia 5/3/2026')).toEqual(['2026-03-05']);
  });
  it('descarta datas que não existem (31/02, 30/02, 29/02 fora de bissexto, mês 13, dia 0)', () => {
    expect(datas('31/02/2026 30/02/2026 29/02/2027 15/13/2026 00/10/2026 99/99/9999 32/01/2026')).toEqual([]);
    expect(datas('29/02/2028')).toEqual(['2028-02-29']);
  });
  it('não confunde número comprido ou valor em dinheiro com data', () => {
    expect(datas('Documento 1230102026 saldo 1.234,56', 'Agência 12/345/6789')).toEqual([]);
  });
  it('período "de dd/mm/aaaa a dd/mm/aaaa" dá o periodoFim', () => {
    expect(candidatosDoTexto(['Extrato de 01/10/2026 a 30/10/2026']).periodoFim).toBe('2026-10-30');
    expect(candidatosDoTexto(['Período: 01/10/2026 a 31/10/2026']).periodoFim).toBe('2026-10-31');
    expect(candidatosDoTexto(['PERÍODO 01/10/2026 ATÉ 29/10/2026']).periodoFim).toBe('2026-10-29');
  });
  it('período inválido (fim antes do começo ou data que não existe) é ignorado', () => {
    expect(candidatosDoTexto(['de 30/10/2026 a 01/10/2026']).periodoFim).toBeUndefined();
    expect(candidatosDoTexto(['de 01/10/2026 a 31/02/2026']).periodoFim).toBeUndefined();
  });
  it('datas na linha do saldo têm pontuação maior que datas soltas', () => {
    const r = candidatosDoTexto(['Emitido em 01/10/2026', 'Saldo em 30/10/2026 100,00']);
    expect(r.datas[0].data).toBe('2026-10-30');
  });
  it('datasParaEscolher põe no topo a data da linha do saldo escolhido', () => {
    const r = candidatosDoTexto(['Emitido em 31/10/2026', 'Saldo do dia 28/10/2026 100,00', 'Saldo do dia 29/10/2026 200,00']);
    const escolhido = r.saldos.find((s) => s.valor === 10_000)!;
    expect(datasParaEscolher(r, escolhido)[0].data).toBe('2026-10-28');
    expect(datasParaEscolher(r, null)).toEqual(r.datas);
  });
});

describe('máscara de dígitos no trecho', () => {
  it('mascara sequências de 6+ dígitos, CPF, CNPJ e conta com dígito', () => {
    const t = mascarar('Conta 123456789 CPF 123.456.789-09 CNPJ 11.222.333/0001-81 ag 1234-5 cc 12345-6 final 4321');
    expect(t).not.toMatch(/\d{6,}/);
    expect(t).not.toContain('123.456.789-09');
    expect(t).not.toContain('11.222.333/0001-81');
    expect(t).not.toContain('12345-6');
    expect(t).toContain('••••');
    expect(t).toContain('final 4321');
  });
  it('o trecho do candidato sai mascarado', () => {
    const c = um('Titular 12345678909 saldo final 1.234,56 C CC 0000012345');
    expect(c.trecho).not.toMatch(/\d{6,}/);
    expect(c.trecho).toContain('1.234,56');
  });
  it('trecho com HTML não é tratado como HTML (fica como texto, sem < >)', () => {
    expect(um('Saldo final 1,00 <img src=x onerror=alert(1)>').trecho).not.toMatch(/[<>]/);
  });
});

describe('agruparEmLinhas', () => {
  it('junta itens da mesma altura na ordem da esquerda para a direita, de cima para baixo', () => {
    const l = agruparEmLinhas([
      { str: '1.234,56', x: 300, y: 700 }, { str: 'Saldo', x: 50, y: 700.5 },
      { str: 'Data', x: 50, y: 720 }, { str: 'final', x: 100, y: 700 },
    ]);
    expect(l).toEqual(['Data', 'Saldo final 1.234,56']);
  });
  it('ignora itens vazios e valores quebrados', () => {
    expect(agruparEmLinhas([{ str: '  ', x: 1, y: 1 }, { str: 'a', x: NaN, y: 3 }, { str: 'b', x: 2, y: 3 }])).toEqual(['b']);
  });
});

describe('propriedades (centenas de sementes)', () => {
  const vocab = ['Saldo', 'saldo final', 'SALDO DO DIA', 'saldo anterior', 'em', 'R$', '1.234,56', '-2.500,00', '(10,00)', '99.999.999.999,99', '1.234,567',
    '30/10/2026', '31/02/2026', '05/03/26', '12345678909', '123.456.789-09', 'D', 'C', '-', '(', ')', ',', '.', 'de 01/10/2026 a 30/10/2026', '0,01',
    'Pix', 'devedor', 'credor', '9'.repeat(30), '00000000000000', '<b>', '1e5', 'NaN', '\u0000', '𝒜'];
  it('nunca lança, valores são inteiros seguros dentro do limite, trecho nunca tem 6+ dígitos, datas existem', () => {
    for (let semente = 1; semente <= 500; semente++) {
      const rnd = aleatorio(semente);
      const linhas = Array.from({ length: 1 + Math.floor(rnd() * 12) }, () =>
        Array.from({ length: 1 + Math.floor(rnd() * 8) }, () => vocab[Math.floor(rnd() * vocab.length)]).join(rnd() < 0.8 ? ' ' : ''));
      const r = candidatosDoTexto(linhas);
      expect(r.saldos.length).toBeLessThanOrEqual(MAX_CANDIDATOS);
      for (const s of r.saldos) {
        expect(Number.isSafeInteger(s.valor), `semente ${semente}`).toBe(true);
        expect(Math.abs(s.valor)).toBeLessThanOrEqual(MAX_SALDO);
        expect(s.trecho, `semente ${semente}`).not.toMatch(/\d{6,}/);
        expect(s.trecho).not.toMatch(/[<>]/);
      }
      for (const d of r.datas) {
        expect(d.trecho).not.toMatch(/\d{6,}/);
        expect(new Date(d.data + 'T00:00:00Z').toISOString().slice(0, 10)).toBe(d.data);
      }
      if (r.periodoFim) expect(r.periodoFim).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // a pré-seleção respeita as regras em qualquer entrada
      const pre = candidatoPreSelecionado(r.saldos);
      if (pre) {
        expect(pre.pontuacao).toBeGreaterThanOrEqual(PONTUACAO_MIN_PRESELECAO);
        expect(pre.sinalIncerto).toBe(false);
        expect(pre.anterior).toBe(false);
      }
    }
  });
  it('lixo puro (caracteres aleatórios, linhas gigantes) nunca lança', () => {
    for (let semente = 1; semente <= 200; semente++) {
      const rnd = aleatorio(semente + 4000);
      const linhas = Array.from({ length: Math.floor(rnd() * 30) }, () =>
        Array.from({ length: Math.floor(rnd() * 500) }, () => String.fromCharCode(Math.floor(rnd() * 65536))).join(''));
      expect(() => candidatosDoTexto(linhas)).not.toThrow();
    }
    expect(() => candidatosDoTexto(['saldo ' + '9'.repeat(100_000)])).not.toThrow();
    expect(() => candidatosDoTexto(['saldo '.repeat(50_000)])).not.toThrow();
    expect(() => candidatosDoTexto(undefined as never)).not.toThrow();
    expect(() => candidatosDoTexto([null as never, 5 as never])).not.toThrow();
  });
});

describe('PDF e a regra de ouro (mesma avaliarImportacao da fase OFX)', () => {
  const HOJE = '2026-10-30';
  const conta = (finalConta?: string): Conta => ({ id: 'c1', nome: 'C', banco: '', obraId: null, ativa: true, criadoEm: '', atualizadoEm: '', ...(finalConta ? { finalConta } : {}) });
  let n = 0;
  const saldo = (data: string, valor: number): SaldoConta => ({ id: 's' + ++n, contaId: 'c1', data, valor, fonte: 'manual', obs: '', criadoEm: '2026-10-01T10:00:00Z' });
  const mais = (iso: string, k: number) => new Date(Date.parse(iso + 'T00:00:00Z') + k * 86_400_000).toISOString().slice(0, 10);

  it('QUALQUER data escolhida mais antiga que o último saldo é rejeitada, com ou sem periodoFim (500 sementes)', () => {
    for (let semente = 1; semente <= 500; semente++) {
      const rnd = aleatorio(semente + 123);
      const ultima = mais(HOJE, -Math.floor(rnd() * 40));
      const lista = [saldo(ultima, 1), saldo(mais(ultima, -1 - Math.floor(rnd() * 20)), 2)];
      if (rnd() < 0.3) lista.push(saldo(mais(HOJE, 5 + Math.floor(rnd() * 300)), 3)); // futuro por engano
      const escolhida = mais(ultima, -(1 + Math.floor(rnd() * 60)));
      const fim = rnd() < 0.5 ? undefined : mais(escolhida, Math.floor(rnd() * 10));
      const r = avaliarImportacaoPdf({ saldo: Math.floor((rnd() - 0.5) * 1e8), data: escolhida }, conta(rnd() < 0.5 ? '0001' : undefined), lista, HOJE, fim);
      expect(!r.ok && r.motivo, `semente ${semente}`).toBe('antigo');
    }
  });
  it('conta que já tem final não é barrada como "outra conta" (PDF não traz final)', () => {
    expect(avaliarImportacaoPdf({ saldo: 5, data: HOJE }, conta('0001'), [], HOJE).ok).toBe(true);
  });
  it('data escolhida anterior ao fim do período, mas não antiga demais: aceita COM confirmação extra e aviso forte', () => {
    const r = avaliarImportacaoPdf({ saldo: 100, data: '2026-10-20' }, conta(), [saldo('2026-10-10', 100)], HOJE, '2026-10-30');
    expect(r.ok && r.precisaConfirmarDataAnteriorAoPeriodo).toBe(true);
    expect(r.ok && r.aviso).toMatch(/anterior ao fim do período do extrato/i);
  });
  it('data igual ou depois do fim do período não pede essa confirmação', () => {
    const r = avaliarImportacaoPdf({ saldo: 100, data: '2026-10-30' }, conta(), [saldo('2026-10-10', 100)], HOJE, '2026-10-30');
    expect(r.ok && r.precisaConfirmarDataAnteriorAoPeriodo).toBeFalsy();
  });
  it('repetido, futuro e mudança grande continuam valendo no PDF', () => {
    const s = [saldo('2026-10-20', 100_000)];
    expect(avaliarImportacaoPdf({ saldo: 100_000, data: '2026-10-20' }, conta(), s, HOJE)).toMatchObject({ ok: false, motivo: 'repetido' });
    expect(avaliarImportacaoPdf({ saldo: 1, data: '2026-12-01' }, conta(), s, HOJE)).toMatchObject({ ok: false, motivo: 'futuro' });
    const g = avaliarImportacaoPdf({ saldo: 10, data: '2026-10-25' }, conta(), s, HOJE);
    expect(g.ok && g.precisaConfirmarMudancaGrande).toBe(true);
  });
});
