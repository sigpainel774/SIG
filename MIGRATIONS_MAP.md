# SIG - Mapa Oficial de Migrations SQL (MIGRATIONS_MAP.md)

Este arquivo descreve o histórico completo e a finalidade de todas as migrations SQL do Supabase localizadas em `supabase/migrations/`. **Consulte este arquivo antes de criar, aplicar ou modificar qualquer migration ou script SQL no banco de dados.**

---

## 📜 Regras de Manutenção de Migrations

1. **Nomeclatura Padronizada:** Toda nova migration DEVE utilizar o prefixo timestamp `YYYYMMDDHHMMSS_nome_descritivo.sql` (ex: `20260802000000_exemplo.sql`).
2. **Idempotência:** Scripts SQL devem ser seguros para re-execução (usar `CREATE TABLE IF NOT EXISTS`, `DROP FUNCTION IF EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
3. **Imutabilidade de Produção:** Nunca edite um arquivo de migration antigo já aplicado em produção. Em vez disso, crie um novo arquivo de migration para aplicar alterações subsequentes.
4. **Registro Obrigatório:** Ao criar ou modificar migrations, este arquivo (`MIGRATIONS_MAP.md`) DEVE ser atualizado imediatamente.

---

## 🗺️ Inventário Completo de Migrations (68 Arquivos)

| # | Arquivo / Migration | Data / Prefixo | Propósito & Descrição | Tabelas / Entidades Afetadas | RLS / Segurança |
|---|---------------------|----------------|-----------------------|------------------------------|-----------------|
| 01 | `009_indexes_docentes_kpis.sql` | Legado | Criação de índices para consultas rápidas de docentes e KPIs por turma. | `vinculos_turmas`, `funcionarios` | Performance |
| 02 | `055_dashboard_metrics_rpc.sql` | Legado | Funções RPC para agregação rápida de métricas na dashboard principal. | `alunos`, `turmas`, `ocorrencias` | `SECURITY DEFINER` |
| 03 | `20260703000000_initial_schema.sql` | 2026-07-03 | Schema base do sistema (escolas, funcionarios, alunos, turmas, vinculos). | Tabelas principais do schema `public` | RLS Enable + Policies |
| 04 | `20260703000001_storage_buckets.sql` | 2026-07-03 | Inicialização dos buckets públicos e privados no Supabase Storage. | `storage.buckets`, `storage.objects` | Public & Authenticated |
| 05 | `20260703000002_auto_user_trigger.sql` | 2026-07-03 | Trigger para vinculação automática do `auth.users.id` com `funcionarios.auth_user_id`. | `auth.users`, `public.funcionarios` | Trigger System |
| 06 | `20260703000003_alunos_extended.sql` | 2026-07-03 | Expansão de colunas em `alunos` (saúde, documentos, contatos e filiação). | `public.alunos` | Mantém RLS |
| 07 | `20260703000004_cargos.sql` | 2026-07-03 | Tabela de parametrização de cargos, níveis e salários base da rede municipal. | `public.cargos` | `dev_all_authenticated` |
| 08 | `20260705000000_bug_reports.sql` | 2026-07-05 | Tabela para envio de chamados, suporte e bug reports ao Superadmin. | `public.bug_reports` | Authenticated Insert/Select |
| 09 | `20260706000000_add_deleted_at_to_cargos.sql` | 2026-07-06 | Coluna `deleted_at` para soft delete na tabela `cargos`. | `public.cargos` | Filter `deleted_at IS NULL` |
| 10 | `20260706000001_add_deleted_at_to_dispositivos.sql` | 2026-07-06 | Coluna `deleted_at` em `dispositivos` de ponto biométrico/coleta. | `public.dispositivos` | Soft delete |
| 11 | `20260706000002_lotacoes_schema.sql` | 2026-07-06 | Estruturação de vínculos e lotações de servidores nas escolas. | `public.vinculos_funcionarios` | RLS por Escola |
| 12 | `20260706000003_mural_optimizations.sql` | 2026-07-06 | Índices por data e destino na tabela `comunicados` do mural escolar. | `public.comunicados` | Performance |
| 13 | `20260706000004_permissions_reformulation.sql` | 2026-07-06 | Reformulação do modelo de permissões ABAC por nível e cargo. | `public.acessos_usuarios` | ABAC granular |
| 14 | `20260707000000_sync_diretor_permissions.sql` | 2026-07-07 | Sincronização automática de acessos de Diretor ao vincular funcionário à escola. | `public.acessos_usuarios`, `escolas` | Trigger / Security Definer |
| 15 | `20260707000001_create_student_buckets.sql` | 2026-07-07 | Bucket privado `anexos-alunos` com políticas de leitura/escrita restritas. | `storage.buckets`, `storage.objects` | Restricted RLS |
| 16 | `20260707000002_add_coords_to_alunos.sql` | 2026-07-07 | Colunas `latitude` e `longitude` em `alunos` para geolocalização e mapas. | `public.alunos` | Dados numéricos |
| 17 | `20260707000003_performance_metrics.sql` | 2026-07-07 | Tabela `performance_metrics` para telemetria Web Vitals e tempo de resposta. | `public.performance_metrics` | Insert Authenticated |
| 18 | `20260707000004_add_turno_capacidade_to_turmas.sql` | 2026-07-07 | Campos `turno` e `capacidade` na tabela de turmas escolares. | `public.turmas` | Schema Update |
| 19 | `20260707000005_create_materias_table.sql` | 2026-07-07 | Tabela `materias` vinculando disciplinas, turmas e professores. | `public.materias` | RLS por Escola |
| 20 | `20260707000006_fix_turmas_update_policy.sql` | 2026-07-07 | Correção de política RLS para permitir edições de turmas por gestores. | `public.turmas` | RLS Update Policy |
| 21 | `20260708000000_create_frequencias_and_notas.sql` | 2026-07-08 | Tabelas centrais de lançamentos de diário: `frequencias` e `notas`. | `public.frequencias`, `public.notas` | RLS por Professor/Escola |
| 22 | `20260708000001_update_funcionarios_schema.sql` | 2026-07-08 | Extensão completa dos campos de RH, formação e documentos em `funcionarios`. | `public.funcionarios` | RH Schema |
| 23 | `20260708000002_alunos_temp_signatures.sql` | 2026-07-08 | Códigos de acesso temporários para assinatura de comprovantes. | `public.alunos` | Validation tokens |
| 24 | `20260708000003_add_diretor_signature.sql` | 2026-07-08 | Colunas de URL de assinatura do diretor na tabela `escolas`. | `public.escolas` | Assinatura digital |
| 25 | `20260708000004_alunos_anexos_and_archiving.sql` | 2026-07-08 | Tabela `alunos_anexos` e histórico de arquivamento de documentos. | `public.alunos_anexos`, `arquivados` | Multi-anexo RLS |
| 26 | `20260709000000_fix_diretor_rls_function.sql` | 2026-07-09 | Função `is_diretor` com `SECURITY DEFINER` para evitar recursão em RLS. | `public.escolas`, `acessos_usuarios` | Prevent Infinite Recursion |
| 27 | `20260709000001_fix_student_signatures_rls.sql` | 2026-07-09 | Liberação de leitura anônima para validação de QR Code de estudantes. | `public.alunos` | Public read on verification |
| 28 | `20260709000002_log_signature_history.sql` | 2026-07-09 | Tabela de auditoria de assinaturas de documentos com hash SHA256. | `public.assinatura` | Auditoria |
| 29 | `20260709231000_fix_signature_rls_flow.sql` | 2026-07-09 | Política de `UPDATE` com `WITH CHECK (true)` para assinatura mobile anônima. | `public.alunos` | Mobile validation RLS |
| 30 | `20260710000000_create_recuperacoes_finais.sql` | 2026-07-10 | Tabela `recuperacoes_finais` para notas e médias do conselho final. | `public.recuperacoes_finais` | RLS Lançamento Final |
| 31 | `20260710022000_update_trigger_log_signature_timestamp.sql` | 2026-07-10 | Trigger de atualização de timestamp no log auditável de assinaturas. | `public.assinatura` | Trigger Timestamp |
| 32 | `20260710023500_add_assinatura_url_to_funcionarios.sql` | 2026-07-10 | Coluna `assinatura_url` na tabela `funcionarios`. | `public.funcionarios` | Assinatura Servidor |
| 33 | `20260710030000_create_assinatura_table.sql` | 2026-07-10 | Tabela oficial de tokens criptográficos e chancelas de QR Code. | `public.assinatura` | Cryptographic Verification |
| 34 | `20260710203500_add_anexos_padrao_to_escolas.sql` | 2026-07-10 | Campo `anexos_padrao` em `escolas` para lista de documentos exigidos na matrícula. | `public.escolas` | Configuração Matrícula |
| 35 | `20260710204800_notifications_settings_and_deadlines.sql` | 2026-07-10 | Tabelas `configuracao_notificacoes_niveis` e `prazos_unidades` para prazos de digitação. | `configuracao_notificacoes_niveis`, `prazos_unidades` | Parametrização |
| 36 | `20260711000000_transferencias_funcionarios.sql` | 2026-07-11 | Tabela de movimentação e transferência de servidores entre escolas da rede. | `public.transferencias_funcionarios` | Fluxo de Transferência |
| 37 | `20260712000000_central_avaliacoes.sql` | 2026-07-12 | RPCs e estruturas para lançamento unificado de notas por trimestre e matéria. | `public.notas`, `public.materias` | Central de Lançamentos |
| 38 | `20260713000000_multi_lotacao_transfer_request.sql` | 2026-07-13 | Suporte a transferência multi-lotação com snapshots cadastrais de servidores. | `public.transferencias_funcionarios` | Snapshots JSONB |
| 39 | `20260714000000_grade_horaria_and_professor_kpis.sql` | 2026-07-14 | Tabelas `grade_semanal` e `horarios_aulas_slots` para matriz curricular da escola. | `grade_semanal`, `horarios_aulas_slots` | Matriz Curricular |
| 40 | `20260714000000_superadmin_jwt_claim.sql` | 2026-07-14 | Injeção de custom claim `is_superadmin` nos tokens JWT do Supabase Auth. | `auth.users`, Custom Claims | Bypass de Segurança |
| 41 | `20260714000001_performance_indexes.sql` | 2026-07-14 | Índices B-Tree compostos em `alunos(escola_id, turma_id)` e `frequencias`. | Várias tabelas | Performance SQL |
| 42 | `20260714010000_add_integral_shift_to_slots.sql` | 2026-07-14 | Suporte ao turno 'Integral' na tabela `horarios_aulas_slots`. | `public.horarios_aulas_slots` | Shift Support |
| 43 | `20260714020000_performance_dashboard_rpc.sql` | 2026-07-14 | RPC `obter_metricas_performance` para auditoria de velocidade e latência web. | `public.performance_metrics` | `SECURITY DEFINER` |
| 44 | `20260714030000_restrict_aluno_escola_id_update.sql` | 2026-07-14 | RLS restritiva impedindo a alteração direta de `escola_id` sem transferência oficial. | `public.alunos` | Proteção de Dados |
| 45 | `20260715000000_student_enrollment_number.sql` | 2026-07-15 | Função de geração de número de matrícula sequencial por ano/escola. | `public.alunos` | Sequencial Único |
| 46 | `20260718000000_enable_security_invoker_on_performance_views.sql` | 2026-07-18 | Habilitação de `security_invoker = true` em views estatísticas do banco. | Views de estatísticas | Postgres Security |
| 47 | `20260723000000_sessoes_ativas.sql` | 2026-07-23 | Tabela de rastreamento e encerramento remoto de sessões de usuário ativas. | `public.access_logs` | Auditoria de Sessão |
| 48 | `20260723162000_unidade_diretor_unico.sql` | 2026-07-23 | Constraint de unicidade impedindo múltiplos diretores ativos na mesma escola. | `public.escolas`, `vinculos_funcionarios` | Validação de Regra de Negócio |
| 49 | `20260724000000_secure_perf_and_audit_rls.sql` | 2026-07-24 | Restrição de leitura de logs de auditoria e performance apenas a Superadmins. | `public.audit_logs`, `performance_metrics` | Superadmin RLS |
| 50 | `20260725000000_dashboard_and_boletim_rpcs.sql` | 2026-07-25 | RPCs `obter_boletim_aluno_completo` e consolidadores da dashboard administrativa. | `public.notas`, `frequencias`, `alunos` | RPC Consolidadora |
| 51 | `20260725000000_permissoes_granulares_secretaria.sql` | 2026-07-25 | Tabela `atividades_secretaria` e histórico de entregas pedagógicas dos diários. | `atividades_secretaria`, `atividades_secretaria_historico` | Controle de Entregas |
| 52 | `20260729000000_relatorio_servidores_rpc.sql` | 2026-07-29 | RPC `obter_relatorio_servidores_completo` para geração de relatórios de RH. | `public.funcionarios`, `vinculos_funcionarios` | Relatório RH JSON |
| 53 | `20260730000000_fix_dashboard_rpcs_security.sql` | 2026-07-30 | Correção de segurança com validação `auth.uid()` em `obter_admin_dashboard_kpis` e `obter_multi_escolas_stats`. | RPCs da Dashboard | Blindagem contra Acesso Não Autorizado |
| 54 | `20260802000000_fix_birthdays_rpc_foto_url.sql` | 2026-08-02 | Atualização da RPC `get_birthdays_of_month` incluindo `foto_avatar_path` e `foto_visualizacao_path`. | `public.funcionarios`, `public.alunos` | Suporte a Fotos de Avatar |
| 55 | `20260802000001_make_fotos_originais_bucket_public.sql` | 2026-08-02 | Configuração do bucket `fotos-originais` como Privado (`public = false`) para conformidade LGPD. | `storage.buckets` | Proteção de Privacidade LGPD |
| 56 | `20260802150000_secretarias_e_cargos.sql` | 2026-08-02 | Cria tabela `secretarias`, migra os dados da secretaria atual, e atualiza as RLS de `performance_metrics` e `audit_logs` para corrigir os erros silenciosos. Também vincula secretarias a cargos. | `public.secretarias`, `public.cargos`, `public.acessos_usuarios` | RLS e ABAC Atualizados |
| 57 | `20260802160000_add_secretaria_id_to_escolas.sql` | 2026-08-02 | Adiciona a coluna `secretaria_id` na tabela `public.escolas` e vincula escolas existentes à Secretaria Municipal de Educação. | `public.escolas`, `public.secretarias` | Coluna FK adicionada |
| 58 | `20260802200000_fix_secretarias_rls.sql` | 2026-08-02 | Correção das políticas RLS da tabela `secretarias`: remove policy `FOR ALL` que conflitava com `FOR SELECT`, e recria políticas separadas por operação (SELECT, INSERT, UPDATE, DELETE). A policy de leitura agora usa `is_superadmin_by_uid()` OR `tem_acesso_a_secretaria(id)` para garantir acesso correto ao superadmin root e ao usuário nível 1. | `public.secretarias` | RLS Corrigida — Superadmin + Nível 1 |
| 59 | `20260803000000_add_historico_to_alunos.sql` | 2026-08-03 | Adiciona a coluna `historico` do tipo `text` na tabela `public.alunos` para armazenar o histórico do aluno. | `public.alunos` | Mantém RLS Existente |
| 60 | `20260803020000_add_dados_documento_to_assinatura.sql` | 2026-08-03 | Adiciona a coluna `dados_documento` (`jsonb`) na tabela `public.assinatura` para persistência dos textos de ofícios e documentos. | `public.assinatura` | Mantém RLS Existente |
| 61 | `20260803223000_comunicados_isolamento_secretaria.sql` | 2026-08-03 | Cria tabela comunicados_lidos, adiciona secretaria_id em comunicados e atualiza RPC get_birthdays_of_month para filtrar por secretaria_id. | public.comunicados_lidos, public.comunicados | Isolamento de Contexto |
| 62 | `20260804000000_create_emaee_schema.sql` | 2026-08-04 | Cria as tabelas específicas para a matrícula clínica e prontuários do EMAEE, vinculando especialidades, evoluções diárias de saúde, RLS e solicitações pedagógicas às escolas da rede municipal. | `emaee_matriculas`, `emaee_especialidades_vinculadas`, `emaee_evolucoes`, `emaee_solicitacoes_relatorios` | `dev_all_authenticated` |
| 63 | `20260805001500_update_birthdays_of_month.sql` | 2026-08-05 | Atualiza RPC `get_birthdays_of_month` para unificar lógica de secretarias e EMAEE | `funcionarios`, `alunos`, `emaee_matriculas`, `escolas`, `vinculos_funcionarios` | RLS Existente |
| 64 | `20260805100000_salvaguardas_secretarias.sql` | 2026-08-05 | Adiciona `modulos_ativos` em `secretarias`, reescreve controle `tem_acesso_a_escola` p/ Nível 1, blinda cargos e comunicados por secretaria | `secretarias`, `cargos`, `comunicados` e funções RLS associadas | Salvaguardas RLS |
| 65 | `20260805120000_fix_escolas_rls.sql` | 2026-08-05 | Separa policy ALL da tabela escolas em INSERT/UPDATE/DELETE. Previne infinite recursion no PostgREST SELECT da tela de listagem de unidades e postos de saúde. | `escolas` (policies) | Proteção Recursão RLS |
| 66 | `20260805191500_encaminhamentos_emaee.sql` | 2026-08-05 | Adiciona `tipo_movimentacao` em `transferencias_alunos`, colunas de anexos de requerimento em `emaee_matriculas` e RPC `solicitar_encaminhamento_emaee` para encaminhamento direto da escola para a fila do EMMAE com notificação aos usuários Nível 2 do EMMAE. | `transferencias_alunos`, `emaee_matriculas`, `acessos_usuarios` | `SECURITY DEFINER` + RLS |
| 67 | `20260805202000_update_emaee_matriculas_prototype_fields.sql` | 2026-08-05 | Adiciona colunas complementares para a Ficha AEE 2026 (`outros_transtornos`, `assinatura_responsavel_matricula_url`, `assinatura_responsavel_aluno_url` em `emaee_matriculas` e `uf_nascimento`, `municipio_nascimento`, `zona_residencial` em `alunos`). | `emaee_matriculas`, `alunos` | `dev_all_authenticated` / Mantém RLS |
| 68 | `20260805235000_add_profissional_details_to_emaee_evolucoes.sql` | 2026-08-05 | Adiciona coluna `registro_profissional` na tabela `funcionarios` e colunas `profissional_nome`/`profissional_registro` na tabela `emaee_evolucoes`. | `funcionarios`, `emaee_evolucoes` | `dev_all_authenticated` / Mantém RLS |
| 69 | `20260806000000_add_tipo_to_alunos_anexos.sql` | 2026-08-06 | Adiciona coluna "tipo" na tabela "alunos_anexos" para categorização de arquivos (Laudos, Documentos Pessoais, Outros). | `public.alunos_anexos` | `dev_all_authenticated` / Mantém RLS |
| 70 | `20260807200000_add_is_profissional_aee_to_funcionarios.sql` | 2026-08-07 | Adiciona a coluna `is_profissional_aee` na tabela `funcionarios` para identificação dos Profissionais AEE no EMAEE. | `public.funcionarios` | Mantém RLS |
| 71 | `20260807210000_controles_globais_rede.sql` | 2026-08-07 | Adiciona `permitir_mensagens_globais` em `funcionarios` e `bloquear_edicao_funcionarios_rede` em `configuracoes_rede`. | `funcionarios`, `configuracoes_rede` | Mantém RLS |
| 72 | `20260811000000_add_permissao_rh_rede.sql` | 2026-08-11 | Adiciona coluna `pode_rh_rede` em `acessos_usuarios` e atualiza política RLS de consulta em `funcionarios`. | `acessos_usuarios`, `funcionarios` | RLS de Consulta RH da Rede |
| 73 | `20260811120000_informacoes_avancadas_acessos.sql` | 2026-08-11 | Tabelas `user_navigation_trail` e `ip_geolocation_cache`, índices e RPCs `get_all_active_sessions_admin`, `revoke_any_user_session_admin`, `get_daily_login_history_admin` e `get_user_navigation_trail_admin`. | `user_navigation_trail`, `ip_geolocation_cache`, `access_logs`, `auth.sessions` | `SECURITY DEFINER` + RLS |
| 74 | `20260811150000_fix_level3_and_school_access_rls.sql` | 2026-08-11 | Atualização de `tem_acesso_a_escola`, `pode_ler_funcionario` e RLS `funcionarios_escrita`/`funcionarios_update` para suporte pleno a Nível 3 (Secretário Escolar) e Nível 2 (Diretor) via `acessos_usuarios`. | `funcionarios`, `acessos_usuarios`, `vinculos_funcionarios` | `SECURITY DEFINER` + RLS Nível 3 |
| 75 | `20260812000000_create_backup_registros.sql` | 2026-08-12 | Tabela `backup_registros` para gestão documental e auditoria de backups do sistema SIG. | `public.backup_registros` | RLS Superadmin Only |
| 76 | `20260812003000_abac_rls_production.sql` | 2026-08-12 | Remoção da policy `dev_all_authenticated` de 43 tabelas e implantação do RLS de produção em camadas ABAC. | Todas as tabelas `public` | RLS ABAC + Security Definer |
| 77 | `20260812010000_fix_sec_tables_rls.sql` | 2026-08-12 | Aplicação de políticas RLS de leitura e escrita para usuários autenticados nas 45 tabelas operacionais/secundárias (anexos, ocorrências, transferências, atestados, EMAEE, etc.), com restrição de auditoria em `trash_bin` e `access_logs`. | 45 tabelas operacionais do schema `public` | RLS Authenticated / Superadmin |
| 78 | `20260812013000_fix_comunicacao_notifications_rls.sql` | 2026-08-12 | Correção das RLS de comunicação e chancelas: adiciona política INSERT em `notifications` e `assinatura` para usuários autenticados e função `pode_publicar_comunicado` para publicação no mural em `comunicados`. | `public.notifications`, `public.comunicados`, `public.assinatura` | `SECURITY DEFINER` + Authenticated Insert |
| 79 | `20260813000000_add_is_conta_eja_to_funcionarios.sql` | 2026-08-13 | Adiciona a coluna `is_conta_eja` em `funcionarios`, cria a função `is_conta_eja_by_uid()` e atualiza as RLS de `escolas`, `alunos` e `turmas` para permitir acesso das Contas Especiais EJA. | `public.funcionarios`, `public.escolas`, `public.alunos`, `public.turmas` | `SECURITY DEFINER` + EJA RLS |
| 80 | `20260812210000_fix_daily_login_history_rpc.sql` | 2026-08-12 | Atualiza a RPC `get_daily_login_history_admin` para consultar `user_navigation_trail` (em vez de `access_logs`), unificando logins diários, funcionários, sessões, tempo de tela e geolocalização. | `user_navigation_trail`, `funcionarios`, `auth.users`, `ip_geolocation_cache` | `SECURITY DEFINER` |
| 81 | `20260812220000_update_navigation_trail_rpc_filters.sql` | 2026-08-12 | Atualiza a RPC `get_user_navigation_trail_admin` com suporte a filtro por data (início/fim), busca por nome de usuário/tela e limite expandido. | `user_navigation_trail`, `funcionarios` | `SECURITY DEFINER` |









