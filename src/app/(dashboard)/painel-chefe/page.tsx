'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldAlert, Home } from 'lucide-react'
import Link from 'next/link'

export default function PainelChefePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] p-6 text-center">
      <Card className="max-w-lg w-full p-8 border-border bg-card shadow-lg rounded-2xl flex flex-col items-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Módulo Desativado
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O <strong>Painel de Liderança</strong> encontra-se desativado no sistema para futura deliberação da gestão e não está disponível para diretores escolares.
          </p>
        </div>

        <div className="pt-2 w-full flex justify-center gap-3">
          <Link href="/home" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto gap-2 font-semibold">
              <Home className="w-4 h-4" />
              Voltar ao Início
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
