'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabaseClient'
import {
  Database,
  Users,
  Building2,
  Building,
  KeyRound,
  GraduationCap,
  BookOpen,
  Activity,
  FileSearch,
  Download,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TableStat {
  key: string
  label: string
  icon: React.ElementType
  iconColor: string
  count: number | null
}

type HardDeleteAction = 'funcionarios_sem_acesso' | 'turmas_arquivadas' | 'logs_90_dias'

interface HardDeleteOption {
  action: HardDeleteAction
  title: string
  description: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HARD_DELETE_OPTIONS: HardDeleteOption[] = [
  {
    action: 'funcionarios_sem_acesso',
    title: 'Funcionários sem Acesso',
    description:
      'Exclui funcionários sem nenhum acesso ativo e que nunca logaram no sistema.',
  },
  {
    action: 'turmas_arquivadas',
    title: 'Turmas Arquivadas sem Matrículas',
    description:
      'Exclui turmas inativas (deleted_at preenchido) que não possuem nenhuma matrícula vinculada.',
  },
  {
    action: 'logs_90_dias',
    title: 'Logs com mais de 90 dias',
    description:
      'Remove registros antigos de access_logs para manter o banco limpo.',
  },
]

const EXPORT_OPTIONS = [
  { label: 'Exportar Funcionários', table: 'funcionarios' },
  { label: 'Exportar Escolas', table: 'escolas' },
  { label: 'Exportar Acessos', table: 'acessos_usuarios' },
  { label: 'Exportar Logs de Acesso', table: 'access_logs' },
  { label: 'Exportar Logs de Auditoria', table: 'audit_logs' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminBancoPage() {
  const supabase = createClient()

  const [stats, setStats] = useState<TableStat[]>([
    { key: 'funcionarios',    label: 'FUNCIONARIOS',    icon: Users,           iconColor: 'text-sky-400',    count: null },
    { key: 'escolas',         label: 'ESCOLAS',         icon: Building2,       iconColor: 'text-purple-400', count: null },
    { key: 'orgaos',          label: 'ORGAOS',          icon: Building,        iconColor: 'text-amber-400',  count: null },
    { key: 'acessos_usuarios',label: 'ACESSOS_USUARIOS',icon: KeyRound,        iconColor: 'text-emerald-400',count: null },
    { key: 'alunos',          label: 'ALUNOS',          icon: GraduationCap,   iconColor: 'text-rose-400',   count: null },
    { key: 'turmas',          label: 'TURMAS',          icon: BookOpen,        iconColor: 'text-cyan-400',   count: null },
    { key: 'access_logs',     label: 'ACCESS_LOGS',     icon: Activity,        iconColor: 'text-indigo-400', count: null },
    { key: 'audit_logs',      label: 'AUDIT_LOGS',      icon: FileSearch,      iconColor: 'text-orange-400', count: null },
  ])
  const [loadingStats, setLoadingStats] = useState(false)

  const [exportingTable, setExportingTable] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<HardDeleteOption | null>(null)
  const [deletingAction, setDeletingAction] = useState<HardDeleteAction | null>(null)

  // ── Load counts ─────────────────────────────────────────────────────────────

  const loadStats = async () => {
    setLoadingStats(true)
    try {
      const tables = [
        'funcionarios', 'escolas', 'orgaos', 'acessos_usuarios',
        'alunos', 'turmas', 'access_logs', 'audit_logs',
      ]

      const results = await Promise.allSettled(
        tables.map(t =>
          supabase.from(t as any).select('*', { count: 'exact', head: true })
        )
      )

      const countMap: Record<string, number> = {}
      tables.forEach((t, i) => {
        const res = results[i]
        countMap[t] = res.status === 'fulfilled' ? (res.value.count ?? 0) : 0
      })

      setStats(prev =>
        prev.map(s => ({ ...s, count: countMap[s.key] ?? 0 }))
      )
    } catch (err) {
      console.error('Erro ao carregar stats:', err)
      toast.error('Erro ao carregar contagem das tabelas.')
    } finally {
      setLoadingStats(false)
    }
  }

  useEffect(() => { loadStats() }, [])

  // ── Export JSON ─────────────────────────────────────────────────────────────

  const [exportSettings, setExportSettings] = useState<{table: string, label: string} | null>(null)
  const [exportDays, setExportDays] = useState<string>('30')

  const handleExportar = (table: string, label: string) => {
    if (table.includes('logs')) {
      // Abre modal para perguntar período
      setExportSettings({ table, label })
    } else {
      // Exporta direto
      triggerExport(table)
    }
  }

  const triggerExport = (table: string, days?: string) => {
    toast.success('Iniciando download... Isso pode levar alguns instantes para bancos grandes.')
    const url = `/api/admin/export?table=${table}${days ? `&days=${days}` : ''}`
    // Redirecionar para o endpoint para que o navegador cuide do stream
    window.location.href = url
    setExportSettings(null)
  }

  // ── Hard Delete ─────────────────────────────────────────────────────────────

  const handleConfirmHardDelete = (option: HardDeleteOption) => {
    setConfirmAction(option)
  }

  const handleExecuteHardDelete = async () => {
    if (!confirmAction) return
    setDeletingAction(confirmAction.action)
    setConfirmAction(null)

    try {
      const res = await fetch('/api/admin/hard-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: confirmAction.action }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(`Erro: ${data.error || 'Falha na exclusão'}`)
      } else {
        toast.success(data.message ?? 'Registros excluídos com sucesso.')
        loadStats()
      }
    } catch (err: any) {
      toast.error(`Erro inesperado: ${err?.message}`)
    } finally {
      setDeletingAction(null)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">

      {/* ── Header ── */}
      <div className="pb-4 border-b border-borderCustom">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Database className="w-6 h-6 text-purple-500" />
          Banco de Dados
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Monitoramento, exportação e manutenção do banco de dados.
        </p>
      </div>

      {/* ── Status das Tabelas ── */}
      <div className="bg-card border border-borderCustom rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            Status das Tabelas
          </h3>
          <button
            onClick={loadStats}
            disabled={loadingStats}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div
                key={s.key}
                className="bg-surface-2 border border-borderCustom rounded-xl p-4 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  <Icon className={`w-3.5 h-3.5 ${s.iconColor}`} />
                  {s.label}
                </div>
                {s.count === null ? (
                  <div className="h-8 w-12 bg-muted rounded animate-pulse" />
                ) : (
                  <span className="text-3xl font-extrabold text-foreground leading-none">
                    {s.count.toLocaleString('pt-BR')}
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground">registros</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Lower Grid: Exportar + Hard Delete ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Exportar Dados */}
        <div className="bg-card border border-borderCustom rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Download className="w-4 h-4 text-muted-foreground" />
            Exportar Dados
          </h3>

          {/* Info banner */}
          <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-xl px-4 py-3">
            <Activity className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
            <p className="text-blue-700 dark:text-blue-300 text-xs leading-relaxed">
              Exporta os dados em formato JSON para backup manual.
            </p>
          </div>

          <div className="space-y-2">
            {EXPORT_OPTIONS.map(({ label, table }) => (
              <button
                key={table}
                onClick={() => handleExportar(table, label)}
                disabled={exportingTable === table}
                className="w-full flex items-center gap-3 bg-surface-2 hover:bg-hoverCustom border border-borderCustom hover:border-border rounded-xl px-4 py-3 text-sm text-foreground font-medium transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {exportingTable === table ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                ) : (
                  <Download className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Exclusão Definitiva */}
        <div className="bg-card border border-borderCustom rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-muted-foreground" />
            Exclusão Definitiva (Hard Delete)
          </h3>

          {/* Warning banner */}
          <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 shrink-0" />
            <p className="text-red-700 dark:text-red-300 text-xs leading-relaxed">
              Perigo: Estas ações são irreversíveis. O sistema faz backup automático nos
              logs de auditoria antes de apagar.
            </p>
          </div>

          <div className="space-y-4">
            {HARD_DELETE_OPTIONS.map((opt) => {
              const isDeleting = deletingAction === opt.action
              return (
                <div key={opt.action} className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">{opt.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{opt.description}</p>
                  </div>
                  <button
                    onClick={() => handleConfirmHardDelete(opt)}
                    disabled={isDeleting || deletingAction !== null}
                    className="shrink-0 flex items-center gap-1.5 bg-red-100 dark:bg-red-950/40 hover:bg-red-200 dark:hover:bg-red-900/60 border border-red-300 dark:border-red-800/50 text-red-600 dark:text-red-400 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Excluir
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Confirmation Dialog ── */}
      {confirmAction && (
        <StandardDialog
          open={!!confirmAction}
          onOpenChange={() => setConfirmAction(null)}
          title="Confirmar Exclusão Definitiva"
          maxWidth="sm:max-w-[420px]"
          footer={
            <div className="flex justify-end gap-2 w-full pt-2 border-t border-borderCustom">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmAction(null)}
                className="bg-surface-2 border-borderCustom text-foreground hover:bg-hoverCustom"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleExecuteHardDelete}
                className="bg-rose-700 hover:bg-rose-800 text-white font-bold"
              >
                Confirmar Exclusão
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Você está prestes a executar:{' '}
              <strong className="text-foreground">{confirmAction?.title}</strong>
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {confirmAction?.description}
            </p>
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-lg px-3 py-2">
              <p className="text-red-600 dark:text-red-300 text-xs font-semibold">
                ⚠️ Esta ação é irreversível. Um log de auditoria será registrado automaticamente.
              </p>
            </div>
          </div>
        </StandardDialog>
      )}

      {/* ── Export Settings Dialog ── */}
      {exportSettings && (
        <StandardDialog
          open={!!exportSettings}
          onOpenChange={() => setExportSettings(null)}
          title={`Exportar ${exportSettings.label}`}
          maxWidth="sm:max-w-[400px]"
          footer={
            <div className="flex justify-end gap-2 w-full pt-2 border-t border-borderCustom">
              <Button
                type="button"
                variant="outline"
                onClick={() => setExportSettings(null)}
                className="bg-surface-2 border-borderCustom text-foreground hover:bg-hoverCustom"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => triggerExport(exportSettings.table, exportDays !== 'all' ? exportDays : undefined)}
                className="bg-sky-600 hover:bg-sky-700 text-white font-bold"
              >
                Exportar Arquivo
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Tabelas de log costumam ser muito pesadas. Selecione o período desejado para a exportação.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Período de Exportação</label>
              <select
                value={exportDays}
                onChange={(e) => setExportDays(e.target.value)}
                className="w-full bg-input-bg border border-borderCustom rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="7">Últimos 7 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
                <option value="all">Exportar Todo o Histórico (Não Recomendado)</option>
              </select>
            </div>
          </div>
        </StandardDialog>
      )}
    </div>
  )
}
