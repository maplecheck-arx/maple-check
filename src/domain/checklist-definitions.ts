import { ChecklistItem, TipoProcesso } from './types';

export const CHECKLIST_NOVA_MATRICULA_DEF: Omit<ChecklistItem, 'marcadoPorNome' | 'marcadoPorId' | 'marcadoEm' | 'historico'>[] = [
  { id: 'nm_reserva', numero: 1, rotulo: 'Ficha de reserva.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'nm_sponte', numero: 2, rotulo: 'Cadastro Sponte.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'nm_lex', numero: 3, rotulo: 'Cadastro Lex.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'nm_financeiro', numero: 4, rotulo: 'Plano financeiro.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'nm_contrato', numero: 5, rotulo: 'Assinatura digital do contrato.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'nm_imagem', numero: 6, rotulo: 'Assinatura digital do uso de imagem.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'nm_requisicao', numero: 7, rotulo: 'Assinatura digital da requisição de matrícula.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'nm_guia_pais', numero: 8, rotulo: 'Assinatura digital do guia dos pais.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'nm_link_slm', numero: 9, rotulo: 'Enviar link Lex para compra de SLM.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'nm_tellme', numero: 10, rotulo: 'Enviar link TellMe.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'nm_whatsapp', numero: 11, rotulo: 'Incluir na lista de WhatsApp da turma.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'nm_solic_financ', numero: 12, rotulo: 'Enviar solicitação para o financeiro.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'nm_coord', numero: 13, rotulo: 'Notificação à coordenação.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'nm_sec_acad', numero: 14, rotulo: 'Envio de documentos para a Secretaria Acadêmica.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'nm_crm', numero: 15, rotulo: 'Atualizar CRM.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'nm_material', numero: 16, rotulo: 'Entregar mochila e chinook.', concluido: false, aplicabilidade: 'obrigatorio' },
];

export const CHECKLIST_REMATRICULA_DEF: Omit<ChecklistItem, 'marcadoPorNome' | 'marcadoPorId' | 'marcadoEm' | 'historico'>[] = [
  { id: 'rem_saida', numero: 1, rotulo: 'Ficha de autorização de saída do aluno.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'rem_matricula', numero: 2, rotulo: 'Ficha de matrícula.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'rem_contrato', numero: 3, rotulo: 'Contrato de prestação de serviços.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'rem_imagem', numero: 4, rotulo: 'Autorização de uso de imagem.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'rem_reserva', numero: 5, rotulo: 'Solicitação de reserva de vaga.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'rem_rg_cpf_aluno', numero: 6, rotulo: 'Cópia do RG e CPF.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'rem_certidao', numero: 7, rotulo: 'Cópia da certidão de nascimento do aluno.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'rem_vacinacao', numero: 8, rotulo: 'Cópia da carteira de vacinação atualizada.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'rem_anamnese', numero: 9, rotulo: 'Ficha de anamnese do aluno.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'rem_laudo_oftalmo', numero: 10, rotulo: 'Laudo oftalmológico — para turmas a partir do JK.', concluido: false, aplicabilidade: 'a_confirmar' },
  { id: 'rem_laudo_audio', numero: 11, rotulo: 'Laudo de audiometria — para turmas a partir do JK.', concluido: false, aplicabilidade: 'a_confirmar' },
  { id: 'rem_residencia', numero: 12, rotulo: 'Comprovante de endereço, água ou luz — últimos 60 dias.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'rem_declaracao_transf', numero: 13, rotulo: 'Declaração de transferência — quando o aluno já tiver estudado em outra instituição.', concluido: false, aplicabilidade: 'a_confirmar' },
  { id: 'rem_rg_cpf_resp', numero: 14, rotulo: 'Cópia do RG e CPF dos responsáveis.', concluido: false, aplicabilidade: 'obrigatorio' },
  { id: 'rem_recebimento_guia', numero: 15, rotulo: 'Declaração de recebimento do Guia dos Pais.', concluido: false, aplicabilidade: 'obrigatorio' },
];

export function criarItensChecklist(tipo: TipoProcesso): ChecklistItem[] {
  if (tipo === 'NOVA_MATRICULA') {
    return CHECKLIST_NOVA_MATRICULA_DEF.map(item => ({
      ...item,
      concluido: false,
      historico: [],
    }));
  }
  if (tipo === 'REMATRICULA') {
    return CHECKLIST_REMATRICULA_DEF.map(item => ({
      ...item,
      concluido: false,
      historico: [],
    }));
  }
  return [];
}
