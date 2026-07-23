# SIG - Mapa do Banco de Dados (DB_MAP.md)

Este arquivo descreve a estrutura de tabelas, colunas, tipos de dados e relacionamentos do banco de dados Supabase do SIG. **Consulte este arquivo antes de escrever queries, inserts, updates ou deletes no projeto.**

---

## 🗄️ Esquema das Tabelas Principais (Schema: `public`)

### 1. `public.escolas`
Cadastro de escolas e unidades do município.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `nome`: `text` (NOT NULL)
*   `logo_url`: `text` (Nullable)
*   `plano`: `text` (Nullable)
*   `modulos_ativos`: `text[]` / `ARRAY` (Nullable)
*   `endereco`: `text` (Nullable)
*   `telefone`: `text` (Nullable)
*   `inep`: `text` (Nullable)
*   `tipo`: `text` (Default: 'MUNICIPAL', Nullable)
*   `ativo`: `boolean` (Default: true, Nullable)
*   `diretor_id`: `uuid` (Foreign Key -> `public.funcionarios.id`, Nullable)
*   `localizacao`: `text` (Nullable)
*   `assinatura_diretor_url`: `text` (Nullable)
*   `anexos_padrao`: `text[]` / `ARRAY` (Default: '{}'::text[], Nullable)
*   `codigo`: `integer` (NOT NULL)
*   `created_at`: `timestamp with time zone` (NOT NULL, Default: `timezone('utc'::text, now())`)
*   `deleted_at`: `timestamp with time zone` (Nullable)

### 2. `public.funcionarios`
Cadastro principal de servidores e servidores municipais.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `nome`: `text` (NOT NULL)
*   `email`: `text` (NOT NULL)
*   `auth_user_id`: `uuid` (Refere-se ao ID do usuário no `auth.users`, Nullable)
*   `primeiro_acesso`: `boolean` (Default: true, Nullable)
*   `is_superadmin`: `boolean` (Default: false, Nullable)
*   `status`: `text` (Default: 'ativo', Nullable)
*   `cargo`: `text` (Nome do cargo atual, Nullable)
*   `cpf`: `text` (Nullable)
*   `rg`: `text` (Nullable)
*   `nis`: `text` (Nullable)
*   `data_nascimento`: `date` (Nullable)
*   `foto_url`: `text` (Nullable)
*   `assinatura_url`: `text` (Nullable)
*   `formacao`: `text` (Nullable)
*   `latitude`, `longitude`: `numeric` (Coordenadas residenciais, Nullable)
*   `endereco`, `logradouro`, `numero`, `cep`, `bairro`, `cidade`, `uf_residencia`: `text`/`varchar` (Campos residenciais, Nullable)
*   `estado_civil`, `cor_raca`, `sexo`, `nacionalidade`, `nacionalidade_especificacao`, `municipio_nascimento`, `uf_nascimento`, `area_residencia`, `area_diferenciada`: `text` (Nullable)
*   `funcao_especifica`, `tipo_vinculo`, `tipo_vinculo_especificacao`: `text` (Nullable)
*   `possui_deficiencia`: `boolean` (Default: false, Nullable)
*   `deficiencias`: `text[]` / `ARRAY` (Nullable)
*   `tea`, `altas_habilidades`: `boolean` (Default: false, Nullable)
*   `doenca_diabetes`, `doenca_convulsoes`, `doenca_asma_bronquite`, `doenca_infeccoes`, `doenca_cardiopatias`, `doenca_alergias`, `doenca_covid19`, `doenca_articulares`: `boolean` (Default: false, Nullable)
*   `doenca_outra`: `text` (Nullable)
*   `escolaridade_nivel`, `ensino_medio_tipo`, `superior_area`, `superior_codigo`, `superior_instituicao`, `superior_grau`, `superior_tipo_instituicao`, `complementacao_pedagogica`: `text` (Nullable)
*   `superior_ano_conclusao`: `integer` (Nullable)
*   `pos_graduacoes`: `jsonb` (Default: '[]'::jsonb, Nullable)
*   `outros_cursos`: `text[]` / `ARRAY` (Nullable)
*   `doc_identidade_url`, `doc_cpf_url`, `doc_comprovante_residencia_url`, `doc_ensino_fundamental_url`, `doc_ensino_medio_url`, `doc_curso_superior_url`, `doc_pos_graduacao_url`, `doc_mestrado_url`, `doc_doutorado_url`: Documentos comprobatórios (Nullable)
*   `observacoes`: `text` (Nullable)
*   `data_preenchimento`: `date` (Nullable)
*   `created_at`: `timestamp with time zone` (NOT NULL, Default: `timezone('utc'::text, now())`)
*   `deleted_at`: `timestamp with time zone` (Nullable)

