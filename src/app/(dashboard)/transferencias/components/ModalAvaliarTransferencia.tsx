'use client'

import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { ArrowLeftRight, Check, X, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalAvaliarTransferenciaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transferencia: any
  activeTab: 'alunos' | 'funcionarios'
  isEditMode: boolean
  isAdminGlobalOrRoot: () => boolean
  processing: boolean
  justificativa: string
  setJustificativa: (v: string) => void
  onDecidir: (aceitar: boolean) => Promise<any>
  onReverter: () => Promise<any>
}

export function ModalAvaliarTransferencia({
  open,
  onOpenChange,
  transferencia,
  activeTab,
  isEditMode,
  isAdminGlobalOrRoot,
  processing,
  justificativa,
  setJustificativa,
  onDecidir,
  onReverter
}: ModalAvaliarTransferenciaProps) {
  if (!transferencia) return null

  const nomeEntidade = activeTab === 'alunos' 
    ? (transferencia.alunos?.nome ?? transferencia.ficha_snapshot?.nome ?? 'Sem nome')
    : (transferencia.funcionarios?.nome ?? transferencia.ficha_snapshot?.nome ?? 'Sem nome')

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Avaliar Transferência"
      maxWidth="sm:max-w-lg"
    >
      <div className="space-y-4">
        <div>
          <span className="text-xs text-[#aaa]">Nome do {activeTab === 'alunos' ? 'Aluno' : 'Funcionário'}</span>
          <p className="text-white font-semibold text-base mt-0.5">{nomeEntidade}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-[#aaa]">Origem</span>
            <p className="text-white text-sm font-medium mt-0.5">{transferencia.origem?.nome ?? 'Rede'}</p>
          </div>
          <div>
            <span className="text-xs text-[#aaa]">Destino</span>
            <p className="text-white text-sm font-medium mt-0.5">
              {transferencia.fora_da_rede ? 'Fora da Rede Municipal' : (transferencia.destino?.nome ?? 'Rede')}
            </p>
          </div>
        </div>

        <div>
          <span className="text-xs text-[#aaa]">Motivo da Solicitação</span>
          <div className="bg-[#121212] p-3 rounded-lg border border-[#26262a] text-zinc-300 text-sm mt-1">
            {transferencia.motivo ?? 'Sem motivo informado.'}
          </div>
        </div>

        {transferencia.status === 'PENDENTE' && isEditMode ? (
          <div className="space-y-2 pt-2">
            <label className="text-xs text-[#aaa] font-medium">Justificativa / Observações (Obrigatório para Rejeitar)</label>
            <textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Escreva a resposta para o solicitante..."
              className="w-full min-h-[90px] p-3 rounded-lg bg-[#121212] border border-[#3f3f46] text-white text-sm outline-none focus:border-sky-500 resize-none"
            />
          </div>
        ) : (
          transferencia.resposta_texto && (
            <div>
              <span className="text-xs text-[#aaa]">Justificativa do Retorno</span>
              <div className="bg-[#121212] p-3 rounded-lg border border-[#26262a] text-zinc-300 text-sm mt-1 italic">
                "{transferencia.resposta_texto}"
              </div>
            </div>
          )
        )}
      </div>

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#26262a]">
        <Button 
          variant="ghost" 
          onClick={() => onOpenChange(false)}
          className="text-[#aaa] hover:bg-[#27272a] hover:text-white"
        >
          Fechar
        </Button>
        {activeTab === 'funcionarios' && 
         transferencia.status === 'ACEITA' && 
         transferencia.lotacao_id && 
         isAdminGlobalOrRoot() && (
          <Button
            disabled={processing}
            onClick={onReverter}
            className="bg-amber-600/20 text-amber-500 hover:bg-amber-600 hover:text-white border border-amber-600/50 font-bold gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", processing && "animate-spin")} />
            Reverter Transferência
          </Button>
        )}
        {transferencia.status === 'PENDENTE' && isEditMode && (
          <>
            <Button 
              disabled={processing}
              onClick={() => onDecidir(false)}
              className="bg-rose-600/20 text-rose-500 hover:bg-rose-600 hover:text-white border border-rose-600/50"
            >
              <X className="w-4 h-4 mr-2" /> Rejeitar
            </Button>
            <Button 
              disabled={processing}
              onClick={() => onDecidir(true)}
              className="bg-sky-600 text-white hover:bg-sky-700"
            >
              <Check className="w-4 h-4 mr-2" /> Aceitar
            </Button>
          </>
        )}
      </div>
    </StandardDialog>
  )
}
