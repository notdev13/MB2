import { useEffect, useState } from 'react';

// Rotas da versão para computador. Mesmo formato de endereço do celular (#/obras, #/obra/id…),
// para um link servir nas duas; "Lançamentos" só existe aqui (no celular, cai na visão geral).
export type RotaD =
  | { tela: 'visao' }
  | { tela: 'obras' }
  | { tela: 'obra'; id: string }
  | { tela: 'lancamentos' }
  | { tela: 'contas' }
  | { tela: 'ajustes' };

export function lerRotaD(hash: string): RotaD {
  const [caminho] = hash.replace(/^#\/?/, '').split('?');
  const [tela, id] = caminho.split('/');
  if (tela === 'obras') return { tela: 'obras' };
  if (tela === 'obra' && id) return { tela: 'obra', id: decodeURIComponent(id) };
  if (tela === 'lancamentos') return { tela: 'lancamentos' };
  if (tela === 'contas') return { tela: 'contas' };
  if (tela === 'ajustes') return { tela: 'ajustes' };
  return { tela: 'visao' };
}

export const linkD = (r: RotaD) => (r.tela === 'obra' ? `#/obra/${encodeURIComponent(r.id)}` : `#/${r.tela}`);

export const irD = (r: RotaD) => {
  window.location.hash = linkD(r);
};

export function useRotaD(): RotaD {
  const [rota, setRota] = useState(() => lerRotaD(window.location.hash));
  useEffect(() => {
    const mudar = () => {
      setRota(lerRotaD(window.location.hash));
      document.querySelector('.d-conteudo')?.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', mudar);
    return () => window.removeEventListener('hashchange', mudar);
  }, []);
  return rota;
}
