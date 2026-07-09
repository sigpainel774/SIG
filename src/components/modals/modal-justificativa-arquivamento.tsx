'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'
import { arquivarAluno } from '@/lib/audit/archive-agent'
import { Loader2 } from 'lucide-react'

interface ModalJustificativaArquivamentoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  aluno: any
  funcionario: any
  escolaAtivaId?: string | null
  onSuccess: () => void
}

export function ModalJustificativaArquivamento({
  open,
  onOpenChange,
  aluno,
  funcionario,
  escolaAtivaId,
  onSuccess
}: ModalJustificativaArquivamentoProps) {
  const [justificativa, setJustificativa] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleConfirm = async () => {
    if (!justificativa.trim()) {
      toast.error('Por favor, preencha a justificativa de arquivamento.')
      return
    }

    setLoading(true)
    try {
      const performedBy = {
        id: funcionario?.id && funcionario.id !== '' ? funcionario.id : null,
        name: funcionario?.nome ?? 'Administrador Root',
        email: funcionario?.email ?? 'root@system.com'
      }

      const res = await arquivarAluno({
        supabase,
        aluno,
        motivo: justificativa.trim(),
        escolaOrigemId: escolaAtivaId ?? aluno.escola_id ?? null,
        arquivadoPor: performedBy as any
      })

      if (res.success) {
        toast.success(`Ficha do aluno "${aluno.nome}" arquivada com sucesso!`)
        setJustificativa('')
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error('Erro ao arquivar a ficha do aluno.')
      }
    } catch (error) {
      console.error('Erro ao arquivar aluno:', error)
      toast.error('Ocorreu um erro ao processar o arquivamento.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-[#141416] border border-[#26262a] text-white">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white">Justificativa de Arquivamento</DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs mt-1">
            Você está arquivando a ficha do aluno <strong className="text-white">{aluno?.nome}</strong>. O aluno sairá do painel da escola, mas seus dados serão preservados no painel geral de arquivados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="justificativa" className="text-xs font-bold text-zinc-300 uppercase">
              Motivo do arquivamento *
            </label>
            <textarea
              id="justificativa"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Digite o motivo detalhado (ex: transferência de escola, evasão escolar, conclusão de curso...)"
              className="w-full h-24 px-3 py-2 text-sm bg-black/40 border border-[#26262a] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#3ea6ff]/40 resize-none"
              disabled={loading}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="bg-[#27272a] hover:bg-[#3f3f46] text-white border border-[#3f3f46] rounded-xl text-xs font-semibold cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Arquivando...</span>
              </>
            ) : (
              <span>Confirmar Arquivamento</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
