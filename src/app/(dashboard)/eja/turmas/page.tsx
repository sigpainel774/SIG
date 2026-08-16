'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, BookOpen, Users, ArrowLeft, Inbox, Printer, Edit2 } from 'lucide-react'
import Link from 'next/link'
import { ModalTurma } from '@/components/ModalTurma'
import { ModalDetalhesTurma } from '@/components/ModalDetalhesTurma'
import { ModalImprimirRelacaoTurma } from '@/components/modals/modal-imprimir-relacao-turma'
import { EmptyState } from '@/components/ui/empty-state'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { useEjaGuard } from '@/hooks/useEjaGuard'
import { IconTile } from '@/components/ui/icon-tile'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function EjaTurmasPage() {
  const { authorized } = useEjaGuard()
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
  const { selectedEscola } = useSchoolStore()
  const { isEditMode: globalEditMode } = useEditModeStore()

  const isProfessor = checkProfessor()
  const isCoordenador = checkCoordenador()
  const isEditMode = globalEditMode && !isProfessor && !isCoordenador

  const fetchTurmas = async () => {
    if (!escolaAtivaId && !selectedEscola?.id) {
      setTurmas([])
      setLoading(false)
      return
    }

    const targetEscolaId = escolaAtivaId || selectedEscola?.id

    setLoading(true)
    const isAdmin = isAdminGlobalOrRoot()
    const isDiretor = acessos.some(a => a.nivel === 2 && a.ativo)
    const isSecretario = acessos.some(a => a.nivel === 3 && a.ativo) && !isCoordenador
    const temPermissaoEja = acessos.some(a => (a as any).pode_eja === true && a.ativo)
    const isFuncEja = (funcionario?.modalidade_ensino ?? '').toUpperCase() === 'EJA'

    let query = supabase
      .from('turmas')
      .select('*, alunos(id), vinculos_turmas(id, tipo, funcionario_id)')
      .eq('escola_id', targetEscolaId)
      .is('deleted_at', null)
      .order('nome', { ascending: true })

    if (!isAdmin && !isDiretor && !isSecretario && !temPermissaoEja && !isFuncEja) {
      const { data: vTurmas } = await supabase
        .from('vinculos_turmas')
        .select('turma_id')
        .eq('funcionario_id', funcionario?.id || '')
        .eq('escola_id', targetEscolaId)

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
      const isTurmaEja = (t: any) => String(t.nome ?? '').toUpperCase().includes('EJA')

      const formatadas = data.map((t: any) => ({
        ...t,
        alunos_count: t.alunos?.length || 0,
        professores_count: t.vinculos_turmas?.filter((v: any) => v.tipo === 'professor').length || 0
      }))

      // Filtra exclusivamente turmas da modalidade EJA
      const filtradas = formatadas.filter(isTurmaEja)

      setTurmas(filtradas)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (authorized) {
      fetchTurmas()
    }
  }, [escolaAtivaId, selectedEscola?.id, authorized])

  const anosDisponiveis = useMemo(() => {
    const anoAtualNum = new Date().getFullYear()
    const anos = turmas.map(t => Number(t.ano_letivo)).filter(Boolean)
    const setAnos = new Set([anoAtualNum, ...anos])
    return Array.from(setAnos).sort((a, b) => b - a)
  }, [turmas])

  const filteredTurmas = useMemo(() => {
    return turmas.filter((t) => {
      const matchSearch =
        (t.nome && t.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (t.turno && t.turno.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchTurno = filterTurno === 'all' || t.turno === filterTurno
      const matchAno = filterAno === 'all' || String(t.ano_letivo) === filterAno

      return matchSearch && matchTurno && matchAno
    })
  }, [turmas, searchTerm, filterTurno, filterAno])

  if (authorized === false) return null

  return (
    <div className="space-y-6">
      {/* Modal de Criar / Editar Turma */}
      <ModalTurma
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedTurma(null)
        }}
        turma={selectedTurma}
        onSuccess={fetchTurmas}
      />

      {/* Modal de Detalhes da Turma */}
      <ModalDetalhesTurma
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false)
          setSelectedTurma(null)
        }}
        turma={selectedTurma}
        onUpdate={fetchTurmas}
      />

      {/* Modal de Impressão de Relação Nominal da Turma */}
      {isPrintModalOpen && selectedTurma && (
        <ModalImprimirRelacaoTurma
          turmaId={selectedTurma.id}
          turmaNome={selectedTurma.nome}
          anoLetivo={selectedTurma.ano_letivo}
          turno={selectedTurma.turno}
          open={isPrintModalOpen}
          onOpenChange={(open) => {
            setIsPrintModalOpen(open)
            if (!open) setSelectedTurma(null)
          }}
        />
      )}

      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/home">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <IconTile icon={BookOpen} size="md" variant="purple" />
            <h1 className="text-2xl font-bold text-foreground">Turmas - EJA</h1>
          </div>
          <p className="text-muted-foreground text-sm font-normal mt-2 ml-1">
            Gerenciamento de turmas, turnos e lotação de estudantes da Educação de Jovens e Adultos.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          {isEditMode && (
            <Button
              type="button"
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-2 rounded-xl h-10 px-4"
              onClick={() => {
                setSelectedTurma(null)
                setIsModalOpen(true)
              }}
            >
              <Plus className="w-4 h-4" />
              Nova Turma EJA
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
            placeholder="Buscar turma EJA por nome..."
            className="pl-9 bg-background border-border text-foreground placeholder-muted-foreground focus-visible:ring-purple-500 h-10 rounded-lg w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Dropdown de Turnos */}
        <div className="w-[160px]">
          <Select value={filterTurno} onValueChange={(val) => setFilterTurno(val ?? 'all')}>
            <SelectTrigger className="bg-background border-border text-foreground focus:ring-purple-500 h-10 rounded-lg">
              <SelectValue placeholder="Turno">
                {filterTurno === 'all' ? 'Turno' : filterTurno}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-foreground">
              <SelectItem value="all">Turno</SelectItem>
              <SelectItem value="Noturno">Noturno</SelectItem>
              <SelectItem value="Vespertino">Vespertino</SelectItem>
              <SelectItem value="Matutino">Matutino</SelectItem>
              <SelectItem value="Integral">Integral</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dropdown de Anos Letivos */}
        <div className="w-[160px]">
          <Select value={filterAno} onValueChange={(val) => setFilterAno(val ?? 'all')}>
            <SelectTrigger className="bg-background border-border text-foreground focus:ring-purple-500 h-10 rounded-lg">
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
          title="Sem turmas EJA"
          description="Nenhuma turma da modalidade EJA encontrada para esta unidade escolar."
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
              className="bg-card border border-border hover:border-purple-500/50 rounded-xl p-5 flex flex-col space-y-4 relative cursor-pointer transition-all duration-200"
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
                  <span className="hidden sm:inline">Relação</span>
                </Button>
                {isEditMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Editar Turma"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedTurma(turma)
                      setIsModalOpen(true)
                    }}
                    className="text-muted-foreground hover:text-foreground hover:bg-secondary h-8 w-8 p-0 rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              {/* Informações da Turma */}
              <div>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  Ano Letivo {turma.ano_letivo}
                </span>
                <h3 className="text-xl font-bold text-foreground mt-1">
                  {turma.nome}
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Turno: {turma.turno || 'Não informado'}
                </p>
              </div>

              {/* Estatísticas (Alunos e Professores) */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border mt-auto">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Alunos</p>
                    <p className="text-sm font-semibold text-foreground">
                      {turma.alunos_count} / {turma.capacidade || '35'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Docentes</p>
                    <p className="text-sm font-semibold text-foreground">
                      {turma.professores_count}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
