import { useState } from 'react';
import { useDados } from '../dados/contexto';
import { useAviso } from './Aviso';
import { Folha } from './Folha';

// Cadastra uma conta: da MB2 (empresa) ou de uma obra (cada obra tem a sua).
export function FormConta({ aoFechar }: { aoFechar: () => void }) {
  const { obras, contas, salvarConta } = useDados();
  const avisar = useAviso();
  const [dona, setDona] = useState(contas.some((c) => c.obraId === null) ? (obras[0]?.id ?? '') : '');
  const [nome, setNome] = useState('');
  const [banco, setBanco] = useState('');
  const [tentou, setTentou] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const nomePadrao = dona ? (obras.find((o) => o.id === dona)?.nome ?? '') : 'MB2';
  const nomeFinal = nome.trim() || nomePadrao;

  async function salvar() {
    setTentou(true);
    if (!nomeFinal || salvando) return;
    setSalvando(true);
    try {
      await salvarConta({ nome: nomeFinal, banco: banco.trim(), obraId: dona || null, ativa: true });
      avisar('Conta cadastrada');
      aoFechar();
    } catch (e) {
      avisar('Não foi possível salvar: ' + String(e));
      setSalvando(false);
    }
  }

  return (
    <Folha titulo="Nova conta" aoFechar={aoFechar}>
      <form onSubmit={(e) => { e.preventDefault(); salvar(); }} noValidate>
        <label className="campo">
          <span>De quem é a conta</span>
          <select value={dona} onChange={(e) => setDona(e.target.value)}>
            <option value="">MB2 (empresa)</option>
            {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>Nome da conta</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder={nomePadrao} />
          {tentou && !nomeFinal && <span className="erro">Dê um nome para a conta.</span>}
        </label>
        <label className="campo">
          <span>Banco</span>
          <input value={banco} onChange={(e) => setBanco(e.target.value)} placeholder="Opcional" />
        </label>
        <div className="acoes">
          <button className="botao cheio" type="submit" disabled={salvando}>Salvar</button>
        </div>
      </form>
    </Folha>
  );
}
