# Painel MB² · privacidade e acesso

Este painel guarda gastos de obras. Este guia explica o que protege os dados, o que **não**
protege e o que o dono precisa fazer.

## O que o login protege (e o que não)

**Protege os dados.** Com a nuvem ligada ([nuvem.md](nuvem.md)), o painel abre só a tela de
entrar (e-mail e senha) até haver uma sessão guardada. Nenhuma obra, valor ou lançamento é
desenhado antes disso.

- Depois de entrar, a sessão fica guardada no aparelho e o painel abre direto nas próximas vezes,
  **inclusive sem internet**. Falha de internet, limite de uso ou instabilidade do servidor nunca
  derrubam a sessão; só a nuvem dizer que ela foi revogada ou venceu (erro 400/401 na renovação)
  leva de volta ao login.
- A **primeira entrada num aparelho precisa de internet** (a tela avisa isso).
- **Ajustes › Sair** encerra a sessão e volta ao login. Os dados guardados no aparelho **não são
  apagados** e a sincronização para.
- A senha não é guardada em lugar nenhum; só a sessão.

**Honestidade sobre o limite:**
- O porteiro trava a **tela**. A proteção real dos dados **na nuvem** é o login do Supabase e as
  regras de acesso do banco (RLS, `painel/supabase/painel.sql`): sem entrar, o banco não entrega nada.
- Os dados **no aparelho** (IndexedDB) ficam protegidos pelo bloqueio do próprio celular
  (senha ou Face ID). Quem desbloquear o iPhone abre o painel.
- O **código do app é público**, porque o repositório é público. Isso é normal e não contém
  segredos: a chave que vai no painel é a pública.
- A **tela de login é pública por desenho**: qualquer pessoa que chegue ao endereço a vê. O endereço
  do painel **não é segredo garantido**: ele aparece também em Settings e Deployments do GitHub
  enquanto o repositório for público, e quem achar o link vê o login. Evitar divulgá-lo reduz
  visitas curiosas, mas **não é proteção**. A proteção real são o login e as regras do banco (RLS).
- Sem a nuvem ligada (build sem as variáveis), o painel abre direto, como antes. Por isso a
  publicação no GitHub **falha de propósito** se faltarem as variáveis (veja abaixo).
- **Outra conta no mesmo aparelho**: se alguém entrar com um e-mail diferente do que já usou este
  aparelho, o painel pergunta antes de enviar os dados que estão aqui para a conta nova.
- **Duas abas abertas**: elas se acompanham (entrar, sair e renovar a sessão numa vale para a outra).
- **Limites conhecidos** (baixo risco para um dono só, aceitos por enquanto):
  - Aparelho antigo, sem conta gravada, adota a **primeira conta que entrar sem perguntar**.
  - Duas abas que renovam a sessão exatamente no mesmo instante ainda podem se atropelar; na pior hipótese uma delas pede para entrar de novo.
  - Uma sessão revogada no Supabase só é notada na próxima renovação (até cerca de uma hora depois); até lá o painel continua aberto.

## Publicação sem login é bloqueada

O workflow define `VITE_EXIGIR_LOGIN=1`. Se faltar `SUPABASE_URL` ou `SUPABASE_CHAVE` no GitHub, ou a
URL não começar com `https://`, o build **falha** e nada é publicado. O dono vê a execução
"Publicar painel" em vermelho (aba Actions, passo "Testar e gerar o painel") com a mensagem
"Publicação cancelada: o painel sairia SEM tela de login" e o que falta. Para resolver, crie as duas
variáveis (Settings › Secrets and variables › Actions › Variables, passo 7 do [nuvem.md](nuvem.md)) e
rode o workflow de novo. No computador, `npm run build` e `npm run dev` continuam livres, sem login.

## Buscadores (noindex) e seu limite