### 3. `public.vinculos_funcionarios`
Lotações e vínculos oficiais de funcionários em escolas.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `funcionario_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `cargo`: `text` (Nullable)
*   `ativo`: `boolean` (NOT NULL)
*   `data_inicio`: `date` (Nullable)
*   `data_fim`: `date` (Nullable)
*   `created_at`: `timestamp with time zone` (NOT NULL)

### 4. `public.acessos_usuarios`
Gestão de permissões de acesso baseadas em atributos (ABAC).
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `funcionario_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `orgao_id`: `uuid` (FK -> `public.orgaos.id`, Nullable)
*   `nivel`: `integer` (Nível de acesso hierárquico, NOT NULL)
*   `ativo`: `boolean` (Default: true, Nullable)
*   `cargos_gerenciados`: `text[]` / `ARRAY` (Filtro de cargos sob sua gestão, Nullable)
*   `pode_mural`, `pode_turmas`, `pode_funcionarios`, `pode_matriculas`, `pode_alunos`, `pode_ocorrencias`, `pode_atestados`: `boolean` (Default: false, Nullable)
*   `created_at`: `timestamp with time zone` (NOT NULL, Default: `timezone('utc'::text, now())`)

### 5. `public.alunos`
Cadastro geral de alunos.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `nome`: `text` (NOT NULL)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `turma_id`: `uuid` (FK -> `public.turmas.id`, Nullable)
*   `numero_matricula`: `text` (Nullable)
*   `foto_url`: `text` (Nullable)
*   `data_nascimento`: `date` (Nullable)
*   `cpf`, `rg`: `text` (Nullable)
*   `nis`, `inep`, `cartao_sus`: `text` (Nullable)
*   `certidao_nascimento`: `text` (Nullable)
*   `nome_mae`, `nome_pai`: `text` (Nullable)
*   `telefone`, `endereco`, `serie`: `text` (Nullable)
*   `latitude`, `longitude`: `numeric` (Coordenadas residenciais, Nullable)
*   `dados_matricula`: `jsonb` (Default: '{}'::jsonb, Nullable)
*   `codigo_temp_resp`: `text` (Código de acesso temporário para o Responsável pelo aluno, Nullable)
*   `codigo_temp_func`: `text` (Código de acesso temporário para funcionários, Nullable)
*   `codigo_temp_resp_criado_em`: `timestamp with time zone` (Data de expiração do código do Responsável, Nullable)
*   `codigo_temp_func_criado_em`: `timestamp with time zone` (Data de expiração do código do funcionário, Nullable)
*   `created_at`: `timestamp with time zone` (NOT NULL, Default: `timezone('utc'::text, now())`)
*   `deleted_at`: `timestamp with time zone` (Nullable)

### 6. `public.alunos_anexos`
Arquivos/Documentos anexados à ficha do aluno.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `aluno_id` : `uuid` (FK -> `public.alunos.id`, NOT NULL)
*   `nome`: `text` (Nome do anexo, e.g. "RG", NOT NULL)
*   `arquivo_url`: `text` (Caminho do storage do Supabase, NOT NULL)
*   `created_at`: `timestamp with time zone` (NOT NULL, Default: `now()`)
*   `deleted_at`: `timestamp with time zone` (Nullable)
*   `arquivado_por`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `motivo_arquivamento`: `text` (Nullable)

