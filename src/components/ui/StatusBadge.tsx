import { EstadoProcesso, SituacaoAluno, TipoProcesso } from '../../domain/types';

interface StatusBadgeProps {
  tipo?: 'estado' | 'situacao' | 'processo';
  valor: EstadoProcesso | SituacaoAluno | TipoProcesso | string;
  hasPendencia?: boolean;
  className?: string;
}
const labels: Record<string, Record<string, [string, string]>> = {
  estado: { APROVADO: ['Aprovado', 'success'], AGUARDANDO_APROVACAO: ['Aguardando aprovação', 'attention'], PENDENTE: ['Pendente', 'attention'] },
  situacao: { ativo: ['Ativo', 'success'], inativo: ['Arquivado / Inativo', 'neutral'], aguardando_validacao: ['Aguardando Sponte', 'neutral'] },
  processo: { NOVA_MATRICULA: ['Nova matrícula', 'brand'], REMATRICULA: ['Rematrícula', 'neutral'], CLASSIFICACAO_PENDENTE: ['Classificação pendente', 'attention'] },
};
export function StatusBadge({ tipo = 'estado', valor, hasPendencia, className = '' }: StatusBadgeProps) {
  const [label, tone] = labels[tipo]?.[valor] || [valor, 'neutral'];
  return <span className={'status-badge status-badge--' + tone + ' ' + className}>
    {tipo === 'estado' && (hasPendencia && valor !== 'APROVADO' && valor !== 'AGUARDANDO_APROVACAO'
      ? <span className="pending-symbol" title="Existem etapas pendentes" aria-hidden="true">!</span>
      : <span className="badge-dot" aria-hidden="true" />)}
    {label}
  </span>;
}