O `index.html` traz `<meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex">`
e `<meta name="referrer" content="no-referrer">`. O arquivo `public/_headers` repete isso como
cabeçalho (`X-Robots-Tag`) em hospedagens que o leem (Cloudflare Pages, Netlify) e acrescenta
`X-Content-Type-Options`, `X-Frame-Options: DENY` (ninguém embute o painel em outro site) e
`Permissions-Policy` (câmera e localização bloqueadas; o **microfone fica liberado** para lançar custos por voz).
No GitHub Pages o `_headers` não faz efeito (só as `<meta>` valem); é inofensivo.

O noindex só **pede** ao buscador para não listar a página. **Não impede ninguém de abrir** o
endereço, e nada garante que todo buscador ou robô obedeça. Quem tem o link vê a tela de login.

Além disso, o build gera uma política de conteúdo (CSP) no `index.html`: só carrega código,
fontes e imagens do próprio endereço e só conversa com o banco da nuvem do build.
Foi testada abrindo login, Visão, Obras, Ajustes e Lançar custo sem nenhuma violação.

### Por que não há `robots.txt` aqui
Os buscadores só leem o `robots.txt` da **raiz do domínio** (no GitHub Pages, o do repositório do
site institucional `notdev13.github.io`, fora deste projeto); um arquivo dentro de `painel/` seria
ignorado. E um `Disallow` seria pior: se o buscador é proibido de visitar a página, **não vê o
noindex**, e pode listar o endereço mesmo assim. Para sumir de verdade, a página precisa ser
visitável e dizer "noindex".

## Importar extrato

**Visão geral › Importar extrato** atualiza o saldo de uma conta a partir de um arquivo OFX do banco.

- **O arquivo é lido só no aparelho.** Nada é enviado a lugar nenhum e o arquivo não é guardado: o
  painel lê, mostra o resultado para conferência e descarta o conteúdo.
- **O que é gravado:** só o valor do saldo, a data, a origem "extrato" e os **4 últimos dígitos** da
  conta (para reconhecer a conta nas próximas vezes). Não é gravado número de conta completo, nome,
  descrição de lançamento, CPF ou CNPJ. Com a nuvem ligada, esses mesmos dados sincronizam como
  qualquer saldo ([nuvem.md](nuvem.md)). Aparelho com versão antiga do painel pode ignorar os saldos
  "extrato" que chegarem da nuvem: atualize o painel em todos os aparelhos.
- **Regra de ouro:** nunca é aceito um extrato com data mais antiga que o último saldo da conta, e não
  existe botão para forçar. Também são recusados: extrato repetido (mesma data e valor), de data no
  futuro, e de outra conta (final diferente do já guardado). Saldo digitado por engano com data no
  futuro é ignorado nessa conferência e o painel avisa. Mudança de mais de 30% pede confirmação.
- **Limites do OFX:** só conta corrente e poupança em reais; um arquivo por conta; até 5 MB. Muitos
  aplicativos de banco no iPhone não exportam OFX: em geral o arquivo é baixado no internet banking,
  pelo computador. **O OFX é o mais seguro** (o painel lê o saldo e a data direto do arquivo): use-o
  sempre que o banco oferecer.

### Importar extrato em PDF (conferência assistida)

- **Por que a conferência é manual:** cada banco tem um layout de PDF diferente e não há campo
  "saldo" garantido. Ler o número errado, ou o sinal errado (credor x devedor), seria o pior erro
  possível num painel de dinheiro. Por isso o painel mostra o que achou (saldos e datas candidatos,
  em botões grandes) e **você escolhe**; nada é gravado sem essa escolha. O painel nunca marca
  sozinho um saldo duvidoso (pontuação baixa, "saldo anterior" ou sinal incerto); se o sinal não for
  claro, você escolhe "credor (positivo)" ou "devedor (negativo)".
- **Lido só no aparelho:** o texto do PDF é extraído aqui (biblioteca pdf.js, Apache-2.0, versão
  fixada, baixada só quando alguém importa um PDF). Nada é enviado, o arquivo não é guardado e a
  política de conteúdo do painel (CSP) não foi afrouxada. Na tela aparecem só trechos curtos, com
  sequências de 6 ou mais dígitos, CPF, CNPJ e conta escondidos (••••).
