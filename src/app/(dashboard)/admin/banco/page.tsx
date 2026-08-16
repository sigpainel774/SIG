'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
  ShieldCheck,
  CheckCircle2,
  Plus,
  ExternalLink,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

interface BackupRegistroItem {
  id: string
  tipo: string
  descricao: string
  iniciado_por_nome: string | null
  status: string
  tamanho_estimado_mb: number | null
  observacoes: string | null
  created_at: string
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
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const [stats, setStats] = useState<TableStat[]>([
    { key: 'funcionarios', label: 'FUNCIONARIOS', icon: Users, iconColor: 'text-sky-400', count: null },
    { key: 'escolas', label: 'ESCOLAS', icon: Building2, iconColor: 'text-purple-400', count: null },
    { key: 'orgaos', label: 'ORGAOS', icon: Building, iconColor: 'text-amber-400', count: null },
    { key: 'acessos_usuarios', label: 'ACESSOS_USUARIOS', icon: KeyRound, iconColor: 'text-emerald-400', count: null },
    { key: 'alunos', label: 'ALUNOS', icon: GraduationCap, iconColor: 'text-rose-400', count: null },
    { key: 'turmas', label: 'TURMAS', icon: BookOpen, iconColor: 'text-cyan-400', count: null },
    { key: 'access_logs', label: 'ACCESS_LOGS', icon: Activity, iconColor: 'text-indigo-400', count: null },
    { key: 'audit_logs', label: 'AUDIT_LOGS', icon: FileSearch, iconColor: 'text-orange-400', count: null },
  ])
  const [loadingStats, setLoadingStats] = useState(false)

  const [exportingTable, setExportingTable] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<HardDeleteOption | null>(null)
  const [deletingAction, setDeletingAction] = useState<HardDeleteAction | null>(null)

  // ── Seção de Backup Documental (Opção C) ──────────────────────────────────
  const [backups, setBackups] = useState<BackupRegistroItem[]>([])
  const [loadingBackups, setLoadingBackups] = useState(false)
  const [modalNovoBackupOpen, setModalNovoBackupOpen] = useState(false)
  const [salvandoBackup, setSalvandoBackup] = useState(false)
  const [novoBackupData, setNovoBackupData] = useState({
    descricao: '',
    observacoes: '',
    tipo: 'MANUAL',
  })

