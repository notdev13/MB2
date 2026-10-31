import { useRef, useState } from 'react';
import { useDados } from '../dados/contexto';
import { protegerArmazenamento } from '../dados/diario';
import { useDiario, useUrlMidia } from '../dados/useDiario';
import { conferirMidia, duracaoLegivel, LIMITES_DIARIO, MENSAGEM_PROBLEMA, registroVazio, tamanhoLegivel, tipoDaMidia,
  type MidiaDiario, type RegistroDiario } from '../dominio/diario';
import { hoje } from '../dominio/formato';
import { useAviso } from './Aviso';
import { useConfirmar } from './Confirmar';
import { Falar } from './Falar';
import { Folha } from './Folha';
import { Icone } from './Icone';
import { comprimirFoto, lerVideo } from './midiaDiario';

const CHAVE_ULTIMA_OBRA = 'mb2-ultima-obra';
const ultimaObra = () => { try { return localStorage.getItem(CHAVE_ULTIMA_OBRA) ?? ''; } catch { return ''; } };

// Novo registro do diário (ou edição): obra, data, resumo falado/escrito, fotos e vídeos curtos.
export function FormDiario({ registro, obraId, aoFechar }: { registro?: RegistroDiario; obraId?: string; aoFechar: () => void }) {
  const { obras } = useDados();
  const { salvar, excluir } = useDiario();
  const avisar = useAviso();
  const confirmar = useConfirmar();
  const abertas = obras.filter((o) => o.status !== 'concluida' || o.id === registro?.obraId || o.id === obraId);
  const inicial = registro?.obraId ?? obraId ?? (abertas.some((o) => o.id === ultimaObra()) ? ultimaObra() : abertas[0]?.id ?? '');

  const [obra, setObra] = useState(inicial);
  const [data, setData] = useState(registro?.data ?? hoje());
  const [resumo, setResumo] = useState(registro?.resumo ?? '');
  const [midias, setMidias] = useState<MidiaDiario[]>(registro?.midias ?? []);
  const [novos, setNovos] = useState<Record<string, Blob>>({});
  const [preparando, setPreparando] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [tentou, setTentou] = useState(false);
  const camera = useRef<HTMLInputElement>(null);
  const video = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);

  async function adicionar(lista: FileList | null) {
    if (!lista?.length) return;
    const arquivos = [...lista];
    setPreparando((n) => n + arquivos.length);
    let total = midias.length;
    for (const arq of arquivos) {
      try {
        const tipo = tipoDaMidia(arq.type || (/\.(mov|mp4|m4v)$/i.test(arq.name) ? 'video/quicktime' : 'image/jpeg'));
        const info = tipo === 'video' ? await lerVideo(arq) : null;
        const problema = conferirMidia({ mime: arq.type || (tipo === 'video' ? 'video/quicktime' : 'image/jpeg'), bytes: arq.size, duracaoSeg: info?.duracaoSeg }, total);
        if (problema) { avisar(MENSAGEM_PROBLEMA[problema]); continue; }
        const id = crypto.randomUUID();
        let m: MidiaDiario;
        let blob: Blob;
        if (tipo === 'foto') {
          const f = await comprimirFoto(arq);
          blob = f.blob;
          m = { id, tipo: 'foto', mime: blob.type || arq.type || 'image/jpeg', bytes: blob.size, duracaoSeg: null, largura: f.largura, altura: f.altura };
        } else {
          blob = arq;
          m = { id, tipo: 'video', mime: arq.type || 'video/quicktime', bytes: arq.size, duracaoSeg: info?.duracaoSeg ?? null, largura: info?.largura ?? null, altura: info?.altura ?? null };
        }
        total++;
        setNovos((n) => ({ ...n, [id]: blob }));
        setMidias((ms) => [...ms, m]);
      } catch (e) {
        avisar('Não foi possível usar este arquivo: ' + String(e));
      } finally {
        setPreparando((n) => n - 1);
      }
    }
  }

  async function tirar(m: MidiaDiario) {
    if (!(await confirmar({ texto: m.tipo === 'foto' ? 'Tirar esta foto do registro?' : 'Tirar este vídeo do registro?', acao: 'Tirar', perigo: true }))) return;
    setMidias((ms) => ms.filter((x) => x.id !== m.id));
    setNovos((n) => { const c = { ...n }; delete c[m.id]; return c; });
  }

  const erroObra = obra ? null : 'Escolha a obra.';
  const vazio = registroVazio(resumo, midias.length);

  async function gravar() {
    setTentou(true);
    if (erroObra || vazio || !data || salvando || preparando > 0) return;
    setSalvando(true);
    try {
      await salvar({ obraId: obra, data, resumo: resumo.trim().slice(0, LIMITES_DIARIO.resumoMaxCaracteres), midias }, novos, registro?.id);
      try { localStorage.setItem(CHAVE_ULTIMA_OBRA, obra); } catch { /* só não lembra */ }
      if (midias.length) protegerArmazenamento().catch(() => {});
      avisar(registro ? 'Registro atualizado' : 'Registro salvo no diário');
      aoFechar();
    } catch (e) {
      const cheio = /quota|espaço|space/i.test(String(e));
      avisar(cheio ? 'O aparelho está sem espaço para guardar. Tire alguns vídeos ou libere espaço no iPhone.' : 'Não foi possível salvar: ' + String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function apagar() {
    if (!registro || !(await confirmar({ texto: 'Excluir este registro do diário, com as fotos e vídeos?', acao: 'Excluir', perigo: true }))) return;
    try { await excluir(registro.id); avisar('Registro excluído'); aoFechar(); } catch (e) { avisar('Não foi possível excluir: ' + String(e)); }
  }

  if (obras.length === 0) {
    return (
      <Folha titulo="Diário da obra" aoFechar={aoFechar}>
        <div className="vazio">
          <h3>Cadastre uma obra primeiro</h3>
          <p>O diário é registrado sempre dentro de uma obra.</p>
          <a className="botao" href="#/obras?nova=1" onClick={aoFechar}>Cadastrar obra</a>
        </div>
      </Folha>
    );
  }

  const bytesTotal = midias.reduce((s, m) => s + m.bytes, 0);

  return (
    <Folha titulo={registro ? 'Editar registro' : 'Registrar o dia'} aoFechar={aoFechar}>
      <form className="form-diario" onSubmit={(e) => { e.preventDefault(); gravar(); }} noValidate>
        <label className="campo">
          <span>Obra</span>
          <select value={obra} onChange={(e) => setObra(e.target.value)}>
            {!obra && <option value="">Escolha…</option>}
            {abertas.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
          {tentou && erroObra && <span className="erro">{erroObra}</span>}
        </label>
        <label className="campo">
          <span>Data</span>
          <input type="date" value={data} max={hoje()} onChange={(e) => setData(e.target.value)} required />
        </label>
        <Falar aoEntender={(t) => setResumo(t)} rotulo="Fale ou escreva o resumo do dia"
          exemplo="Ex.: hoje concretamos a laje, a equipe do Adriano fechou as paredes do segundo andar"
          fraseOuvindo="Ouvindo… conte o que foi feito, quem trabalhou e o que faltou. Toque no microfone para terminar."
          rotuloBotao="Usar este texto no resumo" />
        <label className="campo">
          <span>Resumo do dia</span>
          <textarea rows={5} value={resumo} maxLength={LIMITES_DIARIO.resumoMaxCaracteres} onChange={(e) => setResumo(e.target.value)}
            placeholder="O que foi feito, quem trabalhou, material que chegou, problemas…" />
        </label>

        <div className="campo">
          <span>Fotos e vídeos</span>
          <div className="diario-botoes">
            <button type="button" className="botao secundario" onClick={() => camera.current?.click()}>Tirar foto</button>
            <button type="button" className="botao secundario" onClick={() => video.current?.click()}>Gravar vídeo</button>
            <button type="button" className="botao secundario" onClick={() => galeria.current?.click()}>Da galeria</button>
          </div>
          <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { adicionar(e.target.files); e.target.value = ''; }} />
          <input ref={video} type="file" accept="video/*" capture="environment" hidden onChange={(e) => { adicionar(e.target.files); e.target.value = ''; }} />
          <input ref={galeria} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => { adicionar(e.target.files); e.target.value = ''; }} />
          <p className="nota">Vídeos de até {LIMITES_DIARIO.videoMaxSeg} segundos. As fotos são reduzidas para ocupar menos espaço. Tudo fica guardado neste aparelho.</p>
          {preparando > 0 && <p className="nota" role="status">Preparando {preparando === 1 ? 'arquivo' : `${preparando} arquivos`}…</p>}
          {midias.length > 0 && (
            <>
              <div className="grade-midias">
                {midias.map((m) => <MiniaturaEdicao key={m.id} m={m} blob={novos[m.id]} aoTirar={() => tirar(m)} />)}
              </div>
              <p className="nota">{midias.length} de {LIMITES_DIARIO.midiasPorRegistro} · {tamanhoLegivel(bytesTotal)}</p>
            </>
          )}
        </div>

        {tentou && vazio && <div className="aviso" role="alert">Escreva o resumo ou adicione uma foto ou vídeo.</div>}
        <div className="acoes">
          <button className={'botao cheio' + (salvando ? ' carregando' : '')} type="submit" disabled={salvando || preparando > 0}>
            {salvando ? 'Salvando…' : preparando > 0 ? 'Preparando…' : 'Salvar no diário'}
          </button>
          {registro && <button className="botao perigo cheio" type="button" onClick={apagar}>Excluir registro</button>}
        </div>
      </form>
    </Folha>
  );
}

function MiniaturaEdicao({ m, blob, aoTirar }: { m: MidiaDiario; blob?: Blob; aoTirar: () => void }) {
  const url = useUrlMidia(blob ? null : m.id, blob);
  return (
    <div className="midia">
      {url && (m.tipo === 'foto'
        ? <img src={url} alt="" />
        : <video src={url + '#t=0.1'} muted playsInline preload="metadata" />)}
      {m.tipo === 'video' && <span className="duracao">▶ {duracaoLegivel(m.duracaoSeg)}</span>}
      <button type="button" className="tirar" onClick={aoTirar} aria-label={m.tipo === 'foto' ? 'Tirar foto' : 'Tirar vídeo'}>
        <Icone nome="fechar" tamanho={14} />
      </button>
    </div>
  );
}
