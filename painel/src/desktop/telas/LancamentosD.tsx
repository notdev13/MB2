import { useDados } from '../../dados/contexto';
import type { Custo } from '../../dominio/tipos';
import { Painel } from '../componentes/Base';
import { TabelaLancamentos } from '../componentes/TabelaLancamentos';

export const ID_BUSCA = 'busca-lancamentos';

export function LancamentosD({ aoAbrirCusto }: { aoAbrirCusto: (c: Custo) => void }) {
  const { obras, custos } = useDados();
  return (
    <Painel semPadding>
      <TabelaLancamentos custos={custos} obras={obras} aoAbrir={aoAbrirCusto} idBusca={ID_BUSCA} />
    </Painel>
  );
}
