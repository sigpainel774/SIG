'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Loader2, Search, ChevronDown, Check, X } from 'lucide-react'
import { Escola, Cargo } from '@/hooks/useGestaoLotacoes'
import { EscolaSearchSelect } from './EscolaSearchSelect'

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

  const [cargoDropdownOpen, setCargoDropdownOpen] = useState(false)
  const [buscaCargo, setBuscaCargo] = useState('')
  const cargoDropdownRef = useRef<HTMLDivElement>(null)

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (cargoDropdownRef.current && !cargoDropdownRef.current.contains(event.target as Node)) {
        setCargoDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Filtra os cargos com busca insensível a maiúsculas/minúsculas e acentos
  const cargosFiltrados = useMemo(() => {
    if (!buscaCargo.trim()) return cargos
    const termoNormalizado = buscaCargo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
    return cargos.filter((c) =>
      c.nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .includes(termoNormalizado)
    )
  }, [cargos, buscaCargo])

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
    setBuscaCargo('')
    setCargoDropdownOpen(false)
    setNovaCarga('')
    setNovaModalidade('Regular')
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-xs">
      <h4 className="flex items-center gap-2 text-sm font-bold text-sky-600 dark:text-[#3ea6ff]">
        <Plus className="w-4 h-4" />
        Nova Lotação
      </h4>
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground font-medium">Escola / Órgão:</label>
        <EscolaSearchSelect
          escolas={escolas}
          value={novaEscola}
          onChange={(v) => {
            setNovaEscola(v)
            const esc = escolas.find((e) => e.id === v)
            const isEmaee = esc?.tipo === 'EMAEE' || /emaee/i.test(esc?.nome || '')
            if (isEmaee) {
              setNovaModalidade('Regular')
            }
          }}
          placeholder="Selecione uma escola..."
          disabled={salvando}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-2 space-y-2 relative" ref={cargoDropdownRef}>
          <label className="text-xs text-muted-foreground font-medium">Cargo / Profissão:</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setCargoDropdownOpen((prev) => !prev)}
              className="w-full flex items-center justify-between bg-background border border-border text-foreground text-sm h-9 rounded-md px-3 text-left focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
            >
              <span className="truncate">
                {novoCargo
                  ? (cargos.find((c) => c.nome === novoCargo)?.nome ?? novoCargo)
                  : <span className="text-muted-foreground">Selecione um cargo...</span>}
              </span>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {novoCargo && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      setNovoCargo('')
                    }}
                    className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                    title="Limpar seleção"
                  >
                    <X className="w-3.5 h-3.5" />
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${cargoDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {cargoDropdownOpen && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 min-w-[240px]">
                <div className="p-2 border-b border-border bg-muted/30">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      autoFocus
                      placeholder="Pesquisar cargo..."
                      value={buscaCargo}
                      onChange={(e) => setBuscaCargo(e.target.value)}
                      className="w-full bg-background border border-border text-foreground text-xs rounded-md pl-8 pr-2.5 py-1.5 outline-none focus:border-sky-500 placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto p-1 divide-y divide-border/20">
                  {cargosFiltrados.length === 0 ? (
                    <div className="py-4 text-center text-xs text-muted-foreground">
                      Nenhum cargo encontrado.
                    </div>
                  ) : (
                    cargosFiltrados.map((c) => {
                      const isSelected = novoCargo === c.nome
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setNovoCargo(c.nome)
                            setCargoDropdownOpen(false)
                            setBuscaCargo('')
                          }}
                          className={`w-full text-left px-2.5 py-1.5 text-xs rounded-md flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold'
                              : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          <span className="truncate">{c.nome}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-sky-500 shrink-0 ml-2" />}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground font-medium">Carga (h):</label>
          <input
            type="number"
            min={1}
            max={80}
            value={novaCarga}
            onChange={(e) => setNovaCarga(e.target.value)}
            placeholder="Ex: 20"
            className="w-full bg-background border border-border text-foreground text-sm h-9 rounded-md px-2.5 outline-none focus:border-sky-500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs text-muted-foreground font-medium">Modalidade de Ensino:</label>
        <Select
          value={novaModalidade}
          onValueChange={(v) => setNovaModalidade(v ?? 'Regular')}
        >
          <SelectTrigger className="bg-background border-border text-foreground text-sm h-9 font-medium">
            <SelectValue placeholder="Selecione a modalidade...">
              {novaModalidade === 'EJA' ? 'EJA (Educação de Jovens e Adultos)' : 'Regular (Ensino Regular)'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-popover border-border text-popover-foreground">
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
