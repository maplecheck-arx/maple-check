'use client';

import { useMemo, useState } from 'react';
import { Aluno } from '../../domain/types';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../ui/StatusBadge';
import { calcularEstadoEProgresso } from '../../domain/rules';
import { Search, X, ArrowUpRight, ChevronLeft, ChevronRight, SearchX } from 'lucide-react';

interface StudentTableProps {
  onSelectAluno: (aluno: Aluno) => void;
  modoVisualizacao?: 'ativos_validados' | 'provisorios' | 'inativos';
}
type TypeFilter = 'TODOS' | 'NOVA_MATRICULA' | 'REMATRICULA';
type StateFilter = 'TODOS' | 'PENDENTE' | 'AGUARDANDO_APROVACAO' | 'APROVADO';
const PAGE_SIZE = 15;
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function Progress({ completed, required }: { completed: number; required: number }) {
  if (!required) return <span className="student-caption">A conferir</span>;
  const percent = Math.round(completed / required * 100);
  return <div className="table-progress"><div className="table-progress-label"><span>{completed} de {required}</span><span>{percent}%</span></div><div className="progress-track" role="progressbar" aria-label="Etapas obrigatórias concluídas" aria-valuemin={0} aria-valuemax={required} aria-valuenow={completed}><div className={`progress-fill ${percent === 100 ? 'is-complete' : ''}`} style={{ width: `${percent}%` }} /></div></div>;
}

