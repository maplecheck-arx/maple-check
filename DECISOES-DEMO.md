# Registro de Decisões Técnicas — Demonstração Matrículas 2027

Este documento registra a separação explícita entre os **requisitos confirmados**, as **decisões provisórias de engenharia adotadas para viabilizar a demonstração funcional** e as **pendências para a versão de produção**.

---

## 1. Requisitos Confirmados

1. **Ano Letivo e Escopo**:
   - Aplicação focada exclusivamente no processo de **2027**, para uma única unidade (Araxá) e atendendo exclusivamente à **secretaria**.
   - Preserva o número de matrícula como identificador textual (preservando zeros à esquerda, ex: `0042`).
   - Não agrupa homônimos; conciliação feita sempre pela matrícula, nunca pelo nome.
   - O antigo corte pelo número 170 foi suspenso e não é utilizado em nenhuma regra.

2. **Corte por Data para o Processo de 2027**:
   - **Data de cadastro no Sponte a partir de 01/09/2026 (inclusive)**: classificado como **Nova Matrícula** (Checklist de 16 etapas operacionais).
   - **Data de cadastro no Sponte antes de 01/09/2026**: classificado como **Rematrícula** (Checklist de 15 documentos).
   - Comparação da data civil realizada explicitamente no fuso horário `America/Sao_Paulo`.
   - Data ausente ou inválida gera estado de **Classificação Pendente** e bloqueia aprovação final até ser corrigida.

3. **Checklists Oficiais e Rótulos Estritos**:
   - **Nova Matrícula (16 itens)**:
     1. Ficha de reserva.
     2. Cadastro Sponte. (Conferência manual, não marcada automaticamente pela importação).
     3. Cadastro Lex.
     4. Plano financeiro.
     5. Assinatura digital do contrato.
     6. Assinatura digital do uso de imagem.
     7. Assinatura digital da requisição de matrícula.
     8. Assinatura digital do guia dos pais.
     9. Enviar link Lex para compra de SLM.
     10. Enviar link TellMe.
     11. Incluir na lista de WhatsApp da turma.
     12. Enviar solicitação para o financeiro.
     13. Notificação à coordenação.
     14. Envio de documentos para a Secretaria Acadêmica.
     15. Atualizar CRM.
     16. Entregar mochila e chinook. (Marcação única; contabilizada como 1 entrega de material).
   - **Rematrícula (15 itens)**:
     1. Ficha de autorização de saída do aluno.
     2. Ficha de matrícula.
     3. Contrato de prestação de serviços.
     4. Autorização de uso de imagem.
     5. Solicitação de reserva de vaga.
     6. Cópia do RG e CPF.
     7. Cópia da certidão de nascimento do aluno.
     8. Cópia da carteira de vacinação atualizada.
     9. Ficha de anamnese do aluno.
     10. Laudo oftalmológico — para turmas a partir do JK.
     11. Laudo de audiometria — para turmas a partir do JK.
     12. Comprovante de endereço, água ou luz — últimos 60 dias.
     13. Declaração de transferência — quando o aluno já tiver estudado em outra instituição.
     14. Cópia do RG e CPF dos responsáveis.
     15. Declaração de recebimento do Guia dos Pais.

4. **Regras de Marcação, Autoria e Aprovação**:
   - Todas as etapas ficam disponíveis simultaneamente (sem trava sequencial).
   - Registro de autoria (ator da sessão atual, timestamp e valor) para cada alteração.
   - Tooltip acessível por hover, foco de teclado e botão de informação `(i)` dedicado em dispositivos móveis.
   - Conclusão de todas as etapas obrigatórias transiciona o processo para **Aguardando Aprovação** (nunca para aprovado automaticamente).
   - Qualquer usuário autenticado pode conceder aprovação final.
   - Se uma etapa necessária for desmarcada após a aprovação, a aprovação é **revogada imediatamente** e o processo retorna para **Pendente** na mesma operação.
   - Remarcar o item não restaura a aprovação passada: exige nova aprovação explícita.
   - Processos inativos ou com aplicabilidade não confirmada não podem ser aprovados.

5. **Ativos, Inativos e Exclusão**:
   - Fonte da situação ativo/inativo é o Sponte.
   - Registros inativos na origem que ainda não existam no aplicativo são **ignorados** (não viram histórico de saída).
   - Alunos ativos que passam a inativo são **arquivados**: saem das listas operacionais e totais de acompanhamento, mantendo marcações preservadas em visualização histórica separada.
   - Motivos de saída suportados: `transferencia`, `desistencia`, `cancelamento` e `nao_informado`.
   - Exclusão definitiva local restrita a administradores com confirmação explícita por matrícula.

---

## 2. Decisões Provisórias de Engenharia Adotadas para a Demo

Estas decisões foram adotadas centralizadamente para viabilizar a execução autônoma da demonstração sem depender de respostas imediatas da escola ou de integrações não liberadas:

