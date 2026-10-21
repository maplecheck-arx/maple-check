import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Aluno, ProcessoMatricula } from './types';

type Registro = { aluno: Aluno; processo: ProcessoMatricula & { versoesAnteriores?: ProcessoMatricula[] }; versao: number };
const ids = { admin: '10000000-0000-4000-8000-000000000001', normal: '10000000-0000-4000-8000-000000000002', externo: '10000000-0000-4000-8000-000000000003', pendente: '10000000-0000-4000-8000-000000000004' };
let db: PGlite;
async function entrar(perfil: keyof typeof ids) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [ids[perfil]]);
  await db.exec('set role authenticated');
}
async function executar(acao: string, registro?: Registro, dados: object = {}): Promise<Registro> {
  const result = await db.query<{ resultado: Registro }>('select public.secretaria_executar($1,$2,$3,$4::jsonb) as resultado', [acao, registro?.aluno.id ?? null, registro?.versao ?? null, JSON.stringify(dados)]);
  return result.rows[0].resultado;
}
const cadastrar = (dados: object = {}) => executar('cadastrar', undefined, { matricula: '0042', nome: 'Aluno de teste', curso: 'Year 1', dataCadastroSponte: '2026-09-01', ...dados });
async function ativar(registro: Registro) {
  await db.exec('reset role');
  await db.query(`update secretaria.registros set aluno=aluno || '{"situacao":"ativo","validadoSponte":true}'::jsonb where id=$1`, [registro.aluno.id]);
  await entrar('normal');
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, is_anonymous boolean default false, banned_until timestamptz, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
      ('${ids.admin}','isaque.santos@maplebeararaxa.com.br',now(),'{}'),
      ('${ids.normal}','teste@maplebeararaxa.com.br',now(),'{"role":"ADMIN","name":"Teste"}'),
      ('${ids.externo}','externo@example.com',now(),'{}'),
      ('${ids.pendente}','pendente@maplebeararaxa.com.br',null,'{}');
  `);
  await db.exec(readFileSync(resolve('supabase/schema.sql'), 'utf8'));
  await db.exec(readFileSync(resolve('supabase/sponte-sync.sql'), 'utf8'));
}, 60000);
beforeEach(async () => { await db.exec('reset role; truncate secretaria.registros, secretaria.exclusoes; update secretaria.sponte_sync set run_id=null,iniciado_em=null,expira_em=null,ultimo_sucesso=null;'); await entrar('normal'); });
afterAll(async () => { await db?.close(); });

async function sync(acao: string, execucao: string | null = null, dados: unknown = {}) {
  const result = await db.query<{ result: { executar?: boolean; execucao?: string; motivo?: string; sucesso?: boolean; resumo?: Record<string, number> } }>('select public.secretaria_sponte($1,$2,$3::jsonb) as result', [acao, execucao, JSON.stringify(dados)]);
  return result.rows[0].result;
}
async function iniciarSync() {
  await db.exec('reset role; set role service_role');
  const result = await sync('iniciar');
  expect(result.executar).toBe(true);
  return result.execucao!;
}
const oficial = { externalId: '42', matricula: '0042', nome: 'Nome oficial', curso: 'Year 1', turma: 'A', situacao: 'ativo', dataCadastroSponte: '2026-09-01' };
async function liberarProximoDia() {
  await db.exec("reset role; update secretaria.sponte_sync set ultimo_sucesso=now()-interval '1 day',iniciado_em=now()-interval '1 day'; set role service_role;");
}
describe('Sincronização real: transações e isolamento', () => {
  it('nega importação a usuários e anônimos; impede execuções concorrentes e repetição no dia', async () => {
    await expect(sync('iniciar')).rejects.toThrow(/permission denied/);
    await db.exec('reset role; set role anon');
    await expect(sync('iniciar')).rejects.toThrow(/permission denied/);
    const id = await iniciarSync();
    expect((await sync('iniciar')).motivo).toBe('em_andamento');
    await sync('concluir', id, [oficial]);
    expect((await sync('iniciar')).motivo).toBe('atualizado_hoje');
  });
  it('concilia por matrícula, mantém marcações e revoga formulário com revisão antiga', async () => {
    const local = await cadastrar();
    await executar('marcar', local, { itemId: 'nm_reserva', valor: true });
    const id = await iniciarSync();
    await sync('concluir', id, [oficial]);
    await entrar('normal');
    const state = await db.query<{ aluno: Aluno; processo: ProcessoMatricula }>("select r->'aluno' as aluno,r->'processo' as processo from jsonb_array_elements(public.secretaria_estado()->'registros') r");
    expect(state.rows).toHaveLength(1);
    expect(state.rows[0].aluno).toMatchObject({ id: local.aluno.id, nome: 'Nome oficial', validadoSponte: true, externalId: '42' });
    expect(state.rows[0].processo.itens[0].concluido).toBe(true);
    await expect(executar('editar', local, { nome: 'Nome antigo' })).rejects.toThrow(/Outro usuário/);
  });
  it('não altera revisão quando nada mudou; arquiva somente inatividade explícita', async () => {
    await sync('concluir', await iniciarSync(), [oficial, { ...oficial, matricula: '99', externalId: '99', situacao: 'inativo' }]);
    await liberarProximoDia();
    const same = await sync('concluir', await iniciarSync(), [oficial]);
    expect(same.resumo?.atualizados).toBe(0);
    await liberarProximoDia();
    await sync('concluir', await iniciarSync(), [{ ...oficial, situacao: 'inativo', curso: '', turma: '' }]);
    await entrar('normal');
    const state = await db.query<{ a: Aluno }>("select public.secretaria_estado()->'registros'->0->'aluno' as a");
    expect(state.rows[0].a).toMatchObject({ situacao: 'inativo', curso: 'Year 1' });
  });
  it('reverte todo o lote em caso de conflito de identidade', async () => {
    const id = await iniciarSync();
    await expect(sync('concluir', id, [oficial, { ...oficial, externalId: '999' }])).rejects.toThrow(/duplicadas/);
    await db.exec('reset role');
    expect((await db.query<{ total: number }>('select count(*)::int as total from secretaria.registros')).rows[0].total).toBe(0);
  });
  it('não reimporta excluído mesmo quando a origem muda a matrícula', async () => {
    await sync('concluir', await iniciarSync(), [oficial]);
    await entrar('admin');
    const state = await db.query<{ r: Registro }>("select public.secretaria_estado()->'registros'->0 as r");
    await executar('excluir', state.rows[0].r);
    await liberarProximoDia();
    const result = await sync('concluir', await iniciarSync(), [{ ...oficial, matricula: 'NOVA-0042' }]);
    expect(result.resumo?.excluidosIgnorados).toBe(1);
    expect(result.resumo?.novos).toBe(0);
  });
  it('preserva versões do checklist ao corrigir a data e rejeita execução vencida', async () => {
    await cadastrar();
    await sync('concluir', await iniciarSync(), [{ ...oficial, dataCadastroSponte: '2026-08-31' }]);
    await entrar('normal');
    const state = await db.query<{ p: ProcessoMatricula }>("select public.secretaria_estado()->'registros'->0->'processo' as p");
    expect(state.rows[0].p.tipo).toBe('REMATRICULA');
    expect(state.rows[0].p.versoesAnteriores).toHaveLength(1);
    await liberarProximoDia();
    const id = await iniciarSync();
    await db.exec("reset role; update secretaria.sponte_sync set expira_em=now()-interval '1 second'; set role service_role");
    await expect(sync('concluir', id, [oficial])).rejects.toThrow(/expirada/);
  });
});

describe('Banco: identidade, permissões e transações', () => {
  it('nega leitura anônima e escrita direta, sem depender da interface', async () => {
    await expect(db.query('select * from secretaria.registros')).rejects.toThrow(/permission denied/);
    await db.exec('reset role; set role anon');
    await expect(db.query('select public.secretaria_estado()')).rejects.toThrow(/permission denied/);
  });
  it('exige e-mail institucional confirmado em cada operação', async () => {
    for (const perfil of ['externo', 'pendente'] as const) {
      await entrar(perfil);
      await expect(db.query('select public.secretaria_estado()')).rejects.toThrow(/institucional confirmado/);
      await expect(cadastrar()).rejects.toThrow(/institucional confirmado/);
    }
  });
  it('ignora a função ADMIN declarada pelo próprio usuário', async () => {
    const r = await cadastrar();
    const profile = await db.query<{ papel: string }>("select public.secretaria_estado()->'user'->>'role' as papel");
    expect(profile.rows[0].papel).toBe('SECRETARIA');
    await expect(executar('excluir', r)).rejects.toThrow(/Somente os administradores/);
    await entrar('admin');
    await executar('excluir', r);
    await expect(cadastrar()).rejects.toThrow(/bloqueada para reimportação/);
  });
  it('preserva zeros da matrícula, impede duplicação e começa sem validação inventada', async () => {
    const r = await cadastrar();
    expect(r.aluno.matricula).toBe('0042');
    expect(r.aluno.situacao).toBe('aguardando_validacao');
    expect(r.aluno.validadoSponte).toBe(false);
    expect(r.processo.tipo).toBe('NOVA_MATRICULA');
    expect(r.processo.itens).toHaveLength(16);
    await expect(cadastrar()).rejects.toThrow(/Já existe/);
    await expect(executar('aprovar', r)).rejects.toThrow(/bloqueada/);
  });
  it('rejeita situação, autoria e aprovação enviadas junto do cadastro', async () => {
    await expect(cadastrar({ validadoSponte: true })).rejects.toThrow(/Campo não permitido/);
    const r = await cadastrar();
    await expect(executar('editar', r, { situacao: 'ativo' })).rejects.toThrow(/Campo não permitido/);
  });
  it('usa a revisão da ficha para evitar sobrescrever o trabalho de outra pessoa', async () => {
    const r = await cadastrar();
    const atualizado = await executar('marcar', r, { itemId: 'nm_reserva', valor: true });
    expect(atualizado.versao).toBe(r.versao + 1);
    await expect(executar('editar', r, { nome: 'Nome desatualizado' })).rejects.toThrow(/Outro usuário alterou/);
    const estado = await db.query<{ nome: string }>("select public.secretaria_estado()->'registros'->0->'aluno'->>'nome' as nome");
    expect(estado.rows[0].nome).toBe('Aluno de teste');
  });
  it('permite aprovação pela secretaria e revoga atomicamente ao desmarcar', async () => {
    let r = await cadastrar();
    await ativar(r);
    for (const item of r.processo.itens) r = await executar('marcar', r, { itemId: item.id, valor: true });
    expect(r.processo.estado).toBe('AGUARDANDO_APROVACAO');
    r = await executar('aprovar', r);
    expect(r.processo.estado).toBe('APROVADO');
    expect(r.processo.aprovadoPorId).toBe(ids.normal);
    r = await executar('marcar', r, { itemId: 'nm_material', valor: false });
    expect(r.processo.estado).toBe('PENDENTE');
    expect(r.processo.aprovadoEm).toBeUndefined();
    expect(r.processo.historicoAprovacoes.at(-1)?.acao).toBe('revogado');
    const material = r.processo.itens.find(i => i.id === 'nm_material')!;
    expect(material.historico).toHaveLength(2);
    expect(material.historico[0].alteradoPorId).toBe(ids.normal);
    r = await executar('marcar', r, { itemId: 'nm_material', valor: true });
    expect(r.processo.estado).toBe('AGUARDANDO_APROVACAO');
  });
  it('preserva o checklist anterior na correção da classificação', async () => {
    let r = await cadastrar();
    r = await executar('marcar', r, { itemId: 'nm_reserva', valor: true });
    r = await executar('editar', r, { dataCadastroSponte: '2026-08-31', curso: 'Nursery', jaEstudouOutraInstituicao: 'nao' });
    expect(r.processo.tipo).toBe('REMATRICULA');
    expect(r.processo.itens).toHaveLength(15);
    expect(r.processo.itens.every(i => !i.concluido)).toBe(true);
    expect(r.processo.itens.find(i => i.id === 'rem_laudo_audio')?.aplicabilidade).toBe('nao_se_aplica');
    expect(r.processo.versoesAnteriores?.[0].itens[0].concluido).toBe(true);
  });
  it('não permite concluir etapas dispensadas ou a confirmar', async () => {
    const r = await cadastrar({ dataCadastroSponte: '2026-08-01', curso: 'Curso não mapeado' });
    await expect(executar('marcar', r, { itemId: 'rem_laudo_audio', valor: true })).rejects.toThrow(/não está liberado/);
  });
  it('recusa datas inexistentes e mantém classificação pendente quando ausentes', async () => {
    await expect(cadastrar({ dataCadastroSponte: '2026-02-30' })).rejects.toThrow(/inválida/);
    const r = await cadastrar({ dataCadastroSponte: null });
    expect(r.processo.tipo).toBe('CLASSIFICACAO_PENDENTE');
    expect(r.processo.itens).toHaveLength(0);
  });
  it('mantém alunos inativos somente para consulta', async () => {
    const r = await cadastrar();
    await db.exec('reset role');
    await db.query(`update secretaria.registros set aluno=aluno || '{"situacao":"inativo"}'::jsonb where id=$1`, [r.aluno.id]);
    await entrar('normal');
    await expect(executar('marcar', r, { itemId: 'nm_reserva', valor: true })).rejects.toThrow(/somente para consulta/);
    await expect(executar('aprovar', r)).rejects.toThrow(/somente para consulta/);
  });
});
