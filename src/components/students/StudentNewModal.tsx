'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, UserPlus, AlertCircle, Info } from 'lucide-react';
import { useDialogFocus } from '../ui/useDialogFocus';

interface StudentNewModalProps {
  onClose: () => void;
}

export function StudentNewModal({ onClose }: StudentNewModalProps) {
  const dialogRef = useDialogFocus(onClose);
  const { cadastrarAlunoManual, salvando } = useApp();
  const [matricula, setMatricula] = useState('');
  const [nome, setNome] = useState('');
  const [curso, setCurso] = useState('Year 1');
  const [turma, setTurma] = useState('');
  const [dataCadastro, setDataCadastro] = useState('');
  const [jaEstudouOutraInstituicao, setJaEstudouOutraInstituicao] = useState<'sim' | 'nao' | 'a_confirmar'>('a_confirmar');
  const [erro, setErro] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const res = await cadastrarAlunoManual({
      matricula,
      nome,
      curso,
      turma: turma.trim() || undefined,
      dataCadastro,
      jaEstudouOutraInstituicao,
    });

    if (!res.success) {
      setErro(res.error || 'Erro ao realizar cadastro.');
    } else {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef} role="dialog" aria-modal="true" aria-label="Cadastrar aluno" tabIndex={-1}
        className="bg-white rounded-2xl shadow-2xl border border-zinc-200 w-full max-w-lg max-h-[92dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-zinc-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UserPlus className="w-5 h-5 text-brand-500" />
            <h3 className="font-bold text-base text-white">Cadastrar aluno</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar cadastro"
            className="text-zinc-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-purple-50 border border-purple-200 p-3.5 rounded-2xl text-xs text-purple-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <strong>Aguardando Validação no Sponte:</strong> Este aluno será cadastrado provisoriamente.
              O checklist pode ser preenchido, mas a <strong>aprovação final fica bloqueada</strong> até a
              confirmação dos dados pela sincronização oficial da origem.
            </div>
          </div>

          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Número de Matrícula *
              </label>
              <input
                type="text"
                required
                aria-label="Número de matrícula"
                    value={matricula}
                onChange={e => setMatricula(e.target.value)}
                placeholder="Ex: 0995"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-brand-500 focus:bg-white focus:outline-none"
              />
              <span className="text-[10px] text-zinc-400">Preserva zeros à esquerda</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Data de cadastro informada
              </label>
              <input
                type="date"
                aria-label="Data de cadastro informada"
                    value={dataCadastro}
                onChange={e => setDataCadastro(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:bg-white focus:outline-none"
              />
              <span className="text-[10px] text-zinc-400">&gt;= 01/09/2026: Nova Matrícula</span>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Nome Completo do Aluno *
              </label>
              <input
                type="text"
                required
                aria-label="Nome completo do aluno"
                    value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Enzo Gabriel Faria"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Curso Previsto *
              </label>
              <select
                aria-label="Curso"
                    value={curso}
                onChange={e => setCurso(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:bg-white focus:outline-none"
              >
                <option value="Toddler">Toddler (Abaixo do JK)</option>
                <option value="Nursery">Nursery (Abaixo do JK)</option>
                <option value="Junior Kindergarten">Junior Kindergarten (JK)</option>
                <option value="Senior Kindergarten">Senior Kindergarten (SK)</option>
                <option value="Year 1">Year 1</option>
                <option value="Year 2">Year 2</option>
                <option value="Year 3">Year 3</option>
                <option value="Year 4">Year 4</option>
                <option value="Year 5">Year 5</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Turma (Opcional)
              </label>
              <input
                type="text"
                aria-label="Turma"
                    value={turma}
                onChange={e => setTurma(e.target.value)}
                placeholder="Ex: Manhã, Turma A"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-zinc-700 mb-1">
                Já estudou em outra instituição? (Para rematrículas)
              </label>
              <select
                aria-label="Já estudou em outra instituição?"
                    value={jaEstudouOutraInstituicao}
                onChange={e => setJaEstudouOutraInstituicao(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-brand-500 focus:bg-white focus:outline-none"
              >
                <option value="nao">Não (Dispensado)</option>
                <option value="sim">Sim (Declaração Obrigatória)</option>
                <option value="a_confirmar">A Confirmar</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-5 py-2 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl shadow-sm"
            >
              {salvando ? 'Salvando…' : 'Cadastrar aluno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
