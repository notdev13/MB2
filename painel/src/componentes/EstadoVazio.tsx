import type { ReactNode } from 'react';
import { Icone, type NomeIcone } from './Icone';

// Estado vazio: ícone fino, título em serifa, uma frase do próximo passo e as ações (botões) em `children`.
// Serve às duas interfaces; o desktop só muda o layout por CSS (`.dk .ev`).
export function EstadoVazio({ icone, titulo, texto, children }: {
  icone: NomeIcone;
  titulo: string;
  texto: string;
  children?: ReactNode;
}) {
  return (
    <div className="ev">
      <span className="ev-icone"><Icone nome={icone} tamanho={30} espessura={1.25} /></span>
      <div className="ev-texto">
        <h3>{titulo}</h3>
        <p>{texto}</p>
        {children && <div className="ev-acoes">{children}</div>}
      </div>
    </div>
  );
}
