-- Migration para adicionar novos campos à tabela de funcionários e escolas de Sapeaçu

-- 1. Adicionar campo localizacao em public.escolas se não existir
ALTER TABLE public.escolas ADD COLUMN IF NOT EXISTS localizacao text;

-- 2. Adicionar campos na tabela public.funcionarios
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS censo text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS estado_civil text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS cor_raca text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS sexo text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS nome_mae text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS nome_pai text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS nacionalidade text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS nacionalidade_especificacao text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS municipio_nascimento text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS uf_nascimento varchar(2);
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS rg text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS nis text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS logradouro text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS numero text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS cep text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS bairro text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS cidade text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS uf_residencia varchar(2);
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS area_residencia text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS area_diferenciada text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS funcao_especifica text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS tipo_vinculo text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS tipo_vinculo_especificacao text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS possui_deficiencia boolean DEFAULT false;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS deficiencias text[];
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS tea boolean DEFAULT false;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS altas_habilidades boolean DEFAULT false;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS doenca_diabetes boolean DEFAULT false;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS doenca_convulsoes boolean DEFAULT false;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS doenca_asma_bronquite boolean DEFAULT false;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS doenca_infeccoes boolean DEFAULT false;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS doenca_cardiopatias boolean DEFAULT false;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS doenca_alergias boolean DEFAULT false;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS doenca_covid19 boolean DEFAULT false;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS doenca_articulares boolean DEFAULT false;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS doenca_outra text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS escolaridade_nivel text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS ensino_medio_tipo text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS superior_area text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS superior_codigo text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS superior_ano_conclusao integer;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS superior_tipo_instituicao text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS superior_grau text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS superior_instituicao text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS complementacao_pedagogica text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS pos_graduacoes jsonb DEFAULT '[]'::jsonb;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS outros_cursos text[];
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS doc_identidade_url text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS doc_cpf_url text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS doc_comprovante_residencia_url text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS doc_ensino_fundamental_url text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS doc_ensino_medio_url text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS doc_curso_superior_url text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS doc_pos_graduacao_url text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS doc_mestrado_url text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS doc_doutorado_url text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS data_preenchimento date;

-- 3. Atualizar visibilidade do bucket fotos-funcionarios para public = true
UPDATE storage.buckets SET public = true WHERE id = 'fotos-funcionarios';

-- 4. Criar/atualizar políticas no Storage
DO $$
BEGIN
  -- Remover políticas antigas para evitar conflitos
  DROP POLICY IF EXISTS "Acesso autenticado para fotos-funcionarios SELECT" ON storage.objects;
  DROP POLICY IF EXISTS "Acesso publico para leitura de fotos de funcionarios" ON storage.objects;
  DROP POLICY IF EXISTS "Acesso autenticado para fotos-funcionarios INSERT" ON storage.objects;
  DROP POLICY IF EXISTS "Acesso autenticado para upload de fotos de funcionarios" ON storage.objects;
  DROP POLICY IF EXISTS "Acesso publico para leitura de documentos" ON storage.objects;

  -- Criar novas políticas públicas para leitura
  CREATE POLICY "Acesso publico para leitura de fotos de funcionarios"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'fotos-funcionarios');

  CREATE POLICY "Acesso autenticado para upload de fotos de funcionarios"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'fotos-funcionarios' AND auth.role() = 'authenticated');

  CREATE POLICY "Acesso publico para leitura de documentos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documentos');
END $$;