### 7. `public.turmas`
Definição de turmas e salas.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `nome`: `text` (e.g. "6 - A", NOT NULL)
*   `ano_letivo`: `integer` (NOT NULL)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `turno`: `text` (e.g. "Matutino", "Vespertino", Nullable)
*   `capacidade`: `integer` (Limite de alunos, Nullable)
*   `created_at`: `timestamp with time zone` (NOT NULL, Default: `timezone('utc'::text, now())`)
*   `deleted_at`: `timestamp with time zone` (Nullable)

### 8. `public.vinculos_turmas`
Enturmação (Alunos e Professores associados a Turmas).
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `funcionario_id`: `uuid` (FK -> `public.funcionarios.id`, NOT NULL)
*   `turma_id`: `uuid` (FK -> `public.turmas.id`, NOT NULL)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, NOT NULL)
*   `tipo`: `text` (e.g. "Aluno", "Professor", NOT NULL)
*   `created_at`: `timestamp with time zone` (NOT NULL, Default: `timezone('utc'::text, now())`)

### 9. `public.materias`
Matérias/Disciplinas curriculares.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `nome`: `text` (e.g. "Matemática", NOT NULL)
*   `base_curricular`: `text` (e.g. "BNCC", Nullable)
*   `turma_id`: `uuid` (FK -> `public.turmas.id`, Nullable)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `professor_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `created_at`: `timestamp with time zone` (NOT NULL, Default: `timezone('utc'::text, now())`)

### 10. `public.notas`
Lançamentos de avaliações por aluno, matéria e trimestre.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `aluno_id`: `uuid` (FK -> `public.alunos.id`, NOT NULL)
*   `materia_id`: `uuid` (FK -> `public.materias.id`, NOT NULL)
*   `turma_id`: `uuid` (FK -> `public.turmas.id`, NOT NULL)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, NOT NULL)
*   `unidade`: `integer` (Trimestre/Unidade de avaliação, NOT NULL)
*   `nota1`, `nota2`, `nota3`: `numeric` (Notas de atividades, provas e qualitativa, Nullable)
*   `created_at`: `timestamp with time zone` (NOT NULL, Default: `timezone('utc'::text, now())`)

### 11. `public.frequencias`
Registro de presença diária ou por aula de alunos.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `aluno_id`: `uuid` (FK -> `public.alunos.id`, NOT NULL)
*   `turma_id`: `uuid` (FK -> `public.turmas.id`, NOT NULL)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, NOT NULL)
*   `materia_id`: `uuid` (FK -> `public.materias.id`, Nullable)
*   `data`: `date` (NOT NULL)
*   `presenca`: `boolean` (true = presente, false = falta, NOT NULL)
*   `agenda_aula_id`: `uuid` (FK -> `public.agenda_aulas.id`, Nullable)
*   `created_at`: `timestamp with time zone` (NOT NULL, Default: `timezone('utc'::text, now())`)

### 12. `public.ocorrencias`
Histórico de ocorrências e incidentes dos estudantes.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `aluno_id`: `uuid` (FK -> `public.alunos.id`, Nullable)
*   `turma_id`: `uuid` (FK -> `public.turmas.id`, Nullable)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `tipo`: `text` (e.g. "Falta de Material", NOT NULL)
*   `gravidade`: `text` (e.g. "Leve", "Grave", Nullable)
*   `descricao`: `text` (NOT NULL)
*   `status_pais`: `text` (Status de leitura dos pais, Nullable)
*   `data`: `date` (NOT NULL)
*   `registrado_por`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `created_at`: `timestamp with time zone` (Nullable)

### 13. `public.atestados`
Controle de atestados de servidores da escola.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `funcionario_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `cid`: `text` (Código CID do atestado, NOT NULL)
*   `dias_afastamento`: `integer` (NOT NULL)
*   `data_inclusao`: `date` (Default: `CURRENT_DATE`, Nullable)
*   `status`: `text` (Default: 'Em Análise', Nullable)
*   `anexo_url`: `text` (URL do PDF/Comprovante no Storage, Nullable)
*   `anexo_nome`: `text` (Nome original do arquivo anexo, Nullable)
*   `created_at`: `timestamp with time zone` (Default: `now()`, Nullable)

