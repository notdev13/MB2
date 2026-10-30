// Decide o que a entrada do app mostra. Função pura (a tela só obedece).
//   livre : este build não tem nuvem configurada; abre direto, como sempre foi.
//   login : tem nuvem e não há sessão guardada: só a tela de entrar.
//   abrir : tem sessão guardada; abre o app, mesmo sem internet.
// A renovação do acesso não entra aqui: quando a nuvem recusa de verdade (400/401), nuvem.ts apaga a
// sessão e avisa (ouvir), e a próxima decisão já sai como 'login'. Falha de rede/429/5xx não apaga nada.
export type DecisaoPorteiro = 'livre' | 'login' | 'abrir';

export function decidirPorteiro(e: { configurada: boolean; sessao: boolean }): DecisaoPorteiro {
  if (!e.configurada) return 'livre';
  return e.sessao ? 'abrir' : 'login';
}

// Segundos de espera do botão Entrar depois de um erro (senha errada ou limite de tentativas).
export function esperaAposErro(tipo: string): number {
  if (tipo === 'limite') return 10;
  if (tipo === 'sessao') return 3;
  return 0;
}

// Entrar com OUTRA conta num aparelho que já tem dados de uma conta: perguntar antes de subir os dados.
export function precisaConfirmarConta(contaDoAparelho: string | null, email: string): boolean {
  return !!contaDoAparelho && contaDoAparelho !== email.trim().toLowerCase();
}
