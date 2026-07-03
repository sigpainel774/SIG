'use client'

import { useState } from 'react'
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
  ChevronRight
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Escola {
  id: string
  nome: string
  logo?: string
  color: string
}

const mockEscolas: Escola[] = [
  { id: '1', nome: 'Colégio Dr Eraldo Tinoco', color: 'bg-blue-600' },
  { id: '2', nome: 'Colégio Moisés Alves', color: 'bg-indigo-600' },
  { id: '3', nome: 'Escola Castelo Branco', color: 'bg-amber-600' },
  { id: '4', nome: 'Escola Frei Urbano', color: 'bg-emerald-600' },
  { id: '5', nome: 'Escola Jovino Souza Lima', color: 'bg-cyan-600' },
  { id: '6', nome: 'Escolhinha PIU-PIU', color: 'bg-rose-600' },
]

export default function HomePage() {
  const [selectedEscola, setSelectedEscola] = useState<Escola | null>(null)
  const [modoVisualizacao, setModoVisualizacao] = useState(false)

  const modulosEscolares = [
    { label: 'Mural', icon: Pin, href: '/mural' },
    { label: 'Turmas', icon: BookOpen, href: '/turmas' },
    { label: 'Funcionários', icon: Users, href: '/funcionarios' },
    { label: 'Matrículas', icon: FileText, href: '/matriculas' },
    { label: 'Alunos', icon: GraduationCap, href: '/alunos' },
    { label: 'Ocorrências', icon: AlertTriangle, href: '/ocorrencias' },
    { label: 'Atestados', icon: FileCheck, href: '/atestados' },
  ]

  return (
    <div className="space-y-8 -mt-2">
      {/* Top Header Bar */}
      <div className="bg-[#141414] border border-borderCustom rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-white text-lg">Sapeaçu Painel Escolar</span>
          
          {selectedEscola && (
            <div className="flex items-center gap-2 bg-[#1f2937]/80 text-highlight border border-highlight/30 px-3 py-1.5 rounded-xl text-sm font-medium animate-in fade-in zoom-in-95">
              <div className={`w-5 h-5 rounded-full ${selectedEscola.color} flex items-center justify-center text-white text-xs font-bold`}>
                {selectedEscola.nome[0]}
              </div>
              <span>{selectedEscola.nome}</span>
              <button 
                onClick={() => setSelectedEscola(null)}
                className="hover:bg-highlight/20 rounded-full p-0.5 transition-colors ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          {/* Notifications */}
          <div className="relative">
            <Bell className="w-5 h-5 text-foregroundCustom/80 cursor-pointer hover:text-white transition-colors" />
            <span className="absolute -top-1.5 -right-1.5 bg-destructive text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              2
            </span>
          </div>

          {/* Toggle Modo Visualização */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-foregroundCustom/80">Modo Visualização</span>
            <button
              onClick={() => setModoVisualizacao(!modoVisualizacao)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
                modoVisualizacao ? 'bg-highlight justify-end' : 'bg-input justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Visão 1: Seleção de Escolas */}
      {!selectedEscola ? (
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-white tracking-tight">Escolas</h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {mockEscolas.map((escola) => (
              <Card
                key={escola.id}
                onClick={() => setSelectedEscola(escola)}
                className="bg-[#161616] hover:bg-[#202020] border-borderCustom hover:border-highlight/50 transition-all duration-200 cursor-pointer p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[180px] group shadow-md"
              >
                <div className={`w-16 h-16 rounded-full ${escola.color} flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform`}>
                  <Building2 className="w-8 h-8" />
                </div>
                <h3 className="font-semibold text-white group-hover:text-highlight transition-colors text-sm leading-snug">
                  {escola.nome}
                </h3>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        /* Visão 2: Módulos da Escola Selecionada */
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-white tracking-tight">{selectedEscola.nome}</h1>
            <Button
              variant="outline"
              onClick={() => setSelectedEscola(null)}
              className="bg-[#1f1f1f] border-borderCustom hover:bg-hoverCustom text-foregroundCustom hover:text-white"
            >
              Voltar
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            {modulosEscolares.map((modulo) => {
              const Icon = modulo.icon
              return (
                <Link key={modulo.label} href={modulo.href}>
                  <Card className="bg-[#161616] hover:bg-[#202020] border-borderCustom hover:border-highlight/50 transition-all duration-200 cursor-pointer p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[180px] group shadow-md">
                    <div className="p-3 rounded-2xl bg-[#222222] group-hover:bg-highlight/10 text-foregroundCustom/80 group-hover:text-highlight transition-colors">
                      <Icon className="w-10 h-10" />
                    </div>
                    <h3 className="font-semibold text-white group-hover:text-highlight transition-colors text-base">
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
