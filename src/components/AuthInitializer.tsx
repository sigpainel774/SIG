'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { Database } from '@/types/supabase'

type Funcionario = Database['public']['Tables']['funcionarios']['Row']
type AcessoUsuario = Database['public']['Tables']['acessos_usuarios']['Row']

interface AuthInitializerProps {
  funcionario: Funcionario | null
  acessos: AcessoUsuario[]
}

export function AuthInitializer({ funcionario, acessos }: AuthInitializerProps) {
  const initialized = useRef(false)

  // Inicializa a store no ciclo de renderização inicial (SSR/Hydration seguro)
  if (!initialized.current && funcionario) {
    useAuthStore.getState().setAuth(funcionario, acessos)
    
    // Se não há uma escola/órgão ativo configurado e temos acessos, define o primeiro como ativo
    if (acessos.length > 0 && !useAuthStore.getState().escolaAtivaId) {
      // Prioriza orgao_id se houver
      const primeiroAcesso = acessos[0]
      if (primeiroAcesso.orgao_id) {
        useAuthStore.getState().setEscolaAtivaId(primeiroAcesso.orgao_id)
      }
    }
    initialized.current = true
  }

  // Mantém a store em sincronia caso os dados do funcionário ou acessos mudem
  useEffect(() => {
    if (funcionario) {
      useAuthStore.getState().setAuth(funcionario, acessos)
    }
  }, [funcionario, acessos])

  return null
}
