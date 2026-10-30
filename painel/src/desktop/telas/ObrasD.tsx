import { useMemo, useState } from 'react';
import { useDados } from '../../dados/contexto';
import { resumirObra, type ResumoObra } from '../../dominio/calculos';
import { normalizar } from '../../dominio/consultas';
import { EstadoVazio } from '../../componentes/EstadoVazio';
import { dataBR, reais } from '../../dominio/formato';
import { STATUS_OBRA, type StatusObra } from '../../dominio/tipos';
import { IconeD, Painel, SeloStatus } from '../componentes/Base';
import { UsoOrcamento } from '../componentes/Graficos';
import { Tabela, type Ordem } from '../componentes/Tabela';
import { irD } from '../rotas';

type FiltroStatus = 'abertas' | StatusObra | 'todas';

const ORDENS: Record<string, (a: ResumoObra, b: ResumoObra) => number> = {
  nome: (a, b) => a.obra.nome.localeCompare(b.obra.nome, 'pt-BR'),
  gasto: (a, b) => a.gasto - b.gasto,
  orcamento: (a, b) => a.obra.orcamento - b.obra.orcamento,
  saldo: (a, b) => a.saldo - b.saldo,
  aPagar: (a, b) => a.aPagar - b.aPagar,
  ultimo: (a, b) => (a.ultimoLancamento ?? '').localeCompare(b.ultimoLancamento ?? ''),
};

export function ObrasD({ aoNovaObra }: { aoNovaObra: () => void }) {
  const { obras, custos } = useDados();
  const [status, setStatus] = useState<FiltroStatus>('abertas');
  const [busca, setBusca] = useState('');
  const [ordem, setOrdem] = useState<Ordem>({ chave: 'gasto', direcao: 'desc' });

  const linhas = useMemo(() => {
    const termo = normalizar(busca);
    const lista = obras
      .filter((o) => status === 'todas' || (status === 'abertas' ? o.status !== 'concluida' : o.status === status))
      .filter((o) => !termo || normalizar(`${o.nome} ${o.endereco} ${o.cliente}`).includes(termo))
      .map((o) => resumirObra(o, custos));
    const sinal = ordem.direcao === 'asc' ? 1 : -1;
    return lista.sort((a, b) => sinal * ORDENS[ordem.chave](a, b));
  }, [obras, custos, status, busca, ordem]);

  const contagem = (s: FiltroStatus) =>
    s === 'todas' ? obras.length : obras.filter((o) => (s === 'abertas' ? o.status !== 'concluida' : o.status === s)).length;

  if (obras.length === 0) {
    return (
      <EstadoVazio icone="obras" titulo="Nenhuma obra cadastrada"
        texto="Cadastre a primeira obra para começar a lançar custos.">
        <button className="d-botao primario" onClick={aoNovaObra}>Cadastrar obra</button>
      </EstadoVazio>
    );
  }

  return (
    <Painel semPadding>
      <div className="d-filtros com-borda">
        <div className="d-segmentos" role="group" aria-label="Filtrar por status">
          {(['abertas', 'em_andamento', 'planejamento', 'pausada', 'concluida', 'todas'] as FiltroStatus[]).map((s) => (
            <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}>
              {s === 'abertas' ? 'Em aberto' : s === 'todas' ? 'Todas' : STATUS_OBRA[s]}
              <span className="d-contagem">{contagem(s)}</span>
            </button>
          ))}
        </div>
        <label className="d-busca estreita">
          <IconeD nome="busca" tamanho={16} />
          <input type="search" placeholder="Buscar obra, endereço ou cliente" value={busca}
            onChange={(e) => setBusca(e.target.value)} aria-label="Buscar obras" />
        </label>
      </div>
      {linhas.length === 0 ? (
        <EstadoVazio icone="filtro" titulo="Nenhuma obra aqui"
          texto="Nenhuma obra combina com o filtro ou a busca. Veja todas para encontrar o que procura.">
          <button type="button" className="d-botao secundario" onClick={() => { setStatus('todas'); setBusca(''); }}>Ver todas</button>
        </EstadoVazio>
      ) : (
        <Tabela<ResumoObra> rotulo="Obras" linhas={linhas} chaveLinha={(r) => r.obra.id} ordem={ordem} aoOrdenar={setOrdem}
          aoClicar={(r) => irD({ tela: 'obra', id: r.obra.id })}
          colunas={[
            { chave: 'nome', titulo: 'Obra', ordenavel: true, render: (r) => (
              <span className="d-duas-linhas">
                <strong className="d-corta">{r.obra.nome}</strong>
                {(r.obra.endereco || r.obra.cliente) && (
                  <small className="d-corta">{[r.obra.endereco, r.obra.cliente].filter(Boolean).join(' · ')}</small>
                )}
              </span>
            ) },
            { chave: 'status', titulo: 'Status', render: (r) => <SeloStatus status={r.obra.status} />, largura: '128px' },
            { chave: 'uso', titulo: 'Uso do orçamento', render: (r) => <UsoOrcamento gasto={r.gasto} orcamento={r.obra.orcamento} />, largura: '200px' },
            { chave: 'orcamento', titulo: 'Orçamento', ordenavel: true, numero: true, largura: '140px',
              render: (r) => r.obra.orcamento > 0 ? reais(r.obra.orcamento) : <span className="d-apagado">—</span> },
            { chave: 'gasto', titulo: 'Gasto', ordenavel: true, numero: true, largura: '140px', render: (r) => reais(r.gasto) },
            { chave: 'aPagar', titulo: 'A pagar', ordenavel: true, numero: true, largura: '124px',
              render: (r) => r.aPagar > 0 ? reais(r.aPagar) : <span className="d-apagado">—</span> },
            { chave: 'ultimo', titulo: 'Último lanç.', ordenavel: true, largura: '116px', render: (r) => dataBR(r.ultimoLancamento) },
          ]} />
      )}
    </Painel>
  );
}
