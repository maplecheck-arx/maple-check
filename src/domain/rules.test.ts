import { describe, it, expect } from 'vitest';
import {
  classificarTipoMatricula,
  extrairDataCivilSaoPaulo,
  verificarAplicabilidadeCurso,
  calcularAplicabilidadeItem,
  calcularEstadoEProgresso,
  marcarItemChecklist,
  aprovarProcesso,
  inicializarProcessoAluno,
  atualizarDataCadastroAluno,
} from './rules';
import { Aluno, User } from './types';
import { MOCK_USERS } from '../test-fixtures/users';
import { executarSincronizacaoSimulada } from '../test-fixtures/sponte-sync';

const adminUser = MOCK_USERS[0]; // Marina Costa (ADMIN)
const secUser = MOCK_USERS[3]; // Juliana Silva (SECRETARIA)

describe('Regras de Classificação por Data para 2027', () => {
  it('classifica cadastro em 01/09/2026 como NOVA_MATRICULA (inclusive)', () => {
    expect(classificarTipoMatricula('2026-09-01')).toBe('NOVA_MATRICULA');
    expect(classificarTipoMatricula('01/09/2026')).toBe('NOVA_MATRICULA');
    expect(classificarTipoMatricula('2026-10-15')).toBe('NOVA_MATRICULA');
  });

  it('classifica cadastro em 31/08/2026 como REMATRICULA', () => {
    expect(classificarTipoMatricula('2026-08-31')).toBe('REMATRICULA');
    expect(classificarTipoMatricula('31/08/2026')).toBe('REMATRICULA');
    expect(classificarTipoMatricula('2026-01-10')).toBe('REMATRICULA');
  });

  it('retorna CLASSIFICACAO_PENDENTE se data for ausente ou inválida', () => {
    expect(classificarTipoMatricula('')).toBe('CLASSIFICACAO_PENDENTE');
    expect(classificarTipoMatricula(undefined)).toBe('CLASSIFICACAO_PENDENTE');
    expect(classificarTipoMatricula('data-invalida')).toBe('CLASSIFICACAO_PENDENTE');
  });

  it('mantém interpretação fuso America/Sao_Paulo sem converter dia indevidamente', () => {
    const dataExtraida = extrairDataCivilSaoPaulo('2026-09-01');
    expect(dataExtraida).toBe('2026-09-01');
  });
});

describe('Regras de Aplicabilidade de Laudos e Transferência', () => {
  it('dispensa laudos (nao_se_aplica) para Toddler e Nursery', () => {
    expect(verificarAplicabilidadeCurso('Toddler')).toBe('nao_se_aplica');
    expect(verificarAplicabilidadeCurso('Nursery')).toBe('nao_se_aplica');
  });

  it('exige laudos (obrigatorio) a partir do JK (Junior Kindergarten, SK, Year 1 em diante)', () => {
    expect(verificarAplicabilidadeCurso('Junior Kindergarten')).toBe('obrigatorio');
    expect(verificarAplicabilidadeCurso('Senior Kindergarten')).toBe('obrigatorio');
    expect(verificarAplicabilidadeCurso('Year 1')).toBe('obrigatorio');
    expect(verificarAplicabilidadeCurso('Year 5')).toBe('obrigatorio');
  });

  it('marca curso desconhecido como a_confirmar', () => {
    expect(verificarAplicabilidadeCurso('Robótica Avançada')).toBe('a_confirmar');
    expect(verificarAplicabilidadeCurso('')).toBe('a_confirmar');
  });

  it('declaração de transferência respeita a confirmação estruturada do aluno', () => {
    const alunoSim: Aluno = {
      id: 'a1',
      matricula: '001',
      nome: 'Aluno Teste',
      curso: 'Year 1',
      situacao: 'ativo',
      dataInclusaoApp: '',
      anoLetivo: 2027,
      validadoSponte: true,
      jaEstudouOutraInstituicao: 'sim',
    };
    expect(calcularAplicabilidadeItem('rem_declaracao_transf', alunoSim)).toBe('obrigatorio');

    const alunoNao = { ...alunoSim, jaEstudouOutraInstituicao: 'nao' as const };
    expect(calcularAplicabilidadeItem('rem_declaracao_transf', alunoNao)).toBe('nao_se_aplica');

    const alunoPendente = { ...alunoSim, jaEstudouOutraInstituicao: 'a_confirmar' as const };
    expect(calcularAplicabilidadeItem('rem_declaracao_transf', alunoPendente)).toBe('a_confirmar');
  });
});

