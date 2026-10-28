import type { Nuvem } from './nuvem';
import type { FilaLocal } from './repositorio';

// Uma rodada de sincronização: primeiro envia o que mudou aqui, depois busca o que mudou nos
// outros aparelhos. Em conflito vale a mudança mais recente (a nuvem confere ao gravar e o
// aparelho confere ao aplicar). Pode rodar quantas vezes quiser: repetir não estraga nada.

// Busca de novo um pouco antes da última marca, para não perder o que chegou à nuvem
// quase ao mesmo tempo que a última busca.
const FOLGA_MS = 5 * 60_000;

export interface ResultadoSincronizacao {
  enviados: number;
  recebidos: number; // quantos mudaram neste aparelho
}

export async function sincronizar(local: FilaLocal, nuvem: Nuvem): Promise<ResultadoSincronizacao> {
  const marca = await local.lerMarca();
  if (!marca) await local.enfileirarTudo(); // primeira vez: o que já existe aqui também vai

  const pendentes = await local.pendentes();
  if (pendentes.length) {
    await nuvem.enviar(await local.paraEnviar(pendentes));
    await local.confirmarEnvio(pendentes);
  }

  const desde = marca ? new Date(Date.parse(marca) - FOLGA_MS).toISOString() : null;
  const registros = await nuvem.buscar(desde);
  const recebidos = registros.length ? await local.aplicarDaNuvem(registros) : 0;

  const ultima = registros.reduce<string | null>(
    (m, r) => (r.servidorEm && (!m || Date.parse(r.servidorEm) > Date.parse(m)) ? r.servidorEm : m),
    marca,
  );
  await local.gravarMarca(ultima ?? new Date(0).toISOString());
  return { enviados: pendentes.length, recebidos };
}
