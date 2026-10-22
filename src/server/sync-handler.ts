import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';
import { collectStudents, SponteError } from './sponte';

function json(body: object, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
export function validCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 32) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get('authorization') || '');
  return received.length === expected.length && timingSafeEqual(received, expected);
}
export async function syncHandler(request: Request, cron: boolean): Promise<Response> {
  if (cron && !validCron(request)) return json({ error: 'Não autorizado.' }, 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!cron) {
    const authorization = request.headers.get('authorization');
    if (!authorization?.startsWith('Bearer ') || !url || !publicKey) return json({ error: 'Entre na sua conta para continuar.' }, 401);
    const client = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authorization } } });
    const { error } = await client.rpc('secretaria_identidade');
    if (error) return json({ error: 'Acesso institucional não autorizado.' }, 403);
  }
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const token = process.env.SPONTE_API_TOKEN;
  const codigoCliente = process.env.SPONTE_CODIGO_CLIENTE?.trim();
  if (!url || !secretKey?.startsWith('sb_secret_') || !token || !codigoCliente) {
    return json({ error: 'A integração ainda precisa ser configurada no servidor.', codigo: 'CONFIGURACAO_SERVIDOR' }, 503);
  }
  const db = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  let execucao: string | undefined;
  try {
    const { data: claim, error } = await db.rpc('secretaria_sponte', { acao: 'iniciar' });
    if (error) throw new SponteError('BANCO_INTEGRACAO');
    if (!claim?.executar) return json({ sucesso: false, ignorada: true, motivo: claim?.motivo || 'em_andamento' });
    execucao = claim.execucao;
    if (!execucao) throw new SponteError('BANCO_INTEGRACAO');
    const { alunos, situacoesPuladas } = await collectStudents({ token, codigoCliente });
    if (situacoesPuladas.length) console.info('sponte_sync_situacoes_puladas', { execution: execucao, situacoesPuladas });
    const { data, error: saveError } = await db.rpc('secretaria_sponte', { acao: 'concluir', execucao, dados: alunos });
    if (saveError) throw new SponteError('GRAVACAO_INTEGRACAO');
    return json({ ...data, situacoesPuladas });
  } catch (error) {
    const codigo = error instanceof SponteError ? error.code : 'FALHA_INTEGRACAO';
    if (error instanceof SponteError && error.diagnostic) {
      console.error('sponte_sync_diagnostic', { execution: execucao, ...error.diagnostic });
    }
    if (execucao) {
      // Store only an allowlisted diagnostic code, never a response, credential or student.
      try { await db.rpc('secretaria_sponte', { acao: 'falhar', execucao, dados: { codigo } }); } catch { /* Lease expires if the database is unavailable. */ }
    }
    return json({ sucesso: false, error: 'A sincronização não foi concluída. Os cadastros foram preservados.', codigo }, 502);
  }
}
