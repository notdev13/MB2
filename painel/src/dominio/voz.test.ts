import { describe, expect, it } from 'vitest';
import type { Categoria, Custo, Obra } from './tipos';
import { interpretarFala, possiveisRepetidos } from './voz';

const obra = (id: string, nome: string): Obra => ({
  id, nome, endereco: '', cliente: '', orcamento: 0, areaM2: null, inicio: null, previsaoFim: null,
  status: 'em_andamento', observacoes: '', criadoEm: '', atualizadoEm: '',
});
const obras = [
  obra('l39', 'Obra Geminada JD Campeche – Lote 39'),
  obra('eco', 'Terreno Ecovillas'),
  obra('oli', 'Olindina Maria Lopes'),
  obra('lau', 'Projeto Laureano'),
  obra('jbp', 'Servidão João Batista Pires'),
];
let n = 0;
const custo = (categoria: Categoria, descricao: string, fornecedor = '', extra: Partial<Custo> = {}): Custo => ({
  id: String(n++), obraId: 'l39', data: '2026-09-01', categoria, descricao, fornecedor, valor: 100_00,
  pagamento: 'outro', pago: true, criadoEm: '', atualizadoEm: '', ...extra,
});
const custos = [
  custo('Mão de obra', 'MÃO DE OBRA – ULISSES', 'Ulisses'),
  custo('Mão de obra', 'MÃO DE OBRA – ADRIANO', 'Adriano'),
  custo('Materiais (M)', 'CASSOL'),
  custo('Materiais (M)', 'FERRO FUNDACAO'),
  custo('Serviços (S)', 'MAQUINA LOURIVAL'),
  custo('Projetos e documentação', 'RRT PROJETO'),
  custo('Locação e consumo', 'LOCACAO CONTAINER'),
];
const hoje = '2026-10-28'; // quarta-feira
const ler = (t: string) => interpretarFala(t, { obras, custos, hoje });

describe('lançamento falado', () => {
  it('frase completa', () => {
    expect(ler('Paguei 360 reais de cimento no Lote 39 ontem, no pix')).toMatchObject({
      valor: 360_00, obraId: 'l39', data: '2026-10-27', categoria: 'Materiais (M)', descricao: 'Cimento',
      pagamento: 'pix', pago: true, faltou: [],
    });
  });

  it('mão de obra pelo nome, no padrão da planilha (Adrian = Adriano)', () => {
    expect(ler('5.800 pro Adrian na Olindina dia 24')).toMatchObject({
      valor: 5_800_00, obraId: 'oli', data: '2026-10-24', categoria: 'Mão de obra',
      descricao: 'MÃO DE OBRA – ADRIANO', fornecedor: 'Adriano',
    });
  });

  it('valor por extenso e com centavos', () => {
    expect(ler('cinco mil e oitocentos reais de ferro fundação').valor).toBe(5_800_00);
    expect(ler('R$ 1.234,56 Cassol').valor).toBe(1_234_56);
    expect(ler('trezentos e sessenta reais e cinquenta centavos de areia').valor).toBe(360_50);
    expect(ler('2,5 mil de madeira').valor).toBe(2_500_00);
  });

  it('não confunde quantidade, data ou número da obra com o valor', () => {
    const r = ler('30 sacos de cimento por 900 no lote 39 dia 17');
    expect(r).toMatchObject({ valor: 900_00, obraId: 'l39', data: '2026-10-17', descricao: '30 sacos de cimento' });
    expect(ler('Lote 39, 450 de areia').valor).toBe(450_00);
  });

  it('reaproveita descrição e fornecedor já usados', () => {
    expect(ler('mil e duzentos na Cassol, boleto')).toMatchObject({
      valor: 1_200_00, categoria: 'Materiais (M)', descricao: 'CASSOL', pagamento: 'boleto',
    });
    expect(ler('locação container 250 ecovillas')).toMatchObject({
      categoria: 'Locação e consumo', descricao: 'LOCACAO CONTAINER', obraId: 'eco',
    });
    expect(ler('eco vilas 100 de luz').obraId).toBe('eco');
  });

  it('a pagar e formas de pagamento', () => {
    expect(ler('boleto de 2 mil do eletricista no Laureano, ainda a pagar')).toMatchObject({
      valor: 2_000_00, pagamento: 'boleto', pago: false, categoria: 'Serviços (S)', obraId: 'lau',
    });
    expect(ler('ITBI 10 mil João Batista transferência')).toMatchObject({
      categoria: 'Impostos e taxas', pagamento: 'transferencia', obraId: 'jbp',
    });
  });

  it('siglas curtas', () => {
    expect(ler('ISS da obra 1.600 Laureano').categoria).toBe('Impostos e taxas');
    expect(ler('RRT 130 reais').categoria).toBe('Projetos e documentação');
  });

  it('datas faladas', () => {
    expect(ler('100 anteontem').data).toBe('2026-10-26');
    expect(ler('100 dia 30').data).toBe('2026-09-30'); // dia 30 ainda não chegou: mês passado
    expect(ler('100 em 17 de setembro').data).toBe('2026-09-17');
    expect(ler('100 em 17/09').data).toBe('2026-09-17');
    expect(ler('100 segunda-feira').data).toBe('2026-10-26');
    expect(ler('100 de cimento').data).toBeNull();
  });

  it('avisa o que não entendeu', () => {
    expect(ler('cimento').faltou).toEqual(['valor', 'obra']);
    expect(ler('Campeche 100').obraId).toBe('l39');
  });
});

