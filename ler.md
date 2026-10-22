

Você é o desenvolvedor senior responsável por implementar uma demonstração funcional de um aplicativo para a secretaria de uma unidade Maple Bear. Execute o desenvolvimento e entregue a aplicação funcionando, com testes dos fluxos principais e instruções para demonstração. Não se limite a apresentar um plano ou telas estáticas.

O objetivo desta entrega é validar a interface e as regras de trabalho com dados fictícios. A integração real com o Sponte ainda não pode ser implementada: a documentação e as credenciais não foram liberadas. Não invente endpoints, parâmetros, respostas oficiais ou funcionalidades da API.

## 1. Limites desta entrega

- Desenvolva em um projeto novo e isolado. O workspace previsto é `C:\Users\Isaque\Desktop\sem nome ate escolher`; confirme o diretório e as instruções locais antes de editar. Preserve arquivos preexistentes.
- NÃO modifique, execute migrações, instale dependências ou faça commits no projeto Maple Help. Não o utilize como diretório de trabalho.
- O Maple Help pode ser consultado SOMENTE PARA LEITURA, como referência de login. O local anteriormente identificado foi `C:\Users\Isaque\Downloads\Maple-Help-main\Maple-Help-main`; verifique sua existência antes de consultar.
- Arquivos indicados pelo usuário para leitura: `app/page.tsx`, `lib/supabase.ts`, `proxy.ts` e os componentes relevantes em `components/ui/`.
- Não leia ou copie segredos, arquivos `.env`, credenciais, sessões ou dados reais do Maple Help. Não conecte a demonstração ao banco desse aplicativo.
- Não importe os alunos nem as marcações da planilha real. Essa importação está expressamente em espera.
- Utilize exclusivamente dados fictícios nesta demonstração, inclusive em relatórios e registros de atividade.
- Não envie e-mails, mensagens, documentos ou solicitações a pessoas ou serviços reais.
- Não provisione Supabase/Vercel, não altere projetos existentes e não publique externamente por iniciativa própria. Entregue execução local e preparação para implantação posterior.
- Não acrescente funcionalidades para outros setores, múltiplas unidades, cobrança, CRM completo, prontuários, IA ou gestão acadêmica geral.

## 2. Contexto e objetivo do produto

O aplicativo substituirá a planilha da secretaria que controla tarefas de matrícula e documentos de rematrícula. A primeira versão atende uma única unidade e apenas à secretaria.

O usuário precisa encontrar um aluno por nome ou matrícula, abrir sua ficha, acompanhar o checklist adequado, identificar pendências, registrar conclusões e realizar a aprovação final. A equipe executa as tarefas fora do aplicativo; o sistema registra seu cumprimento.

Nome de trabalho: **Secretaria — Matrículas 2027**. Esse é um nome provisório, não uma marca definitiva aprovada.

O prazo desejado é o mais rápido possível. Priorize uma demonstração completa e utilizável, com arquitetura simples. Não prometa data de produção sem a integração real validada.

## 3. Requisitos confirmados

### 3.1 Alunos e identificação

- Dados principais visíveis: número de matrícula, nome e curso. Exiba turma na ficha quando disponível.
- Um aluno não possui mais de uma matrícula/curso no mesmo ano, conforme a informação recebida.
- O número da matrícula permanece igual entre os anos.
- O processo demonstrado é o ano letivo de **2027**. Não implementar troca de anos simultâneos ou geração automática de rematrículas futuras.
- Diferencie a data de cadastro do aluno no Sponte, a data de inclusão no nosso aplicativo e o ano letivo. São informações diferentes.
- Trate a matrícula como identificador textual, preservando zeros à esquerda. Use um ID interno independente.
- Para a demonstração, concilie registros simulados pela matrícula. Guarde um identificador externo separado se o contrato interno o prever. A estabilidade dos identificadores reais ainda depende da documentação do Sponte.
- Nunca concilie automaticamente pelo nome. Homônimos devem permanecer separados, e alterações no nome não devem criar outro aluno.
- O antigo corte pelo número **170 foi suspenso**. Não o use em código, fixtures ou regras de classificação.

### 3.2 Classificação por data, exclusiva do processo de 2027

