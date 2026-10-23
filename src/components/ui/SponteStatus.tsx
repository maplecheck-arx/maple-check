'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { getSupabase } from '@/lib/supabase';

export function SponteStatus() {
  const { sponte, atualizarDados, salvando } = useApp();
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const updated = sponte?.ultimaSyncSucesso ? new Date(sponte.ultimaSyncSucesso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : null;
  const label = sponte?.status === 'erro' ? 'Falha na última sincronização' : sponte?.status === 'em_andamento' ? 'Sincronização em andamento' : updated ? `Atualizado em ${updated}` : 'Aguardando primeira sincronização';
  async function synchronize() {
    if (running) return;
    setRunning(true); setMessage(''); setFailed(false);
    try {
      const { data: { session } } = await getSupabase().auth.getSession();
      if (!session) throw new Error('Entre novamente para sincronizar.');
      const response = await fetch('/api/sponte/sync', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, signal: AbortSignal.timeout(190000) });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) {
        const errors: Record<string, string> = {
          CONFIGURACAO_SERVIDOR: 'Faltam configurações da integração no servidor.',
          ACESSO_SPONTE_23: 'O acesso à API ainda não está habilitado para a escola.',
          ACESSO_SPONTE_24: 'Confira o código de cliente configurado no servidor.',
          ACESSO_SPONTE_25: 'O Sponte recusou o token configurado no servidor.',
          SEM_ALUNOS_ATIVOS_OU_INATIVOS: 'Nenhum aluno do Sponte está com situação Ativo ou Inativo. Nada foi alterado.',
          CONTRATO_AUSENTE_OU_AMBIGUO: 'Há alunos ativos sem um curso definido para importação. É necessária conferência da integração.',
        };
        // Only display allowlisted-format codes, never arbitrary server text.
        const codigo = typeof data?.codigo === 'string' && /^[A-Z0-9_]{1,40}$/.test(data.codigo) ? data.codigo : `HTTP_${response.status}`;
        throw new Error(`${errors[codigo] || 'Não foi possível concluir a sincronização. Os cadastros foram preservados.'} (código: ${codigo})`);
      }
      const reasons: Record<string, string> = { atualizado_hoje: 'Os dados já foram sincronizados hoje.', em_andamento: 'Já existe uma sincronização em andamento.', aguarde_15_minutos: 'Aguarde 15 minutos após a última tentativa.' };
      const puladas = Array.isArray(data.situacoesPuladas) ? (data.situacoesPuladas as { situacao: string; total: number }[]) : [];
      const detalhePuladas = puladas.length ? ` Não importados por situação: ${puladas.map(p => `${p.situacao} (${p.total})`).join(', ')}.` : '';
      setMessage(data.ignorada ? reasons[data.motivo] || 'Sincronização não iniciada.' : `Sincronização concluída: ${data.resumo?.novos ?? 0} novos e ${data.resumo?.atualizados ?? 0} atualizados.${detalhePuladas}`);
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error && error.name === 'Error' ? error.message : 'A conexão foi interrompida. Atualize a lista para conferir o resultado antes de tentar novamente.');
    } finally { setRunning(false); await atualizarDados(); }
  }
  return <>
    <div className="integration-status">
      <span><span className={`status-dot ${sponte?.status === 'erro' ? 'is-error' : updated && sponte?.status !== 'em_andamento' ? 'is-success' : ''}`} aria-hidden="true" /><span><strong>Sponte</strong><span className="sync-label">{label}</span></span></span>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="secondary-button" disabled={salvando || running} onClick={() => void atualizarDados()}>Atualizar lista</button>
        <button type="button" className="secondary-button" disabled={salvando || running || sponte?.status === 'em_andamento'} onClick={() => void synchronize()}>{running ? 'Sincronizando…' : 'Sincronizar Sponte'}</button>
      </div>
    </div>
    {message && <p className={`mb-4 text-sm ${failed ? 'text-red-700' : 'text-slate-600'}`} role={failed ? 'alert' : 'status'}>{message}</p>}
  </>;
}
