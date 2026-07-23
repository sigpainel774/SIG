'use client'

import { useState, useEffect, useMemo } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { SchoolSelector } from '@/components/SchoolSelector'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
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

// Fix #8: Tipo explícito derivado do schema Supabase — sem any
type FuncionarioRow = Database['public']['Tables']['funcionarios']['Row']
type FuncionarioLocal = Pick<
  FuncionarioRow,
  'id' | 'nome' | 'email' | 'cargo' | 'status' | 'assinatura_url' | 'auth_user_id'
>

type ActiveTab = 'perfil' | 'sessoes' | 'assinatura-diretor' | 'assinatura-pessoal' | 'materias' | 'prazo-frequencia' | 'prazo-atividades'

export function ConfiguracoesClient() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('perfil')
  const [mounted, setMounted] = useState(false)

  const { funcionario, vinculos, isAdminGlobalOrRoot, escolaAtivaId } = useAuthStore()
  const { selectedEscola } = useSchoolStore()
  const isAdmin = isAdminGlobalOrRoot()

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
          // Fix #7: eq (comparação exata) em vez de ilike (evita bugs com % e _ em e-mails)
          .eq('email', user.email)
          .maybeSingle()
        if (!cancelled && data) {
          setLocalFuncionario(data as FuncionarioLocal)
        }
      }
    }

    fetchLocal()

    // Cleanup: cancela o setState se o componente for desmontado antes da resposta
    return () => {
      cancelled = true
    }
  }, [funcionario])

  // Sincroniza URL da assinatura pessoal com localFuncionario
  useEffect(() => {
    if (localFuncionario) {
      // Fix #4: exibe com cache-buster para evitar imagem obsoleta do browser
      const url = localFuncionario.assinatura_url
      setAssinaturaPessoalUrl(url ? `${url.split('?')[0]}?t=${Date.now()}` : null)
    }
  }, [localFuncionario])

  // Carrega assinatura do diretor quando a escola ativa muda
  useEffect(() => {
    if (!escolaAtivaId) return

    const supabase = createClient()
    let cancelled = false

    const fetchEscolaSig = async () => {
      const { data } = await supabase
        .from('escolas')
        .select('assinatura_diretor_url')
        .eq('id', escolaAtivaId)
        .maybeSingle()
      if (!cancelled && data?.assinatura_diretor_url) {
        // Fix #4: cache-buster na exibição
        const url = data.assinatura_diretor_url
        setAssinaturaDiretorUrl(`${url.split('?')[0]}?t=${Date.now()}`)
      }
    }

    fetchEscolaSig()
    return () => { cancelled = true }
  }, [escolaAtivaId])

  // Fix #3: useMemo para evitar recalcular e instabilidade de deps no useEffect abaixo
  const isDiretor = useMemo(() =>
    selectedEscola?.diretor_id === localFuncionario?.id ||
    vinculos.some(
      (v) =>
        v.escola_id === escolaAtivaId &&
        (v.cargo?.toUpperCase() === 'DIRETOR' || v.cargo?.toUpperCase().includes('DIRETOR'))
    ),
    [selectedEscola, localFuncionario, vinculos, escolaAtivaId]
  )

  // Fix #3: isDiretor estabilizado por useMemo — sem loop de re-render
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
      // Fix #4: URL limpa (sem timestamp) vai para o banco
      const cleanUrl = pData.publicUrl.split('?')[0]

      const { error: dbErr } = await supabase
        .from('escolas')
        .update({ assinatura_diretor_url: cleanUrl } as any)
        .eq('id', escolaAtivaId)

      if (dbErr) throw dbErr

      // Fix #4: exibe com cache-buster para o browser não usar versão antiga
      setAssinaturaDiretorUrl(`${cleanUrl}?t=${Date.now()}`)
      setNewDiretorSignature(null)
      toast.success('Assinatura global do diretor salva com sucesso!')
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
      // Fix #4: URL limpa vai para o banco
      const cleanUrl = pData.publicUrl.split('?')[0]

      const { error: dbErr } = await supabase
        .from('funcionarios')
        .update({ assinatura_url: cleanUrl } as any)
        .eq('id', localFuncionario.id)

      if (dbErr) throw dbErr

      // Fix #4: exibe com cache-buster
      setAssinaturaPessoalUrl(`${cleanUrl}?t=${Date.now()}`)

      // Fix #2: spread seguro — só atualiza o Zustand se `funcionario` não for null
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foregroundCustom flex items-center gap-3">
          <Settings className="h-8 w-8 text-[#185FA5] dark:text-[#3ea6ff]" />
          Configurações do Sistema
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie seu perfil pessoal, preferências de tema e permissões de acesso ao sistema.
        </p>
      </div>

      {/* Navegação por cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <button
          onClick={() => setActiveTab('perfil')}
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
          onClick={() => setActiveTab('sessoes')}
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

        {(isDiretor || isAdmin) && (
          <button
            onClick={() => setActiveTab('assinatura-diretor')}
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
        )}

        {!isDiretor && (
          <button
            onClick={() => setActiveTab('assinatura-pessoal')}
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

        {(isDiretor || isAdmin) && (
          <button
            onClick={() => setActiveTab('materias')}
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
        )}

        {(isDiretor || isAdmin) && (
          <button
            onClick={() => setActiveTab('prazo-frequencia')}
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
        )}

        {(isDiretor || isAdmin) && (
          <button
            onClick={() => setActiveTab('prazo-atividades')}
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
        )}
      </div>

      {/* Conteúdo das abas */}

      {activeTab === 'perfil' && (
        <PerfilTab
          nome={localFuncionario?.nome ?? 'Usuário'}
          email={localFuncionario?.email ?? '-'}
          cargo={localFuncionario?.cargo ?? vinculos.find((v) => v.ativo)?.cargo ?? 'Servidor'}
          status={localFuncionario?.status ?? 'Ativo'}
          mounted={mounted}
        />
      )}

      {activeTab === 'sessoes' && (
        <SessoesAtivasTab />
      )}

      {activeTab === 'assinatura-diretor' && (isDiretor || isAdmin) && (
        <div className="animate-in fade-in-50 duration-200">
          <Card className="border-borderCustom bg-card p-6">
            <h2 className="mb-5 flex items-center gap-2 border-b border-borderCustom pb-4 text-lg font-semibold text-foregroundCustom">
              <PenTool className="h-5 w-5 text-highlight" />
              Assinatura Oficial do Diretor (Global)
            </h2>
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Esta assinatura será impressa automaticamente em todos os comprovantes, boletins e documentos oficiais desta escola.
              </p>

              {isAdmin && (
                <div className="flex flex-col gap-2 p-4 bg-surface-2 rounded-xl border border-borderCustom max-w-md">
                  <span className="text-xs font-semibold text-foregroundCustom">Selecione a Escola para configurar:</span>
                  <SchoolSelector />
                </div>
              )}

              {!escolaAtivaId ? (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-medium max-w-md">
                  Por favor, selecione uma escola para visualizar e gerenciar a assinatura oficial do diretor.
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

      {activeTab === 'assinatura-pessoal' && !isDiretor && (
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

      {activeTab === 'materias' && (isDiretor || isAdmin) && (
        <div className="animate-in fade-in-50 duration-200">
          <GradeCurricularTab />
        </div>
      )}

      {activeTab === 'prazo-frequencia' && (isDiretor || isAdmin) && (
        <div className="animate-in fade-in-50 duration-200">
          <PrazoFrequenciaTab />
        </div>
      )}

      {activeTab === 'prazo-atividades' && (isDiretor || isAdmin) && (
        <div className="animate-in fade-in-50 duration-200">
          <PrazoAtividadesTab />
        </div>
      )}
    </div>
  )
}
