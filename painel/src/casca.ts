import { useSyncExternalStore } from 'react';

// Qual "casca" do painel mostrar. Celular e computador usam os mesmos dados e as mesmas regras
// (src/dominio, src/dados); só a interface muda. Telas largas com mouse ganham a versão desktop.
export type Casca = 'celular' | 'desktop';

const CONSULTA = '(min-width: 1024px) and (hover: hover)';

function assinar(avisar: () => void) {
  const mq = window.matchMedia(CONSULTA);
  mq.addEventListener('change', avisar);
  return () => mq.removeEventListener('change', avisar);
}

const atual = (): Casca => (window.matchMedia(CONSULTA).matches ? 'desktop' : 'celular');

export const useCasca = () => useSyncExternalStore(assinar, atual, atual);
