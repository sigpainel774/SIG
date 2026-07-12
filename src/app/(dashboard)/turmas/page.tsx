'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, GraduationCap, Users, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ModalTurma } from '@/components/ModalTurma'
import { ModalDetalhesTurma } from '@/components/ModalDetalhesTurma'
import { useAuthStore } from '@/store/useAuthStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { IconTile } from '@/components/ui/icon-tile'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function TurmasPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTurno, setFilterTurno] = useState('all')
  const [filterAno, setFilterAno] = useState('all')
  const [turmas, setTurmas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [selectedTurma, setSelectedTurma] = useState<any>(null)

  const supabase = createClient() as any
  const { escolaAtivaId, acessos, funcionario, isAdminGlobalOrRoot } = useAuthStore()
  const { isEditMode } = useEditModeStore()

  const fetchTurmas = async () => {
    if (!escolaAtivaId) return

    setLoading(true)
    const isAdmin = isAdminGlobalOrRoot()
    const isDiretor = acessos.some(a => a.nivel === 2 && a.ativo)
    const isSecretario = acessos.some(a => a.nivel === 3 && a.ativo) && 
      !funcionario?.cargo?.toLowerCase().includes('coordenador')

    let query = supabase
      .from('turmas')
      .select('*, alunos(id), vinculos_turmas(id, tipo, funcionario_id)')
      .eq('escola_id', escolaAtivaId)
      .is('deleted_at', null)
      .order('nome', { ascending: true })

    if (!isAdmin && !isDiretor && !isSecretario) {
      // Coordenador, Professor ou outros níveis: filtra por vínculos diretos na tabela vinculos_turmas
      const { data: vTurmas } = await supabase
        .from('vinculos_turmas')
        .select('turma_id')
        .eq('funcionario_id', funcionario?.id || '')
        .eq('escola_id', escolaAtivaId)

      const ids = (vTurmas ?? []).map((vt: any) => vt.turma_id)
      if (ids.length > 0) {
        query = query.in('id', ids) as typeof query
      } else {
        setTurmas([])
        setLoading(false)
        return
      }
    }

    const { data } = await query

    if (data) {
      const formatadas = data.map((t: any) => ({
        ...t,
        alunos_count: t.alunos?.length || 0,
        professores_count: t.vinculos_turmas?.filter((v: any) => v.tipo === 'professor').length || 0
      }))
      setTurmas(formatadas)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTurmas()
  }, [escolaAtivaId])

  // Lista dinâmica de anos letivos das turmas carregadas
  const anosDisponiveis = useMemo(() => {
    const anos = turmas.map(t => t.ano_letivo)
    return Array.from(new Set(anos)).sort((a, b) => b - a)
  }, [turmas])

  // Filtragem local das turmas
  const filteredTurmas = useMemo(() => {
    return turmas.filter(t => {
      const matchesSearch = t.nome.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesTurno = filterTurno === 'all' || t.turno === filterTurno
      const matchesAno = filterAno === 'all' || String(t.ano_letivo) === filterAno
      return matchesSearch && matchesTurno && matchesAno
    })
  }, [turmas, searchTerm, filterTurno, filterAno])

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/home">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <IconTile icon={GraduationCap} variant="primary" className="h-10 w-10 shrink-0" />
            <h1 className="text-2xl font-bold text-foreground">Gestão de Turmas</h1>
          </div>
          <p className="text-muted-foreground text-sm font-normal mt-2 ml-1">
            Gerenciamento de turmas, turnos, lotação de alunos e atribuição do corpo docente.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {isEditMode && (
            <Button
              type="button"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2 rounded-xl h-10 px-4"
              onClick={() => {
                setSelectedTurma(null)
                setIsModalOpen(true)
              }}
            >
              <Plus className="w-4 h-4" />
              Nova Turma
            </Button>
          )}
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex gap-4 w-full items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar turma por nome..."
            className="pl-9 bg-background border-border text-foreground placeholder-muted-foreground focus-visible:ring-primary h-10 rounded-lg w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Dropdown de Turnos */}
        <div className="w-[200px]">
          <Select value={filterTurno} onValueChange={(val) => setFilterTurno(val ?? 'all')}>
            <SelectTrigger className="bg-background border-border text-foreground focus:ring-primary h-10 rounded-lg">
              <SelectValue placeholder="Todos os Turnos" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-foreground">
              <SelectItem value="all">Todos os Turnos</SelectItem>
              <SelectItem value="Matutino">Matutino</SelectItem>
              <SelectItem value="Vespertino">Vespertino</SelectItem>
              <SelectItem value="Integral">Integral</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dropdown de Anos Letivos */}
        <div className="w-[120px]">
          <Select value={filterAno} onValueChange={(val) => setFilterAno(val ?? 'all')}>
            <SelectTrigger className="bg-background border-border text-foreground focus:ring-primary h-10 rounded-lg">
              <SelectValue placeholder="" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-foreground">
              <SelectItem value="all">Todos os Anos</SelectItem>
              {anosDisponiveis.map((ano) => (
                <SelectItem key={ano} value={String(ano)}>
                  {ano}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid de Cards de Turmas */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-card border border-border rounded-xl p-5 space-y-4 animate-pulse h-48" />
          ))}
        </div>
      ) : filteredTurmas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl bg-card/50">
          Nenhuma turma encontrada.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {filteredTurmas.map((turma) => (
            <div
              key={turma.id}
              onClick={() => {
                setSelectedTurma(turma)
                setIsDetailsModalOpen(true)
              }}
              className="bg-card border border-border hover:border-primary/40 rounded-xl p-5 flex flex-col space-y-4 relative cursor-pointer transition-all duration-200"
            >
              {/* Opção de Editar no Card */}
              {isEditMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation() // impede de disparar o onClick do card de forma duplicada
                    setSelectedTurma(turma)
                    setIsModalOpen(true)
                  }}
                  className="absolute top-4 right-4 text-primary hover:text-primary hover:bg-primary/10 h-8 font-semibold"
                >
                  Editar
                </Button>
              )}

              {/* Cabeçalho do Card */}
              <div className="space-y-2 pr-14">
                <h3 className="text-base font-semibold text-foreground tracking-tight">
                  {turma.nome} <span className="text-muted-foreground font-normal text-sm">({turma.ano_letivo})</span>
                </h3>

                {/* Badge de Turno */}
                {turma.turno && (
                  <div
                    className={`px-3 py-0.5 rounded-full text-[11px] font-medium w-fit ${
                      turma.turno === 'Matutino'
                        ? 'bg-primary/10 text-primary'
                        : turma.turno === 'Integral'
                        ? 'bg-primary/20 text-primary'
                        : 'bg-warning/10 text-warning'
                    }`}
                  >
                    {turma.turno}
                  </div>
                )}
              </div>

              {/* Conteúdo de Alocação e Lotação */}
              <div className="bg-secondary/50 rounded-lg p-3 space-y-2.5 mt-2">
                <div className="flex items-center gap-2 text-sm font-normal text-muted-foreground">
                  <GraduationCap className="w-4 h-4 text-muted-foreground/60" />
                  <span>
                    Lotação: {turma.alunos_count}/{turma.capacidade || 30} Alunos
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm font-normal text-muted-foreground">
                  <Users className="w-4 h-4 mt-0.5 text-muted-foreground/60" />
                  <span>
                    Corpo Docente: {turma.professores_count === 0
                        ? 'Sem professor definido'
                        : `${turma.professores_count} Professor${turma.professores_count > 1 ? 'es' : ''}`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Nova/Editar Turma */}
      <ModalTurma
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        turma={selectedTurma}
        onSuccess={fetchTurmas}
      />

      {/* Modal de Detalhes e Diário da Turma */}
      <ModalDetalhesTurma
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
        turma={selectedTurma}
      />
    </div>
  )
}
