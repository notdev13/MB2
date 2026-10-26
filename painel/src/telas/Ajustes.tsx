import { useEffect, useRef, useState } from 'react';
import { useAviso } from '../componentes/Aviso';
import { useDados } from '../dados/contexto';
import { custosEmCsv, validarBackup } from '../dados/backup';
import { dataBR, hoje } from '../dominio/formato';

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

export function Ajustes() {
  const { obras, custos, exportar, restaurar, copiaAnterior, desfazerRestauracao } = useDados();
  const avisar = useAviso();
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
    if (!window.confirm(msg)) return;
    try {
      await restaurar(v.backup);
      avisar('Backup restaurado');
    } catch (e) {
      avisar('Não foi possível restaurar: ' + String(e));
    }
    atualizarCopia();
  }

  async function desfazer() {
    if (!copia || !window.confirm(`Voltar aos dados de antes da restauração (${copia.obras} obra(s) e ` +
      `${copia.custos} lançamento(s))? O que está agora será substituído.`)) return;
    try {
      await desfazerRestauracao();
      avisar('Restauração desfeita');
    } catch (e) {
      avisar('Não foi possível desfazer: ' + String(e));
    }
    atualizarCopia();
  }

  return (
    <>
      {!instalado() && (
        <>
          <h2 style={{ marginTop: 0 }}>Instalar no iPhone</h2>
          <div className="cartao">
            <p className="sub" style={{ color: 'var(--bone)' }}>
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
        <p className="sub" style={{ color: 'var(--bone)', margin: 0 }}>
          {obras.length} obra(s) e {custos.length} lançamento(s) guardados <strong>neste aparelho</strong>.
          Faça backup com frequência e guarde o arquivo no iCloud Drive ou mande para você mesmo.
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

      <p className="nota" style={{ textAlign: 'center', marginTop: 28 }}>Painel MB² · versão 0.1</p>
    </>
  );
}
