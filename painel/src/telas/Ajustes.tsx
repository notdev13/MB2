import { useEffect, useRef, useState } from 'react';
import { useAviso } from '../componentes/Aviso';
import { useConfirmar } from '../componentes/Confirmar';
import { useDados } from '../dados/contexto';
import { custosEmCsv, validarBackup } from '../dados/backup';
import { dataBR, hoje, quando } from '../dominio/formato';
import type { Tema } from '../tema';

const instalado = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

// Entrega um arquivo ao usuário: no iPhone abre a folha de compartilhar (salvar em Arquivos,
// mandar por WhatsApp/e-mail); onde não houver, baixa o arquivo.
// Devolve false se a pessoa cancelou.
async function entregarArquivo(nome: string, conteudo: string, tipo: string): Promise<boolean> {
  const arquivo = new File([conteudo], nome, { type: tipo });
  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: nome });
      return true;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return false;
      // NotAllowedError e outros: segue para o download
    }
  }
  const url = URL.createObjectURL(arquivo);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

// Liga este aparelho à nuvem: o que for lançado aqui aparece nos outros aparelhos e vice-versa.
function Sincronizacao() {
  const { nuvem } = useDados();
  const avisar = useAviso();
  const confirmar = useConfirmar();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erroEntrada, setErroEntrada] = useState<string | null>(null);

  if (!nuvem.configurada) {
    return (
      <div className="cartao">
        <p className="sub" style={{ color: 'var(--bone)', margin: 0 }}>
          A sincronização entre aparelhos ainda não foi ligada. Por enquanto, use o backup abaixo para
          levar os dados de um aparelho para outro.
        </p>
      </div>
    );
  }

  if (!nuvem.email) {
    return (
      <form className="cartao" onSubmit={async (e) => {
        e.preventDefault();
        setEntrando(true);
        setErroEntrada(null);
        try {
          await nuvem.entrar(email, senha);
          setSenha('');
          avisar('Aparelho conectado');
        } catch (erro) {
          setErroEntrada((erro as Error).message);
        } finally {
          setEntrando(false);
        }
      }}>
        <p className="sub" style={{ color: 'var(--bone)', marginTop: 0, marginBottom: 14 }}>
          Entre para ver e lançar os mesmos dados no iPhone e no computador. O que já está neste
          aparelho é enviado junto, nada se perde.
        </p>
        <label className="campo">
          <span>E-mail</span>
          <input type="email" autoComplete="username" inputMode="email" value={email} required
            onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="campo">
          <span>Senha</span>
          <input type="password" autoComplete="current-password" value={senha} required
            onChange={(e) => setSenha(e.target.value)} />
          {erroEntrada && <span className="erro">{erroEntrada}</span>}
        </label>
        <button className="botao cheio" type="submit" disabled={entrando}>{entrando ? 'Entrando…' : 'Entrar'}</button>
      </form>
    );
  }

  const situacao = nuvem.sincronizando
    ? 'Sincronizando…'
    : nuvem.erro
      ? null
      : nuvem.ultimaVez ? `Tudo em dia · ${quando(nuvem.ultimaVez)}` : 'Aguardando a primeira sincronização';

  return (
    <div className="cartao">
      <p className="sub" style={{ color: 'var(--bone)', margin: 0 }}>
        Conectado como <strong>{nuvem.email}</strong>. Os lançamentos deste aparelho vão para a nuvem
        sozinhos e os dos outros aparelhos chegam aqui.
      </p>
      {situacao && <p className="nota">{situacao}</p>}
      {nuvem.erro && !nuvem.sincronizando && <div className="aviso">{nuvem.erro}</div>}
      {nuvem.exclusaoEmMassa && !nuvem.sincronizando && (
        <div className="acoes">
          <button className="botao secundario cheio" onClick={async () => {
            const n = nuvem.exclusaoEmMassa!.quantidade;
            const ok = await confirmar({
              texto: nuvem.exclusaoEmMassa!.direcao === 'enviar'
                ? `Apagar ${n} registros na nuvem e em todos os aparelhos? Antes, faça um backup deste aparelho.`
                : `Apagar ${n} registros deste aparelho, como já estão na nuvem? Antes, faça um backup deste aparelho.`,
              acao: 'Apagar mesmo assim',
              perigo: true,
            });
            if (ok) await nuvem.confirmarExclusao();
          }}>
            Confirmar a exclusão
          </button>
        </div>
      )}
      {nuvem.pendentes > 0 && !nuvem.sincronizando && (
        <p className="nota">{nuvem.pendentes} mudança(s) deste aparelho esperando para subir.</p>
      )}
      <div className="acoes">
        <button className="botao secundario cheio" onClick={() => nuvem.sincronizarAgora()} disabled={nuvem.sincronizando}>
          Sincronizar agora
        </button>
        <button className="botao secundario cheio" onClick={async () => {
          const aviso = nuvem.pendentes > 0
            ? ` Há ${nuvem.pendentes} mudança(s) que ainda não subiram: elas só vão para a nuvem quando você entrar de novo.`
            : '';
          if (await confirmar({
            texto: `Sair do painel? Os dados deste aparelho NÃO são apagados e a sincronização para. Para abrir o painel de novo, será preciso entrar com e-mail e senha, com internet.${aviso}`,
            acao: 'Sair',
          })) await nuvem.sair();
        }}>
          Sair
        </button>
      </div>
    </div>
  );
}

