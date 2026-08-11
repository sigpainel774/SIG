export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      abastecimentos_veiculos: {
        Row: {
          created_at: string | null
          data: string
          id: string
          litros: number
          odometro_km: number
          posto_nota: string | null
          registrado_por: string | null
          tipo_combustivel: string
          valor_total: number
          veiculo_id: string
        }
        Insert: {
          created_at?: string | null
          data?: string
          id?: string
          litros: number
          odometro_km: number
          posto_nota?: string | null
          registrado_por?: string | null
          tipo_combustivel?: string
          valor_total: number
          veiculo_id: string
        }
        Update: {
          created_at?: string | null
          data?: string
          id?: string
          litros?: number
          odometro_km?: number
          posto_nota?: string | null
          registrado_por?: string | null
          tipo_combustivel?: string
          valor_total?: number
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "abastecimentos_veiculos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abastecimentos_veiculos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abastecimentos_veiculos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      access_logs: {
        Row: {
          created_at: string
          detalhes: Json | null
          email: string | null
          evento: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          detalhes?: Json | null
          email?: string | null
          evento: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          detalhes?: Json | null
          email?: string | null
          evento?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      acessos_usuarios: {
        Row: {
          ativo: boolean | null
          cargos_gerenciados: string[] | null
          created_at: string
          escola_id: string | null
          funcionario_id: string | null
          id: string
          nivel: number
          orgao_id: string | null
          pode_alunos: boolean | null
          pode_atestados: boolean | null
          pode_funcionarios: boolean | null
          pode_matriculas: boolean | null
          pode_mural: boolean | null
          pode_ocorrencias: boolean | null
          pode_rh_rede: boolean | null
          pode_turmas: boolean | null
          secretarias_ids: string[] | null
        }
        Insert: {
          ativo?: boolean | null
          cargos_gerenciados?: string[] | null
          created_at?: string
          escola_id?: string | null
          funcionario_id?: string | null
          id?: string
          nivel: number
          orgao_id?: string | null
          pode_alunos?: boolean | null
          pode_atestados?: boolean | null
          pode_funcionarios?: boolean | null
          pode_matriculas?: boolean | null
          pode_mural?: boolean | null
          pode_ocorrencias?: boolean | null
          pode_rh_rede?: boolean | null
          pode_turmas?: boolean | null
          secretarias_ids?: string[] | null
        }
        Update: {
          ativo?: boolean | null
          cargos_gerenciados?: string[] | null
          created_at?: string
          escola_id?: string | null
          funcionario_id?: string | null
          id?: string
          nivel?: number
          orgao_id?: string | null
          pode_alunos?: boolean | null
          pode_atestados?: boolean | null
          pode_funcionarios?: boolean | null
          pode_matriculas?: boolean | null
          pode_mural?: boolean | null
          pode_ocorrencias?: boolean | null
          pode_rh_rede?: boolean | null
          pode_turmas?: boolean | null
          secretarias_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "acessos_usuarios_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acessos_usuarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acessos_usuarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acessos_usuarios_orgao_id_fkey"
            columns: ["orgao_id"]
            isOneToOne: false
            referencedRelation: "orgaos"
            referencedColumns: ["id"]
          },
        ]
      }
      acessos_usuarios_permissoes: {
        Row: {
          acesso_usuario_id: string
          created_at: string
          id: string
          permissao: string
          permitido: boolean
        }
        Insert: {
          acesso_usuario_id: string
          created_at?: string
          id?: string
          permissao: string
          permitido?: boolean
        }
        Update: {
          acesso_usuario_id?: string
          created_at?: string
          id?: string
          permissao?: string
          permitido?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "acessos_usuarios_permissoes_acesso_usuario_id_fkey"
            columns: ["acesso_usuario_id"]
            isOneToOne: false
            referencedRelation: "acessos_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      adicionais_salario: {
        Row: {
          ano_referencia: number | null
          ativo: boolean | null
          created_at: string | null
          criado_por: string | null
          descricao: string
          funcionario_id: string | null
          id: string
          mes_referencia: number | null
          tipo: string
          valor: number
        }
        Insert: {
          ano_referencia?: number | null
          ativo?: boolean | null
          created_at?: string | null
          criado_por?: string | null
          descricao: string
          funcionario_id?: string | null
          id?: string
          mes_referencia?: number | null
          tipo?: string
          valor: number
        }
        Update: {
          ano_referencia?: number | null
          ativo?: boolean | null
          created_at?: string | null
          criado_por?: string | null
          descricao?: string
          funcionario_id?: string | null
          id?: string
          mes_referencia?: number | null
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "adicionais_salario_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adicionais_salario_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_aulas: {
        Row: {
          created_at: string
          data: string
          data_original: string | null
          escola_id: string
          grade_semanal_id: string | null
          horario_fim: string
          horario_inicio: string
          horario_original_inicio: string | null
          id: string
          materia_id: string
          observacao: string | null
          professor_id: string | null
          status: string
          turma_id: string
        }
        Insert: {
          created_at?: string
          data: string
          data_original?: string | null
          escola_id: string
          grade_semanal_id?: string | null
          horario_fim: string
          horario_inicio: string
          horario_original_inicio?: string | null
          id?: string
          materia_id: string
          observacao?: string | null
          professor_id?: string | null
          status?: string
          turma_id: string
        }
        Update: {
          created_at?: string
          data?: string
          data_original?: string | null
          escola_id?: string
          grade_semanal_id?: string | null
          horario_fim?: string
          horario_inicio?: string
          horario_original_inicio?: string | null
          id?: string
          materia_id?: string
          observacao?: string | null
          professor_id?: string | null
          status?: string
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_aulas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_aulas_grade_semanal_id_fkey"
            columns: ["grade_semanal_id"]
            isOneToOne: false
            referencedRelation: "grade_semanal"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_aulas_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_aulas_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_aulas_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_aulas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_aulas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas_ativas"
            referencedColumns: ["id"]
          },
        ]
      }
      alunos: {
        Row: {
          cartao_sus: string | null
          certidao_nascimento: string | null
          certidao_nascimento_novo_modelo: string | null
          codigo_temp_func: string | null
          codigo_temp_func_criado_em: string | null
          codigo_temp_resp: string | null
          codigo_temp_resp_criado_em: string | null
          cpf: string | null
          created_at: string
          dados_matricula: Json | null
          data_nascimento: string | null
          deleted_at: string | null
          endereco: string | null
          escola_id: string | null
          foto_avatar_path: string | null
          foto_original_path: string | null
          foto_updated_at: string | null
          foto_url: string | null
          foto_visualizacao_path: string | null
          historico: string | null
          id: string
          identif_unica_censo: string | null
          inep: string | null
          latitude: number | null
          longitude: number | null
          nis: string | null
          nome: string
          nome_contato_emergencia: string | null
          nome_mae: string | null
          nome_pai: string | null
          numero_matricula: string | null
          profissao_mae: string | null
          profissao_pai: string | null
          rg: string | null
          serie: string | null
          sexo: string | null
          telefone: string | null
          turma_id: string | null
        }
        Insert: {
          cartao_sus?: string | null
          certidao_nascimento?: string | null
          certidao_nascimento_novo_modelo?: string | null
          codigo_temp_func?: string | null
          codigo_temp_func_criado_em?: string | null
          codigo_temp_resp?: string | null
          codigo_temp_resp_criado_em?: string | null
          cpf?: string | null
          created_at?: string
          dados_matricula?: Json | null
          data_nascimento?: string | null
          deleted_at?: string | null
          endereco?: string | null
          escola_id?: string | null
          foto_avatar_path?: string | null
          foto_original_path?: string | null
          foto_updated_at?: string | null
          foto_url?: string | null
          foto_visualizacao_path?: string | null
          historico?: string | null
          id?: string
          identif_unica_censo?: string | null
          inep?: string | null
          latitude?: number | null
          longitude?: number | null
          nis?: string | null
          nome: string
          nome_contato_emergencia?: string | null
          nome_mae?: string | null
          nome_pai?: string | null
          numero_matricula?: string | null
          profissao_mae?: string | null
          profissao_pai?: string | null
          rg?: string | null
          serie?: string | null
          sexo?: string | null
          telefone?: string | null
          turma_id?: string | null
        }
        Update: {
          cartao_sus?: string | null
          certidao_nascimento?: string | null
          certidao_nascimento_novo_modelo?: string | null
          codigo_temp_func?: string | null
          codigo_temp_func_criado_em?: string | null
          codigo_temp_resp?: string | null
          codigo_temp_resp_criado_em?: string | null
          cpf?: string | null
          created_at?: string
          dados_matricula?: Json | null
          data_nascimento?: string | null
          deleted_at?: string | null
          endereco?: string | null
          escola_id?: string | null
          foto_avatar_path?: string | null
          foto_original_path?: string | null
          foto_updated_at?: string | null
          foto_url?: string | null
          foto_visualizacao_path?: string | null
          historico?: string | null
          id?: string
          identif_unica_censo?: string | null
          inep?: string | null
          latitude?: number | null
          longitude?: number | null
          nis?: string | null
          nome?: string
          nome_contato_emergencia?: string | null
          nome_mae?: string | null
          nome_pai?: string | null
          numero_matricula?: string | null
          profissao_mae?: string | null
          profissao_pai?: string | null
          rg?: string | null
          serie?: string | null
          sexo?: string | null
          telefone?: string | null
          turma_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alunos_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alunos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alunos_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas_ativas"
            referencedColumns: ["id"]
          },
        ]
      }
      alunos_anexos: {
        Row: {
          aluno_id: string
          arquivado_por: string | null
          arquivo_url: string
          created_at: string
          deleted_at: string | null
          id: string
          motivo_arquivamento: string | null
          nome: string
          tipo: string
        }
        Insert: {
          aluno_id: string
          arquivado_por?: string | null
          arquivo_url: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          motivo_arquivamento?: string | null
          nome: string
          tipo?: string
        }
        Update: {
          aluno_id?: string
          arquivado_por?: string | null
          arquivo_url?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          motivo_arquivamento?: string | null
          nome?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "alunos_anexos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alunos_anexos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alunos_anexos_arquivado_por_fkey"
            columns: ["arquivado_por"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alunos_anexos_arquivado_por_fkey"
            columns: ["arquivado_por"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      alunos_transporte: {
        Row: {
          aluno_id: string | null
          created_at: string | null
          id: string
          latitude: number | null
          longitude: number | null
          ponto_embarque: string | null
          rota_id: string | null
        }
        Insert: {
          aluno_id?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          ponto_embarque?: string | null
          rota_id?: string | null
        }
        Update: {
          aluno_id?: string | null
          created_at?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          ponto_embarque?: string | null
          rota_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alunos_transporte_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alunos_transporte_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alunos_transporte_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas_transporte"
            referencedColumns: ["id"]
          },
        ]
      }
      arquivados: {
        Row: {
          arquivado_por: string | null
          arquivos_anexos: Json | null
          created_at: string | null
          escola_origem_id: string | null
          excluido_em: string | null
          excluido_por: string | null
          id: string
          motivo: string
          payload_completo: Json
          referencia_id: string
          revertido_em: string | null
          revertido_por: string | null
          status: string | null
          tabela_origem: string
          tipo: string
        }
        Insert: {
          arquivado_por?: string | null
          arquivos_anexos?: Json | null
          created_at?: string | null
          escola_origem_id?: string | null
          excluido_em?: string | null
          excluido_por?: string | null
          id?: string
          motivo: string
          payload_completo: Json
          referencia_id: string
          revertido_em?: string | null
          revertido_por?: string | null
          status?: string | null
          tabela_origem: string
          tipo: string
        }
        Update: {
          arquivado_por?: string | null
          arquivos_anexos?: Json | null
          created_at?: string | null
          escola_origem_id?: string | null
          excluido_em?: string | null
          excluido_por?: string | null
          id?: string
          motivo?: string
          payload_completo?: Json
          referencia_id?: string
          revertido_em?: string | null
          revertido_por?: string | null
          status?: string | null
          tabela_origem?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "arquivados_arquivado_por_fkey"
            columns: ["arquivado_por"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arquivados_arquivado_por_fkey"
            columns: ["arquivado_por"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arquivados_escola_origem_id_fkey"
            columns: ["escola_origem_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arquivados_excluido_por_fkey"
            columns: ["excluido_por"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arquivados_excluido_por_fkey"
            columns: ["excluido_por"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arquivados_revertido_por_fkey"
            columns: ["revertido_por"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arquivados_revertido_por_fkey"
            columns: ["revertido_por"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      assinatura: {
        Row: {
          aluno_id: string | null
          arquivo_pdf_url: string | null
          criado_em: string | null
          dados_documento: Json | null
          data_funcionario: string | null
          data_responsavel: string | null
          dispositivo_funcionario: string | null
          dispositivo_responsavel: string | null
          hash_sha256: string
          id: string
          ip_funcionario: string | null
          ip_responsavel: string | null
          tipo_documento: string
          token_verificacao: string
          user_agent_funcionario: string | null
          user_agent_responsavel: string | null
        }
        Insert: {
          aluno_id?: string | null
          arquivo_pdf_url?: string | null
          criado_em?: string | null
          dados_documento?: Json | null
          data_funcionario?: string | null
          data_responsavel?: string | null
          dispositivo_funcionario?: string | null
          dispositivo_responsavel?: string | null
          hash_sha256: string
          id?: string
          ip_funcionario?: string | null
          ip_responsavel?: string | null
          tipo_documento?: string
          token_verificacao: string
          user_agent_funcionario?: string | null
          user_agent_responsavel?: string | null
        }
        Update: {
          aluno_id?: string | null
          arquivo_pdf_url?: string | null
          criado_em?: string | null
          dados_documento?: Json | null
          data_funcionario?: string | null
          data_responsavel?: string | null
          dispositivo_funcionario?: string | null
          dispositivo_responsavel?: string | null
          hash_sha256?: string
          id?: string
          ip_funcionario?: string | null
          ip_responsavel?: string | null
          tipo_documento?: string
          token_verificacao?: string
          user_agent_funcionario?: string | null
          user_agent_responsavel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assinatura_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assinatura_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      atestados: {
        Row: {
          anexo_nome: string | null
          anexo_url: string | null
          cid: string
          created_at: string | null
          data_fim: string | null
          data_inclusao: string | null
          dias_afastamento: number
          escola_id: string | null
          funcionario_id: string | null
          id: string
          status: string | null
        }
        Insert: {
          anexo_nome?: string | null
          anexo_url?: string | null
          cid: string
          created_at?: string | null
          data_fim?: string | null
          data_inclusao?: string | null
          dias_afastamento: number
          escola_id?: string | null
          funcionario_id?: string | null
          id?: string
          status?: string | null
        }
        Update: {
          anexo_nome?: string | null
          anexo_url?: string | null
          cid?: string
          created_at?: string | null
          data_fim?: string | null
          data_inclusao?: string | null
          dias_afastamento?: number
          escola_id?: string | null
          funcionario_id?: string | null
          id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atestados_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atestados_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atestados_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_secretaria: {
        Row: {
          ano_letivo: number
          arquivo_nome: string | null
          arquivo_tipo: string | null
          arquivo_url: string | null
          created_at: string | null
          data_aplicacao: string
          escola_id: string
          id: string
          materia_id: string | null
          observacoes: string | null
          professor_id: string
          status: string
          titulo: string
          trimestre: number | null
          turma_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          ano_letivo?: number
          arquivo_nome?: string | null
          arquivo_tipo?: string | null
          arquivo_url?: string | null
          created_at?: string | null
          data_aplicacao: string
          escola_id: string
          id?: string
          materia_id?: string | null
          observacoes?: string | null
          professor_id: string
          status?: string
          titulo: string
          trimestre?: number | null
          turma_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          ano_letivo?: number
          arquivo_nome?: string | null
          arquivo_tipo?: string | null
          arquivo_url?: string | null
          created_at?: string | null
          data_aplicacao?: string
          escola_id?: string
          id?: string
          materia_id?: string | null
          observacoes?: string | null
          professor_id?: string
          status?: string
          titulo?: string
          trimestre?: number | null
          turma_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atividades_secretaria_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_secretaria_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_secretaria_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_secretaria_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_secretaria_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_secretaria_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas_ativas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_secretaria_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_secretaria_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      atividades_secretaria_historico: {
        Row: {
          alterado_em: string | null
          alterado_por: string | null
          alterado_por_nome: string | null
          atividade_id: string
          id: string
          status_anterior: string | null
          status_novo: string
        }
        Insert: {
          alterado_em?: string | null
          alterado_por?: string | null
          alterado_por_nome?: string | null
          atividade_id: string
          id?: string
          status_anterior?: string | null
          status_novo: string
        }
        Update: {
          alterado_em?: string | null
          alterado_por?: string | null
          alterado_por_nome?: string | null
          atividade_id?: string
          id?: string
          status_anterior?: string | null
          status_novo?: string
        }
        Relationships: [
          {
            foreignKeyName: "atividades_secretaria_historico_alterado_por_fkey"
            columns: ["alterado_por"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_secretaria_historico_alterado_por_fkey"
            columns: ["alterado_por"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "atividades_secretaria_historico_atividade_id_fkey"
            columns: ["atividade_id"]
            isOneToOne: false
            referencedRelation: "atividades_secretaria"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity: string
          entity_id: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          tenant_id: string | null
          user_cargo: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          tenant_id?: string | null
          user_cargo?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          tenant_id?: string | null
          user_cargo?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_ips: {
        Row: {
          blocked_until: string
          ip_address: string
          reason: string | null
        }
        Insert: {
          blocked_until: string
          ip_address: string
          reason?: string | null
        }
        Update: {
          blocked_until?: string
          ip_address?: string
          reason?: string | null
        }
        Relationships: []
      }
      bug_reports: {
        Row: {
          autor_email: string | null
          autor_nome: string | null
          created_at: string | null
          descricao: string
          escola: string | null
          id: string
          resposta_root: string | null
          status: string
          tipo: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          autor_email?: string | null
          autor_nome?: string | null
          created_at?: string | null
          descricao: string
          escola?: string | null
          id?: string
          resposta_root?: string | null
          status?: string
          tipo?: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          autor_email?: string | null
          autor_nome?: string | null
          created_at?: string | null
          descricao?: string
          escola?: string | null
          id?: string
          resposta_root?: string | null
          status?: string
          tipo?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cargos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          deleted_at: string | null
          descricao: string | null
          id: string
          nivel: number | null
          nome: string
          salario_base: number | null
          secretaria_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          nivel?: number | null
          nome: string
          salario_base?: number | null
          secretaria_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          descricao?: string | null
          id?: string
          nivel?: number | null
          nome?: string
          salario_base?: number | null
          secretaria_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cargos_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicados: {
        Row: {
          anexo_nome: string | null
          anexo_url: string | null
          body: string
          created_at: string
          criado_por: string | null
          date: string
          id: string
          is_popup: boolean | null
          secretaria_id: string | null
          target: string
          title: string
        }
        Insert: {
          anexo_nome?: string | null
          anexo_url?: string | null
          body: string
          created_at?: string
          criado_por?: string | null
          date: string
          id?: string
          is_popup?: boolean | null
          secretaria_id?: string | null
          target: string
          title: string
        }
        Update: {
          anexo_nome?: string | null
          anexo_url?: string | null
          body?: string
          created_at?: string
          criado_por?: string | null
          date?: string
          id?: string
          is_popup?: boolean | null
          secretaria_id?: string | null
          target?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunicados_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicados_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comunicados_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
        ]
      }
      comunicados_lidos: {
        Row: {
          comunicado_id: string
          created_at: string | null
          user_id: string
        }
        Insert: {
          comunicado_id: string
          created_at?: string | null
          user_id: string
        }
        Update: {
          comunicado_id?: string
          created_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comunicados_lidos_comunicado_id_fkey"
            columns: ["comunicado_id"]
            isOneToOne: false
            referencedRelation: "comunicados"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracao_notificacoes_niveis: {
        Row: {
          cargo_pattern: string | null
          created_at: string | null
          enviar_web: boolean | null
          id: string
          nivel: number | null
          tipo_notificacao: string
        }
        Insert: {
          cargo_pattern?: string | null
          created_at?: string | null
          enviar_web?: boolean | null
          id?: string
          nivel?: number | null
          tipo_notificacao: string
        }
        Update: {
          cargo_pattern?: string | null
          created_at?: string | null
          enviar_web?: boolean | null
          id?: string
          nivel?: number | null
          tipo_notificacao?: string
        }
        Relationships: []
      }
      configuracoes_rede: {
        Row: {
          bloquear_edicao_funcionarios_rede: boolean | null
          cargo_secretario: string | null
          id: string
          nome_rede: string | null
          prazo_envio_atividades_dias: number
          prazo_frequencia_dias: number | null
          secretario_educacao: string
          updated_at: string | null
        }
        Insert: {
          bloquear_edicao_funcionarios_rede?: boolean | null
          cargo_secretario?: string | null
          id?: string
          nome_rede?: string | null
          prazo_envio_atividades_dias?: number
          prazo_frequencia_dias?: number | null
          secretario_educacao?: string
          updated_at?: string | null
        }
        Update: {
          bloquear_edicao_funcionarios_rede?: boolean | null
          cargo_secretario?: string | null
          id?: string
          nome_rede?: string | null
          prazo_envio_atividades_dias?: number
          prazo_frequencia_dias?: number | null
          secretario_educacao?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      desligamentos_programados: {
        Row: {
          created_at: string | null
          data_desligamento: string
          funcionario_id: string | null
          id: string
          motivo: string | null
          programado_por: string | null
          status: string
          vinculo_id: string | null
        }
        Insert: {
          created_at?: string | null
          data_desligamento: string
          funcionario_id?: string | null
          id?: string
          motivo?: string | null
          programado_por?: string | null
          status?: string
          vinculo_id?: string | null
        }
        Update: {
          created_at?: string | null
          data_desligamento?: string
          funcionario_id?: string | null
          id?: string
          motivo?: string | null
          programado_por?: string | null
          status?: string
          vinculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "desligamentos_programados_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desligamentos_programados_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desligamentos_programados_vinculo_id_fkey"
            columns: ["vinculo_id"]
            isOneToOne: false
            referencedRelation: "vinculos_funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      dispositivos: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          escola_id: string | null
          funcionario_id: string | null
          id: string
          identificador: string | null
          nome: string
          status: string | null
          tipo: string
          ultima_conexao: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          escola_id?: string | null
          funcionario_id?: string | null
          id?: string
          identificador?: string | null
          nome: string
          status?: string | null
          tipo: string
          ultima_conexao?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          escola_id?: string | null
          funcionario_id?: string | null
          id?: string
          identificador?: string | null
          nome?: string
          status?: string | null
          tipo?: string
          ultima_conexao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispositivos_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispositivos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispositivos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      emaee_especialidades_vinculadas: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          dia_semana: number
          emaee_matricula_id: string
          especialidade: string
          especialidade_outros: string | null
          frequencia: string | null
          horario_inicio: string
          id: string
          profissional_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          dia_semana: number
          emaee_matricula_id: string
          especialidade: string
          especialidade_outros?: string | null
          frequencia?: string | null
          horario_inicio: string
          id?: string
          profissional_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          dia_semana?: number
          emaee_matricula_id?: string
          especialidade?: string
          especialidade_outros?: string | null
          frequencia?: string | null
          horario_inicio?: string
          id?: string
          profissional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emaee_especialidades_vinculadas_emaee_matricula_id_fkey"
            columns: ["emaee_matricula_id"]
            isOneToOne: false
            referencedRelation: "emaee_matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emaee_especialidades_vinculadas_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emaee_especialidades_vinculadas_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      emaee_evolucoes: {
        Row: {
          anexos_sessao: Json | null
          assinado_em: string | null
          assinatura_profissional_url: string | null
          conduta_orientacoes: string | null
          created_at: string | null
          data_atendimento: string
          deleted_at: string | null
          emaee_matricula_id: string
          especialidade: string
          id: string
          profissional_id: string
          resumo_evolucao: string
          tipo_atendimento: string | null
        }
        Insert: {
          anexos_sessao?: Json | null
          assinado_em?: string | null
          assinatura_profissional_url?: string | null
          conduta_orientacoes?: string | null
          created_at?: string | null
          data_atendimento?: string
          deleted_at?: string | null
          emaee_matricula_id: string
          especialidade: string
          id?: string
          profissional_id: string
          resumo_evolucao: string
          tipo_atendimento?: string | null
        }
        Update: {
          anexos_sessao?: Json | null
          assinado_em?: string | null
          assinatura_profissional_url?: string | null
          conduta_orientacoes?: string | null
          created_at?: string | null
          data_atendimento?: string
          deleted_at?: string | null
          emaee_matricula_id?: string
          especialidade?: string
          id?: string
          profissional_id?: string
          resumo_evolucao?: string
          tipo_atendimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emaee_evolucoes_emaee_matricula_id_fkey"
            columns: ["emaee_matricula_id"]
            isOneToOne: false
            referencedRelation: "emaee_matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emaee_evolucoes_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emaee_evolucoes_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      emaee_matriculas: {
        Row: {
          aluno_id: string
          ano_escolarizacao: string | null
          autorizado_pelo_responsavel: boolean | null
          cid_codigo: string | null
          created_at: string | null
          data_autorizacao: string | null
          data_matricula: string
          def_auditiva: boolean | null
          def_baixa_visao: boolean | null
          def_cegueira: boolean | null
          def_fisica: boolean | null
          def_intelectual: boolean | null
          def_multipla: boolean | null
          def_surdez: boolean | null
          def_surdocegueira: boolean | null
          deleted_at: string | null
          escola_atendimento_id: string
          escola_regular_id: string | null
          gestor_regular: string | null
          id: string
          localizacao_atendimento: string | null
          observacoes_requerimento: string | null
          principal_queixa: string | null
          professor_regular: string | null
          responsavel_assinatura_cpf: string | null
          responsavel_assinatura_nome: string | null
          status: string | null
          transtorno_outros: boolean | null
          transtorno_tea: boolean | null
          turma_regular: string | null
          turno_atendimento: string
          turno_regular: string | null
        }
        Insert: {
          aluno_id: string
          ano_escolarizacao?: string | null
          autorizado_pelo_responsavel?: boolean | null
          cid_codigo?: string | null
          created_at?: string | null
          data_autorizacao?: string | null
          data_matricula?: string
          def_auditiva?: boolean | null
          def_baixa_visao?: boolean | null
          def_cegueira?: boolean | null
          def_fisica?: boolean | null
          def_intelectual?: boolean | null
          def_multipla?: boolean | null
          def_surdez?: boolean | null
          def_surdocegueira?: boolean | null
          deleted_at?: string | null
          escola_atendimento_id: string
          escola_regular_id?: string | null
          gestor_regular?: string | null
          id?: string
          localizacao_atendimento?: string | null
          observacoes_requerimento?: string | null
          principal_queixa?: string | null
          professor_regular?: string | null
          responsavel_assinatura_cpf?: string | null
          responsavel_assinatura_nome?: string | null
          status?: string | null
          transtorno_outros?: boolean | null
          transtorno_tea?: boolean | null
          turma_regular?: string | null
          turno_atendimento?: string
          turno_regular?: string | null
        }
        Update: {
          aluno_id?: string
          ano_escolarizacao?: string | null
          autorizado_pelo_responsavel?: boolean | null
          cid_codigo?: string | null
          created_at?: string | null
          data_autorizacao?: string | null
          data_matricula?: string
          def_auditiva?: boolean | null
          def_baixa_visao?: boolean | null
          def_cegueira?: boolean | null
          def_fisica?: boolean | null
          def_intelectual?: boolean | null
          def_multipla?: boolean | null
          def_surdez?: boolean | null
          def_surdocegueira?: boolean | null
          deleted_at?: string | null
          escola_atendimento_id?: string
          escola_regular_id?: string | null
          gestor_regular?: string | null
          id?: string
          localizacao_atendimento?: string | null
          observacoes_requerimento?: string | null
          principal_queixa?: string | null
          professor_regular?: string | null
          responsavel_assinatura_cpf?: string | null
          responsavel_assinatura_nome?: string | null
          status?: string | null
          transtorno_outros?: boolean | null
          transtorno_tea?: boolean | null
          turma_regular?: string | null
          turno_atendimento?: string
          turno_regular?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emaee_matriculas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emaee_matriculas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emaee_matriculas_escola_atendimento_id_fkey"
            columns: ["escola_atendimento_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emaee_matriculas_escola_regular_id_fkey"
            columns: ["escola_regular_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      emaee_solicitacoes_relatorios: {
        Row: {
          created_at: string | null
          emaee_matricula_id: string
          escola_origem_id: string
          id: string
          motivo_solicitacao: string
          prazo_resposta: string | null
          relatorio_resposta_anexo_url: string | null
          relatorio_resposta_texto: string | null
          respondido_em: string | null
          respondido_por: string | null
          solicitante_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          emaee_matricula_id: string
          escola_origem_id: string
          id?: string
          motivo_solicitacao: string
          prazo_resposta?: string | null
          relatorio_resposta_anexo_url?: string | null
          relatorio_resposta_texto?: string | null
          respondido_em?: string | null
          respondido_por?: string | null
          solicitante_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          emaee_matricula_id?: string
          escola_origem_id?: string
          id?: string
          motivo_solicitacao?: string
          prazo_resposta?: string | null
          relatorio_resposta_anexo_url?: string | null
          relatorio_resposta_texto?: string | null
          respondido_em?: string | null
          respondido_por?: string | null
          solicitante_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emaee_solicitacoes_relatorios_emaee_matricula_id_fkey"
            columns: ["emaee_matricula_id"]
            isOneToOne: false
            referencedRelation: "emaee_matriculas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emaee_solicitacoes_relatorios_escola_origem_id_fkey"
            columns: ["escola_origem_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emaee_solicitacoes_relatorios_respondido_por_fkey"
            columns: ["respondido_por"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emaee_solicitacoes_relatorios_respondido_por_fkey"
            columns: ["respondido_por"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emaee_solicitacoes_relatorios_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emaee_solicitacoes_relatorios_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      escalas_servico: {
        Row: {
          created_at: string | null
          data: string
          escola_id: string | null
          funcionario_id: string | null
          id: string
          status: string | null
          turno: string
        }
        Insert: {
          created_at?: string | null
          data: string
          escola_id?: string | null
          funcionario_id?: string | null
          id?: string
          status?: string | null
          turno: string
        }
        Update: {
          created_at?: string | null
          data?: string
          escola_id?: string | null
          funcionario_id?: string | null
          id?: string
          status?: string | null
          turno?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalas_servico_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalas_servico_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalas_servico_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      escolas: {
        Row: {
          anexos_padrao: string[] | null
          assinatura_diretor_url: string | null
          ativo: boolean | null
          codigo: number
          created_at: string
          deleted_at: string | null
          diretor_id: string | null
          endereco: string | null
          id: string
          inep: string | null
          latitude: number | null
          localizacao: string | null
          logo_url: string | null
          longitude: number | null
          modulos_ativos: string[] | null
          nome: string
          plano: string | null
          secretaria_id: string | null
          telefone: string | null
          tipo: string | null
        }
        Insert: {
          anexos_padrao?: string[] | null
          assinatura_diretor_url?: string | null
          ativo?: boolean | null
          codigo: number
          created_at?: string
          deleted_at?: string | null
          diretor_id?: string | null
          endereco?: string | null
          id?: string
          inep?: string | null
          latitude?: number | null
          localizacao?: string | null
          logo_url?: string | null
          longitude?: number | null
          modulos_ativos?: string[] | null
          nome: string
          plano?: string | null
          secretaria_id?: string | null
          telefone?: string | null
          tipo?: string | null
        }
        Update: {
          anexos_padrao?: string[] | null
          assinatura_diretor_url?: string | null
          ativo?: boolean | null
          codigo?: number
          created_at?: string
          deleted_at?: string | null
          diretor_id?: string | null
          endereco?: string | null
          id?: string
          inep?: string | null
          latitude?: number | null
          localizacao?: string | null
          logo_url?: string | null
          longitude?: number | null
          modulos_ativos?: string[] | null
          nome?: string
          plano?: string | null
          secretaria_id?: string | null
          telefone?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escolas_diretor_id_fkey"
            columns: ["diretor_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escolas_diretor_id_fkey"
            columns: ["diretor_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escolas_secretaria_id_fkey"
            columns: ["secretaria_id"]
            isOneToOne: false
            referencedRelation: "secretarias"
            referencedColumns: ["id"]
          },
        ]
      }
      folha_pagamento_config: {
        Row: {
          atualizado_por: string | null
          dia_fechamento: number
          id: string
          observacoes: string | null
          updated_at: string | null
        }
        Insert: {
          atualizado_por?: string | null
          dia_fechamento: number
          id?: string
          observacoes?: string | null
          updated_at?: string | null
        }
        Update: {
          atualizado_por?: string | null
          dia_fechamento?: number
          id?: string
          observacoes?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      frequencias: {
        Row: {
          agenda_aula_id: string | null
          aluno_id: string
          created_at: string
          data: string
          escola_id: string
          id: string
          materia_id: string | null
          presenca: boolean
          turma_id: string
        }
        Insert: {
          agenda_aula_id?: string | null
          aluno_id: string
          created_at?: string
          data: string
          escola_id: string
          id?: string
          materia_id?: string | null
          presenca: boolean
          turma_id: string
        }
        Update: {
          agenda_aula_id?: string | null
          aluno_id?: string
          created_at?: string
          data?: string
          escola_id?: string
          id?: string
          materia_id?: string | null
          presenca?: boolean
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "frequencias_agenda_aula_id_fkey"
            columns: ["agenda_aula_id"]
            isOneToOne: false
            referencedRelation: "agenda_aulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequencias_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequencias_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequencias_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequencias_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequencias_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "frequencias_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas_ativas"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios: {
        Row: {
          altas_habilidades: boolean | null
          apelido: string | null
          area_diferenciada: string | null
          area_residencia: string | null
          assinatura_url: string | null
          auth_user_id: string | null
          bairro: string | null
          cargo: string | null
          censo: string | null
          cep: string | null
          cidade: string | null
          complementacao_pedagogica: string | null
          cor_raca: string | null
          cpf: string | null
          created_at: string
          data_admissao: string | null
          data_nascimento: string | null
          data_preenchimento: string | null
          deficiencias: string[] | null
          deleted_at: string | null
          doc_comprovante_residencia_url: string | null
          doc_cpf_url: string | null
          doc_curso_superior_url: string | null
          doc_doutorado_url: string | null
          doc_ensino_fundamental_url: string | null
          doc_ensino_medio_url: string | null
          doc_identidade_url: string | null
          doc_mestrado_url: string | null
          doc_pos_graduacao_url: string | null
          doenca_alergias: boolean | null
          doenca_articulares: boolean | null
          doenca_asma_bronquite: boolean | null
          doenca_cardiopatias: boolean | null
          doenca_convulsoes: boolean | null
          doenca_covid19: boolean | null
          doenca_diabetes: boolean | null
          doenca_infeccoes: boolean | null
          doenca_outra: string | null
          email: string
          endereco: string | null
          ensino_medio_tipo: string | null
          escolaridade_nivel: string | null
          estado_civil: string | null
          formacao: string | null
          foto_avatar_path: string | null
          foto_original_path: string | null
          foto_updated_at: string | null
          foto_url: string | null
          foto_visualizacao_path: string | null
          funcao_especifica: string | null
          graduacoes: Json | null
          id: string
          is_conta_especial: boolean
          is_profissional_aee?: boolean | null
          is_superadmin: boolean | null

          latitude: number | null
          logradouro: string | null
          longitude: number | null
          modalidade_ensino: string | null
          municipio_nascimento: string | null
          nacionalidade: string | null
          nacionalidade_especificacao: string | null
          permitir_mensagens_globais: boolean | null
          nis: string | null
          nome: string
          nome_mae: string | null
          nome_pai: string | null
          numero: string | null
          observacoes: string | null
          outros_cursos: string[] | null
          pos_graduacoes: Json | null
          possui_deficiencia: boolean | null
          primeiro_acesso: boolean | null
          rg: string | null
          sexo: string | null
          status: string | null
          superior_ano_conclusao: number | null
          superior_area: string | null
          superior_codigo: string | null
          superior_grau: string | null
          superior_instituicao: string | null
          superior_tipo_instituicao: string | null
          tea: boolean | null
          telefone: string | null
          telefone_emergencia: string | null
          tipo_sanguineo: string | null
          tipo_vinculo: string | null
          tipo_vinculo_especificacao: string | null
          uf_nascimento: string | null
          uf_residencia: string | null
        }
        Insert: {
          altas_habilidades?: boolean | null
          apelido?: string | null
          area_diferenciada?: string | null
          area_residencia?: string | null
          assinatura_url?: string | null
          auth_user_id?: string | null
          bairro?: string | null
          cargo?: string | null
          censo?: string | null
          cep?: string | null
          cidade?: string | null
          complementacao_pedagogica?: string | null
          cor_raca?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_nascimento?: string | null
          data_preenchimento?: string | null
          deficiencias?: string[] | null
          deleted_at?: string | null
          doc_comprovante_residencia_url?: string | null
          doc_cpf_url?: string | null
          doc_curso_superior_url?: string | null
          doc_doutorado_url?: string | null
          doc_ensino_fundamental_url?: string | null
          doc_ensino_medio_url?: string | null
          doc_identidade_url?: string | null
          doc_mestrado_url?: string | null
          doc_pos_graduacao_url?: string | null
          doenca_alergias?: boolean | null
          doenca_articulares?: boolean | null
          doenca_asma_bronquite?: boolean | null
          doenca_cardiopatias?: boolean | null
          doenca_convulsoes?: boolean | null
          doenca_covid19?: boolean | null
          doenca_diabetes?: boolean | null
          doenca_infeccoes?: boolean | null
          doenca_outra?: string | null
          email: string
          endereco?: string | null
          ensino_medio_tipo?: string | null
          escolaridade_nivel?: string | null
          estado_civil?: string | null
          formacao?: string | null
          foto_avatar_path?: string | null
          foto_original_path?: string | null
          foto_updated_at?: string | null
          foto_url?: string | null
          foto_visualizacao_path?: string | null
          funcao_especifica?: string | null
          graduacoes?: Json | null
          id?: string
          is_conta_especial?: boolean
          is_profissional_aee?: boolean | null
          is_superadmin?: boolean | null

          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          modalidade_ensino?: string | null
          municipio_nascimento?: string | null
          nacionalidade?: string | null
          nacionalidade_especificacao?: string | null
          permitir_mensagens_globais?: boolean | null
          nis?: string | null
          nome: string
          nome_mae?: string | null
          nome_pai?: string | null
          numero?: string | null
          observacoes?: string | null
          outros_cursos?: string[] | null
          pos_graduacoes?: Json | null
          possui_deficiencia?: boolean | null
          primeiro_acesso?: boolean | null
          rg?: string | null
          sexo?: string | null
          status?: string | null
          superior_ano_conclusao?: number | null
          superior_area?: string | null
          superior_codigo?: string | null
          superior_grau?: string | null
          superior_instituicao?: string | null
          superior_tipo_instituicao?: string | null
          tea?: boolean | null
          telefone?: string | null
          telefone_emergencia?: string | null
          tipo_sanguineo?: string | null
          tipo_vinculo?: string | null
          tipo_vinculo_especificacao?: string | null
          uf_nascimento?: string | null
          uf_residencia?: string | null
        }
        Update: {
          altas_habilidades?: boolean | null
          apelido?: string | null
          area_diferenciada?: string | null
          area_residencia?: string | null
          assinatura_url?: string | null
          auth_user_id?: string | null
          bairro?: string | null
          cargo?: string | null
          censo?: string | null
          cep?: string | null
          cidade?: string | null
          complementacao_pedagogica?: string | null
          cor_raca?: string | null
          cpf?: string | null
          created_at?: string
          data_admissao?: string | null
          data_nascimento?: string | null
          data_preenchimento?: string | null
          deficiencias?: string[] | null
          deleted_at?: string | null
          doc_comprovante_residencia_url?: string | null
          doc_cpf_url?: string | null
          doc_curso_superior_url?: string | null
          doc_doutorado_url?: string | null
          doc_ensino_fundamental_url?: string | null
          doc_ensino_medio_url?: string | null
          doc_identidade_url?: string | null
          doc_mestrado_url?: string | null
          doc_pos_graduacao_url?: string | null
          doenca_alergias?: boolean | null
          doenca_articulares?: boolean | null
          doenca_asma_bronquite?: boolean | null
          doenca_cardiopatias?: boolean | null
          doenca_convulsoes?: boolean | null
          doenca_covid19?: boolean | null
          doenca_diabetes?: boolean | null
          doenca_infeccoes?: boolean | null
          doenca_outra?: string | null
          email?: string
          endereco?: string | null
          ensino_medio_tipo?: string | null
          escolaridade_nivel?: string | null
          estado_civil?: string | null
          formacao?: string | null
          foto_avatar_path?: string | null
          foto_original_path?: string | null
          foto_updated_at?: string | null
          foto_url?: string | null
          foto_visualizacao_path?: string | null
          funcao_especifica?: string | null
          graduacoes?: Json | null
          id?: string
          is_conta_especial?: boolean
          is_profissional_aee?: boolean | null
          is_superadmin?: boolean | null

          latitude?: number | null
          logradouro?: string | null
          longitude?: number | null
          modalidade_ensino?: string | null
          municipio_nascimento?: string | null
          nacionalidade?: string | null
          nacionalidade_especificacao?: string | null
          permitir_mensagens_globais?: boolean | null
          nis?: string | null
          nome?: string
          nome_mae?: string | null
          nome_pai?: string | null
          numero?: string | null
          observacoes?: string | null
          outros_cursos?: string[] | null
          pos_graduacoes?: Json | null
          possui_deficiencia?: boolean | null
          primeiro_acesso?: boolean | null
          rg?: string | null
          sexo?: string | null
          status?: string | null
          superior_ano_conclusao?: number | null
          superior_area?: string | null
          superior_codigo?: string | null
          superior_grau?: string | null
          superior_instituicao?: string | null
          superior_tipo_instituicao?: string | null
          tea?: boolean | null
          telefone?: string | null
          telefone_emergencia?: string | null
          tipo_sanguineo?: string | null
          tipo_vinculo?: string | null
          tipo_vinculo_especificacao?: string | null
          uf_nascimento?: string | null
          uf_residencia?: string | null
        }
        Relationships: []
      }
      grade_curricular_escola: {
        Row: {
          base_curricular: string
          created_at: string
          escola_id: string
          id: string
          nome: string
        }
        Insert: {
          base_curricular: string
          created_at?: string
          escola_id: string
          id?: string
          nome: string
        }
        Update: {
          base_curricular?: string
          created_at?: string
          escola_id?: string
          id?: string
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_curricular_escola_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_semanal: {
        Row: {
          ano_letivo: number
          ativo: boolean
          created_at: string
          dia_semana: number
          escola_id: string
          id: string
          materia_id: string
          ordem_aula: number
          turma_id: string
        }
        Insert: {
          ano_letivo: number
          ativo?: boolean
          created_at?: string
          dia_semana: number
          escola_id: string
          id?: string
          materia_id: string
          ordem_aula: number
          turma_id: string
        }
        Update: {
          ano_letivo?: number
          ativo?: boolean
          created_at?: string
          dia_semana?: number
          escola_id?: string
          id?: string
          materia_id?: string
          ordem_aula?: number
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_semanal_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_semanal_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_semanal_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_semanal_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas_ativas"
            referencedColumns: ["id"]
          },
        ]
      }
      horarios_aulas_slots: {
        Row: {
          created_at: string
          escola_id: string
          horario_fim: string
          horario_inicio: string
          id: string
          ordem_aula: number
          turno: string
        }
        Insert: {
          created_at?: string
          escola_id: string
          horario_fim: string
          horario_inicio: string
          id?: string
          ordem_aula: number
          turno: string
        }
        Update: {
          created_at?: string
          escola_id?: string
          horario_fim?: string
          horario_inicio?: string
          id?: string
          ordem_aula?: number
          turno?: string
        }
        Relationships: [
          {
            foreignKeyName: "horarios_aulas_slots_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencoes_veiculos: {
        Row: {
          created_at: string | null
          data: string
          descricao: string
          id: string
          odometro_km: number
          oficina_fornecedor: string | null
          proxima_revisao_data: string | null
          proxima_revisao_km: number | null
          registrado_por: string | null
          tipo: string
          valor_total: number
          veiculo_id: string
        }
        Insert: {
          created_at?: string | null
          data?: string
          descricao: string
          id?: string
          odometro_km: number
          oficina_fornecedor?: string | null
          proxima_revisao_data?: string | null
          proxima_revisao_km?: number | null
          registrado_por?: string | null
          tipo?: string
          valor_total?: number
          veiculo_id: string
        }
        Update: {
          created_at?: string | null
          data?: string
          descricao?: string
          id?: string
          odometro_km?: number
          oficina_fornecedor?: string | null
          proxima_revisao_data?: string | null
          proxima_revisao_km?: number | null
          registrado_por?: string | null
          tipo?: string
          valor_total?: number
          veiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_veiculos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_veiculos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_veiculos_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      materias: {
        Row: {
          base_curricular: string | null
          created_at: string
          escola_id: string | null
          id: string
          nome: string
          professor_id: string | null
          turma_id: string | null
        }
        Insert: {
          base_curricular?: string | null
          created_at?: string
          escola_id?: string | null
          id?: string
          nome: string
          professor_id?: string | null
          turma_id?: string | null
        }
        Update: {
          base_curricular?: string | null
          created_at?: string
          escola_id?: string | null
          id?: string
          nome?: string
          professor_id?: string | null
          turma_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materias_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materias_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materias_professor_id_fkey"
            columns: ["professor_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materias_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "materias_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas_ativas"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_internas: {
        Row: {
          anexo_nome: string | null
          anexo_url: string | null
          assunto: string
          conteudo: string
          created_at: string
          deletado_destinatario: boolean
          deletado_remetente: boolean
          destinatario_id: string
          escola_id: string | null
          id: string
          lida: boolean
          lida_em: string | null
          mensagem_resposta_id: string | null
          orgao_id: string | null
          remetente_id: string
        }
        Insert: {
          anexo_nome?: string | null
          anexo_url?: string | null
          assunto: string
          conteudo: string
          created_at?: string
          deletado_destinatario?: boolean
          deletado_remetente?: boolean
          destinatario_id: string
          escola_id?: string | null
          id?: string
          lida?: boolean
          lida_em?: string | null
          mensagem_resposta_id?: string | null
          orgao_id?: string | null
          remetente_id: string
        }
        Update: {
          anexo_nome?: string | null
          anexo_url?: string | null
          assunto?: string
          conteudo?: string
          created_at?: string
          deletado_destinatario?: boolean
          deletado_remetente?: boolean
          destinatario_id?: string
          escola_id?: string | null
          id?: string
          lida?: boolean
          lida_em?: string | null
          mensagem_resposta_id?: string | null
          orgao_id?: string | null
          remetente_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_internas_destinatario_id_fkey"
            columns: ["destinatario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_internas_destinatario_id_fkey"
            columns: ["destinatario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_internas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_internas_mensagem_resposta_id_fkey"
            columns: ["mensagem_resposta_id"]
            isOneToOne: false
            referencedRelation: "mensagens_internas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_internas_orgao_id_fkey"
            columns: ["orgao_id"]
            isOneToOne: false
            referencedRelation: "orgaos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_internas_remetente_id_fkey"
            columns: ["remetente_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mensagens_internas_remetente_id_fkey"
            columns: ["remetente_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_funcionarios: {
        Row: {
          created_at: string | null
          data: string
          descricao: string
          funcionario_id: string | null
          id: string
          orgao_destino: string | null
          orgao_origem: string | null
          portaria: string | null
          tipo: string
        }
        Insert: {
          created_at?: string | null
          data: string
          descricao: string
          funcionario_id?: string | null
          id?: string
          orgao_destino?: string | null
          orgao_origem?: string | null
          portaria?: string | null
          tipo: string
        }
        Update: {
          created_at?: string | null
          data?: string
          descricao?: string
          funcionario_id?: string | null
          id?: string
          orgao_destino?: string | null
          orgao_origem?: string | null
          portaria?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_funcionarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_funcionarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      notas: {
        Row: {
          aluno_id: string
          created_at: string
          escola_id: string
          id: string
          materia_id: string
          nota1: number | null
          nota2: number | null
          nota3: number | null
          nota4: number | null
          turma_id: string
          unidade: number
        }
        Insert: {
          aluno_id: string
          created_at?: string
          escola_id: string
          id?: string
          materia_id: string
          nota1?: number | null
          nota2?: number | null
          nota3?: number | null
          nota4?: number | null
          turma_id: string
          unidade: number
        }
        Update: {
          aluno_id?: string
          created_at?: string
          escola_id?: string
          id?: string
          materia_id?: string
          nota1?: number | null
          nota2?: number | null
          nota3?: number | null
          nota4?: number | null
          turma_id?: string
          unidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "notas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas_ativas"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          grupo_id: string | null
          id: string
          link: string | null
          message: string
          processado_em: string | null
          processado_por: string | null
          processado_por_nome: string | null
          read: boolean | null
          tenant_id: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          grupo_id?: string | null
          id?: string
          link?: string | null
          message: string
          processado_em?: string | null
          processado_por?: string | null
          processado_por_nome?: string | null
          read?: boolean | null
          tenant_id?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          grupo_id?: string | null
          id?: string
          link?: string | null
          message?: string
          processado_em?: string | null
          processado_por?: string | null
          processado_por_nome?: string | null
          read?: boolean | null
          tenant_id?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_processado_por_fkey"
            columns: ["processado_por"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_processado_por_fkey"
            columns: ["processado_por"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencias: {
        Row: {
          aluno_id: string | null
          created_at: string | null
          data: string
          descricao: string
          escola_id: string | null
          gravidade: string | null
          id: string
          registrado_por: string | null
          status_pais: string | null
          tipo: string
          turma_id: string | null
        }
        Insert: {
          aluno_id?: string | null
          created_at?: string | null
          data: string
          descricao: string
          escola_id?: string | null
          gravidade?: string | null
          id?: string
          registrado_por?: string | null
          status_pais?: string | null
          tipo: string
          turma_id?: string | null
        }
        Update: {
          aluno_id?: string | null
          created_at?: string | null
          data?: string
          descricao?: string
          escola_id?: string | null
          gravidade?: string | null
          id?: string
          registrado_por?: string | null
          status_pais?: string | null
          tipo?: string
          turma_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencias_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencias_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencias_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencias_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencias_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencias_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencias_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas_ativas"
            referencedColumns: ["id"]
          },
        ]
      }
      orgaos: {
        Row: {
          ativo: boolean | null
          created_at: string
          escola_id: string | null
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          escola_id?: string | null
          id?: string
          nome: string
          tipo: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          escola_id?: string | null
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "orgaos_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_metrics: {
        Row: {
          connection_type: string | null
          created_at: string
          device_memory: number | null
          escola_id: string | null
          funcionario_id: string | null
          hardware_concurrency: number | null
          id: string
          metric_name: string
          metric_value: number
          pathname: string
          rating: string
          user_agent: string | null
        }
        Insert: {
          connection_type?: string | null
          created_at?: string
          device_memory?: number | null
          escola_id?: string | null
          funcionario_id?: string | null
          hardware_concurrency?: number | null
          id?: string
          metric_name: string
          metric_value: number
          pathname: string
          rating: string
          user_agent?: string | null
        }
        Update: {
          connection_type?: string | null
          created_at?: string
          device_memory?: number | null
          escola_id?: string | null
          funcionario_id?: string | null
          hardware_concurrency?: number | null
          id?: string
          metric_name?: string
          metric_value?: number
          pathname?: string
          rating?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_metrics_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_metrics_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_metrics_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      pontos_ronda: {
        Row: {
          created_at: string
          escola_id: string | null
          funcionario_id: string | null
          id: string
          localizacao: Json
        }
        Insert: {
          created_at?: string
          escola_id?: string | null
          funcionario_id?: string | null
          id?: string
          localizacao: Json
        }
        Update: {
          created_at?: string
          escola_id?: string | null
          funcionario_id?: string | null
          id?: string
          localizacao?: Json
        }
        Relationships: [
          {
            foreignKeyName: "pontos_ronda_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pontos_ronda_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pontos_ronda_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      prazos_unidades: {
        Row: {
          created_at: string | null
          data_limite: string
          escola_id: string | null
          id: string
          unidade: number
        }
        Insert: {
          created_at?: string | null
          data_limite: string
          escola_id?: string | null
          id?: string
          unidade: number
        }
        Update: {
          created_at?: string | null
          data_limite?: string
          escola_id?: string | null
          id?: string
          unidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "prazos_unidades_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          funcionario_id: string | null
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          funcionario_id?: string | null
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          funcionario_id?: string | null
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      recuperacoes_finais: {
        Row: {
          aluno_id: string
          created_at: string
          escola_id: string
          id: string
          materia_id: string
          nota: number
          turma_id: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          escola_id: string
          id?: string
          materia_id: string
          nota: number
          turma_id: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          escola_id?: string
          id?: string
          materia_id?: string
          nota?: number
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recuperacoes_finais_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recuperacoes_finais_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recuperacoes_finais_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recuperacoes_finais_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recuperacoes_finais_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recuperacoes_finais_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas_ativas"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_ronda: {
        Row: {
          foto_url: string | null
          funcionario_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          observacao: string | null
          ponto_nome: string | null
          registrado_em: string | null
          rota_id: string | null
        }
        Insert: {
          foto_url?: string | null
          funcionario_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          observacao?: string | null
          ponto_nome?: string | null
          registrado_em?: string | null
          rota_id?: string | null
        }
        Update: {
          foto_url?: string | null
          funcionario_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          observacao?: string | null
          ponto_nome?: string | null
          registrado_em?: string | null
          rota_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_ronda_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ronda_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registros_ronda_rota_id_fkey"
            columns: ["rota_id"]
            isOneToOne: false
            referencedRelation: "rotas_ronda"
            referencedColumns: ["id"]
          },
        ]
      }
      rotas_ronda: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          escola_id: string | null
          funcionario_id: string | null
          id: string
          nome: string
          pontos_ronda: Json | null
          turno: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          escola_id?: string | null
          funcionario_id?: string | null
          id?: string
          nome: string
          pontos_ronda?: Json | null
          turno?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          escola_id?: string | null
          funcionario_id?: string | null
          id?: string
          nome?: string
          pontos_ronda?: Json | null
          turno?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rotas_ronda_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_ronda_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_ronda_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      rotas_transporte: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          escola_id: string | null
          horario_partida: string | null
          horario_retorno: string | null
          id: string
          motorista_id: string | null
          motorista_tarde_id: string | null
          nome: string
          pontos_parada: Json | null
          turno: string | null
          veiculo_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          escola_id?: string | null
          horario_partida?: string | null
          horario_retorno?: string | null
          id?: string
          motorista_id?: string | null
          motorista_tarde_id?: string | null
          nome: string
          pontos_parada?: Json | null
          turno?: string | null
          veiculo_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          escola_id?: string | null
          horario_partida?: string | null
          horario_retorno?: string | null
          id?: string
          motorista_id?: string | null
          motorista_tarde_id?: string | null
          nome?: string
          pontos_parada?: Json | null
          turno?: string | null
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rotas_transporte_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_transporte_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_transporte_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_transporte_motorista_tarde_id_fkey"
            columns: ["motorista_tarde_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_transporte_motorista_tarde_id_fkey"
            columns: ["motorista_tarde_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_transporte_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      secretarias: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          deleted_at: string | null
          id: string
          logo_url: string | null
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          nome: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
        }
        Relationships: []
      }
      solicitacoes_edicao_aluno: {
        Row: {
          aluno_id: string | null
          aprovado_por: string | null
          criado_em: string | null
          id: string
          justificativa: string
          justificativa_resposta: string | null
          respondido_em: string | null
          solicitante_id: string | null
          status: string
        }
        Insert: {
          aluno_id?: string | null
          aprovado_por?: string | null
          criado_em?: string | null
          id?: string
          justificativa: string
          justificativa_resposta?: string | null
          respondido_em?: string | null
          solicitante_id?: string | null
          status?: string
        }
        Update: {
          aluno_id?: string | null
          aprovado_por?: string | null
          criado_em?: string | null
          id?: string
          justificativa?: string
          justificativa_resposta?: string | null
          respondido_em?: string | null
          solicitante_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_edicao_aluno_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_edicao_aluno_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_edicao_aluno_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_edicao_aluno_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_edicao_aluno_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_edicao_aluno_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_rh: {
        Row: {
          created_at: string | null
          data: string
          funcionario_id: string | null
          id: string
          motivo: string
          status: string | null
          tipo: string
        }
        Insert: {
          created_at?: string | null
          data: string
          funcionario_id?: string | null
          id?: string
          motivo: string
          status?: string | null
          tipo: string
        }
        Update: {
          created_at?: string | null
          data?: string
          funcionario_id?: string | null
          id?: string
          motivo?: string
          status?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_rh_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_rh_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          chave: string
          descricao: string | null
          id: string
          updated_at: string | null
          updated_by: string | null
          valor: string
        }
        Insert: {
          chave: string
          descricao?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
          valor: string
        }
        Update: {
          chave?: string
          descricao?: string | null
          id?: string
          updated_at?: string | null
          updated_by?: string | null
          valor?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      transacoes_financeiras: {
        Row: {
          categoria: string
          comprovante_url: string | null
          conta: string
          created_at: string | null
          data: string
          descricao: string
          escola_id: string | null
          id: string
          tipo: string
          valor: number
        }
        Insert: {
          categoria: string
          comprovante_url?: string | null
          conta: string
          created_at?: string | null
          data: string
          descricao: string
          escola_id?: string | null
          id?: string
          tipo: string
          valor: number
        }
        Update: {
          categoria?: string
          comprovante_url?: string | null
          conta?: string
          created_at?: string | null
          data?: string
          descricao?: string
          escola_id?: string | null
          id?: string
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_financeiras_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      transferencias_alunos: {
        Row: {
          aluno_id: string
          arquivos_anexos: Json | null
          created_at: string | null
          escola_destino_id: string | null
          escola_origem_id: string | null
          ficha_snapshot: Json | null
          fora_da_rede: boolean | null
          id: string
          motivo: string | null
          respondido_em: string | null
          respondido_por: string | null
          resposta_texto: string | null
          solicitante_id: string | null
          status: string | null
        }
        Insert: {
          aluno_id: string
          arquivos_anexos?: Json | null
          created_at?: string | null
          escola_destino_id?: string | null
          escola_origem_id?: string | null
          ficha_snapshot?: Json | null
          fora_da_rede?: boolean | null
          id?: string
          motivo?: string | null
          respondido_em?: string | null
          respondido_por?: string | null
          resposta_texto?: string | null
          solicitante_id?: string | null
          status?: string | null
        }
        Update: {
          aluno_id?: string
          arquivos_anexos?: Json | null
          created_at?: string | null
          escola_destino_id?: string | null
          escola_origem_id?: string | null
          ficha_snapshot?: Json | null
          fora_da_rede?: boolean | null
          id?: string
          motivo?: string | null
          respondido_em?: string | null
          respondido_por?: string | null
          resposta_texto?: string | null
          solicitante_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transferencias_alunos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_alunos_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_alunos_escola_destino_id_fkey"
            columns: ["escola_destino_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_alunos_escola_origem_id_fkey"
            columns: ["escola_origem_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_alunos_respondido_por_fkey"
            columns: ["respondido_por"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_alunos_respondido_por_fkey"
            columns: ["respondido_por"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_alunos_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_alunos_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      transferencias_funcionarios: {
        Row: {
          arquivos_anexos: Json | null
          created_at: string | null
          escola_destino_id: string | null
          escola_origem_id: string
          ficha_snapshot: Json | null
          fora_da_rede: boolean | null
          funcionario_id: string
          id: string
          lotacao_id: string | null
          motivo: string | null
          respondido_em: string | null
          respondido_por: string | null
          resposta_texto: string | null
          solicitante_id: string | null
          status: string | null
        }
        Insert: {
          arquivos_anexos?: Json | null
          created_at?: string | null
          escola_destino_id?: string | null
          escola_origem_id: string
          ficha_snapshot?: Json | null
          fora_da_rede?: boolean | null
          funcionario_id: string
          id?: string
          lotacao_id?: string | null
          motivo?: string | null
          respondido_em?: string | null
          respondido_por?: string | null
          resposta_texto?: string | null
          solicitante_id?: string | null
          status?: string | null
        }
        Update: {
          arquivos_anexos?: Json | null
          created_at?: string | null
          escola_destino_id?: string | null
          escola_origem_id?: string
          ficha_snapshot?: Json | null
          fora_da_rede?: boolean | null
          funcionario_id?: string
          id?: string
          lotacao_id?: string | null
          motivo?: string | null
          respondido_em?: string | null
          respondido_por?: string | null
          resposta_texto?: string | null
          solicitante_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transferencias_funcionarios_escola_destino_id_fkey"
            columns: ["escola_destino_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_funcionarios_escola_origem_id_fkey"
            columns: ["escola_origem_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_funcionarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_funcionarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_funcionarios_lotacao_id_fkey"
            columns: ["lotacao_id"]
            isOneToOne: false
            referencedRelation: "vinculos_funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_funcionarios_respondido_por_fkey"
            columns: ["respondido_por"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_funcionarios_respondido_por_fkey"
            columns: ["respondido_por"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_funcionarios_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transferencias_funcionarios_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      trash_bin: {
        Row: {
          deleted_at: string | null
          deleted_by_email: string | null
          deleted_by_id: string | null
          deleted_by_name: string | null
          id: string
          record_id: string
          record_payload: Json
          record_summary: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by_id: string | null
          resolved_by_name: string | null
          status: string | null
          table_name: string
          tenant_id: string | null
        }
        Insert: {
          deleted_at?: string | null
          deleted_by_email?: string | null
          deleted_by_id?: string | null
          deleted_by_name?: string | null
          id?: string
          record_id: string
          record_payload: Json
          record_summary: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by_id?: string | null
          resolved_by_name?: string | null
          status?: string | null
          table_name: string
          tenant_id?: string | null
        }
        Update: {
          deleted_at?: string | null
          deleted_by_email?: string | null
          deleted_by_id?: string | null
          deleted_by_name?: string | null
          id?: string
          record_id?: string
          record_payload?: Json
          record_summary?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by_id?: string | null
          resolved_by_name?: string | null
          status?: string | null
          table_name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trash_bin_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      turmas: {
        Row: {
          ano_letivo: number
          capacidade: number | null
          created_at: string
          deleted_at: string | null
          escola_id: string | null
          id: string
          nome: string
          turno: string | null
        }
        Insert: {
          ano_letivo: number
          capacidade?: number | null
          created_at?: string
          deleted_at?: string | null
          escola_id?: string | null
          id?: string
          nome: string
          turno?: string | null
        }
        Update: {
          ano_letivo?: number
          capacidade?: number | null
          created_at?: string
          deleted_at?: string | null
          escola_id?: string | null
          id?: string
          nome?: string
          turno?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turmas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos: {
        Row: {
          capacidade: number | null
          created_at: string | null
          id: string
          modelo: string
          motorista_id: string | null
          placa: string
          status: string | null
        }
        Insert: {
          capacidade?: number | null
          created_at?: string | null
          id?: string
          modelo: string
          motorista_id?: string | null
          placa: string
          status?: string | null
        }
        Update: {
          capacidade?: number | null
          created_at?: string | null
          id?: string
          modelo?: string
          motorista_id?: string | null
          placa?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_motorista_id_fkey"
            columns: ["motorista_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      vinculos_funcionarios: {
        Row: {
          ativo: boolean
          carga_horaria: number | null
          cargo: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          escola_id: string | null
          funcionario_id: string | null
          id: string
          modalidade_ensino: string | null
          tipo_vinculo: string | null
        }
        Insert: {
          ativo?: boolean
          carga_horaria?: number | null
          cargo?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          escola_id?: string | null
          funcionario_id?: string | null
          id?: string
          modalidade_ensino?: string | null
          tipo_vinculo?: string | null
        }
        Update: {
          ativo?: boolean
          carga_horaria?: number | null
          cargo?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          escola_id?: string | null
          funcionario_id?: string | null
          id?: string
          modalidade_ensino?: string | null
          tipo_vinculo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vinculos_funcionarios_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinculos_funcionarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinculos_funcionarios_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      vinculos_turmas: {
        Row: {
          created_at: string
          escola_id: string
          funcionario_id: string
          id: string
          tipo: string
          turma_id: string
        }
        Insert: {
          created_at?: string
          escola_id: string
          funcionario_id: string
          id?: string
          tipo: string
          turma_id: string
        }
        Update: {
          created_at?: string
          escola_id?: string
          funcionario_id?: string
          id?: string
          tipo?: string
          turma_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vinculos_turmas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinculos_turmas_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinculos_turmas_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinculos_turmas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinculos_turmas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas_ativas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      alunos_ativos: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          escola_id: string | null
          foto_url: string | null
          id: string | null
          nome: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          escola_id?: string | null
          foto_url?: string | null
          id?: string | null
          nome?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          escola_id?: string | null
          foto_url?: string | null
          id?: string | null
          nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alunos_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
      boletins_calculados: {
        Row: {
          aluno_id: string | null
          escola_id: string | null
          is_elegivel_rec: boolean | null
          m1: number | null
          m2: number | null
          m3: number | null
          materia_id: string | null
          media_final: number | null
          media_pos_rec: number | null
          nota_rec: number | null
          situacao: string | null
          todas_unidades: boolean | null
          turma_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas_ativas"
            referencedColumns: ["id"]
          },
        ]
      }
      boletins_consolidados: {
        Row: {
          aluno_id: string | null
          escola_id: string | null
          is_elegivel_rec: boolean | null
          m1: number | null
          m2: number | null
          m3: number | null
          materia_id: string | null
          media_final: number | null
          media_pos_rec: number | null
          nota_rec: number | null
          situacao: string | null
          todas_unidades: boolean | null
          turma_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos_ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_materia_id_fkey"
            columns: ["materia_id"]
            isOneToOne: false
            referencedRelation: "materias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_turma_id_fkey"
            columns: ["turma_id"]
            isOneToOne: false
            referencedRelation: "turmas_ativas"
            referencedColumns: ["id"]
          },
        ]
      }
      funcionarios_ativos: {
        Row: {
          auth_user_id: string | null
          cargo: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          id: string | null
          is_conta_especial: boolean | null
          is_superadmin: boolean | null
          nome: string | null
          primeiro_acesso: boolean | null
          status: string | null
        }
        Insert: {
          auth_user_id?: string | null
          cargo?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string | null
          is_conta_especial?: boolean | null
          is_superadmin?: boolean | null
          nome?: string | null
          primeiro_acesso?: boolean | null
          status?: string | null
        }
        Update: {
          auth_user_id?: string | null
          cargo?: string | null
          created_at?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string | null
          is_conta_especial?: boolean | null
          is_superadmin?: boolean | null
          nome?: string | null
          primeiro_acesso?: boolean | null
          status?: string | null
        }
        Relationships: []
      }
      performance_metrics_by_route: {
        Row: {
          avg_value: number | null
          pathname: string | null
          sample_count: number | null
        }
        Relationships: []
      }
      performance_metrics_summary: {
        Row: {
          avg_value: number | null
          metric_name: string | null
          sample_count: number | null
        }
        Relationships: []
      }
      turmas_ativas: {
        Row: {
          ano_letivo: number | null
          created_at: string | null
          deleted_at: string | null
          escola_id: string | null
          id: string | null
          nome: string | null
        }
        Insert: {
          ano_letivo?: number | null
          created_at?: string | null
          deleted_at?: string | null
          escola_id?: string | null
          id?: string | null
          nome?: string | null
        }
        Update: {
          ano_letivo?: number | null
          created_at?: string | null
          deleted_at?: string | null
          escola_id?: string | null
          id?: string | null
          nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "turmas_escola_id_fkey"
            columns: ["escola_id"]
            isOneToOne: false
            referencedRelation: "escolas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_chefe_gerencia_funcionario: {
        Args: { f_cargo: string; f_id: string }
        Returns: boolean
      }
      check_funcionario_tem_acesso_escola: {
        Args: { escola_id_param: string }
        Returns: boolean
      }
      check_vinculo_escola: {
        Args: { escola_id_param: string }
        Returns: boolean
      }
      cleanup_performance_metrics: { Args: never; Returns: undefined }
      criar_notificacoes: {
        Args: {
          p_destinatarios: string[]
          p_grupo_id?: string
          p_link?: string
          p_message?: string
          p_tenant_id?: string
          p_title?: string
          p_type?: string
        }
        Returns: {
          created_at: string | null
          grupo_id: string | null
          id: string
          link: string | null
          message: string
          processado_em: string | null
          processado_por: string | null
          processado_por_nome: string | null
          read: boolean | null
          tenant_id: string | null
          title: string
          type: string | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "notifications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      efetivar_desligamento_rpc: {
        Args: {
          p_data_desligamento: string
          p_desligamento_id: string
          p_vinculo_id: string
        }
        Returns: undefined
      }
      gerar_agenda_ano_letivo: {
        Args: {
          p_ano_letivo: number
          p_data_fim: string
          p_data_inicio: string
          p_escola_id: string
        }
        Returns: number
      }
      gerar_numero_matricula: {
        Args: {
          aluno_id: string
          p_data_matricula: string
          p_escola_id: string
        }
        Returns: string
      }
      get_auth_funcionario_id: { Args: never; Returns: string }
      get_birthdays_of_month:
        | {
            Args: { month_num: number }
            Returns: {
              day: number
              foto_avatar_path: string
              foto_url: string
              foto_visualizacao_path: string
              name: string
              role: string
            }[]
          }
        | {
            Args: { month_num: number; p_secretaria_id?: string }
            Returns: {
              day: number
              foto_avatar_path: string
              foto_url: string
              foto_visualizacao_path: string
              name: string
              role: string
            }[]
          }
      get_dashboard_resumo: {
        Args: { p_escola_id: string; p_funcionario_id?: string }
        Returns: Json
      }
      get_funcionario_id_from_auth: { Args: never; Returns: string }
      get_indicadores_pendencias_frequencia: {
        Args: { p_prazo_dias?: number }
        Returns: {
          data_aula: string
          dias_decorridos: number
          dias_restantes: number
          diretor_auth_id: string
          diretor_id: string
          diretor_nome: string
          escola_id: string
          escola_nome: string
          materia_id: string
          materia_nome: string
          professor_auth_id: string
          professor_id: string
          professor_nome: string
          status_prazo: string
          turma_id: string
          turma_nome: string
        }[]
      }
      get_indicadores_pendencias_notas: {
        Args: { p_unidade: number }
        Returns: {
          alunos_pendentes: number
          escola_id: string
          escola_nome: string
          total_alunos: number
        }[]
      }
      get_my_active_sessions: {
        Args: never
        Returns: {
          created_at: string
          id: string
          ip: unknown
          refreshed_at: string
          user_agent: string
        }[]
      }
      get_performance_dashboard_stats: {
        Args: { period_days?: number }
        Returns: Json
      }
      get_relatorio_servidores: {
        Args: {
          p_cargo?: string
          p_escola_id?: string
          p_modalidade?: string
          p_vinculo_tipo?: string
        }
        Returns: Json
      }
      get_storage_objects: {
        Args: never
        Returns: {
          bucket_id: string
          created_at: string
          id: string
          metadata: Json
          name: string
        }[]
      }
      is_admin_global: { Args: never; Returns: boolean }
      is_diretor_da_escola: { Args: { escola_alvo: string }; Returns: boolean }
      is_superadmin_by_uid: { Args: never; Returns: boolean }
      is_superadmin_email: { Args: { user_email: string }; Returns: boolean }
      obter_admin_dashboard_kpis: {
        Args: { p_data?: string; p_escola_id: string; p_inicio_mes?: string }
        Returns: Json
      }
      obter_dados_boletim: {
        Args: { p_aluno_id: string; p_escola_id: string; p_turma_id: string }
        Returns: Json
      }
      obter_multi_escolas_stats: {
        Args: {
          p_data?: string
          p_escola_ids: string[]
          p_funcionario_id: string
        }
        Returns: Json
      }
      obter_turmas_com_frequencia_hoje: {
        Args: { p_data: string; p_escola_id: string }
        Returns: number
      }
      pode_atualizar_notificacao: {
        Args: { p_notif_id: string; p_user_id: string }
        Returns: boolean
      }
      pode_ler_funcionario: {
        Args: { funcionario_id_alvo: string }
        Returns: boolean
      }
      processar_decisao_transferencia_lotacao: {
        Args: {
          p_aceitar: boolean
          p_respondido_por_id: string
          p_resposta_texto: string
          p_transferencia_id: string
        }
        Returns: undefined
      }
      reverter_transferencia_lotacao: {
        Args: { p_revertido_por_id: string; p_transferencia_id: string }
        Returns: undefined
      }
      revoke_all_other_sessions: {
        Args: { current_session_id: string }
        Returns: number
      }
      revoke_my_session: {
        Args: { target_session_id: string }
        Returns: boolean
      }
      salvar_frequencias_lote: { Args: { p_frequencias: Json }; Returns: Json }
      tem_acesso_a_escola: { Args: { escola_alvo: string }; Returns: boolean }
      tem_acesso_a_escola_audit: {
        Args: { p_tenant_id: string }
        Returns: boolean
      }
      tem_acesso_a_secretaria: {
        Args: { p_secretaria_id: string }
        Returns: boolean
      }
      tem_permissao: {
        Args: { p_escola_id?: string; p_permissao: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
