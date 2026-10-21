# Integração Sponte — documentação identificada

O usuário configurou token e código da escola como variáveis privadas na Vercel. Nenhum valor secreto deve ser incluído neste documento. A primeira consulta autenticada permanece pendente de publicação e validação.

Documentação fornecida pelo usuário e consultada em 21/10/2026:

- Manual: https://api.sponteeducacional.net.br/
- Serviço SOAP: https://api.sponteeducacional.net.br/WSAPIEdu.asmx
- Contrato WSDL: https://api.sponteeducacional.net.br/WSAPIEdu.asmx?WSDL

O manual exige Token e CodigoCliente em todos os métodos. No WSDL, os campos são `sToken` (string) e `nCodigoCliente` (int). Consultas com filtros recebem também `sParametrosBusca`; incluir esse campo mesmo quando vazio. Configurar na Vercel, exclusivamente no servidor, `SPONTE_API_TOKEN` e `SPONTE_CODIGO_CLIENTE`.

Métodos de leitura identificados:

- `GetAlunos4`: identificador estável `AlunoID`, nome, `NumeroMatricula`, `DataCadastro`, situação e turma atual. O manual especifica datas de retorno no formato dia/mês/ano.
- `GetSituacoesAlunos`: catálogo de situações; validar os valores reais da escola antes de classificar situações personalizadas.
- `GetMatriculas`: contratos relacionados por `AlunoID`, curso/turma, situação do contrato e datas. A situação do contrato não substitui a situação do aluno. Contratos de 2026 e 2027 devem ser distinguidos; não escolher simplesmente o primeiro contrato retornado.

A classificação por data de cadastro (a partir de 01/09/2026 = nova matrícula) permanece a regra aprovada. O campo TipoContratoID do Sponte não deve substituir essa regra sem confirmação do usuário.

As respostas documentadas incluem dados pessoais e campos de credenciais do portal que o Maple Check não precisa. Descartar esses campos antes de qualquer persistência; não registrar corpos XML brutos nem tokens em logs. Persistir apenas os campos necessários ao controle de matrícula.

A integração está em `src/server/sponte.ts`, as rotas em `src/app/api/sponte/sync` (POST autenticado) e `src/app/api/cron/sponte` (GET com CRON_SECRET). A migração `sponte-sync.sql` foi instalada em 21/10/2026, com RPC exclusiva de service_role e trava de execução com expiração. O botão é liberado para todos os usuários institucionais confirmados; a única diferença entre usuários continua sendo exclusão. Confirmar limites/volume, situações personalizadas e seleção do contrato durante a primeira validação real. Credenciais configuradas, por si só, não confirmam integração funcional.

Outras documentações encontradas anteriormente (não usar com este token sem confirmação):

- Sponte BI: https://sponte-bi.sponteweb.com.br/docs/ — apresenta autenticação por X-Api-Key.
- API de extrações: https://integracao.sponteweb.net.br/index.html — apresenta recursos de alunos e matrículas e uma operação de login.

Não assumir que ambas aceitam a mesma credencial. Confirmar com a origem do token a API/URL habilitada para a unidade, sem expor o token em mensagens, commits ou navegador.

O contrato necessário deve identificar: matrícula textual, ID estável do aluno, nome, curso/turma, data de cadastro original, ativo/inativo, motivo da saída se disponível, paginação, limites de uso, campos de atualização, fuso horário e se a extração representa todos os registros ou apenas alterações.

A sincronização diária deve ser idempotente, preservar o checklist, bloquear concorrência entre execuções, impedir reimportação de matrículas excluídas e somente arquivar mediante situação explícita de inatividade. Falhas ou páginas incompletas não podem remover alunos nem ser apresentadas como sincronização bem-sucedida.
