import {
  Aluno,
  Aplicabilidade,
  ChecklistItem,
  EstadoProcesso,
  ProcessoMatricula,
  TipoProcesso,
  User,
} from './types';
import { criarItensChecklist } from './checklist-definitions';

// Regra exclusiva de 2027: Data de corte 01/09/2026
export const DATA_CORTE_2027 = '2026-09-01';

/**
 * Normaliza e extrai data civil no fuso America/Sao_Paulo (ou formato YYYY-MM-DD).
 * Garante que datas sem horário não caiam no dia anterior por conversão UTC.
 */
export function extrairDataCivilSaoPaulo(dataStr?: string): string | null {
  if (!dataStr || typeof dataStr !== 'string') return null;
  const limpa = dataStr.trim();
  if (!limpa) return null;

  // Se já estiver em formato YYYY-MM-DD
  const matchIsoDateOnly = limpa.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchIsoDateOnly) {
    const [, ano, mes, dia] = matchIsoDateOnly;
    return `${ano}-${mes}-${dia}`;
  }

  // Se estiver em formato DD/MM/YYYY
  const matchBr = limpa.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (matchBr) {
    const [, dia, mes, ano] = matchBr;
    return `${ano}-${mes}-${dia}`;
  }

  // Caso contenha timestamp ISO com horário (ex: 2026-09-01T03:00:00Z)
  try {
    const d = new Date(limpa);
    if (isNaN(d.getTime())) return null;

    // Formatar no fuso America/Sao_Paulo
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(d); // Retorna YYYY-MM-DD
  } catch {
    return null;
  }
}

/**
 * Classifica o tipo de processo para o ano letivo de 2027:
 * - A partir de 01/09/2026, inclusive: NOVA_MATRICULA
 * - Antes de 01/09/2026: REMATRICULA
 * - Ausente ou inválida: CLASSIFICACAO_PENDENTE (não assume rematrícula por padrão)
 */
export function classificarTipoMatricula(dataCadastroSponte?: string): TipoProcesso {
  const dataCivil = extrairDataCivilSaoPaulo(dataCadastroSponte);
  if (!dataCivil) {
    return 'CLASSIFICACAO_PENDENTE';
  }

  if (dataCivil >= DATA_CORTE_2027) {
    return 'NOVA_MATRICULA';
  } else {
    return 'REMATRICULA';
  }
}

/**
 * Mapeamento explícito de cursos para aplicabilidade de Laudos (Oftalmo e Audiometria).
 * Toddler e Nursery: abaixo do JK (dispensados / nao_se_aplica).
 * Junior Kindergarten, Senior Kindergarten, Year 1 em diante: a partir do JK (obrigatorio).
 * Cursos não reconhecidos: a_confirmar.
 */
export function verificarAplicabilidadeCurso(curso?: string): Aplicabilidade {
  if (!curso) return 'a_confirmar';
  const c = curso.trim().toLowerCase();

  const cursosAbaixoJK = [
    'toddler',
    'nursery',
    'infantil 1',
    'infantil 2',
    'maternal',
    'berçário',
  ];

  const cursosAPartirDoJK = [
    'junior kindergarten',
    'senior kindergarten',
    'jk',
    'sk',
    'year 1',
    'year 2',
    'year 3',
    'year 4',
    'year 5',
    'year 6',
    'year 7',
    'year 8',
    'year 9',
    '1º ano',
    '2º ano',
    '3º ano',
    '4º ano',
    '5º ano',
    '6º ano',
    '7º ano',
    '8º ano',
    '9º ano',
    'ensino fundamental',
  ];

  if (cursosAbaixoJK.some(cur => c === cur || c.startsWith(cur))) {
    return 'nao_se_aplica';
  }

  if (cursosAPartirDoJK.some(cur => c === cur || c.startsWith(cur))) {
    return 'obrigatorio';
  }

  return 'a_confirmar';
}

