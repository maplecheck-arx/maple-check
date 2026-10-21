import React from 'react';
import { EstadoProcesso, SituacaoAluno, TipoProcesso } from '../../domain/types';

interface StatusBadgeProps {
  tipo?: 'estado' | 'situacao' | 'processo';
  valor: EstadoProcesso | SituacaoAluno | TipoProcesso | string;
  hasPendencia?: boolean;
  className?: string;
}

export function StatusBadge({ tipo = 'estado', valor, hasPendencia, className = '' }: StatusBadgeProps) {
  if (tipo === 'estado') {
    switch (valor) {
      case 'APROVADO':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Aprovado
          </span>
        );
      case 'AGUARDANDO_APROVACAO':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 ${className}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Aguardando aprovação
          </span>
        );
      case 'PENDENTE':
      default:
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 ${className}`}>
            {hasPendencia ? (
              <span className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-red-600 text-white font-bold text-[10px]" title="Existem etapas pendentes">
                !
              </span>
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            )}
            Pendente
          </span>
        );
    }
  }

  if (tipo === 'situacao') {
    switch (valor) {
      case 'ativo':
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
            Ativo
          </span>
        );
      case 'inativo':
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200 ${className}`}>
            Arquivado / Inativo
          </span>
        );
      case 'aguardando_validacao':
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 ${className}`}>
            Aguardando Sponte
          </span>
        );
    }
  }

  if (tipo === 'processo') {
    switch (valor) {
      case 'NOVA_MATRICULA':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 ${className}`}>
            Nova matrícula
          </span>
        );
      case 'REMATRICULA':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 ${className}`}>
            Rematrícula
          </span>
        );
      case 'CLASSIFICACAO_PENDENTE':
      default:
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 ${className}`}>
            Classificação Pendente
          </span>
        );
    }
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-800 ${className}`}>
      {valor}
    </span>
  );
}