### 14. `public.assinatura`
Assinaturas eletrônicas emitidas via QRCode.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `aluno_id`: `uuid` (FK -> `public.alunos.id`, Nullable)
*   `tipo_documento`: `text` (Default: 'comprovante_matricula', NOT NULL)
*   `token_verificacao`: `text` (Token criptográfico único, NOT NULL)
*   `hash_sha256`: `text` (Assinatura do payload do documento, NOT NULL)
*   `arquivo_pdf_url`: `text` (PDF assinado no Storage, Nullable)
*   `ip_responsavel`, `dispositivo_responsavel`, `user_agent_responsavel`, `data_responsavel`: Metadados da assinatura do responsável legal (Nullable)
*   `ip_funcionario`, `dispositivo_funcionario`, `user_agent_funcionario`, `data_funcionario`: Metadados da assinatura do funcionário emissor (Nullable)
*   `criado_em`: `timestamp with time zone` (Default: `now()`, Nullable)

### 15. `public.trash_bin`
Lixeira lógica para restauração e auditoria de exclusões.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `tenant_id`: `uuid` (Nullable)
*   `table_name`: `text` (Tabela original, e.g. "alunos", NOT NULL)
*   `record_id`: `uuid` (ID do registro excluído, NOT NULL)
*   `record_summary`: `text` (Texto amigável resumindo o item, NOT NULL)
*   `record_payload`: `jsonb` (Dump completo do registro em formato JSON, NOT NULL)
*   `deleted_by_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `deleted_by_name`: `text` (Nullable)
*   `deleted_by_email`: `text` (Nullable)
*   `deleted_at`: `timestamp with time zone` (Nullable)
*   `status`: `text` (Default: 'deleted', Nullable)
*   `resolution_note`: `text` (Justificativa de restauração, Nullable)

### 16. `public.grade_semanal`
Associação de horário de aulas, professores e turmas.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, NOT NULL)
*   `turma_id`: `uuid` (FK -> `public.turmas.id`, NOT NULL)
*   `materia_id`: `uuid` (FK -> `public.materias.id`, NOT NULL)
*   `dia_semana`: `smallint` (Dia da semana de 1 a 6, NOT NULL)
*   `ordem_aula`: `smallint` (Ordem/Período da aula, NOT NULL)
*   `ano_letivo`: `integer` (NOT NULL)
*   `ativo`: `boolean` (NOT NULL)
*   `created_at`: `timestamp with time zone` (NOT NULL, Default: `timezone('utc'::text, now())`)

### 17. `public.horarios_aulas_slots`
Definição dos turnos e horários de início e fim das aulas.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, NOT NULL)
*   `turno`: `text` (e.g. "Matutino", NOT NULL)
*   `ordem_aula`: `smallint` (Período de aula, NOT NULL)
*   `horario_inicio`: `time without time zone` (NOT NULL)
*   `horario_fim`: `time without time zone` (NOT NULL)
*   `created_at`: `timestamp with time zone` (NOT NULL, Default: `timezone('utc'::text, now())`)

### 18. `public.orgaos`
Setores e órgãos escolares internos.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `nome`: `text` (NOT NULL)
*   `tipo`: `text` (NOT NULL)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `ativo`: `boolean` (Default: true, Nullable)
*   `created_at`: `timestamp with time zone` (NOT NULL, Default: `timezone('utc'::text, now())`)

### 19. `public.pontos_ronda`
Pontos de interesse de segurança/ronda de vigilância física.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `funcionario_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `localizacao`: `jsonb` (Coordenadas e detalhes do local, NOT NULL)
*   `created_at`: `timestamp with time zone` (NOT NULL, Default: `timezone('utc'::text, now())`)

### 20. `public.blocked_ips`
Gerenciamento de IPs bloqueados preventivamente.
*   `ip_address`: `text` (Primary Key, NOT NULL)
*   `blocked_until`: `timestamp with time zone` (NOT NULL)
*   `reason`: `text` (Nullable)

### 21. `public.access_logs`
Logs brutos de acessos do proxy e roteadores.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `email`: `text` (Nullable)
*   `evento`: `text` (NOT NULL)
*   `ip_address`: `text` (Nullable)
*   `user_agent`: `text` (Nullable)
*   `detalhes`: `jsonb` (Nullable)
*   `created_at`: `timestamp with time zone` (NOT NULL, Default: `timezone('utc'::text, now())`)

