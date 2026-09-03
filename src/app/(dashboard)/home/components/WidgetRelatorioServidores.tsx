'use client'

import React, { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { FileBarChart, Users, ChevronRight, Loader2 } from 'lucide-react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { createClient } from '@/lib/supabaseClient'

const ModalServidoresDiscriminados = dynamic(
  () => import('@/components/modals/modal-servidores-discriminados').then((m) => m.ModalServidoresDiscriminados),
  { ssr: false }
)
const RelatorioServidores = dynamic(
  () => import('@/components/relatorios/RelatorioServidores'),
  { ssr: false }
)

interface WidgetStats {
  total: number
  concursados: number
  contratados: number
  nomeados: number
  outros: number
}

export function WidgetRelatorioServidores() {
  const [widgetStats, setWidgetStats] = useState<WidgetStats | null>(null)
  const [loadingWidgetStats, setLoadingWidgetStats] = useState(false)
  const [isRelatorioServidoresModalOpen, setIsRelatorioServidoresModalOpen] = useState(false)
  const [isDiscriminadosModalOpen, setIsDiscriminadosModalOpen] = useState(false)
  const [selectedTipoVinculoModal, setSelectedTipoVinculoModal] = useState<string>('Total')

  const handleOpenDiscriminadosModal = (e: React.MouseEvent, vinculo: string) => {
    e.stopPropagation()
    setSelectedTipoVinculoModal(vinculo)
    setIsDiscriminadosModalOpen(true)
  }

  useEffect(() => {
    let active = true
    setLoadingWidgetStats(true)

    const carregarStats = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.rpc('get_relatorio_servidores', {})
        if (!active) return
        if (!error && data && (data as any).resumo) {
          const res = (data as any).resumo
          setWidgetStats({
            total: res.total_servidores_unicos ?? 0,
            concursados: res.total_concursados ?? 0,
            contratados: res.total_contratados ?? 0,
            nomeados: res.total_nomeados ?? 0,
            outros: res.total_outros ?? 0,
          })
        }
      } catch (err) {
        console.error('Erro ao carregar estatísticas do widget:', err)
      } finally {
        if (active) setLoadingWidgetStats(false)
      }
    }

    carregarStats()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-4 pt-6 border-t border-borderCustom">
      <div className="flex items-center gap-2.5">
        <FileBarChart className="w-5 h-5 text-emerald-400" />
        <h2 className="text-lg font-bold text-foreground">Indicadores & Relatórios Consolidados</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Widget 1: Relatório de Servidores */}
        <div
          onClick={() => setIsRelatorioServidoresModalOpen(true)}
          className="group bg-surface-1 border border-borderCustom hover:border-emerald-500/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer space-y-4 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-foreground group-hover:text-emerald-400 transition-colors">
                  Relatório de Servidores
                </h3>
                <p className="text-xs text-muted-foreground">Consolidado por Vínculo Empregatício</p>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              Ver Detalhes
            </span>
          </div>

          {/* Métricas resumidas no widget */}
          {loadingWidgetStats ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div
                onClick={(e) => handleOpenDiscriminadosModal(e, 'Total')}
                className="bg-background/50 hover:bg-background/80 p-3 rounded-xl border border-borderCustom/50 hover:border-primary/50 transition-all cursor-pointer group/item"
                title="Clique para ver todos os servidores discriminados por secretarias"
              >
                <span className="text-[11px] text-muted-foreground block font-medium group-hover/item:text-foreground transition-colors">Total de Servidores</span>
                <span className="text-xl font-bold text-foreground">{widgetStats?.total ?? 0}</span>
              </div>

              <div
                onClick={(e) => handleOpenDiscriminadosModal(e, 'Concursado')}
                className="bg-background/50 hover:bg-background/80 p-3 rounded-xl border border-borderCustom/50 hover:border-blue-500/50 transition-all cursor-pointer group/item"
                title="Clique para ver Concursados discriminados por secretarias"
              >
                <span className="text-[11px] text-blue-400 block font-medium group-hover/item:underline">Concursados</span>
                <span className="text-xl font-bold text-blue-400">{widgetStats?.concursados ?? 0}</span>
              </div>

              <div
                onClick={(e) => handleOpenDiscriminadosModal(e, 'Contratado')}
                className="bg-background/50 hover:bg-background/80 p-3 rounded-xl border border-borderCustom/50 hover:border-emerald-500/50 transition-all cursor-pointer group/item"
                title="Clique para ver Contratados discriminados por secretarias"
              >
                <span className="text-[11px] text-emerald-400 block font-medium group-hover/item:underline">Contratados</span>
                <span className="text-xl font-bold text-emerald-400">{widgetStats?.contratados ?? 0}</span>
              </div>

              <div
                onClick={(e) => handleOpenDiscriminadosModal(e, 'Nomeado')}
                className="bg-background/50 hover:bg-background/80 p-3 rounded-xl border border-borderCustom/50 hover:border-purple-500/50 transition-all cursor-pointer group/item"
                title="Clique para ver Nomeados discriminados por secretarias"
              >
                <span className="text-[11px] text-purple-400 block font-medium group-hover/item:underline">Nomeados</span>
                <span className="text-xl font-bold text-purple-400">{widgetStats?.nomeados ?? 0}</span>
              </div>
            </div>
          )}

          <div className="text-[11px] text-muted-foreground pt-1 flex items-center justify-between border-t border-borderCustom/40">
            <span>Clique para abrir o relatório gerencial completo</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Modal de Relatório de Servidores */}
      {isRelatorioServidoresModalOpen && (
        <StandardDialog
          open={isRelatorioServidoresModalOpen}
          onOpenChange={setIsRelatorioServidoresModalOpen}
          title="Relatório Geral de Servidores da Rede Municipal"
          description="Consolidado de pessoal, distribuição por cargos, modalidades e tipos de vínculo."
          maxWidth="sm:max-w-6xl"
        >
          <div className="py-2">
            <RelatorioServidores />
          </div>
        </StandardDialog>
      )}

      {/* Modal de Servidores Discriminados por Secretaria e Unidades */}
      {isDiscriminadosModalOpen && (
        <ModalServidoresDiscriminados
          open={isDiscriminadosModalOpen}
          onOpenChange={setIsDiscriminadosModalOpen}
          tipoVinculoInicial={selectedTipoVinculoModal}
        />
      )}
    </div>
  )
}
