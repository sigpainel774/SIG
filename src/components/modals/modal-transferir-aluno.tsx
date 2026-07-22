'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowRightLeft } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface ModalTransferirAlunoProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
  alunoNome?: string
  alunoId?: string
  escolaOrigemId?: string
}

export function ModalTransferirAluno({ 
  open, 
  onOpenChange, 
  trigger, 
  alunoNome = 'Aluno', 
  alunoId,
  escolaOrigemId 
}: ModalTransferirAlunoProps) {
  
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [escolaDestino, setEscolaDestino] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [arquivos, setArquivos] = useState<FileList | null>(null)

  const activeOpen = open !== undefined ? open : isOpen

  // Buscar escolas ativas reais do Supabase
  const { data: escolas = [] } = useSWR(
    activeOpen ? 'escolas_ativas_transferencia' : null,
    async () => {
      const { createClient } = await import('@/lib/supabaseClient')
      const supabase = createClient()
      const { data, error } = await supabase
        .from('escolas')
        .select('id, nome')
        .is('deleted_at', null)
        .eq('ativo', true)
        .order('nome', { ascending: true })
      if (error) throw error
      return data || []
    }
  )

  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
    setIsOpen(val)
  }

  const handleSalvarTransferencia = async () => {
    if (!escolaDestino) {
      toast.error('Selecione uma escola de destino.')
      return
    }

    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      toast.success(`Solicitação enviada! A escola de destino precisará aprovar.`)
      handleOpenChange(false)
    }, 1000)
  }

  return (
    <>
      {trigger && (
        <div onClick={() => handleOpenChange(true)} className="inline-block cursor-pointer">
          {trigger}
        </div>
      )}
      <StandardDialog
        open={activeOpen}
        onOpenChange={handleOpenChange}
        title="Solicitar Transferência"
        maxWidth="sm:max-w-[450px]"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button 
              variant="ghost" 
              onClick={() => handleOpenChange(false)}
              className="text-[#aaa] hover:bg-[#27272a] hover:text-white"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSalvarTransferencia}
              disabled={loading}
              className="bg-highlight text-black hover:bg-highlight/90"
            >
              {loading ? 'Enviando...' : 'Solicitar Transferência'}
            </Button>
          </div>
        }
      >
        <p className="text-[#aaa] text-sm mb-4">
          Você está solicitando a transferência de <strong className="text-white">{alunoNome}</strong> para outra escola. A escola de destino precisará aprovar.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[#ccc] text-[13px]">Escola de Destino</Label>
            <Select value={escolaDestino} onValueChange={(val) => val && setEscolaDestino(val)}>
              <SelectTrigger className="w-full bg-[#121212] border-[#3f3f46] text-white">
                <SelectValue placeholder="Selecione a escola de destino..." />
              </SelectTrigger>
              <SelectContent className="bg-[#18181b] border-[#3f3f46] text-white">
                {escolas
                  .filter((e: any) => e.id !== escolaOrigemId)
                  .map((e: any) => (
                    <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-[#ccc] text-[13px]">Observações (Opcional)</Label>
            <Textarea 
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full bg-[#121212] border-[#3f3f46] text-white" 
              rows={3} 
              placeholder="Motivo da transferência, histórico relevante..."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#ccc] text-[13px]">Anexar Documentos (Opcional)</Label>
            <Input 
              type="file" 
              multiple 
              onChange={(e) => setArquivos(e.target.files)}
              className="w-full bg-[#121212] border-[#3f3f46] text-white file:text-white" 
            />
            <span className="text-[11px] text-[#666]">Formatos aceitos: PDF, JPG, PNG.</span>
          </div>
        </div>
      </StandardDialog>
    </>
  )
}
