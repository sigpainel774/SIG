'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, GraduationCap, Users } from 'lucide-react'
import Link from 'next/link'
import { ModalTurma } from '@/components/ModalTurma'
import { useAuthStore } from '@/store/useAuthStore'
import { useEditModeStore } from '@/store/useEditModeStore'
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Turmas</h1>
        <div className="flex items-center gap-3">
          {isEditMode && (
            <Button
              type="button"
              className="bg-[#3ea6ff] hover:bg-[#0090ff] text-background font-bold gap-2 rounded-lg"
              onClick={() => {
                setSelectedTurma(null)
                setIsModalOpen(true)
              }}
            >
              <Plus className="w-4 h-4" />
              Nova Turma
            </Button>
          )}
          <Link href="/home">
            <Button
              variant="outline"
              className="bg-[#1c1c1e] text-white border-zinc-800 hover:bg-zinc-850 hover:text-white rounded-lg px-5 h-10 font-medium"
            >
              Voltar
            </Button>
          </Link>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex gap-4 w-full items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            type="search"
            placeholder="Buscar turma por nome..."
            className="pl-9 bg-transparent border-[#26262a] text-white placeholder-zinc-500 focus-visible:ring-[#3ea6ff] h-10 rounded-lg w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Dropdown de Turnos */}
        <div className="w-[200px]">
          <Select value={filterTurno} onValueChange={(val) => setFilterTurno(val ?? 'all')}>
            <SelectTrigger className="bg-transparent border-[#26262a] text-white focus:ring-[#3ea6ff] h-10 rounded-lg">
              <SelectValue placeholder="Todos os Turnos" />
            </SelectTrigger>
            <SelectContent className="bg-[#121212] border-[#26262a] text-white">
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
            <SelectTrigger className="bg-transparent border-[#26262a] text-white focus:ring-[#3ea6ff] h-10 rounded-lg">
              <SelectValue placeholder="" />
            </SelectTrigger>
            <SelectContent className="bg-[#121212] border-[#26262a] text-white">
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
            <div key={n} className="bg-[#141416] border border-[#26262a] rounded-xl p-5 space-y-4 animate-pulse h-48" />
          ))}
        </div>
      ) : filteredTurmas.length === 0 ? (
        <div className="text-center py-12 text-zinc-500 border border-dashed border-[#26262a] rounded-xl bg-[#141416]/50">
          Nenhuma turma encontrada.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {filteredTurmas.map((turma) => (
            <div
              key={turma.id}
              onClick={() => {
                setSelectedTurma(turma)
                setIsModalOpen(true)
              }}
              className="bg-[#141416] border border-[#26262a] hover:border-[#3ea6ff]/40 rounded-xl p-5 flex flex-col space-y-4 relative cursor-pointer transition-all duration-200"
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
                  className="absolute top-4 right-4 text-[#3ea6ff] hover:text-[#0090ff] hover:bg-[#3ea6ff]/10 h-8 font-semibold"
                >
                  Editar
                </Button>
              )}

              {/* Cabeçalho do Card */}
              <div className="space-y-2 pr-14">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {turma.nome} <span className="text-zinc-500 font-normal text-sm">({turma.ano_letivo})</span>
                </h3>

                {/* Badge de Turno */}
                {turma.turno && (
                  <div
                    className={`px-3 py-0.5 rounded-full text-[11px] font-medium w-fit ${
                      turma.turno === 'Matutino'
                        ? 'bg-[#0c4a6e]/50 text-[#3ea6ff]'
                        : turma.turno === 'Integral'
                        ? 'bg-[#1c3a5e]/50 text-[#5ea6ff]' // Uma cor custom para integral (tentativa visual baseada no padrão SIG)
                        : 'bg-amber-950/50 text-amber-400'
                    }`}
                  >
                    {turma.turno}
                  </div>
                )}
              </div>

              {/* Conteúdo de Alocação e Lotação */}
              <div className="bg-[#1c1c1e]/50 rounded-lg p-3 space-y-2.5 mt-2">
                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                  <GraduationCap className="w-4 h-4" />
                  <span>
                    Lotação: {turma.alunos_count}/{turma.capacidade || 30} Alunos
                  </span>
                </div>
                <div className="flex items-start gap-2 text-zinc-400 text-sm">
                  <Users className="w-4 h-4 mt-0.5" />
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
    </div>
  )
}
