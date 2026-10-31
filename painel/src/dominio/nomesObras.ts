import type { Obra } from './tipos';

// Nomes oficiais das obras da MB2. A chave é a identificação interna (gerada a partir da planilha),
// que nunca muda: assim o nome se corrige sem duplicar obra ao restaurar backup antigo.
export const NOMES_OFICIAIS: Record<string, string> = {
  '1fed01f3-ba89-5a16-befb-19f9c727e4e2': 'Jardim Campeche Geminada 39',
  '070328cc-6421-5e04-bcc4-04a68b587c73': 'Laureano',
  '9b73ce64-485e-5dff-9f11-913a24008c27': 'Ecovillas',
  '8b817b6f-76e8-5975-9921-895f3f072f75': 'Olindina Maria Lopes',
  '67bf04ed-754f-58f5-ac65-15109e8c9be1': 'João Batista Pires',
};

// Obras (já existentes no aparelho) cujo nome difere do oficial.
export function obrasParaRenomear(obras: Obra[]): Obra[] {
  return obras.filter((o) => NOMES_OFICIAIS[o.id] && NOMES_OFICIAIS[o.id] !== o.nome);
}
