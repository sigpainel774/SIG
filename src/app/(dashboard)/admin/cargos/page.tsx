'use client'

import { useState, useEffect } from 'react'
import { Briefcase, ArrowLeft, Plus, Edit2, Trash2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Database } from '@/types/supabase'

type Cargo = Database['public']['Tables']['cargos']['Row']

export default function AdminCargosPage() {
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [currentCargo, setCurrentCargo] = useState<Partial<Cargo>>({ nome: '', nivel_acesso: 1 })
  const [cargoToDelete, setCargoToDelete] = useState<Cargo | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    fetchCargos()
  }, [])

  const fetchCargos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('cargos').select('*').order('nome')
      if (error) throw error
      setCargos(data || [])
    } catch (error) {
      toast.error('Erro ao carregar cargos')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (cargo?: Cargo) => {
    if (cargo) {
      setCurrentCargo(cargo)
    } else {
      setCurrentCargo({ nome: '', nivel_acesso: 1 })
    }
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!currentCargo.nome) {
      toast.error('Nome do cargo é obrigatório')
      return
    }

    try {
      setSaving(true)
      if (currentCargo.id) {
        // Edit
        const { error } = await supabase
          .from('cargos')
          .update({ nome: currentCargo.nome, nivel_acesso: currentCargo.nivel_acesso })
          .eq('id', currentCargo.id)
        if (error) throw error
        toast.success('Cargo atualizado com sucesso!')
      } else {
        // Create
        const { error } = await supabase
          .from('cargos')
          .insert({ nome: currentCargo.nome, nivel_acesso: currentCargo.nivel_acesso! })
        if (error) throw error
        toast.success('Cargo criado com sucesso!')
      }
      setIsModalOpen(false)
      fetchCargos()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar cargo')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!cargoToDelete) return
    try {
      setSaving(true)
      const { error } = await supabase.from('cargos').delete().eq('id', cargoToDelete.id)
      if (error) throw error
      toast.success('Cargo excluído com sucesso!')
      setIsDeleteOpen(false)
      fetchCargos()
    } catch (error: any) {
      toast.error('Erro ao excluir cargo. Ele pode estar em uso.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-borderCustom flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 hover:bg-[#27272a] rounded-lg transition-colors text-muted-foreground hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-purple-500" /> Tabela de Cargos
            </h2>
          </div>
          <p className="text-muted-foreground text-sm mt-1 ml-11">Gestão de cargos municipais e níveis de acesso padrão.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="bg-highlight hover:bg-highlight/90 text-white font-semibold">
          <Plus className="w-4 h-4 mr-2" /> Novo Cargo
        </Button>
      </div>

      <div className="bg-card border border-borderCustom rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-borderCustom hover:bg-transparent">
                <TableHead className="text-foregroundCustom font-semibold">Nome do Cargo</TableHead>
                <TableHead className="text-foregroundCustom font-semibold text-center">Nível de Acesso</TableHead>
                <TableHead className="text-foregroundCustom font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cargos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    Nenhum cargo cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                cargos.map((cargo) => (
                  <TableRow key={cargo.id} className="border-borderCustom hover:bg-hoverCustom/50">
                    <TableCell className="font-medium text-white">{cargo.nome}</TableCell>
                    <TableCell className="text-center">
                      <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2.5 py-1 rounded-md text-xs font-bold">
                        Nível {cargo.nivel_acesso}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(cargo)} className="text-sky-400 hover:text-sky-300 hover:bg-sky-400/10 h-8 w-8">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { setCargoToDelete(cargo); setIsDeleteOpen(true); }} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal Criar/Editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-card border-borderCustom text-foregroundCustom sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              {currentCargo.id ? 'Editar Cargo' : 'Novo Cargo'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-foregroundCustom">Nome do Cargo</Label>
              <Input
                id="nome"
                value={currentCargo.nome || ''}
                onChange={(e) => setCurrentCargo({ ...currentCargo, nome: e.target.value })}
                className="bg-input border-borderCustom text-white"
                placeholder="Ex: Professor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nivel" className="text-foregroundCustom">Nível de Acesso (ABAC)</Label>
              <Input
                id="nivel"
                type="number"
                min={1}
                max={6}
                value={currentCargo.nivel_acesso || 1}
                onChange={(e) => setCurrentCargo({ ...currentCargo, nivel_acesso: parseInt(e.target.value) || 1 })}
                className="bg-input border-borderCustom text-white"
              />
              <p className="text-xs text-muted-foreground mt-1">Valores entre 1 e 6.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="bg-transparent border-borderCustom text-foregroundCustom hover:bg-hoverCustom">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-highlight hover:bg-highlight/90 text-white">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {currentCargo.id ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Excluir */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="bg-card border-borderCustom text-foregroundCustom sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-white text-xl flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" /> Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Tem certeza que deseja excluir o cargo <strong>{cargoToDelete?.nome}</strong>?</p>
            <p className="text-xs text-red-400 mt-2">Isso não afetará os funcionários que já possuem este cargo escrito em sua ficha, mas removerá a opção para novos cadastros.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="bg-transparent border-borderCustom text-foregroundCustom hover:bg-hoverCustom">
              Cancelar
            </Button>
            <Button onClick={handleDelete} disabled={saving} className="bg-red-600 hover:bg-red-700 text-white border-none">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
