import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Aluno, ProcessoMatricula } from '../domain/types';
import { calcularMetricasOperacionais } from './metrics';
import { calcularEstadoEProgresso } from '../domain/rules';

export async function exportarRelatorioExcel(
  alunos: Aluno[],
  processos: ProcessoMatricula[],
  filtroDescricao: string = 'Todos os Registros'
): Promise<void> {
  const metricas = calcularMetricasOperacionais(alunos, processos);
  const dataGeracao = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date());

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Secretaria — Matrículas 2027';
  workbook.created = new Date();

  // 1. Aba: Resumo Operacional
  const sheetResumo = workbook.addWorksheet('Resumo Operacional');

  sheetResumo.columns = [
    { header: 'Indicador', key: 'indicador', width: 45 },
    { header: 'Valor', key: 'valor', width: 20 },
  ];

  sheetResumo.addRow({ indicador: 'MAPLE CHECK — MATRÍCULAS 2027', valor: '' });
  sheetResumo.addRow({ indicador: `Recorte: ${filtroDescricao}`, valor: `Gerado em: ${dataGeracao}` });
  sheetResumo.addRow({ indicador: '', valor: '' });

  sheetResumo.addRow({ indicador: '--- ATIVOS VALIDADOS EM ACOMPANHAMENTO ---', valor: '' });
  sheetResumo.addRow({ indicador: 'Total Acompanhado (Ativos Validados)', valor: metricas.totalAcompanhado });
  sheetResumo.addRow({ indicador: 'Novas Matrículas (Processo 16 etapas)', valor: metricas.novasMatriculas });
  sheetResumo.addRow({ indicador: 'Rematrículas (Processo 15 documentos)', valor: metricas.rematriculas });
  sheetResumo.addRow({ indicador: 'Aguardando Conferência de Classificação', valor: metricas.aguardandoConferencia });
  sheetResumo.addRow({ indicador: 'Processos Aprovados', valor: metricas.aprovados });
  sheetResumo.addRow({ indicador: 'Processos Aguardando Aprovação', valor: metricas.aguardandoAprovacao });
  sheetResumo.addRow({ indicador: 'Processos com Etapas Pendentes', valor: metricas.pendentes });
  sheetResumo.addRow({ indicador: 'Total Geral de Etapas Pendentes', valor: metricas.totalEtapasPendentes });
  sheetResumo.addRow({ indicador: 'Entregas de Material (Mochila e Chinook - Novas Matrículas)', valor: metricas.entregasMaterialMochilaChinook });

  sheetResumo.addRow({ indicador: '', valor: '' });
  sheetResumo.addRow({ indicador: '--- CADASTROS EM ESPERA ---', valor: '' });
  sheetResumo.addRow({ indicador: 'Cadastros Manuais Aguardando Validação no Sponte', valor: metricas.aguardandoValidacaoSponte });

  sheetResumo.addRow({ indicador: '', valor: '' });
  sheetResumo.addRow({ indicador: '--- HISTÓRICO DE SAÍDAS (ARQUIVADOS) ---', valor: '' });
  sheetResumo.addRow({ indicador: 'Total de Alunos Arquivados', valor: metricas.saidasHistorico.total });
  sheetResumo.addRow({ indicador: 'Saídas por Transferência', valor: metricas.saidasHistorico.transferencia });
  sheetResumo.addRow({ indicador: 'Saídas por Desistência', valor: metricas.saidasHistorico.desistencia });
  sheetResumo.addRow({ indicador: 'Saídas por Cancelamento', valor: metricas.saidasHistorico.cancelamento });
  sheetResumo.addRow({ indicador: 'Saídas sem Motivo Informado', valor: metricas.saidasHistorico.naoInformado });

  // Estilizar cabeçalho resumo
  sheetResumo.getRow(1).font = { bold: true, size: 14, color: { argb: 'FFC91430' } };
  sheetResumo.getRow(2).font = { italic: true, color: { argb: 'FF71717A' } };

  // 2. Aba: Alunos e Processos
  const sheetAlunos = workbook.addWorksheet('Alunos e Processos');
  sheetAlunos.columns = [
    { header: 'Matrícula', key: 'matricula', width: 14 },
    { header: 'Nome do Aluno', key: 'nome', width: 32 },
    { header: 'Curso', key: 'curso', width: 22 },
    { header: 'Turma', key: 'turma', width: 14 },
    { header: 'Situação', key: 'situacao', width: 18 },
    { header: 'Tipo', key: 'tipo', width: 20 },
    { header: 'Progresso', key: 'progresso', width: 14 },
    { header: 'Estado', key: 'estado', width: 22 },
    { header: 'Aprovado Por', key: 'aprovador', width: 24 },
    { header: 'Data Aprovação', key: 'dataAprov', width: 20 },
    { header: 'Etapas Pendentes', key: 'pendencias', width: 45 },
  ];

  sheetAlunos.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheetAlunos.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFC91430' },
  };

  for (const aluno of alunos) {
    const proc = processos.find(p => p.alunoId === aluno.id);
    let progressoTexto = '-';
    let estadoTexto = aluno.situacao === 'inativo' ? 'Arquivado' : 'Aguardando validação';
    let aprovador = '-';
    let dataAprov = '-';
    let pendenciasTexto = '-';
    let tipoTexto = '-';

    if (proc) {
      const calc = calcularEstadoEProgresso(proc, aluno);
      progressoTexto = `${calc.concluidosObrigatorios}/${calc.totalObrigatorios}`;
      estadoTexto = aluno.situacao === 'inativo' ? 'Arquivado' : !aluno.validadoSponte ? 'Aguardando Sponte' : calc.estado === 'APROVADO' ? 'Aprovado' : calc.estado === 'AGUARDANDO_APROVACAO' ? 'Aguardando Aprovação' : 'Pendente';
      tipoTexto = proc.tipo === 'NOVA_MATRICULA' ? 'Nova Matrícula' : proc.tipo === 'REMATRICULA' ? 'Rematrícula' : 'Classificação Pendente';
      if (proc.aprovadoPorNome) aprovador = proc.aprovadoPorNome;
      if (proc.aprovadoEm) dataAprov = new Date(proc.aprovadoEm).toLocaleDateString('pt-BR');
      if (calc.pendencias.length > 0) pendenciasTexto = calc.pendencias.join('; ');
    }

    sheetAlunos.addRow({
      matricula: aluno.matricula,
      nome: aluno.nome,
      curso: aluno.curso,
      turma: aluno.turma || '-',
      situacao: aluno.situacao === 'ativo' ? 'Ativo' : aluno.situacao === 'inativo' ? `Inativo (${aluno.motivoSaida || 'não inf.'})` : 'Aguardando Sponte',
      tipo: tipoTexto,
      progresso: progressoTexto,
      estado: estadoTexto,
      aprovador,
      dataAprov,
      pendencias: pendenciasTexto,
    });
  }

  // Gera o buffer e dispara o download no navegador
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  saveAs(blob, `Relatorio_Matriculas_2027_${Date.now()}.xlsx`);
}
