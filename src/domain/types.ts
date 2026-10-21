export type UserRole = 'ADMIN' | 'SECRETARIA';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  cargo: string;
}

export type TipoProcesso = 'NOVA_MATRICULA' | 'REMATRICULA' | 'CLASSIFICACAO_PENDENTE';

export type EstadoProcesso = 'PENDENTE' | 'AGUARDANDO_APROVACAO' | 'APROVADO';

export type SituacaoAluno = 'ativo' | 'inativo' | 'aguardando_validacao';

export type MotivoSaida = 'transferencia' | 'desistencia' | 'cancelamento' | 'nao_informado';

export type Aplicabilidade = 'obrigatorio' | 'nao_se_aplica' | 'a_confirmar';

export interface HistoricoMarcaItem {
  valor: boolean;
  alteradoPorNome: string;
  alteradoPorId: string;
  alteradoEm: string;
}

export interface ChecklistItem {
  id: string;
  numero: number;
  rotulo: string;
  concluido: boolean;
  aplicabilidade: Aplicabilidade;
  marcadoPorNome?: string;
  marcadoPorId?: string;
  marcadoEm?: string; // ISO string
  historico: HistoricoMarcaItem[];
}

export interface HistoricoAprovacao {
  acao: 'aprovado' | 'revogado';
  atorNome: string;
  atorId: string;
  dataHora: string;
  motivo?: string;
}

export interface EventoHistorico {
  id: string;
  dataHora: string;
  tipo: 'MARCACAO' | 'APROVACAO' | 'REVOGACAO' | 'SINCRONIZACAO' | 'CADASTRAL' | 'APLICABILIDADE';
  descricao: string;
  autorNome: string;
  autorId: string;
}

export interface Aluno {
  id: string; // ID interno da aplicação
  externalId?: string; // Identificador oficial na origem (Sponte)
  matricula: string; // Preserva zeros à esquerda (ex: "0042")
  nome: string;
  curso: string;
  turma?: string;
  situacao: SituacaoAluno;
  motivoSaida?: MotivoSaida;
  dataCadastroSponte?: string; // Formato YYYY-MM-DD
  dataInclusaoApp: string; // ISO string
  anoLetivo: number; // 2027
  jaEstudouOutraInstituicao?: 'sim' | 'nao' | 'a_confirmar';
  validadoSponte: boolean;
}

export interface ProcessoMatricula {
  id: string;
  alunoId: string;
  anoLetivo: number;
  tipo: TipoProcesso;
  estado: EstadoProcesso;
  itens: ChecklistItem[];
  aprovadoPorNome?: string;
  aprovadoPorId?: string;
  aprovadoEm?: string;
  historicoAprovacoes: HistoricoAprovacao[];
  eventos: EventoHistorico[];
  versoesAnteriores?: (Omit<ProcessoMatricula, 'versoesAnteriores'> & { arquivadoEm: string })[];
}

export interface SincronizacaoResultado {
  id: string;
  dataExecucao: string;
  sucesso: boolean;
  mensagem: string;
  novosAlunos: number;
  atualizados: number;
  arquivados: number;
  reativados: number;
  inativosIgnorados: number;
  excluidosIgnorados: number;
  erros: string[];
}

export interface SponteAlunoMock {
  matricula: string;
  nome: string;
  curso: string;
  turma?: string;
  situacao: 'ativo' | 'inativo';
  motivoSaida?: MotivoSaida;
  dataCadastro: string; // YYYY-MM-DD ou data com timezone
}

export interface MetricasOperacionais {
  totalAcompanhado: number;
  novasMatriculas: number;
  rematriculas: number;
  aprovados: number;
  aguardandoAprovacao: number;
  pendentes: number;
  aguardandoConferencia: number;
  entregasMaterialMochilaChinook: number;
  aguardandoValidacaoSponte: number;
  saidasHistorico: {
    total: number;
    transferencia: number;
    desistencia: number;
    cancelamento: number;
    naoInformado: number;
  };
  totalEtapasPendentes: number;
}
