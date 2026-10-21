-- Secretaria de matrículas. Projeto exclusivo: nxbqeutabwlpqzlnkkul.
-- Somente as funções públicas abaixo são expostas à aplicação.
create schema if not exists secretaria;
revoke all on schema secretaria from public, anon, authenticated;
grant usage on schema secretaria to authenticated;

create table secretaria.registros (
  id uuid primary key default gen_random_uuid(),
  aluno jsonb not null,
  processo jsonb not null,
  versao integer not null default 1 check (versao > 0),
  matricula text generated always as (aluno->>'matricula') stored not null,
  ano integer generated always as ((aluno->>'anoLetivo')::integer) stored not null,
  atualizado_em timestamptz not null default now(),
  unique (matricula, ano),
  check (aluno->>'id' = id::text),
  check (processo->>'alunoId' = id::text),
  check (ano = 2027)
);
create table secretaria.exclusoes (
  matricula text not null,
  ano integer not null,
  excluido_por uuid not null,
  excluido_em timestamptz not null default now(),
  primary key (matricula, ano)
);
create table secretaria.modelos (
  tipo text primary key,
  itens jsonb not null
);
alter table secretaria.registros enable row level security;
alter table secretaria.exclusoes enable row level security;
alter table secretaria.modelos enable row level security;
revoke all on all tables in schema secretaria from public, anon, authenticated;

create function secretaria.ator() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare u auth.users; papel text; nome text;
begin
  if auth.uid() is null then raise exception 'Sessão inválida. Entre novamente.' using errcode = '42501'; end if;
  select * into u from auth.users where id = auth.uid();
  if not found or u.email_confirmed_at is null or coalesce(u.is_anonymous, false)
    or lower(coalesce(u.email,'')) !~ '^[^@[:space:]]+@maplebeararaxa\.com\.br$'
    or u.banned_until > now() then
    raise exception 'Acesso permitido somente com e-mail institucional confirmado.' using errcode = '42501';
  end if;
  papel := case when lower(u.email) in ('isaque.santos@maplebeararaxa.com.br','jose.reis@maplebeararaxa.com.br','pedro.ashidani@maplebeararaxa.com.br') then 'ADMIN' else 'SECRETARIA' end;
  nome := case lower(u.email)
    when 'isaque.santos@maplebeararaxa.com.br' then 'Isaque Santos'
    when 'jose.reis@maplebeararaxa.com.br' then 'José Reis'
    when 'pedro.ashidani@maplebeararaxa.com.br' then 'Pedro Ashidani'
    else coalesce(nullif(left(btrim(u.raw_user_meta_data->>'name'),100),''),split_part(u.email,'@',1)) end;
  return jsonb_build_object('id',u.id,'email',lower(u.email),'name',nome,'role',papel,'cargo',case when papel='ADMIN' then 'Administrador' else 'Secretaria' end);
end $$;

create function secretaria.tipo(data_cadastro text) returns text
language plpgsql immutable set search_path = '' as $$
declare d date;
begin
  if nullif(data_cadastro,'') is null then return 'CLASSIFICACAO_PENDENTE'; end if;
  if data_cadastro !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Informe uma data válida no formato ano-mês-dia.'; end if;
  begin d := data_cadastro::date; exception when others then raise exception 'Data de cadastro inválida.'; end;
  if d < date '1900-01-01' or d > date '2100-12-31' then raise exception 'Data de cadastro fora do intervalo permitido.'; end if;
  return case when d >= date '2026-09-01' then 'NOVA_MATRICULA' else 'REMATRICULA' end;
end $$;

create function secretaria.aplicabilidade(item_id text, a jsonb) returns text
language plpgsql immutable set search_path = '' as $$
declare c text := lower(btrim(a->>'curso')); prefixo text;
begin
  if item_id in ('rem_laudo_oftalmo','rem_laudo_audio') then
    foreach prefixo in array array['toddler','nursery','infantil 1','infantil 2','maternal','berçário'] loop
      if starts_with(c,prefixo) then return 'nao_se_aplica'; end if;
    end loop;
    foreach prefixo in array array['junior kindergarten','senior kindergarten','jk','sk','year 1','year 2','year 3','year 4','year 5','year 6','year 7','year 8','year 9','1º ano','2º ano','3º ano','4º ano','5º ano','6º ano','7º ano','8º ano','9º ano','ensino fundamental'] loop
      if starts_with(c,prefixo) then return 'obrigatorio'; end if;
    end loop;
    return 'a_confirmar';
  elsif item_id = 'rem_declaracao_transf' then
    return case a->>'jaEstudouOutraInstituicao' when 'sim' then 'obrigatorio' when 'nao' then 'nao_se_aplica' else 'a_confirmar' end;
  end if;
  return 'obrigatorio';
