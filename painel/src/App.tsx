import { Logo } from './componentes/Logo';
import { TituloItalico } from './componentes/TituloItalico';
import { useCallback, useEffect, useState } from 'react';
import { AvisoProvider } from './componentes/Aviso';
import { ConfirmarProvider } from './componentes/Confirmar';
import { FormCusto } from './componentes/FormCusto';
import { FormConta } from './componentes/FormConta';
import { FormImportar } from './componentes/FormImportar';
import { FormObra } from './componentes/FormObra';
import { FormSaldo } from './componentes/FormSaldo';
import { Icone, type NomeIcone } from './componentes/Icone';
import { useDados } from './dados/contexto';
import type { Custo, Obra } from './dominio/tipos';
import { ir, linkPara, useRota, type Rota } from './navegacao';
import { useTema } from './tema';
import { Ajustes } from './telas/Ajustes';
import { ObraDetalhe } from './telas/ObraDetalhe';
import { Obras } from './telas/Obras';
import { Visao } from './telas/Visao';

type FolhaAberta =
  | { tipo: 'custo'; custo?: Custo; obraId?: string }
  | { tipo: 'obra'; obra?: Obra }
  | { tipo: 'saldo'; contaId?: string }
  | { tipo: 'conta' }
  | { tipo: 'importar' }
  | null;

const TITULOS: Record<Exclude<Rota['tela'], 'obra'>, string> = {
  visao: 'Visão geral',
  obras: 'Obras',
  ajustes: 'Ajustes',
};

export function App() {
  return (
    <AvisoProvider>
      <ConfirmarProvider>
        <Conteudo />
      </ConfirmarProvider>
    </AvisoProvider>
  );
}

function Conteudo() {
  const rota = useRota();
  const [tema, alternarTema] = useTema();
  const { carregando, erro } = useDados();
  const [folha, setFolha] = useState<FolhaAberta>(null);
  const fechar = useCallback(() => setFolha(null), []);

  // Link "#/obras?nova=1" (do formulário de custo sem obras) abre o cadastro de obra.
  useEffect(() => {
    if (window.location.hash.includes('nova=1')) {
      setFolha({ tipo: 'obra' });
      window.history.replaceState(null, '', '#/obras');
    }
  }, [rota]);

  const novaObra = () => setFolha({ tipo: 'obra' });
  const abrirCusto = (c: Custo) => setFolha({ tipo: 'custo', custo: c });

  return (
    <>
      <div className="app" inert={folha !== null}>
        <header className="topo">
          {rota.tela === 'obra' ? (
            <button className="voltar" onClick={() => (window.history.length > 1 ? window.history.back() : ir({ tela: 'obras' }))}>
              <Icone nome="voltar" tamanho={20} /> Obras
            </button>
          ) : (
            <div className="marca" aria-label="MB2 Painel">
              <Logo altura={34} />
              <span>PAINEL</span>
            </div>
          )}
        </header>
        {rota.tela !== 'obra' && rota.tela !== 'visao' && <h1 style={{ marginBottom: 16 }}><TituloItalico texto={TITULOS[rota.tela]} /></h1>}

        {erro && <div className="aviso" role="alert">{erro}</div>}
        {!carregando && !erro && (
          <main>
            {rota.tela === 'visao' && <Visao aoNovaObra={novaObra} aoAbrirCusto={abrirCusto} aoLancar={() => setFolha({ tipo: 'custo' })}
              aoAtualizarSaldo={() => setFolha({ tipo: 'saldo' })} aoNovaConta={() => setFolha({ tipo: 'conta' })}
              aoImportarExtrato={() => setFolha({ tipo: 'importar' })} />}
            {rota.tela === 'obras' && <Obras aoNovaObra={novaObra} />}
            {rota.tela === 'obra' && (
              <ObraDetalhe id={rota.id} aoAbrirCusto={abrirCusto}
                aoAtualizarSaldo={(contaId) => setFolha({ tipo: 'saldo', contaId })} aoNovaConta={() => setFolha({ tipo: 'conta' })}
                aoEditar={(o) => setFolha({ tipo: 'obra', obra: o })}
                aoLancar={(obraId) => setFolha({ tipo: 'custo', obraId })} />
            )}
            {rota.tela === 'ajustes' && <Ajustes tema={tema} alternarTema={alternarTema} />}
          </main>
        )}
      </div>

      <div className="abas" inert={folha !== null}>
        <nav aria-label="Seções">
          <Aba rota={{ tela: 'visao' }} atual={rota} icone="visao" rotulo="Visão geral" />
          <Aba rota={{ tela: 'obras' }} atual={rota} icone="obras" rotulo="Obras" />
          <button className="aba lancar" onClick={() =>
            setFolha({ tipo: 'custo', obraId: rota.tela === 'obra' ? rota.id : undefined })}>
            <span className="mais"><Icone nome="mais" /></span>
            Lançar
          </button>
          <Aba rota={{ tela: 'ajustes' }} atual={rota} icone="ajustes" rotulo="Ajustes" />
        </nav>
      </div>

      {folha?.tipo === 'saldo' && <FormSaldo contaId={folha.contaId} aoFechar={fechar} />}
      {folha?.tipo === 'conta' && <FormConta aoFechar={fechar} />}
      {folha?.tipo === 'importar' && <FormImportar aoFechar={fechar} aoDigitarSaldo={() => setFolha({ tipo: 'saldo' })} />}
      {folha?.tipo === 'custo' && <FormCusto custo={folha.custo} obraId={folha.obraId} aoFechar={fechar} />}
      {folha?.tipo === 'obra' && (
        <FormObra obra={folha.obra} aoFechar={fechar}
          aoSalvar={(o) => !folha.obra && ir({ tela: 'obra', id: o.id })}
          aoExcluir={() => ir({ tela: 'obras' })} />
      )}
    </>
  );
}

function Aba({ rota, atual, icone, rotulo }: { rota: Rota; atual: Rota; icone: NomeIcone; rotulo: string }) {
  const ativa = atual.tela === rota.tela || (rota.tela === 'obras' && atual.tela === 'obra');
  return (
    <a className="aba" href={linkPara(rota)} aria-current={ativa ? 'page' : undefined} style={{ textDecoration: 'none' }}>
      <Icone nome={icone} />
      {rotulo}
    </a>
  );
}