// Os 3 passos para instalar no iPhone: mesma estrutura em todos (número, ícone, ação, nome do botão).
const PASSOS_IPHONE = [
  { acao: 'Abra o painel no', titulo: 'Safari',
    icone: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z" /></> },
  { acao: 'Toque em', titulo: 'Compartilhar',
    icone: <><path d="M8 10H6.5A1.5 1.5 0 0 0 5 11.5v8A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 17.5 10H16" /><path d="M12 15V3" /><path d="M8.5 6.5 12 3l3.5 3.5" /></> },
  { acao: 'Toque em', titulo: 'Adicionar à Tela de Início e Adicionar',
    icone: <><rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8.5v7M8.5 12h7" /></> },
];

export function Ajustes({ tema, alternarTema, centralizar = false }: { tema: Tema; alternarTema: () => void; centralizar?: boolean }) {
  const { obras, custos, exportar, restaurar, copiaAnterior, desfazerRestauracao, nuvem } = useDados();
  const avisar = useAviso();
  const confirmar = useConfirmar();
  const entrada = useRef<HTMLInputElement>(null);
  const [ultimoBackup, setUltimoBackup] = useState(() => {
    try { return localStorage.getItem('mb2-ultimo-backup'); } catch { return null; }
  });
  const [copia, setCopia] = useState<{ obras: number; custos: number } | null>(null);
  const atualizarCopia = () =>
    copiaAnterior().then((c) => setCopia(c && { obras: c.obras.length, custos: c.custos.length }), () => setCopia(null));
  useEffect(() => { atualizarCopia(); }, []);

  async function fazerBackup() {
    const b = await exportar();
    if (!(await entregarArquivo(`mb2-backup-${hoje()}.json`, JSON.stringify(b, null, 1), 'application/json'))) return;
    try { localStorage.setItem('mb2-ultimo-backup', hoje()); } catch { /* ignora */ }
    setUltimoBackup(hoje());
  }

  async function planilha() {
    const nome = (id: string) => obras.find((o) => o.id === id)?.nome ?? '';
    await entregarArquivo(`mb2-custos-${hoje()}.csv`, custosEmCsv(custos, nome), 'text/csv');
  }

  async function restaurarArquivo(arquivo: File) {
    let json: unknown;
    try {
      json = JSON.parse(await arquivo.text());
    } catch {
      avisar('Arquivo ilegível: não é um backup.');
      return;
    }
    const v = validarBackup(json);
    if (!v.ok) {
      avisar(v.erro);
      return;
    }
    const msg = `Restaurar o backup de ${dataBR(v.backup.geradoEm)} com ${v.backup.obras.length} obra(s) e ` +
      `${v.backup.custos.length} lançamento(s)?\n\nO que está neste aparelho agora (${obras.length} obra(s) e ` +
      `${custos.length} lançamento(s)) será substituído. Dá para desfazer depois, aqui em Ajustes.`;
    if (!(await confirmar({ texto: msg, acao: 'Restaurar' }))) return;
    try {
      await restaurar(v.backup);
      avisar('Backup restaurado');
    } catch (e) {
      avisar('Não foi possível restaurar: ' + String(e));
    }
    atualizarCopia();
  }

  async function desfazer() {
    if (!copia || !(await confirmar({
      texto: `Voltar aos dados de antes da restauração (${copia.obras} obra(s) e ${copia.custos} lançamento(s))? ` +
        'O que está agora será substituído.',
      acao: 'Desfazer restauração',
    }))) return;
    try {
      await desfazerRestauracao();
      avisar('Restauração desfeita');
    } catch (e) {
      avisar('Não foi possível desfazer: ' + String(e));
    }
    atualizarCopia();
  }

  return (
    <div className={centralizar ? 'ajustes-centro' : undefined}>
      <h2 className="titulo-centro" style={{ marginTop: 0 }}>Aparência</h2>
      <label className="alternar">
        <span>Tema claro</span>
        <input type="checkbox" checked={tema === 'claro'} onChange={alternarTema} />
      </label>

      <h2>Sincronizar aparelhos</h2>
      <Sincronizacao />

      {!instalado() && (
        <>
          <h2>Instalar no iPhone</h2>
          <div className="cartao">
            <p className="sub" style={{ color: 'var(--bone)' }}>
              Instale o painel como app: abre em tela cheia, funciona sem internet e o iPhone guarda os dados com segurança.
            </p>
            <ol className="passos-iphone">
              {PASSOS_IPHONE.map((p, i) => (
                <li key={p.titulo}>
                  <span className="passo-num" aria-hidden="true">{i + 1}</span>
                  <span className="passo-icone" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                      {p.icone}
                    </svg>
                  </span>
                  <span className="passo-texto">
                    <span className="passo-acao">{p.acao}</span>
                    <strong className="passo-titulo">{p.titulo}</strong>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}

      <h2>Seus dados</h2>
      <div className="cartao">
        <p className="sub" style={{ color: 'var(--bone)', margin: 0 }}>
          {obras.length} obra(s) e {custos.length} lançamento(s) guardados <strong>neste aparelho</strong>
          {nuvem.email ? ' e na nuvem' : ''}.
          {nuvem.email
            ? ' Um backup de vez em quando continua sendo uma boa cópia de segurança.'
            : ' Faça backup com frequência e guarde o arquivo no iCloud Drive ou mande para você mesmo.'}
        </p>
        <p className="nota">Último backup: {ultimoBackup ? dataBR(ultimoBackup) : 'nunca'}</p>
        <div className="acoes">
          <button className="botao secundario cheio" onClick={fazerBackup}>Fazer backup agora</button>
          <button className="botao secundario cheio" onClick={planilha} disabled={custos.length === 0}>
            Exportar custos em planilha (Excel)
          </button>
          <button className="botao secundario cheio" onClick={() => entrada.current?.click()}>Restaurar um backup</button>
          {copia && (
            <button className="botao secundario cheio" onClick={desfazer}>Desfazer a última restauração</button>
          )}
          <input ref={entrada} type="file" accept="application/json,.json" hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) restaurarArquivo(f);
            }} />
        </div>
      </div>

      <p className="nota" style={{ textAlign: 'center', marginTop: 28 }}>Painel MB² · versão 1.2</p>
    </div>
  );
}
