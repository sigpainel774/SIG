'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { createClient } from '@/lib/supabaseClient'

export function useCheckPermissao(permissaoChave: string) {
  const { funcionario, isAdminGlobalOrRoot, isDiretor, escolaAtivaId } = useAuthStore()
  const { selectedEscola } = useSchoolStore()
  const escolaIdToUse = escolaAtivaId || selectedEscola?.id || null

  const [temPermissao, setTemPermissao] = useState<boolean>(true)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let isMounted = true

    async function checar() {
      // 1. Superadmin ou Diretor possuem permissão plena
      if (isAdminGlobalOrRoot() || isDiretor()) {
        if (isMounted) {
          setTemPermissao(true)
          setLoading(false)
        }
        return
      }

      // 2. Se não houver funcionário logado, nega
      if (!funcionario?.id) {
        if (isMounted) {
          setTemPermissao(false)
          setLoading(false)
        }
        return
      }

      try {
        const supabase = createClient()
        
        // Chama a RPC de segurança do banco
        const { data, error } = await (supabase.rpc as any)('tem_permissao', {
          p_permissao: permissaoChave,
          p_escola_id: escolaIdToUse,
        })

        if (!error && typeof data === 'boolean') {
          if (isMounted) setTemPermissao(data)
        } else {
          // Fallback seguro: se falhar a RPC, nega por padrão para nível 3+
          if (isMounted) setTemPermissao(false)
        }
      } catch (err) {
        console.error('Erro ao verificar permissão:', err)
        if (isMounted) setTemPermissao(false)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    checar()

    return () => {
      isMounted = false
    }
  }, [permissaoChave, escolaIdToUse, funcionario?.id, isAdminGlobalOrRoot, isDiretor])

  return { temPermissao, loading }
}
