'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  Settings,
  User,
  PenTool,
  BookOpen,
  ShieldCheck,
  Loader2,
  Save,
  CalendarClock,
  Bell,
  Building2,
  MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { SchoolSelector } from '@/components/SchoolSelector'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { getVersaoImagemUrl } from '@/lib/imageUtils'
import { PerfilTab } from './PerfilTab'
import { Database } from '@/types/supabase'

// Fix #5 / P2: Dynamic import — SignaturePad só carrega ao abrir a aba de assinatura
const SignaturePad = dynamic(
  () => import('@/components/ui/SignaturePad').then((m) => ({ default: m.SignaturePad })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)

const PushNotificationsTab = dynamic(() => import('./PushNotificationsTab').then((m) => ({ default: m.PushNotificationsTab })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-32">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  ),
})

// Dynamic import — SessoesAtivasTab só carrega ao clicar na aba
const SessoesAtivasTab = dynamic(() => import('./SessoesAtivasTab').then((m) => ({ default: m.SessoesAtivasTab })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-32">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  ),
})

const PrazoFrequenciaTab = dynamic(() => import('./PrazoFrequenciaTab').then((m) => ({ default: m.PrazoFrequenciaTab })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-32">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  ),
})

const PrazoAtividadesTab = dynamic(() => import('./PrazoAtividadesTab').then((m) => ({ default: m.PrazoAtividadesTab })), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-32">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  ),
})

// Fix #5 / P3: Dynamic import — GradeCurricularTab e suas queries só carregam ao clicar na aba
const GradeCurricularTab = dynamic(() => import('./GradeCurricularTab'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-32">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  ),
})

const LocalidadesTab = dynamic(() => import('@/components/configuracoes/LocalidadesTab'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  ),
})

// Fix #8: Tipo explícito derivado do schema Supabase — sem any
type FuncionarioRow = Database['public']['Tables']['funcionarios']['Row']
type FuncionarioLocal = Pick<
  FuncionarioRow,
  'id' | 'nome' | 'email' | 'cargo' | 'status' | 'assinatura_url' | 'auth_user_id'
>

type ActiveTab = 'perfil' | 'push-notifications' | 'sessoes' | 'assinatura-diretor' | 'assinatura-pessoal' | 'materias' | 'prazo-frequencia' | 'prazo-atividades' | 'localidades'
type Category = 'pessoal' | 'escola' | 'rede'

