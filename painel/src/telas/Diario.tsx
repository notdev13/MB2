import { useEffect, useMemo, useState } from 'react';
import { EstadoVazio } from '../componentes/EstadoVazio';
import { Folha } from '../componentes/Folha';
import { useDados } from '../dados/contexto';
import { baixarArquivo } from '../dados/baixar';
import { protegerArmazenamento } from '../dados/diario';
import { useDiario, useUrlMidia } from '../dados/useDiario';
import { agruparPorDia, diarioEmTexto, duracaoLegivel, tamanhoLegivel, type MidiaDiario, type RegistroDiario } from '../dominio/diario';
import { dataBR } from '../dominio/formato';

// Linha do tempo do diário: por dia, com filtro de obra. Tocar no texto edita; tocar na mídia abre.
export function Diario({ aoNovo, aoEditar }: { aoNovo: (obraId?: string) => void; aoEditar: (r: RegistroDiario) => void }) {
  const { obras } = useDados();
  const { registros, carregado, erro } = useDiario();
  const [obraId, setObraId] = useState<string>('');
  const [aberta, setAberta] = useState<MidiaDiario | null>(null);
  const [espaco, setEspaco] = useState<{ usado: number | null; cota: number | null; persistente: boolean } | null>(null);
  useEffect(() => { if (registros.some((r) => r.midias.length)) protegerArmazenamento().then(setEspaco).catch(() => {}); }, [registros]);

  const dias = useMemo(() => agruparPorDia(registros, obraId || null), [registros, obraId]);
  const nome = (id: string) => obras.find((o) => o.id === id)?.nome ?? 'Obra excluída';
  const comRegistro = obras.filter((o) => registros.some((r) => r.obraId === o.id));

  function exportar() {
    const texto = diarioEmTexto(dias, nome, dataBR);
    baixarArquivo(`diario-mb2${obraId ? '-' + nome(obraId).toLowerCase().replace(/\s+/g, '-') : ''}.txt`, texto, 'text/plain;charset=utf-8');
  }

  if (erro) return <div className="aviso" role="alert">{erro}</div>;
  if (!carregado) return null;

  return (
    <div className="diario">
      <button className="botao cheio" onClick={() => aoNovo(obraId || undefined)}>Registrar o dia</button>
      {comRegistro.length > 0 && (
        <div className="chips" role="group" aria-label="Filtrar por obra">
          <button className="chip" aria-pressed={!obraId} onClick={() => setObraId('')}>Todas</button>
          {comRegistro.map((o) => <button key={o.id} className="chip" aria-pressed={obraId === o.id} onClick={() => setObraId(o.id)}>{o.nome}</button>)}
        </div>
      )}
      {dias.length === 0 && (
        <EstadoVazio icone="diario" titulo="Nenhum registro ainda"
          texto="Fale ou escreva o resumo do dia e junte fotos e vídeos curtos da obra." />
      )}
      {dias.map((d) => (
        <section key={d.data} className="dia">
          <h2 className="dia-data">{dataBR(d.data)}</h2>
          <div className="lista">
            {d.registros.map((r) => (
              <article key={r.id} className="cartao registro">
                <button className="registro-texto" onClick={() => aoEditar(r)} aria-label={`Editar registro de ${nome(r.obraId)}`}>
                  <span className="rotulo">{nome(r.obraId)}</span>
                  {r.resumo ? <p>{r.resumo}</p> : <p className="nota">Sem texto</p>}
                </button>
                {r.midias.length > 0 && (
                  <div className="grade-midias">
                    {r.midias.map((m) => <Miniatura key={m.id} m={m} aoAbrir={() => setAberta(m)} />)}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
      {dias.length > 0 && (
        <div className="diario-pe">
          <button className="botao secundario" onClick={exportar}>Exportar texto do diário</button>
          <p className="nota">
            O diário fica guardado neste aparelho e ainda não entra no backup nem na sincronização. Para guardar fotos e vídeos fora daqui, abra cada um e toque em Baixar.
            {espaco?.usado != null && <> Espaço usado pelo painel: {tamanhoLegivel(espaco.usado)}{espaco.cota ? ` de ${tamanhoLegivel(espaco.cota)} disponíveis` : ''}.</>}
          </p>
        </div>
      )}
      {aberta && <VerMidia m={aberta} aoFechar={() => setAberta(null)} />}
    </div>
  );
}

function Miniatura({ m, aoAbrir }: { m: MidiaDiario; aoAbrir: () => void }) {
  const url = useUrlMidia(m.id);
  return (
    <button className="midia" onClick={aoAbrir} aria-label={m.tipo === 'foto' ? 'Ver foto' : 'Ver vídeo'}>
      {url && (m.tipo === 'foto' ? <img src={url} alt="" loading="lazy" /> : <video src={url + '#t=0.1'} muted playsInline preload="metadata" />)}
      {m.tipo === 'video' && <span className="duracao">▶ {duracaoLegivel(m.duracaoSeg)}</span>}
    </button>
  );
}

function VerMidia({ m, aoFechar }: { m: MidiaDiario; aoFechar: () => void }) {
  const { arquivo } = useDiario();
  const url = useUrlMidia(m.id);
  async function baixar() {
    const b = await arquivo(m.id);
    if (!b) return;
    const ext = m.tipo === 'foto' ? (m.mime.includes('png') ? 'png' : m.mime.includes('heic') ? 'heic' : 'jpg') : (m.mime.includes('mp4') ? 'mp4' : 'mov');
    baixarArquivo(`diario-mb2-${m.id.slice(0, 8)}.${ext}`, b, b.type || m.mime);
  }
  return (
    <Folha titulo={m.tipo === 'foto' ? 'Foto' : 'Vídeo'} aoFechar={aoFechar}>
      <div className="ver-midia">
        {url && (m.tipo === 'foto' ? <img src={url} alt="Foto do diário" /> : <video src={url} controls playsInline autoPlay />)}
      </div>
      <p className="nota" style={{ textAlign: 'center' }}>{tamanhoLegivel(m.bytes)}{m.duracaoSeg ? ` · ${duracaoLegivel(m.duracaoSeg)}` : ''}</p>
      <div className="acoes"><button className="botao secundario cheio" onClick={baixar}>Baixar</button></div>
    </Folha>
  );
}