export function StudentTable({ onSelectAluno, modoVisualizacao = 'ativos_validados' }: StudentTableProps) {
  const { alunos, processos } = useApp();
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<TypeFilter>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<StateFilter>('TODOS');
  const [page, setPage] = useState(1);
  const rows = useMemo(() => {
    const byStudent = new Map(processos.map(p => [p.alunoId, p]));
    return alunos.filter(a => modoVisualizacao === 'ativos_validados' ? a.situacao === 'ativo' && a.validadoSponte : modoVisualizacao === 'provisorios' ? a.situacao === 'aguardando_validacao' : a.situacao === 'inativo')
      .map(aluno => { const processo = byStudent.get(aluno.id); return { aluno, processo, calc: processo ? calcularEstadoEProgresso(processo, aluno) : null, searchName: normalize(aluno.nome) }; })
      .sort((a, b) => a.aluno.nome.localeCompare(b.aluno.nome, 'pt-BR'));
  }, [alunos, processos, modoVisualizacao]);
  const counts = useMemo(() => ({
    TODOS: rows.length,
    NOVA_MATRICULA: rows.filter(r => r.processo?.tipo === 'NOVA_MATRICULA').length,
    REMATRICULA: rows.filter(r => r.processo?.tipo === 'REMATRICULA').length,
  }), [rows]);
  const filtered = useMemo(() => {
    const term = normalize(busca.trim());
    return rows.filter(r => (!term || r.searchName.includes(term) || r.aluno.matricula.toLowerCase().includes(term))
      && (filtroTipo === 'TODOS' || r.processo?.tipo === filtroTipo)
      && (filtroEstado === 'TODOS' || r.calc?.estado === filtroEstado));
  }, [rows, busca, filtroTipo, filtroEstado]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);
  const searchChanged = (value: string) => { setBusca(value); setPage(1); };
  const tipoChanged = (value: TypeFilter) => { setFiltroTipo(value); setPage(1); };
  const labels: [TypeFilter, string][] = [['TODOS', 'Todos'], ['NOVA_MATRICULA', 'Novas matrículas'], ['REMATRICULA', 'Rematrículas']];
  const status = (row: typeof rows[number]) => row.aluno.situacao === 'inativo'
    ? <StatusBadge tipo="situacao" valor="inativo" />
    : row.calc ? <StatusBadge tipo="estado" valor={row.calc.estado} hasPendencia={row.calc.pendencias.length > 0} /> : <StatusBadge tipo="situacao" valor={row.aluno.situacao} />;
  return (
    <section className="student-list" aria-label="Lista de alunos">
      <div className="list-toolbar">
        <div className="list-search">
          <label className="sr-only" htmlFor="student-search">Buscar aluno por nome ou matrícula</label>
          <Search size={17} aria-hidden="true" /><input id="student-search" type="search" value={busca} onChange={e => searchChanged(e.target.value)} placeholder="Buscar nome ou matrícula" />
          {busca && <button type="button" className="clear-search icon-button" aria-label="Limpar busca" onClick={() => searchChanged('')}><X size={15} /></button>}
        </div>
        {modoVisualizacao === 'ativos_validados' && <label className="list-filter">Situação do processo<select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value as StateFilter); setPage(1); }}><option value="TODOS">Todas as situações</option><option value="PENDENTE">Com pendências</option><option value="AGUARDANDO_APROVACAO">Aguardando aprovação</option><option value="APROVADO">Aprovados</option></select></label>}
      </div>
      {modoVisualizacao === 'ativos_validados' && <div className="list-tabs" aria-label="Tipo de matrícula">{labels.map(([value, label]) => <button type="button" key={value} className="list-tab" aria-pressed={filtroTipo === value} onClick={() => tipoChanged(value)}>{label}<span>{counts[value]}</span></button>)}</div>}
      {filtered.length === 0 ? <div className="empty-list"><SearchX size={32} aria-hidden="true" /><strong>Nenhum aluno encontrado</strong><p>{busca || filtroTipo !== 'TODOS' || filtroEstado !== 'TODOS' ? 'Tente outro nome, matrícula ou filtro.' : 'Os alunos desta lista aparecerão aqui.'}</p>{(busca || filtroTipo !== 'TODOS' || filtroEstado !== 'TODOS') && <button type="button" className="text-button" onClick={() => { setBusca(''); setFiltroTipo('TODOS'); setFiltroEstado('TODOS'); setPage(1); }}>Limpar busca e filtros</button>}</div> : <>
        <div className="desktop-students student-table-wrap">
          <table className="student-table"><caption className="sr-only">Alunos, matrículas e andamento da conferência</caption><thead><tr><th scope="col">Matrícula</th><th scope="col">Aluno</th><th scope="col">Curso / turma</th><th scope="col">Checklist</th><th scope="col">Andamento</th><th scope="col">Situação</th><th scope="col"><span className="sr-only">Abrir ficha</span></th></tr></thead><tbody>
            {visible.map(row => <tr key={row.aluno.id}>
              <td><span className="matricula">{row.aluno.matricula}</span></td>
              <td><div className="student-identity"><span className="student-avatar" aria-hidden="true">{row.aluno.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}</span><div><button type="button" className="student-name" onClick={() => onSelectAluno(row.aluno)}>{row.aluno.nome}</button>{row.aluno.situacao === 'aguardando_validacao' && <span className="student-caption">Aguardando validação</span>}{row.aluno.situacao === 'inativo' && <span className="student-caption">Saída: {row.aluno.motivoSaida?.replaceAll('_', ' ') || 'não informado'}</span>}</div></div></td>
              <td><span>{row.aluno.curso || 'Curso a confirmar'}</span>{row.aluno.turma && <span className="student-caption">{row.aluno.turma}</span>}</td>
              <td>{row.processo ? <StatusBadge tipo="processo" valor={row.processo.tipo} /> : 'A conferir'}</td>
              <td>{row.calc && <Progress completed={row.calc.concluidosObrigatorios} required={row.calc.totalObrigatorios} />}</td>
              <td>{status(row)}</td>
              <td><button type="button" className="row-action" aria-label={`Abrir ficha de ${row.aluno.nome}, matrícula ${row.aluno.matricula}`} onClick={() => onSelectAluno(row.aluno)}>Ficha <ArrowUpRight size={14} aria-hidden="true" /></button></td>
            </tr>)}
          </tbody></table>
        </div>
        <div className="mobile-students">
          {visible.map(row => <article className="student-card" key={row.aluno.id}>
            <div className="student-card-top"><span className="student-avatar" aria-hidden="true">{row.aluno.nome.split(' ').map(n => n[0]).slice(0, 2).join('')}</span><div><span className="matricula">Matrícula {row.aluno.matricula}</span><h3><button type="button" className="student-name" onClick={() => onSelectAluno(row.aluno)}>{row.aluno.nome}</button></h3><span className="student-caption">{row.aluno.curso || 'Curso a confirmar'}{row.aluno.turma ? ` · ${row.aluno.turma}` : ''}</span></div></div>
            {row.processo && <div className="student-card-kind"><StatusBadge tipo="processo" valor={row.processo.tipo} /></div>}
            {row.calc && <Progress completed={row.calc.concluidosObrigatorios} required={row.calc.totalObrigatorios} />}
            <div className="student-card-bottom">{status(row)}<button type="button" className="row-action" aria-label={`Abrir ficha de ${row.aluno.nome}, matrícula ${row.aluno.matricula}`} onClick={() => onSelectAluno(row.aluno)}>Ver ficha <ArrowUpRight size={14} /></button></div>
          </article>)}
        </div>
      </>}
      <div className="list-footer"><span role="status" aria-live="polite">{filtered.length ? `${start + 1}–${Math.min(start + PAGE_SIZE, filtered.length)} de ${filtered.length} alunos` : '0 alunos'}</span><div className="pagination-controls"><button type="button" aria-label="Página anterior" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button><span>{currentPage} / {totalPages}</span><button type="button" aria-label="Próxima página" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button></div></div>
    </section>
  );
}

