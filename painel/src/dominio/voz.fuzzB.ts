import { aleatorio, milhar, porExtenso, type Caso } from './voz.corpus';

// Segundo gerador cego, com modelos de frase e vocabulário diferentes de voz.fuzz.ts (pagamentos a pessoas, empresas
// com número no nome, notas, quantidades e medidas misturadas). O valor verdadeiro é V; "marcado" = com "R$"/"reais" colado.
// Com marca tem que sair V; sem marca, V ou null. Qualquer outro número é erro grave.

function sorteador(semente: number) {
  const r = aleatorio(semente * 2246822519 + 97);
  return { r, esc: <T,>(l: T[]): T => l[Math.floor(r() * l.length)] };
}

export function gerarCegoB(semente: number, quantidade: number): Caso[] {
  const { r, esc } = sorteador(semente);
  const casos: Caso[] = [];
  while (casos.length < quantidade) {
    const v = esc([95, 130, 275, 380, 640, 1150, 2800, 7400]);
    const marcado = r() < 0.55;
    const t = marcado ? esc([`R$ ${milhar(v)}`, `${milhar(v)} reais`, `${porExtenso(v)} reais`]) : esc([String(v), milhar(v), porExtenso(v)]);
    const empresa = esc(['3M Distribuidora', 'Casa 7 Materiais', 'Ferragens Dois Irmãos', 'Madeireira 2 Pinheiros', 'Tintas Sul', 'Depósito do Seu Zé', 'Eletro 24 Horas']);
    const pessoa = esc(['Seu Jorge', 'Dona Maria', 'o mestre Antônio', 'o Ulisses', 'o Adriano', 'o eletricista Paulo']);
    const material = esc(['areia', 'cimento', 'ferro', 'tijolo', 'tinta', 'fio', 'cano', 'piso', 'reboco']);
    const medida = esc(['20 sacos', '3 metros', '12 barras', '2 latas', '40 peças', '5 caixas', '150 m²', '8 mm', '25 kg', '4 horas']);
    const nota = `nota ${1000 + Math.floor(r() * 8000)}`;
    const quando = esc(['', '', 'ontem', 'hoje', 'dia 8', 'segunda', 'há 2 dias']);
    const frase = esc([
      () => `Pagamento ${esc(['ao', 'pro', 'para'])} ${pessoa}: ${t} ${quando}`,
      () => `${empresa}, ${material}, ${medida}, ${t}`,
      () => `${esc(['Comprei', 'Peguei', 'Retirei'])} ${medida} de ${material} na ${empresa} ${quando} e paguei ${t}`,
      () => `${nota} ${empresa} ${t} ${quando}`,
      () => `Fechei com ${pessoa} ${t} pelo serviço de ${material}`,
      () => `${quando} ${pessoa} recebeu ${t}`,
      () => `Adiantamento ${esc(['ao', 'pro'])} ${pessoa}, ${t}, ${esc(['no pix', 'em dinheiro', 'por transferência'])}`,
      () => `${medida} de ${material} saiu ${t}`,
      () => `Recibo ${1000 + Math.floor(r() * 8000)}: ${t} ${pessoa}`,
    ])();
    // número colado no valor ("nota 4521 480") ninguém sabe ler
    const antes = frase.slice(0, frase.indexOf(t)).trim().split(' ').pop() ?? '';
    if (/\d[º]?[:;,.)]*$/.test(antes) && !t.startsWith('R$')) continue;
    casos.push({ frase: frase.replace(/\s+/g, ' ').trim(), esperado: { valor: v * 100 }, tipo: `cegoB-${marcado ? 'marcado' : 'solto'}` });
  }
  return casos;
}
