'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabaseClient'
import { useEditModeStore } from '@/store/useEditModeStore'
import { useAuthStore } from '@/store/useAuthStore'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { StandardTable, TableColumn } from '@/components/ui/table'
import { toast } from 'sonner'
import {
  Clock,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Building2,
  Users,
  Calendar,
  AlertTriangle,
  Loader2,
  X,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SessionTimeoutRuleItem {
  id: string
  nome: string
  ativo: boolean
  escopo: 'rede' | 'secretaria' | 'escola' | 'nivel'
  secretaria_id: string | null
  escola_id: string | null
  nivel_acesso: number | null
  horarios: string[]
  dias_semana: number[] | null
  tolerancia_minutos: number
  created_at?: string
  secretaria?: { nome: string } | null
  escola?: { nome: string } | null
}

interface ModalSessionTimeoutProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRulesChanged?: () => void
}

const DIAS_SEMANA_OPCOES = [
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
]

const NIVEIS_OPCOES = [
  { value: 'all', label: 'Todos de Nível 2 para baixo (Diretores, Professores e Apoio)' },
  { value: '2', label: 'Nível 2 — Diretores / Gestores Escolares' },
  { value: '3', label: 'Nível 3 — Coordenadores / Secretários Escolares' },
  { value: '4', label: 'Nível 4 — Professores / Corpo Docente' },
  { value: '5', label: 'Nível 5+ — Apoio Operacional / Vigilância' },
]

