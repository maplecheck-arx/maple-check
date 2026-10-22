import { describe, expect, it, vi, afterEach } from 'vitest';
import { civilDate, normalizeStudents, parseSoap, querySponte, soapBody, SponteError } from './sponte';
import { syncHandler } from './sync-handler';
const credentials = { token: 'teste<&"', codigoCliente: '123' };
const envelope = (content: string) => `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><GetAlunos4Response><GetAlunos4Result>${content}</GetAlunos4Result></GetAlunos4Response></soap:Body></soap:Envelope>`;
const student = { AlunoID: '42', NumeroMatricula: '0042', Nome: 'Aluno teste', Situacao: 'Ativo', DataCadastro: '01/09/2026', CPF: 'NAO_IMPORTAR', SenhaPortal: 'NAO_IMPORTAR' };
const contract = { AlunoID: '42', SituacaoID: '1', DataInicio: '01/01/2027', DataTermino: '31/12/2027', NomeCurso: 'Year 1', NomeTurma: 'Y1-A' };
const catalog = [{ SituacoesAlunos: { SituacoesAlunos: [{ SituacaoAlunoID: '-1', Nome: 'Ativo' }, { SituacaoAlunoID: '-2', Nome: 'Inativo' }] } }];
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('Conector SOAP Sponte', () => {
  it('aceita códigos com zero à esquerda sem alterar identificadores dos alunos', () => {
    const xml = envelope('<wsAluno><RetornoOperacao>01</RetornoOperacao><NumeroMatricula>0042</NumeroMatricula></wsAluno>');
    expect(parseSoap(xml, 'GetAlunos4')[0].NumeroMatricula).toBe('0042');
    expect(parseSoap(xml.replace(/GetAlunos4/g, 'GetSituacoesAlunos').replace(/wsAluno/g, 'wsSituacoesAlunos'), 'GetSituacoesAlunos')).toHaveLength(1);
    expect(parseSoap(envelope('<wsAluno><RetornoOperacao>043 Nenhum registro</RetornoOperacao></wsAluno>'), 'GetAlunos4')).toEqual([]);
    expect(() => parseSoap(envelope('<wsAluno><RetornoOperacao>025 Token inválido</RetornoOperacao></wsAluno>'), 'GetAlunos4')).toThrow('ACESSO_SPONTE_25');
    expect(() => parseSoap(envelope('<wsAluno><RetornoOperacao>00</RetornoOperacao></wsAluno>'), 'GetAlunos4')).toThrow('RETORNO_SPONTE_INVALIDO');
  });
  it('preserva o código e método de rejeição sem registrar texto remoto ou dados pessoais', () => {
    for (const [value, returnCode, returnFormat] of [
      ['21 informe parâmetro segredo', '21', 'numeric'],
      ['segredo pessoal', null, 'text'],
      ['', null, 'empty'],
      ['<string>segredo</string>', null, 'structured'],
      ['123456789 segredo', null, 'numeric'],
    ] as const) {
      try {
        parseSoap(envelope(`<wsAluno><RetornoOperacao>${value}</RetornoOperacao></wsAluno>`), 'GetAlunos4');
        expect.fail('Resposta desconhecida deve ser rejeitada');
      } catch (error) {
        expect(error).toBeInstanceOf(SponteError);
        expect((error as SponteError).diagnostic).toEqual({ method: 'GetAlunos4', returnCode, returnFormat });
        expect(JSON.stringify(error)).not.toContain('segredo');
      }
    }
  });
  it('escapa credenciais e envia filtro documentado para alunos e contratos', () => {
    const body = soapBody('GetAlunos4', credentials);
    expect(body).toContain('teste&lt;&amp;&quot;');
    expect(body).toContain('<sParametrosBusca>DataCadastro=1900/01/01 00:00 e 2100/12/31 23:59</sParametrosBusca>');
    expect(soapBody('GetMatriculas', credentials)).toContain('<sParametrosBusca>DataCadastro=1900/01/01 00:00 e 2100/12/31 23:59</sParametrosBusca>');
    expect(soapBody('GetSituacoesAlunos', credentials)).not.toContain('sParametrosBusca');
    expect(() => soapBody('GetAlunos4', { ...credentials, codigoCliente: '123;456' })).toThrow('CONFIGURACAO');
  });
  it('lê SOAP preservando zeros e rejeita XML incompleto, entidades e faults', () => {
    const parsed = parseSoap(envelope('<wsAluno><RetornoOperacao>1</RetornoOperacao><NumeroMatricula>0042</NumeroMatricula></wsAluno>'), 'GetAlunos4');
    expect(parsed[0].NumeroMatricula).toBe('0042');
    expect(() => parseSoap(envelope('<wsAluno>'), 'GetAlunos4')).toThrow('XML_INVALIDO');
    expect(() => parseSoap('<!DOCTYPE x [<!ENTITY e "secret">]>' + envelope(''), 'GetAlunos4')).toThrow('XML_INVALIDO');
    expect(() => parseSoap('<Envelope><Body><Fault>segredo</Fault></Body></Envelope>', 'GetAlunos4')).toThrow('FALHA_SOAP');
  });
  it('não transforma erro de credencial ou resposta desconhecida em sucesso vazio', () => {
    expect(() => parseSoap(envelope('<wsAluno><RetornoOperacao>25 Token inválido segredo</RetornoOperacao></wsAluno>'), 'GetAlunos4')).toThrow('ACESSO_SPONTE_25');
    expect(() => parseSoap('<Envelope><Body><Erro /></Body></Envelope>', 'GetAlunos4')).toThrow('RESPOSTA_INVALIDA');
    expect(() => normalizeStudents([], [], catalog, '2026-10-21')).toThrow('LISTA_ALUNOS_VAZIA');
  });
  it('envia o token somente ao serviço oficial, sem redirects ou cache', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(envelope('<wsAluno><RetornoOperacao>1</RetornoOperacao></wsAluno>')));
    await querySponte('GetAlunos4', credentials, fetcher);
    expect(fetcher.mock.calls[0][0]).toBe('https://api.sponteeducacional.net.br/WSAPIEdu.asmx');
    expect(fetcher.mock.calls[0][1]).toMatchObject({ redirect: 'error', cache: 'no-store', method: 'POST' });
  });
  it('converte data civil estritamente, sem deslocar o dia nem aceitar datas impossíveis', () => {
    expect(civilDate('01/09/2026')).toBe('2026-09-01');
    expect(civilDate('')).toBeNull();
    expect(() => civilDate('31/02/2026')).toThrow('DATA_SPONTE_INVALIDA');
  });
  it('prioriza contrato de 2027 e descarta dados pessoais não necessários', () => {
    const { alunos: result } = normalizeStudents([student], [{ ...contract, DataInicio: '01/01/2026', DataTermino: '31/12/2026', NomeCurso: 'SK' }, contract], catalog, '2026-10-21');
    expect(result[0]).toEqual({ externalId: '42', matricula: '0042', nome: 'Aluno teste', situacao: 'ativo', curso: 'Year 1', turma: 'Y1-A', dataCadastroSponte: '2026-09-01' });
    expect(JSON.stringify(result)).not.toContain('NAO_IMPORTAR');
  });
  it('não deduz situação do aluno a partir de contrato encerrado', () => {
    expect(normalizeStudents([student], [{ ...contract, SituacaoID: '2' }], catalog, '2026-10-21').alunos[0]).toMatchObject({ situacao: 'ativo', curso: 'Não informado' });
    expect(normalizeStudents([{ ...student, Situacao: 'Inativo' }], [], catalog, '2026-10-21').alunos[0].situacao).toBe('inativo');
  });
  it('pula situações não mapeadas informando só nomes do catálogo, e bloqueia identidades repetidas', () => {
    const fullCatalog = [{ SituacoesAlunos: { SituacoesAlunos: [...catalog[0].SituacoesAlunos.SituacoesAlunos, { SituacaoAlunoID: '5', Nome: 'Trancado' }] } }];
    const lead = { AlunoID: '43', NumeroMatricula: '', Nome: 'Interessado', Situacao: 'trancado' };
    const result = normalizeStudents([student, lead, { ...lead, AlunoID: '44' }, { ...lead, AlunoID: '45', Situacao: 'segredo pessoal' }, { ...lead, AlunoID: '46', Situacao: '' }], [contract], fullCatalog, '2026-10-21');
    expect(result.alunos.map(a => a.externalId)).toEqual(['42']);
    expect(result.situacoesPuladas).toEqual([{ situacao: 'Trancado', total: 2 }, { situacao: 'Fora do catálogo', total: 1 }, { situacao: 'Sem situação', total: 1 }]);
    expect(JSON.stringify(result)).not.toContain('segredo');
    expect(() => normalizeStudents([{ ...student, Situacao: 'Personalizada' }], [contract], catalog, '2026-10-21')).toThrow('SEM_ALUNOS_ATIVOS_OU_INATIVOS');
    expect(() => normalizeStudents([student, student], [contract], catalog, '2026-10-21')).toThrow('IDENTIDADE_SPONTE_INVALIDA');
  });
  it('importa alunos sem contrato elegível ou com contratos ambíguos sem inventar curso', () => {
    for (const contracts of [[], [{ ...contract, DataInicio: 'inválida' }], [contract, { ...contract, NomeCurso: 'Year 2' }]]) {
      expect(normalizeStudents([{ ...student, TurmaAtual: 'Turma oficial' }], contracts, catalog, '2026-10-21').alunos[0]).toMatchObject({
        externalId: '42', situacao: 'ativo', curso: 'Não informado', turma: 'Turma oficial',
      });
    }
  });
  it('nega cron e sincronização sem autenticação antes de qualquer consulta externa', async () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    vi.stubEnv('CRON_SECRET', 'x'.repeat(40));
    expect((await syncHandler(new Request('http://localhost/api/cron/sponte'), true)).status).toBe(401);
    expect((await syncHandler(new Request('http://localhost/api/sponte/sync'), false)).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
