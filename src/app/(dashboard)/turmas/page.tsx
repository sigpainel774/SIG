'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Search } from 'lucide-react'

// Dados mocados temporários para visualização
const mockTurmas = [
  { id: '1', nome: '1º Ano A', ano_letivo: 2023, alunos: 35 },
  { id: '2', nome: '1º Ano B', ano_letivo: 2023, alunos: 32 },
]

export default function TurmasPage() {
  const [searchTerm, setSearchTerm] = useState('')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Turmas</h1>
          <p className="text-muted-foreground mt-1">Gerencie as turmas e anos letivos.</p>
        </div>
        <Button className="bg-highlight text-background hover:bg-highlight/90 font-semibold gap-2">
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
            {mockTurmas.map((turma) => (
              <TableRow key={turma.id} className="border-borderCustom hover:bg-hoverCustom transition-colors">
                <TableCell className="font-medium text-white">{turma.nome}</TableCell>
                <TableCell className="text-muted-foreground">{turma.ano_letivo}</TableCell>
                <TableCell className="text-muted-foreground">{turma.alunos}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-highlight hover:text-highlight/80 hover:bg-highlight/10">
                    Editar
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