- **O que é gravado:** só valor, data e origem "extrato" (observação "Importado do extrato (PDF),
  conferido pelo dono"). O PDF não traz conta confiável: você escolhe a conta do painel e o final da
  conta **não** é gravado a partir de PDF. A conta escolhida por último é lembrada neste aparelho
  (só o identificador da conta).
- **A regra de ouro vale igual:** data escolhida mais antiga que o último saldo da conta é sempre
  recusada. Além disso, se o PDF informa o período (por exemplo "de 01/10 a 30/10") e a data
  escolhida é anterior ao fim dele, o painel avisa e pede uma confirmação extra.
- **Limites:** só PDF com texto (sem OCR: PDF que é imagem é recusado); até 10 MB e 30 páginas
  (se tiver mais, o painel avisa que leu só as 30 primeiras); sem senha (baixe o extrato sem senha).
- **Pendências (não feito):** importar as movimentações para conciliar com os custos; OCR de PDF
  escaneado; CSV; cartão de crédito; Open Finance.
- **Sem prova com PDFs reais de bancos:** os testes usam só PDFs inventados. Teste com o seu extrato
  neste aparelho: o painel mostra o que achou e nada é gravado sem a sua escolha.
- Não testado com extratos reais: cada banco escreve o OFX de um jeito. Se um arquivo real for
  recusado sem motivo, é um formato novo a tratar (nunca mande o arquivo real para o repositório).

## Checklist do dono

- [ ] Supabase: **cadastro aberto desligado** (Authentication › Sign In / Providers › Allow new users to sign up, passo 3 do [nuvem.md](nuvem.md)).
- [ ] Ligar **verificação em duas etapas (MFA/TOTP)** no Supabase Auth, se o plano permitir. [CONFIRMAR na documentação do Supabase antes de afirmar disponibilidade no plano e como ativar]. Observação: o painel hoje só tem tela de e-mail e senha; se o MFA for exigido pelo banco, a tela de entrada precisará de um passo a mais (pedir a um desenvolvedor).
- [ ] **Senha forte e única**, num gerenciador de senhas.
- [ ] iPhone com **bloqueio e Face ID** ligados.
- [ ] **Evitar divulgar o endereço** (site institucional, redes sociais, mensagens públicas). Isso só reduz visitas; não é proteção (o endereço também aparece no GitHub).
- [ ] Configurar no GitHub as variáveis `SUPABASE_URL` e `SUPABASE_CHAVE` (Settings › Secrets and variables › Actions › Variables). Sem elas, o painel publicado abre **sem login**.
- [ ] **Se perder o celular**: troque a senha e encerre as sessões no painel do Supabase (Authentication › Users, trocar a senha / sair de todas as sessões do usuário) [CONFIRMAR os nomes exatos dos botões na tela do Supabase]. Ajuste o bloqueio remoto do iPhone (Buscar iPhone). O backup em arquivo, se estiver no iCloud, continua seguro.

## Trocar de hospedagem (Cloudflare Pages, Netlify, Vercel)

- [ ] Publicar a pasta `painel/dist` (o build já leva o `_headers` junto).
- [ ] Copiar `public/_headers`. Na Vercel, ele não é lido: repetir os mesmos cabeçalhos em `vercel.json` (`headers`).
- [ ] Definir `VITE_SUPABASE_URL` e `VITE_SUPABASE_CHAVE` no ambiente de build da plataforma (a política de conteúdo usa a URL).
- [ ] **Desligar os preview deployments públicos** (cada branch ganha um endereço extra com o mesmo painel).
- [ ] **Não ligar analytics** nem scripts de terceiros da plataforma (o painel não carrega nenhum).
- [ ] Conferir que o projeto da plataforma **não é listado** em diretório público, e que o repositório não aponta o endereço no README.
- [ ] Depois de publicar, abrir o endereço sem entrar e conferir que só aparece o login; ver o código-fonte da página e achar o `noindex`.
