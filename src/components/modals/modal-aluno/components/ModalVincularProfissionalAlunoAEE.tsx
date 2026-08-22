'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, User, Clock, CalendarDays, ArrowLeft, Check, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { getAvatarUrl } from '@/lib/photoHelper'

export interface ProfissionalAEEItem {
  id: string
  nome: string
  cargo: string | null
  registro_profissional: string | null
  foto_url: string | null
  foto_avatar_path: string | null
  foto_visualizacao_path: string | null
  foto_updated_at: string | null
}

export interface VinculoAEEConfig {
  id?: string // Se já persistido no banco
  tempId: string // Identificador único local para react key
  profissionalId: string
  profissionalNome: string
  profissionalCargo: string
  profissionalFoto?: string | null
  frequencia: 'SEMANAL' | 'QUINZENAL'
  diaSemana: number
  horarioInicio: string
  horarioFim: string
  isNovo?: boolean // Flag local para indicar inserção pendente
  isRemovido?: boolean // Flag local para indicar inativação pendente
}

interface ModalVincularProfissionalAlunoAEEProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  vinculosExistentes: VinculoAEEConfig[]
  onAdicionarVinculo: (novoVinculo: VinculoAEEConfig) => void
}

const DIAS_SEMANA = [
  { valor: 1, label: 'Segunda-feira' },
  { valor: 2, label: 'Terça-feira' },
  { valor: 3, label: 'Quarta-feira' },
  { valor: 4, label: 'Quinta-feira' },
  { valor: 5, label: 'Sexta-feira' },
  { valor: 6, label: 'Sábado' }
]

