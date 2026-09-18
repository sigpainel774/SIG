'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { MapPin, ArrowLeft, Loader2, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuthStore } from '@/store/useAuthStore'

const LocalidadesTab = dynamic(() => import('@/components/configuracoes/LocalidadesTab'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  ),
})

export default function AdminLocalidadesPage() {
  const router = useRouter()
  const { funcionario, isAdminGlobalOrRoot } = useAuthStore()
  const isAdmin = isAdminGlobalOrRoot()

  useEffect(() => {
    if (funcionario && !isAdmin) {
      router.push('/home')
    }
  }, [funcionario, isAdmin, router])

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <Card className="max-w-md w-full p-8 border-border bg-card shadow-lg rounded-2xl flex flex-col items-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Acesso Restrito</h1>
          <p className="text-sm text-muted-foreground">
            A gestão de Localidades &amp; Territórios é restrita aos administradores gerais do sistema.
          </p>
          <Link href="/home">
            <Button variant="outline" className="mt-2">Voltar ao Início</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header com Navegação de Retorno */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-border bg-card hover:bg-accent text-foreground transition-colors cursor-pointer"
              title="Voltar ao Painel Administrativo"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <MapPin className="w-7 h-7 text-amber-500 dark:text-amber-400 shrink-0" />
              Localidades &amp; Território Municipal
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Mapeamento de povoados, comunidades rurais e assentamentos para geolocalização e rótulos do mapa.
            </p>
          </div>
        </div>
      </div>

      {/* Componente de Gestão de Localidades */}
      <div className="animate-in fade-in-50 duration-200">
        <LocalidadesTab />
      </div>
    </div>
  )
}
