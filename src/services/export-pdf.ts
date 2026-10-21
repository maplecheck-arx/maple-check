import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Aluno, ProcessoMatricula } from '../domain/types';
import { calcularMetricasOperacionais } from './metrics';
import { calcularEstadoEProgresso } from '../domain/rules';

export function exportarRelatorioPDF(
  alunos: Aluno[],
  processos: ProcessoMatricula[],
  filtroDescricao: string = 'Todos os Registros'
): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const metricas = calcularMetricasOperacionais(alunos, processos);
  const dataGeracao = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date());

  // Cabeçalho institucional
  doc.setFillColor(227, 24, 55); // Brand Red #E31837
  doc.rect(0, 0, 297, 18, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Maple Check — Matrículas 2027', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Gerado em: ${dataGeracao}`, 283, 12, { align: 'right' });

  doc.setTextColor(80, 85, 80);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Consulta: ${filtroDescricao}`, 14, 25);

  // Bloco de Métricas Resumo em formato de tabela
  autoTable(doc, {
    startY: 28,
    head: [['Indicador Operacional (Ativos Validados)', 'Total', 'Indicador de Saídas / Espera', 'Total']],
    body: [
      ['Total Acompanhado', `${metricas.totalAcompanhado}`, 'Arquivados por Transferência', `${metricas.saidasHistorico.transferencia}`],
      ['Novas Matrículas (16 etapas)', `${metricas.novasMatriculas}`, 'Arquivados por Desistência', `${metricas.saidasHistorico.desistencia}`],
      ['Rematrículas (15 documentos)', `${metricas.rematriculas}`, 'Arquivados por Cancelamento', `${metricas.saidasHistorico.cancelamento}`],
      ['Processos Aprovados', `${metricas.aprovados}`, 'Arquivados sem Motivo Informado', `${metricas.saidasHistorico.naoInformado}`],
      ['Processos Aguardando Aprovação', `${metricas.aguardandoAprovacao}`, 'Total de Alunos Arquivados', `${metricas.saidasHistorico.total}`],
      ['Processos com Etapas Pendentes', `${metricas.pendentes}`, 'Cadastros Manuais Aguardando Sponte', `${metricas.aguardandoValidacaoSponte}`],
      ['Total Geral de Etapas Pendentes', `${metricas.totalEtapasPendentes}`, 'Entregas Material (Mochila e Chinook)', `${metricas.entregasMaterialMochilaChinook}`],
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 1.8 },
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
  });

  // Tabela principal de alunos
  const startYAlunos = ((doc as any).lastAutoTable?.finalY || 80) + 6;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Relação de Alunos e Situação Operacional', 14, startYAlunos);

  const linhasAlunos = alunos.map(aluno => {
    const proc = processos.find(p => p.alunoId === aluno.id);
    let progresso = '-';
    let estado = aluno.situacao === 'inativo' ? 'Arquivado' : 'Aguardando Sponte';
    let pendencias = '-';
    let tipo = '-';

    if (proc) {
      const calc = calcularEstadoEProgresso(proc, aluno);
      progresso = `${calc.concluidosObrigatorios}/${calc.totalObrigatorios}`;
      estado = aluno.situacao === 'inativo' ? 'Arquivado' : !aluno.validadoSponte ? 'Aguardando Sponte' : calc.estado === 'APROVADO' ? 'Aprovado' : calc.estado === 'AGUARDANDO_APROVACAO' ? 'Aguardando Aprovação' : 'Pendente';
      tipo = proc.tipo === 'NOVA_MATRICULA' ? 'Nova Matrícula' : proc.tipo === 'REMATRICULA' ? 'Rematrícula' : 'Pendente Classif.';
      if (calc.pendencias.length > 0) {
        pendencias = calc.pendencias.slice(0, 2).join('; ') + (calc.pendencias.length > 2 ? ` (+${calc.pendencias.length - 2})` : '');
      } else {
        pendencias = 'Nenhuma';
      }
    }

    return [
      aluno.matricula,
      aluno.nome,
      aluno.curso,
      aluno.situacao === 'ativo' ? 'Ativo' : aluno.situacao === 'inativo' ? `Inativo (${aluno.motivoSaida || 's/m'})` : 'Provisório',
      tipo,
      progresso,
      estado,
      pendencias,
    ];
  });

  autoTable(doc, {
    startY: startYAlunos + 3,
    head: [['Matrícula', 'Nome do Aluno', 'Curso', 'Situação', 'Tipo', 'Progresso', 'Estado', 'Pendências Principais']],
    body: linhasAlunos,
    theme: 'striped',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [201, 20, 48], textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Rodapé da página
      doc.setFontSize(8);
      doc.setTextColor(140, 140, 140);
      doc.text(
        `Secretaria Maple Bear — Matrículas 2027 — Página ${data.pageNumber}`,
        14,
        205
      );
    },
  });

  doc.save(`Relatorio_Matriculas_2027_${Date.now()}.pdf`);
}
