import { Logo } from './Logo';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useCasca } from '../casca';
import { criarRepositorioLocal } from '../dados/indexeddb';
import { ErroNuvem, nuvemDoBuild, type Nuvem } from '../dados/nuvem';
import { decidirPorteiro, esperaAposErro, precisaConfirmarConta } from '../dados/porteiro';
import type { FilaLocal } from '../dados/repositorio';
import { confirmarOutraConta } from '../dados/sessaoLocal';
import { gravarConta, lerConta, type Armazem } from '../dados/ultimaSincronizacao';
import { useTema } from '../tema';

// Porteiro: com a nuvem configurada, só mostra a tela de entrar até existir uma sessão guardada.
// Nada do painel (nem o DadosProvider) é montado antes disso. Sem nuvem, abre direto.
// Com sessão guardada abre mesmo sem internet. Trava a TELA; a proteção dos dados na nuvem é o
// login e as regras do banco (docs/privacidade.md).
export function Porteiro({ children, nuvem = nuvemDoBuild(), armazem, repo }: {
  children: ReactNode;
  nuvem?: Nuvem | null;
  armazem?: Armazem | null; // onde fica a conta do aparelho (padrão: localStorage)
  repo?: Pick<FilaLocal, 'gravarMarca'>; // para zerar a marca ao trocar de conta (padrão: o banco do aparelho)
}) {
  const assinar = (f: () => void) => (nuvem ? nuvem.ouvir(f) : () => {});
  const ler = () => nuvem?.email() ?? null;
  const email = useSyncExternalStore(assinar, ler, ler);
  const [aceitou, setAceitou] = useState<string | null>(null);
  const decisao = decidirPorteiro({ configurada: !!nuvem, sessao: !!email });
  const outraConta = decisao === 'abrir' && !!email && aceitou !== email && precisaConfirmarConta(lerConta(armazem), email);

  // Lembra qual conta usa este aparelho (para avisar se outra conta entrar depois).
  useEffect(() => {
    if (decisao === 'abrir' && email && !outraConta) gravarConta(email, armazem);
  }, [decisao, email, outraConta, armazem]);

  if (decisao === 'login' && nuvem) return <Entrada nuvem={nuvem} />;
  if (outraConta && nuvem && email) {
    return (
      <OutraConta anterior={lerConta(armazem) ?? ''} nova={email}
        aceitar={async () => {
          // A marca é zerada ANTES de montar o painel: a primeira sincronização com a conta nova envia e busca tudo.
          await confirmarOutraConta({ repo: repo ?? criarRepositorioLocal(), email, armazem });
          setAceitou(email);
        }}
        sair={() => { void nuvem.sair(); }} />
    );
  }
  return <>{children}</>;
}

function Moldura({ children }: { children: ReactNode }) {
  const desktop = useCasca() === 'desktop';
  useTema(); // a tela segue o tema escolhido (ou o do iPhone), como o resto do painel
  const tela = <main className="porteiro">{children}</main>;
  return desktop ? <div className="dk">{tela}</div> : tela;
}

// Outra conta entrou num aparelho que já tinha dados: os dados daqui subiriam para a conta nova.
function OutraConta({ anterior, nova, aceitar, sair }: { anterior: string; nova: string; aceitar(): Promise<void>; sair(): void }) {
  const [ocupado, setOcupado] = useState(false);
  return (
    <Moldura>
      <div className="porteiro-cartao">
        <Logo altura={88} className="porteiro-logo" />
        <h1>Outra conta</h1>
        <p className="porteiro-sub">
          Este aparelho já foi usado com a conta <strong>{anterior}</strong>. Você entrou como <strong>{nova}</strong>.
          Se continuar, os dados que estão neste aparelho serão enviados para a conta {nova}.
        </p>
        <button className="botao cheio" type="button" disabled={ocupado}
          onClick={() => { setOcupado(true); aceitar().catch(() => setOcupado(false)); }}>Continuar com {nova}</button>
        <button className="botao secundario cheio" type="button" onClick={sair} style={{ marginTop: 10 }}>Sair, não enviar</button>
      </div>
    </Moldura>
  );
}

function Entrada({ nuvem }: { nuvem: Nuvem }) {
  const desktop = useCasca() === 'desktop';
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [ver, setVer] = useState(false);
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [espera, setEspera] = useState(0);
  const [aviso, setAviso] = useState<string | null>(null);
  const mensagem = useRef<HTMLParagraphElement>(null);

  // Contagem curta depois de um erro; o botão volta sozinho.
  useEffect(() => {
    if (espera <= 0) { setAviso(null); return; }
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  // O foco vai para a mensagem quando ela aparece (leitor de tela e teclado).
  useEffect(() => { if (erro || aviso) mensagem.current?.focus(); }, [erro, aviso]);

  const esperar = () => setAviso(`Aguarde ${espera} segundo${espera === 1 ? '' : 's'} para tentar de novo.`);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (espera > 0) return esperar();
    if (entrando) return;
    setEntrando(true);
    setErro(null);
    try {
      await nuvem.entrar(email, senha);
      setSenha(''); // a senha não fica guardada em lugar nenhum; só a sessão
    } catch (x) {
      setErro((x as Error).message);
      setEspera(esperaAposErro(x instanceof ErroNuvem ? x.tipo : ''));
      setEntrando(false);
    }
  }

  const ligacao = erro ? 'porteiro-erro' : undefined;
  return (
    <Moldura>
      <form className="porteiro-cartao" onSubmit={enviar}
        onKeyDown={(e) => { if (e.key === 'Enter' && espera > 0) { e.preventDefault(); esperar(); } }}>
        <Logo altura={88} className="porteiro-logo" />
        <h1 className="porteiro-titulo">Entrar</h1>
        {!desktop && <p className="porteiro-sub">Painel de gestão de obras. Entre com seu e-mail e sua senha.</p>}
        <div className="campo">
          <label htmlFor="porteiro-email">E-mail</label>
          <input id="porteiro-email" type="email" name="email" value={email} required autoFocus={desktop}
            autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" inputMode="email"
            enterKeyHint="next" aria-invalid={erro ? true : undefined} aria-describedby={ligacao}
            onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="porteiro-senha">Senha</label>
          <div className="porteiro-senha">
            <input id="porteiro-senha" type={ver ? 'text' : 'password'} name="senha" value={senha} required
              autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="current-password"
              enterKeyHint="go" aria-invalid={erro ? true : undefined} aria-describedby={ligacao}
              onChange={(e) => setSenha(e.target.value)} />
            <button type="button" className="porteiro-ver"
              aria-label={ver ? 'Ocultar senha' : 'Mostrar senha'}
              onClick={() => setVer((v) => !v)}>{ver ? 'Ocultar' : 'Mostrar'}</button>
          </div>
        </div>
        <div role="alert" id="porteiro-erro">
          {(aviso ?? erro) && <p className="porteiro-erro" ref={mensagem} tabIndex={-1}>{aviso ?? erro}</p>}
        </div>
        <button className="botao cheio" type="submit" disabled={entrando || espera > 0}>
          {entrando ? 'Entrando…' : espera > 0 ? `Entrar (${espera})` : 'Entrar'}
        </button>
        <p className="porteiro-nota">Sem internet? Na primeira vez é preciso estar online para entrar.</p>
      </form>
    </Moldura>
  );
}
