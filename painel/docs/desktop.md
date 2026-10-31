# Painel MB² · versão para computador

## Arquitetura

O painel tem duas interfaces ("cascas") sobre a mesma base:

```
src/
  dominio/      regras e contas (puras, com teste)          ← compartilhado
  dados/        contrato do repositório, IndexedDB, backup  ← compartilhado
  casca.ts      escolhe a casca pela tela
  App.tsx, telas/, componentes/   casca do celular (não muda por causa do desktop)
  desktop/
    AppDesktop.tsx    menu lateral, cabeçalho da página, atalhos, gaveta de formulário
    rotas.ts          rotas do desktop (#/visao, #/obras, #/obra/id, #/lancamentos, #/ajustes)
    componentes/      Base (ícones, Painel, Kpi, selos), Tabela, TabelaLancamentos, Graficos
    telas/            VisaoD, ObrasD, ObraD, LancamentosD
    desktop.css       design system desktop, todo dentro de .dk
```

- **Escolha da casca** (`casca.ts`): `(min-width: 1024px) and (hover: hover)` abre o desktop; o resto
  abre o celular. Troca ao vivo se a janela mudar de tamanho. Um iPad na horizontal com mouse pega o desktop.
- **Mesmas rotas**: os endereços são iguais nas duas cascas, então um link serve nas duas.
  `#/lancamentos` só existe no desktop; no celular cai na visão geral.
- **Contas fora das telas**: o que o desktop precisa a mais está em `src/dominio/consultas.ts`
  (filtrar, ordenar, agrupar por fornecedor, variação entre meses), com testes.
- **Reaproveitado do celular, sem alterar**: `FormCusto`, `FormObra`, `Ajustes`, `Aviso`, `Confirmar`
  e o tema. No desktop os formulários abrem como gaveta lateral (só CSS dentro de `.dk`).
- **Contas e saldos**: painel na Visão geral (`telas/ContasD.tsx`) com saldo de cada conta, dias desde a
  conferência e totais; abre `FormSaldo`, `FormConta` e `FormImportar` (importar extrato OFX, também por
  arrastar e soltar) como gaveta. Os formulários são os mesmos do celular.
- **Isolamento**: todo estilo do desktop usa classes `d-…` ou fica sob `.dk`. Nada em `desktop/`
  muda a aparência do celular.

## Design system

Parte da identidade do celular (DESIGN 22, out/2026): fundo quase preto (#0f1011), serifa leve
Playfair Display em títulos e números grandes (primeira palavra do título em itálico), Inter na
interface, Roboto Mono maiúsculo em rótulos e cabeçalhos de tabela, azul-ciano (`--dado`) só em
gráficos e barras, cores fortes (violeta, rosa, azul) só nas obras dos painéis. Botões e campos com
cantos de 8px, cartões de 16px, bordas finas; a única sombra é a do botão principal. Temas escuro e
claro usam os mesmos tokens de cor de `estilo.css`. A Visão geral abre com os painéis de
`componentes/Paineis.tsx` (os mesmos do celular), dois por linha.

O que é próprio do desktop:

| Token | Valor | Uso |
|---|---|---|
| `--d-lateral` | 256px | largura do menu lateral |
| `--d-margem` | 40px | margem lateral da página |
| `--d-vao` | 12px | espaço entre cartões da grade |
| `--d-largura-max` | 1480px | largura máxima do conteúdo |
| `--d-raio` / `--d-raio-p` | 16px / 8px | cartões / itens de menu |
| `--d-corpo` | 14px | texto padrão (mais denso que os 16px do celular) |
| `--d-titulo` | 64px serifa leve | título da página |
| `--d-kpi` | 38px serifa leve | número dos indicadores |
| `--d-linha` | 46px | altura da linha de tabela |

**Layout**: menu lateral fixo + conteúdo com grade de 12 colunas (`.d-grade-12`, `.span-4/6/8/12`).
Abaixo de 1280px, os blocos de 4 e 8 colunas ocupam a linha inteira.

**Componentes**
- `Painel`: cartão com cabeçalho (título à esquerda, ação ou link à direita).
- `Kpi`: rótulo, número em serifa, detalhe; tom `alerta` com borda vermelha e texto.
- `Tabela`: cabeçalho fixo, números à direita com algarismos de largura fixa, ordenação pelo
  cabeçalho (`aria-sort`), linha clicável por mouse ou Enter, rodapé com total.
- `TabelaLancamentos`: busca, filtros, ordenação, total do filtro e "mostrar mais" (100 por vez).
- Gráficos: `ColunasMes` (12 meses, grade com valores redondos, valor ao passar o mouse, mês atual
  destacado), `BarrasCategoria`, `UsoOrcamento` (barra + faixa em texto ("Tranquilo · 62%", "Atenção · 85%", "Estourou · 112%")). Todos com tabela
  escondida para leitor de tela.
- Botões `d-botao` (`primario` branco cheio, uma ação principal por tela; `secundario` contorno;
  `fantasma`; `pequeno`; `largo`), cantos de 8px. Busca e filtros (`d-busca`, `d-select`, `d-segmentos`).
- Selos de status reaproveitam `.selo` do celular.

**Interação**: foco visível em azul-ciano; atalhos `N` (lançar custo) e `/` (buscar lançamentos), que não
disparam com um campo ou janela abertos. Esc fecha gaveta e perguntas.

## Regra de manutenção

Tela ou regra nova: a conta vai para `dominio/` com teste; cada casca decide como mostrar.
Se a mudança for só do desktop, ela fica em `desktop/`. A página `apresentacao/iphone.html` é
regerada a cada versão (ver README).
