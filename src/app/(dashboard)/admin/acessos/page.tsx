'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamicImport from 'next/dynamic'
import { createClient } from '@/lib/supabaseClient'
import { getHojeBrasilia, getDataBrasiliaOffset } from '@/lib/dateUtils'
import {
  KeyRound,
  Mail,
  RefreshCw,
  Pause,
  Trash2,
  Search,
  ShieldCheck,
  Check,
  X,
  AlertTriangle,
  Sparkles,
  Activity,
  Globe,
  Clock,
  Compass,
  FileText,
  Users,
  Monitor,
  MapPin,
  Loader2,
  Wifi,
  LogOut,
  ChevronRight,
  UserCheck,
  UserPlus,
  Calendar,
  Smartphone,
  Tablet,
  Laptop
} from 'lucide-react'
import { parseUserAgent } from '@/lib/parseUserAgent'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { StandardTable, TableColumn } from '@/components/ui/table'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { ModalContasEspeciais } from '@/components/modals/modal-contas-especiais'
import { ModalResetSenhaUser } from '@/components/modals/modal-reset-senha-user'
import { ModalUpdateEmailUser } from '@/components/modals/modal-update-email-user'
import { ModalCreateAuthUser } from '@/components/modals/modal-create-auth-user'
import { toast } from 'sonner'
import { useLocalSearch } from '@/hooks/useLocalSearch'

const MapaAuditoria = dynamicImport(() => import('@/components/map/MapaAuditoria'), { ssr: false })
const MapaCalorAcessos = dynamicImport(() => import('@/components/map/MapaCalorAcessos'), { ssr: false })

export interface AcessoItem {
  id: string
  funcionario: string
  email: string
  escola: string
  nivel: 'SECRETARIA' | 'DIRETOR' | 'PROFESSOR' | 'COORDENADOR' | 'N6' | 'ROOT' | string
  status: 'ATIVO' | 'INATIVO' | 'PAUSADO' | string
  auth_user_id?: string | null
}

export interface SessaoAtivaItem {
  session_id: string
  user_id: string
  funcionario_id: string | null
  funcionario_nome: string
  funcionario_email: string
  funcionario_cargo: string
  escola_nome: string
  foto_url: string | null
  created_at: string
  refreshed_at: string | null
  user_agent: string | null
  ip: string | null
  current_pathname: string | null
  total_active_seconds_today: number
  geo_city: string | null
  geo_region: string | null
}

export interface LoginDiarioItem {
  data_acesso: string
  funcionario_id: string | null
  funcionario_nome: string
  funcionario_email: string
  cargo: string
  escola_nome: string
  primeiro_login: string
  ultima_atividade: string
  total_sessoes: number
  total_tempo_tela_segundos: number
  ip_address: string | null
  geo_city: string | null
  geo_region: string | null
}

export interface TrilhaNavegacaoItem {
  id: string
  session_id: string | null
  funcionario_id: string | null
  funcionario_nome: string
  pathname: string
  page_title: string | null
  opened_at: string
  closed_at: string | null
  duration_seconds: number
  ip_address: string | null
  user_agent: string | null
  geo_city: string | null
  geo_region: string | null
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export default function AdminAcessosPage() {
  const supabase = createClient()

  // Controle de Aba Principal: 'permissoes' | 'avancado'
  const [activeTab, setActiveTab] = useState<'permissoes' | 'avancado'>('permissoes')

  // Controle de Sub-aba em Informações Avançadas
  const [subTab, setSubTab] = useState<'sessoes' | 'apk' | 'diarios' | 'trilha' | 'requisicoes' | 'mapa'>('sessoes')

  // ---------------- ABA 1: PERMISSÕES & NÍVEIS ----------------
  const [acessos, setAcessos] = useState<AcessoItem[]>([])
  const [loadingAcessos, setLoadingAcessos] = useState(false)
  const [modalContasEspeciaisOpen, setModalContasEspeciaisOpen] = useState(false)

  const [resetModalState, setResetModalState] = useState<{ open: boolean; item: AcessoItem | null }>({
    open: false,
    item: null,
  })

  const [emailModalState, setEmailModalState] = useState<{ open: boolean; item: AcessoItem | null }>({
    open: false,
    item: null,
  })

  const [createAuthModalState, setCreateAuthModalState] = useState<{ open: boolean; item: AcessoItem | null }>({
    open: false,
    item: null,
  })

  const [filtroNivel, setFiltroNivel] = useState('ALL')
  const [filtroStatus, setFiltroStatus] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  const [itemParaExcluir, setItemParaExcluir] = useState<AcessoItem | null>(null)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)

