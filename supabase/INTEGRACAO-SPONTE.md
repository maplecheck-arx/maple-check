# Integração Sponte — informações pendentes

Foi informado que a escola recebeu um único token. Esse token ainda não foi fornecido ao aplicativo nem foi utilizado em requisições.

Documentações públicas encontradas:

- Sponte BI: https://sponte-bi.sponteweb.com.br/docs/ — apresenta autenticação por X-Api-Key.
- API de extrações: https://integracao.sponteweb.net.br/index.html — apresenta recursos de alunos e matrículas e uma operação de login.

Não assumir que ambas aceitam a mesma credencial. Confirmar com a origem do token a API/URL habilitada para a unidade, sem expor o token em mensagens, commits ou navegador.

O contrato necessário deve identificar: matrícula textual, ID estável do aluno, nome, curso/turma, data de cadastro original, ativo/inativo, motivo da saída se disponível, paginação, limites de uso, campos de atualização, fuso horário e se a extração representa todos os registros ou apenas alterações.

A sincronização diária deve ser idempotente, preservar o checklist, bloquear concorrência entre execuções, impedir reimportação de matrículas excluídas e somente arquivar mediante situação explícita de inatividade. Falhas ou páginas incompletas não podem remover alunos nem ser apresentadas como sincronização bem-sucedida.
