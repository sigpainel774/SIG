# SIG - Mapa do Banco de Dados (DB_MAP.md)

Este arquivo descreve a estrutura de tabelas, colunas, tipos de dados e relacionamentos do banco de dados Supabase do SIG. **Consulte este arquivo antes de escrever queries, inserts, updates ou deletes no projeto.**

---

## 🗄️ Esquema das Tabelas Principais (Schema: `public`)

### 1. `public.escolas`
Cadastro de escolas e unidades do município.
*   `id`: `uuid` (Primary Key, NOT NULL)
*   `nome`: `text` (NOT NULL)
*   `logo_url`: `text` (Nullable)
*   `plano`: `text` (Nullable)
*   `modulos_ativos`: `text[]` / `ARRAY` (Nullable)
*   `endereco`: `text` (Nullable)
*   `telefone`: `text` (Nullable)
*   `inep`: `text` (Nullable)
*   `tipo`: `text` (Nullable)
*   `ativo`: `boolean` (Default: true, Nullable)
*   `diretor_id`: `uuid` (Foreign Key -> `public.funcionarios.id`, Nullable)
*   `assinatura_diretor_url`: `text` (Nullable)
*   `anexos_padrao`: `text[]` / `ARRAY` (Nullable)
*   `codigo`: `integer` (NOT NULL)
*   `created_at`: `timestamp with time zone` (NOT NULL)
*   `deleted_at`: `timestamp with time zone` (Nullable)

### 2. `public.funcionarios`
Cadastro principal de servidores e servidores municipais.
*   `id`: `uuid` (Primary Key, NOT NULL)
*   `nome`: `text` (NOT NULL)
*   `email`: `text` (NOT NULL)
*   `auth_user_id`: `uuid` (Refere-se ao ID do usuário no `auth.users`, Nullable)
*   `primeiro_acesso`: `boolean` (Nullable)
*   `is_superadmin`: `boolean` (Nullable)
*   `status`: `text` (Nullable)
*   `cargo`: `text` (Nome do cargo atual, Nullable)
*   `cpf`: `text` (Nullable)
*   `rg`: `text` (Nullable)
*   `nis`: `text` (Nullable)
*   `data_nascimento`: `date` (Nullable)
*   `foto_url`: `text` (Nullable)
*   `assinatura_url`: `text` (Nullable)
*   `endereco`, `logradouro`, `numero`, `cep`, `bairro`, `cidade`, `uf_residencia`: `text`/`varchar` (Campos residenciais, Nullable)
*   `possui_deficiencia`: `boolean` (Nullable)
*   `deficiencias`: `ARRAY` (Nullable)
*   `superior_area`, `superior_ano_conclusao`, `superior_instituicao`: Detalhes acadêmicos (Nullable)
*   `doc_identidade_url`, `doc_cpf_url`, `doc_comprovante_residencia_url`, `doc_curso_superior_url`...: Documentos comprobatórios salvos em storage (Nullable)
*   `created_at`: `timestamp with time zone` (NOT NULL)
*   `deleted_at`: `timestamp with time zone` (Nullable)

### 3. `public.vinculos_funcionarios`
Lotações e vínculos oficiais de funcionários em escolas.
*   `id`: `uuid` (Primary Key, NOT NULL)
*   `funcionario_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `cargo`: `text` (Nullable)
*   `ativo`: `boolean` (NOT NULL)
*   `data_inicio`: `date` (Nullable)
*   `data_fim`: `date` (Nullable)
*   `created_at`: `timestamp with time zone` (NOT NULL)

### 4. `public.acessos_usuarios`
Gestão de permissões de acesso baseadas em atributos (ABAC).
*   `id`: `uuid` (Primary Key, NOT NULL)
*   `funcionario_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `orgao_id`: `uuid` (Nullable)
*   `nivel`: `integer` (Nível de acesso hierárquico, NOT NULL)
*   `ativo`: `boolean` (Nullable)
*   `cargos_gerenciados`: `ARRAY` (Filtro de cargos sob sua gestão, Nullable)
*   `pode_mural`, `pode_turmas`, `pode_funcionarios`, `pode_matriculas`, `pode_alunos`, `pode_ocorrencias`, `pode_atestados`: `boolean` (Permissões específicas, Nullable)
*   `created_at`: `timestamp with time zone` (NOT NULL)

