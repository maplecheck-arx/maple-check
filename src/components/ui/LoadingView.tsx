export function LoadingView({ label = 'Carregando os alunos…', fullScreen = false }: { label?: string; fullScreen?: boolean }) {
  return (
    <div className={fullScreen ? 'loading-screen' : 'loading-panel'} role="status" aria-live="polite">
      <div className="loading-heading"><span className="loading-indicator" aria-hidden="true" /><span>{label}</span></div>
      <div className="loading-rows" aria-hidden="true">
        {[0, 1, 2, 3].map(row => <div className="loading-row" key={row}><span /><span /><span /></div>)}
      </div>
    </div>
  );
}