### 22. `public.notifications`
Alertas in-app para usuários finais.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `tenant_id`: `uuid` (Nullable)
*   `user_id`: `uuid` (FK -> `auth.users.id`, NOT NULL)
*   `title`, `message`: `text` (NOT NULL)
*   `type`: `text` (Default: 'info', Nullable)
*   `link`: `text` (Nullable)
*   `read`: `boolean` (Default: false, Nullable)
*   `created_at`: `timestamp with time zone` (Default: `now()`, Nullable)
*   `grupo_id`: `uuid` (Nullable)
*   `processado_por`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `processado_por_nome`: `text` (Nullable)
*   `processado_em`: `timestamp with time zone` (Nullable)

### 23. `public.cargos`
Cargos e salários-base parametrizados.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `nome`: `text` (NOT NULL)
*   `nivel`: `integer` (Default: 1, Nullable)
*   `descricao`: `text` (Nullable)
*   `salario_base`: `numeric` (Nullable)
*   `ativo`: `boolean` (Default: true, Nullable)
*   `created_at`: `timestamp with time zone` (Default: `now()`, Nullable)
*   `deleted_at`: `timestamp with time zone` (Nullable)

### 24. `public.dispositivos`
Catálogo de relógios de ponto, coletores e hardware autorizados.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `nome`, `tipo`: `text` (NOT NULL)
*   `identificador`: `text` (Nullable)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `funcionario_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `status`: `text` (Default: 'ATIVO', Nullable)
*   `ultima_conexao`: `timestamp with time zone` (Nullable)
*   `created_at`: `timestamp with time zone` (Default: `now()`, Nullable)
*   `deleted_at`: `timestamp with time zone` (Nullable)

### 25. `public.veiculos`
Cadastro de veículos do transporte escolar.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `placa`, `modelo`: `text` (NOT NULL)
*   `capacidade`: `integer` (Default: 40, Nullable)
*   `motorista_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `status`: `text` (Default: 'ATIVO', Nullable)
*   `created_at`: `timestamp with time zone` (Default: `now()`, Nullable)

### 26. `public.rotas_transporte`
Gerenciamento de rotas de transporte escolar.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `nome`: `text` (NOT NULL)
*   `veiculo_id`: `uuid` (FK -> `public.veiculos.id`, Nullable)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `turno`: `text` (Default: 'MANHA', Nullable)
*   `pontos_parada`: `jsonb` (Default: '[]'::jsonb, Nullable)
*   `ativo`: `boolean` (Default: true, Nullable)
*   `created_at`: `timestamp with time zone` (Default: `now()`, Nullable)

### 27. `public.alunos_transporte`
Vinculação de alunos e rotas de transporte escolar.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `aluno_id`: `uuid` (FK -> `public.alunos.id`, Nullable)
*   `rota_id`: `uuid` (FK -> `public.rotas_transporte.id`, Nullable)
*   `ponto_embarque`: `text` (Nullable)
*   `created_at`: `timestamp with time zone` (Default: `now()`, Nullable)

### 28. `public.rotas_ronda`
Definição de trajetos para vigias e rondas noturnas.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `nome`: `text` (NOT NULL)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `funcionario_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `pontos_ronda`: `jsonb` (Default: '[]'::jsonb, Nullable)
*   `turno`: `text` (Default: 'NOITE', Nullable)
*   `ativo`: `boolean` (Default: true, Nullable)
*   `created_at`: `timestamp with time zone` (Default: `now()`, Nullable)

### 29. `public.registros_ronda`
Logs de checkpoints atingidos e incidentes de patrulha.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `rota_id`: `uuid` (FK -> `public.rotas_ronda.id`, Nullable)
*   `funcionario_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `ponto_nome`: `text` (Nullable)
*   `latitude`, `longitude`: `numeric` (Nullable)
*   `observacao`, `foto_url`: `text` (Nullable)
*   `registrado_em`: `timestamp with time zone` (Default: `now()`, Nullable)

