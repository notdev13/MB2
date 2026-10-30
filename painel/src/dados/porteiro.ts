// Decide o que a entrada do app mostra. Função pura (a tela só obedece).
//   livre : este build não tem nuvem configurada; abre direto, como sempre foi.
//   login : tem nuvem e não há sessão (ou a nuvem recusou a renovação de verdade): só a tela de entrar.
//   abrir : tem sessão guardada; abre o app, mesmo sem internet.
export type DecisaoPorteiro = 'livre' | 'login' | 'abrir';

// Como terminou a tentativa de renovar a sessão: null = não houve falha;
// 'rede' = sem conexão; número = status HTTP recebido da nuvem.
export type FalhaRenovacao = null | 'rede' | number;

export function decidirPorteiro(e: { configurada: boolean; sessao: boolean; falhaRenovacao?: FalhaRenovacao }): DecisaoPorteiro {
  if (!e.configurada) return 'livre';
  if (!e.sessao) return 'login';
  // Só 400/401 do refresh = sessão revogada ou vencida de verdade. Rede, 429, 5xx e o resto: continua dentro.
  if (e.falhaRenovacao === 400 || e.falhaRenovacao === 401) return 'login';
  return 'abrir';
}