| Data de cadastro no Sponte | Tipo | Checklist |
|---|---|---|
| A partir de **01/09/2026**, inclusive | Nova matrícula | 16 etapas operacionais |
| Antes de **01/09/2026** | Rematrícula | 15 documentos |

- A regra mais recente é automática pela data; ela substitui a proposta anterior de classificação manual e qualquer corte por número de cadastro.
- Compare a data civil com interpretação explícita no fuso `America/Sao_Paulo`. Se receber uma data sem horário, não converta inadvertidamente para o dia anterior.
- A futura interpretação do formato real do Sponte precisa ser validada na integração; o formato do mock deve ser documentado como contrato interno.
- Não confunda data de cadastro com data de nascimento, início de aula ou inclusão local.
- Data ausente ou inválida não pode virar rematrícula por padrão. Mostre classificação pendente e impeça aprovação até o dado ser corrigido.
- Não generalize esse corte automaticamente para 2028 ou outros períodos.

### 3.3 Ativos, inativos e exclusão

- A situação ativo/inativo tem como fonte o Sponte.
- Somente alunos ativos participam do acompanhamento operacional validado.
- Um registro inativo ainda não existente no aplicativo NÃO deve ser importado como aluno.
- Se um aluno já existente passar a inativo, arquive-o preservando histórico, checklist e eventos anteriores.
- Alunos arquivados não aparecem na lista operacional e não entram nas contagens de pendências, aprovações atuais ou alunos em acompanhamento.
- O histórico arquivado pode ser consultado em uma visualização separada para consulta e relatório de saídas. Não permitir marcar itens ou aprovar um processo inativo.
- O tipo nova matrícula/rematrícula é independente da situação ativo/inativo.
- Há motivos de saída: transferência, desistência e cancelamento. Não deduza esses motivos a partir de um simples `inativo`; aceite também motivo não informado.
- Deve existir exclusão definitiva local, restrita a administradores, com confirmação explícita identificando o aluno. Na demonstração, atua apenas sobre dados fictícios.
- Nenhuma dessas ações modifica o Sponte.

### 3.4 Checklist de NOVA MATRÍCULA — 16 itens

Use estes rótulos e preserve os itens separados:

1. Ficha de reserva.
2. Cadastro Sponte.
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
16. Entregar mochila e chinook.

- Mochila e chinook são UMA marcação. Não dividir em duas entregas.
- Não completar automaticamente “Cadastro Sponte” só porque o cadastro foi importado: a marcação é uma conferência da secretaria.
- Os verbos “enviar”, “notificar” e “atualizar” significam registrar uma ação já executada pela equipe. Não implementam integrações de envio ou CRM.

### 3.5 Checklist de REMATRÍCULA — 15 documentos

A fotografia identificada pelo usuário como rematrícula contém:

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

- Preserve “Cópia do RG e CPF” sem inventar de quem é o documento; há um item separado para responsáveis.
- O aplicativo registra recebimento/conferência, não armazena os documentos ou seu conteúdo.
- “Últimos 60 dias” é uma condição que a equipe confere, não um prazo de tarefa nem uma solicitação para implementar armazenamento documental.
- Os itens condicionais precisam de aplicabilidade separada da marcação de conclusão; veja as decisões provisórias da seção 4.

### 3.6 Marcação, autoria e aprovação

- Todas as etapas ficam disponíveis ao mesmo tempo, sem sequência ou dependência entre tarefas.
- Para cada item aplicável, conclusão é verdadeiro/falso.
- Usuários normais e administradores podem marcar e desmarcar itens de alunos ativos.
- Registre ator, instante e valor anterior/novo para cada mudança. Ao marcar, mostre “Marcado por: [nome]” e data/hora no tooltip.
- Tooltip deve funcionar por mouse e foco de teclado. No celular, use toque em um botão de informação separado da caixa de seleção para não desmarcar por acidente.
- O ator vem da sessão ou identidade fictícia selecionada; não é um campo digitável na marcação.
- Preservar autoria anterior no histórico ao desmarcar e marcar novamente. A informação principal do item concluído mostra a marcação atualmente válida.
- Todas as etapas necessárias concluídas deixam o processo em **Aguardando aprovação**, não em concluído automaticamente.
- Qualquer usuário autenticado pode dar a aprovação final. Registre aprovador e data/hora.
- Desmarcar uma etapa necessária após aprovação retira a aprovação vigente e devolve o processo para pendente na mesma operação lógica. Guarde o evento de aprovação anterior no histórico.
- Marcar o item novamente NÃO restaura aprovação automaticamente: exige nova aprovação explícita.
- Processo inativo, sem classificação ou com aplicabilidade não resolvida não pode ser aprovado.
- Não criar observações, anexos, comprovantes, prazos, atribuição de tarefas ou responsáveis individuais por aluno.

