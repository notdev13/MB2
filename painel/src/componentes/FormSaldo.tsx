import { useRef, useState } from 'react';
import { useDados } from '../dados/contexto';
import { dataBR, hoje, reais } from '../dominio/formato';
import { lerSaldo, mudancaGrande, saldoAtual } from '../dominio/saldos';
import { valorParaCampo, type CandidatoPrint, type LeituraPrint } from '../dominio/saldoPrint';
import { useAviso } from './Aviso';
import { useConfirmar } from './Confirmar';
import { Folha } from './Folha';
import { lerSaldoDoPrint, miniaturaDoPrint } from './lerPrint';

// "Atualizar saldo": digita quanto tem na conta numa data. Cada vez vira uma conferência nova.
export function FormSaldo({ contaId, aoFechar }: { contaId?: string; aoFechar: () => void }) {
  const { contas, saldos, salvarSaldo, excluirSaldo } = useDados();
  const avisar = useAviso();
  const confirmar = useConfirmar();
  const ativas = contas.filter((c) => c.ativa);
  const [conta, setConta] = useState(contaId ?? ativas[0]?.id ?? '');
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hoje());
  const [obs, setObs] = useState('');
  const [tentou, setTentou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  // "Ler do print": a foto só existe aqui, na memória; nada é enviado nem guardado.
  const entradaPrint = useRef<HTMLInputElement>(null);
  const [print, setPrint] = useState<{ url: string; estado: 'lendo' | 'lido' | 'erro'; leitura?: LeituraPrint; erro?: string } | null>(null);

  function usarCandidato(c: CandidatoPrint) {
    setValor(valorParaCampo(c.valor));
    setData(hoje()); // o print é tirado na hora: vale a data de hoje
    setObs((o) => o || 'Lido do print');
  }

  async function lerPrint(arquivo: File | undefined) {
    if (!arquivo) return;
    setPrint({ url: await miniaturaDoPrint(arquivo).catch(() => ''), estado: 'lendo' });
    const r = await lerSaldoDoPrint(arquivo);
    if (entradaPrint.current) entradaPrint.current.value = '';
    if (!r.ok) {
      setPrint((p) => p && { ...p, estado: 'erro', erro: r.erro });
      return;
    }
    setPrint((p) => p && { ...p, estado: 'lido', leitura: r.leitura });
    if (r.leitura.sugerido) usarCandidato(r.leitura.sugerido);
  }

  const centavos = lerSaldo(valor);
  const erroValor = centavos === null ? 'Digite um valor válido, até R$ 999.999.999,99. Use o sinal de menos se a conta estiver no vermelho.' : null;
  const erroData = !/^\d{4}-\d{2}-\d{2}$/.test(data) ? 'Escolha a data.' : null;
  const anterior = saldoAtual(conta, saldos);
  const historico = saldos.filter((s) => s.contaId === conta)
    .sort((a, b) => b.data.localeCompare(a.data) || b.criadoEm.localeCompare(a.criadoEm)).slice(0, 5);

  async function salvar() {
    setTentou(true);
    if (!conta || erroValor || erroData || centavos === null || salvando) return;
    if (anterior && mudancaGrande(anterior.valor, centavos)) {
      const ok = await confirmar({
        texto: `Isso troca o saldo de ${reais(anterior.valor)} para ${reais(centavos)}. Gravar?`,
        acao: 'Gravar',
      });
      if (!ok) return;
    }
    setSalvando(true);
    try {
      await salvarSaldo({ contaId: conta, data, valor: centavos, fonte: 'manual', obs: obs.trim() });
      avisar('Saldo atualizado');
      aoFechar();
    } catch (e) {
      avisar('Não foi possível salvar: ' + String(e));
      setSalvando(false);
    }
  }

  async function excluir(id: string) {
    const s = saldos.find((x) => x.id === id);
    if (!s) return;
    const ok = await confirmar({
      texto: `Excluir o saldo de ${reais(s.valor)} de ${dataBR(s.data)}? Use só se foi lançado por engano.`,
      acao: 'Excluir saldo',
      perigo: true,
    });
    if (!ok) return;
    try {
      await excluirSaldo(id);
      avisar('Saldo excluído');
    } catch (e) {
      avisar('Não foi possível excluir: ' + String(e));
    }
  }

  return (
    <Folha titulo="Atualizar saldo" aoFechar={aoFechar}>
      <div className="print-saldo">
        <input ref={entradaPrint} type="file" accept="image/*" hidden onChange={(e) => lerPrint(e.target.files?.[0])} />
        <button type="button" className="botao secundario cheio" disabled={print?.estado === 'lendo'}
          onClick={() => entradaPrint.current?.click()}>
          {print?.estado === 'lendo' ? 'Lendo o print…' : 'Ler o saldo de um print'}
        </button>
        <p className="nota">Tire um print só do saldo e escolha a imagem. Ela é lida neste aparelho e não é guardada.</p>
        {print && (
          <div className="cartao print-resultado" aria-live="polite">
            {print.url && <img src={print.url} alt="Print escolhido" />}
            {print.estado === 'lendo' && <p className="nota">Lendo… na primeira vez demora um pouco mais.</p>}
            {print.estado === 'erro' && <p className="aviso" role="alert">{print.erro}</p>}
            {print.estado === 'lido' && print.leitura && (
              print.leitura.candidatos.length === 0
                ? <p className="aviso" role="alert">Não achei um valor com centavos neste print. Tire outro, só com o saldo, ou digite abaixo.</p>
                : (
                  <>
                    <p className={print.leitura.sugerido && !print.leitura.incerto ? 'nota' : 'aviso'}>
                      {print.leitura.sugerido
                        ? `Li ${reais(print.leitura.sugerido.valor)} e coloquei abaixo. Confira com a imagem antes de salvar.`
                        : print.leitura.incerto
                          ? 'A leitura ficou incerta. Escolha o valor certo (ou digite) conferindo com a imagem.'
                          : 'Achei mais de um valor. Toque no saldo da conta.'}
                    </p>
                    <div className="chips" role="group" aria-label="Valores encontrados no print">
                      {print.leitura.candidatos.slice(0, 6).map((c) => (
                        <button key={c.valor} type="button" className="chip" aria-pressed={centavos === c.valor}
                          onClick={() => usarCandidato(c)}>{reais(c.valor)}</button>
                      ))}
                    </div>
                  </>
                )
            )}
          </div>
        )}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); salvar(); }} noValidate>
        <label className="campo">
          <span>Conta</span>
          <select value={conta} onChange={(e) => setConta(e.target.value)}>
            {ativas.map((c) => <option key={c.id} value={c.id}>{c.nome}{c.banco ? ` · ${c.banco}` : ''}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>Dinheiro em conta (R$)</span>
          <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00"
            autoFocus aria-invalid={tentou && !!erroValor} />
          {tentou && erroValor && <span className="erro">{erroValor}</span>}
          {anterior && <span className="nota">Último saldo: {reais(anterior.valor)} em {dataBR(anterior.data)}</span>}
        </label>
        <label className="campo">
          <span>Data do saldo</span>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          {tentou && erroData && <span className="erro">{erroData}</span>}
        </label>
        <label className="campo">
          <span>Observação</span>
          <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
        </label>
        <div className="acoes">
          <button className="botao cheio" type="submit" disabled={salvando || !conta}>Salvar saldo</button>
        </div>
      </form>
      {historico.length > 0 && (
        <>
          <h2>Últimos saldos desta conta</h2>
          <div className="lista">
            {historico.map((s) => (
              <div key={s.id} className="linha conta-historico">
                <span>{dataBR(s.data)} · {s.valor < 0 ? '⚠ Negativo: ' : ''}{reais(s.valor)}{s.obs ? ` · ${s.obs}` : ''}</span>
                <button type="button" className="botao secundario pequeno" onClick={() => excluir(s.id)}>Excluir</button>
              </div>
            ))}
          </div>
        </>
      )}
    </Folha>
  );
}