end $$;

create function secretaria.evento(ator jsonb, tipo text, descricao text) returns jsonb
language sql volatile set search_path = '' as $$
 select jsonb_build_object('id',gen_random_uuid(),'dataHora',clock_timestamp(),'tipo',tipo,'descricao',descricao,'autorNome',ator->>'name','autorId',ator->>'id');
$$;

create function secretaria.novo_processo(a jsonb, ator jsonb) returns jsonb
language plpgsql volatile set search_path = '' as $$
declare t text := secretaria.tipo(a->>'dataCadastroSponte'); itens jsonb;
begin
  select coalesce(jsonb_agg(i || jsonb_build_object('concluido',false,'historico','[]'::jsonb,'aplicabilidade',secretaria.aplicabilidade(i->>'id',a)) order by (i->>'numero')::int),'[]'::jsonb)
    into itens from secretaria.modelos m cross join lateral jsonb_array_elements(m.itens) i where m.tipo=t;
  return jsonb_build_object('id',gen_random_uuid(),'alunoId',a->>'id','anoLetivo',2027,'tipo',t,'estado','PENDENTE','itens',itens,'historicoAprovacoes','[]'::jsonb,'eventos',jsonb_build_array(secretaria.evento(ator,'CADASTRAL','Processo cadastrado pela secretaria.')));
end $$;

create function secretaria.pode_aprovar(a jsonb, p jsonb) returns boolean
language sql immutable set search_path = '' as $$
 select a->>'situacao' = 'ativo' and coalesce((a->>'validadoSponte')::boolean,false)
   and p->>'tipo' in ('NOVA_MATRICULA','REMATRICULA') and jsonb_array_length(p->'itens') > 0
   and not exists (select 1 from jsonb_array_elements(p->'itens') i where i->>'aplicabilidade'='a_confirmar' or (i->>'aplicabilidade'='obrigatorio' and not (i->>'concluido')::boolean));
$$;

create function secretaria.revogar(p jsonb, ator jsonb, motivo text) returns jsonb
language plpgsql volatile set search_path = '' as $$
begin
  if p->>'aprovadoEm' is null then return p; end if;
  return (p - 'aprovadoEm' - 'aprovadoPorId' - 'aprovadoPorNome') || jsonb_build_object(
    'estado','PENDENTE',
    'historicoAprovacoes',(p->'historicoAprovacoes') || jsonb_build_array(jsonb_build_object('acao','revogado','atorNome',ator->>'name','atorId',ator->>'id','dataHora',clock_timestamp(),'motivo',motivo)),
    'eventos',(p->'eventos') || jsonb_build_array(secretaria.evento(ator,'REVOGACAO',motivo)));
end $$;

create function secretaria.validar_dados(d jsonb) returns void
language plpgsql immutable set search_path = '' as $$
begin
  if jsonb_typeof(d) is distinct from 'object' then raise exception 'Dados inválidos.'; end if;
  if coalesce(length(btrim(d->>'nome')),0) not between 2 and 200 then raise exception 'Informe o nome do aluno (2 a 200 caracteres).'; end if;
  if coalesce(length(btrim(d->>'curso')),0) not between 1 and 100 then raise exception 'Informe o curso (até 100 caracteres).'; end if;
  if coalesce(length(d->>'turma'),0)>100 then raise exception 'Turma deve ter até 100 caracteres.'; end if;
  if coalesce(d->>'jaEstudouOutraInstituicao','a_confirmar') not in ('sim','nao','a_confirmar') then raise exception 'Resposta sobre instituição anterior inválida.'; end if;
  perform secretaria.tipo(d->>'dataCadastroSponte');
end $$;

create function secretaria.estado() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare ator jsonb := secretaria.ator(); registros jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('aluno',aluno,'processo',processo,'versao',versao) order by matricula),'[]'::jsonb) into registros from secretaria.registros;
  return jsonb_build_object('user',ator,'registros',registros,'sponte',jsonb_build_object('status','pendente_documentacao','ultimaSyncSucesso',null,'ultimaSyncTentativa',null));