## 4. Decisões provisórias de engenharia, somente para viabilizar a demonstração

Estas decisões não foram confirmadas pelo usuário como regras definitivas. Implemente-as de forma simples e centralizada e registre-as em `DECISOES-DEMO.md`. Não esconda decisões novas dentro do código.

1. **Cadastro manual sem validação:** permitir cadastrar matrícula, nome, curso e data de cadastro informada. Identificá-lo como “Aguardando validação no Sponte”. Disponibilizar uma visualização separada dos ativos validados, permitir preencher o checklist, mas bloquear aprovação final e excluir dos totais de ativos até a primeira confirmação simulada. Não chamar esse aluno de ativo confirmado.
2. **Aluno ausente no retorno:** manter o estado anterior. Ausência, paginação incompleta ou erro de consulta não significa inatividade. Só arquivar por situação explicitamente inativa recebida pelo provedor simulado.
3. **Reativação:** restaurar aluno arquivado quando vier ativo novamente, preservar suas marcações, mas exigir nova aprovação final. Manter a aprovação histórica visível como histórica.
4. **Aplicabilidade:** manter `concluído` booleano separado de `obrigatório`, `não se aplica` e `a confirmar`. Todos os itens incondicionais são obrigatórios. Somente os dois laudos e a declaração de transferência admitem não aplicação. Não oferecer dispensa genérica dos outros documentos.
5. **Laudos a partir do JK:** usar um mapeamento explícito dos cursos fictícios: Toddler e Nursery abaixo do JK; Junior Kindergarten, Senior Kindergarten e Year 1 em diante a partir do JK. Não ordenar cursos alfabeticamente. Curso desconhecido deixa a aplicabilidade a confirmar. O mapeamento real será validado com a escola.
6. **Declaração de transferência:** apresentar uma confirmação estruturada “Já estudou em outra instituição?” com sim/não/a confirmar, inicialmente preenchida apenas nas fixtures conhecidas. Não inferir a resposta pelo tipo rematrícula. Não pedir nome da instituição ou anexos. A confirmação é uma decisão provisória, necessária para demonstrar a regra da lista.
7. **Mudança de requisitos:** se um item antes dispensado passar a obrigatório, começar como pendente e retirar aprovação vigente. Mudar curso sem alterar requisitos preserva checklist e aprovação; esse caso não deve reiniciar todas as etapas.
8. **Correção de data que muda o tipo:** abrir o checklist correspondente ao novo tipo, sem copiar marcações por posição ou por semelhança de texto. Preservar a versão anterior para histórico e retirar aprovação. Não misturar os dois modelos.
9. **Exclusão e reimportação:** excluir o aluno fictício e os detalhes associados, preservando apenas um registro mínimo de exclusão por matrícula para evitar que o mock o recrie no próximo ciclo. Documentar que essa é uma política provisória para validar antes da integração real. Não implementar recuperação de excluídos como funcionalidade extra.
10. **Motivo da saída:** mostrar “Não informado” quando a fonte não trouxer motivo. Para demonstrar os relatórios, incluir fixtures com os três motivos e fixtures sem motivo. Não inventar o significado de códigos do Sponte.

Esses casos não devem paralisar a implementação da demo nem ser apresentados como decisões finais da escola.

## 5. Autenticação e perfis

O comportamento de referência descrito para o Maple Help é:

- Login com e-mail e senha.
- Criação de conta.
- Recuperação de senha.
- Restrição ao domínio exato `@maplebeararaxa.com.br`.
- Supabase Auth como tecnologia de autenticação.
- Proteção de rotas e distinção de permissões.

Reproduza os fluxos de interface e validação pertinentes. Se puder consultar o código de referência em leitura, documente o que realmente verificou. Se o caminho não estiver disponível, prossiga com esta especificação e declare que a equivalência exata ainda não foi verificada.

