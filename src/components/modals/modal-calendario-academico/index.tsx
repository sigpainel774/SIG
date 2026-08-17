'use client'

import React, { useState } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCalendarioAcademico } from '@/hooks/useCalendarioAcademico'
import { LegendaCores } from './LegendaCores'
import { TrimestresSection } from './TrimestresSection'
import { MatrizAnualMeses } from './MatrizAnualMeses'
import { PontosFacultativosSection } from './PontosFacultativosSection'
import { HistoricoModal } from './HistoricoModal'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  History,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  Zap,
  Info
} from 'lucide-react'

interface ModalCalendarioAcademicoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  secretariaId?: string
  secretariaNome?: string
}

export function ModalCalendarioAcademico({
  open,
  onOpenChange,
  secretariaId,
  secretariaNome = 'Secretaria Municipal de Educação'
}: ModalCalendarioAcademicoProps) {
  const currentYear = new Date().getFullYear()
  const {
    anoLetivo,
    setAnoLetivo,
    loading,
    saving,
    hasUnsavedChanges,
    dadosCalendario,
    setCampoCalendario,
    eventosMap,
    definirTipoDia,
    removerEventoDia,
    adicionarPontoFacultativoRapido,
    classificarDia,
    calculoDiasLetivos,
    salvarCalendario,
    historico,
    loadingHistorico,
    carregarHistorico
  } = useCalendarioAcademico({
    secretariaId,
    anoInicial: currentYear
  })

  const [abaAtiva, setAbaAtiva] = useState<'matriz' | 'trimestres' | 'pontos'>('matriz')
  const [modalHistoricoOpen, setModalHistoricoOpen] = useState(false)

  const handleAbrirHistorico = () => {
    carregarHistorico()
    setModalHistoricoOpen(true)
  }

  const handleSalvar = async () => {
    await salvarCalendario()
  }

  return (
    <>
      <StandardDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Calendário Acadêmico da Rede Municipal"
        description={`Planejamento temporal oficial do ano letivo de toda a rede municipal de ensino — ${secretariaNome}.`}
        maxWidth="sm:max-w-6xl"
        footer={
          <div className="flex flex-wrap items-center justify-between w-full gap-3 pt-1">
            <div className="flex items-center gap-3">
              <span
                className={`text-xs px-3 py-1 rounded-full font-bold border flex items-center gap-1.5 ${
                  calculoDiasLetivos.atingiuMeta
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                }`}
              >
                {calculoDiasLetivos.atingiuMeta ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5" />
                )}
                {calculoDiasLetivos.total} / {calculoDiasLetivos.meta} Dias Letivos (LDB)
              </span>

              {hasUnsavedChanges && (
                <span className="text-[11px] text-amber-400 flex items-center gap-1 font-semibold animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  Alterações não salvas
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="text-xs h-9 cursor-pointer"
              >
                Fechar
              </Button>

              <Button
                type="button"
                onClick={handleSalvar}
                disabled={saving}
                className="text-xs h-9 bg-primary text-primary-foreground font-bold hover:bg-primary/90 cursor-pointer shadow-md"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {saving ? 'Salvando...' : 'Salvar Calendário'}
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 py-1">
          {/* Barra de Controle Superior: Navegação por Anos e Abas */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#18181b] border border-[#27272a] rounded-xl p-3 shadow-sm">
            {/* Seletor de Anos */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAnoLetivo((prev) => prev - 1)}
                className="h-8 w-8 p-0 cursor-pointer"
                title="Ano Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <div className="flex items-center gap-1.5 px-3 py-1 bg-background/80 border border-border/60 rounded-lg">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="text-sm font-black text-foreground">{anoLetivo}</span>
                {anoLetivo === currentYear && (
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                    Vigente
                  </Badge>
                )}
                {anoLetivo > currentYear && (
                  <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">
                    Planejamento
                  </Badge>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAnoLetivo((prev) => prev + 1)}
                className="h-8 w-8 p-0 cursor-pointer"
                title="Próximo Ano"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Abas de Navegação */}
            <div className="flex items-center gap-1.5 bg-background/60 border border-border/60 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setAbaAtiva('matriz')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  abaAtiva === 'matriz'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Visão Geral (12 Meses)
              </button>

              <button
                type="button"
                onClick={() => setAbaAtiva('trimestres')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  abaAtiva === 'trimestres'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Trimestres & Recessos
              </button>

              <button
                type="button"
                onClick={() => setAbaAtiva('pontos')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
                  abaAtiva === 'pontos'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Pontos Facultativos & Decretos
              </button>
            </div>

            {/* Botão de Histórico */}
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAbrirHistorico}
                className="h-8 text-xs text-muted-foreground hover:text-foreground border-border/80 cursor-pointer"
              >
                <History className="w-3.5 h-3.5 mr-1.5 text-primary" />
                Histórico
              </Button>
            </div>
          </div>

          {/* Banner Informativo sobre a Rede e Exceção do EMAEE */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Info className="w-4 h-4 text-primary shrink-0" />
              <span>
                Este calendário rege todas as escolas e turmas da rede municipal de educação.{' '}
                <strong className="text-foreground">Exceção:</strong> O módulo EMAEE opera em regime contínuo de atendimento especializado.
              </span>
            </div>
            <span className="text-[11px] font-mono text-primary font-bold">LDB: 200 Dias Mínimos</span>
          </div>

          {/* Conteúdo da Aba Ativa */}
          {abaAtiva === 'matriz' && (
            <div className="space-y-4">
              <LegendaCores />
              <MatrizAnualMeses
                anoLetivo={anoLetivo}
                classificarDia={classificarDia}
                onSalvarDia={definirTipoDia}
                onRemoverDia={removerEventoDia}
              />
            </div>
          )}

          {abaAtiva === 'trimestres' && (
            <TrimestresSection
              dados={dadosCalendario}
              setCampo={setCampoCalendario}
              calculoDias={calculoDiasLetivos}
            />
          )}

          {abaAtiva === 'pontos' && (
            <PontosFacultativosSection
              anoLetivo={anoLetivo}
              eventosMap={eventosMap}
              onAdicionar={definirTipoDia}
              onRemover={removerEventoDia}
            />
          )}
        </div>
      </StandardDialog>

      {/* Modal de Histórico */}
      <HistoricoModal
        open={modalHistoricoOpen}
        onOpenChange={setModalHistoricoOpen}
        historico={historico}
        loading={loadingHistorico}
        onRefresh={carregarHistorico}
        anoLetivo={anoLetivo}
      />
    </>
  )
}
