'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore, VinculoFuncionario } from '@/store/useAuthStore'
import { Database } from '@/types/supabase'

type Funcionario = Database['public']['Tables']['funcionarios']['Row']
type AcessoUsuario = Database['public']['Tables']['acessos_usuarios']['Row']

interface AuthInitializerProps {
  funcionario: Funcionario | null
  acessos: AcessoUsuario[]
  vinculos?: VinculoFuncionario[]
}

export function AuthInitializer({ funcionario, acessos, vinculos = [] }: AuthInitializerProps) {
  const initialized = useRef(false)

  // Inicializa a store no ciclo de renderização inicial (SSR/Hydration seguro)
  if (!initialized.current && funcionario) {
    useAuthStore.getState().setAuth(funcionario, acessos, vinculos)
    
    const state = useAuthStore.getState()
    const vinculosAtivos = vinculos.filter(v => v.ativo)
    const acessosAtivos = acessos.filter(a => a.nivel && a.nivel >= 2 && a.nivel <= 6 && a.ativo)
    
    const escolaValida = 
      state.escolaAtivaId && 
      (acessosAtivos.some(a => a.escola_id === state.escolaAtivaId) || 
       vinculosAtivos.some(v => v.escola_id === state.escolaAtivaId))

    if (!escolaValida) {
      const acessoNivelEscolar = acessosAtivos[0]
      if (acessoNivelEscolar?.escola_id) {
        state.setEscolaAtivaId(acessoNivelEscolar.escola_id)
      } else if (!state.isAdminGlobalOrRoot()) {
        const primeiroVinculo = vinculosAtivos[0]
        if (primeiroVinculo?.escola_id) {
          state.setEscolaAtivaId(primeiroVinculo.escola_id)
        }
      }
    }
    initialized.current = true
  }

  // Mantém a store em sincronia caso os dados do funcionário ou acessos mudem
  useEffect(() => {
    if (funcionario) {
      useAuthStore.getState().setAuth(funcionario, acessos, vinculos)
      const state = useAuthStore.getState()
      const vinculosAtivos = vinculos.filter(v => v.ativo)
      const acessosAtivos = acessos.filter(a => a.nivel && a.nivel >= 2 && a.nivel <= 6 && a.ativo)
      
      const escolaValida = 
        state.escolaAtivaId && 
        (acessosAtivos.some(a => a.escola_id === state.escolaAtivaId) || 
         vinculosAtivos.some(v => v.escola_id === state.escolaAtivaId))

      if (!escolaValida) {
        const acessoNivelEscolar = acessosAtivos[0]
        if (acessoNivelEscolar?.escola_id) {
          state.setEscolaAtivaId(acessoNivelEscolar.escola_id)
        } else if (!state.isAdminGlobalOrRoot()) {
          const primeiroVinculo = vinculosAtivos[0]
          if (primeiroVinculo?.escola_id) {
            state.setEscolaAtivaId(primeiroVinculo.escola_id)
          }
        }
      }
    }
  }, [funcionario, acessos, vinculos])

  return null
}
