import { useEffect, useState } from 'react';

export type Tema = 'claro' | 'escuro';
const CHAVE = 'mb2-tema';
const COR_BARRA: Record<Tema, string> = { claro: '#F3F4F2', escuro: '#0D0C0B' };

function inicial(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE);
    if (salvo === 'claro' || salvo === 'escuro') return salvo;
  } catch { /* sem armazenamento: segue o sistema */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro';
}

export function useTema(): [Tema, () => void] {
  const [tema, setTema] = useState<Tema>(inicial);
  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COR_BARRA[tema]);
  }, [tema]);
  const alternar = () => {
    const novo: Tema = tema === 'claro' ? 'escuro' : 'claro';
    setTema(novo);
    try { localStorage.setItem(CHAVE, novo); } catch { /* ignora */ }
  };
  return [tema, alternar];
}
