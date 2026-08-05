'use client'

import React from 'react'
import { FileSpreadsheet, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IconTile } from '@/components/ui/icon-tile'
import Link from 'next/link'

export default function SolicitacoesEscolaPage() {
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/home">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <IconTile
            icon={FileSpreadsheet}
            variant="primary"
            className="h-10 w-10 shrink-0"
          />
          <h1 className="text-2xl font-bold text-foreground">
            Relatórios das Escolas
          </h1>
        </div>
      </div>

      {/* Conteúdo Provisório */}
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-[#141416] border border-[#26262a] rounded-2xl shadow-sm">
        <FileSpreadsheet className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Página em Construção
        </h2>
        <p className="text-muted-foreground max-w-md">
          O módulo de relatórios e solicitações das escolas regulares para a EMAEE está sendo desenvolvido. Em breve, você poderá visualizar e gerenciar os relatórios enviados pelas escolas aqui.
        </p>
      </div>
    </div>
  )
}
