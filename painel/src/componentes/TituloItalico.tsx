// Título de página no estilo editorial: a primeira palavra em itálico ("<i>Visão</i> geral").
export function TituloItalico({ texto }: { texto: string }) {
  const [primeira, ...resto] = texto.split(' ');
  return <><i>{primeira}</i>{resto.length > 0 && ` ${resto.join(' ')}`}</>;
}
