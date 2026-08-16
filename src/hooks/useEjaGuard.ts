'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'

export function useEjaGuard() {
  const router = useRouter()
  const { selectedEscola } = useSchoolStore()
  const { funcionario, acessos, isDiretor, isAdminGlobalOrRoot, isContaEja } = useAuthStore()

  const [authorized, setAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    const isSuper = isAdminGlobalOrRoot() || Boolean(funcionario?.is_superadmin)
    const isEjaAcc = isContaEja()
    const ejaEscolaAtivo = Boolean(selectedEscola?.eja_ativo)
    const isFuncEja = (funcionario?.modalidade_ensino ?? '').toUpperCase() === 'EJA'
    const temPermissaoEja = Boolean(acessos?.some((a) => (a as any).pode_eja === true && a.ativo))
    const isDir = isDiretor()

    const hasAccess = isSuper || isEjaAcc || (ejaEscolaAtivo && (isDir || isFuncEja || temPermissaoEja))

    if (!hasAccess) {
      setAuthorized(false)
      router.replace('/home')
    } else {
      setAuthorized(true)
    }
  }, [selectedEscola, funcionario, acessos, isDiretor, isAdminGlobalOrRoot, isContaEja, router])

  return { authorized, selectedEscola }
}