end $$;

create function secretaria.executar(acao text, aluno_id uuid, versao_esperada integer, dados jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  ator jsonb := secretaria.ator(); r secretaria.registros; a jsonb; p jsonb; item jsonb; novos_itens jsonb := '[]'::jsonb;
  tipo_novo text; aplic text; encontrou boolean := false; valor boolean; chave text; nova_versao integer; agora timestamptz := clock_timestamp();
begin
  if jsonb_typeof(dados) is distinct from 'object' or octet_length(dados::text)>8000 then raise exception 'Dados inválidos ou muito extensos.'; end if;
  if acao='cadastrar' then
    for chave in select jsonb_object_keys(dados) loop
      if chave not in ('matricula','nome','curso','turma','dataCadastroSponte','jaEstudouOutraInstituicao') then raise exception 'Campo não permitido: %',chave; end if;
    end loop;
    perform secretaria.validar_dados(dados);
    if coalesce(length(btrim(dados->>'matricula')),0) not between 1 and 50 then raise exception 'Informe a matrícula (até 50 caracteres).'; end if;
    -- Serializa criação/exclusão da mesma matrícula, inclusive quando a linha ainda não existe.
    perform pg_advisory_xact_lock(hashtextextended(btrim(dados->>'matricula') || ':2027',0));
    if exists(select 1 from secretaria.exclusoes where matricula=btrim(dados->>'matricula') and ano=2027) then raise exception 'Esta matrícula foi excluída e está bloqueada para reimportação.'; end if;
    aluno_id := gen_random_uuid();
    a := jsonb_strip_nulls(jsonb_build_object('id',aluno_id,'matricula',btrim(dados->>'matricula'),'nome',btrim(dados->>'nome'),'curso',btrim(dados->>'curso'),'turma',nullif(btrim(dados->>'turma'),''),'dataCadastroSponte',nullif(dados->>'dataCadastroSponte',''),'dataInclusaoApp',agora,'anoLetivo',2027,'situacao','aguardando_validacao','validadoSponte',false,'jaEstudouOutraInstituicao',coalesce(dados->>'jaEstudouOutraInstituicao','a_confirmar')));
    p := secretaria.novo_processo(a,ator);
    insert into secretaria.registros(id,aluno,processo) values(aluno_id,a,p) returning versao into nova_versao;
    return jsonb_build_object('aluno',a,'processo',p,'versao',nova_versao);
  end if;
  if acao='excluir' then
    select matricula into chave from secretaria.registros where id=aluno_id;
    if chave is not null then perform pg_advisory_xact_lock(hashtextextended(chave || ':2027',0)); end if;
  end if;
  select * into r from secretaria.registros where id=aluno_id for update;
  if not found then raise exception 'Aluno não encontrado. Atualize a lista.'; end if;
  if versao_esperada is null or r.versao <> versao_esperada then raise exception 'Outro usuário alterou esta ficha. Os dados serão atualizados; confira e tente novamente.' using errcode='40001'; end if;
  a := r.aluno; p := r.processo;
  if acao='excluir' then
    if ator->>'role' <> 'ADMIN' then raise exception 'Somente os administradores podem excluir cadastros.' using errcode='42501'; end if;
    insert into secretaria.exclusoes(matricula,ano,excluido_por) values(r.matricula,r.ano,(ator->>'id')::uuid);
    delete from secretaria.registros where id=aluno_id;
    return jsonb_build_object('excluido',aluno_id);
  end if;
  if a->>'situacao'='inativo' then raise exception 'Aluno arquivado: ficha disponível somente para consulta.'; end if;
  if acao='editar' then
    for chave in select jsonb_object_keys(dados) loop
      if chave not in ('nome','curso','turma','dataCadastroSponte','jaEstudouOutraInstituicao') then raise exception 'Campo não permitido: %',chave; end if;
    end loop;
    a := jsonb_strip_nulls(a || dados);
    perform secretaria.validar_dados(a);
    a := a || jsonb_build_object('nome',btrim(a->>'nome'),'curso',btrim(a->>'curso'));
    tipo_novo := secretaria.tipo(a->>'dataCadastroSponte');
    p := secretaria.revogar(p,ator,'Dados cadastrais alterados. É necessária uma nova conferência final.');
    if tipo_novo <> p->>'tipo' then
      p := secretaria.novo_processo(a,ator) || jsonb_build_object(
        'eventos',(p->'eventos') || jsonb_build_array(secretaria.evento(ator,'CADASTRAL','Classificação alterada. Checklist anterior preservado no histórico.')),
        'historicoAprovacoes',p->'historicoAprovacoes',
        'versoesAnteriores',coalesce(p->'versoesAnteriores','[]'::jsonb) || jsonb_build_array((p - 'versoesAnteriores') || jsonb_build_object('arquivadoEm',agora)));
    else
      for item in select value from jsonb_array_elements(p->'itens') loop
        aplic := secretaria.aplicabilidade(item->>'id',a);
        if aplic='obrigatorio' and item->>'aplicabilidade'<>'obrigatorio' then
          item := (item - 'marcadoEm' - 'marcadoPorId' - 'marcadoPorNome') || jsonb_build_object('concluido',false);
        end if;
        novos_itens := novos_itens || jsonb_build_array(item || jsonb_build_object('aplicabilidade',aplic));
      end loop;
      p := p || jsonb_build_object('itens',novos_itens,'eventos',(p->'eventos') || jsonb_build_array(secretaria.evento(ator,'CADASTRAL','Dados locais atualizados; aplicabilidade conferida novamente.')));
    end if;
  elsif acao='marcar' then
    if jsonb_typeof(dados->'valor') is distinct from 'boolean' then raise exception 'Marcação inválida.'; end if;
    valor := (dados->>'valor')::boolean;
    for item in select value from jsonb_array_elements(p->'itens') loop
      if item->>'id'=dados->>'itemId' then
        encontrou := true;
        if item->>'aplicabilidade'<>'obrigatorio' then raise exception 'Este item não está liberado para marcação.'; end if;
        if (item->>'concluido')::boolean=valor then return jsonb_build_object('aluno',a,'processo',p,'versao',r.versao); end if;
        item := item || jsonb_build_object('concluido',valor,'historico',(item->'historico') || jsonb_build_array(jsonb_build_object('valor',valor,'alteradoPorNome',ator->>'name','alteradoPorId',ator->>'id','alteradoEm',agora)));
        if valor then item := item || jsonb_build_object('marcadoPorNome',ator->>'name','marcadoPorId',ator->>'id','marcadoEm',agora); end if;
        p := p || jsonb_build_object('eventos',(p->'eventos') || jsonb_build_array(secretaria.evento(ator,'MARCACAO',(case when valor then 'Concluiu: ' else 'Desmarcou: ' end) || (item->>'rotulo'))));
        if not valor then p := secretaria.revogar(p,ator,'Etapa obrigatória desmarcada após aprovação.'); end if;
      end if;
      novos_itens := novos_itens || jsonb_build_array(item);
    end loop;
    if not encontrou then raise exception 'Etapa não encontrada.'; end if;
    p := p || jsonb_build_object('itens',novos_itens);
  elsif acao='aprovar' then
    if not secretaria.pode_aprovar(a,p) then raise exception 'Aprovação bloqueada: confira a validação no Sponte, a classificação e todas as etapas obrigatórias.'; end if;
    if p->>'aprovadoEm' is not null then return jsonb_build_object('aluno',a,'processo',p,'versao',r.versao); end if;
    p := p || jsonb_build_object('aprovadoEm',agora,'aprovadoPorId',ator->>'id','aprovadoPorNome',ator->>'name',
      'historicoAprovacoes',(p->'historicoAprovacoes') || jsonb_build_array(jsonb_build_object('acao','aprovado','atorNome',ator->>'name','atorId',ator->>'id','dataHora',agora)),
      'eventos',(p->'eventos') || jsonb_build_array(secretaria.evento(ator,'APROVACAO','Conferência final aprovada.')));
  else raise exception 'Operação não permitida.';
  end if;
  p := p || jsonb_build_object('estado',case when p->>'aprovadoEm' is not null then 'APROVADO' when secretaria.pode_aprovar(a,p) then 'AGUARDANDO_APROVACAO' else 'PENDENTE' end);
  update secretaria.registros set aluno=a,processo=p,versao=versao+1,atualizado_em=agora where id=aluno_id returning versao into nova_versao;
  return jsonb_build_object('aluno',a,'processo',p,'versao',nova_versao);
exception when unique_violation then raise exception 'Já existe um cadastro com esta matrícula no ano letivo.';
end $$;

create function public.secretaria_estado() returns jsonb language sql security invoker set search_path = '' as $$ select secretaria.estado(); $$;
create function public.secretaria_executar(acao text, aluno_id uuid default null, versao_esperada integer default null, dados jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path = '' as $$ select secretaria.executar(acao,aluno_id,versao_esperada,dados); $$;

revoke all on all functions in schema secretaria from public, anon, authenticated;
grant execute on function secretaria.estado(), secretaria.executar(text,uuid,integer,jsonb) to authenticated;
revoke all on function public.secretaria_estado(), public.secretaria_executar(text,uuid,integer,jsonb) from public, anon;
grant execute on function public.secretaria_estado(), public.secretaria_executar(text,uuid,integer,jsonb) to authenticated;
comment on function public.secretaria_executar is 'Comandos atômicos com ator autenticado, validação de domínio, controle de concorrência e exclusão exclusiva dos administradores.';

insert into secretaria.modelos(tipo,itens) values('NOVA_MATRICULA','[{"id":"nm_reserva","numero":1,"rotulo":"Ficha de reserva.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"nm_sponte","numero":2,"rotulo":"Cadastro Sponte.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"nm_lex","numero":3,"rotulo":"Cadastro Lex.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"nm_financeiro","numero":4,"rotulo":"Plano financeiro.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"nm_contrato","numero":5,"rotulo":"Assinatura digital do contrato.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"nm_imagem","numero":6,"rotulo":"Assinatura digital do uso de imagem.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"nm_requisicao","numero":7,"rotulo":"Assinatura digital da requisição de matrícula.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"nm_guia_pais","numero":8,"rotulo":"Assinatura digital do guia dos pais.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"nm_link_slm","numero":9,"rotulo":"Enviar link Lex para compra de SLM.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"nm_tellme","numero":10,"rotulo":"Enviar link TellMe.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"nm_whatsapp","numero":11,"rotulo":"Incluir na lista de WhatsApp da turma.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"nm_solic_financ","numero":12,"rotulo":"Enviar solicitação para o financeiro.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"nm_coord","numero":13,"rotulo":"Notificação à coordenação.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"nm_sec_acad","numero":14,"rotulo":"Envio de documentos para a Secretaria Acadêmica.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"nm_crm","numero":15,"rotulo":"Atualizar CRM.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"nm_material","numero":16,"rotulo":"Entregar mochila e chinook.","concluido":false,"aplicabilidade":"obrigatorio"}]'::jsonb);

insert into secretaria.modelos(tipo,itens) values('REMATRICULA','[{"id":"rem_saida","numero":1,"rotulo":"Ficha de autorização de saída do aluno.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"rem_matricula","numero":2,"rotulo":"Ficha de matrícula.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"rem_contrato","numero":3,"rotulo":"Contrato de prestação de serviços.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"rem_imagem","numero":4,"rotulo":"Autorização de uso de imagem.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"rem_reserva","numero":5,"rotulo":"Solicitação de reserva de vaga.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"rem_rg_cpf_aluno","numero":6,"rotulo":"Cópia do RG e CPF.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"rem_certidao","numero":7,"rotulo":"Cópia da certidão de nascimento do aluno.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"rem_vacinacao","numero":8,"rotulo":"Cópia da carteira de vacinação atualizada.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"rem_anamnese","numero":9,"rotulo":"Ficha de anamnese do aluno.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"rem_laudo_oftalmo","numero":10,"rotulo":"Laudo oftalmológico — para turmas a partir do JK.","concluido":false,"aplicabilidade":"a_confirmar"},{"id":"rem_laudo_audio","numero":11,"rotulo":"Laudo de audiometria — para turmas a partir do JK.","concluido":false,"aplicabilidade":"a_confirmar"},{"id":"rem_residencia","numero":12,"rotulo":"Comprovante de endereço, água ou luz — últimos 60 dias.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"rem_declaracao_transf","numero":13,"rotulo":"Declaração de transferência — quando o aluno já tiver estudado em outra instituição.","concluido":false,"aplicabilidade":"a_confirmar"},{"id":"rem_rg_cpf_resp","numero":14,"rotulo":"Cópia do RG e CPF dos responsáveis.","concluido":false,"aplicabilidade":"obrigatorio"},{"id":"rem_recebimento_guia","numero":15,"rotulo":"Declaração de recebimento do Guia dos Pais.","concluido":false,"aplicabilidade":"obrigatorio"}]'::jsonb);
