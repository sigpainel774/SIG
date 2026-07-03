'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ShieldAlert, Users } from 'lucide-react'

// Dados mockados
const cargosGerenciados = ['Professor', 'Monitor']
const mockEquipe = [
  { id: '1', nome: 'Roberto Alves', cargo: 'Professor', status: 'Em turno' },
  { id: '2', nome: 'Mariana Lima', cargo: 'Monitor', status: 'Falta' },
]

export default function PainelChefePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Painel da Liderança</h1>
        <p className="text-muted-foreground mt-1">Gestão de equipe e aprovações (ABAC - Nível 5).</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-borderCustom bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foregroundCustom">Cargos sob sua gestão</CardTitle>
            <ShieldAlert className="h-4 w-4 text-highlight" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mt-2 flex-wrap">
              {cargosGerenciados.map((cargo) => (
                <span key={cargo} className="px-3 py-1 bg-input border border-borderCustom text-xs rounded-full text-foregroundCustom">
                  {cargo}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Você só tem permissão para visualizar e gerenciar funcionários com estes cargos.
            </p>
          </CardContent>
        </Card>

        <Card className="border-borderCustom bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-foregroundCustom">Total da Equipe</CardTitle>
            <Users className="h-4 w-4 text-highlight" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{mockEquipe.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Membros gerenciados atualmente.</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border border-borderCustom bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-background/50">
            <TableRow className="border-borderCustom hover:bg-transparent">
              <TableHead className="text-foregroundCustom font-semibold">Nome do Membro</TableHead>
              <TableHead className="text-foregroundCustom font-semibold">Cargo</TableHead>
              <TableHead className="text-foregroundCustom font-semibold">Status Hoje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockEquipe.map((membro) => (
              <TableRow key={membro.id} className="border-borderCustom hover:bg-hoverCustom transition-colors">
                <TableCell className="font-medium text-white">{membro.nome}</TableCell>
                <TableCell className="text-muted-foreground">{membro.cargo}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 text-xs rounded-full ${membro.status === 'Em turno' ? 'bg-green-500/10 text-green-500' : 'bg-destructive/10 text-destructive'}`}>
                    {membro.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
