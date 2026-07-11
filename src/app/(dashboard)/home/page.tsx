'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Pin, 
  BookOpen, 
  Users, 
  FileText, 
  GraduationCap, 
  AlertTriangle, 
  FileCheck, 
  Bell, 
  X, 
  Building2,
  ChevronRight,
  Smartphone,
  UserCheck,
  ArrowLeft,
  ArrowLeftRight,
  Archive
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { useSchoolStore } from '@/store/useSchoolStore'

export default function HomePage() {
  const { escolas, selectedEscola, setSelectedEscola, loadEscolas } = useSchoolStore()

  useEffect(() => {
    loadEscolas()
  }, [loadEscolas])
  const [modoVisualizacao, setModoVisualizacao] = useState(false)

  const modulosEscolares = [
    { label: 'Mural', icon: Pin, href: '/mural' },
    { label: 'Turmas', icon: BookOpen, href: '/turmas' },
    { label: 'Funcionários', icon: Users, href: '/funcionarios' },
    { label: 'Matrículas', icon: FileText, href: '/matriculas' },
    { label: 'Alunos', icon: GraduationCap, href: '/alunos' },
    { label: 'Ocorrências', icon: AlertTriangle, href: '/ocorrencias' },
    { label: 'Transferências', icon: ArrowLeftRight, href: '/transferencias' },
    { label: 'Arquivo', icon: Archive, href: '/arquivos' },
    { label: 'Documentos', icon: FileText, href: '/documentos' },
    // { label: 'Ponto Mobile', icon: Smartphone, href: '/ponto-mobile' },
    { label: 'Painel Liderança', icon: UserCheck, href: '/painel-chefe' },
  ]

  return (
    <div className="space-y-8 -mt-2">
      {/* Indicador de Escola Selecionada caso exista */}
      {selectedEscola && (
        <div className="bg-surface-2 border border-borderCustom rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Escola Selecionada:</span>
            <div className="flex items-center gap-2 bg-highlight/10 text-highlight border border-highlight/30 px-3 py-1.5 rounded-xl text-sm font-medium">
              <div className={`w-5 h-5 rounded-full overflow-hidden ${selectedEscola.logo_url ? 'bg-transparent' : selectedEscola.color || 'bg-blue-600'} flex items-center justify-center text-white text-xs font-bold`}>
                {selectedEscola.logo_url ? (
                  <img src={selectedEscola.logo_url} alt={selectedEscola.nome} className="w-full h-full object-cover" />
                ) : (
                  selectedEscola.nome[0]
                )}
              </div>
              <span>{selectedEscola.nome}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedEscola(null)}
            className="text-muted-foreground hover:text-foreground gap-1"
          >
            <X className="w-4 h-4" /> Limpar Seleção (Visão Geral)
          </Button>
        </div>
      )}

      {/* Visão 1: Seleção de Escolas */}
      {!selectedEscola ? (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <Building2 className="w-8 h-8 text-[#185FA5] dark:text-[#3ea6ff]" />
            Escolas
          </h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {escolas.map((escola) => (
              <Card
                key={escola.id}
                onClick={() => setSelectedEscola(escola)}
                className="bg-surface-1 hover:bg-surface-2 border-[0.5px] border-borderCustom hover:border-highlight/50 transition-all duration-200 cursor-pointer p-5 flex flex-col items-center justify-center text-center space-y-4 min-h-[170px] group shadow-md rounded-2xl"
              >
                <div className={`w-16 h-16 rounded-full overflow-hidden ${escola.logo_url ? 'bg-transparent border border-borderCustom' : escola.color || 'bg-[#185FA5]'} flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform`}>
                  {escola.logo_url ? (
                    <img src={escola.logo_url} alt={escola.nome} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-8 h-8" />
                  )}
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-highlight transition-colors text-sm leading-snug">
                  {escola.nome}
                </h3>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        /* Visão 2: Módulos da Escola Selecionada */
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-surface-1 border-[0.5px] border-borderCustom shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                {selectedEscola.logo_url ? (
                  <img
                    src={selectedEscola.logo_url}
                    alt={selectedEscola.nome}
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <GraduationCap className="w-8 h-8 text-[#185FA5] dark:text-[#3ea6ff]" />
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                {selectedEscola.nome}
              </h1>
            </div>
            <Button
              variant="outline"
              onClick={() => setSelectedEscola(null)}
              className="bg-surface-1 border-[0.5px] border-borderCustom hover:bg-hoverCustom text-foregroundCustom hover:text-foreground rounded-xl flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {modulosEscolares.map((modulo) => {
              const Icon = modulo.icon
              const isOcorrencias = modulo.label.toLowerCase() === 'ocorrências'
              return (
                <Link key={modulo.label} href={modulo.href}>
                  <Card className="bg-surface-1 hover:bg-surface-2 border-[0.5px] border-borderCustom hover:border-highlight/50 transition-all duration-200 cursor-pointer p-5 flex flex-col items-center justify-center text-center space-y-4 min-h-[170px] group shadow-md rounded-2xl">
                    <div className={cn(
                      "w-20 h-20 rounded-2xl transition-colors flex items-center justify-center shrink-0",
                      isOcorrencias
                        ? "bg-[#ffedd5] text-[#b45309] dark:bg-[#2c1a0e] dark:text-[#f59e0b] group-hover:bg-[#fed7aa] dark:group-hover:bg-[#3d2916]"
                        : "bg-[#e0f2fe] text-[#185FA5] dark:bg-[#1b253b] dark:text-[#3ea6ff] group-hover:bg-[#bae6fd] dark:group-hover:bg-[#253552]"
                    )}>
                      <Icon className="w-9 h-9" />
                    </div>
                    <h3 className="font-semibold text-foreground group-hover:text-highlight transition-colors text-base">
                      {modulo.label}
                    </h3>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
