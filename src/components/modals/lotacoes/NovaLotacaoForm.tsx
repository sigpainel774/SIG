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
  onAdicionarLotacao: (
    escolaId: string,
    cargoNome: string,
    cargaHoraria?: number | string | null,
    modalidade?: string | null
  ) => Promise<void>
}

export function NovaLotacaoForm({
  escolas,
  cargos,
  salvando,
  onAdicionarLotacao,
}: NovaLotacaoFormProps) {
  const [novaEscola, setNovaEscola] = useState('')
  const [novoCargo, setNovoCargo] = useState('')
  const [novaCarga, setNovaCarga] = useState('')
  const [novaModalidade, setNovaModalidade] = useState('Regular')

  const escolaSelecionadaObj = escolas.find((e) => e.id === novaEscola)
  const isEmaeeLot = escolaSelecionadaObj?.tipo === 'EMAEE' || /emaee/i.test(escolaSelecionadaObj?.nome || '')

  const handleSubmete = async () => {
    if (!novaEscola) return
    await onAdicionarLotacao(
      novaEscola,
      novoCargo,
      novaCarga ? parseInt(novaCarga, 10) : null,
      novaModalidade
    )
    setNovaEscola('')
    setNovoCargo('')
    setNovaCarga('')
    setNovaModalidade('Regular')
  }

  return (
    <div className="bg-[#1a1a1e] border border-[#26262a] rounded-xl p-4 space-y-3">
      <h4 className="flex items-center gap-2 text-sm font-bold text-[#3ea6ff]">
        <Plus className="w-4 h-4" />
        Nova Lotação
      </h4>
      <div className="space-y-2">
        <label className="text-xs text-zinc-400 font-medium">Escola / Órgão:</label>
        <Select
          value={novaEscola}
          onValueChange={(v) => {
            setNovaEscola(v ?? '')
            const esc = escolas.find((e) => e.id === v)
            const isEmaee = esc?.tipo === 'EMAEE' || /emaee/i.test(esc?.nome || '')
            if (isEmaee) {
              setNovaModalidade('Regular')
            }
          }}
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
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2 space-y-2">
          <label className="text-xs text-zinc-400 font-medium">Cargo / Profissão:</label>
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
        <div className="space-y-2">
          <label className="text-xs text-zinc-400 font-medium">Carga (h):</label>
          <input
            type="number"
            min={1}
            max={80}
            value={novaCarga}
            onChange={(e) => setNovaCarga(e.target.value)}
            placeholder="Ex: 20"
            className="w-full bg-[#121216] border border-[#2e2e33] text-white text-sm h-9 rounded-md px-2.5 outline-none focus:border-[#3ea6ff]"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-zinc-400 font-medium">Modalidade de Ensino:</label>
        <Select
          value={novaModalidade}
          onValueChange={(v) => setNovaModalidade(v ?? 'Regular')}
        >
          <SelectTrigger className="bg-[#121216] border-[#2e2e33] text-white text-sm h-9 font-medium">
            <SelectValue placeholder="Selecione a modalidade...">
              {novaModalidade === 'EJA' ? 'EJA (Educação de Jovens e Adultos)' : 'Regular (Ensino Regular)'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1e] border-[#2e2e33] text-white">
            <SelectItem value="Regular">Regular (Ensino Regular)</SelectItem>
            {!isEmaeeLot && (
              <SelectItem value="EJA">EJA (Educação de Jovens e Adultos)</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <Button
        onClick={handleSubmete}
        disabled={salvando || !novaEscola}
        className="w-full bg-[#3ea6ff] hover:bg-[#0090ff] text-[#0f0f0f] font-bold gap-2 h-9 cursor-pointer"
      >
        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Adicionar Lotação
      </Button>
    </div>
  )
}
