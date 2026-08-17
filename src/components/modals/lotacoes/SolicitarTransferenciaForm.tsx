'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowRightLeft, Loader2 } from 'lucide-react'
import { Escola, Lotacao } from '@/hooks/useGestaoLotacoes'

interface SolicitarTransferenciaFormProps {
  escolas: Escola[]
  escolaAtivaId: string | null
  lotacaoNaMinhaEscola: Lotacao
  salvando: boolean
  onSolicitar: (destinoEscolaId: string, motivo: string) => Promise<void>
}

export function SolicitarTransferenciaForm({
  escolas,
  escolaAtivaId,
  lotacaoNaMinhaEscola,
  salvando,
  onSolicitar,
}: SolicitarTransferenciaFormProps) {
  const [destinoEscolaId, setDestinoEscolaId] = useState('')
  const [motivoSolicitacao, setMotivoSolicitacao] = useState('')

  const handleSubmete = async () => {
    if (!destinoEscolaId || !motivoSolicitacao) return
    await onSolicitar(destinoEscolaId, motivoSolicitacao)
    setDestinoEscolaId('')
    setMotivoSolicitacao('')
  }

  const escolasDisponiveis = escolas.filter((e) => e.id !== escolaAtivaId)

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-xs">
      <h4 className="flex items-center gap-2 text-sm font-bold text-sky-600 dark:text-sky-400">
        <ArrowRightLeft className="w-4 h-4" />
        Solicitar Transferência de Lotação
      </h4>
      <p className="text-xs text-muted-foreground">
        Solicite a transferência da lotação deste funcionário na sua escola para outra unidade da rede municipal. A escola de destino receberá a solicitação para avaliação.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground font-medium block">Origem:</label>
          <div className="bg-background border border-border px-3 py-2 rounded-lg text-sm text-sky-600 dark:text-[#3ea6ff] font-semibold">
            {lotacaoNaMinhaEscola.escolaNome ?? 'Minha Escola'}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground font-medium block">Escola de Destino:</label>
          <Select
            value={destinoEscolaId}
            onValueChange={(v) => setDestinoEscolaId(v ?? '')}
          >
            <SelectTrigger className="bg-background border-border text-foreground text-sm h-9">
              <SelectValue placeholder="Selecione a escola destino...">
                {destinoEscolaId
                  ? (escolasDisponiveis.find((e) => e.id === destinoEscolaId)?.nome || (escolasDisponiveis.length === 0 ? 'Carregando...' : destinoEscolaId))
                  : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-popover-foreground">
              {escolasDisponiveis.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground font-medium block">Justificativa / Motivo:</label>
        <textarea
          value={motivoSolicitacao}
          onChange={(e) => setMotivoSolicitacao(e.target.value)}
          placeholder="Descreva a portaria de remoção ou a justificativa para a mudança de lotação..."
          className="w-full min-h-[80px] p-3 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground text-sm outline-none focus:border-sky-500 resize-none"
        />
      </div>
      <Button
        onClick={handleSubmete}
        disabled={salvando || !destinoEscolaId || !motivoSolicitacao}
        className="w-full bg-[#3ea6ff] hover:bg-[#0090ff] text-[#0f0f0f] font-bold gap-2 h-9 cursor-pointer"
      >
        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
        Enviar Solicitação de Transferência
      </Button>
    </div>
  )
}
