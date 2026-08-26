'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Paperclip,
  Pin,
  Send,
  X,
  Loader2,
  ArrowLeft,
  Trash2,
  Sparkles,
  Globe,
  School,
  Building,
  Search,
  CheckSquare,
  Square,
  Clock,
  BarChart3,
  Play,
  CheckCircle2,
  Smartphone,
  AlertCircle,
  Eye,
} from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { toast } from 'sonner'
import { sendPushToUser } from '@/lib/push/sendPushToUser'
import { getHojeBrasilia } from '@/lib/dateUtils'

const ModalTelemetriaComunicado = dynamic(
  () => import('@/components/modals/modal-telemetria-comunicado').then((mod) => mod.ModalTelemetriaComunicado),
  { ssr: false }
)

export default function MuralPage() {
  const { funcionario, acessos } = useAuthStore()
  const { selectedSecretaria, selectedEscola } = useSchoolStore()
  const searchParams = useSearchParams()

  const [selectedDate, setSelectedDate] = useState('')
  const [showComposer, setShowComposer] = useState(false)
  const [notices, setNotices] = useState<any[]>([])
  const [birthdays, setBirthdays] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const isNivel1OuSuperadmin = useMemo(() => {
    return Boolean(funcionario?.is_superadmin === true || acessos?.some((a) => a.nivel === 1 && a.ativo))
  }, [funcionario, acessos])

  const podePublicar = useMemo(() => {
    return isNivel1OuSuperadmin || acessos.some((a) => a.pode_mural === true)
  }, [isNivel1OuSuperadmin, acessos])

  // Lista de Escolas para mapeamento e seleção
  const [listaEscolas, setListaEscolas] = useState<{ id: string; nome: string; is_teste?: boolean }[]>([])
  const mapaEscolas = useMemo(() => {
    return new Map(listaEscolas.map((e) => [e.id, e.nome]))
  }, [listaEscolas])

  // Form states
  const [titulo, setTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [alvo, setAlvo] = useState('Selecione o Público Alvo')
  const [isPopup, setIsPopup] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Agendamento Prévio (Scheduled Broadcast)
  const [isAgendado, setIsAgendado] = useState(false)
  const [dataAgendamento, setDataAgendamento] = useState(() => getHojeBrasilia())
  const [horaAgendamento, setHoraAgendamento] = useState('07:00')

  // Filtro de Status para Gestores
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'publicados' | 'agendados'>('todos')

  // Modal de Telemetria
  const [telemetriaModal, setTelemetriaModal] = useState<{
    open: boolean
    comunicadoId: string | null
    comunicadoTitulo: string
  }>({
    open: false,
    comunicadoId: null,
    comunicadoTitulo: '',
  })

  // Seleção de Unidades (Nível 1 e Superadmin)
  const [todaARede, setTodaARede] = useState(true)
  const [unidadesSelecionadas, setUnidadesSelecionadas] = useState<string[]>([])
  const [buscaUnidade, setBuscaUnidade] = useState('')

  const [viewDate, setViewDate] = useState(() => new Date())
  const [loadingBirthdays, setLoadingBirthdays] = useState(false)
  const [birthdayModal, setBirthdayModal] = useState<{ day: number; open: boolean }>({ day: 0, open: false })

  const MONTH_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const birthdaysOfSelectedDay = useMemo(() => {
    return birthdays.filter((b) => b.day === birthdayModal.day)
  }, [birthdays, birthdayModal.day])

  const handleDayClick = (day: number, hasBirthday: boolean) => {
    if (!hasBirthday) return
    setBirthdayModal({ day, open: true })
  }

  const fetchBirthdaysForMonth = async (monthNum: number) => {
    setLoadingBirthdays(true)
    try {
      const supabase = createClient()
      const { data, error } = await (supabase as any).rpc('get_birthdays_of_month', { 
        month_num: monthNum, 
        p_secretaria_id: selectedSecretaria?.id || null,
        p_escola_id: selectedEscola?.id || null
      })
      if (error) {
        toast.error('Erro ao carregar aniversariantes: ' + error.message)
      } else if (data) {
        setBirthdays(data)
      }
    } catch (err: any) {
      console.error('Erro ao buscar aniversariantes:', err)
    } finally {
      setLoadingBirthdays(false)
    }
  }

  const handlePrevMonth = () => {
    setBirthdayModal({ day: 0, open: false })
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
    setViewDate(next)
    fetchBirthdaysForMonth(next.getMonth() + 1)
  }

  const handleNextMonth = () => {
    setBirthdayModal({ day: 0, open: false })
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
    setViewDate(next)
    fetchBirthdaysForMonth(next.getMonth() + 1)
  }

  const fetchNotices = async () => {
    const supabase = createClient()
    let query = supabase
      .from('comunicados')
      .select(
        'id, title, body, target, date, criado_por, anexo_url, anexo_nome, is_popup, escola_ids, status, scheduled_for, disparado_em, total_disparos, total_entregues, created_at, criado_por:funcionarios(nome)'
      )
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      
    if (selectedSecretaria?.id) {
      query = (query as any).eq('secretaria_id', selectedSecretaria.id)
    }

    if (selectedEscola?.id) {
      query = (query as any).or(`escola_ids.is.null,escola_ids.cs.{"${selectedEscola.id}"}`)
    }

    // Servidores comuns só enxergam comunicados já publicados
    if (!podePublicar) {
      query = (query as any).or('status.eq.publicado,status.is.null')
    }

    const { data, error } = await query

    if (error) {
      toast.error('Erro ao recarregar comunicados: ' + error.message)
    } else if (data) {
      setNotices(data)
    }
  }

  // Processa agendamentos vencidos de forma resiliente e busca dados iniciais
  useEffect(() => {
    let active = true

    // Disparo Lazy para processar agendados cujo horário já chegou
    fetch('/api/comunicados/process-scheduled', { method: 'POST' }).catch(() => {})

    // Rastreia leitura via push se query params estiverem presentes
    const comunicadoIdParam = searchParams.get('comunicado_id')
    if (comunicadoIdParam && funcionario?.auth_user_id) {
      const supabase = createClient()
      ;(supabase.from('comunicados_lidos') as any)
        .upsert(
          { user_id: funcionario.auth_user_id, comunicado_id: comunicadoIdParam },
          { onConflict: 'comunicado_id,user_id' }
        )
        .then(() => {})
    }

    const fetchData = async () => {
      const supabase = createClient()
      setLoading(true)

      try {
        const currentMonth = viewDate.getMonth() + 1 // 1-based for PG

        let query = supabase
          .from('comunicados')
          .select(
            'id, title, body, target, date, criado_por, anexo_url, anexo_nome, is_popup, escola_ids, status, scheduled_for, disparado_em, total_disparos, total_entregues, created_at, criado_por:funcionarios(nome)'
          )
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          
        if (selectedSecretaria?.id) {
          query = (query as any).eq('secretaria_id', selectedSecretaria.id)
        }

        if (selectedEscola?.id) {
          query = (query as any).or(`escola_ids.is.null,escola_ids.cs.{"${selectedEscola.id}"}`)
        }

        if (!podePublicar) {
          query = (query as any).or('status.eq.publicado,status.is.null')
        }

        let escolasQuery = supabase
          .from('escolas')
          .select('id, nome, is_teste')
          .eq('ativo', true)
          .is('deleted_at', null)
          .neq('is_teste', true)
          .not('nome', 'ilike', '%teste%')
          .order('nome')

        if (selectedSecretaria?.id) {
          escolasQuery = escolasQuery.eq('secretaria_id', selectedSecretaria.id)
        }

        const [comunicadosRes, birthdayRes, escolasRes] = await Promise.all([
          query,
          (supabase as any).rpc('get_birthdays_of_month', { 
            month_num: currentMonth, 
            p_secretaria_id: selectedSecretaria?.id || null,
            p_escola_id: selectedEscola?.id || null
          }),
          escolasQuery
        ])

        if (!active) return

        if (comunicadosRes.error) {
          toast.error('Erro ao carregar comunicados: ' + comunicadosRes.error.message)
        } else if (comunicadosRes.data) {
          setNotices(comunicadosRes.data)
        }

        if (birthdayRes.error) {
          toast.error('Erro ao carregar aniversariantes: ' + birthdayRes.error.message)
        } else if (birthdayRes.data) {
          setBirthdays(birthdayRes.data)
        }

        if (escolasRes.data) {
          setListaEscolas(escolasRes.data.filter((e: any) => !e.is_teste && !e.nome.toLowerCase().includes('teste')))
        }
      } catch (err: any) {
        console.error('Erro ao carregar mural:', err)
        toast.error('Ocorreu uma falha ao obter os dados do mural.')
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchData()

    return () => {
      active = false
    }
  }, [selectedSecretaria?.id, selectedEscola?.id, podePublicar, searchParams, funcionario?.auth_user_id])

  const filteredNotices = useMemo(() => {
    return notices.filter((notice) => {
      // Filtro por data
      if (selectedDate && notice.date !== selectedDate) return false

      // Filtro por status
      if (filtroStatus === 'publicados') {
        if (notice.status === 'agendado') return false
      } else if (filtroStatus === 'agendados') {
        if (notice.status !== 'agendado') return false
      }

      return true
    })
  }, [selectedDate, notices, filtroStatus])

  const totalAgendados = useMemo(() => {
    return notices.filter((n) => n.status === 'agendado').length
  }, [notices])

  const calendarData = useMemo(() => {
    const currentYear = viewDate.getFullYear()
    const currentMonth = viewDate.getMonth() // 0-indexed

    const firstDayDate = new Date(currentYear, currentMonth, 1)
    const firstDayOfWeek = firstDayDate.getDay() // 0 = Sunday, 1 = Monday, etc.

    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate()

    const blanks = Array.from({ length: firstDayOfWeek })
    const days = Array.from({ length: totalDays }, (_, i) => i + 1)

    return { blanks, days }
  }, [viewDate])

  const handlePublicarComunicado = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!podePublicar) {
      toast.error('Você não tem permissão para publicar comunicados.')
      return
    }
    if (!titulo.trim()) {
      toast.error('Informe o título do comunicado.')
      return
    }
    if (!mensagem.trim()) {
      toast.error('Escreva o conteúdo do comunicado.')
      return
    }

    // Validação de unidades
    let escolaIdsPayload: string[] | null = null

    if (isNivel1OuSuperadmin) {
      if (todaARede) {
        escolaIdsPayload = null
      } else {
        if (unidadesSelecionadas.length === 0) {
          toast.error('Selecione ao menos uma unidade escolar de destino ou marque "Toda a Rede".')
          return
        }
        escolaIdsPayload = unidadesSelecionadas
      }
    } else {
      if (!selectedEscola?.id) {
        toast.error('Nenhuma unidade escolar ativa selecionada para publicação.')
        return
      }
      escolaIdsPayload = [selectedEscola.id]
    }

    // Validação de Agendamento
    let scheduledForIso: string | null = null
    let statusPayload = 'publicado'
    let dataReferencia = getHojeBrasilia()

    if (isAgendado) {
      if (!dataAgendamento || !horaAgendamento) {
        toast.error('Informe a data e o horário desejados para o agendamento.')
        return
      }

      // Constrói timestamp no fuso de Brasília (-03:00)
      const scheduledTimestamp = new Date(`${dataAgendamento}T${horaAgendamento}:00-03:00`).getTime()
      if (isNaN(scheduledTimestamp)) {
        toast.error('Data ou horário de agendamento inválidos.')
        return
      }

      if (scheduledTimestamp <= Date.now()) {
        toast.error('O horário de agendamento deve ser futuro.')
        return
      }

      scheduledForIso = new Date(scheduledTimestamp).toISOString()
      statusPayload = 'agendado'
      dataReferencia = dataAgendamento
    }

    setSalvando(true)
    const supabase = createClient()

    let anexoUrl = null
    let anexoNome = null

    if (arquivo) {
      try {
        const fileExt = arquivo.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
        const filePath = `comunicados/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('anexos')
          .upload(filePath, arquivo)

        if (uploadError) {
          toast.error('Erro ao fazer upload do arquivo: ' + uploadError.message)
          setSalvando(false)
          return
        }

        const { data: { publicUrl } } = supabase.storage
          .from('anexos')
          .getPublicUrl(filePath)

        anexoUrl = publicUrl
        anexoNome = arquivo.name
      } catch (err: any) {
        toast.error('Falha ao processar anexo: ' + err.message)
        setSalvando(false)
        return
      }
    }

    const targetPayload = alvo === 'Selecione o Público Alvo' ? 'Geral / Toda a Rede' : alvo

    const { data: insertResult, error } = await (supabase.from as any)('comunicados').insert({
      title: titulo.trim(),
      body: mensagem.trim(),
      date: dataReferencia,
      target: targetPayload,
      is_popup: isPopup,
      escola_ids: escolaIdsPayload,
      status: statusPayload,
      scheduled_for: scheduledForIso,
      disparado_em: statusPayload === 'publicado' ? new Date().toISOString() : null,
      criado_por: funcionario?.id ?? null,
      secretaria_id: selectedSecretaria?.id ?? null,
      anexo_url: anexoUrl,
      anexo_nome: anexoNome
    }).select('id').maybeSingle()

    if (error) {
      toast.error('Erro ao salvar comunicado: ' + error.message)
    } else {
      if (isAgendado) {
        toast.success(
          `Comunicado agendado com sucesso para ${new Date(`${dataAgendamento}T${horaAgendamento}:00`).toLocaleDateString('pt-BR')} às ${horaAgendamento}!`
        )
      } else {
        toast.success('Comunicado publicado com sucesso!')

        // Disparo de Notificação Push Nativa Imediata com telemetria vinculada
        const isBroadcast = escolaIdsPayload === null || escolaIdsPayload.length === 0
        sendPushToUser({
          isBroadcast,
          escolaIds: escolaIdsPayload,
          title: `📢 Mural: ${titulo.trim()}`,
          message: mensagem.trim(),
          link: `/mural?comunicado_id=${insertResult?.id ?? ''}`,
          tag: 'comunicado-mural',
          comunicadoId: insertResult?.id ?? null,
        }).catch((pushErr) => {
          console.warn('Falha silenciosa ao disparar push do mural:', pushErr)
        })
      }

      setTitulo('')
      setMensagem('')
      setAlvo('Selecione o Público Alvo')
      setIsPopup(false)
      setIsAgendado(false)
      setDataAgendamento(getHojeBrasilia())
      setHoraAgendamento('07:00')
      setTodaARede(true)
      setUnidadesSelecionadas([])
      setBuscaUnidade('')
      setArquivo(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      setShowComposer(false)
      fetchNotices()
    }
    setSalvando(false)
  }

  const handleDispararAgora = async (notice: any) => {
    if (!confirm(`Deseja transmitir o comunicado "${notice.title}" agora para toda a rede/unidades?`)) return

    try {
      const supabase = createClient()
      const { error } = await (supabase.from('comunicados') as any)
        .update({
          status: 'publicado',
          disparado_em: new Date().toISOString(),
        })
        .eq('id', notice.id)

      if (error) {
        toast.error('Erro ao disparar comunicado: ' + error.message)
        return
      }

      toast.success('Comunicado publicado com sucesso!')

      const isBroadcast = !notice.escola_ids || notice.escola_ids.length === 0
      sendPushToUser({
        isBroadcast,
        escolaIds: notice.escola_ids ?? null,
        title: `📢 Mural: ${notice.title}`,
        message: notice.body,
        link: `/mural?comunicado_id=${notice.id}`,
        tag: 'comunicado-mural',
        comunicadoId: notice.id,
      }).catch(() => {})

      fetchNotices()
    } catch (err: any) {
      toast.error('Falha ao acionar disparo imediato.')
    }
  }

  const handleExcluirComunicado = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este comunicado?')) return

    try {
      const supabase = createClient()
      const { error } = await supabase.from('comunicados').delete().eq('id', id)

      if (error) {
        toast.error('Erro ao excluir comunicado: ' + error.message)
      } else {
        toast.success('Comunicado excluído com sucesso!')
        fetchNotices()
      }
    } catch (err: any) {
      toast.error('Falha ao excluir comunicado.')
      console.error('Erro ao excluir comunicado:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header da Página */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/home">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Mural</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Comunicados, avisos, agendamentos e aniversariantes da rede.
          </p>
        </div>
        {podePublicar && (
          <Button
            onClick={() => setShowComposer((value) => !value)}
            className="bg-highlight text-background hover:bg-highlight/90 font-semibold cursor-pointer"
          >
            <Pin className="mr-2 h-4 w-4" />
            {showComposer ? 'Cancelar' : 'Novo Comunicado'}
          </Button>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {/* Formulário de Criação / Agendamento */}
          {showComposer && podePublicar && (
            <Card className="border-borderCustom bg-card p-5 shadow-lg">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Criar Novo Comunicado</h2>
              <form onSubmit={handlePublicarComunicado} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Título</label>
                  <Input
                    type="text"
                    placeholder="Título do comunicado (ex: Reunião Geral de Professores)"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    className="bg-input border-borderCustom text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                {/* Programação de Transmissão (Imediato vs Agendado) */}
                <div className="space-y-2 p-3.5 bg-input/40 border border-borderCustom rounded-xl">
                  <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-highlight" />
                      Programação da Transmissão
                    </span>
                    <span className="text-[11px] font-medium text-highlight">
                      {isAgendado ? 'Transmissão Agendada' : 'Disparo Imediato'}
                    </span>
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAgendado(false)}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                        !isAgendado
                          ? 'bg-highlight/15 border-highlight text-highlight shadow-sm ring-1 ring-highlight/30'
                          : 'bg-input/60 border-borderCustom text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Publicar Agora</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAgendado(true)}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                        isAgendado
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-sm ring-1 ring-amber-500/30'
                          : 'bg-input/60 border-borderCustom text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Agendar Transmissão</span>
                    </button>
                  </div>

                  {isAgendado && (
                    <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2.5 animate-in fade-in duration-200">
                      <span className="text-xs text-amber-300 font-bold flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        Defina a data e o horário (Fuso de Brasília):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[11px] text-muted-foreground block mb-1">Data da Transmissão</label>
                          <Input
                            type="date"
                            value={dataAgendamento}
                            onChange={(e) => setDataAgendamento(e.target.value)}
                            className="h-9 text-xs bg-input border-borderCustom text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-muted-foreground block mb-1">Horário de Disparo</label>
                          <Input
                            type="time"
                            value={horaAgendamento}
                            onChange={(e) => setHoraAgendamento(e.target.value)}
                            className="h-9 text-xs bg-input border-borderCustom text-foreground"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Destino das Unidades */}
                {isNivel1OuSuperadmin ? (
                  <div className="space-y-2.5 p-3.5 bg-input/40 border border-borderCustom rounded-xl">
                    <label className="text-xs font-semibold text-muted-foreground uppercase flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-highlight" />
                        Unidades Escolares de Destino
                      </span>
                      <span className="text-[11px] font-medium text-highlight">
                        {todaARede ? 'Toda a rede municipal' : `${unidadesSelecionadas.length} unidade(s) selecionada(s)`}
                      </span>
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTodaARede(true)
                          setUnidadesSelecionadas([])
                        }}
                        className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          todaARede
                            ? 'bg-highlight/15 border-highlight text-highlight shadow-sm ring-1 ring-highlight/30'
                            : 'bg-input/60 border-borderCustom text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
                        }`}
                      >
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        <span>Toda a Rede</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTodaARede(false)}
                        className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                          !todaARede
                            ? 'bg-highlight/15 border-highlight text-highlight shadow-sm ring-1 ring-highlight/30'
                            : 'bg-input/60 border-borderCustom text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
                        }`}
                      >
                        <School className="w-3.5 h-3.5 shrink-0" />
                        <span>Selecionar Unidades</span>
                      </button>
                    </div>

                    {!todaARede && (
                      <div className="mt-3 space-y-2 pt-2 border-t border-borderCustom/60">
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              type="text"
                              placeholder="Buscar unidade escolar..."
                              value={buscaUnidade}
                              onChange={(e) => setBuscaUnidade(e.target.value)}
                              className="h-8 pl-8 text-xs bg-input border-borderCustom text-foreground placeholder:text-muted-foreground"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (unidadesSelecionadas.length === listaEscolas.length) {
                                setUnidadesSelecionadas([])
                              } else {
                                setUnidadesSelecionadas(listaEscolas.map((e) => e.id))
                              }
                            }}
                            className="h-8 text-xs border-borderCustom bg-surface-2 hover:bg-hoverCustom text-foreground shrink-0 cursor-pointer font-medium"
                          >
                            {unidadesSelecionadas.length === listaEscolas.length ? 'Desmarcar Todas' : 'Marcar Todas'}
                          </Button>
                        </div>

                        <div className="max-h-48 overflow-y-auto space-y-1 p-2 bg-input/40 border border-borderCustom rounded-lg pr-1">
                          {listaEscolas
                            .filter((esc) => esc.nome.toLowerCase().includes(buscaUnidade.toLowerCase()))
                            .map((esc) => {
                              const isSelected = unidadesSelecionadas.includes(esc.id)
                              return (
                                <button
                                  type="button"
                                  key={esc.id}
                                  onClick={() => {
                                    if (isSelected) {
                                      setUnidadesSelecionadas((prev) => prev.filter((id) => id !== esc.id))
                                    } else {
                                      setUnidadesSelecionadas((prev) => [...prev, esc.id])
                                    }
                                  }}
                                  className={`w-full flex items-center justify-between p-2 rounded-md text-xs transition-colors text-left cursor-pointer ${
                                    isSelected
                                      ? 'bg-highlight/10 text-foreground border border-highlight/30 font-medium'
                                      : 'hover:bg-hoverCustom text-muted-foreground hover:text-foreground border border-transparent'
                                  }`}
                                >
                                  <span className="truncate pr-2">{esc.nome}</span>
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-highlight shrink-0" />
                                  ) : (
                                    <Square className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                                  )}
                                </button>
                              )
                            })}
                          {listaEscolas.filter((esc) => esc.nome.toLowerCase().includes(buscaUnidade.toLowerCase())).length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2">Nenhuma escola encontrada.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 bg-input/40 border border-borderCustom rounded-xl flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-highlight/10 text-highlight shrink-0">
                      <School className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Mural de Destino
                      </span>
                      <span className="text-sm font-semibold text-foreground truncate block">
                        {selectedEscola?.nome ?? 'Sua Unidade Escolar'}
                      </span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Público Alvo</label>
                  <select
                    value={alvo}
                    onChange={(e) => setAlvo(e.target.value)}
                    className="w-full bg-input border border-borderCustom text-foreground h-10 rounded-md px-3 text-sm focus:outline-none focus:ring-1 focus:ring-highlight cursor-pointer"
                  >
                    <option value="Selecione o Público Alvo">Selecione o Público Alvo</option>
                    <option value="Professores">Professores</option>
                    <option value="Alunos e Pais">Alunos e Pais</option>
                    <option value="Equipe Administrativa">Equipe Administrativa</option>
                    <option value="Equipe de Cozinha / Limpeza">Equipe de Cozinha / Limpeza</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Modalidade de Notificação</label>
                  <button
                    type="button"
                    onClick={() => setIsPopup((prev) => !prev)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all duration-300 cursor-pointer ${
                      isPopup
                        ? 'border-amber-500/70 bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/50'
                        : 'border-borderCustom bg-input/60 text-muted-foreground hover:bg-hoverCustom hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg transition-colors ${isPopup ? 'bg-amber-500/20 text-amber-400' : 'bg-surface-2 text-muted-foreground'}`}>
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm tracking-wide">Exibir como Pop-up</span>
                          {isPopup && (
                            <span className="text-[10px] uppercase font-extrabold bg-amber-500 text-black px-2 py-0.5 rounded-full tracking-wider animate-pulse">
                              Efeito Ativo
                            </span>
                          )}
                        </div>
                        <p className="text-xs opacity-80 mt-0.5">
                          {isPopup
                            ? 'O comunicado aparecerá no centro da tela dos funcionários ao fazer login.'
                            : 'O comunicado será exibido normalmente no Mural e no sino de notificações.'}
                        </p>
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                      isPopup ? 'border-amber-400 bg-amber-500 text-black font-bold text-xs shadow-sm' : 'border-borderCustom bg-surface-3'
                    }`}>
                      {isPopup ? '✓' : ''}
                    </div>
                  </button>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase mb-1 block">Conteúdo</label>
                  <textarea
                    rows={4}
                    value={mensagem}
                    onChange={(e) => setMensagem(e.target.value)}
                    placeholder="Escreva a mensagem do comunicado aqui..."
                    className="w-full resize-none rounded-lg border border-borderCustom bg-input p-3 text-sm text-foregroundCustom outline-none focus:border-highlight placeholder:text-muted-foreground"
                  />
                </div>

                <div className="flex flex-col gap-3 pt-2 border-t border-borderCustom">
                  {/* Input de arquivo invisível */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0]
                        if (file.size > 10 * 1024 * 1024) {
                          toast.error('O arquivo deve ter no máximo 10MB.')
                          return
                        }
                        setArquivo(file)
                        toast.success(`Arquivo "${file.name}" selecionado.`)
                      }
                    }}
                    className="hidden"
                  />

                  {arquivo && (
                    <div className="flex items-center gap-2 text-xs bg-highlight/10 text-highlight px-3 py-1.5 rounded-lg border border-highlight/20 max-w-xs truncate">
                      <Paperclip className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{arquivo.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setArquivo(null)
                          if (fileInputRef.current) {
                            fileInputRef.current.value = ''
                          }
                        }}
                        className="ml-auto p-0.5 rounded-full hover:bg-highlight/20 text-highlight cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()} 
                      className="border-borderCustom bg-hoverCustom text-foregroundCustom cursor-pointer"
                    >
                      <Paperclip className="mr-2 h-4 w-4" />
                      Anexar Arquivo
                    </Button>
                    <Button type="submit" disabled={salvando} className="bg-highlight text-background hover:bg-highlight/90 font-bold cursor-pointer disabled:opacity-60">
                      {salvando ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {isAgendado ? 'Agendando...' : 'Publicando...'}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          {isAgendado ? <Clock className="mr-1 h-4 w-4" /> : <Send className="mr-1 h-4 w-4" />}
                          {isAgendado ? 'Agendar Comunicado' : 'Publicar Comunicado'}
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Card>
          )}

          {/* Filtros de Status (Apenas para Gestores) */}
          {podePublicar && totalAgendados > 0 && (
            <div className="flex items-center gap-2 p-1 bg-surface-2 border border-borderCustom rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setFiltroStatus('todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filtroStatus === 'todos'
                    ? 'bg-highlight/20 text-highlight border border-highlight/30'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Todos ({notices.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatus('publicados')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filtroStatus === 'publicados'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Publicados ({notices.filter((n) => n.status !== 'agendado').length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroStatus('agendados')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filtroStatus === 'agendados'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'text-amber-400/80 hover:text-amber-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Agendados ({totalAgendados})</span>
              </button>
            </div>
          )}

          {/* Feed de Comunicados */}
          {loading ? (
            <Card className="border-borderCustom bg-card p-8 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-highlight" />
              <span>Carregando comunicados do banco de dados...</span>
            </Card>
          ) : filteredNotices.length === 0 ? (
            <Card className="border-borderCustom bg-card p-8 text-center text-muted-foreground">
              Nenhum comunicado encontrado {selectedDate ? `para a data ${new Date(`${selectedDate}T00:00:00`).toLocaleDateString('pt-BR')}` : 'registrado no sistema'}.
            </Card>
          ) : (
            filteredNotices.map((notice) => {
              const isNoticeAgendado = notice.status === 'agendado'

              return (
                <Card
                  key={notice.id}
                  className={`border-borderCustom bg-card p-5 transition-all ${
                    isNoticeAgendado
                      ? 'border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-card to-card'
                      : 'hover:border-highlight/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 shrink-0 ${isNoticeAgendado ? 'bg-amber-500/15 text-amber-400' : 'bg-highlight/10 text-highlight'}`}>
                      {isNoticeAgendado ? <Clock className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-semibold text-foreground text-base">{notice.title}</h2>
                          {isNoticeAgendado ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/15 px-2.5 py-0.5 rounded-full border border-amber-500/30 animate-pulse">
                              <Clock className="w-3 h-3" />
                              Agendado para {notice.scheduled_for ? new Date(notice.scheduled_for).toLocaleString('pt-BR') : 'Horário futuro'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Publicado
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-borderCustom bg-input px-2.5 py-1 text-xs text-muted-foreground">
                            {notice.date ? new Date(`${notice.date}T00:00:00`).toLocaleDateString('pt-BR') : 'Sem data'}
                          </span>
                          {podePublicar && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleExcluirComunicado(notice.id)}
                              className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 cursor-pointer"
                              title="Excluir comunicado"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <p className="mt-2 text-sm leading-6 text-muted-foreground whitespace-pre-line">{notice.body}</p>
                      
                      {notice.anexo_url && (
                        <div className="mt-3">
                          <a
                            href={notice.anexo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-xs font-medium text-highlight hover:underline bg-highlight/5 border border-highlight/10 px-3 py-1.5 rounded-lg"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                            <span>Anexo: {notice.anexo_nome || 'Visualizar arquivo'}</span>
                          </a>
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {notice.is_popup && (
                          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            Pop-up Prioritário
                          </span>
                        )}
                        
                        {/* Destino das Unidades */}
                        {(!notice.escola_ids || notice.escola_ids.length === 0) ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/30">
                            <Globe className="w-3 h-3 text-sky-400" />
                            Toda a Rede
                          </span>
                        ) : notice.escola_ids.length === 1 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                            <School className="w-3 h-3 text-emerald-400" />
                            {mapaEscolas.get(notice.escola_ids[0]) || 'Unidade Escolar'}
                          </span>
                        ) : (
                          <span 
                            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30"
                            title={notice.escola_ids.map((id: string) => mapaEscolas.get(id) || id).join(', ')}
                          >
                            <Building className="w-3 h-3 text-amber-300" />
                            {notice.escola_ids.length} Unidades
                          </span>
                        )}

                        {notice.target && (
                          <span className="text-xs font-semibold text-highlight bg-highlight/10 px-2.5 py-0.5 rounded-full border border-highlight/20">
                            {notice.target}
                          </span>
                        )}
                        {notice.criado_por?.nome && (
                          <span className="text-xs text-muted-foreground">
                            Publicado por: {notice.criado_por.nome}
                          </span>
                        )}
                      </div>

                      {/* Barra de Telemetria e Ações para Gestores */}
                      {podePublicar && !isNoticeAgendado && (
                        <div className="mt-3.5 pt-3 border-t border-borderCustom/60 flex flex-wrap items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <span className="inline-flex items-center gap-1 bg-input/60 px-2.5 py-1 rounded-lg border border-borderCustom text-xs">
                              <Send className="w-3 h-3 text-highlight shrink-0" />
                              <span>Disparos:</span>
                              <strong className="text-foreground font-bold">{notice.total_disparos ?? 0}</strong>
                            </span>
                            <span className="inline-flex items-center gap-1 bg-input/60 px-2.5 py-1 rounded-lg border border-borderCustom text-xs">
                              <Smartphone className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>Entrega Push:</span>
                              <strong className="text-emerald-400 font-bold">
                                {notice.total_disparos > 0
                                  ? `${Math.round(((notice.total_entregues ?? 0) / notice.total_disparos) * 100)}%`
                                  : '100%'}
                              </strong>
                            </span>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setTelemetriaModal({
                                open: true,
                                comunicadoId: notice.id,
                                comunicadoTitulo: notice.title,
                              })
                            }
                            className="h-8 text-xs border-highlight/30 bg-highlight/5 text-highlight hover:bg-highlight/15 cursor-pointer gap-1.5 font-semibold"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>Telemetria & Leituras</span>
                          </Button>
                        </div>
                      )}

                      {podePublicar && isNoticeAgendado && (
                        <div className="mt-3.5 pt-3 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-2.5">
                          <span className="text-xs text-amber-300/90 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Aguardando momento de transmissão automática
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleDispararAgora(notice)}
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer gap-1.5 shadow-sm"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Disparar Agora</span>
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })
          )}
        </div>

        {/* Barra Lateral com Filtro por Data e Aniversariantes */}
        <aside className="space-y-4">
          <Card className="border-borderCustom bg-card p-5">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Filtrar por Data</h2>
            <div className="flex gap-2">
              <Input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="bg-input border-borderCustom text-foreground" />
              {selectedDate && (
                <Button variant="outline" size="icon" onClick={() => setSelectedDate('')} className="border-borderCustom bg-hoverCustom text-foreground shrink-0" title="Limpar filtro">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>

          <Card className="border-borderCustom bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-highlight" />
                  Aniversariantes
                </h2>
                <p className="text-xs font-medium text-highlight mt-0.5">
                  {MONTH_NAMES[viewDate.getMonth()]} / {viewDate.getFullYear()}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrevMonth}
                  className="h-8 w-8 border-borderCustom bg-input text-foreground hover:bg-hoverCustom cursor-pointer"
                  title="Mês anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNextMonth}
                  className="h-8 w-8 border-borderCustom bg-input text-foreground hover:bg-hoverCustom cursor-pointer"
                  title="Próximo mês"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {loadingBirthdays ? (
              <div className="flex items-center justify-center p-6 text-xs text-muted-foreground gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-highlight" />
                <span>Carregando aniversariantes...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
                  <span>D</span>
                  <span>S</span>
                  <span>T</span>
                  <span>Q</span>
                  <span>Q</span>
                  <span>S</span>
                  <span>S</span>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {calendarData.blanks.map((_, index) => (
                    <div key={`blank-${index}`} className="p-2" />
                  ))}
                  {calendarData.days.map((day) => {
                    const hasBirthday = birthdays.some((b) => b.day === day)
                    const isSelected = birthdayModal.day === day && birthdayModal.open

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleDayClick(day, hasBirthday)}
                        disabled={!hasBirthday}
                        className={`relative p-2 rounded-lg font-medium transition-all ${
                          isSelected
                            ? 'bg-highlight text-background font-bold shadow-md'
                            : hasBirthday
                            ? 'bg-highlight/15 text-highlight hover:bg-highlight/25 font-bold cursor-pointer ring-1 ring-highlight/30'
                            : 'text-muted-foreground/60 hover:bg-hoverCustom/40 cursor-default'
                        }`}
                      >
                        {day}
                        {hasBirthday && (
                          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-highlight" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </Card>
        </aside>
      </div>

      {/* Modal de Telemetria & CTR Nominal */}
      <ModalTelemetriaComunicado
        open={telemetriaModal.open}
        onOpenChange={(open) => setTelemetriaModal((prev) => ({ ...prev, open }))}
        comunicadoId={telemetriaModal.comunicadoId}
        comunicadoTitulo={telemetriaModal.comunicadoTitulo}
      />
    </div>
  )
}