describe('Estados do Processo, Marcação e Aprovação', () => {
  it('inicializa processo de nova matrícula com 16 itens obrigatórios em estado PENDENTE', () => {
    const aluno: Aluno = {
      id: 'a_nova',
      matricula: '0042',
      nome: 'Aluno Novo',
      curso: 'Year 1',
      situacao: 'ativo',
      dataCadastroSponte: '2026-09-05',
      dataInclusaoApp: '',
      anoLetivo: 2027,
      validadoSponte: true,
    };
    const proc = inicializarProcessoAluno(aluno);
    expect(proc.tipo).toBe('NOVA_MATRICULA');
    expect(proc.itens.length).toBe(16);
    expect(proc.estado).toBe('PENDENTE');
  });

  it('ao marcar todos os itens obrigatórios, o processo fica AGUARDANDO_APROVACAO (não aprovado automaticamente)', () => {
    const aluno: Aluno = {
      id: 'a_nova',
      matricula: '0042',
      nome: 'Aluno Novo',
      curso: 'Year 1',
      situacao: 'ativo',
      dataCadastroSponte: '2026-09-05',
      dataInclusaoApp: '',
      anoLetivo: 2027,
      validadoSponte: true,
    };
    let proc = inicializarProcessoAluno(aluno);

    // Marca todos os 16 itens
    for (const item of proc.itens) {
      const res = marcarItemChecklist(proc, aluno, item.id, true, secUser);
      proc = res.processo;
    }

    expect(proc.estado).toBe('AGUARDANDO_APROVACAO');
    expect(proc.aprovadoEm).toBeUndefined();
  });

  it('permite aprovação explícita e registra o aprovador e timestamp', () => {
    const aluno: Aluno = {
      id: 'a_nova',
      matricula: '0042',
      nome: 'Aluno Novo',
      curso: 'Year 1',
      situacao: 'ativo',
      dataCadastroSponte: '2026-09-05',
      dataInclusaoApp: '',
      anoLetivo: 2027,
      validadoSponte: true,
    };
    let proc = inicializarProcessoAluno(aluno);
    for (const item of proc.itens) {
      proc = marcarItemChecklist(proc, aluno, item.id, true, secUser).processo;
    }

    const resAprov = aprovarProcesso(proc, aluno, secUser);
    expect(resAprov.erro).toBeUndefined();
    expect(resAprov.processo.estado).toBe('APROVADO');
    expect(resAprov.processo.aprovadoPorNome).toBe(secUser.name);
    expect(resAprov.processo.aprovadoEm).toBeDefined();
  });

  it('bloqueia aprovação se houver item obrigatório pendente ou aplicabilidade a confirmar', () => {
    const aluno: Aluno = {
      id: 'a_rem',
      matricula: '0088',
      nome: 'Aluno Rem',
      curso: 'Robótica Desconhecida', // Causa aplicabilidade a_confirmar nos laudos
      situacao: 'ativo',
      dataCadastroSponte: '2026-05-10',
      dataInclusaoApp: '',
      anoLetivo: 2027,
      validadoSponte: true,
    };
    const proc = inicializarProcessoAluno(aluno);
    const resAprov = aprovarProcesso(proc, aluno, adminUser);
    expect(resAprov.erro).toBeDefined();
    expect(resAprov.processo.estado).toBe('PENDENTE');
  });

  it('desmarcar uma etapa necessária após aprovação revoga a aprovação e devolve para PENDENTE', () => {
    const aluno: Aluno = {
      id: 'a_nova',
      matricula: '0042',
      nome: 'Aluno Novo',
      curso: 'Year 1',
      situacao: 'ativo',
      dataCadastroSponte: '2026-09-05',
      dataInclusaoApp: '',
      anoLetivo: 2027,
      validadoSponte: true,
    };
    let proc = inicializarProcessoAluno(aluno);
    for (const item of proc.itens) {
      proc = marcarItemChecklist(proc, aluno, item.id, true, secUser).processo;
    }
    proc = aprovarProcesso(proc, aluno, adminUser).processo;
    expect(proc.estado).toBe('APROVADO');

    // Desmarca um item obrigatório
    const resDesmarca = marcarItemChecklist(proc, aluno, 'nm_contrato', false, secUser);
    proc = resDesmarca.processo;

    expect(proc.estado).toBe('PENDENTE');
    expect(proc.aprovadoEm).toBeUndefined();
    expect(proc.historicoAprovacoes.some(h => h.acao === 'revogado')).toBe(true);

    // Remarca o item: NÃO restaura aprovação automaticamente! Fica em AGUARDANDO_APROVACAO
    const resRemarca = marcarItemChecklist(proc, aluno, 'nm_contrato', true, secUser);
    proc = resRemarca.processo;
    expect(proc.estado).toBe('AGUARDANDO_APROVACAO');
  });
});

