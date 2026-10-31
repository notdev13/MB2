// Geometria das linhas suaves (gráfico de gasto por mês e minigráficos das contas).

export interface Curva { d: string; inicio: [number, number]; fim: [number, number]; pontos: [number, number][] }

// Caminho SVG suave (Catmull-Rom convertido em Bézier, sem passar dos dados) que passa por todos os valores,
// ocupando a caixa `largura` x `altura` com folgas `fx` (lados) e `fy` (topo e base).
// Sem `escala`, o menor valor fica embaixo e o maior em cima; com ela, a altura vai de escala.min a escala.max.
export function curvaSuave(valores: number[], largura: number, altura: number, fx = 4, fy = 8,
  escala?: { min: number; max: number }): Curva {
  const v = valores.length === 1 ? [valores[0], valores[0]] : valores.length === 0 ? [0, 0] : valores;
  const min = escala?.min ?? Math.min(...v), max = escala?.max ?? Math.max(...v), faixa = max - min || 1;
  const p = v.map((y, i): [number, number] => [
    fx + (i * (largura - 2 * fx)) / (v.length - 1),
    max === min ? altura / 2 : fy + (altura - 2 * fy) * (1 - (y - min) / faixa),
  ]);
  // Os pontos de controle ficam dentro da faixa dos dados: a linha não passa do pico nem desce abaixo do menor valor.
  const ys = p.map((q) => q[1]), cima = Math.min(...ys), baixo = Math.max(...ys);
  const n = (x: number) => Math.round(x * 10) / 10;
  const ny = (y: number) => n(Math.min(Math.max(y, cima), baixo));
  let d = `M${n(p[0][0])} ${n(p[0][1])}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] ?? p[i], b = p[i], c = p[i + 1], e = p[i + 2] ?? c;
    d += ` C${n(b[0] + (c[0] - a[0]) / 6)} ${ny(b[1] + (c[1] - a[1]) / 6)} ${n(c[0] - (e[0] - b[0]) / 6)} ${ny(c[1] - (e[1] - b[1]) / 6)} ${n(c[0])} ${n(c[1])}`;
  }
  return { d, inicio: p[0], fim: p[p.length - 1], pontos: p };
}
