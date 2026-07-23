'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { UserPlus, Loader2, Search, Building2, MapPin, Sparkles, Navigation } from 'lucide-react'
import { MiniMapa } from '@/components/map/MapWrapper'

interface RotaItem {
  id: string
  nome: string
  turno: string
  escola_id?: string | null
}

interface EscolaItem {
  id: string
  nome: string
}

interface ModalAlocarAlunoTransporteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rotas: RotaItem[]
  onSuccess: () => void
}

export function ModalAlocarAlunoTransporte({
  open,
  onOpenChange,
  rotas,
  onSuccess,
}: ModalAlocarAlunoTransporteProps) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [loadingAlunos, setLoadingAlunos] = useState(false)
  const [loadingEscolas, setLoadingEscolas] = useState(false)

  const [escolasLista, setEscolasLista] = useState<EscolaItem[]>([])
  const [escolaSelecionadaId, setEscolaSelecionadaId] = useState<string>('ALL')

  const [buscaAluno, setBuscaAluno] = useState('')
  const [alunosLista, setAlunosLista] = useState<any[]>([])
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState('')
  const [alunoDados, setAlunoDados] = useState<any | null>(null)

  const [rotaId, setRotaId] = useState('')
  const [pontoEmbarqueText, setPontoEmbarqueText] = useState('')
  const [embarqueLat, setEmbarqueLat] = useState<number | undefined>(undefined)
  const [embarqueLng, setEmbarqueLng] = useState<number | undefined>(undefined)
  const [embarqueEndereco, setEmbarqueEndereco] = useState('')
  const [pinoAjustado, setPinoAjustado] = useState(false)

  // Carregar lista de escolas no abrir do modal
  useEffect(() => {
    if (!open) return
    let active = true

    const carregarEscolas = async () => {
      setLoadingEscolas(true)
      try {
        const { data, error } = await supabase
          .from('escolas')
          .select('id, nome')
          .is('deleted_at', null)
          .order('nome')

        if (active && !error && data) {
          setEscolasLista(data)
        }
      } catch (err) {
        console.error('Erro ao carregar escolas:', err)
      } finally {
        if (active) setLoadingEscolas(false)
      }
    }

    carregarEscolas()

    return () => {
      active = false
    }
  }, [open, supabase])

  // Resetar campos quando o modal abre
  useEffect(() => {
    if (open) {
      setBuscaAluno('')
      setAlunoSelecionadoId('')
      setAlunoDados(null)
      setPontoEmbarqueText('')
      setEmbarqueLat(undefined)
      setEmbarqueLng(undefined)
      setEmbarqueEndereco('')
      setPinoAjustado(false)
      setEscolaSelecionadaId('ALL')
      if (rotas.length > 0 && !rotaId) {
        setRotaId(rotas[0].id)
      }
    }
  }, [open, rotas])

  // Se alterar a rota selecionada e ela possuir uma escola associada, sugerir/filtrar pela escola da rota
  useEffect(() => {
    if (!rotaId || escolaSelecionadaId !== 'ALL') return
    const rotaEncontrada = rotas.find((r) => r.id === rotaId)
    if (rotaEncontrada?.escola_id) {
      setEscolaSelecionadaId(rotaEncontrada.escola_id)
    }
  }, [rotaId, rotas, escolaSelecionadaId])

  // Buscar alunos dinamicamente à medida que digita ou altera a escola
  useEffect(() => {
    if (!open) return
    let active = true

    const buscarAlunos = async () => {
      setLoadingAlunos(true)
      try {
        let query = supabase
          .from('alunos')
          .select('id, nome, numero_matricula, escola_id, endereco, latitude, longitude')
          .is('deleted_at', null)
          .order('nome')
          .limit(30)

        if (escolaSelecionadaId && escolaSelecionadaId !== 'ALL') {
          query = query.eq('escola_id', escolaSelecionadaId)
        }

        if (buscaAluno.trim().length >= 2) {
          query = query.ilike('nome', `%${buscaAluno.trim()}%`)
        }

        const { data, error } = await query
        if (!active) return

        if (!error && data) {
          setAlunosLista(data)
        }
      } catch (err) {
        console.error('Erro ao buscar alunos:', err)
      } finally {
        if (active) setLoadingAlunos(false)
      }
    }

    const timer = setTimeout(buscarAlunos, 300)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [buscaAluno, escolaSelecionadaId, open, supabase])

  // Ao selecionar um aluno, carregar dados da ficha de matrícula e inicializar mini-mapa
  useEffect(() => {
    if (!alunoSelecionadoId) {
      setAlunoDados(null)
      setEmbarqueLat(undefined)
      setEmbarqueLng(undefined)
      setEmbarqueEndereco('')
      setPinoAjustado(false)
      return
    }

    const aluno = alunosLista.find((a) => a.id === alunoSelecionadoId)
    if (aluno) {
      setAlunoDados(aluno)
      const latNum = aluno.latitude ? Number(aluno.latitude) : undefined
      const lngNum = aluno.longitude ? Number(aluno.longitude) : undefined

      setEmbarqueLat(latNum)
      setEmbarqueLng(lngNum)
      setEmbarqueEndereco(aluno.endereco ?? '')

      if (aluno.endereco && !pontoEmbarqueText) {
        setPontoEmbarqueText(`Embarque próximo a: ${aluno.endereco}`)
      }
    }
  }, [alunoSelecionadoId, alunosLista])

  const handleCoordinatesChange = (newLat: number, newLng: number) => {
    setEmbarqueLat(newLat)
    setEmbarqueLng(newLng)
    setPinoAjustado(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!alunoSelecionadoId) {
      toast.error('Selecione um aluno para alocar.')
      return
    }
    if (!rotaId) {
      toast.error('Selecione a rota de transporte.')
      return
    }

    setSaving(true)
    try {
      // Verificar se o aluno já está alocado nesta mesma rota
      const { data: duplicado } = await (supabase as any)
        .from('alunos_transporte')
        .select('id')
        .eq('aluno_id', alunoSelecionadoId)
        .eq('rota_id', rotaId)
        .limit(1)

      if (duplicado && duplicado.length > 0) {
        toast.error('Este aluno já está vinculado a esta mesma rota de transporte.')
        setSaving(false)
        return
      }

      const pontoEmbarqueFinal = pontoEmbarqueText.trim() || embarqueEndereco.trim() || null

      const { error } = await (supabase as any).from('alunos_transporte').insert({
        aluno_id: alunoSelecionadoId,
        rota_id: rotaId,
        ponto_embarque: pontoEmbarqueFinal,
        latitude: typeof embarqueLat === 'number' && !isNaN(embarqueLat) ? embarqueLat : null,
        longitude: typeof embarqueLng === 'number' && !isNaN(embarqueLng) ? embarqueLng : null,
      })

      if (error) throw error

      toast.success('Aluno alocado na rota com sucesso!')
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao alocar aluno:', err)
      toast.error(`Falha ao alocar aluno: ${err.message || 'Erro desconhecido.'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Alocar Aluno em Rota de Transporte"
      description="Selecione a escola, o estudante e ajuste o ponto exato de embarque no mapa para controle da lista de passageiros."
      maxWidth="sm:max-w-[720px]"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {/* Filtros em Grid: Escola e Rota */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Filtro por Escola */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-400" />
              Filtrar por Escola
            </Label>
            <Select value={escolaSelecionadaId} onValueChange={(v: string | null) => setEscolaSelecionadaId(v ?? 'ALL')}>
              <SelectTrigger className="bg-[#17171a] border-[#27272a] text-white text-xs h-10">
                <SelectValue placeholder={loadingEscolas ? 'Carregando escolas...' : 'Todas as Escolas'}>
                  {escolaSelecionadaId === 'ALL'
                    ? 'Todas as Escolas'
                    : escolasLista.find((e) => e.id === escolaSelecionadaId)?.nome || (loadingEscolas ? 'Carregando...' : escolaSelecionadaId)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#17171a] border-[#27272a] text-white max-h-56 overflow-y-auto">
                <SelectItem value="ALL" className="text-zinc-300 font-medium">
                  Todas as Escolas (Rede Municipal)
                </SelectItem>
                {escolasLista.map((escola) => (
                  <SelectItem key={escola.id} value={escola.id} className="text-white">
                    {escola.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seleção de Rota */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-sky-400" />
              Rota de Transporte *
            </Label>
            <Select value={rotaId} onValueChange={(v: string | null) => setRotaId(v ?? '')}>
              <SelectTrigger className="bg-[#17171a] border-[#27272a] text-white text-xs h-10">
                <SelectValue placeholder="Selecione a rota" />
              </SelectTrigger>
              <SelectContent className="bg-[#17171a] border-[#27272a] text-white">
                {rotas.map((r) => (
                  <SelectItem key={r.id} value={r.id} className="text-white">
                    {r.nome} ({r.turno})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Campo de Busca de Aluno + Dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Search className="w-4 h-4 text-sky-400" />
              Buscar Nome do Aluno
            </Label>
            <Input
              type="text"
              value={buscaAluno}
              onChange={(e) => setBuscaAluno(e.target.value)}
              placeholder="Digite o nome do aluno..."
              className="bg-[#17171a] border-[#27272a] text-white text-xs h-10"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-300">Selecione o Estudante *</Label>
            <Select
              value={alunoSelecionadoId}
              onValueChange={(v: string | null) => setAlunoSelecionadoId(v ?? '')}
            >
              <SelectTrigger className="bg-[#17171a] border-[#27272a] text-white text-xs h-10">
                <SelectValue placeholder={loadingAlunos ? 'Buscando alunos...' : 'Selecione um aluno'}>
                  {alunoSelecionadoId
                    ? alunosLista.find((a) => a.id === alunoSelecionadoId)?.nome || alunoSelecionadoId
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-[#17171a] border-[#27272a] text-white max-h-56 overflow-y-auto">
                {alunosLista.length === 0 ? (
                  <div className="p-3 text-xs text-zinc-400 text-center">Nenhum aluno encontrado</div>
                ) : (
                  alunosLista.map((aluno) => (
                    <SelectItem key={aluno.id} value={aluno.id} className="text-white">
                      {aluno.nome} {aluno.numero_matricula ? `(Matrícula: ${aluno.numero_matricula})` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Ponto de Embarque (Descrição Textual) */}
        <div className="space-y-2">
          <Label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-amber-400" />
            Descrição / Referência do Ponto de Embarque
          </Label>
          <Input
            type="text"
            value={pontoEmbarqueText}
            onChange={(e) => setPontoEmbarqueText(e.target.value)}
            placeholder="Ex: Ponto do Bar de Zé / Entroncamento da BR-101"
            className="bg-[#17171a] border-[#27272a] text-white text-xs h-9"
          />
        </div>

        {/* Seção do Mini-Mapa com Coordenadas da Ficha do Aluno e Mãozinha Arrastável */}
        <div className="space-y-2 pt-2 border-t border-[#26262a]">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              Geolocalização & Ajuste Fino de Embarque
            </Label>
            {pinoAjustado && (
              <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Ponto de embarque ajustado manualmente no mapa
              </span>
            )}
            {!pinoAjustado && alunoDados && (
              <span className="text-[11px] text-zinc-400">
                {alunoDados.latitude && alunoDados.longitude
                  ? 'Localização extraída da Ficha de Matrícula'
                  : 'Endereço da ficha carregado no mapa'}
              </span>
            )}
          </div>

          <MiniMapa
            initialLat={embarqueLat}
            initialLng={embarqueLng}
            onCoordinatesChange={handleCoordinatesChange}
            address={embarqueEndereco}
            onAddressChange={(val) => setEmbarqueEndereco(val)}
          />
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-end gap-2 pt-4 border-t border-[#26262a]">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving}
            className="bg-sky-600 hover:bg-sky-700 text-white font-semibold flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Vincular Aluno à Rota
          </Button>
        </div>
      </form>
    </StandardDialog>
  )
}
