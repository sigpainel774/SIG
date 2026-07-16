'use client'

import { useState, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { UserMinus, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'
import { useEditModeStore } from '@/store/useEditModeStore'

interface ModalProgramarDesligamentoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  funcionarioId: string | null
  funcionarioNome?: string
  onSuccess?: () => void
}

export function ModalProgramarDesligamento({ open, onOpenChange, funcionarioId, funcionarioNome, onSuccess }: ModalProgramarDesligamentoProps) {
  const { isEditMode } = useEditModeStore()
  const supabase = createClient()

  const [loadingVinculo, setLoadingVinculo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [vinculoId, setVinculoId] = useState<string | null>(null)
  const [cargoName, setCargoName] = useState('')

  // Form State
  const [dataDesligamento, setDataDesligamento] = useState('')
  const [motivo, setMotivo] = useState('')

  // Busca o vínculo ativo do funcionário
  useEffect(() => {
    async function loadActiveVinculo() {
      if (!funcionarioId || !open) return
      setLoadingVinculo(true)
      try {
        const { data, error } = await supabase
          .from('vinculos_funcionarios')
          .select('id, cargo')
          .eq('funcionario_id', funcionarioId)
          .eq('ativo', true)
          .maybeSingle()

        if (error) throw error

        if (data) {
          setVinculoId(data.id)
          setCargoName(data.cargo || 'Não definido')
        } else {
          setVinculoId(null)
          setCargoName('')
          toast.error('Nenhum vínculo ativo encontrado para este funcionário.')
        }
      } catch (err: any) {
        toast.error(`Erro ao carregar lotação: ${err.message}`)
      } finally {
        setLoadingVinculo(false)
      }
    }

    loadActiveVinculo()
    // Reset form
    setDataDesligamento('')
    setMotivo('')
  }, [funcionarioId, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEditMode) return
    if (!funcionarioId || !vinculoId) {
      toast.error('Não é possível programar o desligamento sem um vínculo ativo.')
      return
    }

    if (!dataDesligamento) {
      toast.error('Informe a data programada para o desligamento.')
      return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const payload = {
        funcionario_id: funcionarioId,
        vinculo_id: vinculoId,
        data_desligamento: dataDesligamento,
        motivo: motivo.trim() || null,
        status: 'programado',
        programado_por: user?.id || null
      }

      const { error } = await supabase
        .from('desligamentos_programados')
        .insert(payload)

      if (error) throw error

      toast.success('Desligamento programado com sucesso!')
      onOpenChange(false)
      if (onSuccess) onSuccess()
    } catch (err: any) {
      toast.error(`Erro ao programar desligamento: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#121214] border-[#27272a] text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <UserMinus className="w-5 h-5 text-rose-500" />
            Programar Desligamento
          </DialogTitle>
        </DialogHeader>

        {loadingVinculo ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="bg-[#18181a] border border-[#27272a] rounded-xl p-4 space-y-2">
              <div>
                <span className="text-xs text-[#aaa] block">Funcionário</span>
                <span className="font-bold text-sm text-slate-200">{funcionarioNome ?? 'Não informado'}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#27272a]/50">
                <div>
                  <span className="text-xs text-[#aaa] block">Cargo do Vínculo</span>
                  <span className="text-xs text-slate-300 font-semibold">{cargoName || 'Nenhum'}</span>
                </div>
                <div>
                  <span className="text-xs text-[#aaa] block">Vínculo ID</span>
                  <span className="text-[10px] text-slate-400 font-mono truncate block">{vinculoId ?? 'Inexistente'}</span>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs text-[#aaa]">Data do Desligamento *</Label>
              <Input
                type="date"
                value={dataDesligamento}
                onChange={(e) => setDataDesligamento(e.target.value)}
                className="bg-[#18181a] border-[#27272a] text-white mt-1 h-10 cursor-pointer"
                required
                disabled={!isEditMode || !vinculoId}
              />
            </div>

            <div>
              <Label className="text-xs text-[#aaa]">Motivo do Desligamento</Label>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex: Término de contrato temporário, aposentadoria, exoneração a pedido..."
                className="bg-[#18181a] border-[#27272a] text-white mt-1 min-h-[80px]"
                disabled={!isEditMode || !vinculoId}
              />
            </div>

            <DialogFooter className="pt-4 border-t border-[#27272a] gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="bg-[#1a1a1a] border-[#27272a] text-white hover:bg-[#27272a] h-10"
              >
                Cancelar
              </Button>
              {isEditMode && (
                <Button
                  type="submit"
                  disabled={saving || !vinculoId}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-10 gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Programar
                </Button>
              )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
