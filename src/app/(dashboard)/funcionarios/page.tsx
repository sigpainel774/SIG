'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Plus, Search, Shield } from 'lucide-react'
import { toast } from 'sonner'

// Dados mocados temporários
const mockFuncionarios = [
  { id: '1', nome: 'Ciro Gomes', email: 'ciro@escola.br', lotacao: 'Escola Modelo', nivel: 4 },
  { id: '2', nome: 'Ana Souza', email: 'ana@escola.br', lotacao: 'Escola Central', nivel: 3 },
]

export default function FuncionariosPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedLotacao, setSelectedLotacao] = useState('escola_modelo')
  const [selectedPermissaoEscola, setSelectedPermissaoEscola] = useState('escola_modelo')

  const handleSavePermissao = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedLotacao !== selectedPermissaoEscola) {
      toast.error('Erro: A escola de permissão deve ser a mesma da lotação (Prevenção Bug do Ciro).')
      return
    }
    toast.success('Permissões salvas com sucesso!')
    setIsDialogOpen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Funcionários</h1>
          <p className="text-muted-foreground mt-1">Gerencie lotações e permissões de acesso.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-highlight text-background hover:bg-highlight/90 font-semibold gap-2">
              <Plus className="w-4 h-4" />
              Novo Funcionário
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-card border-borderCustom">
            <form onSubmit={handleSavePermissao}>
              <DialogHeader>
                <DialogTitle className="text-white">Adicionar Funcionário</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Preencha os dados e atribua as permissões de acesso.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="nome" className="text-foregroundCustom">Nome</Label>
                  <Input id="nome" required className="bg-input border-borderCustom text-foregroundCustom" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foregroundCustom">Email</Label>
                  <Input id="email" type="email" required className="bg-input border-borderCustom text-foregroundCustom" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foregroundCustom">Lotação (Vínculo)</Label>
                  <Select value={selectedLotacao} onValueChange={setSelectedLotacao}>
                    <SelectTrigger className="bg-input border-borderCustom text-foregroundCustom">
                      <SelectValue placeholder="Selecione a escola" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-borderCustom text-foregroundCustom">
                      <SelectItem value="escola_modelo">Escola Modelo</SelectItem>
                      <SelectItem value="escola_central">Escola Central</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 p-3 bg-background border border-borderCustom rounded-md">
                  <Label className="text-foregroundCustom font-bold flex items-center gap-2">
                    <Shield className="w-4 h-4 text-highlight" /> 
                    Acesso ao Sistema
                  </Label>
                  <div className="mt-2 space-y-2">
                    <Label className="text-muted-foreground text-xs">Escola de Acesso (Nível 3/4)</Label>
                    <Select value={selectedPermissaoEscola} onValueChange={setSelectedPermissaoEscola}>
                      <SelectTrigger className="bg-input border-borderCustom text-foregroundCustom">
                        <SelectValue placeholder="Selecione a escola permitida" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-borderCustom text-foregroundCustom">
                        <SelectItem value="escola_modelo">Escola Modelo</SelectItem>
                        <SelectItem value="escola_central">Escola Central</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedLotacao !== selectedPermissaoEscola && (
                      <p className="text-xs text-destructive">
                        Atenção: A permissão difere da lotação! (Bug do Ciro)
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-highlight text-background hover:bg-highlight/90">
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar funcionário..."
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
              <TableHead className="text-foregroundCustom font-semibold">Email</TableHead>
              <TableHead className="text-foregroundCustom font-semibold">Lotação</TableHead>
              <TableHead className="text-foregroundCustom font-semibold">Nível</TableHead>
              <TableHead className="text-right text-foregroundCustom font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockFuncionarios.map((func) => (
              <TableRow key={func.id} className="border-borderCustom hover:bg-hoverCustom transition-colors">
                <TableCell className="font-medium text-white">{func.nome}</TableCell>
                <TableCell className="text-muted-foreground">{func.email}</TableCell>
                <TableCell className="text-muted-foreground">{func.lotacao}</TableCell>
                <TableCell className="text-muted-foreground">Nível {func.nivel}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="text-highlight hover:text-highlight/80 hover:bg-highlight/10">
                    Gerenciar Acesso
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
