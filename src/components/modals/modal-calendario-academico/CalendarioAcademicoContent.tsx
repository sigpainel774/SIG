'use client'

import React, { useState } from 'react'
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
  Layers,
  Zap,
  Info,
  RefreshCw
} from 'lucide-react'

export interface CalendarioAcademicoContentProps {
  secretariaId?: string
  secretariaNome?: string
  onClose?: () => void
  showCloseButton?: boolean
}

export function CalendarioAcademicoContent({
  secretariaId,
  secretariaNome,
  onClose,
  showCloseButton = false
}: CalendarioAcademicoContentProps) {
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
    classificarDia,
    calculoDiasLetivos,
    salvarCalendario,
    historico,
    loadingHistorico,
    carregarHistorico,
    resolvedSecretariaNome
  } = useCalendarioAcademico({
    secretariaId,
    anoInicial: currentYear
  })

  const nomeExibicao = secretariaNome || resolvedSecretariaNome || 'Secretaria Municipal de Educação'

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
    <div className="space-y-4">
      {/* Barra de Controle Superior: Navegação por Anos, Abas e Ações */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card border border-border rounded-xl p-3 shadow-xs">
        {/* Seletor de Anos */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAnoLetivo((prev) => prev - 1)}
            className="h-8 w-8 p-0 cursor-pointer bg-background"
            title="Ano Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-background border border-border/80 rounded-lg">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-black text-foreground">{anoLetivo}</span>
            {anoLetivo === currentYear && (
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                Vigente
              </Badge>
            )}
            {anoLetivo > currentYear && (
              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
                Planejamento
              </Badge>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAnoLetivo((prev) => prev + 1)}
            className="h-8 w-8 p-0 cursor-pointer bg-background"
            title="Próximo Ano"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Abas de Navegação */}
        <div className="flex flex-wrap items-center gap-1.5 bg-muted/50 border border-border/60 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setAbaAtiva('matriz')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
              abaAtiva === 'matriz'
                ? 'bg-primary text-primary-foreground shadow-xs'
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
                ? 'bg-primary text-primary-foreground shadow-xs'
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
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Pontos Facultativos & Decretos
          </button>
        </div>

        {/* Ações: Histórico e Salvar */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAbrirHistorico}
            className="h-8 text-xs text-muted-foreground hover:text-foreground border-border bg-background cursor-pointer"
          >
            <History className="w-3.5 h-3.5 mr-1.5 text-primary" />
            Histórico
          </Button>

          <Button
            type="button"
            onClick={handleSalvar}
            disabled={saving || loading}
            size="sm"
            className="h-8 text-xs bg-primary text-primary-foreground font-bold hover:bg-primary/90 cursor-pointer shadow-xs"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>

          {showCloseButton && onClose && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs cursor-pointer bg-background"
            >
              Fechar
            </Button>
          )}
        </div>
      </div>

      {/* Banner Informativo sobre a Rede e Exceção do EMAEE com Status de Dias Letivos */}
      <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <span>
            Planejamento temporal oficial da rede municipal — <strong className="text-foreground">{nomeExibicao}</strong>.{' '}
            <span className="text-xs text-muted-foreground/80">(Exceto EMAEE que opera em regime contínuo de saúde)</span>
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`text-xs px-3 py-1 rounded-full font-bold border flex items-center gap-1.5 ${
              calculoDiasLetivos.atingiuMeta
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
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
            <span className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-semibold animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Alterações não salvas
            </span>
          )}
        </div>
      </div>

      {/* Conteúdo da Aba Ativa */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin text-primary mr-2" />
          <span>Carregando dados do calendário...</span>
        </div>
      ) : (
        <>
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
        </>
      )}

      {/* Modal de Histórico */}
      <HistoricoModal
        open={modalHistoricoOpen}
        onOpenChange={setModalHistoricoOpen}
        historico={historico}
        loading={loadingHistorico}
        onRefresh={carregarHistorico}
        anoLetivo={anoLetivo}
      />
    </div>
  )
}
