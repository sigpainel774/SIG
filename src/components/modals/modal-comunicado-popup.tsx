'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import {
  BellRing,
  X,
  Paperclip,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Users,
  CalendarDays,
  ClipboardList,
  Megaphone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ComunicadoCorpo } from '@/components/mural/comunicado-corpo'

interface ComunicadoPopup {
  id: string
  title: string
  body: string
  date: string
  target: string
  categoria?: string
  leitura_obrigatoria?: boolean
  turma_ids?: string[] | null
  escola_ids?: string[] | null
  anexo_url?: string | null
  anexo_nome?: string | null
  created_at: string
  expira_em?: string | null
  criado_por?: {
    nome?: string
  } | null
}

export function ModalComunicadoPopup() {
  const { funcionario, acessos, vinculos } = useAuthStore()
  const { selectedSecretaria, selectedEscola } = useSchoolStore()
  const [popups, setPopups] = useState<ComunicadoPopup[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const authUserId = funcionario?.auth_user_id || null

  const isTargetForUser = useMemo(() => {
    return (target: string): boolean => {
      if (!target || target === 'Geral / Toda a Rede' || target === 'Selecione o Público Alvo') return true

      const cargoUser = (funcionario?.cargo || '').toLowerCase()
      const isProf =
        cargoUser.includes('professor') || vinculos.some((v) => (v.cargo || '').toLowerCase().includes('professor'))

      if (target === 'Professores' && isProf) return true

      if (target === 'Equipe Administrativa') {
        const isAdmin =
          funcionario?.is_superadmin || acessos.some((a) => a.pode_mural || a.pode_alunos || a.pode_funcionarios)
        if (
          isAdmin ||
          cargoUser.includes('secretar') ||
          cargoUser.includes('diretor') ||
          cargoUser.includes('coordenad')
        ) {
          return true
        }
      }

      if (target === 'Equipe de Cozinha / Limpeza') {
        if (
          cargoUser.includes('cozin') ||
          cargoUser.includes('merend') ||
          cargoUser.includes('limpez') ||
          cargoUser.includes('serviços gerais')
        ) {
          return true
        }
      }

      if (target.toLowerCase() === cargoUser) return true
      if (funcionario?.email && target.toLowerCase() === funcionario.email.toLowerCase()) return true
      if (funcionario?.id && target.toLowerCase() === funcionario.id.toLowerCase()) return true
      if (funcionario?.auth_user_id && target.toLowerCase() === funcionario.auth_user_id.toLowerCase()) return true

      return false
    }
  }, [funcionario, acessos, vinculos])

  useEffect(() => {
    let active = true
    const fetchPopups = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        const currentAuthUserId = user?.id || authUserId

        if (!currentAuthUserId) return

        const { data: readData, error: readError } = await (supabase.from as any)('comunicados_lidos')
          .select('comunicado_id')
          .eq('user_id', currentAuthUserId)

        if (readError) {
          console.error('Erro ao buscar comunicados lidos:', readError)
        }

        const dismissedIds = readData ? readData.map((r: any) => r.comunicado_id) : []

        let query = (supabase.from as any)('comunicados')
          .select(
            'id, title, body, target, categoria, leitura_obrigatoria, turma_ids, date, anexo_url, anexo_nome, escola_ids, created_at, expira_em, criado_por:funcionarios(nome)'
          )
          .eq('is_popup', true)
          .or('status.eq.publicado,status.is.null')
          .order('created_at', { ascending: false })
          .limit(10)

        if (selectedSecretaria?.id) {
          query = query.eq('secretaria_id', selectedSecretaria.id)
        }

        const { data, error } = await query

        if (!active) return

        if (error) {
          console.error('Erro ao buscar comunicados pop-up:', error)
          return
        }

        if (data && data.length > 0) {
          const userEscolaIds = new Set<string>()
          if (selectedEscola?.id) userEscolaIds.add(selectedEscola.id)
          if (vinculos && Array.isArray(vinculos)) {
            vinculos.forEach((v) => {
              if (v.escola_id) userEscolaIds.add(v.escola_id)
            })
          }
          if (acessos && Array.isArray(acessos)) {
            acessos.forEach((a) => {
              if (a.escola_id) userEscolaIds.add(a.escola_id)
            })
          }

          const isSuperOuNivel1 = funcionario?.is_superadmin || acessos.some((a) => a.nivel === 1 && a.ativo)

          // Data de registro do usuário para isolar comunicados antigos anteriores ao seu cadastro (Opção 1)
          const userRegistrationTime = funcionario?.created_at
            ? new Date(funcionario.created_at).getTime()
            : user?.created_at
            ? new Date(user.created_at).getTime()
            : null

          const now = Date.now()

          const pending = data.filter((item: any) => {
            const isUnread = !dismissedIds.includes(item.id)
            const targeted = isTargetForUser(item.target)

            // Regra 1 (Opção 1): Não disparar pop-ups criados antes da data de cadastro do usuário
            const noticeCreatedAt = item.created_at ? new Date(item.created_at).getTime() : 0
            const isCreatedAfterUser = !userRegistrationTime || noticeCreatedAt >= userRegistrationTime

            // Regra 2 (Opção 2): Não disparar pop-ups cuja data de validade já expirou
            const isNotExpired = !item.expira_em || new Date(item.expira_em).getTime() > now

            // Verificação de unidade escolar
            let isUnidadeTarget = true
            if (item.escola_ids && Array.isArray(item.escola_ids) && item.escola_ids.length > 0) {
              const hasVinculoNaUnidade = item.escola_ids.some((id: string) => userEscolaIds.has(id))
              isUnidadeTarget = isSuperOuNivel1 || hasVinculoNaUnidade
            }

            return isUnread && targeted && isUnidadeTarget && isCreatedAfterUser && isNotExpired
          })

          if (pending.length > 0) {
            setPopups(pending as ComunicadoPopup[])
            setCurrentIndex(0)
            setOpen(true)
          } else {
            setOpen(false)
          }
        }
      } catch (err) {
        console.error('Falha ao processar modal de comunicados pop-up:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    fetchPopups()

    // Assinatura em Tempo Real via Supabase Realtime para que novos comunicados apareçam instantaneamente
    const supabaseClient = createClient()
    const channel = supabaseClient
      .channel('realtime_comunicados_popup_watcher')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comunicados',
        },
        () => {
          if (active) {
            fetchPopups()
          }
        }
      )
      .subscribe()

    return () => {
      active = false
      supabaseClient.removeChannel(channel)
    }
  }, [
    authUserId,
    isTargetForUser,
    selectedSecretaria?.id,
    selectedEscola?.id,
    vinculos,
    funcionario?.is_superadmin,
    funcionario?.created_at,
    acessos,
  ])

  // Scroll lock no body quando o modal estiver aberto
  useEffect(() => {
    if (open) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [open])

  const activeNotice = popups[currentIndex]

  const handleDismiss = async () => {
    if (!activeNotice) return

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const currentAuthUserId = user?.id || authUserId

      if (currentAuthUserId) {
        await (supabase.from as any)('comunicados_lidos').upsert(
          { user_id: currentAuthUserId, comunicado_id: activeNotice.id },
          { onConflict: 'comunicado_id,user_id' }
        )
      }
    } catch (e) {
      console.error('Erro ao registrar leitura de popup', e)
    }

    if (currentIndex + 1 < popups.length) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      setOpen(false)
    }
  }

  const handleCloseByX = () => {
    // Se a leitura for obrigatória, o usuário deve clicar formalmente no botão "Confirmar Leitura"
    if (activeNotice?.leitura_obrigatoria) return
    handleDismiss()
  }

  if (!open || !activeNotice) return null

  const getCategoriaBadge = (cat?: string) => {
    switch (cat) {
      case 'urgente':
        return {
          icon: <AlertCircle className="w-3 h-3 text-red-400" />,
          label: 'Urgente',
          className: 'text-red-400 bg-red-500/10 border-red-500/30',
        }
      case 'reuniao':
        return {
          icon: <Users className="w-3 h-3 text-blue-400" />,
          label: 'Reunião',
          className: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
        }
      case 'calendario':
        return {
          icon: <CalendarDays className="w-3 h-3 text-purple-400" />,
          label: 'Calendário',
          className: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
        }
      case 'administrativo':
        return {
          icon: <ClipboardList className="w-3 h-3 text-amber-400" />,
          label: 'Administrativo',
          className: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        }
      default:
        return {
          icon: <Megaphone className="w-3 h-3 text-highlight" />,
          label: 'Geral',
          className: 'text-highlight bg-highlight/10 border-highlight/20',
        }
    }
  }

  const catBadge = getCategoriaBadge(activeNotice.categoria)

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Fundo desfoque (backdrop blur) */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => {
          if (!activeNotice.leitura_obrigatoria) handleDismiss()
        }}
      />

      {/* Caixa Central do Modal */}
      <div className="relative w-[94vw] sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col rounded-2xl bg-card border border-amber-500/30 dark:border-amber-500/40 shadow-2xl p-5 sm:p-7 z-10 overflow-hidden text-foreground">
        {/* Glow ornamental no topo */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-36 bg-amber-500/10 blur-3xl pointer-events-none rounded-full" />

        {/* Header do Comunicado Pop-up */}
        <div className="flex items-start justify-between gap-4 shrink-0 pb-3.5 border-b border-borderCustom/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Comunicado Importante
                </span>

                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${catBadge.className}`}
                >
                  {catBadge.icon}
                  {catBadge.label}
                </span>

                {activeNotice.leitura_obrigatoria && (
                  <span className="text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Leitura Obrigatória
                  </span>
                )}

                {activeNotice.target && (
                  <span className="text-[11px] font-semibold text-muted-foreground bg-input border border-borderCustom px-2.5 py-0.5 rounded-full">
                    {activeNotice.target}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight mt-1.5 line-clamp-2">
                {activeNotice.title}
              </h2>
            </div>
          </div>

          {/* Botão Fechar X (visível apenas se não for leitura obrigatória) */}
          {!activeNotice.leitura_obrigatoria && (
            <button
              type="button"
              onClick={handleCloseByX}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-hoverCustom active:bg-hoverCustom/80 transition-colors cursor-pointer shrink-0 touch-manipulation flex items-center justify-center min-w-[38px] min-h-[38px] border border-borderCustom/40"
              title="Fechar Comunicado"
              aria-label="Fechar Comunicado"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Conteúdo do Comunicado com Suporte a Formatação / Markdown */}
        <div className="flex-1 overflow-y-auto my-4 pr-1 text-sm sm:text-base leading-relaxed text-foreground/90 space-y-4 font-normal">
          <ComunicadoCorpo texto={activeNotice.body} />

          {/* Anexo se houver */}
          {activeNotice.anexo_url && (
            <div className="pt-2">
              <a
                href={activeNotice.anexo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3.5 py-2 rounded-xl transition-all"
              >
                <Paperclip className="h-4 w-4 shrink-0" />
                <span className="truncate">Anexo: {activeNotice.anexo_nome || 'Visualizar documento'}</span>
              </a>
            </div>
          )}
        </div>

        {/* Footer com Metadados e Ação de Confirmação */}
        <div className="pt-3.5 border-t border-borderCustom/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <span>
              Data:{' '}
              {activeNotice.date ? new Date(`${activeNotice.date}T00:00:00`).toLocaleDateString('pt-BR') : 'Hoje'}
            </span>
            {activeNotice.criado_por?.nome && (
              <span className="hidden sm:inline">• Publicado por: {activeNotice.criado_por.nome}</span>
            )}
          </div>

          <Button
            type="button"
            onClick={handleDismiss}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold h-11 sm:h-12 px-6 rounded-xl shadow-md shadow-amber-500/20 text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Confirmar Leitura</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