### 30. `public.transferencias_alunos`
Controle de transferências escolares municipais.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `aluno_id`: `uuid` (FK -> `public.alunos.id`, NOT NULL)
*   `escola_origem_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `escola_destino_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `solicitante_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `motivo`: `text` (Nullable)
*   `fora_da_rede`: `boolean` (Default: false, Nullable)
*   `arquivos_anexos`: `jsonb` (Default: '[]'::jsonb, Nullable)
*   `ficha_snapshot`: `jsonb` (Nullable)
*   `status`: `text` (Default: 'PENDENTE', Nullable)
*   `resposta_texto`: `text` (Nullable)
*   `respondido_por`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `respondido_em`: `timestamp with time zone` (Nullable)
*   `created_at`: `timestamp with time zone` (Default: `now()`, Nullable)

### 31. `public.arquivados`
Histórico inativo migrado para conformidade e otimização.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `tipo`, `tabela_origem`, `motivo`: `text` (NOT NULL)
*   `referencia_id`: `uuid` (NOT NULL)
*   `arquivado_por`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `escola_origem_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `payload_completo`: `jsonb` (NOT NULL)
*   `arquivos_anexos`: `jsonb` (Default: '[]'::jsonb, Nullable)
*   `status`: `text` (Default: 'ARQUIVADO', Nullable)
*   `revertido_em`: `timestamp with time zone` (Nullable)
*   `revertido_por`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `excluido_por`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `excluido_em`: `timestamp with time zone` (Nullable)
*   `created_at`: `timestamp with time zone` (Default: `now()`, Nullable)

### 32. `public.bug_reports`
Chamados de bugs e melhorias enviadas ao superadmin.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `tipo`: `varchar` (Default: 'bug', NOT NULL)
*   `titulo`, `descricao`: `text` (NOT NULL)
*   `autor_nome`, `autor_email`, `escola`, `resposta_root`: `text` (Nullable)
*   `status`: `varchar` (Default: 'pendente', NOT NULL)
*   `created_at`: `timestamp with time zone` (Default: `now()`, Nullable)
*   `updated_at`: `timestamp with time zone` (Default: `now()`, Nullable)

### 33. `public.transacoes_financeiras`
Histórico do fluxo de caixa e finanças escolares.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `tipo`, `descricao`, `categoria`, `conta`: `text` (NOT NULL)
*   `valor`: `numeric` (NOT NULL)
*   `data`: `date` (NOT NULL)
*   `comprovante_url`: `text` (Nullable)
*   `created_at`: `timestamp with time zone` (Default: `now()`, Nullable)

### 34. `public.escalas_servico`
Controle de escala de vigilância e serviços.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `funcionario_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `data`: `date` (NOT NULL)
*   `turno`: `text` (NOT NULL)
*   `status`: `text` (Default: 'Pendente', Nullable)
*   `created_at`: `timestamp with time zone` (Default: `now()`, Nullable)

### 35. `public.movimentacoes_funcionarios`
Lançamentos de mudanças de lotação/cargo ou de portaria.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `funcionario_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `tipo`, `descricao`: `text` (NOT NULL)
*   `data`: `date` (NOT NULL)
*   `orgao_origem`, `orgao_destino`, `portaria`: `text` (Nullable)
*   `created_at`: `timestamp with time zone` (Default: `now()`, Nullable)

### 36. `public.solicitacoes_rh`
Central de chamados e solicitações de RH para funcionários.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `funcionario_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `tipo`, `motivo`: `text` (NOT NULL)
*   `status`: `text` (Default: 'Pendente', Nullable)
*   `data`: `date` (NOT NULL)
*   `created_at`: `timestamp with time zone` (Default: `now()`, Nullable)

### 37. `public.comunicados`
Informativos do mural da escola.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `title`, `body`, `target`: `text` (NOT NULL)
*   `date`: `date` (NOT NULL)
*   `criado_por`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `anexo_url`, `anexo_name`: `text` (Nullable)
*   `created_at`: `timestamp with time zone` (NOT NULL, Default: `timezone('utc'::text, now())`)

### 38. `public.performance_metrics`
Tempo de resposta de carregamento da aplicação para auditoria.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `funcionario_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `pathname`, `metric_name`, `rating`: `text` (NOT NULL)
*   `metric_value`: `numeric` (NOT NULL)
*   `connection_type`, `user_agent`: `text` (Nullable)
*   `device_memory`: `numeric` (Nullable)
*   `hardware_concurrency`: `integer` (Nullable)
*   `created_at`: `timestamp with time zone` (NOT NULL, Default: `timezone('utc'::text, now())`)

