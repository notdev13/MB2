import type { ReactNode } from 'react';
import { IconeD } from './Base';

// Tabela densa do desktop: cabeçalho fixo, números alinhados à direita, linha clicável
// (mouse ou Enter no teclado) e ordenação pelo cabeçalho.
export interface Coluna<T> {
  chave: string;
  titulo: string;
  render: (linha: T) => ReactNode;
  numero?: boolean; // alinha à direita, algarismos de largura fixa
  largura?: string;
  ordenavel?: boolean;
}

export interface Ordem {
  chave: string;
  direcao: 'asc' | 'desc';
}

export function Tabela<T>({ colunas, linhas, chaveLinha, aoClicar, ordem, aoOrdenar, rodape, rotulo }: {
  colunas: Coluna<T>[];
  linhas: T[];
  chaveLinha: (l: T) => string;
  aoClicar?: (l: T) => void;
  ordem?: Ordem;
  aoOrdenar?: (o: Ordem) => void;
  rodape?: ReactNode;
  rotulo: string;
}) {
  const ordenar = (chave: string) => {
    if (!aoOrdenar) return;
    const direcao = ordem?.chave === chave && ordem.direcao === 'desc' ? 'asc' : 'desc';
    aoOrdenar({ chave, direcao });
  };
  return (
    <div className="d-tabela-caixa">
      <table className="d-tabela" aria-label={rotulo}>
        <colgroup>{colunas.map((c) => <col key={c.chave} style={c.largura ? { width: c.largura } : undefined} />)}</colgroup>
        <thead>
          <tr>
            {colunas.map((c) => {
              const ativa = ordem?.chave === c.chave;
              return (
                <th key={c.chave} className={c.numero ? 'num' : undefined}
                  aria-sort={ativa ? (ordem!.direcao === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {c.ordenavel && aoOrdenar ? (
                    <button type="button" onClick={() => ordenar(c.chave)} className={ativa ? 'ativa' : undefined}>
                      {c.titulo}
                      <span className="d-seta-ordem">{ativa && <IconeD nome={ordem!.direcao === 'asc' ? 'acima' : 'abaixo'} tamanho={12} />}</span>
                    </button>
                  ) : c.titulo}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={chaveLinha(l)} className={aoClicar ? 'clicavel' : undefined}
              tabIndex={aoClicar ? 0 : undefined}
              onClick={aoClicar && (() => aoClicar(l))}
              onKeyDown={aoClicar && ((e) => { if (e.key === 'Enter') aoClicar(l); })}>
              {colunas.map((c) => <td key={c.chave} className={c.numero ? 'num' : undefined}>{c.render(l)}</td>)}
            </tr>
          ))}
        </tbody>
        {rodape && <tfoot>{rodape}</tfoot>}
      </table>
    </div>
  );
}
