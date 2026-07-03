'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search, Users, Shield } from 'lucide-react'
import { ModalFuncionario } from '@/components/modals/modal-funcionario'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'

interface Funcionario {
  id: string
  nome: string
  email: string
  cargo?: string | null
  is_superadmin?: boolean | null
  created_at: string
}

export default function FuncionariosPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([
    { id: '1', nome: 'Ciro Gomes', email: 'ciro@escola.br', cargo: 'Professor', is_superadmin: false, created_at: '2026-07-03' },
    { id: '2', nome: 'Ana Souza', email: 'ana@escola.br', cargo: 'Coordenador', is_superadmin: false, created_at: '2026-07-03' },
    { id: '3', nome: 'Administrador Geral', email: 'adm@super.com', cargo: 'Admin Master', is_superadmin: true, created_at: '2026-07-03' },
  ])

  const carregarFuncionarios = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('funcionarios').select('*').order('nome', { ascending: true })
    if (data && data.length > 0) {
      setFuncionarios(data as any)
    }
  }

  useEffect(() => {
    carregarFuncionarios()
  }, [])

  const funcionariosFiltrados = funcionarios.filter(
    (f) =>
      f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.cargo && f.cargo.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <ModalFuncionario 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        onSuccess={carregarFuncionarios} 
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-borderCustom">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8 text-highlight" />
            Gestão de Funcionários & Lotações
          </h1>
          <p className="text-muted-foreground mt-1">
            Cadastro de servidores, atribuição de cargos e vinculação de permissões.
          </p>
        </div>
        
        <Button 
          onClick={() => setModalOpen(true)}
          className="bg-highlight text-background hover:bg-highlight/90 font-bold gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Funcionário
        </Button>
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nome, e-mail ou cargo..."
            className="pl-8 bg-[#121212] border-borderCustom text-white focus-visible:ring-highlight"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-borderCustom bg-[#121212] overflow-hidden shadow-md">
        <Table>
          <TableHeader className="bg-[#0d0d0d]">
            <TableRow className="border-borderCustom hover:bg-transparent">
              <TableHead className="text-foregroundCustom font-semibold">Nome Completo</TableHead>
              <TableHead className="text-foregroundCustom font-semibold">E-mail de Login</TableHead>
              <TableHead className="text-foregroundCustom font-semibold">Cargo / Função</TableHead>
              <TableHead className="text-foregroundCustom font-semibold">Perfil Master</TableHead>
              <TableHead className="text-right text-foregroundCustom font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {funcionariosFiltrados.map((func) => (
              <TableRow key={func.id} className="border-borderCustom hover:bg-hoverCustom transition-colors">
                <TableCell className="font-semibold text-white">{func.nome}</TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">{func.email}</TableCell>
                <TableCell className="text-muted-foreground">{func.cargo || 'Não informado'}</TableCell>
                <TableCell>
                  {func.is_superadmin ? (
                    <span className="px-2.5 py-0.5 bg-purple-600/20 text-purple-300 border border-purple-500/40 rounded-full text-xs font-bold flex items-center gap-1 w-fit">
                      <Shield className="w-3 h-3 text-purple-400" /> Super Admin
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Padrão</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-highlight hover:text-highlight/80 hover:bg-highlight/10 text-xs">
                    Gerenciar Permissões
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