/**
 * Calcula a aplicabilidade de um item específico para um aluno
 */
export function calcularAplicabilidadeItem(itemId: string, aluno: Aluno): Aplicabilidade {
  // Itens condicionais de Rematrícula
  if (itemId === 'rem_laudo_oftalmo' || itemId === 'rem_laudo_audio') {
    return verificarAplicabilidadeCurso(aluno.curso);
  }

  if (itemId === 'rem_declaracao_transf') {
    if (aluno.jaEstudouOutraInstituicao === 'sim') return 'obrigatorio';
    if (aluno.jaEstudouOutraInstituicao === 'nao') return 'nao_se_aplica';
    return 'a_confirmar';
  }

  // Todos os demais itens são incondicionais e obrigatórios
  return 'obrigatorio';
}

/**
 * Atualiza as aplicabilidades dos itens do checklist de acordo com o aluno
 */
export function atualizarAplicabilidadesChecklist(processo: ProcessoMatricula, aluno: Aluno): ProcessoMatricula {
  let alterouAlgum = false;
  const novosItens = processo.itens.map(item => {
    const novaAplicabilidade = calcularAplicabilidadeItem(item.id, aluno);
    if (novaAplicabilidade !== item.aplicabilidade) {
      alterouAlgum = true;
      return {
        ...item,
        aplicabilidade: novaAplicabilidade,
      };
    }
    return item;
  });

  if (!alterouAlgum) return processo;

  const processoAtualizado: ProcessoMatricula = {
    ...processo,
    itens: novosItens,
  };

  // Se um item antes dispensado passar a obrigatório, começar como pendente e retirar aprovação vigente
  return recalcularEstadoProcesso(processoAtualizado, aluno);
}

export interface CalculoEstado {
  estado: EstadoProcesso;
  podeAprovar: boolean;
  motivoBloqueio?: string;
  totalItens: number;
  totalObrigatorios: number;
  concluidosObrigatorios: number;
  totalNaoAplica: number;
  totalAConfirmar: number;
  pendencias: string[];
}

/**
 * Calcula o estado atual do processo e métricas de conclusão
 */
export function calcularEstadoEProgresso(processo: ProcessoMatricula, aluno: Aluno): CalculoEstado {
  const totalItens = processo.itens.length;
  let totalObrigatorios = 0;
  let concluidosObrigatorios = 0;
  let totalNaoAplica = 0;
  let totalAConfirmar = 0;
  const pendencias: string[] = [];

  for (const item of processo.itens) {
    if (item.aplicabilidade === 'nao_se_aplica') {
      totalNaoAplica++;
    } else if (item.aplicabilidade === 'a_confirmar') {
      totalAConfirmar++;
      pendencias.push(`${item.rotulo} (Aplicabilidade a confirmar)`);
    } else {
      // Obrigatório
      totalObrigatorios++;
      if (item.concluido) {
        concluidosObrigatorios++;
      } else {
        pendencias.push(item.rotulo);
      }
    }
  }

  let podeAprovar = true;
  let motivoBloqueio: string | undefined;

  if (aluno.situacao === 'inativo') {
    podeAprovar = false;
    motivoBloqueio = 'Aluno inativo/arquivado não pode ter processo aprovado.';
  } else if (!aluno.validadoSponte) {
    podeAprovar = false;
    motivoBloqueio = 'Cadastro manual aguardando validação no Sponte. Aprovação bloqueada.';
  } else if (processo.tipo === 'CLASSIFICACAO_PENDENTE') {
    podeAprovar = false;
    motivoBloqueio = 'Classificação por data pendente ou inválida.';
  } else if (totalAConfirmar > 0) {
    podeAprovar = false;
    motivoBloqueio = `Existem ${totalAConfirmar} item(ns) com aplicabilidade a confirmar.`;
  } else if (concluidosObrigatorios < totalObrigatorios) {
    podeAprovar = false;
    motivoBloqueio = `Restam ${totalObrigatorios - concluidosObrigatorios} etapa(s) obrigatória(s) pendente(s).`;
  }

  let estado: EstadoProcesso = 'PENDENTE';

  if (processo.aprovadoEm) {
    // Se estava aprovado, mas agora não atende aos requisitos
    if (!podeAprovar && aluno.situacao === 'ativo') {
      estado = 'PENDENTE';
    } else {
      estado = 'APROVADO';
    }
  } else if (podeAprovar) {
    estado = 'AGUARDANDO_APROVACAO';
  } else {
    estado = 'PENDENTE';
  }

  return {
    estado,
    podeAprovar,
    motivoBloqueio,
    totalItens,
    totalObrigatorios,
    concluidosObrigatorios,
    totalNaoAplica,
    totalAConfirmar,
    pendencias,
  };
}