  // ── Load counts ─────────────────────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const tables = [
        'funcionarios',
        'escolas',
        'orgaos',
        'acessos_usuarios',
        'alunos',
        'turmas',
        'access_logs',
        'audit_logs',
      ]

      const results = await Promise.allSettled(
        tables.map((t) => supabase.from(t as any).select('*', { count: 'exact', head: true }))
      )

      const countMap: Record<string, number> = {}
      tables.forEach((t, i) => {
        const res = results[i]
        countMap[t] = res.status === 'fulfilled' ? res.value.count ?? 0 : 0
      })

      if (isMounted.current) {
        setStats((prev) => prev.map((s) => ({ ...s, count: countMap[s.key] ?? 0 })))
      }
    } catch (err) {
      console.error('Erro ao carregar stats:', err)
      if (isMounted.current) toast.error('Erro ao carregar contagem das tabelas.')
    } finally {
      if (isMounted.current) setLoadingStats(false)
    }
  }, [supabase])

  // ── Load Backups ────────────────────────────────────────────────────────────

  const loadBackups = useCallback(async () => {
    setLoadingBackups(true)
    try {
      const { data, error } = await (supabase as any)
        .from('backup_registros')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.warn('Aviso ao carregar registros de backup:', error.message)
      } else if (data && isMounted.current) {
        setBackups(data as BackupRegistroItem[])
      }
    } catch (err) {
      console.error('Erro ao carregar histórico de backups:', err)
    } finally {
      if (isMounted.current) setLoadingBackups(false)
    }
  }, [supabase])

  useEffect(() => {
    loadStats()
    loadBackups()
  }, [loadStats, loadBackups])

  // ── Registrar Novo Backup ─────────────────────────────────────────────────

  const handleSalvarBackup = async () => {
    if (!novoBackupData.descricao.trim()) {
      toast.error('Informe uma descrição sucinta para o registro de backup.')
      return
    }

    setSalvandoBackup(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      let iniciadorNome = 'Superadmin ROOT'
      if (user) {
        const { data: func } = await supabase
          .from('funcionarios')
          .select('nome')
          .eq('auth_user_id', user.id)
          .maybeSingle()
        if (func?.nome) iniciadorNome = func.nome
      }

      const { data: inserted, error } = await (supabase as any)
        .from('backup_registros')
        .insert({
          tipo: novoBackupData.tipo,
          descricao: novoBackupData.descricao.trim(),
          iniciado_por_nome: iniciadorNome,
          status: 'CONCLUIDO',
          observacoes: novoBackupData.observacoes.trim() || null,
        })
        .select()
        .single()


      if (error) {
        console.error('Erro ao salvar registro de backup:', error)
        toast.error('Falha ao registrar o backup no banco de dados.')
        return
      }

      toast.success('Registro de backup criado com sucesso!')
      setModalNovoBackupOpen(false)
      setNovoBackupData({ descricao: '', observacoes: '', tipo: 'MANUAL' })

      if (inserted && isMounted.current) {
        setBackups((prev) => [inserted as BackupRegistroItem, ...prev])
      }
    } catch (err) {
      console.error('Erro ao salvar backup:', err)
      toast.error('Erro de rede ao registrar backup.')
    } finally {
      if (isMounted.current) setSalvandoBackup(false)
    }
  }

  // ── Export JSON ─────────────────────────────────────────────────────────────

  const [exportSettings, setExportSettings] = useState<{ table: string; label: string } | null>(null)
  const [exportDays, setExportDays] = useState<string>('30')

  const handleExportar = (table: string, label: string) => {
    if (table.includes('logs')) {
      setExportSettings({ table, label })
    } else {
      triggerExport(table)
    }
  }

  const triggerExport = (table: string, days?: string) => {
    toast.success('Iniciando download... Isso pode levar alguns instantes para bancos grandes.')
    const url = `/api/admin/export?table=${table}${days ? `&days=${days}` : ''}`
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
      if (isMounted.current) setDeletingAction(null)
    }
  }

  const ultimoBackup = backups.length > 0 ? backups[0] : null

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-borderCustom">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Database className="w-6 h-6 text-purple-500" />
            Banco de Dados & Gestão de Backups
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Monitoramento das tabelas, histórico documental de backups e ferramentas de manutenção do banco.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setModalNovoBackupOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 rounded-xl h-10 px-4 cursor-pointer shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Backup Manual</span>
        </Button>
      </div>

      {/* ── SEÇÃO DE BACKUP DOCUMENTAL ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Card do Último Backup */}
        <div className="col-span-12 lg:col-span-4 bg-card border border-borderCustom rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-borderCustom pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Status do Último Backup
              </h3>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Sistema Seguro" />
            </div>

            {ultimoBackup ? (
              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-foreground">{ultimoBackup.descricao}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Por {ultimoBackup.iniciado_por_nome || 'Sistema'}
                    </div>
                  </div>
                </div>

                <div className="bg-surface-2 border border-borderCustom rounded-xl p-3 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Data:</span>
                    <strong className="text-foreground">
                      {new Date(ultimoBackup.created_at).toLocaleString('pt-BR')}
                    </strong>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tipo:</span>
                    <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300 font-extrabold uppercase text-[10px]">
                      {ultimoBackup.tipo}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Status:</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-extrabold uppercase text-[10px]">
                      {ultimoBackup.status}
                    </span>
                  </div>
                </div>

                {ultimoBackup.observacoes && (
                  <p className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded-lg border border-borderCustom">
                    "{ultimoBackup.observacoes}"
                  </p>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-muted-foreground text-xs">
                Nenhum backup registrado recentemente.
              </div>
            )}
          </div>

          <a
            href="https://supabase.com/dashboard/project/nijjizpcodnjhvqwjuso/database/backups"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-surface-2 hover:bg-hoverCustom border border-borderCustom text-xs font-bold text-foreground py-2.5 px-3 rounded-xl transition-all shadow-sm"
          >
            <span>Acessar Console do Supabase</span>
            <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
          </a>
        </div>

        {/* Tabela de Histórico de Backups */}
        <div className="col-span-12 lg:col-span-8 bg-card border border-borderCustom rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-borderCustom pb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              Histórico Documental de Backups
            </h3>
            <span className="text-xs text-muted-foreground font-mono">
              Total: {backups.length} registro(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-borderCustom bg-surface-2 text-muted-foreground uppercase text-[11px] font-bold tracking-wider">
                  <th className="p-3">DATA / HORA</th>
                  <th className="p-3">DESCRIÇÃO</th>
                  <th className="p-3">TIPO</th>
                  <th className="p-3">RESPONSÁVEL</th>
                  <th className="p-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderCustom">
                {loadingBackups ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-400" />
                      Carregando histórico de backups...
                    </td>
                  </tr>
                ) : backups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      Nenhum registro de backup cadastrado. Clique no botão acima para adicionar.
                    </td>
                  </tr>
                ) : (
                  backups.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(b.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-3 font-bold text-foreground">
                        {b.descricao}
                        {b.observacoes && (
                          <div className="text-[11px] font-normal text-muted-foreground truncate max-w-xs">
                            {b.observacoes}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-950/60 border border-purple-500/40 text-purple-300">
                          {b.tipo}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-foreground">{b.iniciado_por_nome || 'Sistema'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Status das Tabelas ── */}
      <div className="bg-card border border-borderCustom rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            Status das Tabelas Principais
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
            Exportar Dados em JSON
          </h3>

          {/* Info banner */}
          <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 rounded-xl px-4 py-3">
            <Activity className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 shrink-0" />
            <p className="text-blue-700 dark:text-blue-300 text-xs leading-relaxed">
              Exporta os dados em formato JSON para cópia de segurança física manual.
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

      {/* ── Modal de Cadastro de Backup Manual ── */}
      {modalNovoBackupOpen && (
        <StandardDialog
          open={modalNovoBackupOpen}
          onOpenChange={(open) => {
            if (!open) setNovoBackupData({ descricao: '', observacoes: '', tipo: 'MANUAL' })
            setModalNovoBackupOpen(open)
          }}
          title="Registrar Backup Manual no Histórico"
          maxWidth="sm:max-w-[480px]"
          footer={
            <div className="flex justify-end gap-2 w-full pt-2 border-t border-borderCustom">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalNovoBackupOpen(false)}
                className="bg-surface-2 border-borderCustom text-foreground hover:bg-hoverCustom"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSalvarBackup}
                disabled={salvandoBackup}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {salvandoBackup ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                Salvar Registro
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <p className="text-muted-foreground text-xs leading-relaxed">
              Cadastre um registro de acompanhamento após ter executado um dump ou backup manual via Supabase Dashboard ou CLI.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Título / Descrição do Backup *</label>
              <Input
                type="text"
                placeholder="Ex: Dump pré-deploy v2.5 de Agosto/2026"
                value={novoBackupData.descricao}
                onChange={(e) => setNovoBackupData((prev) => ({ ...prev, descricao: e.target.value }))}
                className="bg-input-bg border-borderCustom text-foreground h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Tipo de Backup</label>
              <select
                value={novoBackupData.tipo}
                onChange={(e) => setNovoBackupData((prev) => ({ ...prev, tipo: e.target.value }))}
                className="w-full bg-input-bg border border-borderCustom rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none"
              >
                <option value="MANUAL">MANUAL (Exportação ou Dump Físico)</option>
                <option value="PITR">PITR (Point-in-Time Recovery)</option>
                <option value="AUTOMATICO">AUTOMÁTICO (Snapshot Vercel/Supabase)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Observações / Motivo (Opcional)</label>
              <textarea
                placeholder="Detalhes sobre a alteração, motivo do backup ou link para o arquivo salvo localmente..."
                value={novoBackupData.observacoes}
                onChange={(e) => setNovoBackupData((prev) => ({ ...prev, observacoes: e.target.value }))}
                className="w-full bg-input-bg border border-borderCustom rounded-xl p-3 text-sm text-foreground focus:outline-none min-h-[80px]"
              />
            </div>
          </div>
        </StandardDialog>
      )}

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
            <p className="text-muted-foreground text-xs leading-relaxed">{confirmAction?.description}</p>
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
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Período de Exportação
              </label>
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
