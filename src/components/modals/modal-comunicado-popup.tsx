'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import { BellRing, X, Paperclip, CheckCircle2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ComunicadoPopup {
  id: string
  title: string
  body: string
  date: string
  target: string
  anexo_url?: string | null
  anexo_nome?: string | null
  created_at: string
  criado_por?: {
    nome?: string
  } | null
}

// Funções removidas: agora o status de lido fica na tabela comunicados_lidos

export function ModalComunicadoPopup() {
  const { funcionario, acessos, vinculos } = useAuthStore()
  const { selectedSecretaria } = useSchoolStore()
  const [popups, setPopups] = useState<ComunicadoPopup[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const authUserId = funcionario?.auth_user_id || null

  const isTargetForUser = useMemo(() => {
    return (target: string): boolean => {
      if (!target || target === 'Geral / Toda a Rede') return true

      const cargoUser = (funcionario?.cargo || '').toLowerCase()
      const isProf = cargoUser.includes('professor') || vinculos.some((v) => (v.cargo || '').toLowerCase().includes('professor'))

      if (target === 'Professores' && isProf) return true

      if (target === 'Equipe Administrativa') {
        const isAdmin = funcionario?.is_superadmin || acessos.some((a) => a.pode_mural || a.pode_alunos || a.pode_funcionarios)
        if (isAdmin || cargoUser.includes('secretar') || cargoUser.includes('diretor') || cargoUser.includes('coordenad')) {
          return true
        }
      }

      if (target === 'Equipe de Cozinha / Limpeza') {
        if (cargoUser.includes('cozin') || cargoUser.includes('merend') || cargoUser.includes('limpez') || cargoUser.includes('serviços gerais')) {
          return true
        }
      }

      if (target.toLowerCase() === cargoUser) return true

      return false
    }
  }, [funcionario, acessos, vinculos])

  useEffect(() => {
    let active = true
    const fetchPopups = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
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
          .select('id, title, body, target, date, anexo_url, anexo_nome, created_at, criado_por:funcionarios(nome)')
          .eq('is_popup', true)
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
          const pending = data.filter((item: any) => {
            const isUnread = !dismissedIds.includes(item.id)
            const targeted = isTargetForUser(item.target)
            return isUnread && targeted
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

    return () => {
      active = false
    }
  }, [authUserId, isTargetForUser, selectedSecretaria?.id])

  // Scroll lock no body do celular/desktop quando o modal estiver aberto
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
      const { data: { user } } = await supabase.auth.getUser()
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

  if (!open || !activeNotice) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Fundo desfoque (backdrop blur) com alta opacidade para leituras em celular */}
      <div 
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity" 
        onClick={handleDismiss}
      />

      {/* Caixa Central do Modal */}
      <div className="relative w-[94vw] sm:max-w-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col rounded-2xl bg-[#141416] border border-amber-500/40 shadow-[0_0_40px_rgba(245,158,11,0.25)] p-5 sm:p-7 z-10 overflow-hidden text-foregroundCustom">
        
        {/* Glow ornamental no topo */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-36 bg-amber-500/15 blur-3xl pointer-events-none rounded-full" />

        {/* Header do Comunicado Pop-up */}
        <div className="flex items-start justify-between gap-4 shrink-0 pb-3 border-b border-borderCustom/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0 shadow-inner">
              <BellRing className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Comunicado Importante
                </span>
                {activeNotice.target && (
                  <span className="text-[11px] font-semibold text-muted-foreground bg-surface-2 px-2 py-0.5 rounded-full">
                    {activeNotice.target}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight mt-1.5 line-clamp-2">
                {activeNotice.title}
              </h2>
            </div>
          </div>

          {/* Botão X adaptado com alta sensibilidade tátil para celular */}
          <button
            type="button"
            onClick={handleDismiss}
            className="p-2.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10 active:bg-white/20 transition-colors cursor-pointer shrink-0 touch-manipulation flex items-center justify-center min-w-[44px] min-h-[44px]"
            title="Fechar Comunicado"
            aria-label="Fechar Comunicado"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conteúdo do Comunicado (com rolagem interna para celulares) */}
        <div className="flex-1 overflow-y-auto my-4 pr-1 text-sm sm:text-base leading-relaxed text-foregroundCustom/90 whitespace-pre-line space-y-4 font-normal">
          {activeNotice.body}

          {/* Anexo se houver */}
          {activeNotice.anexo_url && (
            <div className="pt-2">
              <a
                href={activeNotice.anexo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3.5 py-2 rounded-xl transition-all"
              >
                <Paperclip className="h-4 w-4 shrink-0" />
                <span className="truncate">Anexo: {activeNotice.anexo_nome || 'Visualizar documento'}</span>
              </a>
            </div>
          )}
        </div>

        {/* Footer com Metadados e Ação */}
        <div className="pt-3 border-t border-borderCustom/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <span>Data: {activeNotice.date ? new Date(`${activeNotice.date}T00:00:00`).toLocaleDateString('pt-BR') : 'Hoje'}</span>
            {activeNotice.criado_por?.nome && (
              <span className="hidden sm:inline">• Publicado por: {activeNotice.criado_por.nome}</span>
            )}
          </div>

          <Button
            type="button"
            onClick={handleDismiss}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-black font-extrabold h-11 sm:h-12 px-6 rounded-xl shadow-lg shadow-amber-500/20 text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Lido</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
