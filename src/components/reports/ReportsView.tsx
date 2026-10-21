'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { calcularMetricasOperacionais, listarPendenciasPorAluno } from '../../services/metrics';
import {
  FileSpreadsheet,
  FileText,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Package,
  Archive,
  Users,
} from 'lucide-react';

export function ReportsView() {
  const { alunos, processos } = useApp();
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const metricas = calcularMetricasOperacionais(alunos, processos);
  const pendenciasPorAluno = listarPendenciasPorAluno(alunos, processos);

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      setExportError(null);
      const { exportarRelatorioExcel } = await import('../../services/export-excel');
      await exportarRelatorioExcel(alunos, processos, 'Recorte Completo — Ano Letivo 2027');
    } catch (e) {
      console.error('Erro ao exportar Excel:', e);
      setExportError('Não foi possível gerar o Excel. Tente novamente.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      setExportError(null);
      const { exportarRelatorioPDF } = await import('../../services/export-pdf');
      exportarRelatorioPDF(alunos, processos, 'Recorte Completo — Ano Letivo 2027');
    } catch (e) {
      console.error('Erro ao exportar PDF:', e);
      setExportError('Não foi possível gerar o PDF. Tente novamente.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {exportError && <div role="alert" className="notice notice-error">{exportError}</div>}
      {/* Cabeçalho da Seção de Relatórios com Botões de Exportação */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-200 mb-2">
            <span>Ano Letivo 2027</span>
            <span>•</span>
            <span>Unidade Araxá</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
            Relatório Gerencial de Matrículas
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Visualização consolidada de pendências documentais, aprovações e histórico de movimentações.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Exportar Excel */}
          <button
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all disabled:opacity-50"
            title="Exportar planilha real formatada em .xlsx"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isExportingExcel ? 'Gerando .xlsx...' : 'Exportar Excel (.xlsx)'}</span>
          </button>

          {/* Exportar PDF */}
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all disabled:opacity-50"
            title="Exportar documento oficial formatado em .pdf"
          >
            <FileText className="w-4 h-4" />
            <span>{isExportingPdf ? 'Gerando .pdf...' : 'Exportar PDF (.pdf)'}</span>
          </button>
        </div>
      </div>

      {/* Grid de Métricas Operacionais Principais (Ativos Validados) */}
      <div>
        <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3 px-1">
          Acompanhamento Operacional (Alunos Ativos Validados)
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Acompanhado */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold">
              <span>Total Acompanhado</span>
              <Users className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-3xl font-black text-zinc-900 mt-2">
              {metricas.totalAcompanhado}
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              {metricas.novasMatriculas} novas + {metricas.rematriculas} rematrículas
            </div>
          </div>

          {/* Aprovados */}
          <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-xs bg-emerald-50/20">
            <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold">
              <span>Processos Aprovados</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-3xl font-black text-emerald-700 mt-2">
              {metricas.aprovados}
            </div>
            <div className="text-[11px] text-emerald-600 mt-1">
              {metricas.totalAcompanhado > 0 ? Math.round((metricas.aprovados / metricas.totalAcompanhado) * 100) : 0}% dos ativos validados
            </div>
          </div>

          {/* Aguardando Aprovação */}
          <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-xs bg-blue-50/20">
            <div className="flex items-center justify-between text-blue-700 text-xs font-semibold">
              <span>Aguardando Aprovação</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-3xl font-black text-blue-700 mt-2">
              {metricas.aguardandoAprovacao}
            </div>
            <div className="text-[11px] text-blue-600 mt-1">
              100% dos documentos conferidos
            </div>
          </div>

          {/* Processos com Pendências */}
          <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-xs bg-amber-50/20">
            <div className="flex items-center justify-between text-amber-800 text-xs font-semibold">
              <span>Processos Pendentes</span>
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-3xl font-black text-amber-800 mt-2">
              {metricas.pendentes}
            </div>
            <div className="text-[11px] text-amber-700 mt-1">
              {metricas.totalEtapasPendentes} etapas totais a concluir
            </div>
          </div>
        </div>
      </div>

      {/* Métricas Especiais: Entregas de Material e Saídas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Entregas de Material */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-brand-600 text-xs font-bold mb-1">
              <Package className="w-4 h-4" />
              <span>Entregas de Material (Mochila e Chinook)</span>
            </div>
            <p className="text-xs text-zinc-500">
              Marcações válidas do item único nos processos ativos de Nova Matrícula.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 flex items-baseline justify-between">
            <span className="text-3xl font-black text-zinc-900">
              {metricas.entregasMaterialMochilaChinook}
            </span>
            <span className="text-xs font-bold text-zinc-500">
              de {metricas.novasMatriculas} novas matrículas
            </span>
          </div>
        </div>

        {/* Cadastros Manuais Aguardando Validação */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-purple-600 text-xs font-bold mb-1">
              <Users className="w-4 h-4" />
              <span>Cadastros Provisórios da Secretaria</span>
            </div>
            <p className="text-xs text-zinc-500">
              Alunos inseridos manualmente aguardando primeira conciliação pelo Sponte.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 flex items-baseline justify-between">
            <span className="text-3xl font-black text-purple-700">
              {metricas.aguardandoValidacaoSponte}
            </span>
            <span className="text-xs text-purple-600 font-semibold">
              Aprovação bloqueada
            </span>
          </div>
        </div>

        {/* Histórico de Saídas (Arquivados) */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-zinc-600 text-xs font-bold mb-1">
              <Archive className="w-4 h-4" />
              <span>Alunos Arquivados (Histórico de Saídas)</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] text-zinc-600 mt-2">
              <div>Transferência: <strong>{metricas.saidasHistorico.transferencia}</strong></div>
              <div>Desistência: <strong>{metricas.saidasHistorico.desistencia}</strong></div>
              <div>Cancelamento: <strong>{metricas.saidasHistorico.cancelamento}</strong></div>
              <div>Não informado: <strong>{metricas.saidasHistorico.naoInformado}</strong></div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 flex items-baseline justify-between">
            <span className="text-2xl font-black text-zinc-700">
              {metricas.saidasHistorico.total}
            </span>
            <span className="text-xs text-zinc-400 font-medium">
              Separados das contagens ativas
            </span>
          </div>
        </div>
      </div>

      {/* Relação de Alunos com Etapas Pendentes */}
      <div className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-zinc-900">
              Relação de Etapas Pendentes por Aluno Ativo ({pendenciasPorAluno.length})
            </h3>
            <p className="text-xs text-zinc-500">
              Lista nominal das pendências para cobrança e acompanhamento da secretaria.
            </p>
          </div>
        </div>

        <div className="divide-y divide-zinc-100 max-h-96 overflow-y-auto">
          {pendenciasPorAluno.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              Nenhum aluno ativo possui etapas pendentes no momento.
            </div>
          ) : (
            pendenciasPorAluno.map(p => (
              <div key={p.alunoId} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                      {p.matricula}
                    </span>
                    <span className="font-bold text-xs text-zinc-900">{p.nome}</span>
                    <span className="text-[10px] text-zinc-400">({p.curso} • {p.tipo})</span>
                  </div>
                  <div className="text-xs text-amber-800 font-medium mt-1">
                    Pendências: {p.etapasPendentes.join('; ')}
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 shrink-0 self-start sm:self-auto">
                  {p.etapasPendentes.length} pendente(s)
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