### 5. `public.alunos`
Cadastro geral de alunos.
*   `id`: `uuid` (Primary Key, NOT NULL)
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
*   `latitude`, `longitude`: `numeric` (Coordenadas geográficas da residência, Nullable)
*   `codigo_temp_resp`: `text` (Código de acesso temporário para o Responsável pelo aluno, Nullable)
*   `codigo_temp_resp_criado_em`: `timestamp with time zone` (Data de expiração do código do Responsável, Nullable)
*   `created_at`: `timestamp with time zone` (NOT NULL)
*   `deleted_at`: `timestamp with time zone` (Nullable)

### 6. `public.alunos_anexos`
Arquivos/Documentos anexados à ficha do aluno.
*   `id`: `uuid` (Primary Key, NOT NULL)
*   `aluno_id` : `uuid` (FK -> `public.alunos.id`, NOT NULL)
*   `nome`: `text` (Nome do anexo, e.g. "RG", NOT NULL)
*   `arquivo_url`: `text` (Caminho do storage do Supabase, NOT NULL)
*   `created_at`: `timestamp with time zone` (NOT NULL)
*   `deleted_at`: `timestamp with time zone` (Nullable)
*   `arquivado_por`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `motivo_arquivamento`: `text` (Nullable)

### 7. `public.turmas`
Definição de turmas e salas.
*   `id`: `uuid` (Primary Key, NOT NULL)
*   `nome`: `text` (e.g. "6 - A", NOT NULL)
*   `ano_letivo`: `integer` (NOT NULL)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `turno`: `text` (e.g. "Matutino", "Vespertino", Nullable)
*   `capacidade`: `integer` (Limite de alunos, Nullable)
*   `created_at`: `timestamp with time zone` (NOT NULL)
*   `deleted_at`: `timestamp with time zone` (Nullable)

### 8. `public.vinculos_turmas`
Enturmação (Alunos e Professores associados a Turmas).
*   `id`: `uuid` (Primary Key, NOT NULL)
*   `funcionario_id`: `uuid` (FK -> `public.funcionarios.id`, NOT NULL)
*   `turma_id`: `uuid` (FK -> `public.turmas.id`, NOT NULL)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, NOT NULL)
*   `tipo`: `text` (e.g. "Aluno", "Professor", NOT NULL)
*   `created_at`: `timestamp with time zone` (NOT NULL)

### 9. `public.materias`
Matérias/Disciplinas curriculares.
*   `id`: `uuid` (Primary Key, NOT NULL)
*   `nome`: `text` (e.g. "Matemática", NOT NULL)
*   `base_curricular`: `text` (e.g. "BNCC", Nullable)
*   `turma_id`: `uuid` (FK -> `public.turmas.id`, Nullable)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `professor_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `created_at`: `timestamp with time zone` (NOT NULL)

### 10. `public.notas`
Lançamentos de avaliações por aluno, matéria e trimestre.
*   `id`: `uuid` (Primary Key, NOT NULL)
*   `aluno_id`: `uuid` (FK -> `public.alunos.id`, NOT NULL)
*   `materia_id`: `uuid` (FK -> `public.materias.id`, NOT NULL)
*   `turma_id`: `uuid` (FK -> `public.turmas.id`, NOT NULL)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, NOT NULL)
*   `unidade`: `integer` (Trimestre/Unidade de avaliação, NOT NULL)
*   `nota1`, `nota2`, `nota3`: `numeric` (Notas de atividades, provas e qualitativa, Nullable)
*   `created_at`: `timestamp with time zone` (NOT NULL)

### 11. `public.frequencias`
Registro de presença diária ou por aula de alunos.
*   `id`: `uuid` (Primary Key, NOT NULL)
*   `aluno_id`: `uuid` (FK -> `public.alunos.id`, NOT NULL)
*   `turma_id`: `uuid` (FK -> `public.turmas.id`, NOT NULL)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, NOT NULL)
*   `materia_id`: `uuid` (FK -> `public.materias.id`, Nullable)
*   `data`: `date` (NOT NULL)
*   `presenca`: `boolean` (true = presente, false = falta, NOT NULL)
*   `agenda_aula_id`: `uuid` (FK -> `public.agenda_aulas.id`, Nullable)
*   `created_at`: `timestamp with time zone` (NOT NULL)

### 12. `public.ocorrencias`
Histórico de ocorrências e incidentes dos estudantes.
*   `id`: `uuid` (Primary Key, NOT NULL)
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
*   `id`: `uuid` (Primary Key, NOT NULL)
*   `funcionario_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, Nullable)
*   `cid`: `text` (Código CID do atestado, NOT NULL)
*   `dias_afastamento`: `integer` (NOT NULL)
*   `data_inclusao`: `date` (Nullable)
*   `status`: `text` (e.g. "Aprovado", "Pendente", Nullable)
*   `anexo_url`: `text` (URL do PDF/Comprovante no Storage, Nullable)
*   `created_at`: `timestamp with time zone` (Nullable)