/**
 * Recalcula o estado do processo assegurando que revogações automáticas ocorram
 * caso requisitos tenham sido alterados ou desmarcados.
 */
export function recalcularEstadoProcesso(processo: ProcessoMatricula, aluno: Aluno): ProcessoMatricula {
  const calc = calcularEstadoEProgresso(processo, aluno);

  // Se estava aprovado, mas não pode aprovar, revoga aprovação
  if (processo.estado === 'APROVADO' && calc.estado !== 'APROVADO') {
    const eventoRevogacao = {
      acao: 'revogado' as const,
      atorNome: 'Sistema (Mudança de Requisitos)',
      atorId: 'sistema',
      dataHora: new Date().toISOString(),
      motivo: calc.motivoBloqueio || 'Etapa obrigatória pendente ou aplicabilidade alterada.',
    };

    return {
      ...processo,
      estado: calc.estado,
      aprovadoEm: undefined,
      aprovadoPorId: undefined,
      aprovadoPorNome: undefined,
      historicoAprovacoes: [...processo.historicoAprovacoes, eventoRevogacao],
      eventos: [
        ...processo.eventos,
        {
          id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          dataHora: new Date().toISOString(),
          tipo: 'REVOGACAO',
          descricao: `Aprovação revogada automaticamente: ${eventoRevogacao.motivo}`,
          autorNome: 'Sistema',
          autorId: 'sistema',
        },
      ],
    };
  }

  return {
    ...processo,
    estado: calc.estado,
  };
}

/**
 * Marca ou desmarca um item do checklist
 */
