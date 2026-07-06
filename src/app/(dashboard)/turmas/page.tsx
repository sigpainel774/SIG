'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search } from 'lucide-react'
import { ModalTurma } from '@/components/ModalTurma'
import { useAuthStore } from '@/store/useAuthStore'

export default function TurmasPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [turmas, setTurmas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTurma, setSelectedTurma] = useState<any>(null)
  
  const supabase = createClient()
  const escolaAtivaId = useAuthStore((state) => state.escolaAtivaId)

  const fetchTurmas = async () => {
    if (!escolaAtivaId) return

    setLoading(true)
    const { data, error } = await supabase
      .from('turmas')
      .select('*, alunos(id)')
      .eq('escola_id', escolaAtivaId)
      .order('nome', { ascending: true })
    
    if (data) {
      const formatadas = data.map((t: any) => ({
        ...t,
        alunos_count: t.alunos?.length || 0
      }))
      setTurmas(formatadas)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTurmas()
  }, [escolaAtivaId])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Turmas</h1>
          <p className="text-muted-foreground mt-1">Gerencie as turmas e anos letivos.</p>
        </div>
        <Button 
          className="bg-highlight text-background hover:bg-highlight/90 font-semibold gap-2"
          onClick={() => {
            setSelectedTurma(null)
            setIsModalOpen(true)
          }}
        >
          <Plus className="w-4 h-4" />
          Nova Turma
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar turma..."
            className="pl-8 bg-input border-borderCustom text-foregroundCustom focus-visible:ring-highlight"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-md border border-borderCustom bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-background/50">
            <TableRow className="border-borderCustom hover:bg-transparent">
              <TableHead className="text-foregroundCustom font-semibold">Nome</TableHead>
              <TableHead className="text-foregroundCustom font-semibold">Ano Letivo</TableHead>
              <TableHead className="text-foregroundCustom font-semibold">Alunos</TableHead>
              <TableHead className="text-right text-foregroundCustom font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {turmas.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">
                  Nenhuma turma encontrada.
                </TableCell>
              </TableRow>
            )}
            {turmas.map((turma) => (
              <TableRow key={turma.id} className="border-borderCustom hover:bg-hoverCustom transition-colors">
                <TableCell className="font-medium text-white">{turma.nome}</TableCell>
                <TableCell className="text-muted-foreground">{turma.ano_letivo}</TableCell>
                <TableCell className="text-muted-foreground">{turma.alunos_count}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-highlight hover:text-highlight/80 hover:bg-highlight/10"
                    onClick={() => {
                      setSelectedTurma(turma)
                      setIsModalOpen(true)
                    }}
                  >
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ModalTurma 
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        turma={selectedTurma}
        onSuccess={fetchTurmas}
      />
    </div>
  )
}
