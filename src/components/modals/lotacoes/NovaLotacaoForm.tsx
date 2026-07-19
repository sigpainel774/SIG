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
import { Plus, Loader2 } from 'lucide-react'
import { Escola, Cargo } from '@/hooks/useGestaoLotacoes'

interface NovaLotacaoFormProps {
  escolas: Escola[]
  cargos: Cargo[]
  salvando: boolean
  onAdicionarLotacao: (escolaId: string, cargoNome: string) => Promise<void>
}

export function NovaLotacaoForm({
  escolas,
  cargos,
  salvando,
  onAdicionarLotacao,
}: NovaLotacaoFormProps) {
  const [novaEscola, setNovaEscola] = useState('')
  const [novoCargo, setNovoCargo] = useState('')

  const handleSubmete = async () => {
    if (!novaEscola) return
    await onAdicionarLotacao(novaEscola, novoCargo)
    setNovaEscola('')
    setNovoCargo('')
  }

  return (
    <div className="bg-[#1a1a1e] border border-[#26262a] rounded-xl p-4 space-y-3">
      <h4 className="flex items-center gap-2 text-sm font-bold text-[#3ea6ff]">
        <Plus className="w-4 h-4" />
        Nova Lotação
      </h4>
      <div className="space-y-2">
        <label className="text-xs text-zinc-400">Escola / Órgão:</label>
        <Select
          value={novaEscola}
          onValueChange={(v) => setNovaEscola(v ?? '')}
        >
          <SelectTrigger className="bg-[#121216] border-[#2e2e33] text-white text-sm h-9">
            <SelectValue placeholder="Selecione uma escola...">
              {novaEscola
                ? (escolas.find((e) => e.id === novaEscola)?.nome || (escolas.length === 0 ? 'Carregando...' : novaEscola))
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
      <div className="space-y-2">
        <label className="text-xs text-zinc-400">Cargo / Profissão:</label>
        <Select
          value={novoCargo}
          onValueChange={(v) => setNovoCargo(v ?? '')}
        >
          <SelectTrigger className="bg-[#121216] border-[#2e2e33] text-white text-sm h-9">
            <SelectValue placeholder="Selecione um cargo...">
              {novoCargo
                ? (cargos.find((c) => c.nome === novoCargo)?.nome || (cargos.length === 0 ? 'Carregando...' : novoCargo))
                : undefined}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1e] border-[#2e2e33] text-white">
            {cargos.map((c) => (
              <SelectItem key={c.id} value={c.nome}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        onClick={handleSubmete}
        disabled={salvando || !novaEscola}
        className="w-full bg-[#3ea6ff] hover:bg-[#0090ff] text-[#0f0f0f] font-bold gap-2 h-9"
      >
        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Adicionar Lotação
      </Button>
    </div>
  )
}