describe('Sincronização Simulada e Casos Críticos', () => {
  it('concilia cadastro manual pela matrícula e preserva marcações preenchidas', () => {
    const alunoManual: Aluno = {
      id: 'aluno_man_1',
      matricula: '0992',
      nome: 'Lorena Martins Errado',
      curso: 'Year 1',
      situacao: 'aguardando_validacao',
      dataCadastroSponte: '2026-10-01',
      dataInclusaoApp: '',
      anoLetivo: 2027,
      validadoSponte: false,
    };
    let proc = inicializarProcessoAluno(alunoManual);
    // Marca 3 itens
    proc = marcarItemChecklist(proc, alunoManual, 'nm_reserva', true, secUser).processo;
    proc = marcarItemChecklist(proc, alunoManual, 'nm_sponte', true, secUser).processo;

    const resSync = executarSincronizacaoSimulada({
      cenario: 'conciliar_manual',
      alunosAtuais: [alunoManual],
      processosAtuais: [proc],
      exclusoesMatricula: [],
      usuarioExecutou: adminUser,
    });

    const alunoConciliado = resSync.alunos.find(a => a.matricula === '0992')!;
    expect(alunoConciliado.nome).toBe('Lorena Martins da Costa'); // Nome atualizado pela origem
    expect(alunoConciliado.situacao).toBe('ativo');
    expect(alunoConciliado.validadoSponte).toBe(true);

    const procConciliado = resSync.processos.find(p => p.alunoId === alunoManual.id)!;
    expect(procConciliado.itens.find(i => i.id === 'nm_reserva')?.concluido).toBe(true);
    expect(procConciliado.itens.find(i => i.id === 'nm_sponte')?.concluido).toBe(true);
  });

  it('ignora inativo novo na origem', () => {
    const resSync = executarSincronizacaoSimulada({
      cenario: 'ignorar_inativo_novo',
      alunosAtuais: [],
      processosAtuais: [],
      exclusoesMatricula: [],
      usuarioExecutou: adminUser,
    });
    expect(resSync.resultado.novosAlunos).toBe(0);
    expect(resSync.resultado.inativosIgnorados).toBe(1);
    expect(resSync.alunos.length).toBe(0);
  });

  it('inativa aluno existente, arquiva e preserva checklist histórico', () => {
    const alunoAtivo: Aluno = {
      id: 'a_thiago',
      matricula: '0606',
      nome: 'Thiago Carvalho',
      curso: 'Year 3',
      situacao: 'ativo',
      dataCadastroSponte: '2026-09-18',
      dataInclusaoApp: '',
      anoLetivo: 2027,
      validadoSponte: true,
    };
    const proc = inicializarProcessoAluno(alunoAtivo);

    const resSync = executarSincronizacaoSimulada({
      cenario: 'inativar_existente',
      alunosAtuais: [alunoAtivo],
      processosAtuais: [proc],
      exclusoesMatricula: [],
      usuarioExecutou: adminUser,
    });

    const alunoInativado = resSync.alunos.find(a => a.matricula === '0606')!;
    expect(alunoInativado.situacao).toBe('inativo');
    expect(alunoInativado.motivoSaida).toBe('transferencia');
    expect(resSync.resultado.arquivados).toBe(1);
  });

  it('reativação de aluno arquivado preserva marcações mas exige nova aprovação', () => {
    const alunoInativo: Aluno = {
      id: 'a_mariana',
      matricula: '0077',
      nome: 'Mariana Cordeiro',
      curso: 'Year 1',
      situacao: 'inativo',
      dataCadastroSponte: '2026-08-14',
      dataInclusaoApp: '',
      anoLetivo: 2027,
      validadoSponte: true,
    };
    let proc = inicializarProcessoAluno(alunoInativo);
    proc.aprovadoEm = '2026-08-20T10:00:00.000Z';
    proc.aprovadoPorNome = 'Admin Anterior';

    const resSync = executarSincronizacaoSimulada({
      cenario: 'reativar_existente',
      alunosAtuais: [alunoInativo],
      processosAtuais: [proc],
      exclusoesMatricula: [],
      usuarioExecutou: adminUser,
    });

    const alunoReativado = resSync.alunos.find(a => a.matricula === '0077')!;
    expect(alunoReativado.situacao).toBe('ativo');
    expect(resSync.resultado.reativados).toBe(1);

    const procReativado = resSync.processos.find(p => p.alunoId === alunoInativo.id)!;
    expect(procReativado.aprovadoEm).toBeUndefined(); // Exige nova aprovação explícita
  });

  it('retificação de data que cruza corte troca tipo e checklist sem migrar marcações indevidas', () => {
    const aluno: Aluno = {
      id: 'a_luiza',
      matricula: '0607',
      nome: 'Luiza Pires',
      curso: 'Senior Kindergarten',
      situacao: 'ativo',
      dataCadastroSponte: '2026-08-30', // Rematrícula
      dataInclusaoApp: '',
      anoLetivo: 2027,
      validadoSponte: true,
    };
    let proc = inicializarProcessoAluno(aluno);
    expect(proc.tipo).toBe('REMATRICULA');
    expect(proc.itens.length).toBe(15);
    // Marca item 1 de rematrícula
    proc = marcarItemChecklist(proc, aluno, 'rem_saida', true, secUser).processo;

    // Retifica para 02/09/2026 (Nova Matrícula)
    const resData = atualizarDataCadastroAluno(aluno, proc, '2026-09-02', adminUser);
    expect(resData.processo.tipo).toBe('NOVA_MATRICULA');
    expect(resData.processo.itens.length).toBe(16);
    // Nenhum item deve vir marcado por coincidência de índice
    expect(resData.processo.itens.every(i => !i.concluido)).toBe(true);
  });

  it('aluno excluído definitivamente no app é ignorado na sincronização simulada', () => {
    const resSync = executarSincronizacaoSimulada({
      cenario: 'bloquear_excluido',
      alunosAtuais: [],
      processosAtuais: [],
      exclusoesMatricula: ['0999_EXCLUIDO_TESTE'],
      usuarioExecutou: adminUser,
    });
    expect(resSync.resultado.novosAlunos).toBe(0);
    expect(resSync.resultado.excluidosIgnorados).toBe(1);
  });
});