export function ModalVincularProfissionalAlunoAEE({
  open,
  onOpenChange,
  vinculosExistentes,
  onAdicionarVinculo
}: ModalVincularProfissionalAlunoAEEProps) {
  const [etapa, setEtapa] = useState<'selecionar' | 'configurar'>('selecionar')
  const [profissionais, setProfissionais] = useState<ProfissionalAEEItem[]>([])
  const [loading, setLoading] = useState(false)
  const [termoBusca, setTermoBusca] = useState('')

  // Profissional selecionado para configuração
  const [profSelecionado, setProfSelecionado] = useState<ProfissionalAEEItem | null>(null)

  // Estados da Escala / Atendimento
  const [frequencia, setFrequencia] = useState<'SEMANAL' | 'QUINZENAL'>('SEMANAL')
  const [diaSemana, setDiaSemana] = useState<number>(1)
  const [horarioInicio, setHorarioInicio] = useState('08:00')
  const [horarioFim, setHorarioFim] = useState('09:00')

  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Reset ao fechar/abrir
  useEffect(() => {
    if (open) {
      setEtapa('selecionar')
      setProfSelecionado(null)
      setTermoBusca('')
      setFrequencia('SEMANAL')
      setDiaSemana(1)
      setHorarioInicio('08:00')
      setHorarioFim('09:00')
      carregarProfissionaisAEE()
    }
  }, [open])

  const carregarProfissionaisAEE = async () => {
    setLoading(true)
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .select(`
          id, nome, cargo, registro_profissional,
          foto_url, foto_avatar_path, foto_visualizacao_path, foto_updated_at,
          is_profissional_aee, status
        `)
        .eq('is_profissional_aee', true)
        .eq('status', 'ativo')
        .is('deleted_at', null)
        .order('nome', { ascending: true })

      if (error) throw error

      if (isMounted.current && data) {
        setProfissionais(data as ProfissionalAEEItem[])
      }
    } catch (err: any) {
      console.error('Erro ao buscar catálogo de profissionais AEE:', err)
      toast.error('Erro ao listar profissionais AEE da rede.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  // Filtragem com busca textual sem acentos
  const profissionaisFiltrados = useMemo(() => {
    if (!termoBusca.trim()) return profissionais

    const normalizar = (str: string) =>
      (str || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

    const termoNorm = normalizar(termoBusca)

    return profissionais.filter((p) => {
      const nomeNorm = normalizar(p.nome)
      const cargoNorm = normalizar(p.cargo ?? '')
      const regNorm = normalizar(p.registro_profissional ?? '')
      return (
        nomeNorm.includes(termoNorm) ||
        cargoNorm.includes(termoNorm) ||
        regNorm.includes(termoNorm)
      )
    })
  }, [profissionais, termoBusca])

  const handleSelecionarProfissional = (prof: ProfissionalAEEItem) => {
    setProfSelecionado(prof)
    setEtapa('configurar')
  }

  const handleConfirmarVinculo = (e: React.FormEvent) => {
    e.preventDefault()
    if (!profSelecionado) return

    if (!horarioInicio.trim() || !horarioFim.trim()) {
      toast.error('Informe os horários de início e término do atendimento.')
      return
    }

    if (horarioInicio >= horarioFim) {
      toast.error('O Horário Final deve ser posterior ao Horário de Início.')
      return
    }

    // Criar o objeto de vínculo em memória
    const novoVinculo: VinculoAEEConfig = {
      tempId: `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      profissionalId: profSelecionado.id,
      profissionalNome: profSelecionado.nome,
      profissionalCargo: profSelecionado.cargo ?? 'Especialista AEE',
      profissionalFoto: getAvatarUrl(profSelecionado) || profSelecionado.foto_url,
      frequencia,
      diaSemana,
      horarioInicio,
      horarioFim,
      isNovo: true
    }

    onAdicionarVinculo(novoVinculo)
    toast.success(`Profissional ${profSelecionado.nome} adicionado ao atendimento!`)
    onOpenChange(false)
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={etapa === 'selecionar' ? 'Selecionar Profissional AEE' : 'Configurar Horário e Frequência do Atendimento'}
      maxWidth="sm:max-w-[560px]"
      footer={
        etapa === 'selecionar' ? (
          <div className="flex justify-end gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-[#1a1a1a] border-borderCustom text-white hover:bg-hoverCustom cursor-pointer"
            >
              Fechar
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEtapa('selecionar')}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="bg-[#1a1a1a] border-borderCustom text-white hover:bg-hoverCustom cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form="form-configurar-atendimento-aee"
                className="bg-highlight text-background hover:bg-highlight/90 font-bold px-5 gap-1.5 cursor-pointer border-none"
              >
                <Check className="w-4 h-4" />
                Adicionar Atendimento
              </Button>
            </div>
          </div>
        )
      }
    >
      {etapa === 'selecionar' ? (
        <div className="space-y-4 py-1">
          {/* Barra de Busca Instantânea */}
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome do profissional, cargo ou especialidade..."
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              className="w-full bg-[#181818] border border-borderCustom text-foreground rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-highlight transition-colors placeholder:text-muted-foreground/60"
              autoFocus
            />
          </div>

          {/* Listagem de Profissionais */}
          <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Carregando profissionais AEE...
              </div>
            ) : profissionaisFiltrados.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-zinc-300">Nenhum profissional AEE encontrado.</p>
                <p className="text-[11px]">
                  {termoBusca ? 'Verifique a ortografia do nome digitado.' : 'Nenhum funcionário com perfil AEE ativo no momento.'}
                </p>
              </div>
            ) : (
              profissionaisFiltrados.map((prof) => {
                const jaVinculado = vinculosExistentes.some(
                  (v) => v.profissionalId === prof.id && !v.isRemovido
                )
                const avatar = getAvatarUrl(prof) || prof.foto_url

                return (
                  <div
                    key={prof.id}
                    onClick={() => handleSelecionarProfissional(prof)}
                    className="flex items-center justify-between p-3 rounded-xl border border-borderCustom bg-[#141416] hover:bg-[#1f1f23] hover:border-highlight/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#1f1f23] border border-borderCustom overflow-hidden shrink-0 flex items-center justify-center">
                        {avatar ? (
                          <img src={avatar} alt={prof.nome} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate group-hover:text-highlight transition-colors">
                          {prof.nome}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {prof.cargo ?? 'Especialista AEE'}
                          {prof.registro_profissional && ` · Reg: ${prof.registro_profissional}`}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {jaVinculado && (
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">
                          Já vinculado
                        </span>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        className="bg-highlight/10 text-highlight hover:bg-highlight hover:text-background text-xs font-bold h-7 px-2.5 transition-colors border-none"
                      >
                        Selecionar
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      ) : (
        /* Etapa 2: Configuração de Horário e Frequência */
        <form id="form-configurar-atendimento-aee" onSubmit={handleConfirmarVinculo} className="space-y-4 py-1">
          {/* Card do Profissional Selecionado */}
          {profSelecionado && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-highlight/5 border border-highlight/20">
              <div className="w-11 h-11 rounded-full bg-[#1f1f23] border border-highlight/30 overflow-hidden shrink-0 flex items-center justify-center">
                {profSelecionado.foto_url ? (
                  <img src={profSelecionado.foto_url} alt={profSelecionado.nome} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-highlight" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-bold text-highlight tracking-wider">Profissional Selecionado</span>
                <p className="text-xs font-bold text-foreground truncate">{profSelecionado.nome}</p>
                <p className="text-[11px] text-zinc-400 truncate">{profSelecionado.cargo ?? 'Especialista AEE'}</p>
              </div>
            </div>
          )}

          {/* Configuração de Frequência */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">Frequência do Atendimento</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFrequencia('SEMANAL')}
                className={`p-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${
                  frequencia === 'SEMANAL'
                    ? 'border-highlight bg-highlight/10 text-highlight shadow-sm'
                    : 'border-borderCustom bg-[#141416] text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>Semanal</span>
                <span className="text-[10px] font-normal text-zinc-400">1x por semana no dia fixado</span>
              </button>

              <button
                type="button"
                onClick={() => setFrequencia('QUINZENAL')}
                className={`p-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-1 cursor-pointer ${
                  frequencia === 'QUINZENAL'
                    ? 'border-highlight bg-highlight/10 text-highlight shadow-sm'
                    : 'border-borderCustom bg-[#141416] text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>Quinzenal</span>
                <span className="text-[10px] font-normal text-zinc-400">A cada 15 dias</span>
              </button>
            </div>
          </div>

          {/* Dia da Semana */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-highlight" />
              Dia da Semana
            </Label>
            <Select value={String(diaSemana)} onValueChange={(v) => setDiaSemana(Number(v))}>
              <SelectTrigger className="w-full h-9 bg-[#181818] border-borderCustom text-foreground text-xs">
                <SelectValue placeholder="Selecione o dia" />
              </SelectTrigger>
              <SelectContent className="bg-[#181818] border-borderCustom text-foreground">
                {DIAS_SEMANA.map((dia) => (
                  <SelectItem key={dia.valor} value={String(dia.valor)}>
                    {dia.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Horários Início e Término */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-highlight" />
                Horário Início
              </Label>
              <Input
                type="time"
                value={horarioInicio}
                onChange={(e) => setHorarioInicio(e.target.value)}
                className="h-9 bg-[#181818] border-borderCustom text-foreground text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-highlight" />
                Horário Término
              </Label>
              <Input
                type="time"
                value={horarioFim}
                onChange={(e) => setHorarioFim(e.target.value)}
                className="h-9 bg-[#181818] border-borderCustom text-foreground text-xs"
                required
              />
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#181818] border border-borderCustom text-[11px] text-zinc-400">
            💡 Este atendimento será registrado na agenda oficial do EMAEE ao salvar o formulário do aluno.
          </div>
        </form>
      )}
    </StandardDialog>
  )
}
