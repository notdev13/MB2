import { useState } from 'react';
import { useDados } from '../dados/contexto';
import { dataBR, hoje, reais } from '../dominio/formato';
import { lerSaldo, mudancaGrande, saldoAtual } from '../dominio/saldos';
import { useAviso } from './Aviso';
import { useConfirmar } from './Confirmar';
import { Folha } from './Folha';

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
