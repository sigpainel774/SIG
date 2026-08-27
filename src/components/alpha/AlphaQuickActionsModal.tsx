'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  MapPinned,
  Route,
  FileImage,
  ArrowLeftRight,
  Files,
  CheckSquare,
  RefreshCw,
  Stamp,
  Table,
} from 'lucide-react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { createClient } from '@/lib/supabaseClient'
import { sincronizarFilaAlphaGlobal, obterCacheModulosAlpha } from '@/lib/alphaOfflineManager'
import { toast } from 'sonner'

interface AlphaQuickActionsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AlphaQuickActionsModal({ isOpen, onClose }: AlphaQuickActionsModalProps) {
  const supabase = createClient()
  const [funcoesAtivas, setFuncoesAtivas] = useState<any[]>([])

  useEffect(() => {
    let isMounted = true

    async function loadActive() {
      try {
        const cached = await obterCacheModulosAlpha()
        if (isMounted && cached && cached.length > 0) {
          setFuncoesAtivas(cached.filter((f) => f.ativo !== false))
        }
      } catch {}

      if (navigator.onLine) {
        try {
          const { data } = await supabase
            .from('alpha_funcoes')
            .select('*')
            .eq('ativo', true)
            .order('ordem', { ascending: true })

          if (isMounted && data) {
            setFuncoesAtivas(data)
          }
        } catch {}
      }
    }

    if (isOpen) {
      loadActive()
    }

    return () => {
      isMounted = false
    }
  }, [isOpen])

  const handleSyncNow = async () => {
    onClose()
    toast.info('Iniciando sincronização da fila offline...')
    try {
      const res = await sincronizarFilaAlphaGlobal(supabase, undefined, { forcar: true })
      if (res.sincronizados > 0) {
        toast.success(`${res.sincronizados} registro(s) sincronizado(s) com sucesso!`)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sig_visitas_dados_atualizados'))
        }
      } else if (res.erros > 0) {
        toast.error(`Falha ao sincronizar ${res.erros} item(ns).`)
      } else {
        toast.success('Fila offline já está 100% atualizada!')
      }
    } catch {
      toast.error('Erro na sincronização de dados.')
    }
  }

  const allActions = [
    {
      title: 'Visitas.',
      subtitle: 'Desenhar polígonos, pontos e rotas em campo',
      href: '/alpha/visitas',
      icon: MapPinned,
      color: 'from-violet-600 to-indigo-600',
      badge: 'GPS Ativo',
      code: 'visitas',
    },
    {
      title: 'Rotas de Unidades Escolares',
      subtitle: 'Visualizar itinerários e coordenadas',
      href: '/alpha/rotas-escolas',
      icon: Route,
      color: 'from-blue-600 to-cyan-600',
      badge: 'Rotas',
      code: 'rotas-escolas',
    },
    {
      title: 'Comprimir Fotos & Imagens',
      subtitle: 'Otimizar resolução sem perda visual',
      href: '/alpha/compressor-imagens',
      icon: FileImage,
      color: 'from-emerald-600 to-teal-600',
      badge: 'Wasm',
      code: 'compressor-imagens',
    },
    {
      title: 'Converter Imagens (PNG/WebP/JPG)',
      subtitle: 'Conversão em lote instantânea',
      href: '/alpha/conversor-imagens',
      icon: ArrowLeftRight,
      color: 'from-amber-600 to-orange-600',
      badge: 'Zero SaaS',
      code: 'conversor-imagens',
    },
    {
      title: 'Mesclar & Dividir PDFs',
      subtitle: 'Reorganizar páginas e documentos',
      href: '/alpha/manipulador-pdf',
      icon: Files,
      color: 'from-rose-600 to-pink-600',
      badge: 'PDF',
      code: 'manipulador_pdf',
    },
    {
      title: 'Carimbador de Documentos',
      subtitle: 'Inserir carimbos e assinaturas em PDFs',
      href: '/alpha/carimbador-pdf',
      icon: Stamp,
      color: 'from-fuchsia-600 to-purple-600',
      badge: 'Assinatura',
      code: 'carimbador_pdf',
    },
    {
      title: 'Conversor de Planilhas',
      subtitle: 'Exportação e conversão de CSV/XLSX',
      href: '/alpha/conversor-planilhas',
      icon: Table,
      color: 'from-lime-600 to-emerald-600',
      badge: 'Planilhas',
      code: 'conversor_planilhas',
    },
    {
      title: 'Validador de Listas & CPFs',
      subtitle: 'Checar dígitos e remover duplicados',
      href: '/alpha/validador-dados',
      icon: CheckSquare,
      color: 'from-purple-600 to-violet-600',
      badge: 'Auditoria',
      code: 'validador_dados',
    },
  ]

  const actions = useMemo(() => {
    if (funcoesAtivas.length === 0) {
      return allActions
    }
    return allActions.filter((act) =>
      funcoesAtivas.some(
        (fn) =>
          fn.ativo !== false &&
          (fn.rota === act.href ||
            fn.codigo.toLowerCase().replace(/[-_]/g, '') === act.code.toLowerCase().replace(/[-_]/g, ''))
      )
    )
  }, [funcoesAtivas])

  return (
    <StandardDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Ações Rápidas do Laboratório Alpha"
      description="Acesso direto às operações de campo e ferramentas 100% offline."
      maxWidth="sm:max-w-lg"
    >
      <div className="space-y-3 py-1">
        <div className="grid grid-cols-1 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {actions.map((act, index) => {
            const Icon = act.icon
            return (
              <Link
                key={index}
                href={act.href}
                onClick={onClose}
                className="group flex items-center justify-between p-3 rounded-2xl bg-white hover:bg-sidebar-accent/50 border border-sidebar-border hover:border-sidebar-primary/40 transition-all duration-200 active:scale-[0.98] shadow-xs"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${act.color} flex items-center justify-center text-white shrink-0 shadow-xs group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 text-left">
                    <h4 className="text-sm font-semibold text-sidebar-foreground truncate group-hover:text-sidebar-primary transition-colors">
                      {act.title}
                    </h4>
                    <p className="text-xs text-muted-foreground truncate">{act.subtitle}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-sidebar-accent-foreground bg-sidebar-accent px-2 py-0.5 rounded-md border border-sidebar-border shrink-0 ml-2">
                  {act.badge}
                </span>
              </Link>
            )
          })}
        </div>

        <div className="pt-3 border-t border-sidebar-border flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleSyncNow}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sidebar-primary hover:bg-sidebar-primary/90 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Forçar Sincronização da Fila</span>
          </button>
        </div>
      </div>
    </StandardDialog>
  )
}
