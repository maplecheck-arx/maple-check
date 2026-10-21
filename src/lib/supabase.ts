import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('O acesso ao banco ainda não foi configurado. Informe a URL e a chave publicável do projeto.');
  if (!client) client = createClient(url, key);
  return client;
}
export function mensagemErro(error: unknown): string {
  const e = error as { message?: string; code?: string };
  if (e?.code === 'PGRST202' || e?.message?.includes('secretaria_estado')) return 'O projeto foi conectado, mas a estrutura do banco ainda precisa ser instalada.';
  if (e?.message?.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (e?.message?.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.';
  if (/fetch|network|timeout/i.test(e?.message || '')) return 'Não foi possível conectar. Verifique a internet e tente novamente.';
  if (/rate limit/i.test(e?.message || '')) return 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.';
  return e?.message || 'Não foi possível concluir. Tente novamente.';
}
