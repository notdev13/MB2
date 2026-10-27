import { useMemo, useState } from 'react';
import { soma } from '../../dominio/calculos';
import { filtrarCustos, ordenarCustos, type CampoOrdem, type FiltroCustos, type Situacao } from '../../dominio/consultas';
import { dataBR, reais } from '../../dominio/formato';
import { CATEGORIAS, FORMAS_PAGAMENTO, type Categoria, type Custo, type Obra } from '../../dominio/tipos';
import { IconeD, Vazio } from './Base';
import { Tabela, type Coluna, type Ordem } from './Tabela';

const POR_PAGINA = 100;

// Lançamentos com barra de filtros, ordenação, total do que está filtrado e "mostrar mais".
// Com `obras`, mostra a coluna e o filtro de obra (tela geral); sem, é a lista de uma obra só.
export function TabelaLancamentos({ custos, obras, aoAbrir, idBusca }: {
  custos: Custo[];
  obras?: Obra[];
  aoAbrir: (c: Custo) => void;
  idBusca?: string;
}) {
  const [filtro, setFiltro] = useState<FiltroCustos>({ situacao: 'todos' });
  const [ordem, setOrdem] = useState<Ordem>({ chave: 'data', direcao: 'desc' });
  const [limite, setLimite] = useState(POR_PAGINA);

  const mudar = (f: Partial<FiltroCustos>) => {
    setFiltro((atual) => ({ ...atual, ...f }));
    setLimite(POR_PAGINA);
  };
  const filtrados = useMemo(
    () => ordenarCustos(filtrarCustos(custos, filtro), ordem.chave as CampoOrdem, ordem.direcao),
    [custos, filtro, ordem],
  );
  const nomeObra = useMemo(() => new Map(obras?.map((o) => [o.id, o.nome])), [obras]);
  const temFiltro = !!(filtro.obraId || filtro.categoria || filtro.de || filtro.ate || filtro.busca ||
    (filtro.situacao && filtro.situacao !== 'todos'));

  const colunas: Coluna<Custo>[] = [
    { chave: 'data', titulo: 'Data', render: (c) => dataBR(c.data), largura: '104px', ordenavel: true },
    ...(obras ? [{ chave: 'obra', titulo: 'Obra', render: (c: Custo) => <span className="d-corta">{nomeObra.get(c.obraId)}</span>, largura: '16%' }] : []),
    { chave: 'descricao', titulo: 'Descrição', render: (c) => <span className="d-corta forte">{c.descricao || '—'}</span>, ordenavel: true },
    { chave: 'categoria', titulo: 'Categoria', render: (c) => <span className="categoria d-corta" title={c.categoria}>{c.categoria}</span>, largura: '156px', ordenavel: true },
    { chave: 'fornecedor', titulo: 'Fornecedor', render: (c) => <span className="d-corta">{c.fornecedor || '—'}</span>, largura: '13%', ordenavel: true },
    { chave: 'pagamento', titulo: 'Pagamento', render: (c) => FORMAS_PAGAMENTO[c.pagamento], largura: '104px' },
    { chave: 'pago', titulo: 'Situação', render: (c) => c.pago ? <span className="d-apagado">Pago</span> : <span className="selo pendente">A pagar</span>, largura: '92px' },
    { chave: 'valor', titulo: 'Valor', render: (c) => reais(c.valor), numero: true, largura: '136px', ordenavel: true },
  ];

  return (
    <>
      <div className="d-filtros" role="search">
        <label className="d-busca">
          <IconeD nome="busca" tamanho={16} />
          <input id={idBusca} type="search" placeholder="Buscar descrição ou fornecedor" value={filtro.busca ?? ''}
            onChange={(e) => mudar({ busca: e.target.value })} aria-label="Buscar lançamentos" />
        </label>
        {obras && (
          <select className="d-select" value={filtro.obraId ?? ''} onChange={(e) => mudar({ obraId: e.target.value || undefined })} aria-label="Obra">
            <option value="">Todas as obras</option>
            {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        )}
        <select className="d-select" value={filtro.categoria ?? ''} aria-label="Categoria"
          onChange={(e) => mudar({ categoria: (e.target.value || undefined) as Categoria | undefined })}>
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="d-select" value={filtro.situacao} aria-label="Situação" onChange={(e) => mudar({ situacao: e.target.value as Situacao })}>
          <option value="todos">Pagos e a pagar</option>
          <option value="pago">Só pagos</option>
          <option value="a_pagar">Só a pagar</option>
        </select>
        <span className="d-periodo">
          <input type="date" className="d-select" value={filtro.de ?? ''} onChange={(e) => mudar({ de: e.target.value || undefined })} aria-label="De" />
          <span>até</span>
          <input type="date" className="d-select" value={filtro.ate ?? ''} onChange={(e) => mudar({ ate: e.target.value || undefined })} aria-label="Até" />
        </span>
        {temFiltro && (
          <button type="button" className="d-botao fantasma pequeno" onClick={() => { setFiltro({ situacao: 'todos' }); setLimite(POR_PAGINA); }}>
            <IconeD nome="limpar" tamanho={14} /> Limpar filtros
          </button>
        )}
      </div>

      {filtrados.length === 0 ? (
        <Vazio titulo={custos.length ? 'Nada encontrado' : 'Nenhum lançamento ainda'}
          texto={custos.length ? 'Mude ou limpe os filtros para ver os lançamentos.' : 'Use “Lançar custo” para registrar o primeiro gasto.'} />
      ) : (
        <Tabela rotulo="Lançamentos" colunas={colunas} linhas={filtrados.slice(0, limite)} chaveLinha={(c) => c.id}
          aoClicar={aoAbrir} ordem={ordem} aoOrdenar={setOrdem}
          rodape={
            <tr>
              <td colSpan={colunas.length - 1}>
                {filtrados.length} lançamento{filtrados.length > 1 ? 's' : ''}{temFiltro ? ' no filtro' : ''}
                {filtrados.length > limite && ` · mostrando ${limite}`}
              </td>
              <td className="num">{reais(soma(filtrados))}</td>
            </tr>
          } />
      )}
      {filtrados.length > limite && (
        <div className="d-mais">
          <button type="button" className="d-botao secundario" onClick={() => setLimite((l) => l + POR_PAGINA)}>
            Mostrar mais {Math.min(POR_PAGINA, filtrados.length - limite)}
          </button>
        </div>
      )}
    </>
  );
}
