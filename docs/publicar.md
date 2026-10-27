# MB2 Obras · publicar no iPhone (TestFlight) e no Android

Os builds (o "pacote" do app) são feitos **na nuvem da Expo**: não precisa de Mac nem de Xcode.
Tudo abaixo é feito no **Prompt de Comando (cmd)** do Windows, um comando por vez.

## O que precisa antes (só uma vez)

1. **Conta da Expo** `mb2inc` (já existe).
2. **Apple Developer Program**: US$ 99 por ano, em developer.apple.com → **Account** → **Enroll**.
   - **Conta de empresa** (recomendado: o app aparece como "MB2 Incorporações"): a Apple exige o
     **número D-U-N-S** da empresa. É gratuito, pedido pelo próprio site da Apple durante o cadastro,
     mas pode levar alguns dias (às vezes semanas) para sair.
   - **Conta individual** (no nome de uma pessoa): sai mais rápido, sem D-U-N-S, mas o app aparece
     com o nome da pessoa.
   - O Apple ID usado precisa ter verificação em duas etapas ligada.
3. **Google Play Console** (só para publicar na loja do Google, não precisa para o teste interno
   com APK): US$ 25, pagamento único, em play.google.com/console. Conta de empresa também pede D-U-N-S.
4. **Node.js** e **Git** instalados no computador (o Git é obrigatório para o EAS; baixe em git-scm.com
   se o comando `git --version` der erro).

O plano gratuito da Expo tem um **limite mensal de builds gratuitos** e os builds podem esperar
numa fila. Para o uso normal (alguns builds por mês) é suficiente.

## Preparar o computador (só uma vez)

1. Abra o **Prompt de Comando** (tecla Windows, digite `cmd`, Enter).
2. Instale a ferramenta da Expo:
   `npm install -g eas-cli`
3. Entre na conta da Expo (abre o navegador; entre com a conta **mb2inc**):
   `eas login`
4. Confira se entrou certo (deve aparecer `mb2inc`):
   `eas whoami`
5. Vá para a pasta do app:
   `cd C:\Users\THE13\MB2\app`
6. Ligue esta pasta ao projeto na Expo (responda **Yes**/Enter às perguntas):
   `eas init`
   - Isso cria o projeto "mb2-obras" na conta mb2inc e grava o **ID do projeto** no `app.json`
     (campo `extra.eas.projectId`).
   - **Mande esse ID** (aparece na tela como `ID: ...`) para quem cuida do código, para ele ficar
     salvo no projeto. Se baixar uma versão nova do código antes disso, é só rodar `eas init` de
     novo: ele reconhece o projeto que já existe.

## iPhone: TestFlight

1. Na pasta do app (`cd C:\Users\THE13\MB2\app`), gere o build:
   `eas build --platform ios --profile production`
   - Na primeira vez ele pede para **entrar com o Apple ID** da conta de desenvolvedor.
     Responda **Yes** para ele criar e guardar sozinho os certificados da Apple.
   - Leva uns 15 a 30 minutos. Pode fechar a janela: o andamento fica em expo.dev
     (conta mb2inc → projeto mb2-obras → **Builds**).
2. Quando terminar, envie para a Apple:
   `eas submit --platform ios --latest`
   - Ele pede o Apple ID de novo e, na primeira vez, **cria o app no App Store Connect** sozinho
     (não precisa preencher nenhum código da Apple no projeto: ele pergunta o que faltar).
   - A Apple leva de 5 a 30 minutos para "processar" o build.
3. Adicione quem vai testar, em appstoreconnect.apple.com:
   - **Testadores internos** (até 100 pessoas da equipe, **sem revisão** da Apple): primeiro
     cadastre a pessoa em **Usuários e Acesso** (botão **+**). Depois abra **Apps** → **MB2 Obras**
     → aba **TestFlight** → em **Teste interno** clique **+** para criar um grupo, e adicione as pessoas.
   - **Testadores externos** (qualquer pessoa, por e-mail ou link público): aba **TestFlight** →
     **Teste externo** → **+**. O primeiro build passa por uma **revisão rápida da Apple**
     (normalmente 1 dia).
4. Cada testador recebe um e-mail, instala o app **TestFlight** pela App Store e toca em
   **Instalar** no MB2 Obras. Cada build vale por 90 dias no TestFlight.

## Android: APK para instalar direto

1. Na pasta do app:
   `eas build --platform android --profile preview`
2. Na primeira vez, responda **Yes** para ele criar a chave de assinatura do Android.
3. No fim aparece um **link e um QR code**. Abra no celular Android, baixe o arquivo e toque
   para instalar. O celular pede para **permitir instalar apps desta fonte**: permita.
4. Mande o mesmo link para os outros testadores Android.

(Para a Play Store, mais para frente: `eas build --platform android --profile production` gera o
arquivo da loja. O primeiro envio ao Google é feito à mão no Play Console.)

## Versões novas do app

1. Baixe o código novo para a pasta (`git pull` dentro de `C:\Users\THE13\MB2`).
2. Rode de novo `eas build --platform ios --profile production` e depois
   `eas submit --platform ios --latest`. O **número do build sobe sozinho** (fica guardado na Expo),
   não precisa mexer em nada.
3. Para Android, rode de novo `eas build --platform android --profile preview` e mande o novo link.
4. Os testadores do TestFlight recebem aviso de atualização no próprio app TestFlight.

A versão que aparece na loja ("1.0.0", no `app.json`) só muda quando for lançar uma versão
pública nova.

**Atualização sem novo build** (`eas update`, que manda só mudanças de tela/texto direto para o
celular): ainda **não** está configurada neste app (falta o pacote `expo-updates`). Dá para
adicionar depois; até lá, toda mudança precisa de um build novo.

## Observações
- O perfil `development` do `eas.json` é só para programadores; para testar no dia a dia
  continue usando o **Expo Go** (veja `app/README.md`).
- A URL do Supabase e a chave **anon** vêm do arquivo `app/.env` (crie a partir de `app/.env.example`; ele não fica no repositório) e entram no build sozinhas.
  Nunca coloque a chave `service_role` no app.
