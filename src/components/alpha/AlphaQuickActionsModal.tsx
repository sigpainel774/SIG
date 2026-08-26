'use client'

import React from 'react'
import Link from 'next/link'
import {
  MapPinned,
  Route,
  FileImage,
  ArrowLeftRight,
  Files,
  CheckSquare,
  RefreshCw,
} from 'lucide-react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { createClient } from '@/lib/supabaseClient'
import { sincronizarFilaAlphaGlobal } from '@/lib/alphaOfflineManager'
import { toast } from 'sonner'

interface AlphaQuickActionsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AlphaQuickActionsModal({ isOpen, onClose }: AlphaQuickActionsModalProps) {
  const supabase = createClient()

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

  const actions = [
    {
      title: 'Visitas.',
      subtitle: 'Desenhar polígonos, pontos e rotas em campo',
      href: '/alpha/visitas',
      icon: MapPinned,
      color: 'from-violet-600 to-indigo-600',
      badge: 'GPS Ativo',
    },
    {
      title: 'Rotas de Unidades Escolares',
      subtitle: 'Visualizar itinerários e coordenadas',
      href: '/alpha/rotas-escolas',
      icon: Route,
      color: 'from-blue-600 to-cyan-600',
      badge: 'Rotas',
    },
    {
      title: 'Comprimir Fotos & Imagens',
      subtitle: 'Otimizar resolução sem perda visual',
      href: '/alpha/compressor-imagens',
      icon: FileImage,
      color: 'from-emerald-600 to-teal-600',
      badge: 'Wasm',
    },
    {
      title: 'Converter Imagens (PNG/WebP/JPG)',
      subtitle: 'Conversão em lote instantânea',
      href: '/alpha/conversor-imagens',
      icon: ArrowLeftRight,
      color: 'from-amber-600 to-orange-600',
      badge: 'Zero SaaS',
    },
    {
      title: 'Mesclar & Dividir PDFs',
      subtitle: 'Reorganizar páginas e documentos',
      href: '/alpha/manipulador-pdf',
      icon: Files,
      color: 'from-rose-600 to-pink-600',
      badge: 'PDF',
    },
    {
      title: 'Validador de Listas & CPFs',
      subtitle: 'Checar dígitos e remover duplicados',
      href: '/alpha/validador-dados',
      icon: CheckSquare,
      color: 'from-purple-600 to-violet-600',
      badge: 'Auditoria',
    },
  ]

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
                className="group flex items-center justify-between p-3 rounded-2xl bg-card dark:bg-[#181d28] hover:bg-accent/40 dark:hover:bg-[#202738] border border-border dark:border-[#2a3447] hover:border-primary/40 transition-all duration-200 active:scale-[0.98] shadow-xs"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${act.color} flex items-center justify-center text-white shrink-0 shadow-xs group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 text-left">
                    <h4 className="text-sm font-semibold text-foreground dark:text-slate-100 truncate group-hover:text-primary transition-colors">
                      {act.title}
                    </h4>
                    <p className="text-xs text-muted-foreground dark:text-slate-400 truncate">{act.subtitle}</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-accent-foreground dark:text-slate-300 bg-accent dark:bg-[#202738] px-2 py-0.5 rounded-md border border-border dark:border-[#2a3447] shrink-0 ml-2">
                  {act.badge}
                </span>
              </Link>
            )
          })}
        </div>

        <div className="pt-3 border-t border-border dark:border-[#26262a] flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleSyncNow}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Forçar Sincronização da Fila</span>
          </button>
        </div>
      </div>
    </StandardDialog>
  )
}
