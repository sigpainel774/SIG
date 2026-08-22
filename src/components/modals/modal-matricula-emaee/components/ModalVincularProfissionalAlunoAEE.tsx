'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, User, Clock, CalendarDays, ArrowLeft, Check, Sparkles } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabaseClient'
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
  escolaEmaeeId?: string
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
  onAdicionarVinculo,
  escolaEmaeeId
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
  }, [open, escolaEmaeeId])

  const carregarProfissionaisAEE = async () => {
    setLoading(true)
    const supabase = createBrowserClient()
    try {
      const query = supabase
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

      const { data, error } = await query

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

    if (!horarioInicio || !horarioFim) {
      toast.error('Informe os horários de início e término do atendimento.')
      return
    }

    if (horarioInicio >= horarioFim) {
      toast.error('O horário de término deve ser posterior ao horário de início.')
      return
    }

    // Verificar se já existe vínculo igual (mesmo profissional, mesmo dia e mesmo horário)
    const conflitoExistente = vinculosExistentes.some(
      (v) =>
        !v.isRemovido &&
        v.profissionalId === profSelecionado.id &&
        v.diaSemana === diaSemana &&
        v.horarioInicio === horarioInicio
    )

    if (conflitoExistente) {
      toast.error('Já existe um atendimento agendado para este profissional no mesmo dia e horário.')
      return
    }

    const avatarUrl = getAvatarUrl(profSelecionado) || profSelecionado.foto_url

    const novoVinculo: VinculoAEEConfig = {
      tempId: crypto.randomUUID(),
      profissionalId: profSelecionado.id,
      profissionalNome: profSelecionado.nome,
      profissionalCargo: profSelecionado.cargo ?? 'Especialista AEE',
      profissionalFoto: avatarUrl,
      frequencia,
      diaSemana,
      horarioInicio,
      horarioFim,
      isNovo: true
    }

    onAdicionarVinculo(novoVinculo)
    toast.success(`Profissional ${profSelecionado.nome} vinculado com sucesso!`)
    onOpenChange(false)
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        etapa === 'selecionar'
          ? 'Selecionar Especialista AEE — EMAEE'
          : `Definir Atendimento: ${profSelecionado?.nome ?? ''}`
      }
      description={
        etapa === 'selecionar'
          ? 'Escolha o profissional do corpo técnico do EMAEE para realizar o atendimento especializado do estudante.'
          : 'Configure a frequência, o dia da semana e a faixa de horários do atendimento.'
      }
      maxWidth="sm:max-w-xl"
    >
      <div className="space-y-4 py-1">
        {/* ========================================================================= */}
        {/* ETAPA 1: LISTA E BUSCA DE PROFISSIONAIS AEE                                */}
        {/* ========================================================================= */}
        {etapa === 'selecionar' && (
          <div className="space-y-3">
            {/* Campo de Busca */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Buscar por nome, cargo ou registro profissional..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="pl-9 bg-background dark:bg-[#141416] border-border text-foreground text-xs rounded-xl focus-visible:ring-1 focus-visible:ring-primary"
                autoFocus
              />
            </div>

            {/* Listagem com Scroll */}
            <div className="max-h-[380px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {loading ? (
                <div className="p-8 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground">Carregando catálogo de especialistas AEE...</p>
                </div>
              ) : profissionaisFiltrados.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-border bg-muted/30 dark:bg-[#181818]/60 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-muted dark:bg-[#1f1f23] border border-border flex items-center justify-center mx-auto text-muted-foreground">
                    <User className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">
                    {termoBusca ? 'Nenhum profissional encontrado para esta busca.' : 'Nenhum profissional AEE cadastrado.'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {termoBusca
                      ? 'Tente buscar por termos diferentes ou confira a ortografia.'
                      : 'Certifique-se de que os funcionários estejam marcados como "Profissional AEE" no cadastro de Servidores.'}
                  </p>
                </div>
              ) : (
                profissionaisFiltrados.map((prof) => {
                  const avatarUrl = getAvatarUrl(prof) || prof.foto_url
                  const jaVinculadoCount = vinculosExistentes.filter(
                    (v) => !v.isRemovido && v.profissionalId === prof.id
                  ).length

                  return (
                    <div
                      key={prof.id}
                      onClick={() => handleSelecionarProfissional(prof)}
                      className="p-3 rounded-xl border border-border bg-card dark:bg-[#141416] hover:bg-muted/60 dark:hover:bg-[#1c1c20] hover:border-primary/50 transition-all flex items-center justify-between gap-3 cursor-pointer group shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-muted dark:bg-[#1f1f23] border border-border overflow-hidden shrink-0 flex items-center justify-center">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt={prof.nome}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            <User className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                            {prof.nome}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <span className="truncate">{prof.cargo ?? 'Especialista AEE'}</span>
                            {prof.registro_profissional && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-[10px] bg-muted dark:bg-[#1f1f23] px-1.5 py-0.5 rounded border border-border">
                                  {prof.registro_profissional}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {jaVinculadoCount > 0 && (
                          <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold">
                            {jaVinculadoCount} {jaVinculadoCount === 1 ? 'horário' : 'horários'}
                          </span>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-primary font-bold hover:bg-primary/10 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-all cursor-pointer"
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
        )}

        {/* ========================================================================= */}
        {/* ETAPA 2: CONFIGURAÇÃO DE DIAS, HORÁRIOS E PERIODICIDADE                    */}
        {/* ========================================================================= */}
        {etapa === 'configurar' && profSelecionado && (
          <form onSubmit={handleConfirmarVinculo} className="space-y-4">
            {/* Header com Profissional Selecionado */}
            <div className="p-3 rounded-xl border border-border bg-muted/40 dark:bg-[#141416] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-muted dark:bg-[#1f1f23] border border-border overflow-hidden shrink-0 flex items-center justify-center">
                  {getAvatarUrl(profSelecionado) || profSelecionado.foto_url ? (
                    <img
                      src={(getAvatarUrl(profSelecionado) || profSelecionado.foto_url)!}
                      alt={profSelecionado.nome}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{profSelecionado.nome}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{profSelecionado.cargo ?? 'Especialista AEE'}</p>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEtapa('selecionar')}
                className="text-xs text-muted-foreground hover:text-foreground h-7 gap-1 rounded-lg cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Trocar
              </Button>
            </div>

            {/* Configurações de Atendimento */}
            <div className="space-y-3 p-4 rounded-xl border border-border bg-card dark:bg-[#141416]">
              {/* 1. Periodicidade */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Periodicidade do Atendimento
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFrequencia('SEMANAL')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      frequencia === 'SEMANAL'
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-background dark:bg-[#181818] text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    Semanal (Toda semana)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFrequencia('QUINZENAL')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      frequencia === 'QUINZENAL'
                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                        : 'border-border bg-background dark:bg-[#181818] text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    Quinzenal (A cada 15 dias)
                  </button>
                </div>
              </div>

              {/* 2. Dia da Semana */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-primary" />
                  Dia da Semana
                </Label>
                <Select
                  value={String(diaSemana)}
                  onValueChange={(val) => setDiaSemana(Number(val))}
                >
                  <SelectTrigger className="h-9 bg-background dark:bg-[#181818] border-border text-foreground text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card dark:bg-[#181818] border-border text-foreground text-xs">
                    {DIAS_SEMANA.map((dia) => (
                      <SelectItem key={dia.valor} value={String(dia.valor)}>
                        {dia.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 3. Horários (Início e Término) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Horário de Início
                  </Label>
                  <Input
                    type="time"
                    value={horarioInicio}
                    onChange={(e) => setHorarioInicio(e.target.value)}
                    required
                    className="h-9 bg-background dark:bg-[#181818] border-border text-foreground text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Horário de Término
                  </Label>
                  <Input
                    type="time"
                    value={horarioFim}
                    onChange={(e) => setHorarioFim(e.target.value)}
                    required
                    className="h-9 bg-background dark:bg-[#181818] border-border text-foreground text-xs rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEtapa('selecionar')}
                className="text-xs text-muted-foreground hover:text-foreground h-9 rounded-xl cursor-pointer"
              >
                Voltar
              </Button>

              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 px-4 rounded-xl gap-1.5 shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Confirmar Vínculo
              </Button>
            </div>
          </form>
        )}
      </div>
    </StandardDialog>
  )
}
