import { describe, expect, it } from 'vitest';
import type { Categoria, Custo, Obra } from './tipos';
import { interpretarFala, possiveisRepetidos } from './voz';

const obra = (id: string, nome: string): Obra => ({
  id, nome, endereco: '', cliente: '', orcamento: 0, areaM2: null, inicio: null, previsaoFim: null,
  status: 'em_andamento', observacoes: '', criadoEm: '', atualizadoEm: '',
});
const obras = [
  obra('l39', 'Jardim Campeche Geminada 39'),
  obra('eco', 'Ecovillas'),
  obra('oli', 'Olindina Maria Lopes'),
  obra('lau', 'Laureano'),
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
    expect(valor('meia hora de máquina 100')).toBe(100_00);
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
    expect(ler('3 mil reais em 3 vezes')).toMatchObject({ pago: false, valor: 3000_00 });
    expect(ler('3 mil em 3 vezes')).toMatchObject({ pago: false, valor: null }); // parcela ou total?
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
    expect(valor('R$ 1 200 de areia')).toBe(1200_00); // o ditado separa o milhar com espaço, e o R$ mostra que é dinheiro
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

  it('número pequeno de rótulo não vence o dinheiro; valor pequeno também é lido', () => {
    expect(valor('areia pro 2º andar 480')).toBe(480_00);
    expect(valor('pedreiro R$ 480 cômodo 2')).toBe(480_00);
    expect(valor('areia pro 2º andar 18')).toBe(18_00);
    expect(valor('mão de obra 95')).toBe(95_00);
    expect(valor('Anuidade do CREA 1150')).toBe(1150_00);
    expect(valor('brita 1 por 95')).toBe(95_00);
    expect(valor('pedreiro 480 andar 2')).toBe(480_00);
    // sobrou só um inteiro pequeno depois de descartar uma quantidade maior: dúvida, não chute
    expect(ler('Mourão 100 unidades 18')).toMatchObject({ valor: null, duvidaValor: true });
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

describe('interpretador de voz: revisão cega (rodada 58)', () => {
  const valor = (t: string) => ler(t).valor;

  it('dois valores com saldo, entrada ou combinado: não escolhe', () => {
    expect(ler('paguei 1.000 faltam 500 reais')).toMatchObject({ valor: null, duvidaValor: true });
    for (const f of ['paguei 1.000 restam 500 reais', 'paguei 1.000 devendo 500 reais', 'ferro 1.200 entrada 600 reais', 'ferro 1.200 sinal 600 reais',
      'ferro 1.200 sendo 600 reais no pix', 'paguei 2.000 mas o combinado era 2.500 reais']) expect(valor(f), f).toBeNull();
    expect(valor('projetor 3000 lumens 1.200 reais')).toBe(1200_00); // unidade de verdade ao lado do número
  });

  it('segundo item pequeno depois de "e": é outro lançamento', () => {
    for (const f of ['cimento 360 reais e prego 18', 'areia 480 reais e cal 15', 'areia 480 reais mais diária 90', 'brita 200 reais e lixa 9']) expect(valor(f), f).toBeNull();
    expect(valor('brita 12 R$ 480')).toBe(480_00); // a descrição do material vem antes do valor
  });

  it('"depósito" é a loja; só "depositei" e "fiz um depósito" são forma de pagamento', () => {
    expect(ler('depósito Santa Rita 480 ontem')).toMatchObject({ valor: 480_00, pagamento: null });
    expect(ler('comprei no depósito Santa Rita 480 no pix').pagamento).toBe('pix');
    expect(ler('depositei 500 pro pedreiro').pagamento).toBe('transferencia');
    expect(ler('fiz um depósito de 480 pro Zé').pagamento).toBe('transferencia');
  });

  it('"paguei/quitei" vencem "atrasado/vencido"; "pagar" solto não decide', () => {
    expect(ler('paguei o boleto atrasado de 480').pago).toBe(true);
    expect(ler('quitei o boleto vencido do ferro 480').pago).toBe(true);
    expect(ler('paguei a conta que estava em atraso 345').pago).toBe(true);
    expect(ler('boleto atrasado de 480').pago).toBe(false);
    expect(ler('fui pagar a areia 480').pago).toBeNull();
    expect(ler('acabei de pagar 450 pro pedreiro').pago).toBe(true);
  });

  it('quantidade ou preço de cada não vira total', () => {
    for (const f of ['cimento 50 kg 38 reais cada, comprei 10', '20 sacos de cimento, 38 reais', 'cimento 20 sacos 38', 'pedreiro 450 3 dias', 'dois pedreiros 450',
      'servente diária de 120 reais, trabalhou 4 dias', 'hora da retro 220 por 8 horas', 'comprei 3 baldes de tinta de 180']) expect(valor(f), f).toBeNull();
    expect(valor('10 sacos de cimento 360')).toBe(360_00);
    expect(valor('pedreiro 3 dias total 900')).toBe(900_00);
  });

  it('"deu 480 a areia": o número é o total, o material vem depois', () => {
    expect(valor('foi 360 o cimento')).toBe(360_00);
    expect(valor('saiu 2.400 a porta')).toBe(2400_00);
    expect(valor('pô eu tinha dito que ia dar 5 mil mas no final ficou 5.730 o ferro')).toBe(5730_00);
    expect(valor('40 reais o saco')).toBeNull(); // sem verbo de total, continua sendo preço de cada
  });

  it('milhar com espaço e dígitos colados', () => {
    expect(valor('paguei 1 250 reais de areia')).toBe(1250_00);
    expect(valor('paguei 1mil e 200 de ferro')).toBe(1200_00);
    expect(valor('paguei 360reais de cimento')).toBe(360_00);
    expect(valor('ferro 12 k')).toBeNull();
    expect(valor('areia 1 200 reais')).toBeNull(); // 1 e 200 colados depois de material: não dá para saber
  });

  it('frases comuns que não podem ficar em branco', () => {
    expect(valor('comprei 3 de cal e 2 de cimento por 215 reais')).toBe(215_00);
    expect(valor('cimento 360, areia 480, brita 530, tudo junto 1.370')).toBe(1370_00);
    expect(valor('meio fio 1.800')).toBe(1800_00);
    expect(valor('recebi o cimento hoje, paguei 360')).toBe(360_00);
    expect(valor('troco de fechadura 280')).toBe(280_00);
    expect(valor('dias 5 e 6 pedreiro 900')).toBe(900_00);
    expect(valor('OS 17 pintura 2.800')).toBe(2800_00);
    expect(valor('recebi 500 do cliente')).toBeNull();
  });
});

describe('interpretador de voz: rodada final', () => {
  it('"por dia", "N dias" e "diária" nunca viram data', () => {
    expect(ler('aluguel da betoneira 180 reais por dia, três dias, total 540')).toMatchObject({ valor: 540_00, data: null });
    expect(ler('diária 150 por dia, dois dias, 300 no total')).toMatchObject({ valor: 300_00, data: null });
    expect(ler('paguei dia 5 480 de areia').data).toBe('2026-10-05');
  });

  it('"pra dia N" e "vence dia N" são vencimento: sem data e a pagar', () => {
    expect(ler('boleto pra dia 20 de ferro 1.300 reais')).toMatchObject({ valor: 1300_00, data: null, pago: false });
    expect(ler('boleto para o dia 15 tijolo 900')).toMatchObject({ data: null, pago: false });
    expect(ler('vence dia 18 o boleto da brita 740')).toMatchObject({ data: null, pago: false });
  });

  it('gastos comuns não ficam em branco', () => {
    for (const [f, v] of [['disjuntor de 32 A 38 reais', 38], ['deu 2.050 reais o material elétrico', 2050], ['paguei a parcela 3 de 1.500 do terreno', 1500],
      ['tinta 18 litros por 330', 330], ['meia diária do servente 75 reais', 75], ['uma lata de tinta de 180 reais', 180],
      ['meio dia de pedreiro 150', 150], ['alugamos andaime 400 reais a semana', 400], ['cei da obra 1234 5678 taxa 340', 340]] as const) {
      expect(ler(f).valor, f).toBe(v * 100);
    }
  });

  it('frases que não são gasto ficam em branco', () => {
    for (const f of ['o muro tem 2 metros e 20 de altura', 'o boleto de 1.200 chegou duplicado', 'será que 500 reais dá pra pagar a areia',
      'estimativa de gasto com acabamento 40 mil', 'se o cliente pagar eu compro o ferro de 3 mil', 'sangria do caixa 500', 'tirei do caixa 300']) {
      expect(ler(f).valor, f).toBeNull();
    }
  });
});

describe('dúvida sobre o valor (a tela avisa "ouvi um número, confira")', () => {
  it('valor em branco por dúvida traz duvidaValor; sem número na fala, não traz', () => {
    for (const f of ['paguei 1.000 faltam 500 reais', 'cimento 360 reais e prego 18', 'paguei 360 de cimento e 200 de areia']) {
      const r = ler(f);
      expect(r.valor, f).toBeNull();
      expect(r.duvidaValor, f).toBe(true);
    }
    const sem = ler('paguei o pedreiro ontem');
    expect(sem.valor).toBeNull();
    expect(sem.duvidaValor).toBeUndefined();
  });

  it('valor entendido nunca vem com dúvida', () => {
    for (const f of ['paguei 360 de cimento', 'mil e duzentos de tijolo', 'areia pro 2º andar 480']) {
      const r = ler(f);
      expect(r.valor, f).not.toBeNull();
      expect(r.duvidaValor, f).toBeUndefined();
    }
  });
});
