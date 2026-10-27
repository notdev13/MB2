# Site institucional da MB2

Site estático, sem build. Abra `index.html` num servidor local (por exemplo
`python3 -m http.server` dentro desta pasta) porque a página carrega
`dados/obras.json` por `fetch`, o que não funciona abrindo o arquivo direto.

## Arquivos

- `index.html`: a página. Textos fixos ficam aqui.
- `css/estilo.css`: estilos, escritos primeiro para o celular. Cores, fontes,
  tamanhos e espaços estão nos tokens do começo do arquivo; tema escuro automático.
- `js/site.js`: menu, fotos do topo (vídeo só no computador), grade de obras,
  contato e cadastro. Sem dependências.
- `dados/obras.json`: dados da empresa, a casa em destaque, as 12 obras e as
  fotos do topo. Campo vazio ou `null` aparece como "a confirmar" ou some.
- `imagens/obras/`: cada foto em 480 px (celular) e 1400 px (computador), WebP.
- `video/`: tour em vídeo do topo (só no computador) e posters.

## Para atualizar

- Nova obra: adicione a foto em dois tamanhos em `imagens/obras/` e um item em
  `dados/obras.json`.
- Telefone, WhatsApp, e-mail, endereço e CNPJ: preencha em `empresa` no JSON.
  Com o WhatsApp preenchido, o botão fixo do celular abre a conversa.

## Publicação

O workflow `.github/workflows/site.yml` publica esta pasta na raiz do GitHub Pages
a cada mudança na `main`, e o painel (pasta `painel/`) em `/painel/`, no mesmo
endereço. Uma vez só, em Settings > Pages, escolha Source = "GitHub Actions".
O site fica em `https://notdev13.github.io/MB2/` e o painel em
`https://notdev13.github.io/MB2/painel/`, até o domínio `mb2incorporacoes.com.br`
ser apontado (Settings > Pages > Custom domain).
