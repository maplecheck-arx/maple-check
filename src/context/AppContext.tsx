'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Aluno, ProcessoMatricula, User } from '../domain/types';
import { LoadingView } from '../components/ui/LoadingView';
import { getSupabase, mensagemErro } from '../lib/supabase';

type Resultado = { success: boolean; error?: string };
type Registro = { aluno: Aluno; processo: ProcessoMatricula; versao: number };
type DadosAluno = Partial<Pick<Aluno, 'nome' | 'curso' | 'turma' | 'dataCadastroSponte' | 'jaEstudouOutraInstituicao'>>;
interface AppContextType {
  alunos: Aluno[];
  processos: ProcessoMatricula[];
  currentUser: User | null;
  isAuthenticated: boolean;
  recuperandoSenha: boolean;
  salvando: boolean;
  erroConexao: string | null;
  revisoes: Record<string, number>;
  atualizarDados: () => Promise<void>;
  finalizarRecuperacao: () => void;
  loginComCredenciais: (email: string, password: string) => Promise<Resultado>;
  logout: () => Promise<void>;
  marcarItem: (alunoId: string, itemId: string, valor: boolean) => Promise<Resultado>;
  aprovar: (alunoId: string) => Promise<Resultado>;
  cadastrarAlunoManual: (dados: { matricula: string; nome: string; curso: string; turma?: string; dataCadastro?: string; jaEstudouOutraInstituicao?: 'sim' | 'nao' | 'a_confirmar' }) => Promise<Resultado>;
  editarAlunoLocal: (alunoId: string, dados: DadosAluno, revisao: number) => Promise<Resultado>;
  excluirAlunoDefinitivo: (alunoId: string) => Promise<Resultado>;
}
const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroConexao, setErroConexao] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const registrosRef = useRef<Registro[]>([]);
  const operacao = useRef(false);
  const sequencia = useRef(0);
  const usuarioId = useRef<string | null>(null);
  const ativo = useRef(true);

  const guardar = useCallback((rows: Registro[]) => {
    registrosRef.current = rows;
    setRegistros(rows);
  }, []);

  const carregar = useCallback(async () => {
    if (operacao.current) return;
    const seq = ++sequencia.current;
    try {
      const supabase = getSupabase();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      // Local session is a UI hint only. Each RPC verifies identity and permissions in Postgres.
      if (!session) {
        if (seq === sequencia.current && ativo.current) { guardar([]); setCurrentUser(null); setErroConexao(null); }
        return;
      }
      const { data, error } = await supabase.rpc('secretaria_estado');
      if (error) throw error;
      if (seq !== sequencia.current || !ativo.current) return;
      if (!data?.user || !Array.isArray(data.registros)) throw new Error('Resposta inválida do banco. Tente atualizar novamente.');
      guardar(data.registros);
      setCurrentUser(data.user);
      setErroConexao(null);
    } catch (error) {
      if (seq === sequencia.current && ativo.current) {
        const falha = error as { message?: string; status?: number };
        const temporaria = /failed to fetch|network|fetch failed|timeout|load failed/i.test(falha?.message || '') || (falha?.status || 0) >= 500;
        // Keep the open form during a transient refresh failure. Authorization failures still clear it.
        if (!temporaria) { guardar([]); setCurrentUser(null); }
        setErroConexao(mensagemErro(error));
      }
    } finally {
      if (seq === sequencia.current && ativo.current) setCarregando(false);
    }
  }, [guardar]);

  useEffect(() => {
    ativo.current = true;
    let stop: (() => void) | undefined;
    try {
      const { data: { subscription } } = getSupabase().auth.onAuthStateChange((event, session) => {
        if (!ativo.current) return;
        if (event === 'PASSWORD_RECOVERY') setRecuperandoSenha(true);
        if (usuarioId.current !== (session?.user.id || null)) {
          usuarioId.current = session?.user.id || null;
          ++sequencia.current;
          guardar([]); setCurrentUser(null);
        }
        if (event === 'SIGNED_OUT') { setRecuperandoSenha(false); setErroConexao(null); }
        // Supabase auth holds a session lock during this callback.
        window.setTimeout(() => { if (ativo.current) void carregar(); }, 0);
      });
      stop = () => subscription.unsubscribe();
    } catch (error) { setErroConexao(mensagemErro(error)); setCarregando(false); }
    void carregar();
    const refresh = () => { if (document.visibilityState === 'visible') void carregar(); };
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => { ativo.current = false; ++sequencia.current; stop?.(); clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [carregar, guardar]);

  const executar = async (acao: string, alunoId: string | null, dados: object = {}, revisao?: number): Promise<Resultado> => {
    if (operacao.current) return { success: false, error: 'Aguarde a gravação em andamento.' };
    if (!currentUser) return { success: false, error: 'Entre na sua conta para continuar.' };
    operacao.current = true;
    setSalvando(true);
    const seq = ++sequencia.current;
    try {
      const versao = revisao ?? registrosRef.current.find(r => r.aluno.id === alunoId)?.versao;
      const { data, error } = await getSupabase().rpc('secretaria_executar', { acao, aluno_id: alunoId, versao_esperada: versao ?? null, dados });
      if (error) throw error;
      if (seq !== sequencia.current || !ativo.current) return { success: false, error: 'A sessão foi alterada. Entre novamente para conferir a gravação.' };
      if (data.excluido) guardar(registrosRef.current.filter(r => r.aluno.id !== data.excluido));
      else guardar([...registrosRef.current.filter(r => r.aluno.id !== data.aluno.id), data]);
      setErroConexao(null);
      return { success: true };
    } catch (error) {
      const message = mensagemErro(error);
      operacao.current = false;
      await carregar();
      return { success: false, error: message };
    } finally { operacao.current = false; if (ativo.current) setSalvando(false); }
  };

  const logout = async () => {
    try {
      const { error } = await getSupabase().auth.signOut({ scope: 'local' });
      if (error) throw error;
      ++sequencia.current; guardar([]); setCurrentUser(null); setRecuperandoSenha(false); setErroConexao(null);
    } catch (error) { setErroConexao(mensagemErro(error)); }
  };

  const loginComCredenciais = async (email: string, password: string): Promise<Resultado> => {
    if (!/^[^@\s]+@maplebeararaxa\.com\.br$/i.test(email.trim())) return { success: false, error: 'Utilize seu e-mail @maplebeararaxa.com.br.' };
    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) throw error;
      await carregar();
      return { success: true };
    } catch (error) { return { success: false, error: mensagemErro(error) }; }
  };

  if (carregando) return <LoadingView fullScreen label="Conectando à secretaria…" />;
  return <AppContext.Provider value={{
    alunos: registros.map(r => r.aluno), processos: registros.map(r => r.processo), currentUser,
    isAuthenticated: !!currentUser, recuperandoSenha, salvando, erroConexao,
    revisoes: Object.fromEntries(registros.map(r => [r.aluno.id, r.versao])),
    atualizarDados: carregar, finalizarRecuperacao: () => setRecuperandoSenha(false), loginComCredenciais, logout,
    marcarItem: (id, itemId, valor) => executar('marcar', id, { itemId, valor }),
    aprovar: id => executar('aprovar', id),
    cadastrarAlunoManual: ({ dataCadastro, ...dados }) => executar('cadastrar', null, { ...dados, dataCadastroSponte: dataCadastro || null }),
    editarAlunoLocal: (id, dados, revisao) => executar('editar', id, { ...dados, turma: dados.turma || null, dataCadastroSponte: dados.dataCadastroSponte || null }, revisao),
    excluirAlunoDefinitivo: id => executar('excluir', id),
  }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp precisa de AppProvider.');
  return value;
}