export function marcarItemChecklist(
  processo: ProcessoMatricula,
  aluno: Aluno,
  itemId: string,
  novoValor: boolean,
  usuario: User
): { processo: ProcessoMatricula; erro?: string } {
  if (aluno.situacao === 'inativo') {
    return { processo, erro: 'Não é permitido alterar checklist de aluno inativo.' };
  }

  const itemIndex = processo.itens.findIndex(it => it.id === itemId);
  if (itemIndex === -1) {
    return { processo, erro: 'Item de checklist não encontrado.' };
  }

  const itemAtual = processo.itens[itemIndex];
  if (itemAtual.concluido === novoValor) {
    return { processo }; // Nenhuma mudança necessária
  }

  const agoraIso = new Date().toISOString();
  const novoHistoricoItem = [
    ...itemAtual.historico,
    {
      valor: novoValor,
      alteradoPorNome: usuario.name,
      alteradoPorId: usuario.id,
      alteradoEm: agoraIso,
    },
  ];

  const itemAtualizado: ChecklistItem = {
    ...itemAtual,
    concluido: novoValor,
    marcadoPorNome: novoValor ? usuario.name : itemAtual.marcadoPorNome,
    marcadoPorId: novoValor ? usuario.id : itemAtual.marcadoPorId,
    marcadoEm: novoValor ? agoraIso : itemAtual.marcadoEm,
    historico: novoHistoricoItem,
  };

  const novosItens = [...processo.itens];
  novosItens[itemIndex] = itemAtualizado;

  const eventoMarcacao = {
    id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    dataHora: agoraIso,
    tipo: 'MARCACAO' as const,
    descricao: `${novoValor ? 'Concluiu' : 'Desmarcou'}: "${itemAtual.rotulo}"`,
    autorNome: usuario.name,
    autorId: usuario.id,
  };

  let processoAtualizado: ProcessoMatricula = {
    ...processo,
    itens: novosItens,
    eventos: [...processo.eventos, eventoMarcacao],
  };

  // Se o processo estava aprovado e desmarcou um item obrigatório, revoga aprovação
  if (processo.estado === 'APROVADO' && !novoValor && itemAtual.aplicabilidade === 'obrigatorio') {
    const revogacao = {
      acao: 'revogado' as const,
      atorNome: usuario.name,
      atorId: usuario.id,
      dataHora: agoraIso,
      motivo: `Etapa "${itemAtual.rotulo}" desmarcada após aprovação.`,
    };

    processoAtualizado = {
      ...processoAtualizado,
      estado: 'PENDENTE',
      aprovadoEm: undefined,
      aprovadoPorId: undefined,
      aprovadoPorNome: undefined,
      historicoAprovacoes: [...processoAtualizado.historicoAprovacoes, revogacao],
      eventos: [
        ...processoAtualizado.eventos,
        {
          id: `ev_rev_${Date.now()}`,
          dataHora: agoraIso,
          tipo: 'REVOGACAO',
          descricao: `Aprovação revogada: etapa "${itemAtual.rotulo}" foi desmarcada por ${usuario.name}.`,
          autorNome: usuario.name,
          autorId: usuario.id,
        },
      ],
    };
  } else {
    // Recalcula o estado para ver se passa para Aguardando Aprovação
    const calc = calcularEstadoEProgresso(processoAtualizado, aluno);
    processoAtualizado = {
      ...processoAtualizado,
      estado: calc.estado,
    };
  }

  return { processo: processoAtualizado };
}

/**
 * Aprovação explícita do processo por um usuário autenticado
 */
export function aprovarProcesso(
  processo: ProcessoMatricula,
  aluno: Aluno,
  usuario: User
): { processo: ProcessoMatricula; erro?: string } {
  if (aluno.situacao === 'inativo') {
    return { processo, erro: 'Alunos inativos não podem ser aprovados.' };
  }

  if (!aluno.validadoSponte) {
    return { processo, erro: 'Aluno aguardando validação no Sponte não pode receber aprovação final.' };
  }

  if (processo.tipo === 'CLASSIFICACAO_PENDENTE') {
    return { processo, erro: 'Classificação do processo está pendente por falta de data válida.' };
  }

  const calc = calcularEstadoEProgresso(processo, aluno);
  if (!calc.podeAprovar) {
    return { processo, erro: calc.motivoBloqueio || 'O processo possui pendências e não pode ser aprovado.' };
  }

  const agoraIso = new Date().toISOString();
  const eventoAprovacao = {
    acao: 'aprovado' as const,
    atorNome: usuario.name,
    atorId: usuario.id,
    dataHora: agoraIso,
  };

  const processoAprovado: ProcessoMatricula = {
    ...processo,
    estado: 'APROVADO',
    aprovadoEm: agoraIso,
    aprovadoPorId: usuario.id,
    aprovadoPorNome: usuario.name,
    historicoAprovacoes: [...processo.historicoAprovacoes, eventoAprovacao],
    eventos: [
      ...processo.eventos,
      {
        id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        dataHora: agoraIso,
        tipo: 'APROVACAO',
        descricao: `Processo final aprovado por ${usuario.name}.`,
        autorNome: usuario.name,
        autorId: usuario.id,
      },
    ],
  };

  return { processo: processoAprovado };
}

/**
 * Inicializa um processo novo para um aluno
 */