Para a demonstração sem credenciais:

- Criar um modo explícito **“Demonstração — dados fictícios”**, com identidades fictícias predefinidas para testar usuário normal e administrador.
- Fornecer uma forma clara de entrar com esses perfis e trocar de identidade, sem usar contas reais. Criar três perfis administrativos fictícios e pelo menos dois usuários normais fictícios.
- As telas de cadastro e recuperação devem validar campos e informar claramente que o comportamento é simulado. Não afirmar que um e-mail foi enviado.
- Não gravar senhas digitadas no armazenamento do navegador. Não aceitar senhas reais para operar a demo.
- O seletor de perfis e as sessões simuladas só existem em modo de demonstração. Não apresentar essa simulação como autenticação segura de produção.
- Após sair, as telas internas exigem novo acesso à demonstração. As permissões devem ser verificadas também na camada de operações do mock, não apenas pela ausência de um botão.
- Usuário normal pode consultar, cadastrar manualmente, editar os campos permitidos, marcar/desmarcar, aprovar e exportar. Somente administradores podem executar exclusão.
- Controles de simulação e reset são ferramentas da demo, restritas ao painel de demonstração administrativa; não os misture ao fluxo normal da secretaria.
- Não implementar gestão completa de usuários, promoção de administradores ou permissões adicionais nesta fase.

Preparação para a versão real: manter uma fronteira clara para o provedor de autenticação e armazenamento; não reutilizar automaticamente o projeto Supabase, contas ou permissões do Maple Help. A mesma experiência de login não implica compartilhar a mesma base.

## 6. Sincronização simulada e prioridade dos dados

Crie um provedor interno de registros escolares e um mock determinístico. Documente que esse contrato foi criado para a aplicação e NÃO corresponde à API oficial do Sponte.

Fluxo esperado na versão real: uma execução diária às **00h no fuso America/Sao_Paulo**. Uma execução pode precisar de várias requisições por paginação; não prometer uma única chamada HTTP. Na demo, simule o ciclo por ação administrativa explícita e não ative agendamento real.

Regras da simulação:

- Consultas por nome/matrícula e abertura da ficha leem somente a base local da aplicação.
- O provedor de origem só é consultado ao acionar a sincronização simulada.
- Dados cadastrais do mock de origem prevalecem sobre correções locais: nome, curso, turma, data de cadastro e situação, quando presentes e válidos no contrato simulado.
- Não substituir valores por `undefined` nem transformar resposta malformada em atualização válida. Mostrar o erro sem corromper os dados.
- Checklist, autoria, aprovações e histórico são dados do aplicativo, não campos a sobrescrever pela origem.
- Conciliar cadastro manual pela matrícula, preservando as marcações. Não duplicar por diferença de nome.
- A sincronização não reinicia checklists por padrão. Aplicar somente as transições descritas para alteração de tipo/aplicabilidade e inatividade.
- Repetir o mesmo lote não duplica alunos, checklists nem eventos de mudança sem alteração efetiva. Cada execução pode ter seu próprio registro de resultado.
- Uma falha simulada não apaga dados, não arquiva alunos e não atualiza a data da última execução bem-sucedida.
- Mostrar resultado legível: novos alunos, registros atualizados, arquivados, reativados, inativos ignorados, excluídos ignorados e erros. Diferenciar última tentativa de último sucesso.
- Não inferir que um aluno inexistente no nosso banco, recebido como inativo, deva virar histórico de saída: ele é ignorado. O relatório histórico contém os que efetivamente foram acompanhados e depois arquivados.
- Evitar corridas entre edição, aprovação e sincronização. Na demo local, serialize operações sobre o estado atualizado e impeça salvamentos que revertam mudanças recentes sem indicação.

Disponibilize cenários determinísticos: importar ativo novo; ignorar inativo novo; corrigir cadastro manual; atualizar nome/curso; inativar existente; reativar existente; repetir lote; falhar sem perda de dados; tentar reimportar exclusão.

## 7. Telas e experiência de uso

### 7.1 Entrada

Login e fluxos de criação de conta/recuperação simulados. Selo discreto e persistente de demonstração. Controles explícitos para acessar perfis fictícios.

### 7.2 Lista operacional

