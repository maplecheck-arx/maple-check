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
    create role anon; create role authenticated;
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
}, 60000);
beforeEach(async () => { await db.exec('reset role; truncate secretaria.registros, secretaria.exclusoes;'); await entrar('normal'); });
afterAll(async () => { await db?.close(); });

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
