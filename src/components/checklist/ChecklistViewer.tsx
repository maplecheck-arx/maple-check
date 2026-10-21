'use client';

import React, { useState } from 'react';
import { Aluno, ChecklistItem, ProcessoMatricula } from '../../domain/types';
import { useApp } from '../../context/AppContext';
import { calcularEstadoEProgresso } from '../../domain/rules';
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Info,
  ShieldCheck,
  AlertTriangle,
  Clock,
} from 'lucide-react';

interface ChecklistViewerProps {
  aluno: Aluno;
  processo: ProcessoMatricula;
  readOnly?: boolean;
}

export function ChecklistViewer({ aluno, processo, readOnly = false }: ChecklistViewerProps) {
  const { marcarItem, aprovar, salvando } = useApp();
  const [activeTooltipId, setActiveTooltipId] = useState<string | null>(null);
  const [itemParaDesmarcarAprovado, setItemParaDesmarcarAprovado] = useState<ChecklistItem | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const calc = calcularEstadoEProgresso(processo, aluno);
  const isBloqueadoAprovacao = !calc.podeAprovar;
  const isAprovado = processo.estado === 'APROVADO';

  const handleToggle = async (item: ChecklistItem) => {
    if (salvando || readOnly || aluno.situacao === 'inativo') return;
    if (item.aplicabilidade !== 'obrigatorio') return;

    // Se estiver aprovado e o usuário estiver desmarcando um item obrigatório
    if (isAprovado && item.concluido && item.aplicabilidade === 'obrigatorio') {
      setItemParaDesmarcarAprovado(item);
      return;
    }

    const novoValor = !item.concluido;
    const res = await marcarItem(aluno.id, item.id, novoValor);
    if (!res.success) {
      setFeedbackMsg({ tipo: 'erro', texto: res.error || 'Erro ao atualizar item.' });
    } else {
      setFeedbackMsg(null);
    }
  };

  const confirmarDesmarcacaoAprovado = async () => {
    if (!itemParaDesmarcarAprovado) return;
    const res = await marcarItem(aluno.id, itemParaDesmarcarAprovado.id, false);
    if (!res.success) {
      setFeedbackMsg({ tipo: 'erro', texto: res.error || 'Erro ao atualizar item.' });
    } else {
      setFeedbackMsg({
        tipo: 'erro',
        texto: 'Aprovação final foi revogada automaticamente porque uma etapa obrigatória foi desmarcada.',
      });
    }
    setItemParaDesmarcarAprovado(null);
  };

  const handleAprovar = async () => {
    const res = await aprovar(aluno.id);
    if (!res.success) {
      setFeedbackMsg({ tipo: 'erro', texto: res.error || 'Não foi possível aprovar o processo.' });
    } else {
      setFeedbackMsg({ tipo: 'sucesso', texto: 'Processo de matrícula aprovado com sucesso!' });
    }
  };

  const pct = calc.totalObrigatorios > 0
    ? Math.round((calc.concluidosObrigatorios / calc.totalObrigatorios) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Barra de Progresso e Métricas */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
              Progresso do Checklist ({processo.itens.length} etapas)
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-900 flex items-center gap-2">
              <span>{calc.concluidosObrigatorios} de {calc.totalObrigatorios} etapas concluídas</span>
              <span className="text-xs font-bold text-zinc-600 bg-white border border-zinc-200 px-2 py-0.5 rounded-full">
                {pct}%
              </span>
            </div>
          </div>

          {/* Badges de itens dispensados / a confirmar */}
          <div className="flex flex-wrap gap-2 text-xs">
            {calc.totalNaoAplica > 0 && (
              <span className="bg-zinc-200 text-zinc-700 px-2.5 py-1 rounded-lg font-medium">
                {calc.totalNaoAplica} dispensado(s)
              </span>
            )}
            {calc.totalAConfirmar > 0 && (
              <span className="bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {calc.totalAConfirmar} a confirmar aplicabilidade
              </span>
            )}
          </div>
        </div>

        {/* Linha da Barra */}
        <div className="w-full bg-zinc-200 h-2.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              pct === 100 ? 'bg-emerald-500' : 'bg-brand-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Banner de Feedback (Sucesso/Erro) */}
      {feedbackMsg && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            feedbackMsg.tipo === 'sucesso'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedbackMsg.tipo === 'sucesso' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedbackMsg.texto}</span>
        </div>
      )}

      {/* Status de Aprovação Vigente */}
      {isAprovado && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-sm text-emerald-900">
                Processo de Matrícula Aprovado
              </div>
              <div className="text-xs text-emerald-700">
                Aprovado por: <strong>{processo.aprovadoPorNome || 'Usuário da Secretaria'}</strong> em{' '}
                {processo.aprovadoEm ? new Date(processo.aprovadoEm).toLocaleString('pt-BR') : '-'}
              </div>
            </div>
          </div>
          <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full border border-emerald-300">
            Aprovação Válida
          </span>
        </div>
      )}

      {/* Lista de Itens do Checklist */}
      <div className="space-y-2">
        {processo.itens.map((item) => {
          const isDispensado = item.aplicabilidade === 'nao_se_aplica';
          const isAConfirmar = item.aplicabilidade === 'a_confirmar';
          const isItemMaterial = item.id === 'nm_material';

          return (
            <div
              key={item.id}
              className={`group relative p-3 sm:p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                isDispensado
                  ? 'bg-zinc-100/60 border-zinc-200 text-zinc-400 opacity-75'
                  : item.concluido
                  ? 'bg-emerald-50/40 border-emerald-200 text-zinc-900'
                  : isAConfirmar
                  ? 'bg-amber-50/40 border-amber-200 text-zinc-900'
                  : 'bg-white border-zinc-200 text-zinc-900 hover:border-zinc-300'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {/* Checkbox com foco acessível */}
                <button
                  type="button"
                  disabled={salvando || readOnly || isAConfirmar || isDispensado || aluno.situacao === 'inativo'}
                  onClick={() => handleToggle(item)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-brand-500 shrink-0 ${
                    isDispensado
                      ? 'bg-zinc-200 border border-zinc-300 cursor-not-allowed'
                      : item.concluido
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'border-2 border-zinc-300 hover:border-brand-500 bg-white'
                  }`}
                  role="checkbox"
                  aria-checked={item.concluido}
                  aria-label={item.rotulo}
                >
                  {item.concluido && (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  )}
                  {isDispensado && (
                    <span className="text-zinc-400 text-xs font-bold">—</span>
                  )}
                </button>

                {/* Rótulo do Item */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-xs text-zinc-400">{item.numero}.</span>
                    <span
                      onClick={() => !isDispensado && handleToggle(item)}
                      className={`text-sm font-medium cursor-pointer select-none ${
                        isDispensado ? 'line-through text-zinc-400 cursor-not-allowed' : 'text-zinc-900'
                      }`}
                    >
                      {item.rotulo}
                    </span>

                    {/* Destaque para entrega de material */}
                    {isItemMaterial && (
                      <span className="bg-red-50 text-brand-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-brand-200">
                        Entrega Única
                      </span>
                    )}

                    {/* Tag Não se Aplica */}
                    {isDispensado && (
                      <span className="bg-zinc-200 text-zinc-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        Não se Aplica (Dispensado)
                      </span>
                    )}

                    {/* Tag A Confirmar */}
                    {isAConfirmar && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-300">
                        A Confirmar
                      </span>
                    )}
                  </div>

                  {/* Informação inline de autoria caso esteja concluído */}
                  {item.concluido && item.marcadoPorNome && (
                    <div className="text-[11px] text-zinc-500 mt-0.5 hidden sm:flex items-center gap-1">
                      <span>Marcado por: <strong>{item.marcadoPorNome}</strong></span>
                      {item.marcadoEm && (
                        <span>• {new Date(item.marcadoEm).toLocaleDateString('pt-BR')} às {new Date(item.marcadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Botão de Tooltip de Autoria (Mobile e Desktop) */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTooltipId(activeTooltipId === item.id ? null : item.id)}
                  onMouseEnter={() => setActiveTooltipId(item.id)}
                  onMouseLeave={() => setActiveTooltipId(null)}
                  onFocus={() => setActiveTooltipId(item.id)}
                  onBlur={() => setActiveTooltipId(null)}
                  className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg hover:bg-zinc-100 transition-colors"
                  title="Ver detalhes de autoria e histórico"
                  aria-label={`Ver autoria: ${item.rotulo}`}
                  aria-expanded={activeTooltipId === item.id}
                >
                  <Info className="w-4 h-4" />
                </button>

                {/* Tooltip Card */}
                {activeTooltipId === item.id && (
                  <div className="absolute right-0 bottom-full mb-2 w-64 bg-zinc-900 text-white text-xs rounded-xl p-3 shadow-xl z-30 animate-fadeIn pointer-events-none">
                    <div className="font-bold border-b border-zinc-800 pb-1 mb-1.5 text-zinc-200">
                      Detalhes da Etapa {item.numero}
                    </div>
                    {item.concluido ? (
                      <div className="space-y-1">
                        <div>
                          <span className="text-zinc-400">Marcado por:</span>{' '}
                          <span className="font-semibold text-emerald-400">{item.marcadoPorNome || 'Secretaria'}</span>
                        </div>
                        <div>
                          <span className="text-zinc-400">Data/Hora:</span>{' '}
                          <span>{item.marcadoEm ? new Date(item.marcadoEm).toLocaleString('pt-BR') : '-'}</span>
                        </div>
                      </div>
                    ) : isDispensado ? (
                      <div className="text-zinc-400">
                        Item dispensado de acordo com a idade/curso do aluno ou histórico escolar.
                      </div>
                    ) : isAConfirmar ? (
                      <div className="text-amber-300">
                        Aplicabilidade ainda a confirmar. Verifique o curso ou histórico de transferência.
                      </div>
                    ) : (
                      <div className="text-zinc-400">
                        Etapa pendente de conclusão.
                      </div>
                    )}

                    {/* Histórico Anterior */}
                    {item.historico.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-zinc-800 text-[10px] text-zinc-400">
                        <div className="font-semibold text-zinc-300">Histórico de Alterações ({item.historico.length}):</div>
                        <ul className="space-y-0.5 mt-1 max-h-20 overflow-y-auto">
                          {item.historico.slice().reverse().map((h, idx) => (
                            <li key={idx}>
                              {h.valor ? '✓ Marcado' : '✗ Desmarcado'} por {h.alteradoPorNome} (
                              {new Date(h.alteradoEm).toLocaleDateString('pt-BR')})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Seção de Aprovação Final */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-brand-600" />
              Aprovação Final da Matrícula 2027
            </h4>
            <p className="text-xs text-zinc-600 mt-0.5">
              Qualquer usuário autenticado pode realizar a aprovação após a conclusão de todas as etapas obrigatórias.
            </p>
          </div>

          <div>
            {isAprovado ? (
              <button
                disabled
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default"
              >
                ✓ Processo Já Aprovado
              </button>
            ) : (
              <button
                type="button"
                disabled={salvando || readOnly || isBloqueadoAprovacao || aluno.situacao === 'inativo'}
                onClick={handleAprovar}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm ${
                  isBloqueadoAprovacao || aluno.situacao === 'inativo'
                    ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed border border-zinc-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 hover:shadow-md'
                }`}
              >
                Realizar Aprovação Final
              </button>
            )}
          </div>
        </div>

        {/* Motivo do bloqueio se não puder aprovar */}
        {isBloqueadoAprovacao && !isAprovado && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong>Aprovação bloqueada:</strong> {calc.motivoBloqueio}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Confirmação para desmarcar item após aprovação */}
      {itemParaDesmarcarAprovado && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setItemParaDesmarcarAprovado(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-zinc-900">Revogação de Aprovação</h3>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              O processo do aluno <strong>{aluno.nome}</strong> já foi <strong>APROVADO</strong>.
            </p>
            <p className="text-xs text-zinc-600 mt-2 leading-relaxed">
              Desmarcar a etapa obrigatória <strong>"{itemParaDesmarcarAprovado.rotulo}"</strong> irá revogar a aprovação vigente imediatamente e retornar o processo ao estado <strong>PENDENTE</strong>.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setItemParaDesmarcarAprovado(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarDesmarcacaoAprovado}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm"
              >
                Confirmar e Revogar Aprovação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
