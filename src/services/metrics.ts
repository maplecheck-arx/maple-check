import { Aluno, MetricasOperacionais, ProcessoMatricula } from '../domain/types';
import { calcularEstadoEProgresso } from '../domain/rules';

export function calcularMetricasOperacionais(
  alunos: Aluno[],
  processos: ProcessoMatricula[]
): MetricasOperacionais {
  let totalAcompanhado = 0;
  let novasMatriculas = 0;
  let rematriculas = 0;
  let aprovados = 0;
  let aguardandoAprovacao = 0;
  let pendentes = 0;
  let aguardandoConferencia = 0;
  let entregasMaterialMochilaChinook = 0;
  let aguardandoValidacaoSponte = 0;
  let totalEtapasPendentes = 0;

  const saidasHistorico = {
    total: 0,
    transferencia: 0,
    desistencia: 0,
    cancelamento: 0,
    naoInformado: 0,
  };

  for (const aluno of alunos) {
    // 1. Cadastros manuais aguardando validação
    if (aluno.situacao === 'aguardando_validacao') {
      aguardandoValidacaoSponte++;
      continue; // Não entra nos totais de ativos validados
    }

    // 2. Histórico de Inativos / Arquivados
    if (aluno.situacao === 'inativo') {
      saidasHistorico.total++;
      if (aluno.motivoSaida === 'transferencia') saidasHistorico.transferencia++;
      else if (aluno.motivoSaida === 'desistencia') saidasHistorico.desistencia++;
      else if (aluno.motivoSaida === 'cancelamento') saidasHistorico.cancelamento++;
      else saidasHistorico.naoInformado++;
      continue; // Não entra nos totais de ativos validados
    }

    // 3. Alunos Ativos Validados
    totalAcompanhado++;
    const proc = processos.find(p => p.alunoId === aluno.id);

    if (!proc) continue;

    if (proc.tipo === 'NOVA_MATRICULA') {
      novasMatriculas++;
      // Contagem de material: item único "Entregar mochila e chinook"
      const itemMaterial = proc.itens.find(i => i.id === 'nm_material');
      if (itemMaterial && itemMaterial.concluido) {
        entregasMaterialMochilaChinook++;
      }
    } else if (proc.tipo === 'REMATRICULA') {
      rematriculas++;
    } else {
      aguardandoConferencia++;
    }

    const calc = calcularEstadoEProgresso(proc, aluno);

    if (calc.estado === 'APROVADO') {
      aprovados++;
    } else if (calc.estado === 'AGUARDANDO_APROVACAO') {
      aguardandoAprovacao++;
    } else {
      pendentes++;
    }

    // Conta etapas pendentes individuais deste aluno
    totalEtapasPendentes += (calc.totalObrigatorios - calc.concluidosObrigatorios) + calc.totalAConfirmar;
  }

  return {
    totalAcompanhado,
    novasMatriculas,
    rematriculas,
    aprovados,
    aguardandoAprovacao,
    pendentes,
    aguardandoConferencia,
    entregasMaterialMochilaChinook,
    aguardandoValidacaoSponte,
    saidasHistorico,
    totalEtapasPendentes,
  };
}

export interface RelacaoPendenciaAluno {
  alunoId: string;
  matricula: string;
  nome: string;
  curso: string;
  tipo: string;
  etapasPendentes: string[];
}

export function listarPendenciasPorAluno(
  alunos: Aluno[],
  processos: ProcessoMatricula[]
): RelacaoPendenciaAluno[] {
  const lista: RelacaoPendenciaAluno[] = [];

  for (const aluno of alunos) {
    if (aluno.situacao !== 'ativo' || !aluno.validadoSponte) continue;

    const proc = processos.find(p => p.alunoId === aluno.id);
    if (!proc) continue;

    const calc = calcularEstadoEProgresso(proc, aluno);
    if (calc.pendencias.length > 0) {
      lista.push({
        alunoId: aluno.id,
        matricula: aluno.matricula,
        nome: aluno.nome,
        curso: aluno.curso,
        tipo: proc.tipo === 'NOVA_MATRICULA' ? 'Nova Matrícula' : proc.tipo === 'REMATRICULA' ? 'Rematrícula' : 'Pendente de Classificação',
        etapasPendentes: calc.pendencias,
      });
    }
  }

  return lista;
}
