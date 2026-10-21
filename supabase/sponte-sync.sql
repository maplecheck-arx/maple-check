-- Apply once after schema.sql. Only the server secret key can run the sync RPC.
create table secretaria.sponte_sync (
  singleton boolean primary key default true check (singleton),
  run_id uuid, iniciado_em timestamptz, expira_em timestamptz,
  ultimo_sucesso timestamptz, estado text not null default 'aguardando_primeira_sync',
  codigo_erro text, resumo jsonb
);
insert into secretaria.sponte_sync(singleton) values(true);
alter table secretaria.sponte_sync enable row level security;
revoke all on secretaria.sponte_sync from public, anon, authenticated, service_role;
alter table secretaria.exclusoes add column external_id text;
create unique index registros_external_ano on secretaria.registros ((aluno->>'externalId'),ano) where aluno->>'externalId' is not null;
create index exclusoes_external_ano on secretaria.exclusoes(external_id,ano) where external_id is not null;

create function secretaria.guardar_external_excluido() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  update secretaria.exclusoes set external_id=old.aluno->>'externalId' where matricula=old.matricula and ano=old.ano;
  return old;
end $$;
revoke all on function secretaria.guardar_external_excluido() from public,anon,authenticated,service_role;
create trigger guarda_external_excluido before delete on secretaria.registros for each row execute function secretaria.guardar_external_excluido();

