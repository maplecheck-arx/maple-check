import { XMLParser, XMLValidator } from 'fast-xml-parser';

// Only the documented school service can receive the credentials. Never follow redirects.
const ENDPOINT = 'https://api.sponteeducacional.net.br/WSAPIEdu.asmx';
const NS = 'http://api.sponteeducacional.net.br/';
const MAX_BYTES = 20 * 1024 * 1024;
type Row = Record<string, unknown>;
type Method = 'GetAlunos4' | 'GetMatriculas' | 'GetSituacoesAlunos';
export type Credentials = { token: string; codigoCliente: string };
export type SponteStudent = {
  externalId: string; matricula: string; nome: string; curso: string; turma: string;
  situacao: 'ativo' | 'inativo'; dataCadastroSponte: string | null;
};
export class SponteError extends Error {
  constructor(public readonly code: string, public readonly diagnostic?: { method: Method; returnCode: string | null; returnFormat: 'numeric' | 'empty' | 'text' | 'structured' }) { super(code); }
}
const text = (v: unknown) => typeof v === 'string' ? v.trim() : '';
const rows = (v: unknown): Row[] => v == null || v === '' ? [] : (Array.isArray(v) ? v : [v]).map(x => {
  if (!x || typeof x !== 'object' || Array.isArray(x)) throw new SponteError('RESPOSTA_INVALIDA');
  return x as Row;
});
const normalize = (v: unknown) => text(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const escapeXml = (s: string) => s.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' }[c]!));

export function soapBody(method: Method, credentials: Credentials): string {
  if (!/^[1-9]\d{0,9}$/.test(credentials.codigoCliente) || Number(credentials.codigoCliente) > 2147483647 || !credentials.token.trim()) throw new SponteError('CONFIGURACAO_SPONTE');
  return `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><${method} xmlns="${NS}"><nCodigoCliente>${credentials.codigoCliente}</nCodigoCliente><sToken>${escapeXml(credentials.token)}</sToken>${method === 'GetSituacoesAlunos' ? '' : '<sParametrosBusca></sParametrosBusca>'}</${method}></soap:Body></soap:Envelope>`;
}

export function parseSoap(xml: string, method: Method): Row[] {
  // No DTD, custom entities or raw response logs: the service may return portal credentials.
  if (Buffer.byteLength(xml) > MAX_BYTES || /<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw new SponteError('XML_INVALIDO');
  const parsed = new XMLParser({ removeNSPrefix: true, parseTagValue: false, ignoreAttributes: true, trimValues: true }).parse(xml);
  const body = parsed?.Envelope?.Body;
  if (!body || body.Fault) throw new SponteError('FALHA_SOAP');
  const result = body[`${method}Response`]?.[`${method}Result`];
  if (result === undefined) throw new SponteError('RESPOSTA_INVALIDA');
  const tag = { GetAlunos4: 'wsAluno', GetMatriculas: 'wsMatricula', GetSituacoesAlunos: 'wsSituacoesAlunos' }[method];
  if (result !== '' && (!result || typeof result !== 'object' || !(tag in result))) throw new SponteError('RESPOSTA_INVALIDA');
  const entries = rows(result?.[tag]);
  if (entries.length === 1 && /^0*43(?:\D|$)/.test(text(entries[0].RetornoOperacao))) return [];
  for (const entry of entries) {
    // The manual enumerates 1 (success) and 200 (OK). Never forward remote messages.
    const code = text(entry.RetornoOperacao).match(/^(\d+)(?:\D|$)/)?.[1]?.replace(/^0+(?=\d)/, '');
    if (code !== '1' && code !== '200') throw new SponteError(code && ['23', '24', '25'].includes(code) ? `ACESSO_SPONTE_${code}` : 'RETORNO_SPONTE_INVALIDO', {
      method,
      // Only bounded numeric status codes are diagnostic data; never retain remote prose.
      returnCode: code && /^\d{1,3}$/.test(code) ? code : null,
      returnFormat: code ? 'numeric' : entry.RetornoOperacao != null && typeof entry.RetornoOperacao !== 'string' ? 'structured' : text(entry.RetornoOperacao) ? 'text' : 'empty',
    });
  }
  return entries;
}

export async function querySponte(method: Method, credentials: Credentials, fetcher: typeof fetch = fetch): Promise<Row[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000);
  try {
    const response = await fetcher(ENDPOINT, {
      method: 'POST', redirect: 'error', cache: 'no-store', signal: controller.signal,
      headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: `"${NS}${method}"` },
      body: soapBody(method, credentials),
    });
    if (!response.ok || !response.body) throw new SponteError('HTTP_SPONTE');
    if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new SponteError('RESPOSTA_MUITO_GRANDE');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) { await reader.cancel(); throw new SponteError('RESPOSTA_MUITO_GRANDE'); }
      chunks.push(value);
    }
    return parseSoap(Buffer.concat(chunks).toString('utf8'), method);
  } catch (error) {
    if (error instanceof SponteError) throw error;
    throw new SponteError('CONEXAO_SPONTE');
  } finally { clearTimeout(timer); }
}