### 39. `public.recuperacoes_finais`
Lançamentos de Notas da Recuperação Final do Ano Letivo.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `aluno_id`: `uuid` (FK -> `public.alunos.id`, NOT NULL)
*   `turma_id`: `uuid` (FK -> `public.turmas.id`, NOT NULL)
*   `materia_id`: `uuid` (FK -> `public.materias.id`, NOT NULL)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, NOT NULL)
*   `nota`: `numeric` (NOT NULL)
*   `created_at`: `timestamp with time zone` (NOT NULL, Default: `timezone('utc'::text, now())`)

### 40. `public.solicitacoes_edicao_aluno`
Requisição de abertura da ficha cadastral para escrita/alterações.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `aluno_id`: `uuid` (FK -> `public.alunos.id`, Nullable)
*   `solicitante_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `justificativa`: `text` (NOT NULL)
*   `status`: `text` (Default: 'pendente', NOT NULL)
*   `aprovado_por`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `justificativa_resposta`: `text` (Nullable)
*   `criado_em`: `timestamp with time zone` (Default: `now()`, Nullable)
*   `respondido_em`: `timestamp with time zone` (Nullable)

### 41. `public.configuracao_notificacoes_niveis`
Configuração de entrega de notificações de acordo com nível/cargo.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `nivel`: `integer` (Nullable)
*   `cargo_pattern`, `tipo_notificacao`: `text` (Nullable)
*   `enviar_web`: `boolean` (Default: true, Nullable)
*   `created_at`: `timestamp with time zone` (Default: `now()`, Nullable)

### 42. `public.prazos_unidades`
Prazo limite de digitação e alteração de notas de avaliações por unidade.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `unidade`: `integer` (NOT NULL)
*   `data_limite`: `date` (NOT NULL)
*   `created_at`: `timestamp with time zone` (Default: `now()`, Nullable)

### 43. `public.transferencias_funcionarios`
Gerenciamento de movimentações internas de funcionários da rede.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `funcionario_id`: `uuid` (FK -> `public.funcionarios.id`, NOT NULL)
*   `escola_origem_id`: `uuid` (FK -> `public.escolas.id`, NOT NULL)
*   `escola_destino_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `solicitante_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `motivo`: `text` (Nullable)
*   `fora_da_rede`: `boolean` (Default: false, Nullable)
*   `status`: `text` (Default: 'PENDENTE', Nullable)
*   `resposta_texto`: `text` (Nullable)
*   `respondido_por`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `respondido_em`: `timestamp with time zone` (Nullable)
*   `ficha_snapshot`, `arquivos_anexos`: `jsonb` (Nullable)
*   `lotacao_id`: `uuid` (Nullable)
*   `created_at`: `timestamp with time zone` (Default: `now()`, Nullable)

### 44. `public.atividades_secretaria`
Entregas oficiais de diários/planejamentos à secretaria escolar.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, NOT NULL)
*   `turma_id`: `uuid` (FK -> `public.turmas.id`, NOT NULL)
*   `materia_id`: `uuid` (FK -> `public.materias.id`, Nullable)
*   `professor_id`: `uuid` (FK -> `public.funcionarios.id`, NOT NULL)
*   `titulo`: `text` (NOT NULL)
*   `observacoes`: `text` (Nullable)
*   `data_aplicacao`: `date` (NOT NULL)
*   `trimestre`: `integer` (Nullable)
*   `ano_letivo`: `integer` (Default: EXTRACT(year FROM now()), NOT NULL)
*   `arquivo_url`, `arquivo_nome`, `arquivo_tipo`: `text` (Nullable)
*   `status`: `text` (Default: 'recebida', NOT NULL)
*   `updated_by`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `created_at`: `timestamp with time zone` (Default: `now()`, Nullable)
*   `updated_at`: `timestamp with time zone` (Default: `now()`, Nullable)

### 45. `public.atividades_secretaria_historico`
Rastro e auditoria das entregas de atividades de diários.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `atividade_id`: `uuid` (FK -> `public.atividades_secretaria.id`, NOT NULL)
*   `status_anterior`: `text` (Nullable)
*   `status_novo`: `text` (NOT NULL)
*   `alterado_por`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `alterado_por_nome`: `text` (Nullable)
*   `alterado_em`: `timestamp with time zone` (Default: `now()`, Nullable)

### 46. `public.grade_curricular_escola`
Grade de disciplinas e componentes obrigatórios por escola.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, NOT NULL)
*   `nome`, `base_curricular`: `text` (NOT NULL)
*   `created_at`: `timestamp with time zone` (NOT NULL, Default: `now()`)

### 47. `public.agenda_aulas`
Aulas criadas e lançamentos dinâmicos diários.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `uuid_generate_v4()`)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, NOT NULL)
*   `turma_id`: `uuid` (FK -> `public.turmas.id`, NOT NULL)
*   `materia_id`: `uuid` (FK -> `public.materias.id`, NOT NULL)
*   `professor_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `grade_semanal_id`: `uuid` (FK -> `public.grade_semanal.id`, Nullable)
*   `data`: `date` (NOT NULL)
*   `horario_inicio`, `horario_fim`: `time without time zone` (NOT NULL)
*   `status`: `text` (Default: 'normal', NOT NULL)
*   `data_original`: `date` (Nullable)
*   `horario_original_inicio`: `time without time zone` (Nullable)
*   `observacao`: `text` (Nullable)
*   `created_at`: `timestamp with time zone` (NOT NULL, Default: `timezone('utc'::text, now())`)