- Exibir somente alunos ativos validados por padrão.
- Busca por matrícula e nome, com suporte a busca sem diferença entre maiúsculas/minúsculas e acentos.
- Colunas essenciais: matrícula, nome, curso, tipo, progresso, estado do processo e acesso à ficha.
- Pendências sinalizadas com `!` vermelho e texto acessível. Não depender apenas da cor; permitir consultar o que falta.
- Separar “Pendente”, “Aguardando aprovação” e “Aprovado”. Um checklist sem pendência documental mas sem aprovação não deve ser chamado de aprovado.
- Oferecer tabela operacional com acesso às marcações. Pode agrupar por tipo ou usar abas para evitar misturar 31 colunas diferentes e mostrar itens inexistentes como pendências.
- Busca e navegação devem refletir o mesmo estado da ficha individual.
- Visualizações separadas, simples, para cadastros aguardando validação e histórico de inativos.

### 7.3 Ficha individual

- Cabeçalho com identificação, tipo, situação e progresso.
- Mostrar exclusivamente o checklist correspondente ao aluno, com itens condicionais identificados.
- Editar dados cadastrais locais permitidos e avisar de forma breve que serão atualizados pelos dados da origem na próxima sincronização. Não permitir que a secretaria altere manualmente ativo/inativo de aluno já validado.
- Aprovação explícita e autoria/data visíveis; bloqueios com motivo compreensível.
- Histórico simples dos eventos do aluno, sem criar um módulo complexo de auditoria.
- Exclusão só aparece para administradores e exige confirmação. Diferenciar exclusão definitiva de arquivamento por inatividade.

### 7.4 Relatórios

- Implementar visualização e exportações funcionais em **`.xlsx` e `.pdf`**. Não renomear CSV como Excel e não entregar botão sem ação.
- Aplicar o mesmo recorte de dados na tela e nos dois arquivos.
- Incluir ano letivo, data/hora de geração e indicação de dados fictícios.
- Métricas operacionais incluem apenas ativos validados: total acompanhado; novas matrículas; rematrículas; processos aprovados; aguardando aprovação; processos com etapas pendentes; relação das etapas pendentes por aluno.
- Entregas de material contam marcações válidas do item único “Entregar mochila e chinook” nos processos de nova matrícula ativos. Não contar duas peças como duas entregas nem aplicar a rematrículas, cujo checklist não possui esse item.
- Exibir saídas/arquivados em bloco histórico separado, com transferência, desistência, cancelamento e motivo não informado.
- Para alunos arquivados, eventuais entregas históricas devem ficar explicitamente separadas das entregas dos ativos. Não misturar as bases nas mesmas somas.
- Cadastros provisórios aparecem em contagem separada de aguardando validação.
- Definir os denominadores: `Pendente + Aguardando aprovação + Aprovado = ativos com classificação/aplicabilidade resolvidas`, com necessidades de conferência destacadas separadamente, sem sumir dos totais de ativos.
- Contagem de etapas pendentes não é contagem de alunos; nomear cada indicador corretamente.
- Itens não aplicáveis não contam como pendentes nem como documentos entregues. Não inferir recebimento a partir de dispensa.
- Os relatórios históricos mostram registros preservados; não prometer rastreabilidade detalhada de alunos excluídos definitivamente.
- Verificar paginação, acentuação e legibilidade do PDF e os valores exportados no Excel.

### 7.5 Painel de demonstração administrativa

Permitir acionar os cenários simulados, consultar resultado/última execução e restaurar as fixtures com confirmação. Identificar esses comandos como ferramentas de demonstração. Não habilitar uma integração real nem fingir contato com o Sponte.

### 7.6 Direção visual e acessibilidade

- Interface em português do Brasil, clara e sóbria, voltada a tarefas da secretaria.
- Usar vermelho com moderação, neutros e boa hierarquia. Não inventar um logotipo oficial nem declarar identidade visual aprovada.
- Dar prioridade a nomes, busca, pendências e ações. Evitar excesso de gráficos decorativos.
- Em telas pequenas, oferecer lista/cartões resumidos e ficha legível; não obrigar o usuário a navegar uma tabela de 16 colunas para realizar todas as ações.
- Usar rótulos visíveis, foco de teclado, controles adequados ao toque, mensagens de sucesso/erro, estados vazios e prevenção de cliques duplicados.
- Não criar barras de progresso enganosas: distinguir itens concluídos, itens dispensados e conferências ainda pendentes.

