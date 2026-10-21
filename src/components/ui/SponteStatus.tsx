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
      const data = await response.json();
      if (!response.ok) {
        const errors: Record<string, string> = {
          CONFIGURACAO_SERVIDOR: 'Faltam configurações da integração no servidor.',
          ACESSO_SPONTE_23: 'O acesso à API ainda não está habilitado para a escola.',
          ACESSO_SPONTE_24: 'Confira o código de cliente configurado no servidor.',
          ACESSO_SPONTE_25: 'O Sponte recusou o token configurado no servidor.',
          SITUACAO_NAO_MAPEADA: 'O Sponte retornou uma situação de aluno que precisa ser mapeada.',
          CONTRATO_AUSENTE_OU_AMBIGUO: 'Há alunos ativos sem um curso definido para importação. É necessária conferência da integração.',
        };
        throw new Error(errors[data.codigo] || 'Não foi possível concluir a sincronização. Os cadastros foram preservados.');
      }
      const reasons: Record<string, string> = { atualizado_hoje: 'Os dados já foram sincronizados hoje.', em_andamento: 'Já existe uma sincronização em andamento.', aguarde_15_minutos: 'Aguarde 15 minutos após a última tentativa.' };
      setMessage(data.ignorada ? reasons[data.motivo] || 'Sincronização não iniciada.' : `Sincronização concluída: ${data.resumo?.novos ?? 0} novos e ${data.resumo?.atualizados ?? 0} atualizados.`);
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error && error.name === 'Error' ? error.message : 'A conexão foi interrompida. Atualize a lista para conferir o resultado antes de tentar novamente.');
    } finally { setRunning(false); await atualizarDados(); }
  }
  return <>
    <div className="integration-status">
      <span><span className="status-dot" />Sponte: {label}</span>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="text-button" disabled={salvando || running} onClick={() => void atualizarDados()}>Atualizar lista</button>
        <button type="button" className="text-button" disabled={salvando || running || sponte?.status === 'em_andamento'} onClick={() => void synchronize()}>{running ? 'Sincronizando…' : 'Sincronizar Sponte'}</button>
      </div>
    </div>
    {message && <p className={`mb-4 text-sm ${failed ? 'text-red-700' : 'text-slate-600'}`} role={failed ? 'alert' : 'status'}>{message}</p>}
  </>;
}
