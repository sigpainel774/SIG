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
          created_at: string
          deleted_at: string | null
          escola_id: string | null
          foto_url: string | null
          id: string
          nome: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          escola_id?: string | null
          foto_url?: string | null
          id?: string
          nome: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          escola_id?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
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
      escolas: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          logo_url: string | null
          modulos_ativos: string[] | null
          nome: string
          plano: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          modulos_ativos?: string[] | null
          nome: string
          plano?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          logo_url?: string | null
          modulos_ativos?: string[] | null
          nome?: string
          plano?: string | null
        }
        Relationships: []
      }
      funcionarios: {
        Row: {
          auth_user_id: string | null
          cargo: string | null
          created_at: string
          deleted_at: string | null
          email: string
          id: string
          is_superadmin: boolean | null
          nome: string
          primeiro_acesso: boolean | null
          status: string | null
        }
        Insert: {
          auth_user_id?: string | null
          cargo?: string | null
          created_at?: string
          deleted_at?: string | null
          email: string
          id?: string
          is_superadmin?: boolean | null
          nome: string
          primeiro_acesso?: boolean | null
          status?: string | null
        }
        Update: {
          auth_user_id?: string | null
          cargo?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string
          id?: string
          is_superadmin?: boolean | null
          nome?: string
          primeiro_acesso?: boolean | null
          status?: string | null
        }
        Relationships: []
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
          created_at: string
          deleted_at: string | null
          escola_id: string | null
          id: string
          nome: string
        }
        Insert: {
          ano_letivo: number
          created_at?: string
          deleted_at?: string | null
          escola_id?: string | null
          id?: string
          nome: string
        }
        Update: {
          ano_letivo?: number
          created_at?: string
          deleted_at?: string | null
          escola_id?: string | null
          id?: string
          nome?: string
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
      vinculos_funcionarios: {
        Row: {
          created_at: string
          escola_id: string | null
          funcionario_id: string | null
          id: string
        }
        Insert: {
          created_at?: string
          escola_id?: string | null
          funcionario_id?: string | null
          id?: string
        }
        Update: {
          created_at?: string
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
