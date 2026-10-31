import type { Nuvem } from './nuvem';
import type { FilaLocal } from './repositorio';

// Uma rodada de sincronização: primeiro envia o que mudou aqui, depois busca o que mudou nos
// outros aparelhos. Em conflito vale a mudança mais recente (a nuvem confere ao gravar e o
// aparelho confere ao aplicar). Pode rodar quantas vezes quiser: repetir não estraga nada.

// Busca de novo um pouco antes da última marca, para não perder o que chegou à nuvem
// quase ao mesmo tempo que a última busca.
const FOLGA_MS = 5 * 60_000;

// Proteção contra "apagar tudo": se uma rodada for apagar a maior parte do que existe (aqui ou,
// pelo que este aparelho envia, na nuvem), ela para e pede confirmação. Um engano num aparelho
// (backup errado, desfazer restauração num aparelho vazio, obras excluídas) não apaga os outros.
export const MINIMO_EXCLUSAO_EM_MASSA = 10;
export const PARTE_EXCLUSAO_EM_MASSA = 0.5;

export function exclusaoEmMassa(apagando: number, total: number): boolean {
  return apagando >= MINIMO_EXCLUSAO_EM_MASSA && apagando >= total * PARTE_EXCLUSAO_EM_MASSA;
}

export class ExclusaoEmMassa extends Error {
  constructor(public direcao: 'enviar' | 'receber', public quantidade: number) {
    super(direcao === 'enviar'
      ? `Este aparelho ia apagar ${quantidade} registros na nuvem de uma vez. Nada foi enviado. Confira os dados e, se foi de propósito, confirme em Ajustes.`
      : `A nuvem pediu para apagar ${quantidade} registros deste aparelho de uma vez. Nada foi apagado aqui. Se foi de propósito, confirme em Ajustes.`);
    this.name = 'ExclusaoEmMassa';
  }
}

export interface ResultadoSincronizacao {
  enviados: number;
  recebidos: number; // quantos mudaram neste aparelho
}

export async function sincronizar(local: FilaLocal, nuvem: Nuvem, opcoes: { confirmarExclusao?: boolean } = {}): Promise<ResultadoSincronizacao> {
  const marca = await local.lerMarca();
  if (!marca) await local.enfileirarTudo(); // primeira vez: o que já existe aqui também vai

  const pendentes = await local.pendentes();
  if (pendentes.length) {
    const apagando = pendentes.filter((p) => p.excluido).length;
    if (!opcoes.confirmarExclusao && apagando) {
      const { total } = await local.contarExclusoes([]);
      if (exclusaoEmMassa(apagando, total + apagando)) throw new ExclusaoEmMassa('enviar', apagando);
    }
    await nuvem.enviar(await local.paraEnviar(pendentes));
    await local.confirmarEnvio(pendentes);
  }

  const desde = marca ? new Date(Date.parse(marca) - FOLGA_MS).toISOString() : null;
  const registros = await nuvem.buscar(desde);
  if (!opcoes.confirmarExclusao && registros.some((r) => r.excluido || !r.dados)) {
    const { total, apagariam } = await local.contarExclusoes(registros);
    if (exclusaoEmMassa(apagariam, total)) throw new ExclusaoEmMassa('receber', apagariam);
  }
  const recebidos = registros.length ? await local.aplicarDaNuvem(registros) : 0;

  const ultima = registros.reduce<string | null>(
    (m, r) => (r.servidorEm && (!m || Date.parse(r.servidorEm) > Date.parse(m)) ? r.servidorEm : m),
    marca,
  );
  await local.gravarMarca(ultima ?? new Date(0).toISOString());
  return { enviados: pendentes.length, recebidos };
}
