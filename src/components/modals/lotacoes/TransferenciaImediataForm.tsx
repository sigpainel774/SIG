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

interface TransferenciaImediataFormProps {
  escolas: Escola[]
  lotacoes: Lotacao[]
  salvando: boolean
  onTransferir: (origemId: string, destinoEscolaId: string) => Promise<void>
}

export function TransferenciaImediataForm({
  escolas,
  lotacoes,
  salvando,
  onTransferir,
}: TransferenciaImediataFormProps) {
  const [origemId, setOrigemId] = useState('')
  const [destinoEscolaId, setDestinoEscolaId] = useState('')

  const handleSubmete = async () => {
    if (!origemId || !destinoEscolaId) return
    await onTransferir(origemId, destinoEscolaId)
    setOrigemId('')
    setDestinoEscolaId('')
  }

  return (
    <div className="bg-[#1a1a1e] border border-[#26262a] rounded-xl p-4 space-y-3">
      <h4 className="flex items-center gap-2 text-sm font-bold text-rose-400">
        <ArrowRightLeft className="w-4 h-4" />
        Transferência Imediata
      </h4>
      <div className="space-y-2">
        <label className="text-xs text-zinc-400">Remover da Lotação (Origem):</label>
        <Select
          value={origemId}
          onValueChange={(v) => setOrigemId(v ?? '')}
        >
          <SelectTrigger className="bg-[#121216] border-[#2e2e33] text-white text-sm h-9">
            <SelectValue placeholder="Selecione a lotação original...">
              {origemId
                ? (lotacoes.find((l) => l.id === origemId)?.escolaNome || (lotacoes.length === 0 ? 'Carregando...' : origemId))
                : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1e] border-[#2e2e33] text-white">
            {lotacoes.map((lot) => (
              <SelectItem key={lot.id} value={lot.id}>
                {lot.escolaNome ?? lot.escola_id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-xs text-zinc-400">Alocar em (Destino):</label>
        <Select
          value={destinoEscolaId}
          onValueChange={(v) => setDestinoEscolaId(v ?? '')}
        >
          <SelectTrigger className="bg-[#121216] border-[#2e2e33] text-white text-sm h-9">
            <SelectValue placeholder="Selecione uma escola...">
              {destinoEscolaId
                ? (escolas.find((e) => e.id === destinoEscolaId)?.nome || (escolas.length === 0 ? 'Carregando...' : destinoEscolaId))
                : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1e] border-[#2e2e33] text-white">
            {escolas.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        onClick={handleSubmete}
        disabled={salvando || !origemId || !destinoEscolaId}
        className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold gap-2 h-9"
      >
        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
        Mover Funcionário
      </Button>
    </div>
  )
}