### 48. `public.folha_pagamento_config`
Configurações corporativas de folha de pagamento por unidade.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `dia_fechamento`: `integer` (NOT NULL)
*   `observacoes`: `text` (Nullable)
*   `atualizado_por`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `updated_at`: `timestamp with time zone` (Default: `now()`, Nullable)

### 49. `public.desligamentos_programados`
Previsão e agendamentos de desligamentos e demissões programadas.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `funcionario_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `vinculo_id`: `uuid` (FK -> `public.vinculos_funcionarios.id`, Nullable)
*   `data_desligamento`: `date` (NOT NULL)
*   `motivo`: `text` (Nullable)
*   `status`: `text` (Default: 'programado', NOT NULL)
*   `programado_por`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `created_at`: `timestamp with time zone` (Default: `now()`, Nullable)

### 50. `public.adicionais_salario`
Lançamentos de gratificações e acréscimos na folha.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `funcionario_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `descricao`: `text` (NOT NULL)
*   `valor`: `numeric` (NOT NULL)
*   `tipo`: `text` (Default: 'fixo', NOT NULL)
*   `mes_referencia`, `ano_referencia`: `integer` (Nullable)
*   `ativo`: `boolean` (Default: true, Nullable)
*   `criado_por`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `created_at`: `timestamp with time zone` (Default: `now()`, Nullable)

### 51. `public.alunos_ativos`
View auxiliar contendo apenas os alunos matriculados não deletados logicamente.
*(Estrutura espelho parcial da tabela `public.alunos`)*

### 52. `public.configuracoes_rede`
Parâmetros e dados gerais da Secretaria de Educação e da rede municipal.
*   `id`: `uuid` (Primary Key, NOT NULL, Default: `gen_random_uuid()`)
*   `secretario_educacao`: `text` (Nome do titular da Secretaria, NOT NULL, Default: 'MARCUS ALANO CORREIA OLIVEIRA')
*   `cargo_secretario`: `text` (Título do cargo, Default: 'Secretário(a) de Educação', Nullable)
*   `nome_rede`: `text` (Nome do órgão da rede, Default: 'Secretaria Municipal de Educação de Sapeaçu', Nullable)
*   `updated_at`: `timestamp with time zone` (Default: `now()`, Nullable)

