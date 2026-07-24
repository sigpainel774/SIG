'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, GraduationCap, Users, ArrowLeft, Inbox, Printer } from 'lucide-react'
import Link from 'next/link'
import { ModalTurma } from '@/components/ModalTurma'
import { ModalDetalhesTurma } from '@/components/ModalDetalhesTurma'
import { ModalImprimirRelacaoTurma } from '@/components/modals/modal-imprimir-relacao-turma'
import { EmptyState } from '@/components/ui/empty-state'
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
  const currentYear = new Date().getFullYear().toString()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTurno, setFilterTurno] = useState('all')
  const [filterAno, setFilterAno] = useState(currentYear)
  const [turmas, setTurmas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [selectedTurma, setSelectedTurma] = useState<any>(null)

  const supabase = createClient() as any
  const { escolaAtivaId, acessos, funcionario, isAdminGlobalOrRoot, isProfessor: checkProfessor, isCoordenador: checkCoordenador } = useAuthStore()
  const { isEditMode: globalEditMode } = useEditModeStore()

  const isProfessor = checkProfessor()
  const isCoordenador = checkCoordenador()
  const isEditMode = globalEditMode && !isProfessor && !isCoordenador

  const fetchTurmas = async () => {
    if (!escolaAtivaId) {
      setTurmas([])
      setLoading(false)
      return
    }

    setLoading(true)
    const isAdmin = isAdminGlobalOrRoot()
    const isDiretor = acessos.some(a => a.nivel === 2 && a.ativo)
    const isSecretario = acessos.some(a => a.nivel === 3 && a.ativo) && !isCoordenador

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
    const anoAtualNum = new Date().getFullYear()
    const anos = turmas.map(t => Number(t.ano_letivo)).filter(Boolean)
    const setAnos = new Set([anoAtualNum, ...anos])
    return Array.from(setAnos).sort((a, b) => b - a)
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

  if (!escolaAtivaId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-[#141416] border border-[#26262a] rounded-2xl max-w-lg mx-auto my-12 space-y-4 shadow-sm animate-in fade-in duration-300">
        <div className="p-4 bg-amber-500/10 rounded-full text-amber-500">
          <GraduationCap className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Nenhuma Escola Selecionada</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          Para visualizar e gerenciar as turmas, você precisa selecionar uma escola ativa no seletor de escolas no topo.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/home" prefetch={true}>
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
        <div className="w-[160px]">
          <Select value={filterTurno} onValueChange={(val) => setFilterTurno(val ?? 'all')}>
            <SelectTrigger className="bg-background border-border text-foreground focus:ring-primary h-10 rounded-lg">
              <SelectValue placeholder="Turno">
                {filterTurno === 'all' ? 'Turno' : filterTurno}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-foreground">
              <SelectItem value="all">Turno</SelectItem>
              <SelectItem value="Matutino">Matutino</SelectItem>
              <SelectItem value="Vespertino">Vespertino</SelectItem>
              <SelectItem value="Integral">Integral</SelectItem>
              <SelectItem value="Noturno">Noturno</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dropdown de Anos Letivos */}
        <div className="w-[160px]">
          <Select value={filterAno} onValueChange={(val) => setFilterAno(val ?? 'all')}>
            <SelectTrigger className="bg-background border-border text-foreground focus:ring-primary h-10 rounded-lg">
              <SelectValue placeholder="Ano Letivo">
                {filterAno === 'all' ? 'Ano Letivo' : filterAno}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-foreground">
              <SelectItem value="all">Ano Letivo</SelectItem>
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
        <EmptyState
          title="Sem turmas"
          description="Nenhuma turma cadastrada ou encontrada com os filtros selecionados."
          icon={Inbox}
        />
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
              {/* Ações no Card (Imprimir e Editar) */}
              <div className="absolute top-3.5 right-3.5 flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  title="Imprimir Relação com Foto 3x4"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedTurma(turma)
                    setIsPrintModalOpen(true)
                  }}
                  className="text-muted-foreground hover:text-foreground hover:bg-secondary h-8 px-2.5 rounded-lg gap-1 text-xs font-semibold"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Imprimir</span>
                </Button>

                {isEditMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedTurma(turma)
                      setIsModalOpen(true)
                    }}
                    className="text-primary hover:text-primary hover:bg-primary/10 h-8 px-2.5 font-semibold text-xs rounded-lg"
                  >
                    Editar
                  </Button>
                )}
              </div>

              {/* Cabeçalho do Card */}
              <div className="space-y-2 pr-28">
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

      {/* Modal de Impressão da Relação de Alunos (Foto 3x4) */}
      <ModalImprimirRelacaoTurma
        open={isPrintModalOpen}
        onOpenChange={setIsPrintModalOpen}
        turma={selectedTurma}
      />
    </div>
  )
}