export function ModalSessionTimeout({
  open,
  onOpenChange,
  onRulesChanged,
}: ModalSessionTimeoutProps) {
  const supabase = createClient()
  const { isEditMode } = useEditModeStore()
  const { funcionario } = useAuthStore()

  const [rules, setRules] = useState<SessionTimeoutRuleItem[]>([])
  const [loading, setLoading] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Opções para relacionamentos
  const [secretarias, setSecretarias] = useState<{ id: string; nome: string }[]>([])
  const [escolas, setEscolas] = useState<{ id: string; nome: string }[]>([])

  // Campos do formulário
  const [formNome, setFormNome] = useState('')
  const [formAtivo, setFormAtivo] = useState(false)
  const [formEscopo, setFormEscopo] = useState<'rede' | 'secretaria' | 'escola' | 'nivel'>('rede')
  const [formSecretariaId, setFormSecretariaId] = useState('')
  const [formEscolaId, setFormEscolaId] = useState('')
  const [formNivelAcesso, setFormNivelAcesso] = useState('all')
  const [formHorarios, setFormHorarios] = useState<string[]>(['12:00', '18:00'])
  const [newHorarioInput, setNewHorarioInput] = useState('')
  const [formDiasSemana, setFormDiasSemana] = useState<number[]>([1, 2, 3, 4, 5]) // Seg a Sex por padrão
  const [formTolerancia, setFormTolerancia] = useState(5)

  // Carregar regras e opções
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [rulesRes, secRes, escRes] = await Promise.all([
        supabase
          .from('session_timeout_rules')
          .select(`
            *,
            secretaria:secretaria_id (nome),
            escola:escola_id (nome)
          `)
          .order('created_at', { ascending: false }),
        supabase.from('secretarias').select('id, nome').eq('ativo', true).order('nome'),
        supabase.from('escolas').select('id, nome').is('deleted_at', null).order('nome'),
      ])

      if (rulesRes.data) setRules(rulesRes.data as SessionTimeoutRuleItem[])
      if (secRes.data) setSecretarias(secRes.data)
      if (escRes.data) setEscolas(escRes.data)
    } catch (err) {
      console.error('Erro ao carregar regras de tempo de sessão:', err)
      toast.error('Erro ao buscar regras de tempo de sessão.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (open) {
      loadData()
      setIsFormOpen(false)
      setEditingRuleId(null)
    }
  }, [open, loadData])

  // Resetar formulário
  const resetForm = () => {
    setFormNome('')
    setFormAtivo(false)
    setFormEscopo('rede')
    setFormSecretariaId('')
    setFormEscolaId('')
    setFormNivelAcesso('all')
    setFormHorarios(['12:00', '18:00'])
    setNewHorarioInput('')
    setFormDiasSemana([1, 2, 3, 4, 5])
    setFormTolerancia(5)
    setEditingRuleId(null)
    setIsFormOpen(false)
  }

  // Abrir edição
  const handleOpenEdit = (rule: SessionTimeoutRuleItem) => {
    setEditingRuleId(rule.id)
    setFormNome(rule.nome)
    setFormAtivo(rule.ativo)
    setFormEscopo(rule.escopo)
    setFormSecretariaId(rule.secretaria_id ?? '')
    setFormEscolaId(rule.escola_id ?? '')
    setFormNivelAcesso(rule.nivel_acesso ? String(rule.nivel_acesso) : 'all')
    setFormHorarios(rule.horarios && rule.horarios.length > 0 ? rule.horarios : ['12:00'])
    setFormDiasSemana(rule.dias_semana ?? [])
    setFormTolerancia(rule.tolerancia_minutos ?? 5)
    setIsFormOpen(true)
  }

  // Alternar status ativo/inativo instantâneo
  const handleToggleAtivo = async (rule: SessionTimeoutRuleItem) => {
    try {
      const novoStatus = !rule.ativo
      const { error } = await supabase
        .from('session_timeout_rules')
        .update({ ativo: novoStatus, updated_at: new Date().toISOString() })
        .eq('id', rule.id)

      if (error) throw error

      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, ativo: novoStatus } : r))
      )
      toast.success(
        novoStatus
          ? `Regra "${rule.nome}" ATIVADA com sucesso!`
          : `Regra "${rule.nome}" DESATIVADA.`
      )
      onRulesChanged?.()
    } catch (err) {
      console.error('Erro ao alternar status da regra:', err)
      toast.error('Não foi possível alterar o status da regra.')
    }
  }

  // Excluir regra
  const handleDeleteRule = async (ruleId: string, ruleNome: string) => {
    if (!window.confirm(`Deseja realmente excluir a regra "${ruleNome}"?`)) return

    try {
      const { error } = await supabase
        .from('session_timeout_rules')
        .delete()
        .eq('id', ruleId)

      if (error) throw error

      setRules((prev) => prev.filter((r) => r.id !== ruleId))
      toast.success(`Regra "${ruleNome}" removida.`)
      onRulesChanged?.()
    } catch (err) {
      console.error('Erro ao excluir regra:', err)
      toast.error('Erro ao excluir regra de encerramento.')
    }
  }

  // Adicionar horário ao formulário
  const handleAddHorario = () => {
    const val = newHorarioInput.trim()
    if (!val) return

    // Validação de formato HH:MM
    const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (!regex.test(val)) {
      toast.error('Formato inválido! Use o formato HH:MM (ex: 12:00, 18:30).')
      return
    }

    if (formHorarios.includes(val)) {
      toast.info('Este horário já foi adicionado.')
      return
    }

    setFormHorarios((prev) => [...prev, val].sort())
    setNewHorarioInput('')
  }

  // Remover horário do formulário
  const handleRemoveHorario = (h: string) => {
    if (formHorarios.length <= 1) {
      toast.warning('A regra deve possuir pelo menos 1 horário cadastrado.')
      return
    }
    setFormHorarios((prev) => prev.filter((item) => item !== h))
  }

  // Toggle dia da semana
  const handleToggleDiaSemana = (dia: number) => {
    setFormDiasSemana((prev) =>
      prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia].sort()
    )
  }

  // Salvar regra
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formNome.trim()) {
      toast.error('Informe um nome identificador para a regra.')
      return
    }

    if (formHorarios.length === 0) {
      toast.error('Cadastre pelo menos 1 horário de encerramento.')
      return
    }

    if (formEscopo === 'secretaria' && !formSecretariaId) {
      toast.error('Selecione a Secretaria alvo.')
      return
    }

    if (formEscopo === 'escola' && !formEscolaId) {
      toast.error('Selecione a Escola/Unidade alvo.')
      return
    }

    try {
      setSaving(true)

      const payload = {
        nome: formNome.trim(),
        ativo: formAtivo,
        escopo: formEscopo,
        secretaria_id: formEscopo === 'secretaria' ? formSecretariaId : null,
        escola_id: formEscopo === 'escola' ? formEscolaId : null,
        nivel_acesso: formNivelAcesso !== 'all' ? parseInt(formNivelAcesso, 10) : null,
        horarios: formHorarios,
        dias_semana: formDiasSemana,
        tolerancia_minutos: formTolerancia || 5,
        criado_por: funcionario?.id ?? null,
        updated_at: new Date().toISOString(),
      }

      if (editingRuleId) {
        const { error } = await supabase
          .from('session_timeout_rules')
          .update(payload)
          .eq('id', editingRuleId)

        if (error) throw error
        toast.success(`Regra "${payload.nome}" atualizada com sucesso!`)
      } else {
        const { error } = await supabase
          .from('session_timeout_rules')
          .insert(payload)

        if (error) throw error
        toast.success(`Regra "${payload.nome}" cadastrada com sucesso!`)
      }

      resetForm()
      await loadData()
      onRulesChanged?.()
    } catch (err) {
      console.error('Erro ao salvar regra:', err)
      toast.error('Erro ao persistir regra no banco de dados.')
    } finally {
      setSaving(false)
    }
  }

  // Formatador de dias da semana
  const formatDiasSemana = (dias: number[] | null) => {
    if (!dias || dias.length === 0 || dias.length === 7) return 'Todos os dias'
    const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    return dias.map((d) => nomes[d]).join(', ')
  }

  // Definição das colunas da tabela de regras
  const columns: TableColumn<SessionTimeoutRuleItem>[] = [
    {
      header: 'Regra & Status',
      accessor: (item) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-foreground">{item.nome}</span>
            <span
              className={cn(
                'text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase tracking-wider',
                item.ativo
                  ? 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400'
                  : 'bg-zinc-500/15 text-zinc-600 border-zinc-500/30 dark:text-zinc-400'
              )}
            >
              {item.ativo ? 'Ativa' : 'Desativada'}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {formatDiasSemana(item.dias_semana)} • Tolerância: {item.tolerancia_minutos ?? 5} min
          </p>
        </div>
      ),
    },
    {
      header: 'Escopo & Alvo',
      accessor: (item) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            {item.escopo === 'rede' && (
              <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                <Building2 className="w-3.5 h-3.5" /> Toda a Rede
              </span>
            )}
            {item.escopo === 'secretaria' && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 truncate max-w-[200px]">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                {item.secretaria?.nome ?? 'Secretaria'}
              </span>
            )}
            {item.escopo === 'escola' && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 truncate max-w-[200px]">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                {item.escola?.nome ?? 'Escola'}
              </span>
            )}
            {item.escopo === 'nivel' && (
              <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
                <Users className="w-3.5 h-3.5" /> Por Nível
              </span>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground block">
            {item.nivel_acesso
              ? `Nível ${item.nivel_acesso}`
              : 'Nível 2 para baixo (Diretores, Professores e Apoio)'}
          </span>
        </div>
      ),
    },
    {
      header: 'Horários de Logoff',
      accessor: (item) => (
        <div className="flex flex-wrap gap-1">
          {item.horarios && item.horarios.length > 0 ? (
            item.horarios.map((h) => (
              <span
                key={h}
                className="bg-card border border-border px-2 py-0.5 rounded-md text-xs font-bold text-foreground flex items-center gap-1"
              >
                <Clock className="w-3 h-3 text-amber-500" />
                {h}
              </span>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">Nenhum</span>
          )}
        </div>
      ),
    },
    {
      header: 'Ações',
      className: 'text-right',
      headClassName: 'text-right',
      accessor: (item) => (
        <div className="flex items-center justify-end gap-2">
          {/* Toggle Ativar/Desativar */}
          <button
            type="button"
            onClick={() => handleToggleAtivo(item)}
            className={cn(
              'p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer',
              item.ativo
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-zinc-500/10 border-zinc-500/30 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-500/20'
            )}
            title={item.ativo ? 'Clique para desativar' : 'Clique para ativar'}
          >
            {item.ativo ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <XCircle className="w-4 h-4 text-zinc-400" />
            )}
            <span>{item.ativo ? 'Ativo' : 'Inativo'}</span>
          </button>

          {/* Botões restritos ao Modo Edição */}
          {isEditMode && (
            <>
              <button
                type="button"
                onClick={() => handleOpenEdit(item)}
                className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors cursor-pointer"
                title="Editar regra"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDeleteRule(item.id, item.nome)}
                className="p-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                title="Excluir regra"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Controle de Tempo de Sessões"
      description="Gerencie políticas de encerramento compulsório de sessões por horário para proteção dos computadores da rede municipal."
      maxWidth="sm:max-w-4xl"
    >
      <div className="space-y-4">
        {/* Banner Informativo de Segurança */}
        <div className="bg-amber-500/10 border border-amber-500/25 dark:bg-amber-950/20 dark:border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-bold text-foreground block">
              Proteção de Postos de Trabalho (Nível 2 para baixo)
            </span>
            <p className="text-muted-foreground leading-relaxed">
              O sistema desloga automaticamente contas que permanecerem abertas nos computadores nos horários definidos.
              <strong> Superadmin (ROOT)</strong> e <strong>Nível 1 (Secretaria Municipal)</strong> são isentos por padrão.
              Todas as regras iniciam desativadas e podem ser ligadas individualmente conforme sua necessidade.
            </p>
          </div>
        </div>

        {/* Barra de Ações do Topo */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-xs font-bold text-foreground">
            Regras Cadastradas ({rules.length})
          </span>

          {!isFormOpen && isEditMode && (
            <button
              type="button"
              onClick={() => {
                resetForm()
                setIsFormOpen(true)
              }}
              className="bg-[#0067c0] hover:bg-[#005aab] text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Nova Regra
            </button>
          )}
        </div>

        {/* Formulário de Criação / Edição */}
        {isFormOpen ? (
          <form
            onSubmit={handleSaveRule}
            className="bg-card border border-borderCustom rounded-2xl p-4 space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                {editingRuleId ? 'Editar Regra de Sessão' : 'Cadastrar Nova Regra de Sessão'}
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Nome da Regra */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-foreground">
                  Nome Identificador da Regra *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Logoff 12:00 e 18:00 — Escolas da Rede"
                  value={formNome}
                  onChange={(e) => setFormNome(e.target.value)}
                  className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  required
                />
              </div>

              {/* Escopo da Regra */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Escopo de Aplicação *
                </label>
                <select
                  value={formEscopo}
                  onChange={(e) =>
                    setFormEscopo(e.target.value as 'rede' | 'secretaria' | 'escola' | 'nivel')
                  }
                  className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  <option value="rede">Toda a Rede Municipal</option>
                  <option value="secretaria">Por Secretaria Específica</option>
                  <option value="escola">Por Escola / Unidade Específica</option>
                  <option value="nivel">Por Nível de Acesso Específico</option>
                </select>
              </div>

              {/* Nível Alvo */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Nível de Acesso Alvo
                </label>
                <select
                  value={formNivelAcesso}
                  onChange={(e) => setFormNivelAcesso(e.target.value)}
                  className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                >
                  {NIVEIS_OPCOES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Condicional: Seletor de Secretaria */}
              {formEscopo === 'secretaria' && (
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-foreground">
                    Secretaria Alvo *
                  </label>
                  <select
                    value={formSecretariaId}
                    onChange={(e) => setFormSecretariaId(e.target.value)}
                    className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                    required
                  >
                    <option value="">Selecione uma secretaria...</option>
                    {secretarias.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Condicional: Seletor de Escola */}
              {formEscopo === 'escola' && (
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold text-foreground">
                    Escola / Unidade Alvo *
                  </label>
                  <select
                    value={formEscolaId}
                    onChange={(e) => setFormEscolaId(e.target.value)}
                    className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                    required
                  >
                    <option value="">Selecione uma escola...</option>
                    {escolas.map((esc) => (
                      <option key={esc.id} value={esc.id}>
                        {esc.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Horários de Logoff */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-foreground block">
                  Horários de Encerramento (HH:MM) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="time"
                    value={newHorarioInput}
                    onChange={(e) => setNewHorarioInput(e.target.value)}
                    className="text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring w-32"
                  />
                  <button
                    type="button"
                    onClick={handleAddHorario}
                    className="bg-card border border-border hover:bg-muted text-foreground px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Horário
                  </button>
                </div>

                {/* Tags de horários cadastrados */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {formHorarios.map((h) => (
                    <span
                      key={h}
                      className="bg-muted border border-border px-2.5 py-1 rounded-lg text-xs font-bold text-foreground flex items-center gap-1.5"
                    >
                      <Clock className="w-3 h-3 text-amber-500" />
                      {h}
                      <button
                        type="button"
                        onClick={() => handleRemoveHorario(h)}
                        className="text-muted-foreground hover:text-rose-500 transition-colors ml-0.5"
                        title="Remover horário"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Dias da Semana */}
              <div className="space-y-1 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-foreground">
                    Dias da Semana Ativos
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormDiasSemana([1, 2, 3, 4, 5])}
                      className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline"
                    >
                      Seg a Sex
                    </button>
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <button
                      type="button"
                      onClick={() => setFormDiasSemana([0, 1, 2, 3, 4, 5, 6])}
                      className="text-[10px] text-sky-600 dark:text-sky-400 hover:underline"
                    >
                      Todos os dias
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {DIAS_SEMANA_OPCOES.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => handleToggleDiaSemana(d.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer',
                        formDiasSemana.includes(d.value)
                          ? 'bg-[#0067c0]/15 border-[#0067c0]/40 text-[#0067c0] dark:bg-amber-500/15 dark:border-amber-500/40 dark:text-amber-400'
                          : 'bg-background border-border text-muted-foreground hover:border-foreground/30'
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tolerância */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">
                  Janela de Tolerância (Minutos)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={formTolerancia}
                  onChange={(e) => setFormTolerancia(parseInt(e.target.value, 10) || 5)}
                  className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <span className="text-[10px] text-muted-foreground block">
                  Captura mesmo se o computador acordar após suspensão de tela.
                </span>
              </div>

              {/* Estado Ativo/Inativo Inicial */}
              <div className="space-y-1 flex flex-col justify-end">
                <label className="flex items-center gap-2 p-2 rounded-xl bg-background border border-border cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formAtivo}
                    onChange={(e) => setFormAtivo(e.target.checked)}
                    className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold text-foreground">
                    Ativar regra imediatamente ao salvar
                  </span>
                </label>
              </div>
            </div>

            {/* Rodapé do formulário */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="px-3.5 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#0067c0] hover:bg-[#005aab] text-white px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {editingRuleId ? 'Salvar Alterações' : 'Criar Regra'}
              </button>
            </div>
          </form>
        ) : null}

        {/* Tabela de Regras */}
        <StandardTable
          data={rules}
          columns={columns}
          loading={loading}
          loadingMessage="Carregando regras de sessão..."
          emptyMessage="Nenhuma regra de tempo de sessão cadastrada. O recurso está 100% desativado para toda a rede."
        />
      </div>
    </StandardDialog>
  )
}
