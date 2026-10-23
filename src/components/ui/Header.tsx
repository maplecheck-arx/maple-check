'use client';

import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ClipboardList, Clock3, Archive, BarChart3, Plus, LogOut, Menu, X, Check } from 'lucide-react';

export type ActiveTab = 'operacional' | 'provisorios' | 'inativos' | 'relatorios';
interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenNovoAluno: () => void;
}
export function Header({ activeTab, onTabChange, onOpenNovoAluno }: HeaderProps) {
  const { logout, alunos, currentUser } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    { id: 'operacional' as const, name: 'Matrículas', icon: ClipboardList, count: alunos.filter(a => a.situacao === 'ativo' && a.validadoSponte).length },
    { id: 'provisorios' as const, name: 'Aguardando validação', icon: Clock3, count: alunos.filter(a => a.situacao === 'aguardando_validacao').length },
    { id: 'inativos' as const, name: 'Alunos arquivados', icon: Archive, count: alunos.filter(a => a.situacao === 'inativo').length },
    { id: 'relatorios' as const, name: 'Relatórios', icon: BarChart3, count: undefined },
  ];
  const navigate = (tab: ActiveTab) => { onTabChange(tab); setMenuOpen(false); };
  return (
    <>
      <header className="mobile-topbar">
        <div className="brand-lockup"><span className="brand-mark"><Check size={22} /></span><span><strong>Maple Check</strong></span></div>
        <button type="button" className="icon-button" aria-label={menuOpen ? 'Fechar navegação' : 'Abrir navegação'} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={22} /> : <Menu size={22} />}</button>
      </header>
      {menuOpen && <button type="button" className="navigation-backdrop" aria-label="Fechar navegação" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand brand-lockup"><span className="brand-mark"><Check size={24} /></span><span><strong>Maple Check</strong></span></div>
        <span className="navigation-label">Acompanhamento</span>
        <nav id="main-navigation" aria-label="Navegação principal">
          {links.map(link => <button key={link.id} type="button" className={`navigation-item ${activeTab === link.id ? 'is-active' : ''}`} aria-current={activeTab === link.id ? 'page' : undefined} onClick={() => navigate(link.id)}><link.icon size={18} aria-hidden="true" /><span>{link.name}</span>{link.count !== undefined && <span className="navigation-count">{link.count}</span>}</button>)}
        </nav>
        <button type="button" onClick={() => { onOpenNovoAluno(); setMenuOpen(false); }} className="primary-button sidebar-create"><Plus size={18} />Cadastrar aluno</button>
        <div className="sidebar-account">
          <div className="account-avatar">{currentUser?.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
          <div className="account-name"><strong>{currentUser?.name || 'Usuário'}</strong><small>{currentUser?.role === 'ADMIN' ? 'Administrador' : 'Secretaria'}</small></div>
          <button type="button" onClick={logout} className="icon-button" aria-label="Sair da conta"><LogOut size={17} /></button>
        </div>
      </aside>
    </>
  );
}

