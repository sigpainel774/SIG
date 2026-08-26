'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function VisitasBridgePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/alpha/visitas')
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-muted-foreground">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="text-xs font-semibold">Carregando módulo Visitas...</p>
    </div>
  )
}
