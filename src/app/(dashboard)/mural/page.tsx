'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { Bell, CalendarDays, ChevronLeft, ChevronRight, Paperclip, Pin, Send, X, Loader2, ArrowLeft, Trash2, Sparkles, Cake, Globe, School, Building, Search, CheckSquare, Square } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { toast } from 'sonner'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { CachedImage } from '@/components/ui/cached-image'
import { getAvatarUrl } from '@/lib/photoHelper'

import { sendPushToUser } from '@/lib/push/sendPushToUser'
import { getHojeBrasilia } from '@/lib/dateUtils'

export default function MuralPage() {
  const { funcionario, acessos } = useAuthStore()
  const { selectedSecretaria, selectedEscola } = useSchoolStore()
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
  const [listaEscolas, setListaEscolas] = useState<{ id: string; nome: string }[]>([])
  const mapaEscolas = useMemo(() => {
    return new Map(listaEscolas.map((e) => [e.id, e.nome]))
  }, [listaEscolas])

  // Form states
  const [titulo, setTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [alvo, setAlvo] = useState('Geral / Toda a Rede')
  const [isPopup, setIsPopup] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    let query = supabase.from('comunicados')
      .select('id, title, body, target, date, criado_por, anexo_url, anexo_nome, is_popup, escola_ids, created_at, criado_por:funcionarios(nome)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      
    if (selectedSecretaria?.id) {
      query = (query as any).eq('secretaria_id', selectedSecretaria.id)
    }

    if (selectedEscola?.id) {
      query = (query as any).or(`escola_ids.is.null,escola_ids.cs.{"${selectedEscola.id}"}`)
    }

    const { data, error } = await query

    if (error) {
      toast.error('Erro ao recarregar comunicados: ' + error.message)
    } else if (data) {
      setNotices(data)
    }
  }

  useEffect(() => {
    let active = true
    const fetchData = async () => {
      const supabase = createClient()
      setLoading(true)

      try {
        const currentMonth = viewDate.getMonth() + 1 // 1-based for PG

        let query = supabase.from('comunicados')
          .select('id, title, body, target, date, criado_por, anexo_url, anexo_nome, is_popup, escola_ids, created_at, criado_por:funcionarios(nome)')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
          
        if (selectedSecretaria?.id) {
          query = (query as any).eq('secretaria_id', selectedSecretaria.id)
        }

        if (selectedEscola?.id) {
          query = (query as any).or(`escola_ids.is.null,escola_ids.cs.{"${selectedEscola.id}"}`)
        }

        let escolasQuery = supabase
          .from('escolas')
          .select('id, nome')
          .eq('ativo', true)
          .is('deleted_at', null)
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
          setListaEscolas(escolasRes.data)
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
  }, [selectedSecretaria?.id, selectedEscola?.id, podePublicar])

  const filteredNotices = useMemo(() => {
    if (!selectedDate) return notices
    return notices.filter((notice) => notice.date === selectedDate)
  }, [selectedDate, notices])

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

    setSalvando(true)
    const supabase = createClient()
    const hojeStr = getHojeBrasilia()

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

    const { error } = await (supabase.from as any)('comunicados').insert({
      title: titulo.trim(),
      body: mensagem.trim(),
      date: hojeStr,
      target: alvo,
      is_popup: isPopup,
      escola_ids: escolaIdsPayload,
      criado_por: funcionario?.id ?? null,
      secretaria_id: selectedSecretaria?.id ?? null,
      anexo_url: anexoUrl,
      anexo_nome: anexoNome
    })

    if (error) {
      toast.error('Erro ao publicar comunicado: ' + error.message)
    } else {
      toast.success('Comunicado publicado com sucesso!')

      // Disparo de Notificação Push Nativa
      const isBroadcast = escolaIdsPayload === null || escolaIdsPayload.length === 0
      sendPushToUser({
        isBroadcast: isBroadcast,
        title: `📢 Mural: ${titulo.trim()}`,
        message: mensagem.trim(),
        link: '/mural',
        tag: 'comunicado-mural',
      }).catch((pushErr) => {
        console.warn('Falha silenciosa ao disparar push do mural:', pushErr)
      })

      setTitulo('')
      setMensagem('')
      setAlvo('Geral / Toda a Rede')
      setIsPopup(false)
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
          <p className="mt-1 text-sm text-muted-foreground">Comunicados, avisos e aniversariantes da rede.</p>
        </div>
        {podePublicar && (
          <Button onClick={() => setShowComposer((value) => !value)} className="bg-highlight text-background hover:bg-highlight/90 font-semibold cursor-pointer">
            <Pin className="mr-2 h-4 w-4" />
            {showComposer ? 'Cancelar' : 'Novo Comunicado'}
          </Button>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
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
                            ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 shadow-sm'
                            : 'bg-input/60 border-borderCustom text-muted-foreground hover:text-foreground'
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
                            ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-sm'
                            : 'bg-input/60 border-borderCustom text-muted-foreground hover:text-foreground'
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
                              className="h-8 pl-8 text-xs bg-input border-borderCustom text-foreground"
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
                            className="h-8 text-xs border-borderCustom bg-surface-2 hover:bg-hoverCustom shrink-0 cursor-pointer"
                          >
                            {unidadesSelecionadas.length === listaEscolas.length ? 'Desmarcar Todas' : 'Marcar Todas'}
                          </Button>
                        </div>

                        <div className="max-h-40 overflow-y-auto space-y-1 p-2 bg-surface-2/60 border border-borderCustom rounded-lg pr-1">
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
                                      ? 'bg-purple-500/15 text-purple-200 border border-purple-500/30'
                                      : 'hover:bg-hoverCustom text-muted-foreground hover:text-foreground'
                                  }`}
                                >
                                  <span className="font-medium truncate pr-2">{esc.nome}</span>
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-purple-400 shrink-0" />
                                  ) : (
                                    <Square className="w-4 h-4 text-muted-foreground/60 shrink-0" />
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
                    <option value="Geral / Toda a Rede">Geral / Toda a Rede</option>
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
                          Publicando...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Send className="mr-1 h-4 w-4" />
                          Publicar Comunicado
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </Card>
          )}

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
            filteredNotices.map((notice) => (
              <Card key={notice.id} className="border-borderCustom bg-card p-5 hover:border-highlight/30 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-highlight/10 p-2 text-highlight shrink-0">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="font-semibold text-foreground text-base">{notice.title}</h2>
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
                          className="inline-flex items-center gap-1 text-xs font-semibold text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/30"
                          title={notice.escola_ids.map((id: string) => mapaEscolas.get(id) || id).join(', ')}
                        >
                          <Building className="w-3 h-3 text-purple-400" />
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
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

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
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted-foreground">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => (
                <span key={idx}>{day}</span>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-7 gap-2 text-center text-sm">
              {calendarData.blanks.map((_, idx) => (
                <span key={`blank-${idx}`} className="py-1" />
              ))}
              {calendarData.days.map((day) => {
                const hasBirthday = birthdays.some((birthday) => birthday.day === day)
                return (
                  <span
                    key={day}
                    onClick={() => handleDayClick(day, hasBirthday)}
                    className={
                      hasBirthday
                        ? 'rounded-md bg-highlight py-1 font-semibold text-background shadow-sm cursor-pointer hover:brightness-110 transition-all select-none'
                        : 'rounded-md bg-input py-1 text-muted-foreground'
                    }
                  >
                    {day}
                  </span>
                )
              })}
            </div>
            <div className="mt-5 space-y-2 border-t border-borderCustom pt-4">
              {loading || loadingBirthdays ? (
                <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-highlight" />
                  <span>Carregando...</span>
                </div>
              ) : birthdays.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-2">Nenhum aniversariante neste mês.</p>
              ) : (
                birthdays.map((birthday, idx) => (
                  <div key={idx} className="rounded-lg bg-input p-3 text-sm border border-borderCustom/50">
                    <p className="font-semibold text-foreground">{birthday.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Dia {birthday.day} - {birthday.role}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </aside>
      </div>

      {/* Modal de Aniversariantes do Dia */}
      <StandardDialog
        open={birthdayModal.open}
        onOpenChange={(open) => setBirthdayModal((prev) => ({ ...prev, open }))}
        title={`Aniversariantes — Dia ${birthdayModal.day}`}
        description={`${MONTH_NAMES[viewDate.getMonth()]} de ${viewDate.getFullYear()}`}
        maxWidth="sm:max-w-[420px]"
      >
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {birthdaysOfSelectedDay.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-4">Nenhum aniversariante registrado neste dia.</p>
          ) : (
            birthdaysOfSelectedDay.map((b, idx) => {
              const fullPhotoUrl = getAvatarUrl(b)
              const initials = b.name
                .trim()
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((w: string) => w[0])
                .join('')
                .toUpperCase()

              return (
                <div key={idx} className="flex items-center gap-3.5 rounded-xl bg-input/80 border border-borderCustom/60 p-2.5 hover:border-highlight/30 transition-colors">
                  {/* Moldura de Foto 3x4 */}
                  <div className="w-12 h-16 rounded-lg overflow-hidden shrink-0 border border-borderCustom bg-surface-2 flex items-center justify-center shadow-sm">
                    <CachedImage
                      src={fullPhotoUrl}
                      alt={b.name}
                      className="w-full h-full object-cover object-top"
                      fallback={
                        <div className="w-full h-full bg-highlight/10 text-highlight font-extrabold text-sm flex items-center justify-center border border-highlight/20">
                          {initials}
                        </div>
                      }
                    />
                  </div>

                  {/* Nome + Cargo */}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground text-sm truncate leading-snug">{b.name}</p>
                    <span className="inline-block text-[11px] font-medium text-muted-foreground bg-surface-2 px-2 py-0.5 rounded-md border border-borderCustom/40 mt-1">
                      {b.role}
                    </span>
                  </div>

                  {/* Ícone comemorativo */}
                  <div className="p-2 rounded-lg bg-highlight/10 text-highlight shrink-0">
                    <Cake className="w-4 h-4" />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </StandardDialog>
    </div>
  )
}