create function secretaria.sincronizar(acao text, execucao uuid, dados jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  s secretaria.sponte_sync; d jsonb; r secretaria.registros; a jsonb; p jsonb; item jsonb; itens jsonb;
  ator jsonb := '{"id":"sync_sponte","name":"Sincronização Sponte"}'::jsonb;
  agora timestamptz := clock_timestamp(); novo_id uuid; t text; aplic text; existente boolean;
  novos int := 0; atualizados int := 0; arquivados int := 0; ignorados int := 0; bloqueados int := 0;
  resultado_resumo jsonb;
begin
  select * into s from secretaria.sponte_sync where singleton for update;
  if acao='iniciar' then
    if s.expira_em > agora then return jsonb_build_object('executar',false,'motivo','em_andamento'); end if;
    if (s.ultimo_sucesso at time zone 'America/Sao_Paulo')::date=(agora at time zone 'America/Sao_Paulo')::date then
      return jsonb_build_object('executar',false,'motivo','atualizado_hoje');
    end if;
    if s.iniciado_em > agora - interval '15 minutes' then return jsonb_build_object('executar',false,'motivo','aguarde_15_minutos'); end if;
    novo_id := gen_random_uuid();
    update secretaria.sponte_sync set run_id=novo_id,iniciado_em=agora,expira_em=agora+interval '10 minutes',estado='em_andamento',codigo_erro=null where singleton;
    return jsonb_build_object('executar',true,'execucao',novo_id);
  end if;
  if execucao is null or s.run_id is distinct from execucao or s.expira_em is null or s.expira_em < agora then raise exception 'Execução inválida ou expirada.'; end if;
  if acao='falhar' then
    update secretaria.sponte_sync set estado='erro',expira_em=null,codigo_erro=case
      when coalesce(dados->>'codigo','') ~ '^[A-Z0-9_]{1,80}$' then dados->>'codigo' else 'FALHA_INTEGRACAO' end where singleton;
    return '{"sucesso":false}'::jsonb;
  end if;
  if acao <> 'concluir' or jsonb_typeof(dados) is distinct from 'array' then raise exception 'Operação inválida.'; end if;
  if jsonb_array_length(dados)=0 or jsonb_array_length(dados)>10000 or octet_length(dados::text)>2000000 then raise exception 'Lote vazio ou muito extenso.'; end if;
  if exists(select 1 from jsonb_array_elements(dados) x group by x->>'externalId' having count(*)>1)
    or exists(select 1 from jsonb_array_elements(dados) x group by x->>'matricula' having count(*)>1) then raise exception 'Identidades duplicadas no lote.'; end if;
  -- Stable lock order. The whole snapshot is committed atomically or rolled back.
  for d in select value from jsonb_array_elements(dados) order by value->>'matricula' loop
    if jsonb_typeof(d) is distinct from 'object' or coalesce(d->>'externalId','') !~ '^[1-9][0-9]*$'
      or coalesce(length(btrim(d->>'matricula')),0) not between 1 and 50
      or coalesce(length(btrim(d->>'nome')),0) not between 2 and 200
      or coalesce(d->>'situacao','') not in ('ativo','inativo')
      or exists(select 1 from jsonb_object_keys(d) k where k not in ('externalId','matricula','nome','curso','turma','situacao','dataCadastroSponte')) then raise exception 'Dados do lote inválidos.'; end if;
    perform secretaria.tipo(d->>'dataCadastroSponte');
    perform pg_advisory_xact_lock(hashtextextended((d->>'matricula') || ':2027',0));
    if exists(select 1 from secretaria.exclusoes where ano=2027 and (matricula=d->>'matricula' or external_id=d->>'externalId')) then bloqueados:=bloqueados+1; continue; end if;
    select * into r from secretaria.registros where ano=2027 and aluno->>'externalId'=d->>'externalId' for update;
    if not found then select * into r from secretaria.registros where ano=2027 and matricula=d->>'matricula' for update; end if;
    existente := found;
    if existente and r.aluno->>'externalId' is not null and r.aluno->>'externalId' <> d->>'externalId' then raise exception 'Conflito de identidade no cadastro.'; end if;
    if not existente and d->>'situacao'='inativo' then ignorados:=ignorados+1; continue; end if;
    if existente then
      a := jsonb_strip_nulls(r.aluno || d || '{"validadoSponte":true}'::jsonb);
      if d->>'situacao'='inativo' then
        -- An archived student may have no current contract: retain known course and history.
        a := a || jsonb_build_object('curso',r.aluno->>'curso','turma',r.aluno->>'turma','motivoSaida','nao_informado');
      else a := a - 'motivoSaida'; end if;
      if a=r.aluno then continue; end if;
      perform secretaria.validar_dados(a);
      p := secretaria.revogar(r.processo,ator,'Dados atualizados pelo Sponte. É necessária nova conferência final.');
      t := secretaria.tipo(a->>'dataCadastroSponte');
      if t <> p->>'tipo' then
        p := secretaria.novo_processo(a,ator) || jsonb_build_object(
          'historicoAprovacoes',p->'historicoAprovacoes',
          'eventos',p->'eventos',
          'versoesAnteriores',coalesce(p->'versoesAnteriores','[]'::jsonb) || jsonb_build_array((p-'versoesAnteriores') || jsonb_build_object('arquivadoEm',agora)));
      else
        itens := '[]'::jsonb;
        for item in select value from jsonb_array_elements(p->'itens') loop
          aplic := secretaria.aplicabilidade(item->>'id',a);
          if aplic='obrigatorio' and item->>'aplicabilidade'<>'obrigatorio' then
            item := (item-'marcadoEm'-'marcadoPorId'-'marcadoPorNome') || '{"concluido":false}'::jsonb;
          end if;
          itens := itens || jsonb_build_array(item || jsonb_build_object('aplicabilidade',aplic));
        end loop;
        p := p || jsonb_build_object('itens',itens);
      end if;
      if a->>'situacao'='inativo' and r.aluno->>'situacao'<>'inativo' then arquivados:=arquivados+1; end if;
      p := p || jsonb_build_object('estado',case when secretaria.pode_aprovar(a,p) then 'AGUARDANDO_APROVACAO' else 'PENDENTE' end,
        'eventos',(p->'eventos') || jsonb_build_array(secretaria.evento(ator,'SINCRONIZACAO','Dados cadastrais conferidos com o Sponte.')));
      update secretaria.registros set aluno=a,processo=p,versao=versao+1,atualizado_em=agora where id=r.id;
      atualizados:=atualizados+1;
    else
      novo_id := gen_random_uuid();
      a := jsonb_strip_nulls(d || jsonb_build_object('id',novo_id,'anoLetivo',2027,'validadoSponte',true,'dataInclusaoApp',agora,'jaEstudouOutraInstituicao','a_confirmar'));
      perform secretaria.validar_dados(a);
      p := secretaria.novo_processo(a,ator);
      p := p || jsonb_build_object('eventos',jsonb_build_array(secretaria.evento(ator,'SINCRONIZACAO','Cadastro importado do Sponte.')));
      insert into secretaria.registros(id,aluno,processo) values(novo_id,a,p);
      novos:=novos+1;
    end if;
  end loop;
  resultado_resumo := jsonb_build_object('novos',novos,'atualizados',atualizados,'arquivados',arquivados,'inativosIgnorados',ignorados,'excluidosIgnorados',bloqueados,'recebidos',jsonb_array_length(dados));
  update secretaria.sponte_sync set estado='sucesso',ultimo_sucesso=agora,expira_em=null,codigo_erro=null,resumo=resultado_resumo where singleton;
  return jsonb_build_object('sucesso',true,'resumo',resultado_resumo);
end $$;
revoke all on function secretaria.sincronizar(text,uuid,jsonb) from public,anon,authenticated;
grant usage on schema secretaria to service_role;
grant execute on function secretaria.sincronizar(text,uuid,jsonb) to service_role;
create function public.secretaria_sponte(acao text, execucao uuid default null, dados jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path='' as $$ select secretaria.sincronizar(acao,execucao,dados); $$;
revoke all on function public.secretaria_sponte(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.secretaria_sponte(text,uuid,jsonb) to service_role;

create function public.secretaria_identidade() returns jsonb language sql security invoker set search_path='' as $$ select secretaria.ator(); $$;
revoke all on function public.secretaria_identidade() from public,anon;
grant execute on function public.secretaria_identidade(), secretaria.ator() to authenticated;

create or replace function secretaria.estado() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare ator jsonb := secretaria.ator(); registros jsonb; s secretaria.sponte_sync;
begin
  select coalesce(jsonb_agg(jsonb_build_object('aluno',aluno,'processo',processo,'versao',versao) order by matricula),'[]'::jsonb) into registros from secretaria.registros;
  select * into s from secretaria.sponte_sync where singleton;
  return jsonb_build_object('user',ator,'registros',registros,'sponte',jsonb_build_object(
    'status',case when s.estado='em_andamento' and s.expira_em < now() then 'erro' else s.estado end,
    'ultimaSyncSucesso',s.ultimo_sucesso,'ultimaSyncTentativa',s.iniciado_em,'codigoErro',s.codigo_erro,'resumo',s.resumo));
end $$;