  // ---------------- ABA 2: INFORMAÇÕES AVANÇADAS ----------------
  const [sessoesAtivas, setSessoesAtivas] = useState<SessaoAtivaItem[]>([])
  const [loginsDiarios, setLoginsDiarios] = useState<LoginDiarioItem[]>([])
  const [trilhaNavegacao, setTrilhaNavegacao] = useState<TrilhaNavegacaoItem[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])

  const [loadingAvancado, setLoadingAvancado] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState<'conectado' | 'reconectando' | 'desconectado'>('conectado')
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null)

  // Filtros Avançados
  const [filtroFuncionarioTrilha, setFiltroFuncionarioTrilha] = useState<string>('ALL')
  const [searchTrilhaNome, setSearchTrilhaNome] = useState<string>('')
  const [filtroDataInicioTrilha, setFiltroDataInicioTrilha] = useState<string>('')
  const [filtroDataFimTrilha, setFiltroDataFimTrilha] = useState<string>('')
  const [filtroPeriodoDiario, setFiltroPeriodoDiario] = useState<string>('30')

  // Mapa de Calor Geo
  const [pontosGeo, setPontosGeo] = useState<any[]>([])
  const [loadingGeo, setLoadingGeo] = useState(false)

  const isMounted = useRef(true)


  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Carregar Acessos Nível/Permissão
  const loadAcessos = useCallback(async () => {
    setLoadingAcessos(true)
    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('id, nome, email, is_superadmin, cargo, status, auth_user_id, created_at, vinculos_funcionarios(ativo, escolas(nome))')
        .order('nome', { ascending: true })

      if (error) {
        console.error('Erro ao buscar acessos:', error)
        if (isMounted.current) toast.error('Erro ao carregar lista de acessos do banco de dados.')
        return
      }

      if (data && data.length > 0) {
        const dbItems: AcessoItem[] = data.map((f: any) => {
          const vinculos = Array.isArray(f.vinculos_funcionarios) ? f.vinculos_funcionarios : []
          const vinculoAtivo = vinculos.find((v: any) => v.ativo)?.escolas?.nome ?? vinculos[0]?.escolas?.nome
          const escolaNome = vinculoAtivo ?? 'Sem escola vinculada'

          return {
            id: f.id,
            funcionario: f.nome,
            email: f.email ?? f.nome,
            escola: escolaNome,
            nivel: f.is_superadmin ? 'ROOT' : (f.cargo?.toUpperCase() ?? 'PROFESSOR'),
            status: f.status?.toUpperCase() ?? 'ATIVO',
            auth_user_id: f.auth_user_id ?? null,
          }
        })

        if (isMounted.current) setAcessos(dbItems)
      }
    } catch (err: any) {
      console.error('Erro ao carregar acessos:', err)
      if (isMounted.current) toast.error('Falha de conexão ao carregar lista de acessos.')
    } finally {
      if (isMounted.current) setLoadingAcessos(false)
    }
  }, [supabase])

  // Carregar Dados da Aba Avançada (Sessões, Logins, Trilha, Auditoria)
  const loadDadosAvancados = useCallback(async () => {
    setLoadingAvancado(true)
    try {
      // 1. Carregar Sessões Ativas via RPC get_all_active_sessions_admin
      const { data: sessoesData, error: sessoesError } = await (supabase as any).rpc('get_all_active_sessions_admin')
      if (sessoesError) {
        console.warn('Aviso ao buscar sessões ativas via RPC:', sessoesError.message)
      } else if (sessoesData && isMounted.current) {
        setSessoesAtivas((sessoesData as unknown) as SessaoAtivaItem[])
      }

      // 2. Carregar Histórico Diário de Logins
      const days = parseInt(filtroPeriodoDiario, 10) || 30
      const startDateStr = getDataBrasiliaOffset(-days)
      const endDateStr = getHojeBrasilia()

      const { data: diariosData, error: diariosError } = await (supabase as any).rpc('get_daily_login_history_admin', {
        p_start_date: startDateStr,
        p_end_date: endDateStr,
      })

      if (diariosError) {
        console.warn('Aviso ao buscar diário de logins:', diariosError.message)
      } else if (diariosData && isMounted.current) {
        setLoginsDiarios((diariosData as unknown) as LoginDiarioItem[])
      }

      // 3. Carregar Trilha de Navegação
      const { data: trilhaData, error: trilhaError } = await (supabase as any).rpc('get_user_navigation_trail_admin', {
        p_funcionario_id: filtroFuncionarioTrilha === 'ALL' ? null : filtroFuncionarioTrilha,
        p_limit: 300,
        p_start_date: filtroDataInicioTrilha || null,
        p_end_date: filtroDataFimTrilha || null,
      })

      if (trilhaError) {
        console.warn('Aviso ao buscar trilha de navegação:', trilhaError.message)
      } else if (trilhaData && isMounted.current) {
        setTrilhaNavegacao((trilhaData as unknown) as TrilhaNavegacaoItem[])
      }

      // 4. Carregar Requisições & Logs de Auditoria
      const { data: logsData, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (logsError) {
        console.warn('Aviso ao buscar logs de auditoria:', logsError.message)
      } else if (logsData && isMounted.current) {
        setAuditLogs(logsData)
      }
    } catch (err: any) {
      console.error('Erro ao carregar informações avançadas:', err)
      if (isMounted.current) toast.error('Erro ao carregar dados avançados de acessos.')
    } finally {
      if (isMounted.current) setLoadingAvancado(false)
    }
  }, [supabase, filtroPeriodoDiario, filtroFuncionarioTrilha, filtroDataInicioTrilha, filtroDataFimTrilha])

  // Helper para obter a data local no formato YYYY-MM-DD (Evita bug silencioso de fuso UTC)
  const getLocalDateString = useCallback((isoString: string) => {
    if (!isoString) return ''
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return ''
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }, [])

  // Memo da Trilha de Navegação Filtrada
  const trilhaFiltrada = useMemo(() => {
    return trilhaNavegacao.filter((item) => {
      // 1. Busca por Nome de Usuário / Tela / Caminho (Reatividade Instantânea sem RPC Loop)
      if (searchTrilhaNome.trim() !== '') {
        const query = searchTrilhaNome.toLowerCase().trim()
        const matchNome = item.funcionario_nome?.toLowerCase().includes(query)
        const matchPath = item.pathname?.toLowerCase().includes(query)
        const matchTitle = item.page_title?.toLowerCase().includes(query)
        if (!matchNome && !matchPath && !matchTitle) return false
      }

      // 2. Filtro por Usuário Específico
      if (filtroFuncionarioTrilha !== 'ALL' && item.funcionario_id !== filtroFuncionarioTrilha) {
        return false
      }

      // 3. Filtro por Data Inicial (Horário Local)
      if (filtroDataInicioTrilha) {
        const dataItem = getLocalDateString(item.opened_at)
        if (dataItem < filtroDataInicioTrilha) return false
      }

      // 4. Filtro por Data Final (Horário Local)
      if (filtroDataFimTrilha) {
        const dataItem = getLocalDateString(item.opened_at)
        if (dataItem > filtroDataFimTrilha) return false
      }

      return true
    })
  }, [trilhaNavegacao, searchTrilhaNome, filtroFuncionarioTrilha, filtroDataInicioTrilha, filtroDataFimTrilha, getLocalDateString])

  // Carregar dados de geolocalização dos IPs
  const loadPontosGeo = useCallback(async () => {
    setLoadingGeo(true)
    try {
      const ips = Array.from(
        new Set([
          ...sessoesAtivas.map((s) => s.ip).filter((ip): ip is string => Boolean(ip)),
          ...loginsDiarios.map((d) => d.ip_address).filter((ip): ip is string => Boolean(ip)),
        ])
      )

      if (ips.length === 0) {
        if (isMounted.current) setPontosGeo([])
        return
      }

      const res = await fetch('/api/admin/acessos/geo-pontos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ips }),
      })

      if (!res.ok) {
        throw new Error('Falha ao obter geolocalização')
      }

      const data = await res.json()
      const geoList: any[] = data.pontos || []

      const mapResult = geoList.map((pt) => {
        const matchingSessoes = sessoesAtivas.filter((s) => s.ip === pt.ip)
        const usuarios = matchingSessoes.map((s) => ({
          nome: s.funcionario_nome,
          cargo: s.funcionario_cargo,
          escola: s.escola_nome,
        }))

        const suspeito =
          pt.region !== 'Bahia' &&
          pt.region !== 'BA' &&
          pt.region !== 'Local' &&
          pt.city !== 'Sapeaçu'

        return {
          ip: pt.ip,
          latitude: pt.latitude,
          longitude: pt.longitude,
          city: pt.city,
          region: pt.region,
          country: pt.country,
          provider: pt.provider,
          usuarios,
          count: matchingSessoes.length || 1,
          suspeito,
        }
      })

      if (isMounted.current) {
        setPontosGeo(mapResult)
      }
    } catch (err) {
      console.warn('Erro ao carregar pontos geo:', err)
    } finally {
      if (isMounted.current) setLoadingGeo(false)
    }
  }, [sessoesAtivas, loginsDiarios])

  useEffect(() => {
    loadAcessos()
  }, [loadAcessos])

  useEffect(() => {
    if (activeTab === 'avancado') {
      loadDadosAvancados()
    }
  }, [activeTab, loadDadosAvancados])

  useEffect(() => {
    if (activeTab === 'avancado' && subTab === 'mapa') {
      loadPontosGeo()
    }
  }, [activeTab, subTab, loadPontosGeo])


  // Inscrever no Supabase Realtime WebSocket para atualizar sessões ativas instantaneamente
  useEffect(() => {
    if (activeTab !== 'avancado') return

    const channel = supabase
      .channel('sessoes_ativas_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_navigation_trail' }, () => {
        loadDadosAvancados()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'access_logs' }, () => {
        loadDadosAvancados()
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (isMounted.current) setRealtimeStatus('conectado')
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          if (isMounted.current) setRealtimeStatus('desconectado')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, activeTab, loadDadosAvancados])

  // Ação de Revogar/Derrubar Sessão Remotamente
  const handleRevokeSession = async (sessionId: string, funcionarioNome: string) => {
    setRevokingSessionId(sessionId)
    try {
      const res = await fetch('/api/admin/acessos/revoke-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        toast.error(data.error || 'Falha ao revogar sessão.')
        return
      }

      toast.success(`Sessão de "${funcionarioNome}" foi encerrada remotamente com sucesso!`)
      setSessoesAtivas((prev) => prev.filter((s) => s.session_id !== sessionId))
    } catch (err) {
      console.error('Erro ao encerrar sessão:', err)
      toast.error('Erro de rede ao derrubar sessão.')
    } finally {
      if (isMounted.current) setRevokingSessionId(null)
    }
  }

  // Alternar pausa do acesso
  const handleTogglePausa = async (item: AcessoItem) => {
    const isPausado = item.status === 'PAUSADO' || item.status === 'INATIVO'
    const novoStatus = isPausado ? 'ATIVO' : 'PAUSADO'

    if (isPausado && item.nivel.toUpperCase().includes('DIRETOR')) {
      const { data: vincData } = await supabase
        .from('vinculos_funcionarios')
        .select('escola_id, escolas(id, diretor_id, nome)')
        .eq('funcionario_id', item.id)
        .limit(1)
        .maybeSingle()

      const escola = vincData?.escolas as any
      if (escola?.diretor_id && escola.diretor_id !== item.id) {
        toast.error(`Não é possível reativar: a escola "${escola.nome}" já possui outro diretor ativo.`)
        return
      }
    }

    const { error: statusError } = await supabase
      .from('funcionarios')
      .update({ status: novoStatus.toLowerCase() })
      .eq('id', item.id)

    if (statusError) {
      console.error('Erro ao atualizar status no banco:', statusError)
      toast.error('Falha ao atualizar o status do usuário no banco de dados.')
      return
    }

    setAcessos((prev) => prev.map((a) => (a.id === item.id ? { ...a, status: novoStatus } : a)))

    if (!isPausado) {
      await supabase.from('escolas').update({ diretor_id: null }).eq('diretor_id', item.id)
      toast.warning(`Acesso de ${item.funcionario} pausado temporariamente.`)
    } else {
      toast.success(`Acesso de ${item.funcionario} reativado com sucesso!`)
    }
  }

  const handleConfirmExcluir = (item: AcessoItem) => {
    setItemParaExcluir(item)
    setConfirmDeleteOpen(true)
  }

  const handleExcluirAcesso = async () => {
    if (!itemParaExcluir) return

    await supabase.from('escolas').update({ diretor_id: null }).eq('diretor_id', itemParaExcluir.id)
    setAcessos((prev) => prev.filter((a) => a.id !== itemParaExcluir.id))
    toast.error(`Acesso de ${itemParaExcluir.funcionario} removido do sistema.`)
    setConfirmDeleteOpen(false)
    setItemParaExcluir(null)
  }

  const handleOpenAlterarEmail = (item: AcessoItem) => {
    setEmailModalState({ open: true, item })
  }

  const handleOpenResetSenha = (item: AcessoItem) => {
    if (!item.auth_user_id) {
      toast.error(`O usuário "${item.funcionario}" ainda não possui uma conta de autenticação vinculada.`)
      return
    }
    setResetModalState({ open: true, item })
  }

  const handleOpenCreateAuth = (item: AcessoItem) => {
    setCreateAuthModalState({ open: true, item })
  }

  const renderNivelBadge = (nivel: string) => {
    const cleanNivel = nivel.toUpperCase()
    if (cleanNivel.includes('SECRETARIA')) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950/70 dark:border-purple-500/50 dark:text-purple-300 shadow-xs">
          SECRETARIA
        </span>
      )
    }
    if (cleanNivel.includes('DIRETOR')) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950/70 dark:border-amber-500/50 dark:text-amber-400 shadow-xs">
          DIRETOR
        </span>
      )
    }
    if (cleanNivel.includes('PROFESSOR')) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/70 dark:border-emerald-500/50 dark:text-emerald-400 shadow-xs">
          PROFESSOR
        </span>
      )
    }
    if (cleanNivel.includes('N6') || cleanNivel.includes('VIGIA') || cleanNivel.includes('OPERACIONAL')) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/70 dark:border-blue-500/50 dark:text-blue-400 shadow-xs">
          N6
        </span>
      )
    }
    if (cleanNivel.includes('COORDENADOR')) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-950/70 dark:border-sky-500/50 dark:text-sky-400 shadow-xs">
          COORDENADOR
        </span>
      )
    }
    if (cleanNivel.includes('ROOT') || cleanNivel.includes('ADMIN')) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-violet-100 text-violet-800 border border-violet-200 dark:bg-[#7c3aed]/20 dark:border-[#7c3aed]/50 dark:text-[#a78bfa] shadow-xs">
          ROOT
        </span>
      )
    }

    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-surface-3 border border-borderCustom text-muted-foreground">
        {cleanNivel}
      </span>
    )
  }

  // Filtragem local dos acessos
  const acessosBuscados = useLocalSearch(acessos, searchTerm, ['funcionario', 'email', 'escola'])
  const acessosFiltrados = acessosBuscados.filter((item) => {
    const matchNivel = filtroNivel === 'ALL' || item.nivel.toUpperCase().includes(filtroNivel.toUpperCase())
    const matchStatus = filtroStatus === 'ALL' || item.status.toUpperCase() === filtroStatus.toUpperCase()
    return matchNivel && matchStatus
  })

  // Colunas Tabela Permissões
  const columnsPermissoes: TableColumn<AcessoItem>[] = [
    {
      header: 'FUNCIONARIO',
      accessor: (item) => (
        <span className="font-bold text-foreground text-sm block max-w-[220px] truncate" title={item.funcionario}>
          {item.funcionario}
        </span>
      ),
    },
    {
      header: 'EMAIL',
      accessor: (item) => (
        <span className="text-muted-foreground text-sm font-mono block max-w-[240px] truncate" title={item.email}>
          {item.email}
        </span>
      ),
    },
    {
      header: 'ESCOLA / ORGAO',
      accessor: (item) => (
        <span
          className={`text-sm block max-w-[280px] truncate ${item.escola === 'Geral' ? 'italic text-muted-foreground' : 'text-foreground'}`}
          title={item.escola}
        >
          {item.escola}
        </span>
      ),
    },
    {
      header: 'NIVEL',
      accessor: (item) => renderNivelBadge(item.nivel),
    },
    {
      header: 'STATUS',
      accessor: (item) => {
        const isPausado = item.status === 'PAUSADO' || item.status === 'INATIVO'
        return isPausado ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-muted border border-border text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
            {item.status}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-[#052e16] border border-emerald-300 dark:border-[#166534] text-emerald-700 dark:text-[#4ade80] text-[11px] font-extrabold tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#4ade80]" />
            ATIVO
          </span>
        )
      },
    },
    {
      header: 'ACOES',
      className: 'text-right pr-6',
      headClassName: 'text-right pr-6',
      accessor: (item) => {
        const isPausado = item.status === 'PAUSADO' || item.status === 'INATIVO'
        const hasAuthAccount = Boolean(item.auth_user_id)

        return (
          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
            <button
              type="button"
              onClick={() => handleOpenAlterarEmail(item)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm bg-sky-100 dark:bg-sky-950/40 hover:bg-sky-200 dark:hover:bg-sky-900/60 border border-sky-400 dark:border-sky-500/40 text-sky-600 dark:text-sky-400 cursor-pointer"
              title={`Alterar E-mail de Acesso de ${item.funcionario}`}
            >
              <Mail className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleOpenCreateAuth(item)}
              disabled={hasAuthAccount}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                !hasAuthAccount
                  ? 'bg-emerald-100 dark:bg-emerald-950/40 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 border border-emerald-400 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 cursor-pointer'
                  : 'bg-muted border border-border text-muted-foreground opacity-30 cursor-not-allowed'
              }`}
              title={!hasAuthAccount ? `Criar Conta de Acesso Autoconfirmada para ${item.funcionario}` : 'Usuário já possui conta de autenticação criada.'}
            >
              <UserPlus className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleOpenResetSenha(item)}
              disabled={!hasAuthAccount}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                hasAuthAccount
                  ? 'bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 border border-amber-400 dark:border-amber-500/40 text-amber-600 dark:text-amber-400 cursor-pointer'
                  : 'bg-muted border border-border text-muted-foreground opacity-40 cursor-not-allowed'
              }`}
              title={hasAuthAccount ? `Resetar Senha de ${item.funcionario}` : 'Usuário ainda não possui conta de acesso.'}
            >
              <KeyRound className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleTogglePausa(item)}
              className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-[#450a0a]/30 hover:bg-rose-200 dark:hover:bg-[#7f1d1d]/60 border border-rose-300 dark:border-[#ef4444]/40 text-rose-600 dark:text-[#f87171] flex items-center justify-center transition-all cursor-pointer shadow-sm"
              title={isPausado ? 'Reativar Acesso' : 'Pausar Acesso'}
            >
              <Pause className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => handleConfirmExcluir(item)}
              className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-[#450a0a]/30 hover:bg-rose-200 dark:hover:bg-[#7f1d1d]/60 border border-rose-300 dark:border-[#ef4444]/40 text-rose-600 dark:text-[#f87171] flex items-center justify-center transition-all cursor-pointer shadow-sm"
              title="Excluir Acesso"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )
      },
    },
  ]

  // Colunas Tabela Sessões Ativas
  const columnsSessoesAtivas: TableColumn<SessaoAtivaItem>[] = [
    {
      header: 'USUÁRIO DA REDE',
      accessor: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-surface-2 border border-borderCustom flex items-center justify-center font-bold text-xs text-primary overflow-hidden shrink-0">
            {item.foto_url ? (
              <img src={`${item.foto_url}?t=session`} alt={item.funcionario_nome} className="w-full h-full object-cover" />
            ) : (
              item.funcionario_nome.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="font-bold text-foreground text-sm flex items-center gap-2">
              {item.funcionario_nome}
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sessão Ativa Agora" />
            </div>
            <div className="text-xs text-muted-foreground">{item.funcionario_email}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'CARGO & UNIDADE',
      accessor: (item) => (
        <div>
          <div className="text-sm font-semibold text-foreground">{item.funcionario_cargo}</div>
          <div className="text-xs text-muted-foreground">{item.escola_nome}</div>
        </div>
      ),
    },
    {
      header: 'IP & GEOLOCALIZAÇÃO',
      accessor: (item) => (
        <div>
          <div className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            {item.ip || '127.0.0.1'}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3 h-3 text-rose-500" />
            {item.geo_city ? `${item.geo_city}, ${item.geo_region || 'BA'}` : 'Sapeaçu, BA - Brasil'}
          </div>
        </div>
      ),
    },
    {
      header: 'ROTA ATUAL',
      accessor: (item) => (
        <span className="px-2.5 py-1 rounded-lg bg-surface-2 border border-borderCustom text-xs font-mono text-foreground font-medium">
          {item.current_pathname || '/home'}
        </span>
      ),
    },
    {
      header: 'TEMPO TELA HOJE',
      accessor: (item) => (
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {formatDuration(item.total_active_seconds_today)}
        </span>
      ),
    },
    {
      header: 'AÇÃO REMOTA',
      className: 'text-right pr-4',
      headClassName: 'text-right pr-4',
      accessor: (item) => (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleRevokeSession(item.session_id, item.funcionario_nome)}
            disabled={revokingSessionId === item.session_id}
            className="bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/60 text-xs font-bold gap-1.5 h-8 rounded-lg cursor-pointer"
          >
            {revokingSessionId === item.session_id ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            <span>Derrubar Sessão</span>
          </Button>
        </div>
      ),
    },
  ]

  // Detecção e Agregação de Dispositivos e Sessões APK (Capacitor / Android App)
  const sessoesApkAtivas = useMemo(() => {
    return sessoesAtivas.filter((s) => {
      const ua = parseUserAgent(s.user_agent)
      return ua.isApk || ua.os === 'Android' || ua.browser.includes('APK')
    })
  }, [sessoesAtivas])

  // Agrupar histórico por dispositivo/celular conectado via APK ou Mobile
  const dispositivosApkConectados = useMemo(() => {
    const map = new Map<string, {
      id: string
      deviceLabel: string
      os: string
      browser: string
      ip: string
      geo_city: string | null
      geo_region: string | null
      sessoesAtivas: SessaoAtivaItem[]
      contasConectadas: {
        funcionario_id: string | null
        funcionario_nome: string
        funcionario_email: string
        funcionario_cargo: string
        escola_nome: string
        foto_url: string | null
        ultima_atividade: string
        isOnline: boolean
      }[]
      totalAcessos: number
      primeiroAcesso: string
      ultimoAcesso: string
    }>()

    // 1. Processar das sessões ativas
    sessoesAtivas.forEach((sess) => {
      const ua = parseUserAgent(sess.user_agent)
      const isDeviceApk = ua.isApk || ua.os === 'Android' || ua.browser.includes('APK')
      if (!isDeviceApk) return

      const deviceKey = `${sess.ip || 'desconhecido'}_${ua.os}_${ua.browser}`
      if (!map.has(deviceKey)) {
        map.set(deviceKey, {
          id: deviceKey,
          deviceLabel: `${ua.os} • ${ua.browser}`,
          os: ua.os,
          browser: ua.browser,
          ip: sess.ip || '127.0.0.1',
          geo_city: sess.geo_city,
          geo_region: sess.geo_region,
          sessoesAtivas: [],
          contasConectadas: [],
          totalAcessos: 0,
          primeiroAcesso: sess.created_at,
          ultimoAcesso: sess.refreshed_at || sess.created_at,
        })
      }

      const dev = map.get(deviceKey)!
      dev.sessoesAtivas.push(sess)
      dev.totalAcessos += 1
      if (new Date(sess.created_at) < new Date(dev.primeiroAcesso)) {
        dev.primeiroAcesso = sess.created_at
      }
      const dataUltima = sess.refreshed_at || sess.created_at
      if (new Date(dataUltima) > new Date(dev.ultimoAcesso)) {
        dev.ultimoAcesso = dataUltima
      }

      if (!dev.contasConectadas.some((c) => c.funcionario_email === sess.funcionario_email)) {
        dev.contasConectadas.push({
          funcionario_id: sess.funcionario_id,
          funcionario_nome: sess.funcionario_nome,
          funcionario_email: sess.funcionario_email,
          funcionario_cargo: sess.funcionario_cargo,
          escola_nome: sess.escola_nome,
          foto_url: sess.foto_url,
          ultima_atividade: sess.refreshed_at || sess.created_at,
          isOnline: true,
        })
      }
    })

    // 2. Processar da trilha de navegação (para capturar histórico de contas que usaram o APK)
    trilhaNavegacao.forEach((t) => {
      const ua = parseUserAgent(t.user_agent)
      const isDeviceApk = ua.isApk || ua.os === 'Android' || ua.browser.includes('APK')
      if (!isDeviceApk) return

      const deviceKey = `${t.ip_address || 'desconhecido'}_${ua.os}_${ua.browser}`
      if (!map.has(deviceKey)) {
        map.set(deviceKey, {
          id: deviceKey,
          deviceLabel: `${ua.os} • ${ua.browser}`,
          os: ua.os,
          browser: ua.browser,
          ip: t.ip_address || '127.0.0.1',
          geo_city: t.geo_city,
          geo_region: t.geo_region,
          sessoesAtivas: [],
          contasConectadas: [],
          totalAcessos: 0,
          primeiroAcesso: t.opened_at,
          ultimoAcesso: t.closed_at || t.opened_at,
        })
      }

      const dev = map.get(deviceKey)!
      dev.totalAcessos += 1
      if (new Date(t.opened_at) < new Date(dev.primeiroAcesso)) {
        dev.primeiroAcesso = t.opened_at
      }
      const dataUltima = t.closed_at || t.opened_at
      if (new Date(dataUltima) > new Date(dev.ultimoAcesso)) {
        dev.ultimoAcesso = dataUltima
      }

      const matchingConta = dev.contasConectadas.find((c) => c.funcionario_id === t.funcionario_id)
      if (!matchingConta && t.funcionario_nome) {
        dev.contasConectadas.push({
          funcionario_id: t.funcionario_id,
          funcionario_nome: t.funcionario_nome,
          funcionario_email: 'Histórico de Navegação',
          funcionario_cargo: 'Usuário Registrado',
          escola_nome: 'Rede Municipal',
          foto_url: null,
          ultima_atividade: t.opened_at,
          isOnline: false,
        })
      }
    })

    return Array.from(map.values())
  }, [sessoesAtivas, trilhaNavegacao])

  // Cálculo de KPIs executivos
  const totalSessoesAtivas = sessoesAtivas.length
  const totalSessoesApk = sessoesApkAtivas.length
  const totalDispositivosApk = dispositivosApkConectados.length
  const totalLoginsHoje = loginsDiarios.filter((d) => d.data_acesso === getHojeBrasilia()).length
  const tempoMedioSegundos =
    loginsDiarios.length > 0
      ? Math.round(loginsDiarios.reduce((acc, curr) => acc + (curr.total_tempo_tela_segundos || 0), 0) / loginsDiarios.length)
      : 0
  const totalTelasNavegadas = trilhaNavegacao.length

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 w-full min-w-0">
      {/* Cabeçalho Principal do Painel de Acessos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-borderCustom w-full min-w-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <KeyRound className="w-7 h-7 text-purple-500 dark:text-purple-400 shrink-0" />
            <span className="truncate">Gestão & Inteligência de Acessos</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Superpainel administrativo de permissões, níveis hierárquicos, sessões ativas e trilha de navegação da rede municipal.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setModalContasEspeciaisOpen(true)}
          className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs gap-2 rounded-xl h-10 px-4 cursor-pointer shadow-md shrink-0 self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4 fill-black shrink-0" />
          <span>Gerenciar Contas Especiais</span>
        </Button>
      </div>

      {/* Seletor de Abas Principais */}
      <div className="flex items-center gap-2 border-b border-borderCustom pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('permissoes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'permissoes'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-borderCustom'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Níveis & Permissões</span>
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-white/20 text-white font-extrabold">
            {acessos.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('avancado')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'avancado'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-borderCustom'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Informações Avançadas de Acessos</span>
          <span className="relative flex h-2.5 w-2.5 ml-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-block rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
        </button>
      </div>

      {/* ================= ABA 1: GESTÃO DE NÍVEIS & PERMISSÕES ================= */}
      {activeTab === 'permissoes' && (
        <div className="space-y-4">
          {/* Filtros Superiores */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por nome, e-mail ou escola..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-input-bg border-borderCustom text-foreground h-12 rounded-xl pl-11 pr-10 text-sm font-medium focus:ring-primary focus:border-primary shadow-sm"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 cursor-pointer"
                  title="Limpar busca"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <select
                  value={filtroNivel}
                  onChange={(e) => setFiltroNivel(e.target.value)}
                  className="w-full bg-input-bg border border-borderCustom text-foreground h-12 rounded-xl px-4 text-sm font-medium focus:outline-none focus:border-primary cursor-pointer shadow-sm"
                >
                  <option value="ALL">Todos os níveis</option>
                  <option value="SECRETARIA">Secretaria</option>
                  <option value="DIRETOR">Diretor</option>
                  <option value="PROFESSOR">Professor</option>
                  <option value="COORDENADOR">Coordenador</option>
                  <option value="N6">N6 - Operacional</option>
                  <option value="ROOT">Root / Admin</option>
                </select>
              </div>

              <div>
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="w-full bg-input-bg border border-borderCustom text-foreground h-12 rounded-xl px-4 text-sm font-medium focus:outline-none focus:border-primary cursor-pointer shadow-sm"
                >
                  <option value="ALL">Todos os status</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="PAUSADO">Pausado</option>
                  <option value="INATIVO">Inativo</option>
                </select>
              </div>
            </div>
          </div>

          <StandardTable
            data={acessosFiltrados}
            columns={columnsPermissoes}
            keyExtractor={(item) => item.id}
            loading={loadingAcessos}
            emptyMessage={
              searchTerm
                ? `Nenhum registro encontrado para "${searchTerm}".`
                : 'Nenhum registro de acesso encontrado.'
            }
          />
        </div>
      )}

      {/* ================= ABA 2: INFORMAÇÕES AVANÇADAS DE ACESSOS ================= */}
      {activeTab === 'avancado' && (
        <div className="space-y-6">
          {/* Header com Status WebSocket Realtime */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-borderCustom p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Wifi className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  Monitor de Inteligência de Acessos & Sessões
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] uppercase font-extrabold tracking-wide">
                    Realtime WebSocket
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground">
                  Rastreamento em tempo real de sessões ativas da rede, trilha de navegação e geolocalização por IP.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={loadDadosAvancados}
              disabled={loadingAvancado}
              className="bg-surface-2 border-borderCustom hover:bg-hoverCustom text-foreground text-xs font-bold gap-2 h-9 px-3 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingAvancado ? 'animate-spin' : ''}`} />
              <span>Atualizar Agora</span>
            </Button>
          </div>

          {/* Cards de KPIs Executivos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-card border border-borderCustom rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-semibold block">Sessões Ativas Geral</span>
                <span className="text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                  {totalSessoesAtivas}
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                </span>
              </div>
            </div>

            <div className="bg-card border border-borderCustom rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-semibold block">Celulares / APK</span>
                <span className="text-2xl font-black text-indigo-400 tracking-tight flex items-center gap-2">
                  {totalDispositivosApk}
                  {totalSessoesApk > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-extrabold">
                      {totalSessoesApk} on
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="bg-card border border-borderCustom rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-semibold block">Logins Hoje</span>
                <span className="text-2xl font-black text-foreground tracking-tight">{totalLoginsHoje}</span>
              </div>
            </div>

            <div className="bg-card border border-borderCustom rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-semibold block">Tempo Médio de Tela</span>
                <span className="text-lg font-black text-foreground tracking-tight">{formatDuration(tempoMedioSegundos)}</span>
              </div>
            </div>

            <div className="bg-card border border-borderCustom rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-muted-foreground font-semibold block">Telas Navegadas</span>
                <span className="text-2xl font-black text-foreground tracking-tight">{totalTelasNavegadas}</span>
              </div>
            </div>
          </div>

          {/* Seletor de Sub-Abas do Módulo Avançado */}
          <div className="flex flex-wrap items-center gap-2 border-b border-borderCustom pb-2">
            <button
              type="button"
              onClick={() => setSubTab('sessoes')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                subTab === 'sessoes'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-borderCustom'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>⚡ Sessões Ativas na Rede ({sessoesAtivas.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('apk')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                subTab === 'apk'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-borderCustom'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              <span>📱 Dispositivos Conectados via APK ({dispositivosApkConectados.length})</span>
              {sessoesApkAtivas.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-300 text-[10px] font-black animate-pulse">
                  {sessoesApkAtivas.length} online
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setSubTab('diarios')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                subTab === 'diarios'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-borderCustom'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>📅 Histórico Diário de Logins</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('trilha')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                subTab === 'trilha'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-borderCustom'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>🧭 Trilha de Navegação (Abriu/Fechou)</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('requisicoes')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                subTab === 'requisicoes'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-borderCustom'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>📜 Requisições & Auditoria</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('mapa')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                subTab === 'mapa'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-borderCustom'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>🗺️ Geolocalização Aproximada</span>
            </button>
          </div>

          {/* SUB-ABA 1: SESSÕES ATIVAS NA REDE */}
          {subTab === 'sessoes' && (
            <div className="space-y-4">
              <StandardTable
                data={sessoesAtivas}
                columns={columnsSessoesAtivas}
                keyExtractor={(item) => item.session_id}
                loading={loadingAvancado}
                emptyMessage="Nenhuma sessão ativa encontrada na rede municipal neste momento."
              />
            </div>
          )}

          {/* SUB-ABA APK: DISPOSITIVOS E CONTAS CONECTADAS PELO APK */}
          {subTab === 'apk' && (
            <div className="space-y-6">
              {/* Header com resumo do ecossistema mobile */}
              <div className="bg-card border border-borderCustom p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      Auditoria de Dispositivos Conectados via APK (Android / Mobile)
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] uppercase font-black">
                        Capacitor Shell Native
                      </span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Visualização consolidada de cada celular/dispositivo móvel, contas autenticadas e sessões em tempo real ativas.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3 py-2 rounded-xl bg-surface-2 border border-borderCustom text-right">
                    <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Dispositivos Mapeados</span>
                    <span className="text-lg font-black text-indigo-400">{dispositivosApkConectados.length}</span>
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-surface-2 border border-borderCustom text-right">
                    <span className="text-[10px] text-muted-foreground font-semibold block uppercase">Sessões APK Online</span>
                    <span className="text-lg font-black text-emerald-400 flex items-center gap-1.5 justify-end">
                      {sessoesApkAtivas.length}
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </span>
                  </div>
                </div>
              </div>

              {/* Lista dos Dispositivos Conectados */}
              {dispositivosApkConectados.length === 0 ? (
                <div className="bg-card border border-borderCustom rounded-2xl p-12 text-center space-y-3">
                  <Smartphone className="w-12 h-12 text-muted-foreground mx-auto opacity-40" />
                  <h4 className="text-sm font-bold text-foreground">Nenhum dispositivo APK conectado registrado</h4>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Assim que servidores e operadores abrirem o aplicativo SIG no celular Android (APK), as informações detalhadas do aparelho, contas e sessões ativas serão exibidas aqui em tempo real.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5">
                  {dispositivosApkConectados.map((dispositivo) => (
                    <div
                      key={dispositivo.id}
                      className="bg-card border border-borderCustom hover:border-borderCustom/90 transition-all rounded-2xl p-5 shadow-sm space-y-4"
                    >
                      {/* Topo do Card do Dispositivo */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-borderCustom">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                            <Smartphone className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-foreground text-sm">{dispositivo.deviceLabel}</h4>
                              {dispositivo.sessoesAtivas.length > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-extrabold uppercase">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Online ({dispositivo.sessoesAtivas.length} sessão ativa)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground text-[10px] font-bold uppercase">
                                  Offline
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                              <span className="flex items-center gap-1 font-mono text-sky-400">
                                <Globe className="w-3 h-3" />
                                IP: {dispositivo.ip}
                              </span>
                              <span className="flex items-center gap-1 text-rose-400">
                                <MapPin className="w-3 h-3" />
                                {dispositivo.geo_city ? `${dispositivo.geo_city}, ${dispositivo.geo_region || 'BA'}` : 'Sapeaçu, BA'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Última Atividade: {new Date(dispositivo.ultimoAcesso).toLocaleString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[11px] text-muted-foreground block">Total de Registros</span>
                          <span className="text-xs font-mono font-bold text-foreground">{dispositivo.totalAcessos} eventos</span>
                        </div>
                      </div>

                      {/* Bloco 1: Contas que se conectaram a partir deste dispositivo */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-400" />
                          Contas que se conectaram a partir deste celular ({dispositivo.contasConectadas.length}):
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {dispositivo.contasConectadas.map((conta, cIdx) => (
                            <div
                              key={cIdx}
                              className="bg-surface-2 border border-borderCustom p-3 rounded-xl flex items-center justify-between gap-2.5"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-surface-3 border border-borderCustom flex items-center justify-center font-bold text-xs text-primary overflow-hidden shrink-0">
                                  {conta.foto_url ? (
                                    <img src={conta.foto_url} alt={conta.funcionario_nome} className="w-full h-full object-cover" />
                                  ) : (
                                    conta.funcionario_nome.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-foreground text-xs truncate flex items-center gap-1.5">
                                    {conta.funcionario_nome}
                                    {conta.isOnline && (
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Online Agora" />
                                    )}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground truncate">{conta.funcionario_email}</div>
                                  <div className="text-[10px] text-indigo-400 font-semibold truncate">{conta.funcionario_cargo} • {conta.escola_nome}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bloco 2: Sessões Ativas em Tempo Real no Dispositivo */}
                      {dispositivo.sessoesAtivas.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-borderCustom/60">
                          <div className="text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5" />
                            Sessões Ativas em Execução Agora neste Aparelho ({dispositivo.sessoesAtivas.length}):
                          </div>

                          <div className="space-y-2">
                            {dispositivo.sessoesAtivas.map((sessao) => (
                              <div
                                key={sessao.session_id}
                                className="bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-foreground text-xs">{sessao.funcionario_nome}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-surface-2 border border-borderCustom text-muted-foreground font-mono">
                                      Rota: {sessao.current_pathname || '/home'}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-muted-foreground flex items-center gap-3 flex-wrap">
                                    <span>Início: <strong className="text-foreground">{new Date(sessao.created_at).toLocaleTimeString('pt-BR')}</strong></span>
                                    <span>Tempo de tela: <strong className="text-emerald-400">{formatDuration(sessao.total_active_seconds_today)}</strong></span>
                                  </div>
                                </div>

                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRevokeSession(sessao.session_id, sessao.funcionario_nome)}
                                  disabled={revokingSessionId === sessao.session_id}
                                  className="bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/60 text-xs font-bold gap-1.5 h-8 rounded-lg cursor-pointer self-end sm:self-auto"
                                >
                                  {revokingSessionId === sessao.session_id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <LogOut className="w-3.5 h-3.5" />
                                  )}
                                  <span>Derrubar Sessão do APK</span>
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SUB-ABA 2: HISTÓRICO DIÁRIO DE LOGINS */}
          {subTab === 'diarios' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-sky-400" />
                  Histórico Consolidado de Logins Diários
                </h3>
                <div className="w-48">
                  <select
                    value={filtroPeriodoDiario}
                    onChange={(e) => setFiltroPeriodoDiario(e.target.value)}
                    className="w-full bg-input-bg border border-borderCustom text-foreground h-10 rounded-xl px-3 text-xs font-medium focus:outline-none focus:border-primary cursor-pointer shadow-sm"
                  >
                    <option value="7">Últimos 7 dias</option>
                    <option value="30">Últimos 30 dias</option>
                    <option value="90">Últimos 90 dias</option>
                  </select>
                </div>
              </div>

              <div className="bg-card border border-borderCustom rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-borderCustom bg-surface-2 text-muted-foreground uppercase text-[11px] font-bold tracking-wider">
                        <th className="p-3">DATA</th>
                        <th className="p-3">SERVIDORES / USUÁRIOS</th>
                        <th className="p-3">PRIMEIRO LOGIN</th>
                        <th className="p-3">ÚLTIMA ATIVIDADE</th>
                        <th className="p-3">SESSÕES</th>
                        <th className="p-3">TEMPO TELA ABERTA</th>
                        <th className="p-3">IP & GEOLOCALIZAÇÃO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borderCustom">
                      {loginsDiarios.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-6 text-center text-muted-foreground">
                            Nenhum registro de login diário no período selecionado.
                          </td>
                        </tr>
                      ) : (
                        loginsDiarios.map((item, idx) => (
                          <tr key={idx} className="hover:bg-muted/40 transition-colors">
                            <td className="p-3 font-bold text-foreground whitespace-nowrap">
                              {new Date(item.data_acesso + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-foreground">{item.funcionario_nome}</div>
                              <div className="text-[11px] text-muted-foreground">{item.funcionario_email} • {item.cargo}</div>
                            </td>
                            <td className="p-3 text-muted-foreground whitespace-nowrap font-mono">
                              {new Date(item.primeiro_login).toLocaleTimeString('pt-BR')}
                            </td>
                            <td className="p-3 text-muted-foreground whitespace-nowrap font-mono">
                              {new Date(item.ultima_atividade).toLocaleTimeString('pt-BR')}
                            </td>
                            <td className="p-3 font-bold text-foreground">
                              <span className="px-2 py-0.5 rounded-full bg-surface-2 border border-borderCustom">
                                {item.total_sessoes}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              {formatDuration(item.total_tempo_tela_segundos)}
                            </td>
                            <td className="p-3">
                              <div className="font-mono text-sky-400 font-bold">{item.ip_address || '127.0.0.1'}</div>
                              <div className="text-[10px] text-muted-foreground">{item.geo_city ? `${item.geo_city}, ${item.geo_region}` : 'Sapeaçu, BA'}</div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-ABA 3: TRILHA DE NAVEGAÇÃO */}
          {subTab === 'trilha' && (
            <div className="space-y-4">
              <div className="bg-card border border-borderCustom rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Compass className="w-4 h-4 text-purple-400" />
                    <span>Trilha Detalhada de Telas (O que abriu e fechou)</span>
                    <Badge variant="outline" className="ml-1 bg-purple-950/40 border-purple-500/30 text-purple-300 font-mono text-[11px]">
                      {trilhaFiltrada.length} {trilhaFiltrada.length === 1 ? 'registro' : 'registros'}
                    </Badge>
                  </h3>

                  {(searchTrilhaNome || filtroDataInicioTrilha || filtroDataFimTrilha || filtroFuncionarioTrilha !== 'ALL') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchTrilhaNome('')
                        setFiltroDataInicioTrilha('')
                        setFiltroDataFimTrilha('')
                        setFiltroFuncionarioTrilha('ALL')
                      }}
                      className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 gap-1.5 self-start sm:self-auto"
                    >
                      <X className="w-3.5 h-3.5" />
                      Limpar Filtros
                    </Button>
                  )}
                </div>

                {/* Controles de Filtros: Busca por Nome + Usuário + Período de Data */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                  {/* Campo de Busca por Nome / Tela */}
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Buscar por nome do usuário..."
                      value={searchTrilhaNome}
                      onChange={(e) => setSearchTrilhaNome(e.target.value)}
                      className="pl-9 pr-8 h-9 text-xs bg-input-bg border-borderCustom rounded-xl focus:border-purple-500"
                    />
                    {searchTrilhaNome && (
                      <button
                        onClick={() => setSearchTrilhaNome('')}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Seleção de Usuário */}
                  <div>
                    <select
                      value={filtroFuncionarioTrilha}
                      onChange={(e) => setFiltroFuncionarioTrilha(e.target.value)}
                      className="w-full bg-input-bg border border-borderCustom text-foreground h-9 rounded-xl px-3 text-xs font-medium focus:outline-none focus:border-purple-500 cursor-pointer shadow-sm"
                    >
                      <option value="ALL">Todos os usuários</option>
                      {acessos.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.funcionario}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filtro de Data Inicial */}
                  <div className="flex items-center gap-1.5 bg-input-bg border border-borderCustom rounded-xl px-2.5 h-9">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[11px] text-muted-foreground shrink-0 font-medium">De:</span>
                    <input
                      type="date"
                      value={filtroDataInicioTrilha}
                      onChange={(e) => setFiltroDataInicioTrilha(e.target.value)}
                      className="bg-transparent text-foreground text-xs font-medium focus:outline-none w-full cursor-pointer"
                    />
                    {filtroDataInicioTrilha && (
                      <button onClick={() => setFiltroDataInicioTrilha('')} className="text-muted-foreground hover:text-foreground shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Filtro de Data Final */}
                  <div className="flex items-center gap-1.5 bg-input-bg border border-borderCustom rounded-xl px-2.5 h-9">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[11px] text-muted-foreground shrink-0 font-medium">Até:</span>
                    <input
                      type="date"
                      value={filtroDataFimTrilha}
                      onChange={(e) => setFiltroDataFimTrilha(e.target.value)}
                      className="bg-transparent text-foreground text-xs font-medium focus:outline-none w-full cursor-pointer"
                    />
                    {filtroDataFimTrilha && (
                      <button onClick={() => setFiltroDataFimTrilha('')} className="text-muted-foreground hover:text-foreground shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Linha do Tempo (Timeline) */}
              <div className="bg-card border border-borderCustom rounded-2xl p-4 shadow-sm space-y-4">
                {trilhaFiltrada.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-xs">
                    Nenhuma trilha de navegação encontrada com os filtros aplicados.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-borderCustom">
                    {trilhaFiltrada.map((item) => (
                      <div key={item.id} className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-surface-2 border border-borderCustom p-3.5 rounded-xl hover:bg-muted/40 transition-all">
                        <span className="absolute -left-6 top-4 w-3.5 h-3.5 rounded-full bg-purple-500 border-2 border-card" />
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-foreground text-sm">{item.funcionario_nome}</span>
                            <span className="text-xs px-2 py-0.5 rounded-md bg-purple-950/60 border border-purple-500/40 text-purple-300 font-mono">
                              {item.pathname}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                            <span>Abriu: <strong className="text-foreground">{new Date(item.opened_at).toLocaleString('pt-BR')}</strong></span>
                            {item.closed_at && (
                              <span>Fechou: <strong className="text-foreground">{new Date(item.closed_at).toLocaleTimeString('pt-BR')}</strong></span>
                            )}
                            {item.ip_address && (
                              <span className="font-mono text-sky-400">IP: {item.ip_address}</span>
                            )}
                            {(item.geo_city || item.geo_region) && (
                              <span className="text-amber-400 font-medium">📍 {item.geo_city ? `${item.geo_city} - ${item.geo_region}` : item.geo_region}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <div className="text-right">
                            <span className="text-xs text-muted-foreground block">Tempo de Tela Aberta</span>
                            <span className="text-xs font-bold text-emerald-400 font-mono">
                              {formatDuration(item.duration_seconds)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUB-ABA 4: HISTÓRICO DE REQUISIÇÕES & AUDITORIA */}
          {subTab === 'requisicoes' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                Histórico Auditável de Requisições & Operações
              </h3>

              <div className="bg-card border border-borderCustom rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-borderCustom bg-surface-2 text-muted-foreground uppercase text-[11px] font-bold tracking-wider">
                        <th className="p-3">DATA / HORA</th>
                        <th className="p-3">USUÁRIO EXECUTOR</th>
                        <th className="p-3">AÇÃO</th>
                        <th className="p-3">ENTIDADE / RECURSO</th>
                        <th className="p-3">IP ORIGEM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borderCustom">
                      {auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-6 text-center text-muted-foreground">
                            Nenhum log de requisição registrado.
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                            <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">
                              {new Date(log.created_at).toLocaleString('pt-BR')}
                            </td>
                            <td className="p-3 font-bold text-foreground">
                              {log.user_name || log.user_email || 'Sistema'}
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                                log.action === 'CREATE' ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-400' :
                                log.action === 'DELETE' ? 'bg-rose-950/70 border border-rose-500/50 text-rose-400' :
                                log.action === 'UPDATE' ? 'bg-amber-950/70 border border-amber-500/50 text-amber-400' :
                                'bg-purple-950/70 border border-purple-500/50 text-purple-400'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-foreground">{log.entity}</td>
                            <td className="p-3 font-mono text-sky-400">{log.ip_address || '127.0.0.1'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-ABA 5: GEOLOCALIZAÇÃO APROXIMADA */}
          {subTab === 'mapa' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-rose-400" />
                  Mapa de Geolocalização de Acessos por IP
                </h3>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-surface-2 border border-borderCustom text-foreground flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                    {pontosGeo.length} IP(s) Mapeado(s)
                  </span>
                  {pontosGeo.some((p) => p.suspeito) && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      IP Fora da Bahia Detectado
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-12 gap-4">
                {/* Lado Esquerdo: Mapa Interativo */}
                <div className="col-span-12 lg:col-span-8 bg-card border border-borderCustom rounded-2xl p-4 shadow-sm">
                  {loadingGeo ? (
                    <div className="w-full h-[480px] rounded-2xl bg-[#141a27] border border-[#232d42] flex flex-col items-center justify-center p-6 text-center text-slate-400 animate-pulse">
                      <Loader2 className="w-8 h-8 animate-spin mb-2 text-rose-400" />
                      <span className="text-sm font-semibold">Carregando mapa e geolocalização dos IPs...</span>
                    </div>
                  ) : (
                    <MapaCalorAcessos pontos={pontosGeo} />
                  )}
                </div>

                {/* Lado Direito: Painel Estatístico & Alertas */}
                <div className="col-span-12 lg:col-span-4 space-y-4">
                  <div className="bg-card border border-borderCustom rounded-2xl p-4 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Globe className="w-4 h-4 text-purple-400" />
                      Distribuição Geográfica de IPs
                    </h4>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-surface-2 border border-borderCustom p-3 rounded-xl">
                        <span className="text-xs text-muted-foreground font-medium">Acessos Locais (Sapeaçu)</span>
                        <span className="text-sm font-black text-emerald-500">
                          {pontosGeo.filter((p) => p.city === 'Sapeaçu').length}
                        </span>
                      </div>

                      <div className="flex justify-between items-center bg-surface-2 border border-borderCustom p-3 rounded-xl">
                        <span className="text-xs text-muted-foreground font-medium">Outros Municípios (BA)</span>
                        <span className="text-sm font-black text-amber-500">
                          {pontosGeo.filter((p) => p.region === 'Bahia' && p.city !== 'Sapeaçu').length}
                        </span>
                      </div>

                      <div className="flex justify-between items-center bg-surface-2 border border-borderCustom p-3 rounded-xl">
                        <span className="text-xs text-muted-foreground font-medium">Fora da Bahia / Suspeitos</span>
                        <span className="text-sm font-black text-rose-500">
                          {pontosGeo.filter((p) => p.suspeito).length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-card border border-borderCustom rounded-2xl p-4 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      IPs em Destaque
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {pontosGeo.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Nenhum IP mapeado no momento.</p>
                      ) : (
                        pontosGeo.slice(0, 5).map((pt, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-surface-2 border border-borderCustom p-2.5 rounded-xl text-xs">
                            <div>
                              <div className="font-mono font-bold text-foreground">{pt.ip}</div>
                              <div className="text-[10px] text-muted-foreground">{pt.city}, {pt.region}</div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              pt.suspeito ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            }`}>
                              {pt.count} sessão(ões)
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Modal Contas Especiais */}
      {modalContasEspeciaisOpen && (
        <ModalContasEspeciais
          open={modalContasEspeciaisOpen}
          onOpenChange={setModalContasEspeciaisOpen}
        />
      )}

      {/* Modal Reset de Senha do Usuário */}
      {resetModalState.open && (
        <ModalResetSenhaUser
          open={resetModalState.open}
          onOpenChange={(open) => setResetModalState((prev) => ({ ...prev, open }))}
          authUserId={resetModalState.item?.auth_user_id}
          funcionarioId={resetModalState.item?.id}
          userName={resetModalState.item?.funcionario}
          userEmail={resetModalState.item?.email}
        />
      )}

      {/* Modal Alterar E-mail do Usuário */}
      {emailModalState.open && (
        <ModalUpdateEmailUser
          open={emailModalState.open}
          onOpenChange={(open) => setEmailModalState((prev) => ({ ...prev, open }))}
          authUserId={emailModalState.item?.auth_user_id}
          funcionarioId={emailModalState.item?.id}
          userName={emailModalState.item?.funcionario}
          userEmail={emailModalState.item?.email}
          onSuccess={(novoEmail) => {
            setAcessos((prev) =>
              prev.map((a) => (a.id === emailModalState.item?.id ? { ...a, email: novoEmail } : a))
            )
          }}
        />
      )}

      {/* Modal Criar Conta de Acesso Autoconfirmada */}
      {createAuthModalState.open && (
        <ModalCreateAuthUser
          open={createAuthModalState.open}
          onOpenChange={(open) => setCreateAuthModalState((prev) => ({ ...prev, open }))}
          funcionarioId={createAuthModalState.item?.id}
          userName={createAuthModalState.item?.funcionario}
          userEmail={createAuthModalState.item?.email}
          cargo={createAuthModalState.item?.nivel}
          escolaNome={createAuthModalState.item?.escola}
          onSuccess={(authUserId, novoEmail) => {
            setAcessos((prev) =>
              prev.map((a) =>
                a.id === createAuthModalState.item?.id
                  ? { ...a, auth_user_id: authUserId, email: novoEmail, status: 'ATIVO' }
                  : a
              )
            )
          }}
        />
      )}

      {/* Modal de Confirmação para Excluir Acesso */}
      {confirmDeleteOpen && (
        <StandardDialog
          open={confirmDeleteOpen}
          onOpenChange={setConfirmDeleteOpen}
          title="Remover Acesso do Usuário"
          maxWidth="sm:max-w-[400px]"
          footer={
            <div className="flex justify-end gap-2 w-full pt-2 border-t border-borderCustom">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDeleteOpen(false)}
                className="bg-surface-2 border-borderCustom text-foreground hover:bg-hoverCustom"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleExcluirAcesso}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Confirmar Exclusão
              </Button>
            </div>
          }
        >
          <p className="text-muted-foreground text-sm leading-relaxed">
            Tem certeza que deseja remover permanentemente o nível de acesso do usuário <strong className="text-foreground">{itemParaExcluir?.funcionario}</strong>?
          </p>
        </StandardDialog>
      )}
    </div>
  )
}
