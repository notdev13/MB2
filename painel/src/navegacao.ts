import { useEffect, useState } from 'react';

// Rotas pelo "#" do endereço: o botão voltar do navegador e o gesto de voltar funcionam.
export type Rota =
  | { tela: 'visao' }
  | { tela: 'obras' }
  | { tela: 'obra'; id: string }
  | { tela: 'ajustes' };

export function lerRota(hash: string): Rota {
  const [caminho] = hash.replace(/^#\/?/, '').split('?');
  const [tela, id] = caminho.split('/');
  if (tela === 'obras') return { tela: 'obras' };
  if (tela === 'obra' && id) return { tela: 'obra', id: decodeURIComponent(id) };
  if (tela === 'ajustes') return { tela: 'ajustes' };
  return { tela: 'visao' };
}

export function linkPara(r: Rota): string {
  return r.tela === 'obra' ? `#/obra/${encodeURIComponent(r.id)}` : `#/${r.tela}`;
}

export const ir = (r: Rota) => {
  window.location.hash = linkPara(r);
};

export function useRota(): Rota {
  const [rota, setRota] = useState(() => lerRota(window.location.hash));
  useEffect(() => {
    const mudar = () => {
      setRota(lerRota(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', mudar);
    return () => window.removeEventListener('hashchange', mudar);
  }, []);
  return rota;
}
