import { lerSaldo } from './saldos';

// Valor do saldo a partir do TEXTO que o leitor de imagem (OCR) achou num print de tela. Funções puras.
//
// O print costuma ser só o saldo, mas pode vir a tela inteira. Por isso nada aqui grava por conta
// própria: o painel LISTA o que achou, mostra o recorte e o dono confere. Só vem destacado quando
// há um valor só (ou um claramente maior que os outros) e a leitura teve boa confiança.

export interface LinhaOcr { texto: string; altura: number } // altura da linha em pixels (letra maior = mais importante)
export interface CandidatoPrint {
  valor: number; // centavos; negativo = no vermelho
  trecho: string; // só o trecho do valor (nada do resto da tela)
  altura: number;
}
export interface LeituraPrint {
  candidatos: CandidatoPrint[]; // do mais provável para o menos
  sugerido: CandidatoPrint | null; // só quando não há dúvida razoável
  incerto: boolean; // a leitura teve pouca confiança: conferir com atenção
}

// Confiança mínima (0 a 100) do OCR para destacar um candidato e para não avisar "leitura incerta".
export const CONFIANCA_MIN = 60;
// O maior valor só vence se a letra for pelo menos isto vezes a do segundo.
export const VANTAGEM_ALTURA = 1.25;

// "R$ 96.400,00", "-R$ 1.234,56", "R$ -50,00", "128.750,45" e o OCR que separa "300, 00" ou lê "RS".
// Exige centavos (",dd"): saldo de banco sempre tem; assim data, hora e telefone não entram.
const VALOR = /(?<![\d.,])([-−–]\s*)?(?:R\s?[$S5]\s*)?([-−–]\s*)?(\d{1,3}(?:\.\d{3})+|\d+)\s*,\s*(\d{2})(?!\d)/g;

export function valoresDaLinha(texto: string): { valor: number; trecho: string }[] {
  const achados: { valor: number; trecho: string }[] = [];
  for (const m of texto.matchAll(VALOR)) {
    const negativo = !!(m[1] || m[2]);
    const valor = lerSaldo(`${negativo ? '-' : ''}${m[3]},${m[4]}`);
    if (valor === null) continue;
    achados.push({ valor, trecho: m[0].trim() });
  }
  return achados;
}

export function candidatosDoPrint(linhas: LinhaOcr[], confianca: number): LeituraPrint {
  const porValor = new Map<number, CandidatoPrint>();
  for (const l of linhas) {
    for (const a of valoresDaLinha(l.texto)) {
      const antes = porValor.get(a.valor);
      if (!antes || l.altura > antes.altura) porValor.set(a.valor, { ...a, altura: l.altura });
    }
  }
  const candidatos = [...porValor.values()].sort((a, b) => b.altura - a.altura);
  const incerto = confianca < CONFIANCA_MIN;
  const [primeiro, segundo] = candidatos;
  const claro = !!primeiro && (!segundo || primeiro.altura >= segundo.altura * VANTAGEM_ALTURA);
  return { candidatos, sugerido: claro && !incerto ? primeiro : null, incerto };
}

// Valor como se digita no campo de saldo ("-1234,56"): a leitura de volta (lerSaldo) dá o mesmo valor.
export function valorParaCampo(centavos: number): string {
  const abs = Math.abs(centavos);
  const reais = Math.floor(abs / 100);
  const cent = String(abs % 100).padStart(2, '0');
  return `${centavos < 0 ? '-' : ''}${reais},${cent}`;
}