// Falhas achadas no laço de testes (corpus em voz.corpus.ts, medidas em voz.medir.test.ts).
// Regra de ouro: na dúvida o valor é null e entra em `faltou`; nunca um valor errado.
describe('interpretador de voz: correções', () => {
  const valor = (t: string) => ler(t).valor;

  it('vírgula de milhar: "1,200" é mil e duzentos, não R$ 1,20', () => {
    expect(valor('cimento 1,200')).toBe(1200_00);
    expect(valor('1,200.50 de areia')).toBe(1200_50);
    expect(valor('1.234,567 de areia')).toBeNull(); // centavos têm no máximo 2 casas
    expect(valor('pegou 48999998888')).toBeNull(); // telefone não é dinheiro
  });

  it('"e meio", milhão e k', () => {
    expect(valor('dois mil e meio de areia')).toBe(2500_00);
    expect(valor('meio milhão de terreno')).toBe(500000_00);
    expect(valor('dois milhões e meio de terreno')).toBe(2500000_00);
    expect(valor('2k de ferro')).toBe(2000_00);
    expect(valor('5 mil e 500 de tinta')).toBe(5500_00);
    expect(valor('dois e meio de madeira')).toBeNull();
    expect(valor('meia hora de máquina 100')).toBeNull();
  });

  it('centavos sempre em inteiros', () => {
    expect(valor('noventa centavos de parafuso')).toBe(90);
    expect(valor('1,1 mil de ferro')).toBe(1100_00); // 1.1 * 1000 em ponto flutuante dá 1100.0000000000002
    expect(valor('R$ 0,30 de prego')).toBe(30);
    expect(valor('trezentos reais e cinquenta centavos')).toBe(300_50);
    expect(valor('três reais e 50 de prego')).toBeNull(); // "e 50" sem a palavra centavos: dúvida
    expect(Number.isInteger(valor('R$ 1.234,56 Cassol'))).toBe(true);
  });

  it('reconhecimento errado de pagamento', () => {
    expect(ler('paguei 300 pelo pique').pagamento).toBe('pix');
    expect(ler('bolheto de 800').pagamento).toBe('boleto');
    expect(ler('pix e boleto 300 de areia').pagamento).toBeNull(); // duas formas: dúvida
    expect(ler('300 de areia no cheque').pagamento).toBe('outro');
    expect(ler('transferi 2 mil pro Adriano').pagamento).toBe('transferencia');
  });

  it('parcelado e a prazo ficam a pagar, sem inventar data', () => {
    expect(ler('vinte mil de laje a prazo')).toMatchObject({ pago: false, valor: 20000_00 });
    expect(ler('3 mil em 3 vezes')).toMatchObject({ pago: false, valor: 3000_00 });
    expect(ler('paguei 3 mil em 3 vezes').pago).toBeNull();
    expect(ler('parcelado em 3x de 500').valor).toBeNull(); // parcela ou total?
    expect(ler('800 de piso a pagar dia 30').data).toBeNull(); // vencimento futuro
    expect(ler('boleto de 400 vence dia 5 de novembro').data).toBeNull();
    expect(ler('pendente 300 de areia').pago).toBe(false);
    expect(ler('já quitei 300 de areia').pago).toBe(true);
  });

  it('ruído de fala não vira descrição nem valor', () => {
    expect(ler('então tá hum é paguei 200 de areia')).toMatchObject({ valor: 200_00, descricao: 'Areia' });
    expect(ler('paguei… 300 de areia').pago).toBe(true);
    expect(ler('R$ 1.200 de areia').valor).toBe(1200_00);
  });

  it('datas: há N dias, primeiro, dois dias da semana, ano passado', () => {
    expect(ler('há 3 dias 300 de areia').data).toBe('2026-10-25');
    expect(ler('dia primeiro 300 de areia').data).toBe('2026-10-01');
    expect(ler('dia vinte e cinco 300 de areia').data).toBe('2026-10-25');
    expect(ler('1500 de segunda a sexta').data).toBeNull();
    expect(ler('15 de março do ano passado 100 de areia').data).toBeNull();
    expect(ler('100 de areia segunda que vem').data).toBeNull();
    expect(ler('100 de areia 32/10').data).toBeNull();
  });

  it('número que não é dinheiro: quantidade, documento, medida, endereço', () => {
    expect(valor('comprei 200 telhas')).toBeNull();
    expect(valor('200 telhas por 780')).toBe(780_00);
    expect(valor('nota fiscal 1234 de cimento 500 reais')).toBe(500_00);
    expect(valor('tubo de 100 mm 80 reais')).toBe(80_00);
    expect(valor('rua 7 300 reais de areia')).toBe(300_00);
    expect(valor('Madeireira Dois Irmãos')).toBeNull();
    expect(valor('em 2026 paguei 300 reais de areia')).toBe(300_00);
  });

  it('dois valores na mesma fala, preço por unidade e estimativa: null', () => {
    expect(valor('paguei 360 de cimento e 200 de areia')).toBeNull();
    expect(valor('tinta R$ 250 e depois frete 150')).toBeNull();
    expect(valor('doze mil. cem pro Ulisses')).toBeNull(); // o ponto separa as frases
    expect(valor('20 sacos de cimento a 30 reais')).toBeNull();
    expect(valor('15 sacos de cimento a 40 reais cada')).toBeNull();
    expect(valor('pedreiro 150 por dia')).toBeNull();
    expect(valor('120 reais por vara de eletricista')).toBeNull();
    expect(valor('uns 500 reais de gesso')).toBeNull();
    expect(valor('na casa dos R$ 900 de piso')).toBeNull();
    expect(valor('mil e pouco de areia')).toBeNull();
    expect(valor('R$ 1 200 de areia')).toBeNull(); // 1.200 ou 1 e 200?
  });

  it('não é custo ou não é afirmação: null', () => {
    for (const t of ['estorno de 300 do cimento', 'recebi 300 do cliente', 'metade de 1.000', 'desconto de 100 em 1.500',
      'mil dólares de ferro', 'US$ 300 de ferro', 'apaga o de 300 reais', 'vou comprar 300 de cimento',
      'quanto custa 300 de cimento', 'não foi 300 de cimento', 'talvez 300 de cimento', 'paguei 50% de 2.000']) {
      expect(valor(t), t).toBeNull();
    }
    expect(valor('preciso pagar 300 de areia')).toBe(300_00);
    expect(valor('não foi pago 300 de areia')).toBe(300_00);
  });

  it('avisa quando havia número mas não deu para ter certeza', () => {
    expect(ler('paguei 360 de cimento e 200 de areia')).toMatchObject({ valor: null, duvidaValor: true, faltou: ['valor', 'obra'] });
    expect(ler('cimento').duvidaValor).toBeUndefined();
    expect(ler('paguei 360 de cimento').duvidaValor).toBeUndefined();
  });

  it('categoria casa palavras com letra repetida (terraplenagem, ferro)', () => {
    expect(ler('dezoito mil de terraplenagem').categoria).toBe('Serviços (S)');
    expect(ler('900 de vergalhão').categoria).toBe('Materiais (M)');
  });
});

describe('possíveis repetidos', () => {
  it('mesma obra e valor em até 7 dias', () => {
    const base = [
      custo('Materiais (M)', 'A', '', { id: 'a', valor: 360_00, data: '2026-09-17' }),
      custo('Materiais (M)', 'B', '', { id: 'b', valor: 360_00, data: '2026-08-01' }),
      custo('Materiais (M)', 'C', '', { id: 'c', valor: 360_00, data: '2026-09-18', obraId: 'oli' }),
    ];
    expect(possiveisRepetidos(base, { obraId: 'l39', valor: 360_00, data: '2026-09-20' }).map((c) => c.id)).toEqual(['a']);
    expect(possiveisRepetidos(base, { obraId: 'l39', valor: 360_00, data: '2026-09-20' }, 'a')).toEqual([]);
  });
});
