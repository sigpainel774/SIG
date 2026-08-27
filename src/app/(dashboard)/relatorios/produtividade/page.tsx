'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, Award, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SchoolSelector } from '@/components/SchoolSelector'
import { useSchoolStore } from '@/store/useSchoolStore'
import { useAuthStore } from '@/store/useAuthStore'
import RelatorioProdutividadeSecretarios from '@/components/relatorios/RelatorioProdutividadeSecretarios'

export default function ProdutividadeSecretariosPage() {
  const { selectedEscola } = useSchoolStore()
  const { isAdminGlobalOrRoot, acessos } = useAuthStore()

  const isSuperAdminOrNivel1 = isAdminGlobalOrRoot() || acessos?.some(a => a.nivel === 1 && a.ativo)

  if (!isSuperAdminOrNivel1) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200 p-4 md:p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-3 pb-4 border-b border-border">
          <Link href="/relatorios">
            <Button variant="outline" className="bg-secondary hover:bg-hoverCustom border-border text-foreground gap-2 rounded-xl text-xs">
              <ArrowLeft className="w-4 h-4" />
              Voltar aos Relatórios
            </Button>
          </Link>
        </div>

        <div className="flex flex-col items-center justify-center p-12 bg-card border border-border rounded-2xl text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Acesso Exclusivo para Gestão de Nível 1</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            O Relatório de Produtividade dos Secretários Escolares é confidencial e restrito exclusivamente ao Secretário Municipal de Educação e Gestores Globais de Nível 1.
          </p>
          <Link href="/relatorios">
            <Button className="bg-primary text-primary-foreground font-semibold rounded-xl text-xs">
              Retornar à Central de Relatórios
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border no-print">
        <div className="flex items-center gap-3">
          <Link href="/relatorios">
            <Button variant="outline" className="bg-secondary hover:bg-hoverCustom border-border text-foreground gap-2 rounded-xl text-xs">
              <ArrowLeft className="w-4 h-4" />
              Voltar aos Relatórios
            </Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              Produtividade dos Secretários Escolares
            </h1>
            <p className="text-xs text-muted-foreground">
              {selectedEscola ? `Filtro: ${selectedEscola.nome}` : 'Visão Geral da Rede (Macro Sapeaçu)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SchoolSelector scope="all" />
        </div>
      </div>

      {/* Main Productivity Report Component */}
      <RelatorioProdutividadeSecretarios selectedEscola={selectedEscola} />
    </div>
  )
}
