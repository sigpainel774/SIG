'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'

interface ModalTurmaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  turma?: any // null para criar, objeto para editar
  onSuccess: () => void
}

export function ModalTurma({ open, onOpenChange, turma, onSuccess }: ModalTurmaProps) {
  const [nome, setNome] = useState('')
  const [anoLetivo, setAnoLetivo] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(false)
  
  const supabase = createClient()
  const escolaAtivaId = useAuthStore((state) => state.escolaAtivaId)

  useEffect(() => {
    if (open) {
      if (turma) {
        setNome(turma.nome)
        setAnoLetivo(turma.ano_letivo)
      } else {
        setNome('')
        setAnoLetivo(new Date().getFullYear())
      }
    }
  }, [open, turma, escolaAtivaId])

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error('O nome da turma é obrigatório')
      return
    }

    if (!escolaAtivaId) {
      toast.error('Nenhuma escola ativa selecionada')
      return
    }

    setLoading(true)

    try {
      if (turma?.id) {
        // Editar
        const { error } = await supabase
          .from('turmas')
          .update({
            nome: nome.trim(),
            ano_letivo: anoLetivo,
          })
          .eq('id', turma.id)

        if (error) throw error
        toast.success('Turma atualizada com sucesso')
      } else {
        // Criar
        const { data: newTurma, error } = await supabase
          .from('turmas')
          .insert({
            nome: nome.trim(),
            ano_letivo: anoLetivo,
            escola_id: escolaAtivaId
          })
          .select()
          .single()

        if (error) throw error
        
        // Auto-vincular o funcionário criador à turma (caso seja coordenador/professor, para não perder o acesso)
        const funcionarioId = useAuthStore.getState().funcionario?.id
        if (funcionarioId && newTurma?.id) {
          await supabase.from('vinculos_turmas').insert({
            funcionario_id: funcionarioId,
            escola_id: escolaAtivaId,
            turma_id: newTurma.id,
            tipo: 'coordenador' // Padrão seguro para garantir visualização
          })
        }

        toast.success('Turma criada com sucesso')
      }

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error('Erro ao salvar turma: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-[#121212] border-[#27272a] text-white">
        <DialogHeader>
          <DialogTitle>{turma ? 'Editar Turma' : 'Nova Turma'}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Preencha os dados abaixo para {turma ? 'atualizar a' : 'cadastrar uma nova'} turma.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="nome" className="text-sm font-medium text-zinc-300">
              Nome da Turma
            </label>
            <Input
              id="nome"
              placeholder="Ex: 1º Ano A"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="bg-[#18181b] border-[#3f3f46] text-white"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="anoLetivo" className="text-sm font-medium text-zinc-300">
              Ano Letivo
            </label>
            <Input
              id="anoLetivo"
              type="number"
              value={anoLetivo}
              onChange={(e) => setAnoLetivo(parseInt(e.target.value))}
              className="bg-[#18181b] border-[#3f3f46] text-white"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-transparent border-[#3f3f46] text-white hover:bg-[#27272a]"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="bg-highlight text-background hover:bg-highlight/90"
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
