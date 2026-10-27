import { useState } from 'react';
import { useDados } from '../dados/contexto';
import { hoje, lerReais, reaisParaCampo } from '../dominio/formato';
import { CATEGORIAS, FORMAS_PAGAMENTO, type Categoria, type Custo, type FormaPagamento } from '../dominio/tipos';
import { useAviso } from './Aviso';
import { useConfirmar } from './Confirmar';
import { Folha } from './Folha';

const CHAVE_ULTIMA_OBRA = 'mb2-ultima-obra';

function ultimaObra(): string {
  try {
    return localStorage.getItem(CHAVE_ULTIMA_OBRA) ?? '';
  } catch {
    return '';
  }
}

export function FormCusto({ custo, obraId, aoFechar }: { custo?: Custo; obraId?: string; aoFechar: () => void }) {
  const { obras, salvarCusto, excluirCusto } = useDados();
  const avisar = useAviso();
  const confirmar = useConfirmar();
  const abertas = obras.filter((o) => o.status !== 'concluida' || o.id === custo?.obraId || o.id === obraId);
  const inicialObra = custo?.obraId ?? obraId ?? (abertas.some((o) => o.id === ultimaObra()) ? ultimaObra() : abertas[0]?.id ?? '');

  const [obra, setObra] = useState(inicialObra);
  const [valor, setValor] = useState(custo ? reaisParaCampo(custo.valor) : '');
  const [data, setData] = useState(custo?.data ?? hoje());
  const [categoria, setCategoria] = useState<Categoria>(custo?.categoria ?? 'Materiais (M)');
  const [descricao, setDescricao] = useState(custo?.descricao ?? '');
  const [fornecedor, setFornecedor] = useState(custo?.fornecedor ?? '');
  const [pagamento, setPagamento] = useState<FormaPagamento>(custo?.pagamento ?? 'pix');
  const [pago, setPago] = useState(custo?.pago ?? true);
  const [tentou, setTentou] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const centavos = lerReais(valor);
  const erroValor = centavos === null || centavos <= 0 ? 'Informe um valor maior que zero.' : null;
  const erroObra = obra ? null : 'Escolha a obra.';

  async function salvar(outro: boolean) {
    setTentou(true);
    if (erroValor || erroObra || !data || salvando) return;
    setSalvando(true);
    try {
      await salvarCusto({ obraId: obra, data, categoria, descricao: descricao.trim(), fornecedor: fornecedor.trim(),
        valor: centavos!, pagamento, pago }, custo?.id);
      try { localStorage.setItem(CHAVE_ULTIMA_OBRA, obra); } catch { /* sem armazenamento: só não lembra */ }
      avisar(custo ? 'Lançamento atualizado' : 'Custo lançado');
      if (outro) {
        setValor('');
        setDescricao('');
        setTentou(false);
      } else aoFechar();
    } catch (e) {
      avisar('Não foi possível salvar: ' + String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!custo || !(await confirmar({ texto: 'Excluir este lançamento?', acao: 'Excluir', perigo: true }))) return;
    try {
      await excluirCusto(custo.id);
      avisar('Lançamento excluído');
      aoFechar();
    } catch (e) {
      avisar('Não foi possível excluir: ' + String(e));
    }
  }

  if (obras.length === 0) {
    return (
      <Folha titulo="Lançar custo" aoFechar={aoFechar}>
        <div className="vazio">
          <h3>Cadastre uma obra primeiro</h3>
          <p>Os custos são lançados sempre dentro de uma obra.</p>
          <a className="botao" href="#/obras?nova=1" onClick={aoFechar}>Cadastrar obra</a>
        </div>
      </Folha>
    );
  }

  return (
    <Folha titulo={custo ? 'Editar lançamento' : 'Lançar custo'} aoFechar={aoFechar}>
      <form onSubmit={(e) => { e.preventDefault(); salvar(false); }} noValidate>
        <label className="campo valor">
          <span>Valor (R$)</span>
          <input inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)}
            autoFocus={!custo} aria-invalid={tentou && !!erroValor} />
          {tentou && erroValor && <span className="erro">{erroValor}</span>}
        </label>
        <label className="campo">
          <span>Obra</span>
          <select value={obra} onChange={(e) => setObra(e.target.value)}>
            {!obra && <option value="">Escolha…</option>}
            {abertas.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
          </select>
          {tentou && erroObra && <span className="erro">{erroObra}</span>}
        </label>
        <div className="dupla">
          <label className="campo">
            <span>Data</span>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </label>
          <label className="campo">
            <span>Pagamento</span>
            <select value={pagamento} onChange={(e) => setPagamento(e.target.value as FormaPagamento)}>
              {Object.entries(FORMAS_PAGAMENTO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>
        <label className="campo">
          <span>Categoria</span>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)}>
            {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>Descrição</span>
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: 30 sacos de cimento" />
        </label>
        <label className="campo">
          <span>Fornecedor ou prestador</span>
          <input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} placeholder="Ex.: Casa do Construtor" />
        </label>
        <label className="alternar">
          <span>{pago ? 'Já foi pago' : 'Ainda a pagar'}</span>
          <input type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} />
        </label>
        <div className="acoes">
          <button className="botao cheio" type="submit" disabled={salvando}>Salvar</button>
          {!custo && (
            <button className="botao secundario cheio" type="button" disabled={salvando} onClick={() => salvar(true)}>
              Salvar e lançar outro
            </button>
          )}
          {custo && <button className="botao perigo cheio" type="button" onClick={excluir}>Excluir lançamento</button>}
        </div>
      </form>
    </Folha>
  );
}
