'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '../context/AppContext';
import { Header, ActiveTab } from '../components/ui/Header';
import { StudentTable } from '../components/students/StudentTable';
import { LoadingView } from '../components/ui/LoadingView';
import { SponteStatus } from '../components/ui/SponteStatus';
import { calcularMetricasOperacionais } from '../services/metrics';
import { Users, CheckCircle2, Clock3, AlertCircle, Plus, ArrowUpRight } from 'lucide-react';

const LoginView = dynamic(() => import('../components/auth/LoginView').then(m => m.LoginView), { loading: () => <LoadingView label="Abrindo o acesso…" fullScreen /> });
const StudentFichaModal = dynamic(() => import('../components/students/StudentFichaModal').then(m => m.StudentFichaModal), { loading: () => <div className="loading-overlay"><LoadingView label="Abrindo a ficha…" /></div> });
const StudentNewModal = dynamic(() => import('../components/students/StudentNewModal').then(m => m.StudentNewModal), { loading: () => <div className="loading-overlay"><LoadingView label="Abrindo o cadastro…" /></div> });
const ReportsView = dynamic(() => import('../components/reports/ReportsView').then(m => m.ReportsView), { loading: () => <LoadingView label="Abrindo os relatórios…" /> });

const pageInfo: Record<ActiveTab, { title: string; description: string }> = {
  operacional: { title: 'Matrículas', description: 'Acompanhe os alunos e o que falta para concluir cada processo.' },
  provisorios: { title: 'Aguardando validação', description: 'Cadastros manuais que aguardam confirmação dos dados no Sponte.' },
  inativos: { title: 'Alunos arquivados', description: 'Consulte o histórico dos alunos que saíram da escola.' },
  relatorios: { title: 'Relatórios', description: 'Confira os resultados e exporte o acompanhamento da secretaria.' },
};

export default function Home() {
  const { isAuthenticated, recuperandoSenha, alunos, processos, salvando } = useApp();
  const [activeTab, setActiveTab] = useState<ActiveTab>('operacional');
  const [selectedAlunoId, setSelectedAlunoId] = useState<string | null>(null);
  const [showNovoAlunoModal, setShowNovoAlunoModal] = useState(false);
  const metricas = useMemo(() => calcularMetricasOperacionais(alunos, processos), [alunos, processos]);
  const selectedAluno = alunos.find(a => a.id === selectedAlunoId);
  if (!isAuthenticated || recuperandoSenha) return <LoginView />;
  const info = pageInfo[activeTab];
  const metrics = [
    { name: 'Alunos acompanhados', value: metricas.totalAcompanhado, description: `${metricas.novasMatriculas} matrículas · ${metricas.rematriculas} rematrículas`, icon: Users, tone: 'neutral' },
    { name: 'Com pendências', value: metricas.pendentes, description: `${metricas.totalEtapasPendentes} etapas a concluir`, icon: AlertCircle, tone: 'pending' },
    { name: 'Aguardando aprovação', value: metricas.aguardandoAprovacao, description: 'Etapas conferidas pela secretaria', icon: Clock3, tone: 'waiting' },
    { name: 'Processos aprovados', value: metricas.aprovados, description: 'Conferência final concluída', icon: CheckCircle2, tone: 'success' },
  ];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Pular para o conteúdo</a>
      <Header activeTab={activeTab} onTabChange={setActiveTab} onOpenNovoAluno={() => setShowNovoAlunoModal(true)} />
      <div className="workspace">
        <main id="main-content" className="app-content">
          <SponteStatus />
          <div className="page-heading">
            <div><div className="page-eyebrow">Secretaria <span className="text-zinc-300" aria-hidden="true">•</span> Ano letivo 2027</div><h1>{info.title}</h1><p>{info.description}</p></div>
            {(activeTab === 'operacional' || activeTab === 'provisorios') && <button type="button" className="primary-button" onClick={() => setShowNovoAlunoModal(true)}><Plus size={18} />Cadastrar aluno</button>}
          </div>
          {activeTab === 'operacional' && <>
            <section className="overview-grid" aria-label="Resumo das matrículas">{metrics.map(metric => <div className={`overview-metric tone-${metric.tone}`} key={metric.name}><div className="metric-label"><span>{metric.name}</span><metric.icon size={18} aria-hidden="true" /></div><strong className="metric-value">{metric.value}</strong><p>{metric.description}</p></div>)}</section>
            <div className="section-heading"><h2>Alunos em acompanhamento</h2><button type="button" className="text-button" onClick={() => setActiveTab('relatorios')}>Ver relatórios <ArrowUpRight size={15} /></button></div>
            <StudentTable key="ativos" onSelectAluno={a => setSelectedAlunoId(a.id)} modoVisualizacao="ativos_validados" />
          </>}
          {activeTab === 'provisorios' && <><div className="notice"><Clock3 size={18} /><p>Você já pode conferir as etapas. A aprovação será liberada após a validação do cadastro no Sponte.</p></div><StudentTable key="provisorios" onSelectAluno={a => setSelectedAlunoId(a.id)} modoVisualizacao="provisorios" /></>}
          {activeTab === 'inativos' && <><div className="notice"><AlertCircle size={18} /><p>O histórico é preservado para consulta. Estes alunos não entram nas pendências e nos totais de acompanhamento.</p></div><StudentTable key="inativos" onSelectAluno={a => setSelectedAlunoId(a.id)} modoVisualizacao="inativos" /></>}
          {activeTab === 'relatorios' && <ReportsView />}
        </main>
      </div>
      {selectedAluno && <StudentFichaModal aluno={selectedAluno} onClose={() => { if (!salvando) setSelectedAlunoId(null); }} />}
      {showNovoAlunoModal && <StudentNewModal onClose={() => { if (!salvando) setShowNovoAlunoModal(false); }} />}
    </div>
  );
}