1. **Cadastro Manual sem Validação**:
   - Permite que a secretaria cadastre previamente alunos (matrícula, nome, curso e data informada).
   - O registro recebe situação `aguardando_validacao` e fica visível em aba própria ("Aguardando Validação Sponte").
   - A secretaria pode preencher o checklist livremente, mas a aprovação final é bloqueada e o aluno não é somado aos ativos validados até a conciliação pela sincronização simulada.

2. **Aluno Ausente no Retorno da Origem**:
   - Ausência em uma consulta, paginação incompleta ou erro de rede não é interpretada como inatividade. O aluno permanece no estado anterior. Apenas uma indicação explícita de `inativo` pelo provedor provoca o arquivamento.

3. **Reativação de Aluno Arquivado**:
   - Se um aluno arquivado retornar como ativo na sincronização, sua situação é restaurada para `ativo` e seu checklist permanece com as marcações anteriores, mas é exigida nova aprovação final explícita (a aprovação antiga permanece arquivada no histórico).

4. **Separação de Aplicabilidade e Conclusão**:
   - Cada item possui status booleano `concluido` separado de sua `aplicabilidade` (`obrigatorio`, `nao_se_aplica` ou `a_confirmar`).
   - Apenas os itens 10, 11 (laudos) e 13 (declaração de transferência) admitem dispensa (`nao_se_aplica`). Os outros 12 itens de rematrícula e todos os 16 de nova matrícula são estritamente obrigatórios.

5. **Mapeamento Explícito de Cursos para Laudos (JK em diante)**:
   - Cursos abaixo do JK: `Toddler`, `Nursery`, `Infantil 1`, `Infantil 2`, `Maternal`, `Berçário` -> `nao_se_aplica`.
   - Cursos a partir do JK: `Junior Kindergarten`, `Senior Kindergarten`, `JK`, `SK`, `Year 1` a `Year 9`, `1º Ano` a `9º Ano` -> `obrigatorio`.
   - Cursos desconhecidos deixam a aplicabilidade como `a_confirmar`, bloqueando a aprovação até conferência pela secretaria.

6. **Confirmação Estruturada da Declaração de Transferência**:
   - Criado campo estruturado na ficha do aluno: *"Já estudou em outra instituição?"* com opções `sim` (torna o item obrigatório), `nao` (dispensa o item como `nao_se_aplica`) e `a_confirmar`. Não exige anexos nem inferência pelo tipo do processo.

7. **Mudança de Requisitos por Alteração de Curso**:
   - Se o curso for alterado e fizer um item antes dispensado tornar-se obrigatório, ele surge pendente e revoga qualquer aprovação vigente. Mudar de curso entre turmas que mantêm os mesmos requisitos preserva o checklist e a aprovação.

8. **Retificação de Data que Cruza o Corte de 01/09/2026**:
   - Se a data de cadastro for alterada cruzando a fronteira de 01/09/2026, o checklist é substituído pelo modelo correspondente ao novo tipo (`NOVA_MATRICULA` vs `REMATRICULA`), sem migração indevida de marcações por posição ou texto, preservando histórico e revogando aprovação.

9. **Registro Mínimo de Exclusões Definitivas**:
   - Para evitar que o mock determinístico reimporte um aluno fictício excluído por um administrador no próximo ciclo de sincronização, mantém-se uma lista local de matrículas excluídas preventivamente.

10. **Motivo de Saída Não Informado**:
    - Quando a fonte externa não detalha a razão da inativação, exibe-se explicitamente *"Não informado"*, sem tentar adivinhar ou mapear códigos não documentados do Sponte.

---

## 3. Pendências e Próximos Passos para Produção

1. **Documentação e Credenciais da API Sponte**:
   - Obter os endpoints reais, autenticação por token/OAuth, formato dos contratos de aluno, situação e paginação.
   - Validar formatos de data (com ou sem timezone) e códigos reais de status (ativo/inativo/trancado/transferido).

2. **Validação das Regras Provisórias com a Escola**:
   - Validar a lista oficial de nomes de cursos/turmas da unidade Araxá que correspondem ao corte de laudos (JK em diante).
   - Confirmar o fluxo operacional para identificar se o aluno já estudou em outra instituição.

3. **Infraestrutura Real (Supabase & Autenticação)**:
   - Configurar o projeto Supabase definitivo independente do Maple Help.
   - Definir tabela de usuários e papéis com Row Level Security (RLS) verificado no servidor.
   - Validar autenticação institucional por `@maplebeararaxa.com.br` e permissões de perfil (`ADMIN` vs `SECRETARIA`).

4. **Agendamento de Sincronização Diária**:
   - Configurar Vercel Cron ou rotina de servidor executando às **00h no fuso America/Sao_Paulo**.

5. **Importação Inicial da Planilha**:
   - Manter a importação da planilha física/histórica em espera até validação e autorização expressa da equipe gestora.