export function inicializarProcessoAluno(aluno: Aluno): ProcessoMatricula {
  const tipo = classificarTipoMatricula(aluno.dataCadastroSponte);
  const itensIniciais = criarItensChecklist(tipo);

  // Aplica regras de aplicabilidade específicas do aluno
  const itensComAplicabilidade = itensIniciais.map(item => ({
    ...item,
    aplicabilidade: calcularAplicabilidadeItem(item.id, aluno),
  }));

  const processo: ProcessoMatricula = {
    id: `proc_${aluno.id}_2027`,
    alunoId: aluno.id,
    anoLetivo: 2027,
    tipo,
    estado: 'PENDENTE',
    itens: itensComAplicabilidade,
    historicoAprovacoes: [],
    eventos: [
      {
        id: `ev_init_${aluno.id}`,
        dataHora: new Date().toISOString(),
        tipo: 'CADASTRAL',
        descricao: `Processo criado para o ano letivo de 2027 (${tipo === 'NOVA_MATRICULA' ? 'Nova Matrícula' : tipo === 'REMATRICULA' ? 'Rematrícula' : 'Classificação Pendente'}).`,
        autorNome: 'Sistema',
        autorId: 'sistema',
      },
    ],
  };

  const calc = calcularEstadoEProgresso(processo, aluno);
  processo.estado = calc.estado;

  return processo;
}

/**
 * Trata mudança na data de cadastro que altera o tipo do processo (Corte de 01/09/2026).
 * Regra: se o tipo mudar, abre o checklist do novo tipo, NÃO copia marcações por posição,
 * preserva versão anterior para histórico e revoga aprovação.
 */
export function atualizarDataCadastroAluno(
  aluno: Aluno,
  processo: ProcessoMatricula,
  novaData: string,
  usuario: User
): { aluno: Aluno; processo: ProcessoMatricula } {
  const novoTipo = classificarTipoMatricula(novaData);
  const dataAnterior = aluno.dataCadastroSponte;
  const alunoAtualizado: Aluno = {
    ...aluno,
    dataCadastroSponte: novaData,
  };

  if (novoTipo === processo.tipo) {
    // Tipo não mudou, apenas atualiza data
    return { aluno: alunoAtualizado, processo };
  }

  // Tipo mudou! Cria novo checklist do novo tipo
  const novosItens = criarItensChecklist(novoTipo).map(item => ({
    ...item,
    aplicabilidade: calcularAplicabilidadeItem(item.id, alunoAtualizado),
  }));

  const agoraIso = new Date().toISOString();
  const processoAtualizado: ProcessoMatricula = {
    ...processo,
    tipo: novoTipo,
    estado: 'PENDENTE',
    itens: novosItens,
    aprovadoEm: undefined,
    aprovadoPorId: undefined,
    aprovadoPorNome: undefined,
    historicoAprovacoes: processo.aprovadoEm ? [
      ...processo.historicoAprovacoes,
      {
        acao: 'revogado' as const,
        atorNome: usuario.name,
        atorId: usuario.id,
        dataHora: agoraIso,
        motivo: `Tipo de processo alterado de ${processo.tipo} para ${novoTipo} devido à retificação da data de cadastro (${dataAnterior} -> ${novaData}). Checklist reiniciado.`,
      },
    ] : processo.historicoAprovacoes,
    eventos: [
      ...processo.eventos,
      {
        id: `ev_tipo_${Date.now()}`,
        dataHora: agoraIso,
        tipo: 'CADASTRAL',
        descricao: `Classificação alterada para ${novoTipo} por ${usuario.name}. Checklist redefinido para o novo modelo sem migração de marcações.`,
        autorNome: usuario.name,
        autorId: usuario.id,
      },
    ],
  };

  const calc = calcularEstadoEProgresso(processoAtualizado, alunoAtualizado);
  processoAtualizado.estado = calc.estado;

  return { aluno: alunoAtualizado, processo: processoAtualizado };
}
