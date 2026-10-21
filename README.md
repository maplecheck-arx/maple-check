# Maple Check

Aplicativo da secretaria da Maple Bear Araxá para acompanhar matrículas e rematrículas de 2027.

## Ambiente escolhido

- GitHub: https://github.com/maplecheck-arx/maple-check
- Supabase: `nxbqeutabwlpqzlnkkul` (organização maple check).
- Hospedagem prevista: Vercel.

O projeto do Maple Help permanece separado. O projeto anterior `Secretaria Matriculas` não é o destino desta aplicação.

## Executar

Use Node.js 22.12 ou mais recente.

```sh
npm ci
# Preencha .env.local seguindo .env.example.
npm run dev
```

Variáveis públicas: `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Nunca use uma chave `service_role`, `sb_secret_...` ou o token do Sponte em variáveis `NEXT_PUBLIC_`.

```sh
npm test
npm run build
npm start
```

## Banco e autenticação

`supabase/schema.sql` contém a instalação inicial para um banco novo. Não deve ser reaplicado em um banco já instalado. Não apaga tabelas existentes e não inclui alunos nem contas de demonstração. Após instalar, conferir as funções pelo Data API e executar os advisors do Supabase.

Os registros ficam no schema privado `secretaria`, com RLS e sem permissões diretas para `anon`/`authenticated`. Duas funções públicas, sem SECURITY DEFINER, encaminham a leitura e os comandos para funções privadas. Estas validam a identidade no Supabase Auth, confirmação do e-mail e domínio institucional em toda chamada. Autor e horário de marcação são definidos pelo banco.

Os administradores são reconhecidos pelo e-mail confirmado em `auth.users`:

- isaque.santos@maplebeararaxa.com.br
- jose.reis@maplebeararaxa.com.br
- pedro.ashidani@maplebeararaxa.com.br

A única diferença operacional é a exclusão de cadastros. Metadados editáveis pelo usuário não concedem privilégios. A exclusão remove o registro e guarda somente matrícula/ano/autor/data para impedir reimportação automática.

Configurar no Supabase Auth a confirmação de e-mail, o domínio final em Site URL e as URLs permitidas de retorno para confirmação/recuperação. Validar envio real de e-mails com as contas institucionais antes da liberação. As contas não são copiadas do Maple Help.

## Regras de 2027

- Cadastro em 01/09/2026 ou depois: nova matrícula (16 etapas).
- Cadastro anterior: rematrícula (15 documentos).
- Data ausente: classificação pendente. O número 170 não é usado.
- Cadastro manual começa aguardando validação no Sponte, permite preencher etapas e bloqueia aprovação final.
- Todas as etapas aplicáveis ficam disponíveis simultaneamente.
- Qualquer usuário pode aprovar após validação e conclusão das etapas obrigatórias.
- Desmarcar uma etapa obrigatória revoga a aprovação na mesma transação.
- Alteração cadastral exige nova conferência final. Mudança de classificação preserva o checklist anterior.
- Alterações usam revisão da ficha; uma edição antiga não sobrescreve uma revisão mais recente.
- Alunos inativos ficam fora das listas operacionais e permanecem no histórico. A importação efetiva depende do Sponte.

## Limites atuais para publicação

O código não contém login fictício, troca de perfil, reset de demonstração ou sincronização simulada em produção. Os cenários simulados restantes são exclusivos dos testes, em `src/test-fixtures`.

A estrutura do banco foi instalada no projeto Supabase escolhido em 21/10/2026, pela migração `maple_check_initial_schema`. O login das integrações Supabase e GitHub foi liberado. A validação do fluxo de autenticação depende da configuração de SMTP. A implantação na Vercel ainda não foi realizada.

A sincronização Sponte ainda não está implementada: falta confirmar qual API foi habilitada e seu contrato de dados. Não há cron ativo. O horário solicitado é 00:00 de Brasília. Quando implementada, a integração será executada exclusivamente no servidor; a aplicação consultará seu próprio banco. A ausência de um aluno em uma resposta não será tratada automaticamente como inativação.

## Verificação

Os testes de domínio e do SQL usam dados artificiais. O SQL é executado em PostgreSQL local com PGlite e uma representação mínima de `auth.users`; os testes cobrem autorização, bloqueio de acesso externo, autoria, concorrência, duplicação, classificação, aprovação e revogação. Isso não substitui a validação ponta a ponta do Supabase Auth e do Data API do ambiente real.

### Situação conferida em 21/10/2026

- Compilação de produção concluída, incluindo a verificação de TypeScript.
- 30 testes automatizados de domínio e banco aprovados.
- Servidor de produção local respondeu HTTP 200 em `http://127.0.0.1:3000`.
- A verificação visual final em computador/celular está pendente: não havia navegador disponível para automação nesta sessão.
- Banco instalado: três tabelas com RLS, acesso direto negado aos usuários e às sessões anônimas, duas funções públicas com acesso restrito a sessões autenticadas. Os modelos possuem 16 e 15 itens, respectivamente; nenhum aluno foi inserido pela instalação.
- O Security Advisor retornou três avisos informativos de RLS sem políticas, esperados para as tabelas privadas acessadas exclusivamente pelas funções verificadas, e um aviso de proteção contra senhas vazadas desabilitada. Referência: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- PostCSS atualizado para 8.5.31, incluindo a dependência transitiva do Next. A auditoria passou de 11 para 9 alertas (5 altos e 4 moderados), sem críticos. Restam dependências transitivas de Tailwind e ExcelJS/uuid; precisam de avaliação de compatibilidade antes da liberação operacional. Não foi aplicado `audit fix --force`.

Para liberar o uso da secretaria: configurar e testar os e-mails de autenticação, publicar na Vercel e verificar cadastro/checklist/exclusão com contas reais de cada perfil. A sincronização e a aprovação dependente da validação do Sponte continuam aguardando a definição da API.
