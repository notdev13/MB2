import { useRef, useState } from 'react';
import { useAviso } from '../componentes/Aviso';
import { useDados } from '../dados/contexto';
import { custosEmCsv, validarBackup } from '../dados/backup';
import { dataBR, hoje } from '../dominio/formato';
import type { Tema } from '../tema';

const instalado = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

// Entrega um arquivo ao usuário: no iPhone abre a folha de compartilhar (salvar em Arquivos,
// mandar por WhatsApp/e-mail); onde não houver, baixa o arquivo.
async function entregarArquivo(nome: string, conteudo: string, tipo: string) {
  const arquivo = new File([conteudo], nome, { type: tipo });
  if (navigator.canShare?.({ files: [arquivo] })) {
    try {
      await navigator.share({ files: [arquivo], title: nome });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(arquivo);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Ajustes({ tema, alternarTema }: { tema: Tema; alternarTema: () => void }) {
  const { obras, custos, exportar, restaurar } = useDados();
  const avisar = useAviso();
  const entrada = useRef<HTMLInputElement>(null);
  const [ultimoBackup, setUltimoBackup] = useState(() => {
    try { return localStorage.getItem('mb2-ultimo-backup'); } catch { return null; }
  });

  async function fazerBackup() {
    const b = await exportar();
    await entregarArquivo(`mb2-backup-${hoje()}.json`, JSON.stringify(b, null, 1), 'application/json');
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
      `${v.backup.custos.length} lançamento(s)? Tudo o que está neste aparelho agora será substituído.`;
    if (!window.confirm(msg)) return;
    await restaurar(v.backup);
    avisar('Backup restaurado');
  }

  return (
    <>
      <h2 style={{ marginTop: 0 }}>Aparência</h2>
      <label className="alternar">
        <span>Tema escuro (preto e bronze)</span>
        <input type="checkbox" checked={tema === 'escuro'} onChange={alternarTema} />
      </label>

      {!instalado() && (
        <>
          <h2>Instalar no iPhone</h2>
          <div className="cartao">
            <p className="sub" style={{ color: 'var(--text)' }}>
              Instale o painel como app: abre em tela cheia, funciona sem internet e o iPhone guarda os dados com segurança.
            </p>
            <ol className="passos">
              <li>Abra este endereço no <strong>Safari</strong>.</li>
              <li>Toque em <strong>Compartilhar</strong> (quadrado com seta para cima).</li>
              <li>Escolha <strong>Adicionar à Tela de Início</strong> e toque em <strong>Adicionar</strong>.</li>
            </ol>
          </div>
        </>
      )}

      <h2>Seus dados</h2>
      <div className="cartao">
        <p className="sub" style={{ color: 'var(--text)', margin: 0 }}>
          {obras.length} obra(s) e {custos.length} lançamento(s) guardados <strong>neste aparelho</strong>.
          Faça backup com frequência e guarde o arquivo no iCloud Drive ou mande para você mesmo.
        </p>
        <p className="nota">Último backup: {ultimoBackup ? dataBR(ultimoBackup) : 'nunca'}</p>
        <div className="acoes">
          <button className="botao cheio" onClick={fazerBackup}>Fazer backup agora</button>
          <button className="botao secundario cheio" onClick={planilha} disabled={custos.length === 0}>
            Exportar custos em planilha (Excel)
          </button>
          <button className="botao secundario cheio" onClick={() => entrada.current?.click()}>Restaurar um backup</button>
          <input ref={entrada} type="file" accept="application/json,.json" hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) restaurarArquivo(f);
            }} />
        </div>
      </div>

      <p className="nota" style={{ textAlign: 'center', marginTop: 28 }}>Painel MB² · versão 0.1</p>
    </>
  );
}
