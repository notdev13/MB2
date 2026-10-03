# MB2 Obras · banco de dados (Supabase)

## O que tem
`supabase/migrations/20261003000000_estrutura_inicial.sql` cria:

- **Tabelas**: perfis, obras, membros da obra, etapas (cronograma), diário + efetivo, fotos, pedidos de material, ocorrências, lançamentos de custo e auditoria.
- **Segurança (RLS) em todas as tabelas**:
  - quem não é membro de uma obra não vê nada dela;
  - mestre registra diário, fotos, ocorrências e pedidos, mas **não vê custos**;
  - engenheiro e responsável aprovam pedidos e editam o cronograma;
  - diretoria vê e gerencia tudo;
  - ninguém consegue promover o próprio perfil.
- **Fotos** em bucket privado `fotos-obra` (pasta = id da obra), abertas só por link assinado.
- **Auditoria**: toda inclusão, alteração ou exclusão fica registrada com autor e horário.
- Novo usuário entra como `visualizador`; a diretoria promove.

Testado num Postgres 16 local: a estrutura foi criada sem erro e as regras de acesso bloquearam o que deviam (outro usuário não vê a obra; mestre não lança custo nem vira diretoria).

## Como instalar
1. Criar o projeto em supabase.com (região São Paulo, `sa-east-1`).
2. No painel: **SQL Editor → New query**, colar o arquivo `.sql` e rodar.
   (Ou, com a CLI: `supabase link` e `supabase db push`.)
3. Em **Authentication → Providers**, deixar só e-mail (ou telefone) e ativar MFA.
4. Criar o primeiro usuário, e no SQL Editor:
   `update perfis set papel = 'diretoria' where id = '<id do usuário>';`
5. Nunca colocar a chave `service_role` no app; ele usa só a chave `anon`.

## Equipe da obra pelo app
`supabase/migrations/20261003100000_equipe.sql` cria três funções que o app usa na tela **Equipe da obra**:

- `listar_equipe(obra)`: qualquer membro da obra vê nome, e-mail e papel de quem está nela.
- `adicionar_membro(obra, e-mail, papel)`: inclui (ou muda o papel de) uma pessoa que **já criou conta no app**. Se o e-mail não tiver conta, aparece o aviso para a pessoa criar a conta primeiro.
- `remover_membro(obra, pessoa)`: tira a pessoa da obra.

Quem pode mudar a equipe: diretoria, responsável e engenheiro da obra (a mesma regra de quem aprova pedidos, `pode_aprovar`). Além disso:

- só diretoria ou responsável dão o papel **Responsável** ou mexem em quem já é responsável;
- ninguém muda o próprio papel nem tira a si mesmo;
- estas funções nunca mudam o papel da empresa (`perfis.papel`): ninguém vira diretoria por aqui.

### Como instalar
1. No painel do Supabase: **SQL Editor → New query**.
2. Colar todo o arquivo `20261003100000_equipe.sql` e clicar em **Run**. Pode rodar de novo sem problema.
   (Ou, com a CLI: `supabase db push`.)
3. Para gente nova entrar sozinha pelo app (botão **Criar conta**), em **Authentication → Providers → Email** deixar **Enable sign ups** ligado. Se **Confirm email** estiver ligado, a pessoa confirma pelo link no e-mail antes de entrar.
4. Conta nova não vê nenhuma obra até alguém adicionar o e-mail dela na equipe.