## 8. Arquitetura técnica proposta para a demo

- Preferência: Next.js com TypeScript e componentes React, com estilos responsivos. Essa escolha é uma proposta de engenharia para compatibilidade com a referência existente e o destino Vercel.
- Usar versões estáveis compatíveis verificadas no momento da implementação, com lockfile. Não fazer atualização de dependências do Maple Help.
- Separar interface, regras de domínio e adaptadores de autenticação/persistência/origem escolar. Não colocar toda a lógica dentro de componentes ou espalhar o corte de data pelo projeto.
- Ter uma função central de classificação e uma de cálculo do estado/progresso/aprovação. Usar definições estáveis de itens, não índices de array como identidade.
- Manter identidade do aluno separada de seu processo de 2027 e dos eventos de checklist. Não é necessário construir uma plataforma de templates ou multiunidades.
- Estruturas mínimas sugeridas: usuário/perfil; aluno; processo anual com tipo e modelo; respostas de checklist com aplicabilidade; eventos de atividade; execuções de sincronização; registro mínimo de exclusões simuladas.
- Para a demo, persistir dados fictícios no navegador, por IndexedDB ou localStorage, através de um adaptador. A interface deve sobreviver a atualização da página. A sessão pode ser separada do estado de dados.
- Evitar problemas de hidratação em renderização no servidor. Tratar carregamento e armazenamento inválido sem apagar silenciosamente o estado.
- Documentar que essa persistência é local a cada navegador: não oferece colaboração real entre computadores. Trocar perfis permite demonstrar autoria, mas não comprova segurança nem concorrência de produção.
- Não montar um segundo backend real apenas para a demo. Supabase é o destino definido para persistência e autenticação reais, não uma dependência obrigatória para executar esta entrega.
- O modo demo deve ser explícito na configuração. Uma futura configuração real incompleta não pode silenciosamente cair em sessão falsa ou dados fictícios.
- Preparar `.env.example` sem segredos, comandos de execução/build e orientação para integração posterior. Não criar credenciais reais.
- Em eventual adaptador Supabase futuro: validar sessão e autorização no servidor e banco, habilitar RLS nas tabelas expostas, permitir o compartilhamento apenas entre membros autorizados da unidade e restringir exclusão a administradores. Não confiar em papel editável pelo usuário, não autorizar apenas escondendo controles e não expor chaves privilegiadas no cliente. Esses controles não podem ser declarados testados se só o mock foi executado.
- O cron real de sincronização fica para a integração. Documentar o horário de negócio em `America/Sao_Paulo` e validar a configuração do provedor e o fuso antes de ativá-lo. Nenhuma rotina externa deve rodar nesta entrega.

Referências oficiais para consultar quando implementar os adaptadores reais, respeitando a versão utilizada:

