import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { useCasca } from '../casca';
import { nuvemDoBuild, type Nuvem } from '../dados/nuvem';
import { decidirPorteiro } from '../dados/porteiro';
import { useTema } from '../tema';

// Porteiro: com a nuvem configurada, só mostra a tela de entrar até existir uma sessão guardada.
// Nada do painel (nem o DadosProvider) é montado antes disso. Sem nuvem, abre direto.
// Com sessão guardada abre mesmo sem internet. Trava a TELA; a proteção dos dados na nuvem é o
// login e as regras do banco (docs/privacidade.md).
export function Porteiro({ children, nuvem = nuvemDoBuild() }: { children: ReactNode; nuvem?: Nuvem | null }) {
  const assinar = (f: () => void) => (nuvem ? nuvem.ouvir(f) : () => {});
  const email = useSyncExternalStore(assinar, () => nuvem?.email() ?? null);
  // A renovação do acesso acontece na sincronização; se a nuvem recusar de verdade (400/401), ela
  // encerra a sessão e `email` vira null aqui, voltando ao login. Falha de rede/429/5xx não muda nada.
  const decisao = decidirPorteiro({ configurada: !!nuvem, sessao: !!email, falhaRenovacao: null });
  if (decisao === 'login' && nuvem) return <Entrada nuvem={nuvem} />;
  return <>{children}</>;
}

function Entrada({ nuvem }: { nuvem: Nuvem }) {
  const desktop = useCasca() === 'desktop';
  useTema(); // a tela de entrar segue o tema escolhido (ou o do iPhone), como o resto do painel
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [ver, setVer] = useState(false);
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (entrando) return;
    setEntrando(true);
    setErro(null);
    try {
      await nuvem.entrar(email, senha);
      setSenha(''); // a senha não fica guardada em lugar nenhum; só a sessão
    } catch (x) {
      setErro((x as Error).message);
      setEntrando(false);
    }
  }

  const tela = (
    <main className="porteiro">
      <form className="porteiro-cartao" onSubmit={enviar} noValidate={false}>
        <p className="porteiro-marca">MB²</p>
        <h1>Entrar</h1>
        <p className="porteiro-sub">Painel de gestão de obras. Entre com seu e-mail e sua senha.</p>
        <label className="campo">
          <span>E-mail</span>
          <input type="email" name="email" value={email} required autoFocus={desktop}
            autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" inputMode="email"
            enterKeyHint="next" aria-invalid={erro ? true : undefined}
            onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="campo">
          <span>Senha</span>
          <span className="porteiro-senha">
            <input type={ver ? 'text' : 'password'} name="senha" value={senha} required
              autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="current-password"
              enterKeyHint="go" aria-invalid={erro ? true : undefined}
              onChange={(e) => setSenha(e.target.value)} />
            <button type="button" className="porteiro-ver" aria-pressed={ver}
              onClick={() => setVer((v) => !v)}>{ver ? 'Ocultar' : 'Mostrar'}</button>
          </span>
        </label>
        <div role="alert" aria-live="polite">
          {erro && <p className="porteiro-erro">{erro}</p>}
        </div>
        <button className="botao cheio" type="submit" disabled={entrando}>{entrando ? 'Entrando…' : 'Entrar'}</button>
        <p className="porteiro-nota">Sem internet? Na primeira vez é preciso estar online para entrar.</p>
      </form>
    </main>
  );
  return desktop ? <div className="dk">{tela}</div> : tela;
}