### 14. `public.assinatura`
Assinaturas eletrônicas emitidas via QRCode.
*   `id`: `uuid` (Primary Key, NOT NULL)
*   `aluno_id`: `uuid` (FK -> `public.alunos.id`, Nullable)
*   `tipo_documento`: `text` (e.g. "Boletim", NOT NULL)
*   `token_verificacao`: `text` (Token criptográfico único, NOT NULL)
*   `hash_sha256`: `text` (Assinatura do payload do documento, NOT NULL)
*   `arquivo_pdf_url`: `text` (PDF assinado no Storage, Nullable)
*   `ip_responsavel`, `dispositivo_responsavel`, `data_responsavel`: Metadados da assinatura do responsável legal (Nullable)
*   `ip_funcionario`, `dispositivo_funcionario`, `data_funcionario`: Metadados da assinatura da escola/diretor (Nullable)
*   `criado_em`: `timestamp with time zone` (Nullable)

### 15. `public.trash_bin`
Lixeira lógica para restauração e auditoria de exclusões.
*   `id`: `uuid` (Primary Key, NOT NULL)
*   `tenant_id`: `uuid` (Nullable)
*   `table_name`: `text` (Tabela original, e.g. "alunos", NOT NULL)
*   `record_id`: `uuid` (ID do registro excluído, NOT NULL)
*   `record_summary`: `text` (Texto amigável resumindo o item, NOT NULL)
*   `record_payload`: `jsonb` (Dump completo do registro em formato JSON, NOT NULL)
*   `deleted_by_id`: `uuid` (FK -> `public.funcionarios.id`, Nullable)
*   `deleted_by_name`: `text` (Nullable)
*   `deleted_by_email`: `text` (Nullable)
*   `deleted_at`: `timestamp with time zone` (Nullable)
*   `status`: `text` (e.g. "deleted", "restored", Nullable)
*   `resolution_note`: `text` (Justificativa de restauração, Nullable)

### 16. `public.grade_semanal`
Associação de horário de aulas, professores e turmas.
*   `id`: `uuid` (Primary Key, NOT NULL)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, NOT NULL)
*   `turma_id`: `uuid` (FK -> `public.turmas.id`, NOT NULL)
*   `materia_id`: `uuid` (FK -> `public.materias.id`, NOT NULL)
*   `dia_semana`: `smallint` (Dia da semana de 1 a 6, NOT NULL)
*   `ordem_aula`: `smallint` (Ordem/Período da aula, NOT NULL)
*   `ano_letivo`: `integer` (NOT NULL)
*   `ativo`: `boolean` (NOT NULL)
*   `created_at`: `timestamp with time zone` (NOT NULL)

### 17. `public.horarios_aulas_slots`
Definição dos turnos e horários de início e fim das aulas.
*   `id`: `uuid` (Primary Key, NOT NULL)
*   `escola_id`: `uuid` (FK -> `public.escolas.id`, NOT NULL)
*   `turno`: `text` (e.g. "Matutino", NOT NULL)
*   `ordem_aula`: `smallint` (Período de aula, NOT NULL)
*   `horario_inicio`: `time without time zone` (NOT NULL)
*   `horario_fim`: `time without time zone` (NOT NULL)
*   `created_at`: `timestamp with time zone` (NOT NULL)
