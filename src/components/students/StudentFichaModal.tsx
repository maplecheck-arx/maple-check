'use client';

import React, { useState } from 'react';
import { Aluno, ProcessoMatricula } from '../../domain/types';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../ui/StatusBadge';
import { ChecklistViewer } from '../checklist/ChecklistViewer';
import { useDialogFocus } from '../ui/useDialogFocus';
import {
  X,
  Edit2,
  Save,
  Trash2,
  AlertTriangle,
  History,
  BookOpen,
  Calendar,
  CheckCircle,
} from 'lucide-react';

interface StudentFichaModalProps {
  aluno: Aluno;
  onClose: () => void;
}

export function StudentFichaModal({ aluno, onClose }: StudentFichaModalProps) {
  const { processos, editarAlunoLocal, excluirAlunoDefinitivo, currentUser, salvando, revisoes } = useApp();
  const [revisaoEdicao, setRevisaoEdicao] = useState(revisoes[aluno.id]);
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmExclusao, setShowConfirmExclusao] = useState(false);
  const dialogRef = useDialogFocus(() => showConfirmExclusao ? setShowConfirmExclusao(false) : onClose());
  const [confirmacaoTexto, setConfirmacaoTexto] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Campos de edição local
  const [nome, setNome] = useState(aluno.nome);
  const [curso, setCurso] = useState(aluno.curso);
  const [turma, setTurma] = useState(aluno.turma || '');
  const [dataCadastro, setDataCadastro] = useState(aluno.dataCadastroSponte || '');
  const [jaEstudouOutraInstituicao, setJaEstudouOutraInstituicao] = useState<'sim' | 'nao' | 'a_confirmar'>(
    aluno.jaEstudouOutraInstituicao || 'a_confirmar'
  );

  const processo = processos.find(p => p.alunoId === aluno.id);
  const isAdmin = currentUser?.role === 'ADMIN';

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await editarAlunoLocal(aluno.id, {
      nome: nome.trim(),
      curso: curso.trim(),
      turma: turma.trim() || undefined,
      dataCadastroSponte: dataCadastro.trim() || undefined,
      jaEstudouOutraInstituicao,
    }, revisaoEdicao);

    if (res.success) {
      setIsEditing(false);
      setFeedback('Dados cadastrais locais atualizados com sucesso.');
      setTimeout(() => setFeedback(null), 3500);
    } else {
      setFeedback(res.error || 'Erro ao atualizar dados.');
    }
  };

  const handleConfirmarExclusao = async () => {
    if (!isAdmin) return;
    const res = await excluirAlunoDefinitivo(aluno.id);
    if (res.success) {
      onClose();
    } else {
      setFeedback(res.error || 'Erro ao excluir aluno.');
      setShowConfirmExclusao(false);
    }
  };

  if (!processo) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        ref={dialogRef} role="dialog" aria-modal="true" aria-label={`Ficha de ${aluno.nome}`} tabIndex={-1}
        className="bg-white rounded-3xl shadow-2xl border border-zinc-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho da Ficha */}
        <div className="bg-zinc-900 text-white p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
              {aluno.nome.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs bg-zinc-800 text-brand-400 font-bold px-2 py-0.5 rounded border border-zinc-700">
                  Matrícula {aluno.matricula}
                </span>
                <StatusBadge tipo="situacao" valor={aluno.situacao} />
                <StatusBadge tipo="processo" valor={processo.tipo} />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                {aluno.nome}
              </h2>
              <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-2 mt-0.5">
                <span>Curso: <strong className="text-zinc-200">{aluno.curso}</strong></span>
                {aluno.turma && <span>• Turma: <strong className="text-zinc-200">{aluno.turma}</strong></span>}
                <span>• Ano Letivo: <strong>{aluno.anoLetivo}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && aluno.situacao !== 'inativo' && (
              <button
                onClick={() => { setNome(aluno.nome); setCurso(aluno.curso); setTurma(aluno.turma || ''); setDataCadastro(aluno.dataCadastroSponte || ''); setJaEstudouOutraInstituicao(aluno.jaEstudouOutraInstituicao || 'a_confirmar'); setRevisaoEdicao(revisoes[aluno.id]); setIsEditing(true); }}
                className="inline-flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-xl text-xs font-semibold border border-zinc-700 transition-colors"
                title="Editar dados cadastrais locais"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar Dados</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
              aria-label="Fechar ficha"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {feedback && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-semibold">
              {feedback}
            </div>
          )}

          {/* Modo de Edição Cadastral */}
          {isEditing ? (
            <form onSubmit={handleSalvarEdicao} className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
                <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-brand-600" />
                  Editar Dados Cadastrais Locais
                </h3>
                <span className="text-xs text-zinc-500">Matrícula: {aluno.matricula} (imutável)</span>
              </div>

              <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Aviso de Conciliação:</strong> Alterações locais nesta ficha serão atualizadas automaticamente
                  pelos dados oficiais quando a integração com o Sponte estiver disponível.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    aria-label="Nome completo do aluno"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Curso</label>
                  <input
                    type="text"
                    required
                    aria-label="Curso"
                    value={curso}
                    onChange={e => setCurso(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-400">Ex: Toddler, Nursery, Junior Kindergarten, Year 1</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Turma (Opcional)</label>
                  <input
                    type="text"
                    aria-label="Turma"
                    value={turma}
                    onChange={e => setTurma(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    placeholder="Ex: Manhã, Turma B"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Data de Cadastro Sponte (Corte 01/09/2026)</label>
                  <input
                    type="date"
                    aria-label="Data de cadastro informada"
                    value={dataCadastro}
                    onChange={e => setDataCadastro(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-zinc-400">Altera automaticamente entre Nova Matrícula e Rematrícula</span>
                </div>

                {processo.tipo === 'REMATRICULA' && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-zinc-700 mb-1">
                      Já estudou em outra instituição? (Declaração de Transferência)
                    </label>
                    <select
                      aria-label="Já estudou em outra instituição?"
                    value={jaEstudouOutraInstituicao}
                      onChange={e => setJaEstudouOutraInstituicao(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    >
                      <option value="sim">Sim (Declaração Obrigatória)</option>
                      <option value="nao">Não (Dispensado / Não se aplica)</option>
                      <option value="a_confirmar">A Confirmar pela Secretaria</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-200 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="inline-flex items-center gap-1.5 bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar Alterações Locais
                </button>
              </div>
            </form>
          ) : (
            /* Detalhes Cadastrais em Modo Leitura */
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-xs">
              <div>
                <span className="text-zinc-400 block font-semibold text-[10px] uppercase">Matrícula</span>
                <span className="font-mono text-zinc-700">{aluno.matricula}</span>
              </div>
              <div>
                <span className="text-zinc-400 block font-semibold text-[10px] uppercase">Cadastro Sponte</span>
                <span className="font-bold text-zinc-800">
                  {aluno.dataCadastroSponte ? aluno.dataCadastroSponte.split('-').reverse().join('/') : 'Data Ausente'}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block font-semibold text-[10px] uppercase">Validação Sponte</span>
                <span className={aluno.validadoSponte ? 'text-emerald-700 font-bold' : 'text-purple-700 font-bold'}>
                  {aluno.validadoSponte ? 'Confirmado na Origem' : 'Pendente de Confirmação'}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block font-semibold text-[10px] uppercase">Ano do Processo</span>
                <span className="font-bold text-zinc-800">2027</span>
              </div>
            </div>
          )}

          {/* Checklist Viewer */}
          <ChecklistViewer aluno={aluno} processo={processo} readOnly={aluno.situacao === 'inativo'} />

          {/* Histórico e Auditoria Simples */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5">
            <h4 className="font-bold text-sm text-zinc-900 flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-zinc-600" />
              Histórico de Eventos do Aluno ({processo.eventos.length})
            </h4>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {processo.eventos.slice().reverse().map((ev) => (
                <div key={ev.id} className="text-xs p-2.5 rounded-xl bg-white border border-zinc-200 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-zinc-800">{ev.descricao}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      Por: <strong>{ev.autorNome}</strong>
                    </div>
                  </div>
                  <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                    {new Date(ev.dataHora).toLocaleDateString('pt-BR')} {new Date(ev.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Área de Exclusão Definitiva (Apenas Administrador) */}
          {processo.versoesAnteriores?.map(versao => <details key={versao.id} className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm"><summary className="cursor-pointer font-semibold">Checklist anterior: {versao.tipo === 'NOVA_MATRICULA' ? 'nova matrícula' : 'rematrícula'} · {new Date(versao.arquivadoEm).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</summary><ul className="mt-3 space-y-2">{versao.itens.map(item => <li key={item.id}>{item.concluido ? '✓' : '—'} {item.rotulo}{item.marcadoPorNome && <small className="block text-zinc-600">Marcado por {item.marcadoPorNome}</small>}</li>)}</ul></details>)}
          {isAdmin && (
            <div className="border border-rose-200 bg-rose-50/50 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-rose-900 flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  Excluir cadastro
                </h4>
                <p className="text-xs text-rose-700 mt-0.5">
                  Remove o cadastro e seu checklist deste sistema. A matrícula ficará bloqueada para reimportação.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowConfirmExclusao(true)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
              >
                Excluir cadastro
              </button>
            </div>
          )}
        </div>

        {/* Modal de Confirmação Explícita de Exclusão */}
        {showConfirmExclusao && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowConfirmExclusao(false)}
          >
            <div
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-zinc-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 text-rose-600 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-base font-bold text-zinc-900">Confirmar Exclusão Definitiva</h3>
              </div>
              <p className="text-xs text-zinc-600">
                Você está prestes a excluir permanentemente o aluno:
              </p>
              <div className="bg-zinc-100 p-3 rounded-xl my-3 text-xs">
                <div><strong>Nome:</strong> {aluno.nome}</div>
                <div><strong>Matrícula:</strong> {aluno.matricula}</div>
              </div>
              <p className="text-xs text-rose-700 font-semibold mb-4">
                Esta ação remove permanentemente os dados deste aluno do Maple Check. Digite a matrícula <strong>{aluno.matricula}</strong> para confirmar:
              </p>

              <input
                type="text"
                aria-label="Digite a matrícula para confirmar"
                    value={confirmacaoTexto}
                onChange={e => setConfirmacaoTexto(e.target.value)}
                placeholder={`Digite ${aluno.matricula}`}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none mb-4"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmExclusao(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={salvando || confirmacaoTexto.trim() !== aluno.matricula}
                  onClick={handleConfirmarExclusao}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-sm"
                >
                  Excluir Definitivamente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
