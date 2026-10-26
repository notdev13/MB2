import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

// Mensagem curta que aparece por alguns segundos ("Custo lançado").
const Contexto = createContext<(texto: string) => void>(() => {});

export function AvisoProvider({ children }: { children: ReactNode }) {
  const [texto, setTexto] = useState<string | null>(null);
  const timer = useRef<number>(undefined);
  const avisar = useCallback((t: string) => {
    setTexto(t);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setTexto(null), 2600);
  }, []);
  return (
    <Contexto.Provider value={avisar}>
      {children}
      {texto && <div className="toast" role="status">{texto}</div>}
    </Contexto.Provider>
  );
}

export const useAviso = () => useContext(Contexto);
