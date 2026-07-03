'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search, GraduationCap, ArrowLeftRight, FileText, UserCheck, Trash2 } from 'lucide-react'
import { ModalAluno } from '@/components/modals/modal-aluno'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'

interface Aluno {
  id: string
  nome: string
  cpf?: string | null
  inep?: string | null
  escola_id?: string | null
  foto_url?: string | null
  created_at: string
}

export default function AlunosPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [alunos, setAlunos] = useState<Aluno[]>([
    { id: '1', nome: 'João Silva', cpf: '000.111.222-33', inep: '12345678', foto_url: '', created_at: '2026-07-03' },
    { id: '2', nome: 'Maria Santos', cpf: '444.555.666-77', inep: '87654321', foto_url: '', created_at: '2026-07-03' },
    { id: '3', nome: 'Pedro Lucas Oliveira', cpf: '123.456.789-00', inep: '55667788', foto_url: '', created_at: '2026-07-03' },
  ])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const carregarAlunos = async () => {
    const supabase = createClient()
    setLoading(true)
    const { data, error } = await supabase.from('alunos').select('*').order('nome', { ascending: true })
    if (data && data.length > 0) {
      setAlunos(data as any)
    }
    setLoading(false)
  }

  useEffect(() => {
    carregarAlunos()
  }, [])

  const alunosFiltrados = alunos.filter(
    (aluno) =>
      aluno.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (aluno.cpf && aluno.cpf.includes(searchTerm)) ||
      (aluno.inep && aluno.inep.includes(searchTerm))
  )

  const handleTransferir = (aluno: Aluno) => {
    toast.info(`Iniciando transferência para o aluno ${aluno.nome}...`)
  }

  const handleDeletar = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir o cadastro deste aluno?')) {
      const supabase = createClient()
      const { error } = await supabase.from('alunos').delete().eq('id', id)
      if (error) {
        toast.error(`Erro ao excluir: ${error.message}`)
      } else {
        toast.success('Aluno removido com sucesso!')
        carregarAlunos()
      }
    }
  }

  return (
    <div className="space-y-6">
      <ModalAluno 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        onSuccess={carregarAlunos} 
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-borderCustom">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-highlight" />
            Gestão de Alunos
          </h1>
          <p className="text-muted-foreground mt-1">
            Cadastro completo, busca por INEP/CPF e controle de transferências escolares.
          </p>
        </div>
        <Button 
          onClick={() => setModalOpen(true)}
          className="bg-highlight text-background hover:bg-highlight/90 font-bold gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Aluno
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por Nome, CPF ou Código INEP (Censo)..."
            className="pl-9 bg-[#121212] border-borderCustom text-white focus-visible:ring-highlight"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-borderCustom bg-[#121212] overflow-hidden shadow-md">
        <Table>
          <TableHeader className="bg-[#0d0d0d]">
            <TableRow className="border-borderCustom hover:bg-transparent">
              <TableHead className="text-foregroundCustom font-semibold">Foto</TableHead>
              <TableHead className="text-foregroundCustom font-semibold">Nome Completo</TableHead>
              <TableHead className="text-foregroundCustom font-semibold">CPF</TableHead>
              <TableHead className="text-foregroundCustom font-semibold">Código INEP</TableHead>
              <TableHead className="text-right text-foregroundCustom font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alunosFiltrados.map((aluno) => (
              <TableRow key={aluno.id} className="border-borderCustom hover:bg-hoverCustom transition-colors">
                <TableCell>
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-highlight/40 overflow-hidden flex items-center justify-center text-xs font-bold text-white">
                    {aluno.foto_url ? (
                      <img src={aluno.foto_url} alt={aluno.nome} className="w-full h-full object-cover" />
                    ) : (
                      aluno.nome[0]
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-semibold text-white">{aluno.nome}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">{aluno.cpf || 'Não informado'}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">{aluno.inep || 'Sem INEP'}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button onClick={() => handleTransferir(aluno)} variant="ghost" size="sm" className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 gap-1 text-xs">
                    <ArrowLeftRight className="w-3.5 h-3.5" /> Transferir
                  </Button>
                  <Button onClick={() => handleDeletar(aluno.id)} variant="ghost" size="sm" className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 gap-1 text-xs">
                    <Trash2 className="w-3.5 h-3.5" /> Excluir
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