- [Supabase: clientes de autenticação SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs).
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [Vercel: Cron Jobs](https://vercel.com/docs/cron-jobs).

## 9. Dados fictícios e cenários obrigatórios

Gerar um conjunto pequeno, reproduzível, com aproximadamente 20 a 30 alunos/processos fictícios e nomes claramente exemplificativos. Não copiar nomes de alunos reais.

Cobrir pelo menos:

- Cadastro em 31/08/2026, em 01/09/2026 e depois do corte, com números de matrícula sem relação com a classificação.
- Duas pessoas com o mesmo nome e matrículas diferentes.
- Matrícula com zero à esquerda.
- Nova matrícula parcial, nova matrícula aguardando aprovação e nova matrícula aprovada.
- Rematrícula abaixo do JK, a partir do JK, com transferência aplicável e não aplicável.
- Curso desconhecido e data ausente/inválida exigindo conferência.
- Cadastro manual com nome incorreto que é corrigido na conciliação sem perder checklist.
- Aluno existente a ser inativado e outro inativo novo que deve ser ignorado.
- Aluno arquivado a reativar, preservando marcações e exigindo nova aprovação.
- Correção de data que cruza o corte e troca o checklist sem aproveitar marcações indevidas.
- Saídas com os três motivos e sem motivo.
- Entregas de material por usuários fictícios diferentes.

Não marcar aleatoriamente dados a cada renderização. Semente e relógio de teste devem permitir reprodução dos resultados esperados.

## 10. Critérios de aceite e testes

Automatize testes das regras críticas e verifique os principais fluxos no navegador. Não escreva apenas testes que repetem o formato da implementação.

| Cenário | Resultado esperado |
|---|---|
| Executar sem credenciais | Demo inicia e permite fluxo completo com dados fictícios |
| Login/cadastro com domínio diferente | Validação rejeita; nenhuma mensagem externa é enviada |
| Cadastro em 01/09/2026 | Nova matrícula, incluindo o próprio dia |
| Cadastro em 31/08/2026 | Rematrícula, sem alteração por fuso ou número de cadastro |
| Buscar aluno ou abrir ficha | Não invoca o provedor de sincronização |
| Dois homônimos | Permanecem separados por matrícula |
| Cadastrar matrícula já existente | Não cria duplicata silenciosamente |
| Marcar na tabela | Ficha, progresso, autoria e relatórios refletem a alteração |
| Recarregar página | Estado da demonstração é preservado |
| Trocar usuário e consultar marcação | Autoria original permanece correta |
| Todos os itens necessários marcados | Estado aguardando aprovação |
| Aprovação com pendência ou aplicabilidade desconhecida | Operação rejeitada com motivo |
| Aprovar e desmarcar item necessário | Aprovação revogada, evento preservado e processo pendente |
| Remarcar item | Exige aprovação novamente |
| Documento não aplicável | Não bloqueia, não conta como recebido e não pode ser dispensado indiscriminadamente |
| Curso altera aplicabilidade | Preserva itens independentes; nova obrigação pendente retira aprovação |
| Correção local e sincronização | Origem prevalece nos dados cadastrais, sem apagar checklist |
| Conciliação de cadastro manual | Atualiza o mesmo aluno e preserva trabalho existente |
| Inativo novo na origem | Não é importado |
| Ativo existente vira inativo | Arquivado e retirado de listas e métricas operacionais |
| Retorno incompleto ou aluno ausente | Não provoca arquivamento por inferência |
| Falha de sincronização | Mantém dados e data do último sucesso |
| Mesmo lote duas vezes | Não duplica registros nem mudanças de checklist |
| Usuário normal tenta excluir pela camada de operação | Ação recusada, mesmo fora do botão da interface |
| Administrador confirma exclusão fictícia | Remove o registro e a próxima simulação não o recria |
| Relatórios | Totais reconciliam com fixtures, listas e critérios de inclusão |
| Exportações | `.xlsx` e `.pdf` reais, legíveis e coerentes com os dados exibidos |
| Tela móvel | Busca, ficha, marcação, autoria e aprovação funcionam por toque |

Executar build, checagem de tipos, lint quando configurado e os testes relevantes. Verificar o navegador em largura de celular e desktop, sem erros bloqueantes. Registrar o que foi realmente testado e o que depende de serviços reais.

## 11. Entregáveis

1. Projeto novo executável, separado do Maple Help.
2. Demonstração funcional com os dois checklists e todos os fluxos acima.
3. Dados fictícios reproduzíveis, perfis de teste e reset da demonstração.
4. Exportações Excel e PDF funcionais.
5. `README.md` com instalação, execução, build, configuração de modo demo e limitações da persistência local.
6. `DECISOES-DEMO.md` distinguindo requisitos confirmados, decisões provisórias e pendências.
7. Roteiro curto de apresentação: entrar como secretaria; buscar aluno; marcar e consultar autoria; concluir e aprovar; desmarcar e reabrir; sincronizar uma correção; arquivar inativo; exportar; comparar exclusão como usuário normal e administrador.
8. Resultado dos testes e verificação visual, sem afirmar validação da API ou segurança de produção.
9. Lista objetiva do que falta para produção: documentação/credenciais Sponte; validação dos IDs, campos e datas; regras provisórias; definição das contas reais; persistência/auth Supabase com permissões testadas; agendamento; implantação e piloto com a secretaria. Importação da planilha continua aguardando autorização do usuário.

Na entrega, explique como iniciar e demonstrar o aplicativo, o que funciona de fato, o que é simulado e quais pontos permanecem pendentes. Não chame a demonstração de sistema pronto para produção.
