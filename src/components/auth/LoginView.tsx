'use client';

import { useState } from 'react';
import { Check, ArrowRight, ArrowLeft, LoaderCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getSupabase, mensagemErro } from '../../lib/supabase';

type Modo = 'entrar' | 'cadastrar' | 'recuperar';
export function LoginView() {
  const { loginComCredenciais, recuperandoSenha, finalizarRecuperacao, erroConexao, atualizarDados, logout } = useApp();
  const [modo, setModo] = useState<Modo>('entrar');
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [mensagem, setMensagem] = useState('');
  const trocarModo = (next: Modo) => { setModo(next); setErro(''); setMensagem(''); setSenha(''); setConfirmacao(''); };

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setErro(''); setMensagem('');
    if (!recuperandoSenha && !/^[^@\s]+@maplebeararaxa\.com\.br$/i.test(email.trim())) { setErro('Utilize seu e-mail @maplebeararaxa.com.br.'); return; }
    if ((modo === 'cadastrar' || recuperandoSenha) && senha !== confirmacao) { setErro('As senhas precisam ser iguais.'); return; }
    setLoading(true);
    try {
      const supabase = getSupabase();
      if (recuperandoSenha) {
        const { error } = await supabase.auth.updateUser({ password: senha });
        if (error) throw error;
        finalizarRecuperacao(); setMensagem('Senha atualizada. Você já pode entrar.'); setSenha('');
      } else if (modo === 'entrar') {
        const result = await loginComCredenciais(email, senha);
        if (!result.success) throw new Error(result.error);
      } else if (modo === 'cadastrar') {
        const { error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password: senha, options: { data: { name: nome.trim() }, emailRedirectTo: window.location.origin } });
        if (error) throw error;
        setMensagem('Confira seu e-mail institucional para confirmar o acesso.'); setSenha(''); setConfirmacao('');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: window.location.origin });
        if (error) throw error;
        setMensagem('Se houver uma conta para esse e-mail, você receberá as instruções de recuperação.');
      }
    } catch (error) { setErro(mensagemErro(error)); }
    finally { setLoading(false); }
  }
  const title = recuperandoSenha ? 'Defina sua nova senha' : modo === 'cadastrar' ? 'Crie seu acesso' : modo === 'recuperar' ? 'Recupere seu acesso' : 'Bem-vindo à secretaria';
  return <main className="login-layout">
    <section className="login-story" aria-label="Maple Check">
      <div className="login-brand"><span className="check-mark"><Check size={27} strokeWidth={3} /></span><span>Maple <strong>Check</strong></span></div>
      <div className="login-story-content"><span className="login-eyebrow">Maple Bear Araxá · Secretaria</span><h1>Cada etapa.<br />Cada aluno.<br /><span>Tudo acompanhado.</span></h1><p>Matrículas, documentos e entregas organizados em um só lugar.</p></div>
      <div className="login-year"><span>Ano letivo</span><strong>2027</strong></div>
    </section>
    <section className="login-form-area">
      <div className="login-form-card">
        <span className="page-eyebrow">Acesso institucional</span><h2>{title}</h2><p className="login-description">{recuperandoSenha ? 'Use uma senha com pelo menos 12 caracteres.' : 'Use sua conta @maplebeararaxa.com.br.'}</p>
        {erroConexao && <div className="notice notice-error" role="alert"><div><p>{erroConexao}</p><div className="flex gap-4 mt-3"><button className="text-button" onClick={() => void atualizarDados()}>Tentar novamente</button><button className="text-button" onClick={() => void logout()}>Sair da sessão</button></div></div></div>}
        {erro && <div role="alert" className="notice notice-error">{erro}</div>}
        {mensagem && <div role="status" className="notice">{mensagem}</div>}
        <form onSubmit={submit} className="login-form">
          {modo === 'cadastrar' && !recuperandoSenha && <label htmlFor="nome-acesso">Seu nome<input id="nome-acesso" autoComplete="name" maxLength={100} required value={nome} onChange={e => setNome(e.target.value)} /></label>}
          {!recuperandoSenha && <label htmlFor="email-acesso">E-mail institucional<input id="email-acesso" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu.nome@maplebeararaxa.com.br" /></label>}
          {(modo !== 'recuperar' || recuperandoSenha) && <label htmlFor="senha-acesso">{recuperandoSenha ? 'Nova senha' : 'Senha'}<input id="senha-acesso" type="password" autoComplete={modo === 'entrar' && !recuperandoSenha ? 'current-password' : 'new-password'} minLength={modo === 'cadastrar' || recuperandoSenha ? 12 : undefined} required value={senha} onChange={e => setSenha(e.target.value)} /></label>}
          {(modo === 'cadastrar' || recuperandoSenha) && <label htmlFor="confirmar-senha">Confirme a senha<input id="confirmar-senha" type="password" autoComplete="new-password" minLength={12} required value={confirmacao} onChange={e => setConfirmacao(e.target.value)} /></label>}
          {modo === 'entrar' && !recuperandoSenha && <button type="button" className="text-button self-end" onClick={() => trocarModo('recuperar')}>Esqueci minha senha</button>}
          <button type="submit" className="primary-button login-submit" disabled={loading}>{loading ? <><LoaderCircle size={18} className="animate-spin" />Aguarde…</> : <>{recuperandoSenha ? 'Salvar nova senha' : modo === 'cadastrar' ? 'Criar conta' : modo === 'recuperar' ? 'Enviar instruções' : 'Entrar'}<ArrowRight size={18} /></>}</button>
        </form>
        {!recuperandoSenha && <div className="login-alternative">{modo === 'entrar' ? <>Primeiro acesso? <button className="text-button" onClick={() => trocarModo('cadastrar')}>Criar conta</button></> : <button className="text-button" onClick={() => trocarModo('entrar')}><ArrowLeft size={15} />Voltar para entrar</button>}</div>}
        <p className="login-footnote">Maple Check · Gestão de matrículas e rematrículas</p>
      </div>
    </section>
  </main>;
}
