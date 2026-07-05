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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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

      const results = await Promise.all(
        tables.map(t =>
          supabase.from(t as any).select('*', { count: 'exact', head: true })
        )
      )

      const countMap: Record<string, number> = {}
      tables.forEach((t, i) => { countMap[t] = results[i].count ?? 0 })

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

  const handleExportar = async (table: string, label: string) => {
    setExportingTable(table)
    try {
      const { data, error } = await supabase.from(table as any).select('*')
      if (error) throw error

      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${table}_${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`${label} exportado com sucesso!`)
    } catch (err: any) {
      toast.error(`Erro ao exportar: ${err?.message || 'Erro desconhecido'}`)
    } finally {
      setExportingTable(null)
    }
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
      <div className="pb-4 border-b border-[#3f3f46]">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Database className="w-6 h-6 text-purple-500" />
          Banco de Dados
        </h2>
        <p className="text-[#aaa] text-sm mt-1">
          Monitoramento, exportação e manutenção do banco de dados.
        </p>
      </div>

      {/* ── Status das Tabelas ── */}
      <div className="bg-[#121214] border border-[#232328] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-zinc-400" />
            Status das Tabelas
          </h3>
          <button
            onClick={loadStats}
            disabled={loadingStats}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
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
                className="bg-[#0e0e11] border border-[#232328] rounded-xl p-4 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
                  <Icon className={`w-3.5 h-3.5 ${s.iconColor}`} />
                  {s.label}
                </div>
                {s.count === null ? (
                  <div className="h-8 w-12 bg-[#232328] rounded animate-pulse" />
                ) : (
                  <span className="text-3xl font-extrabold text-white leading-none">
                    {s.count.toLocaleString('pt-BR')}
                  </span>
                )}
                <span className="text-[11px] text-zinc-600">registros</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Lower Grid: Exportar + Hard Delete ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Exportar Dados */}
        <div className="bg-[#121214] border border-[#232328] rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Download className="w-4 h-4 text-zinc-400" />
            Exportar Dados
          </h3>

          {/* Info banner */}
          <div className="flex items-start gap-3 bg-blue-950/30 border border-blue-800/40 rounded-xl px-4 py-3">
            <Activity className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-blue-300 text-xs leading-relaxed">
              Exporta os dados em formato JSON para backup manual.
            </p>
          </div>

          <div className="space-y-2">
            {EXPORT_OPTIONS.map(({ label, table }) => (
              <button
                key={table}
                onClick={() => handleExportar(table, label)}
                disabled={exportingTable === table}
                className="w-full flex items-center gap-3 bg-[#0e0e11] hover:bg-[#18181c] border border-[#232328] hover:border-zinc-600 rounded-xl px-4 py-3 text-sm text-zinc-200 font-medium transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {exportingTable === table ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-400 shrink-0" />
                ) : (
                  <Download className="w-4 h-4 text-zinc-500 shrink-0" />
                )}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Exclusão Definitiva */}
        <div className="bg-[#121214] border border-[#232328] rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-zinc-400" />
            Exclusão Definitiva (Hard Delete)
          </h3>

          {/* Warning banner */}
          <div className="flex items-start gap-3 bg-red-950/30 border border-red-800/40 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <p className="text-red-300 text-xs leading-relaxed">
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
                    <p className="text-sm font-semibold text-white">{opt.title}</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">{opt.description}</p>
                  </div>
                  <button
                    onClick={() => handleConfirmHardDelete(opt)}
                    disabled={isDeleting || deletingAction !== null}
                    className="shrink-0 flex items-center gap-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-400 hover:text-white text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent className="sm:max-w-[420px] bg-[#18181b] border-[#3f3f46] text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              Confirmar Exclusão Definitiva
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-zinc-300 text-sm leading-relaxed">
              Você está prestes a executar:{' '}
              <strong className="text-white">{confirmAction?.title}</strong>
            </p>
            <p className="text-zinc-500 text-xs leading-relaxed">
              {confirmAction?.description}
            </p>
            <div className="bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2">
              <p className="text-red-300 text-xs font-semibold">
                ⚠️ Esta ação é irreversível. Um log de auditoria será registrado automaticamente.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmAction(null)}
              className="bg-[#27272a] border-[#3f3f46] text-white hover:bg-[#3f3f46]"
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
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
