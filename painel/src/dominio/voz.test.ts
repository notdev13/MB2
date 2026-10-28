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
