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
