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
          pode_turmas: boolean | null
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
          pode_turmas?: boolean | null
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
          pode_turmas?: boolean | null
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
      alunos: {
        Row: {
          cartao_sus: string | null
          certidao_nascimento: string | null
          cpf: string | null
          created_at: string
          dados_matricula: Json | null
          data_nascimento: string | null
          deleted_at: string | null
          endereco: string | null
          escola_id: string | null
          foto_url: string | null
          id: string
          inep: string | null
          latitude: number | null
          longitude: number | null
          nis: string | null
          nome: string
          nome_mae: string | null
          nome_pai: string | null
          rg: string | null
          serie: string | null
          telefone: string | null
          turma_id: string | null
        }
        Insert: {
          cartao_sus?: string | null
          certidao_nascimento?: string | null
          cpf?: string | null
          created_at?: string
          dados_matricula?: Json | null
          data_nascimento?: string | null
          deleted_at?: string | null
          endereco?: string | null
          escola_id?: string | null
          foto_url?: string | null
          id?: string
          inep?: string | null
          latitude?: number | null
          longitude?: number | null
          nis?: string | null
          nome: string
          nome_mae?: string | null
          nome_pai?: string | null
          rg?: string | null
          serie?: string | null
          telefone?: string | null
          turma_id?: string | null
        }
        Update: {
          cartao_sus?: string | null
          certidao_nascimento?: string | null
          cpf?: string | null
          created_at?: string
          dados_matricula?: Json | null
          data_nascimento?: string | null
          deleted_at?: string | null
          endereco?: string | null
          escola_id?: string | null
          foto_url?: string | null
          id?: string
          inep?: string | null
          latitude?: number | null
          longitude?: number | null
          nis?: string | null
          nome?: string
          nome_mae?: string | null
          nome_pai?: string | null
          rg?: string | null
          serie?: string | null
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
      alunos_transporte: {
        Row: {
          aluno_id: string | null
          created_at: string | null
          id: string
          ponto_embarque: string | null
          rota_id: string | null
        }
        Insert: {
          aluno_id?: string | null
          created_at?: string | null
          id?: string
          ponto_embarque?: string | null
          rota_id?: string | null
        }
        Update: {
          aluno_id?: string | null
          created_at?: string | null
          id?: string
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
      atestados: {
        Row: {
          anexo_nome: string | null
          anexo_url: string | null
          cid: string
          created_at: string | null
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
        }
        Relationships: []
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
          ativo: boolean | null
          created_at: string
          deleted_at: string | null
          diretor_id: string | null
          endereco: string | null
          id: string
          inep: string | null
          logo_url: string | null
          modulos_ativos: string[] | null
          nome: string
          plano: string | null
          telefone: string | null
          tipo: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          deleted_at?: string | null
          diretor_id?: string | null
          endereco?: string | null
          id?: string
          inep?: string | null
          logo_url?: string | null
          modulos_ativos?: string[] | null
          nome: string
          plano?: string | null
          telefone?: string | null
          tipo?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          deleted_at?: string | null
          diretor_id?: string | null
          endereco?: string | null
          id?: string
          inep?: string | null
          logo_url?: string | null
          modulos_ativos?: string[] | null
          nome?: string
          plano?: string | null
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
        ]
      }
      frequencias: {
        Row: {
          aluno_id: string
          created_at: string
          data: string
          escola_id: string
          id: string
          presenca: boolean
          turma_id: string
        }
        Insert: {
          aluno_id: string
          created_at?: string
          data: string
          escola_id: string
          id?: string
          presenca: boolean
          turma_id: string
        }
        Update: {
          aluno_id?: string
          created_at?: string
          data?: string
          escola_id?: string
          id?: string
          presenca?: boolean
          turma_id?: string
        }
        Relationships: [
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
          auth_user_id: string | null
          cargo: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          deleted_at: string | null
          email: string
          endereco: string | null
          formacao: string | null
          foto_url: string | null
          id: string
          is_superadmin: boolean | null
          latitude: number | null
          longitude: number | null
          nome: string
          primeiro_acesso: boolean | null
          status: string | null
        }
        Insert: {
          auth_user_id?: string | null
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          deleted_at?: string | null
          email: string
          endereco?: string | null
          formacao?: string | null
          foto_url?: string | null
          id?: string
          is_superadmin?: boolean | null
          latitude?: number | null
          longitude?: number | null
          nome: string
          primeiro_acesso?: boolean | null
          status?: string | null
        }
        Update: {
          auth_user_id?: string | null
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          deleted_at?: string | null
          email?: string
          endereco?: string | null
          formacao?: string | null
          foto_url?: string | null
          id?: string
          is_superadmin?: boolean | null
          latitude?: number | null
          longitude?: number | null
          nome?: string
          primeiro_acesso?: boolean | null
          status?: string | null
        }
        Relationships: []
      }
      materias: {
        Row: {
          created_at: string
          escola_id: string | null
          id: string
          nome: string
          professor_id: string | null
          turma_id: string | null
        }
        Insert: {
          created_at?: string
          escola_id?: string | null
          id?: string
          nome: string
          professor_id?: string | null
          turma_id?: string | null
        }
        Update: {
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
          id: string
          link: string | null
          message: string
          read: boolean | null
          tenant_id: string | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          link?: string | null
          message: string
          read?: boolean | null
          tenant_id?: string | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          link?: string | null
          message?: string
          read?: boolean | null
          tenant_id?: string | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: [
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
          id: string
          nome: string
          pontos_parada: Json | null
          turno: string | null
          veiculo_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          escola_id?: string | null
          id?: string
          nome: string
          pontos_parada?: Json | null
          turno?: string | null
          veiculo_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          escola_id?: string | null
          id?: string
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
            foreignKeyName: "rotas_transporte_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
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
          cargo: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          escola_id: string | null
          funcionario_id: string | null
          id: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          escola_id?: string | null
          funcionario_id?: string | null
          id?: string
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          escola_id?: string | null
          funcionario_id?: string | null
          id?: string
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
      funcionarios_ativos: {
        Row: {
          auth_user_id: string | null
          cargo: string | null
          created_at: string | null
          deleted_at: string | null
          email: string | null
          id: string | null
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
      get_auth_funcionario_id: { Args: never; Returns: string }
      get_birthdays_of_month: {
        Args: { month_num: number }
        Returns: {
          day: number
          name: string
          role: string
        }[]
      }
      get_funcionario_id_from_auth: { Args: never; Returns: string }
      is_admin_global: { Args: never; Returns: boolean }
      is_superadmin_by_uid: { Args: never; Returns: boolean }
      is_superadmin_email: { Args: { user_email: string }; Returns: boolean }
      tem_acesso_a_escola: { Args: { escola_alvo: string }; Returns: boolean }
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
