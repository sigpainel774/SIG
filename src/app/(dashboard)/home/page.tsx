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
  UserCheck
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

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
    { label: 'Atestados', icon: FileCheck, href: '/atestados' },
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
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Escolas</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {escolas.map((escola) => (
              <Card
                key={escola.id}
                onClick={() => setSelectedEscola(escola)}
                className="bg-surface-1 hover:bg-surface-2 border-borderCustom hover:border-highlight/50 transition-all duration-200 cursor-pointer p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[180px] group shadow-md"
              >
                <div className={`w-16 h-16 rounded-full overflow-hidden ${escola.logo_url ? 'bg-transparent border border-borderCustom' : escola.color || 'bg-blue-600'} flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform`}>
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
            {selectedEscola.logo_url ? (
              <div className="flex items-center gap-4">
                <img
                  src={selectedEscola.logo_url}
                  alt={selectedEscola.nome}
                  className="max-h-16 max-w-[280px] object-contain rounded-xl shadow-md border border-borderCustom p-1 bg-surface-1"
                />
                <h1 className="sr-only">{selectedEscola.nome}</h1>
              </div>
            ) : (
              <h1 className="text-3xl font-bold text-foreground tracking-tight">{selectedEscola.nome}</h1>
            )}
            <Button
              variant="outline"
              onClick={() => setSelectedEscola(null)}
              className="bg-surface-1 border-borderCustom hover:bg-hoverCustom text-foregroundCustom hover:text-foreground"
            >
              Voltar
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {modulosEscolares.map((modulo) => {
              const Icon = modulo.icon
              return (
                <Link key={modulo.label} href={modulo.href}>
                  <Card className="bg-surface-1 hover:bg-surface-2 border-borderCustom hover:border-highlight/50 transition-all duration-200 cursor-pointer p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[180px] group shadow-md">
                    <div className="p-3 rounded-2xl bg-surface-3 group-hover:bg-highlight/10 text-foregroundCustom/80 group-hover:text-highlight transition-colors">
                      <Icon className="w-10 h-10" />
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