export function ConfiguracoesClient() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [category, setCategory] = useState<Category>('pessoal')
  const [activeTab, setActiveTab] = useState<ActiveTab>('perfil')
  const [mounted, setMounted] = useState(false)

  const { funcionario, vinculos, isAdminGlobalOrRoot, escolaAtivaId } = useAuthStore()
  const { selectedEscola } = useSchoolStore()
  const isAdmin = isAdminGlobalOrRoot()

  // Função centralizada para alternar categoria/aba e refletir na URL
  const selectTab = useCallback((newCategory: Category, newTab: ActiveTab) => {
    setCategory(newCategory)
    setActiveTab(newTab)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('categoria', newCategory)
      url.searchParams.set('tab', newTab)
      window.history.replaceState(null, '', url.pathname + url.search)
    }
  }, [])

  // Fix #8: Tipagem explícita
  const [localFuncionario, setLocalFuncionario] = useState<FuncionarioLocal | null>(null)

  // Assinatura do Diretor
  const [assinaturaDiretorUrl, setAssinaturaDiretorUrl] = useState<string | null>(null)
  const [newDiretorSignature, setNewDiretorSignature] = useState<string | null>(null)
  const [loadingDiretorSig, setLoadingDiretorSig] = useState(false)

  // Assinatura Pessoal
  const [assinaturaPessoalUrl, setAssinaturaPessoalUrl] = useState<string | null>(null)
  const [newPessoalSignature, setNewPessoalSignature] = useState<string | null>(null)
  const [loadingPessoalSig, setLoadingPessoalSig] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Sincroniza estado com parâmetros da URL (ex: ?tab=localidades ou ?categoria=rede)
  useEffect(() => {
    const tabParam = searchParams.get('tab') as ActiveTab | null
    const catParam = searchParams.get('categoria') as Category | null

    if (tabParam) {
      if (tabParam === 'localidades') {
        setCategory('rede')
        setActiveTab('localidades')
      } else if (['assinatura-diretor', 'materias', 'prazo-frequencia', 'prazo-atividades'].includes(tabParam)) {
        setCategory('escola')
        setActiveTab(tabParam)
      } else if (['perfil', 'push-notifications', 'sessoes', 'assinatura-pessoal'].includes(tabParam)) {
        setCategory('pessoal')
        setActiveTab(tabParam)
      }
    } else if (catParam) {
      if (catParam === 'rede') {
        setCategory('rede')
        setActiveTab('localidades')
      } else if (catParam === 'escola') {
        setCategory('escola')
        setActiveTab('assinatura-diretor')
      } else if (catParam === 'pessoal') {
        setCategory('pessoal')
        setActiveTab('perfil')
      }
    }
  }, [searchParams])

  // Fix #1: Race condition corrigida com flag `cancelled`
  // Fix #7: ilike → eq para e-mails; select apenas campos necessários
  useEffect(() => {
    if (funcionario) {
      setLocalFuncionario(funcionario as FuncionarioLocal)
      return
    }

    let cancelled = false

    const fetchLocal = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!cancelled && user?.email) {
        const { data } = await supabase
          .from('funcionarios')
          .select('id, nome, email, cargo, status, assinatura_url, auth_user_id')
          .eq('email', user.email)
          .maybeSingle()
        if (!cancelled && data) {
          setLocalFuncionario(data as FuncionarioLocal)
        }
      }
    }

    fetchLocal()

    return () => {
      cancelled = true
    }
  }, [funcionario])

  // Sincroniza URL da assinatura pessoal com localFuncionario
  useEffect(() => {
    if (localFuncionario) {
      const url = localFuncionario.assinatura_url
      setAssinaturaPessoalUrl(getVersaoImagemUrl(url))
    }
  }, [localFuncionario])

  // ES-1: Carrega assinatura do diretor quando a escola ativa muda com reset explícito
  useEffect(() => {
    if (!escolaAtivaId) {
      setAssinaturaDiretorUrl(null)
      return
    }

    const supabase = createClient()
    let cancelled = false

    const fetchEscolaSig = async () => {
      const { data } = await supabase
        .from('escolas')
        .select('assinatura_diretor_url')
        .eq('id', escolaAtivaId)
        .maybeSingle()
      if (!cancelled) {
        if (data?.assinatura_diretor_url) {
          setAssinaturaDiretorUrl(getVersaoImagemUrl(data.assinatura_diretor_url))
        } else {
          setAssinaturaDiretorUrl(null)
        }
      }
    }

    fetchEscolaSig()
    return () => { cancelled = true }
  }, [escolaAtivaId])

  // ES-4: Exigir v.ativo !== false na verificação de vínculo de diretor
  const isDiretor = useMemo(() =>
    selectedEscola?.diretor_id === localFuncionario?.id ||
    vinculos.some(
      (v) =>
        v.ativo !== false &&
        v.escola_id === escolaAtivaId &&
        (v.cargo?.toUpperCase() === 'DIRETOR' || v.cargo?.toUpperCase().includes('DIRETOR'))
    ),
    [selectedEscola, localFuncionario, vinculos, escolaAtivaId]
  )

  useEffect(() => {
    if (isDiretor && activeTab === 'assinatura-pessoal') {
      setActiveTab('perfil')
    }
  }, [isDiretor, activeTab])

  const handleSaveDiretorSignature = async () => {
    if (!escolaAtivaId) {
      toast.error('Nenhuma escola ativa selecionada. Por favor, selecione uma escola antes de salvar.')
      return
    }
    if (!newDiretorSignature) {
      toast.error('Nenhuma assinatura foi desenhada para salvar.')
      return
    }
    setLoadingDiretorSig(true)
    const supabase = createClient()

    try {
      const parts = newDiretorSignature.split(';base64,')
      const contentType = parts[0].split(':')[1]
      const raw = window.atob(parts[1])
      const uInt8Array = new Uint8Array(raw.length)
      for (let i = 0; i < raw.length; i++) {
        uInt8Array[i] = raw.charCodeAt(i)
      }
      const blob = new Blob([uInt8Array], { type: contentType })

      const fileName = `escola_${escolaAtivaId}_diretor.png`
      const { error: uploadErr } = await supabase.storage
        .from('assinaturas_alunos')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true })

      if (uploadErr) throw uploadErr

      const { data: pData } = supabase.storage.from('assinaturas_alunos').getPublicUrl(fileName)
      const cleanUrl = pData.publicUrl.split('?')[0]

      const { error: dbErr } = await supabase
        .from('escolas')
        .update({ assinatura_diretor_url: cleanUrl } as any)
        .eq('id', escolaAtivaId)

      if (dbErr) throw dbErr

      setAssinaturaDiretorUrl(getVersaoImagemUrl(cleanUrl, Date.now()))
      setNewDiretorSignature(null)
      toast.success('Assinatura oficial do diretor salva com sucesso!')
    } catch (err: any) {
      toast.error(`Erro ao salvar assinatura do diretor: ${err.message}`)
    } finally {
      setLoadingDiretorSig(false)
    }
  }

  const handleSavePessoalSignature = async () => {
    if (!localFuncionario?.id) {
      toast.error('Funcionário não identificado. Recarregue a página.')
      return
    }
    if (!newPessoalSignature) {
      toast.error('Nenhuma assinatura foi desenhada para salvar.')
      return
    }
    setLoadingPessoalSig(true)
    const supabase = createClient()

    try {
      const parts = newPessoalSignature.split(';base64,')
      const contentType = parts[0].split(':')[1]
      const raw = window.atob(parts[1])
      const uInt8Array = new Uint8Array(raw.length)
      for (let i = 0; i < raw.length; i++) {
        uInt8Array[i] = raw.charCodeAt(i)
      }
      const blob = new Blob([uInt8Array], { type: contentType })

      const fileName = `funcionario_${localFuncionario.id}_assinatura.png`
      const { error: uploadErr } = await supabase.storage
        .from('assinaturas_alunos')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true })

      if (uploadErr) throw uploadErr

      const { data: pData } = supabase.storage.from('assinaturas_alunos').getPublicUrl(fileName)
      const cleanUrl = pData.publicUrl.split('?')[0]

      const { error: dbErr } = await supabase
        .from('funcionarios')
        .update({ assinatura_url: cleanUrl } as any)
        .eq('id', localFuncionario.id)

      if (dbErr) throw dbErr

      setAssinaturaPessoalUrl(getVersaoImagemUrl(cleanUrl, Date.now()))

      if (funcionario) {
        useAuthStore.setState({
          funcionario: {
            ...funcionario,
            assinatura_url: cleanUrl,
          },
        })
      }

      setNewPessoalSignature(null)
      toast.success('Sua assinatura pessoal foi salva com sucesso!')

      if (localFuncionario.auth_user_id) {
        const { invalidarCachePerfil } = await import('@/lib/invalidarCachePerfil')
        await invalidarCachePerfil(localFuncionario.auth_user_id)
      }
    } catch (err: any) {
      toast.error(`Erro ao salvar assinatura pessoal: ${err.message}`)
    } finally {
      setLoadingPessoalSig(false)
    }
  }

  const isPessoalTab = (tab: ActiveTab) =>
    ['perfil', 'push-notifications', 'sessoes', 'assinatura-pessoal'].includes(tab)

  const isEscolaTab = (tab: ActiveTab) =>
    ['assinatura-diretor', 'materias', 'prazo-frequencia', 'prazo-atividades'].includes(tab)

  const isRedeTab = (tab: ActiveTab) =>
    ['localidades'].includes(tab)

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foregroundCustom flex items-center gap-3">
          <Settings className="h-8 w-8 text-[#185FA5] dark:text-[#3ea6ff]" />
          Configurações do Sistema
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie seu perfil pessoal, preferências de tema e parâmetros operacionais do sistema.
        </p>
      </div>

      {/* Alternância Principal: Preferências Pessoais vs Configurações da Escola vs Localidades da Rede */}
      <div className="flex flex-wrap items-center gap-2 border-b border-borderCustom pb-4">
        <button
          type="button"
          onClick={() => {
            selectTab('pessoal', isPessoalTab(activeTab) ? activeTab : 'perfil')
          }}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer shadow-sm',
            category === 'pessoal'
              ? 'bg-[#185FA5] text-white dark:bg-[#3ea6ff] dark:text-zinc-950 font-bold ring-2 ring-[#185FA5]/30'
              : 'bg-card border border-borderCustom text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
          )}
        >
          <User className="h-4 w-4" />
          Preferências Pessoais
        </button>

        {(isDiretor || isAdmin) && (
          <button
            type="button"
            onClick={() => {
              selectTab('escola', isEscolaTab(activeTab) ? activeTab : (isDiretor || isAdmin ? 'assinatura-diretor' : 'materias'))
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer shadow-sm',
              category === 'escola'
                ? 'bg-[#185FA5] text-white dark:bg-[#3ea6ff] dark:text-zinc-950 font-bold ring-2 ring-[#185FA5]/30'
                : 'bg-card border border-borderCustom text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
            )}
          >
            <Building2 className="h-4 w-4" />
            Configurações da Escola (Administrativo)
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              selectTab('rede', 'localidades')
            }}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer shadow-sm',
              category === 'rede'
                ? 'bg-[#185FA5] text-white dark:bg-[#3ea6ff] dark:text-zinc-950 font-bold ring-2 ring-[#185FA5]/30'
                : 'bg-card border border-borderCustom text-muted-foreground hover:text-foreground hover:bg-hoverCustom'
            )}
          >
            <MapPin className="h-4 w-4" />
            Localidades &amp; Território (Rede)
          </button>
        )}
      </div>

      {/* Banner de Escola Foco (Exibido na Seção Administrativa da Escola) */}
      {category === 'escola' && (isDiretor || isAdmin) && (
        <div className="p-4 rounded-2xl bg-card border border-borderCustom shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in-50 duration-200">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#185FA5] dark:text-[#3ea6ff] block mb-0.5">
              Escola Foco (Unidade Ativa)
            </span>
            <h2 className="text-base font-bold text-foregroundCustom">
              {selectedEscola ? selectedEscola.nome : 'Visão Geral da Rede Macro'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Alterne a escola foco para configurar a assinatura do diretor, grade curricular e prazos específicos da unidade.
            </p>
          </div>
          <div className="shrink-0">
            <SchoolSelector />
          </div>
        </div>
      )}

      {/* Cards da Categoria 1: Preferências Pessoais */}
      {category === 'pessoal' && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 animate-in fade-in-50 duration-200">
          <button
            onClick={() => selectTab('pessoal', 'perfil')}
            className={cn(
              'flex items-center gap-4 p-5 rounded-xl border text-left transition-all cursor-pointer shadow-sm',
              activeTab === 'perfil'
                ? 'bg-card border-highlight ring-1 ring-highlight/50'
                : 'bg-card border-borderCustom hover:bg-hoverCustom'
            )}
          >
            <div
              className={cn(
                'p-3 rounded-xl',
                activeTab === 'perfil' ? 'bg-highlight/10 text-highlight' : 'bg-muted text-muted-foreground'
              )}
            >
              <User className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foregroundCustom text-base">Meu Perfil &amp; Aparência</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Ficha funcional, alterar senha e tema do sistema</p>
            </div>
          </button>

          <button
            onClick={() => selectTab('pessoal', 'push-notifications')}
            className={cn(
              'flex items-center gap-4 p-5 rounded-xl border text-left transition-all cursor-pointer shadow-sm',
              activeTab === 'push-notifications'
                ? 'bg-card border-[#185FA5] dark:border-[#3ea6ff] ring-1 ring-[#185FA5]/50 dark:ring-[#3ea6ff]/50'
                : 'bg-card border-borderCustom hover:bg-hoverCustom'
            )}
          >
            <div
              className={cn(
                'p-3 rounded-xl',
                activeTab === 'push-notifications'
                  ? 'bg-[#185FA5]/10 text-[#185FA5] dark:bg-[#3ea6ff]/10 dark:text-[#3ea6ff]'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foregroundCustom text-base">Notificações Push</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Receber avisos no celular ou tablet</p>
            </div>
          </button>

          <button
            onClick={() => selectTab('pessoal', 'sessoes')}
            className={cn(
              'flex items-center gap-4 p-5 rounded-xl border text-left transition-all cursor-pointer shadow-sm',
              activeTab === 'sessoes'
                ? 'bg-card border-[#185FA5] dark:border-[#3ea6ff] ring-1 ring-[#185FA5]/50 dark:ring-[#3ea6ff]/50'
                : 'bg-card border-borderCustom hover:bg-hoverCustom'
            )}
          >
            <div
              className={cn(
                'p-3 rounded-xl',
                activeTab === 'sessoes'
                  ? 'bg-[#185FA5]/10 text-[#185FA5] dark:bg-[#3ea6ff]/10 dark:text-[#3ea6ff]'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foregroundCustom text-base">Sessões Ativas</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Gerenciar conexões e dispositivos logados na sua conta</p>
            </div>
          </button>

          {!isDiretor && (
            <button
              onClick={() => selectTab('pessoal', 'assinatura-pessoal')}
              className={cn(
                'flex items-center gap-4 p-5 rounded-xl border text-left transition-all cursor-pointer shadow-sm',
                activeTab === 'assinatura-pessoal'
                  ? 'bg-card border-[#185FA5] dark:border-[#3ea6ff] ring-1 ring-[#185FA5]/50 dark:ring-[#3ea6ff]/50'
                  : 'bg-card border-borderCustom hover:bg-hoverCustom'
              )}
            >
              <div
                className={cn(
                  'p-3 rounded-xl',
                  activeTab === 'assinatura-pessoal'
                    ? 'bg-[#185FA5]/10 text-[#185FA5] dark:bg-[#3ea6ff]/10 dark:text-[#3ea6ff]'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                <PenTool className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foregroundCustom text-base">Minha Assinatura</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Cadastrar sua assinatura digital pessoal para assinar documentos</p>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Cards da Categoria 2: Configurações da Escola (Administrativo) */}
      {category === 'escola' && (isDiretor || isAdmin) && (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 animate-in fade-in-50 duration-200">
          <button
            onClick={() => selectTab('escola', 'assinatura-diretor')}
            className={cn(
              'flex items-center gap-4 p-5 rounded-xl border text-left transition-all cursor-pointer shadow-sm',
              activeTab === 'assinatura-diretor'
                ? 'bg-card border-[#185FA5] dark:border-[#3ea6ff] ring-1 ring-[#185FA5]/50 dark:ring-[#3ea6ff]/50'
                : 'bg-card border-borderCustom hover:bg-hoverCustom'
            )}
          >
            <div
              className={cn(
                'p-3 rounded-xl',
                activeTab === 'assinatura-diretor'
                  ? 'bg-[#185FA5]/10 text-[#185FA5] dark:bg-[#3ea6ff]/10 dark:text-[#3ea6ff]'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <PenTool className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foregroundCustom text-base">Assinatura do Diretor</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Cadastrar assinatura oficial do gestor para os documentos</p>
            </div>
          </button>

          <button
            onClick={() => selectTab('escola', 'materias')}
            className={cn(
              'flex items-center gap-4 p-5 rounded-xl border text-left transition-all cursor-pointer shadow-sm',
              activeTab === 'materias'
                ? 'bg-card border-[#185FA5] dark:border-[#3ea6ff] ring-1 ring-[#185FA5]/50 dark:ring-[#3ea6ff]/50'
                : 'bg-card border-borderCustom hover:bg-hoverCustom'
            )}
          >
            <div
              className={cn(
                'p-3 rounded-xl',
                activeTab === 'materias'
                  ? 'bg-[#185FA5]/10 text-[#185FA5] dark:bg-[#3ea6ff]/10 dark:text-[#3ea6ff]'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foregroundCustom text-base">Grade Curricular</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Cadastrar matérias da escola e definir base comum/diversificada</p>
            </div>
          </button>

          <button
            onClick={() => selectTab('escola', 'prazo-frequencia')}
            className={cn(
              'flex items-center gap-4 p-5 rounded-xl border text-left transition-all cursor-pointer shadow-sm',
              activeTab === 'prazo-frequencia'
                ? 'bg-card border-[#185FA5] dark:border-[#3ea6ff] ring-1 ring-[#185FA5]/50 dark:ring-[#3ea6ff]/50'
                : 'bg-card border-borderCustom hover:bg-hoverCustom'
            )}
          >
            <div
              className={cn(
                'p-3 rounded-xl',
                activeTab === 'prazo-frequencia'
                  ? 'bg-[#185FA5]/10 text-[#185FA5] dark:bg-[#3ea6ff]/10 dark:text-[#3ea6ff]'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <CalendarClock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foregroundCustom text-base">Prazo de Frequência</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Trava de dias limite para alteração de chamadas passadas</p>
            </div>
          </button>

          <button
            onClick={() => selectTab('escola', 'prazo-atividades')}
            className={cn(
              'flex items-center gap-4 p-5 rounded-xl border text-left transition-all cursor-pointer shadow-sm',
              activeTab === 'prazo-atividades'
                ? 'bg-card border-[#185FA5] dark:border-[#3ea6ff] ring-1 ring-[#185FA5]/50 dark:ring-[#3ea6ff]/50'
                : 'bg-card border-borderCustom hover:bg-hoverCustom'
            )}
          >
            <div
              className={cn(
                'p-3 rounded-xl',
                activeTab === 'prazo-atividades'
                  ? 'bg-[#185FA5]/10 text-[#185FA5] dark:bg-[#3ea6ff]/10 dark:text-[#3ea6ff]'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              <CalendarClock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold text-foregroundCustom text-base">Prazo de Atividades</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Antecedência mínima para envio de atividades à secretaria</p>
            </div>
          </button>
        </div>
      )}

      {/* Conteúdo das abas */}

      {category === 'pessoal' && activeTab === 'perfil' && (
        <PerfilTab
          nome={localFuncionario?.nome ?? 'Usuário'}
          email={localFuncionario?.email ?? '-'}
          cargo={localFuncionario?.cargo ?? vinculos.find((v) => v.ativo)?.cargo ?? 'Servidor'}
          status={localFuncionario?.status ?? 'Ativo'}
          mounted={mounted}
        />
      )}

      {category === 'pessoal' && activeTab === 'sessoes' && (
        <SessoesAtivasTab />
      )}

      {category === 'pessoal' && activeTab === 'push-notifications' && (
        <PushNotificationsTab />
      )}

      {category === 'escola' && activeTab === 'assinatura-diretor' && (isDiretor || isAdmin) && (
        <div className="animate-in fade-in-50 duration-200">
          <Card className="border-borderCustom bg-card p-6">
            <h2 className="mb-5 flex items-center gap-2 border-b border-borderCustom pb-4 text-lg font-semibold text-foregroundCustom">
              <PenTool className="h-5 w-5 text-highlight" />
              Assinatura Oficial do Diretor (Global da Escola)
            </h2>
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Esta assinatura será impressa automaticamente em todos os comprovantes, boletins e documentos oficiais desta escola.
              </p>

              {!escolaAtivaId ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-medium max-w-md">
                  Por favor, selecione uma escola no painel acima para visualizar e gerenciar a assinatura oficial do diretor.
                </div>
              ) : (
                <>
                  <div className="max-w-md">
                    <SignaturePad
                      label="Assinatura Digital"
                      value={newDiretorSignature || assinaturaDiretorUrl}
                      onChange={setNewDiretorSignature}
                      isEditMode={true}
                    />
                  </div>
                  {newDiretorSignature && (
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setNewDiretorSignature(null)}
                        className="text-zinc-400 hover:text-white"
                        disabled={loadingDiretorSig}
                      >
                        Descartar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSaveDiretorSignature}
                        disabled={loadingDiretorSig}
                        className="bg-highlight text-background hover:bg-highlight/90 font-bold"
                      >
                        {loadingDiretorSig ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Salvar Assinatura Oficial
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {category === 'pessoal' && activeTab === 'assinatura-pessoal' && !isDiretor && (
        <div className="animate-in fade-in-50 duration-200">
          <Card className="border-borderCustom bg-card p-6">
            <h2 className="mb-5 flex items-center gap-2 border-b border-borderCustom pb-4 text-lg font-semibold text-foregroundCustom">
              <PenTool className="h-5 w-5 text-highlight" />
              Minha Assinatura Digital Pessoal
            </h2>
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Cadastre sua assinatura digital pessoal. Ela será usada quando você assinar documentos do sistema utilizando o preenchimento automático.
              </p>
              <div className="max-w-md">
                <SignaturePad
                  label="Minha Assinatura"
                  value={newPessoalSignature || assinaturaPessoalUrl}
                  onChange={setNewPessoalSignature}
                  isEditMode={true}
                />
              </div>
              {newPessoalSignature && (
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setNewPessoalSignature(null)}
                    className="text-zinc-400 hover:text-white"
                    disabled={loadingPessoalSig}
                  >
                    Descartar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSavePessoalSignature}
                    disabled={loadingPessoalSig}
                    className="bg-highlight text-background hover:bg-highlight/90 font-bold"
                  >
                    {loadingPessoalSig ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Assinatura
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {category === 'escola' && activeTab === 'materias' && (isDiretor || isAdmin) && (
        <div className="animate-in fade-in-50 duration-200">
          <GradeCurricularTab />
        </div>
      )}

      {category === 'escola' && activeTab === 'prazo-frequencia' && (isDiretor || isAdmin) && (
        <div className="animate-in fade-in-50 duration-200">
          <PrazoFrequenciaTab />
        </div>
      )}

      {category === 'escola' && activeTab === 'prazo-atividades' && (isDiretor || isAdmin) && (
        <div className="animate-in fade-in-50 duration-200">
          <PrazoAtividadesTab />
        </div>
      )}

      {category === 'rede' && activeTab === 'localidades' && isAdmin && (
        <div className="animate-in fade-in-50 duration-200">
          <LocalidadesTab />
        </div>
      )}
    </div>
  )
}

