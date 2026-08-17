'use client'

import React from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { HistoricoItem } from '@/hooks/useCalendarioAcademico'
import { History, User, Clock, CheckCircle, RefreshCw } from 'lucide-react'

interface HistoricoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  historico: HistoricoItem[]
  loading: boolean
  onRefresh: () => void
  anoLetivo: number
}

export function HistoricoModal({
  open,
  onOpenChange,
  historico,
  loading,
  onRefresh,
  anoLetivo
}: HistoricoModalProps) {
  const formatarDataHora = (isoStr: string) => {
    try {
      const d = new Date(isoStr)
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return isoStr
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Histórico de Alterações do Calendário ${anoLetivo}`}
      description="Auditoria de todas as edições, inclusões de feriados, pontos facultativos e prazos dos trimestres."
      maxWidth="sm:max-w-[620px]"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button
            type="button"
            variant="outline"
            onClick={onRefresh}
            disabled={loading}
            className="text-xs h-9 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-xs h-9 bg-muted text-foreground hover:bg-muted/80 cursor-pointer"
          >
            Fechar
          </Button>
        </div>
      }
    >
      <div className="space-y-3 py-2">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-primary" />
            <span className="text-xs">Carregando trilha de auditoria...</span>
          </div>
        ) : historico.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2 text-center">
            <History className="w-8 h-8 opacity-40 text-muted-foreground" />
            <p className="text-xs font-medium">Nenhuma alteração registrada ainda para este calendário.</p>
            <p className="text-[11px] opacity-70">
              As modificações de trimestres e novos eventos aparecerão aqui automaticamente.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {historico.map((item) => (
              <div
                key={item.id}
                className="bg-[#18181b] border border-border/60 rounded-xl p-3.5 space-y-2 hover:border-border transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <User className="w-3.5 h-3.5 text-primary" />
                    <span>{item.alterado_por_nome || 'Administrador do Sistema'}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {formatarDataHora(item.created_at)}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.descricao_alteracao}
                </p>

                {item.detalhes_json?.dias_letivos_total !== undefined && (
                  <div className="flex items-center gap-2 pt-1 border-t border-border/30 text-[10px] text-muted-foreground">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                      {item.detalhes_json.dias_letivos_total} dias letivos
                    </span>
                    <span>•</span>
                    <span>T1: {item.detalhes_json.t1_dias}d</span>
                    <span>•</span>
                    <span>T2: {item.detalhes_json.t2_dias}d</span>
                    <span>•</span>
                    <span>T3: {item.detalhes_json.t3_dias}d</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </StandardDialog>
  )
}
