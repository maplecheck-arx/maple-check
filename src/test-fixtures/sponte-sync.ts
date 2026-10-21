import {
  Aluno,
  ProcessoMatricula,
  SincronizacaoResultado,
  SponteAlunoMock,
  User,
} from '../domain/types';
import {
  atualizarAplicabilidadesChecklist,
  atualizarDataCadastroAluno,
  calcularEstadoEProgresso,
  inicializarProcessoAluno,
} from '../domain/rules';

export type SponteCenarioId =
  | 'ativo_novo'
  | 'ignorar_inativo_novo'
  | 'conciliar_manual'
  | 'atualizar_cadastral'
  | 'inativar_existente'
  | 'reativar_existente'
  | 'repetir_lote'
  | 'falha_simulada'
  | 'bloquear_excluido'
  | 'retificar_data_corte';

export interface ExecutarSyncParams {
  cenario: SponteCenarioId;
  alunosAtuais: Aluno[];
  processosAtuais: ProcessoMatricula[];
  exclusoesMatricula: string[]; // Lista de matrículas excluídas definitivamente
  usuarioExecutou: User;
}

export function executarSincronizacaoSimulada(
  params: ExecutarSyncParams
): {
  alunos: Aluno[];
  processos: ProcessoMatricula[];
  resultado: SincronizacaoResultado;
} {
  const agoraIso = new Date().toISOString();
  const idExec = `sync_${Date.now()}`;

  // Cenário de falha simulada
  if (params.cenario === 'falha_simulada') {
    return {
      alunos: params.alunosAtuais,
      processos: params.processosAtuais,
      resultado: {
        id: idExec,
        dataExecucao: agoraIso,
        sucesso: false,
        mensagem: 'Falha simulada na conexão com o provedor Sponte (HTTP 504 Gateway Timeout). Nenhum dado local foi alterado.',
        novosAlunos: 0,
        atualizados: 0,
        arquivados: 0,
        reativados: 0,
        inativosIgnorados: 0,
        excluidosIgnorados: 0,
        erros: ['Simulação de indisponibilidade temporária de rede ou serviço externo.'],
      },
    };
  }

  // Prepara o lote de acordo com o cenário escolhido
  let loteSponte: SponteAlunoMock[] = [];

  switch (params.cenario) {
    case 'ativo_novo':
      loteSponte = [
        {
          matricula: '0777',
          nome: 'Manuela Vilela Peixoto',
          curso: 'Year 1',
          turma: 'Turma B',
          situacao: 'ativo',
          dataCadastro: '2026-09-20',
        },
      ];
      break;

    case 'ignorar_inativo_novo':
      loteSponte = [
        {
          matricula: '0888',
          nome: 'Carlos Inativo Não Existente',
          curso: 'Toddler',
          situacao: 'inativo',
          motivoSaida: 'cancelamento',
          dataCadastro: '2026-01-10',
        },
      ];
      break;

    case 'conciliar_manual':
      loteSponte = [
        {
          matricula: '0992', // Mesma matrícula cadastrada manualmente com nome incorreto
          nome: 'Lorena Martins da Costa', // Nome oficial correto do Sponte
          curso: 'Year 1',
          turma: 'Turma A',
          situacao: 'ativo',
          dataCadastro: '2026-10-01',
        },
      ];
      break;

    case 'atualizar_cadastral':
      loteSponte = [
        {
          matricula: '0088',
          nome: 'Lucas Gabriel Alves',
          curso: 'Year 1', // Mudou de Senior Kindergarten para Year 1 (ambos >= JK)
          turma: 'Turma A',
          situacao: 'ativo',
          dataCadastro: '2026-07-15',
        },
      ];
      break;

    case 'inativar_existente':
      loteSponte = [
        {
          matricula: '0606', // Thiago Carvalho
          nome: 'Thiago Carvalho',
          curso: 'Year 3',
          situacao: 'inativo',
          motivoSaida: 'transferencia',
          dataCadastro: '2026-09-18',
        },
      ];
      break;

    case 'reativar_existente':
      loteSponte = [
        {
          matricula: '0077', // Mariana Cordeiro, previamente inativa
          nome: 'Mariana Cordeiro',
          curso: 'Year 1',
          turma: 'Manhã',
          situacao: 'ativo',
          dataCadastro: '2026-08-14',
        },
      ];
      break;

    case 'bloquear_excluido':
      // Se houver alguma exclusão registrada, tenta trazê-la; senão simula com matrícula padrão de teste
      const matExcluida = params.exclusoesMatricula[0] || '0999_EXCLUIDO_TESTE';
      loteSponte = [
        {
          matricula: matExcluida,
          nome: 'Aluno Previamente Excluído no App',
          curso: 'Year 2',
          situacao: 'ativo',
          dataCadastro: '2026-09-10',
        },
      ];
      break;

    case 'retificar_data_corte':
      loteSponte = [
        {
          matricula: '0607', // Luiza Pires (era 30/08/2026 Rematrícula -> vira 02/09/2026 Nova Matrícula)
          nome: 'Luiza Pires',
          curso: 'Senior Kindergarten',
          turma: 'Manhã',
          situacao: 'ativo',
          dataCadastro: '2026-09-02',
        },
      ];
      break;

    case 'repetir_lote':
    default:
      // Repete dados idênticos aos ativos atuais para testar idempotência
      loteSponte = params.alunosAtuais.slice(0, 5).map(a => ({
        matricula: a.matricula,
        nome: a.nome,
        curso: a.curso,
        turma: a.turma,
        situacao: a.situacao === 'inativo' ? 'inativo' : 'ativo',
        motivoSaida: a.motivoSaida,
        dataCadastro: a.dataCadastroSponte || '2026-09-01',
      }));
      break;
  }

  // Execução do lote
  let novosAlunos = 0;
  let atualizados = 0;
  let arquivados = 0;
  let reativados = 0;
  let inativosIgnorados = 0;
  let excluidosIgnorados = 0;
  const erros: string[] = [];

  let alunosNovos = [...params.alunosAtuais];
  let processosNovos = [...params.processosAtuais];

  for (const itemSponte of loteSponte) {
    const matNormalizada = itemSponte.matricula.trim();

    // 1. Verifica se matrícula está na lista de exclusão definitiva local
    if (params.exclusoesMatricula.includes(matNormalizada)) {
      excluidosIgnorados++;
      continue;
    }

    // 2. Busca aluno existente por matrícula (conciliação por matrícula textual)
    const alunoIndex = alunosNovos.findIndex(a => a.matricula === matNormalizada);

    if (alunoIndex === -1) {
      // Aluno NÃO existe na base local
      if (itemSponte.situacao === 'inativo') {
        // Regra: registro inativo não existente NÃO deve ser importado
        inativosIgnorados++;
        continue;
      }

      // Importar novo aluno ativo
      const novoAluno: Aluno = {
        id: `aluno_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        externalId: `sp_${matNormalizada}`,
        matricula: matNormalizada,
        nome: itemSponte.nome,
        curso: itemSponte.curso,
        turma: itemSponte.turma,
        situacao: 'ativo',
        dataCadastroSponte: itemSponte.dataCadastro,
        dataInclusaoApp: agoraIso,
        anoLetivo: 2027,
        validadoSponte: true,
      };

      const novoProcesso = inicializarProcessoAluno(novoAluno);

      alunosNovos.push(novoAluno);
      processosNovos.push(novoProcesso);
      novosAlunos++;
    } else {
      // Aluno JÁ existe na base local
      const alunoExistente = alunosNovos[alunoIndex];
      const procIndex = processosNovos.findIndex(p => p.alunoId === alunoExistente.id);
      let proc = procIndex !== -1 ? processosNovos[procIndex] : inicializarProcessoAluno(alunoExistente);

      // A) Transição para inativo
      if (itemSponte.situacao === 'inativo' && alunoExistente.situacao !== 'inativo') {
        const alunoAtualizado: Aluno = {
          ...alunoExistente,
          situacao: 'inativo',
          motivoSaida: itemSponte.motivoSaida || 'nao_informado',
          validadoSponte: true,
        };
        alunosNovos[alunoIndex] = alunoAtualizado;

        proc = {
          ...proc,
          eventos: [
            ...proc.eventos,
            {
              id: `ev_arq_${Date.now()}`,
              dataHora: agoraIso,
              tipo: 'SINCRONIZACAO',
              descricao: `Aluno arquivado por inatividade no Sponte (Motivo: ${alunoAtualizado.motivoSaida}). Checklist preservado.`,
              autorNome: 'Sincronização Sponte',
              autorId: 'sync_sponte',
            },
          ],
        };
        processosNovos[procIndex] = proc;
        arquivados++;
        continue;
      }

      // B) Reativação de aluno arquivado
      if (itemSponte.situacao === 'ativo' && alunoExistente.situacao === 'inativo') {
        const alunoAtualizado: Aluno = {
          ...alunoExistente,
          situacao: 'ativo',
          motivoSaida: undefined,
          validadoSponte: true,
        };
        alunosNovos[alunoIndex] = alunoAtualizado;

        // Regra de Reativação: restaura aluno, preserva suas marcações, mas exige nova aprovação final
        // Mantém a aprovação histórica visível como histórica.
        proc = {
          ...proc,
          aprovadoEm: undefined,
          aprovadoPorId: undefined,
          aprovadoPorNome: undefined,
          eventos: [
            ...proc.eventos,
            {
              id: `ev_reat_${Date.now()}`,
              dataHora: agoraIso,
              tipo: 'SINCRONIZACAO',
              descricao: 'Aluno reativado via Sponte. Checklist preservado; nova aprovação explícita exigida.',
              autorNome: 'Sincronização Sponte',
              autorId: 'sync_sponte',
            },
          ],
        };
        const calc = calcularEstadoEProgresso(proc, alunoAtualizado);
        proc.estado = calc.estado;

        processosNovos[procIndex] = proc;
        reativados++;
        continue;
      }

      // C) Conciliação ou Atualização cadastral de aluno ativo
      let alterou = false;
      let alunoAtualizado: Aluno = { ...alunoExistente, validadoSponte: true };

      // Se era cadastro manual aguardando validação, agora está validado
      if (alunoExistente.situacao === 'aguardando_validacao') {
        alunoAtualizado.situacao = 'ativo';
        alterou = true;
      }

      // Dados cadastrais da origem prevalecem
      if (itemSponte.nome && itemSponte.nome !== alunoExistente.nome) {
        alunoAtualizado.nome = itemSponte.nome;
        alterou = true;
      }
      if (itemSponte.curso && itemSponte.curso !== alunoExistente.curso) {
        alunoAtualizado.curso = itemSponte.curso;
        alterou = true;
      }
      if (itemSponte.turma && itemSponte.turma !== alunoExistente.turma) {
        alunoAtualizado.turma = itemSponte.turma;
        alterou = true;
      }

      // Verifica se a data de cadastro mudou
      if (itemSponte.dataCadastro && itemSponte.dataCadastro !== alunoExistente.dataCadastroSponte) {
        const resData = atualizarDataCadastroAluno(
          alunoAtualizado,
          proc,
          itemSponte.dataCadastro,
          params.usuarioExecutou
        );
        alunoAtualizado = resData.aluno;
        proc = resData.processo;
        alterou = true;
      } else {
        // Se mudou curso, atualiza aplicabilidades (ex: laudos JK)
        proc = atualizarAplicabilidadesChecklist(proc, alunoAtualizado);
      }

      if (alterou) {
        alunosNovos[alunoIndex] = alunoAtualizado;
        proc = {
          ...proc,
          eventos: [
            ...proc.eventos,
            {
              id: `ev_upd_${Date.now()}`,
              dataHora: agoraIso,
              tipo: 'SINCRONIZACAO',
              descricao: 'Dados cadastrais atualizados pela origem Sponte. Checklist operacional preservado.',
              autorNome: 'Sincronização Sponte',
              autorId: 'sync_sponte',
            },
          ],
        };
        processosNovos[procIndex] = proc;
        atualizados++;
      }
    }
  }

  const mensagem = `Sincronização concluída com sucesso: ${novosAlunos} novos, ${atualizados} atualizados, ${arquivados} arquivados, ${reativados} reativados, ${inativosIgnorados} inativos novos ignorados, ${excluidosIgnorados} excluídos ignorados.`;

  return {
    alunos: alunosNovos,
    processos: processosNovos,
    resultado: {
      id: idExec,
      dataExecucao: agoraIso,
      sucesso: true,
      mensagem,
      novosAlunos,
      atualizados,
      arquivados,
      reativados,
      inativosIgnorados,
      excluidosIgnorados,
      erros,
    },
  };
}
