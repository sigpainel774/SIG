'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface ModalNovaOcorrenciaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  alunoId: string
  turmaId: string
  escolaId: string
  onSuccess?: () => void
}

export function ModalNovaOcorrencia({
  open,
  onOpenChange,
  alunoId,
  turmaId,
  escolaId,
  onSuccess
}: ModalNovaOcorrenciaProps) {
  const [tipo, setTipo] = useState('')
  const [gravidade, setGravidade] = useState('Leve')
  const [descricao, setDescricao] = useState('')
  const [data, setData] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  const supabase = createClient()
  const funcionario = useAuthStore((state) => state.funcionario)

  useEffect(() => {
    if (open) {
      setTipo('')
      setGravidade('Leve')
      setDescricao('')
      setData(new Date().toISOString().split('T')[0])
    }
  }, [open])

  const handleSave = async () => {
    if (!tipo.trim()) {
      toast.error('O tipo de ocorrência é obrigatório')
      return
    }
    if (!descricao.trim()) {
      toast.error('A descrição é obrigatória')
      return
    }
    if (!data) {
      toast.error('A data é obrigatória')
      return
    }

    setLoading(true)

    try {
      // Obter funcionario_id de forma segura (fallback para null se for superadmin global sem registro na tabela de funcionarios)
      const registradoPor = funcionario?.id ?? null

      const { error } = await supabase
        .from('ocorrencias')
        .insert({
          aluno_id: alunoId,
          turma_id: turmaId,
          escola_id: escolaId,
          tipo: tipo.trim(),
          gravidade: gravidade,
          descricao: descricao.trim(),
          data: data,
          registrado_por: registradoPor,
          status_pais: 'Pendente'
        })

      if (error) throw error

      toast.success('Ocorrência registrada com sucesso!')
      if (onSuccess) onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao salvar ocorrência:', err)
      toast.error('Erro ao registrar ocorrência: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] bg-[#121214] border-[#26262a] text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Registrar Ocorrência Disciplinar</DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs">
            Preencha os detalhes da ocorrência do aluno abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Tipo de Ocorrência */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-300">Tipo de Ocorrência *</label>
            <Input
              placeholder="Ex: Atraso, Indisciplina, Falta de Material..."
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="bg-[#18181b] border-[#2a2a2a] text-white placeholder-zinc-500 focus-visible:ring-[#3ea6ff] h-10 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Gravidade */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-300">Gravidade</label>
              <Select value={gravidade} onValueChange={(val) => setGravidade(val ?? 'Leve')}>
                <SelectTrigger className="bg-[#18181b] border-[#2a2a2a] text-white focus:ring-[#3ea6ff] h-10 text-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-[#18181b] border-[#2a2a2a] text-white">
                  <SelectItem value="Leve">Leve</SelectItem>
                  <SelectItem value="Média">Média</SelectItem>
                  <SelectItem value="Grave">Grave</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-300">Data *</label>
              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="bg-[#18181b] border-[#2a2a2a] text-white focus-visible:ring-[#3ea6ff] h-10 text-sm"
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-300">Descrição Detalhada *</label>
            <Textarea
              placeholder="Descreva o ocorrido de forma objetiva..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={4}
              className="bg-[#18181b] border-[#2a2a2a] text-white placeholder-zinc-500 focus-visible:ring-[#3ea6ff] text-sm resize-none"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-[#26262a] mt-2 flex gap-3">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="flex-1 bg-transparent border border-[#2a2a2a] hover:bg-[#18181b] text-white h-10 text-sm font-semibold"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-[#3ea6ff] hover:bg-[#0090ff] text-background font-bold h-10 text-sm"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