export function civilDate(value: unknown): string | null {
  const v = text(value);
  if (!v) return null;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : v;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new SponteError('DATA_SPONTE_INVALIDA');
  const date = new Date(`${iso}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso || iso < '1900-01-01' || iso > '2100-12-31') throw new SponteError('DATA_SPONTE_INVALIDA');
  return iso;
}

export function normalizeStudents(students: Row[], contracts: Row[], catalog: Row[], today: string): SponteStudent[] {
  if (!students.length) throw new SponteError('LISTA_ALUNOS_VAZIA');
  const statuses = catalog.flatMap(x => rows((x.SituacoesAlunos as Row | undefined)?.SituacoesAlunos));
  const active = statuses.filter(x => text(x.SituacaoAlunoID) === '-1').map(x => normalize(x.Nome));
  const inactive = statuses.filter(x => text(x.SituacaoAlunoID) === '-2').map(x => normalize(x.Nome));
  if (active.length !== 1 || inactive.length !== 1 || !active[0] || !inactive[0] || active[0] === inactive[0]) throw new SponteError('CATALOGO_SITUACOES_INVALIDO');
  const seenIds = new Set<string>();
  const seenMatriculas = new Set<string>();
  const byStudent = new Map<string, Row[]>();
  for (const contract of contracts) {
    const id = text(contract.AlunoID);
    byStudent.set(id, [...(byStudent.get(id) || []), contract]);
  }
  return students.map(student => {
    const id = text(student.AlunoID), matricula = text(student.NumeroMatricula), nome = text(student.Nome);
    if (!/^[1-9]\d*$/.test(id) || !matricula || matricula.length > 50 || nome.length < 2 || nome.length > 200 || seenIds.has(id) || seenMatriculas.has(matricula)) throw new SponteError('IDENTIDADE_SPONTE_INVALIDA');
    seenIds.add(id); seenMatriculas.add(matricula);
    const status = normalize(student.Situacao);
    if (status !== active[0] && status !== inactive[0]) throw new SponteError('SITUACAO_NAO_MAPEADA');
    const situacao = status === active[0] ? 'ativo' : 'inativo';
    // Prefer a valid contract covering 2027, then a currently valid contract.
    // A closed historical contract must not deactivate an active student.
    const candidates = (byStudent.get(id) || []).filter(c => ['1', '6'].includes(text(c.SituacaoID))).map(c => ({
      c, start: civilDate(c.DataInicio), end: civilDate(c.DataTermino),
    })).filter(c => c.start && c.end && c.start <= c.end).map(c => ({ ...c,
      rank: c.start! <= '2027-12-31' && c.end! >= '2027-01-01' ? 2 : c.start! <= today && c.end! >= today ? 1 : 0,
    })).filter(c => c.rank > 0).sort((a, b) => b.rank - a.rank || b.start!.localeCompare(a.start!));
    const best = candidates[0];
    const ties = candidates.filter(c => best && c.rank === best.rank && c.start === best.start);
    if (situacao === 'ativo' && (!best || ties.some(c => text(c.c.NomeCurso) !== text(best.c.NomeCurso) || text(c.c.NomeTurma) !== text(best.c.NomeTurma)))) throw new SponteError('CONTRATO_AUSENTE_OU_AMBIGUO');
    const curso = text(best?.c.NomeCurso), turma = text(best?.c.NomeTurma);
    if ((situacao === 'ativo' && !curso) || curso.length > 100 || turma.length > 100) throw new SponteError('CURSO_SPONTE_INVALIDO');
    // Explicit allowlist: no CPF, passwords, contact details or raw XML leave this adapter.
    return { externalId: id, matricula, nome, curso, turma, situacao, dataCadastroSponte: civilDate(student.DataCadastro) };
  });
}

export async function collectStudents(credentials: Credentials): Promise<SponteStudent[]> {
  const catalog = await querySponte('GetSituacoesAlunos', credentials);
  const students = await querySponte('GetAlunos4', credentials);
  const contracts = await querySponte('GetMatriculas', credentials);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  return normalizeStudents(students, contracts, catalog, today);
}
