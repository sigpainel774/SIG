'use client'

import { useState } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
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

  const handleConfirm = async () => {
    if (!justificativa.trim()) {
      toast.error('Por favor, informe a justificativa do arquivamento.')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const performedBy = {
        id: funcionario?.id && funcionario.id !== '' ? funcionario.id : null,
        name: funcionario?.nome ?? 'Administrador Root',
        email: funcionario?.email ?? 'root@system.com'
      }

      const result = await arquivarAluno({
        supabase,
        aluno,
        motivo: justificativa.trim(),
        escolaOrigemId: escolaAtivaId ?? aluno?.escola_id ?? null,
        arquivadoPor: performedBy as any
      })

      if (!result.success) {
        throw new Error('Erro ao arquivar o aluno.')
      }

      toast.success('Aluno arquivado com sucesso!')
      onOpenChange(false)
      setJustificativa('')
      onSuccess()
    } catch (err: any) {
      console.error('Erro ao arquivar aluno:', err)
      toast.error(err.message || 'Erro ao arquivar aluno.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Justificativa de Arquivamento"
      description={`Você está arquivando a ficha de ${aluno?.nome ?? 'aluno'}. O aluno sairá do painel da escola, mas seus dados serão preservados no painel geral de arquivados.`}
      maxWidth="sm:max-w-[480px]"
      footer={
        <div className="flex justify-end gap-2 w-full pt-4 border-t border-[#26262a]">
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
        </div>
      }
    >
      <div className="space-y-4 py-2">
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
    </StandardDialog>
  )
}
