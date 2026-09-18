'use client'

import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Building2,
  Calendar,
  Users,
  HeartHandshake,
  Search,
  Check,
  X,
  UserCheck,
  UserX,
  Loader2,
  Info,
  Plus,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { getAvatarUrl } from '@/lib/photoHelper'
import { logAudit } from '@/lib/audit/audit-agent'
import type { ConfigRedeBloqueioParcial } from '@/lib/verificarTravaBloqueio'

export type BloqueioEscopo = 'desativado' | 'rede' | 'secretarias' | 'escolas'

interface FuncionarioItem {
  id: string
  nome: string
  cargo?: string | null
  email?: string | null
  foto_url?: string | null
  foto_avatar_path?: string | null
  foto_updated_at?: string | null
  is_profissional_aee?: boolean | null
}

interface SecretariaItem {
  id: string
  nome: string
}

interface EscolaItem {
  id: string
  nome: string
  secretaria_id?: string | null
}

interface ModalGestaoBloqueiosProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved?: (newConfig: ConfigRedeBloqueioParcial) => void
}

type TabType = 'estrutural' | 'emaee' | 'anos' | 'usuarios'

export function ModalGestaoBloqueios({
  open,
  onOpenChange,
  onSaved,
}: ModalGestaoBloqueiosProps) {
  const supabase = useMemo(() => createClient(), [])
  const { funcionario: usuarioLogado } = useAuthStore()

  const [activeTab, setActiveTab] = useState<TabType>('estrutural')
  const [loadingInitial, setLoadingInitial] = useState(false)
  const [saving, setSaving] = useState(false)
  const [configId, setConfigId] = useState<string | null>(null)

  // Estado dos Bloqueios Estruturais
  const [bloqueioEscopo, setBloqueioEscopo] = useState<BloqueioEscopo>('desativado')
  const [secretariasSel, setSecretariasSel] = useState<string[]>([])
  const [escolasSel, setEscolasSel] = useState<string[]>([])

  // Estado EMAEE
  const [bloquearEmaee, setBloquearEmaee] = useState<boolean>(false)

  // Estado Anos Letivos
  const [anosLetivosSel, setAnosLetivosSel] = useState<number[]>([])
  const [novoAnoInput, setNovoAnoInput] = useState<string>('')

  // Estado Nível de Usuário (Whitelist & Blacklist)
  const [whitelistUsuariosSel, setWhitelistUsuariosSel] = useState<string[]>([])
  const [blacklistUsuariosSel, setBlacklistUsuariosSel] = useState<string[]>([])
  const [modoUsuarioTab, setModoUsuarioTab] = useState<'whitelist' | 'blacklist'>('whitelist')

  // Opções carregadas
  const [secretariasOptions, setSecretariasOptions] = useState<SecretariaItem[]>([])
  const [escolasOptions, setEscolasOptions] = useState<EscolaItem[]>([])
  const [funcionariosOptions, setFuncionariosOptions] = useState<FuncionarioItem[]>([])

  // Filtros de busca internos
  const [searchSec, setSearchSec] = useState('')
  const [searchEsc, setSearchEsc] = useState('')
  const [searchUser, setSearchUser] = useState('')

  // Anos letivos pré-sugeridos
  const defaultAnosSugestoes = useMemo(() => {
    const anoAtual = new Date().getFullYear()
    return [anoAtual - 3, anoAtual - 2, anoAtual - 1, anoAtual, anoAtual + 1]
  }, [])

  // Carrega configurações existentes e dados auxiliares
  const loadData = useCallback(async () => {
    setLoadingInitial(true)
    try {
      // 1. Busca configurações da rede
      const { data: configData } = await supabase
        .from('configuracoes_rede')
        .select('*')
        .limit(1)
        .single()

      if (configData) {
        setConfigId(configData.id)
        const redeInteira = configData.bloquear_edicao_funcionarios_rede ?? false
        const porSec = (configData.bloquear_por_secretarias as string[] | null) ?? []
        const porEsc = (configData.bloquear_por_escolas as string[] | null) ?? []

        if (redeInteira) {
          setBloqueioEscopo('rede')
        } else if (porSec.length > 0 && porEsc.length > 0) {
          setBloqueioEscopo('secretarias')
        } else if (porSec.length > 0) {
          setBloqueioEscopo('secretarias')
        } else if (porEsc.length > 0) {
          setBloqueioEscopo('escolas')
        } else {
          setBloqueioEscopo('desativado')
        }

        setSecretariasSel(porSec)
        setEscolasSel(porEsc)
        setBloquearEmaee(configData.bloquear_emaee ?? false)
        setAnosLetivosSel((configData.bloquear_por_anos_letivos as number[] | null) ?? [])
        setBlacklistUsuariosSel((configData.bloquear_por_usuarios as string[] | null) ?? [])
        setWhitelistUsuariosSel((configData.liberar_por_usuarios as string[] | null) ?? [])
      }

      // 2. Busca opções de Secretarias, Escolas e Funcionários em paralelo
      const [secRes, escRes, funcRes] = await Promise.all([
        supabase.from('secretarias').select('id, nome').eq('ativo', true).order('nome'),
        supabase
          .from('escolas')
          .select('id, nome, secretaria_id')
          .is('deleted_at', null)
          .or('is_teste.is.null,is_teste.eq.false')
          .order('nome'),
        supabase
          .from('funcionarios')
          .select('id, nome, cargo, email, foto_url, foto_avatar_path, foto_updated_at, is_profissional_aee')
          .is('deleted_at', null)
          .eq('status', 'ativo')
          .order('nome'),
      ])

      if (secRes.data) setSecretariasOptions(secRes.data)
      if (escRes.data) setEscolasOptions(escRes.data)
      if (funcRes.data) setFuncionariosOptions(funcRes.data)
    } catch (err) {
      console.error('Erro ao carregar dados de bloqueio:', err)
      toast.error('Não foi possível carregar as configurações de bloqueio.')
    } finally {
      setLoadingInitial(false)
    }
  }, [supabase])

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, loadData])

  // Helpers de Anos Letivos
  const handleToggleAno = (ano: number) => {
    setAnosLetivosSel((prev) =>
      prev.includes(ano) ? prev.filter((a) => a !== ano) : [...prev, ano].sort((a, b) => a - b)
    )
  }

  const handleAddAnoCustom = () => {
    const val = parseInt(novoAnoInput.trim(), 10)
    if (isNaN(val) || val < 2000 || val > 2100) {
      toast.error('Informe um ano válido entre 2000 e 2100.')
      return
    }
    if (anosLetivosSel.includes(val)) {
      toast.info(`O ano ${val} já está na lista.`)
      setNovoAnoInput('')
      return
    }
    setAnosLetivosSel((prev) => [...prev, val].sort((a, b) => a - b))
    setNovoAnoInput('')
  }

  // Helpers de Usuários
  const handleToggleUserWhitelist = (userId: string) => {
    setWhitelistUsuariosSel((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
    // Se estava na blacklist, remove
    setBlacklistUsuariosSel((prev) => prev.filter((id) => id !== userId))
  }

  const handleToggleUserBlacklist = (userId: string) => {
    setBlacklistUsuariosSel((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
    // Se estava na whitelist, remove
    setWhitelistUsuariosSel((prev) => prev.filter((id) => id !== userId))
  }

  // Mapa de funcionários selecionados para exibição rápida
  const whitelistUsersList = useMemo(
    () => funcionariosOptions.filter((f) => whitelistUsuariosSel.includes(f.id)),
    [funcionariosOptions, whitelistUsuariosSel]
  )

  const blacklistUsersList = useMemo(
    () => funcionariosOptions.filter((f) => blacklistUsuariosSel.includes(f.id)),
    [funcionariosOptions, blacklistUsuariosSel]
  )

  // Filtragem de funcionários disponíveis para adicionar
  const filteredUsersAvailable = useMemo(() => {
    if (!searchUser.trim()) return []
    const term = searchUser.toLowerCase()
    return funcionariosOptions
      .filter((f) => {
        const matchesTerm =
          f.nome.toLowerCase().includes(term) ||
          (f.cargo && f.cargo.toLowerCase().includes(term)) ||
          (f.email && f.email.toLowerCase().includes(term))
        return matchesTerm
      })
      .slice(0, 10) // Limite de 10 sugestões para alta performance
  }, [funcionariosOptions, searchUser])

  // Salvar Configurações
  const handleSave = async () => {
    setSaving(true)
    const isRedeInteira = bloqueioEscopo === 'rede'
    const secretariasFinal =
      bloqueioEscopo === 'secretarias' || (bloqueioEscopo === 'escolas' && secretariasSel.length > 0)
        ? secretariasSel
        : []
    const escolasFinal =
      bloqueioEscopo === 'escolas' || (bloqueioEscopo === 'secretarias' && escolasSel.length > 0)
        ? escolasSel
        : []

    const payload: ConfigRedeBloqueioParcial & { updated_at?: string } = {
      bloquear_edicao_funcionarios_rede: isRedeInteira,
      bloquear_por_secretarias: isRedeInteira ? [] : secretariasFinal,
      bloquear_por_escolas: isRedeInteira ? [] : escolasFinal,
      bloquear_emaee: bloquearEmaee,
      bloquear_por_anos_letivos: anosLetivosSel,
      bloquear_por_usuarios: blacklistUsuariosSel,
      liberar_por_usuarios: whitelistUsuariosSel,
      updated_at: new Date().toISOString(),
    }

    try {
      if (configId) {
        const { error } = await supabase
          .from('configuracoes_rede')
          .update(payload)
          .eq('id', configId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('configuracoes_rede').insert({
          ...payload,
          secretario_educacao: 'MARCUS ALANO CORREIA OLIVEIRA',
        })
        if (error) throw error
      }

      // Registro de Auditoria Administrativa
      await logAudit({
        supabase,
        action: 'UPDATE',
        entity: 'configuracoes_rede_bloqueios',
        entityId: configId || 'global',
        newData: payload,
        performedBy: {
          id: usuarioLogado?.id || null,
          name: usuarioLogado?.nome || 'Administrador',
          email: usuarioLogado?.email || '',
          cargo: usuarioLogado?.cargo || undefined,
        },
      })

      toast.success('Configurações de bloqueios e exceções atualizadas com sucesso!')
      onSaved?.(payload)
      onOpenChange(false)
    } catch (err: unknown) {
      console.error('Erro ao salvar travas de bloqueio:', err)
      toast.error('Erro ao salvar parâmetros de bloqueio.')
    } finally {
      setSaving(false)
    }
  }

  // Contagem de regras ativas
  const totalTravasAtivas = useMemo(() => {
    let count = 0
    if (bloqueioEscopo === 'rede') count++
    if (bloqueioEscopo === 'secretarias' && secretariasSel.length > 0) count += secretariasSel.length
    if (bloqueioEscopo === 'escolas' && escolasSel.length > 0) count += escolasSel.length
    if (bloquearEmaee) count++
    if (anosLetivosSel.length > 0) count += anosLetivosSel.length
    if (blacklistUsuariosSel.length > 0) count += blacklistUsuariosSel.length
    return count
  }, [bloqueioEscopo, secretariasSel, escolasSel, bloquearEmaee, anosLetivosSel, blacklistUsuariosSel])

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Gestão Avançada de Bloqueios & Exceções"
      description="Configure travas de segurança administrativas por escopo estrutural, EMAEE, ano letivo e permissões individuais."
      maxWidth="sm:max-w-4xl"
      footer={
        <div className="flex items-center justify-between w-full pt-2 border-t border-border gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold text-[11px]',
                totalTravasAtivas > 0
                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
              )}
            >
              {totalTravasAtivas > 0 ? (
                <>
                  <Lock className="w-3 h-3" />
                  {totalTravasAtivas} trava(s) ativa(s)
                </>
              ) : (
                <>
                  <Unlock className="w-3 h-3" />
                  Sem bloqueios gerais
                </>
              )}
            </span>
            {whitelistUsuariosSel.length > 0 && (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                • {whitelistUsuariosSel.length} usuário(s) em exceção (Whitelist)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || loadingInitial}
              className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[120px]"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </div>
        </div>
      }
    >
      {loadingInitial ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-medium">Carregando parâmetros da rede...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Navegação por Abas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-muted rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setActiveTab('estrutural')}
              className={cn(
                'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all',
                activeTab === 'estrutural'
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span>Rede & Escolas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('emaee')}
              className={cn(
                'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all',
                activeTab === 'emaee'
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <HeartHandshake className="w-3.5 h-3.5 shrink-0 text-violet-500" />
              <span>Módulo EMAEE</span>
              {bloquearEmaee && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('anos')}
              className={cn(
                'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all',
                activeTab === 'anos'
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Calendar className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              <span>Anos Letivos</span>
              {anosLetivosSel.length > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] bg-rose-500 text-white rounded-full font-extrabold">
                  {anosLetivosSel.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('usuarios')}
              className={cn(
                'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all',
                activeTab === 'usuarios'
                  ? 'bg-card text-foreground shadow-sm border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Users className="w-3.5 h-3.5 shrink-0 text-blue-500" />
              <span>Nível Usuário</span>
              {(whitelistUsuariosSel.length > 0 || blacklistUsuariosSel.length > 0) && (
                <span className="px-1.5 py-0.2 text-[10px] bg-primary text-primary-foreground rounded-full font-extrabold">
                  {whitelistUsuariosSel.length + blacklistUsuariosSel.length}
                </span>
              )}
            </button>
          </div>

          {/* Conteúdo da Aba 1: Escopo Estrutural */}
          {activeTab === 'estrutural' && (
            <div className="space-y-4">
              <div className="bg-card border border-border p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                      Escopo Geral de Bloqueio Estrutural
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Define quais unidades têm edição de fichas de funcionários bloqueadas para operadores abaixo de Nível 1.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {(
                    [
                      {
                        value: 'desativado',
                        label: 'Desativado',
                        desc: 'Edição liberada conforme ABAC',
                      },
                      {
                        value: 'rede',
                        label: 'Toda a Rede',
                        desc: 'Bloqueio geral de todas escolas',
                      },
                      {
                        value: 'secretarias',
                        label: 'Por Secretaria',
                        desc: 'Bloqueia escolas da secretaria',
                      },
                      {
                        value: 'escolas',
                        label: 'Por Escola',
                        desc: 'Bloqueia unidades específicas',
                      },
                    ] as { value: BloqueioEscopo; label: string; desc: string }[]
                  ).map((opt) => {
                    const isSelected = bloqueioEscopo === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setBloqueioEscopo(opt.value)}
                        className={cn(
                          'flex flex-col text-left p-2.5 rounded-xl border transition-all',
                          isSelected
                            ? opt.value === 'desativado'
                              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-800 dark:text-emerald-300 ring-1 ring-emerald-500/30'
                              : 'bg-rose-500/10 border-rose-500/50 text-rose-800 dark:text-rose-300 ring-1 ring-rose-500/30'
                            : 'bg-background border-border text-foreground hover:border-foreground/20'
                        )}
                      >
                        <span className="text-xs font-bold">{opt.label}</span>
                        <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                          {opt.desc}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Multi-seleção de Secretarias */}
              {(bloqueioEscopo === 'secretarias' ||
                (bloqueioEscopo === 'escolas' && secretariasSel.length > 0)) && (
                <div className="bg-card border border-border p-4 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Secretarias Bloqueadas {bloqueioEscopo === 'escolas' ? '(Adicionais)' : ''}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {secretariasSel.length} selecionada(s) de {secretariasOptions.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-[11px] h-7 px-2"
                        onClick={() => setSecretariasSel(secretariasOptions.map((s) => s.id))}
                      >
                        Selecionar Todas
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => setSecretariasSel([])}
                      >
                        Limpar
                      </Button>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar secretaria..."
                      value={searchSec}
                      onChange={(e) => setSearchSec(e.target.value)}
                      className="w-full text-xs bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                    {secretariasOptions
                      .filter((s) => s.nome.toLowerCase().includes(searchSec.toLowerCase()))
                      .map((sec) => {
                        const isChecked = secretariasSel.includes(sec.id)
                        return (
                          <label
                            key={sec.id}
                            className={cn(
                              'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors',
                              isChecked
                                ? 'bg-rose-500/10 border-rose-500/30 text-foreground font-semibold'
                                : 'bg-background border-border/60 hover:bg-muted/50 text-muted-foreground'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                setSecretariasSel((prev) =>
                                  e.target.checked
                                    ? [...prev, sec.id]
                                    : prev.filter((id) => id !== sec.id)
                                )
                              }}
                              className="accent-rose-500 w-3.5 h-3.5 rounded"
                            />
                            <span className="truncate">{sec.nome}</span>
                          </label>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* Multi-seleção de Escolas */}
              {(bloqueioEscopo === 'escolas' ||
                (bloqueioEscopo === 'secretarias' && escolasSel.length > 0)) && (
                <div className="bg-card border border-border p-4 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        Escolas Bloqueadas {bloqueioEscopo === 'secretarias' ? '(Adicionais)' : ''}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {escolasSel.length} selecionada(s) de {escolasOptions.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-[11px] h-7 px-2"
                        onClick={() => setEscolasSel(escolasOptions.map((e) => e.id))}
                      >
                        Selecionar Todas
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => setEscolasSel([])}
                      >
                        Limpar
                      </Button>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Buscar escola por nome..."
                      value={searchEsc}
                      onChange={(e) => setSearchEsc(e.target.value)}
                      className="w-full text-xs bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                    {escolasOptions
                      .filter((e) => e.nome.toLowerCase().includes(searchEsc.toLowerCase()))
                      .map((esc) => {
                        const isChecked = escolasSel.includes(esc.id)
                        return (
                          <label
                            key={esc.id}
                            className={cn(
                              'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors',
                              isChecked
                                ? 'bg-rose-500/10 border-rose-500/30 text-foreground font-semibold'
                                : 'bg-background border-border/60 hover:bg-muted/50 text-muted-foreground'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                setEscolasSel((prev) =>
                                  e.target.checked
                                    ? [...prev, esc.id]
                                    : prev.filter((id) => id !== esc.id)
                                )
                              }}
                              className="accent-rose-500 w-3.5 h-3.5 rounded"
                            />
                            <span className="truncate">{esc.nome}</span>
                          </label>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Conteúdo da Aba 2: Módulo EMAEE */}
          {activeTab === 'emaee' && (
            <div className="space-y-4">
              <div className="bg-card border border-border p-5 rounded-xl space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <HeartHandshake className="w-4 h-4 text-violet-500" />
                      <h4 className="text-xs font-bold text-foreground">
                        Trava Exclusiva do Módulo EMAEE & Educação Especial
                      </h4>
                      <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-500/30 uppercase">
                        AEE
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Bloqueia alterações em fichas de profissionais AEE, vínculos terapêuticos e fichas de matrícula multiprofissional do EMAEE por operadores abaixo do Nível 1.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setBloquearEmaee((prev) => !prev)}
                    className={cn(
                      'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                      bloquearEmaee ? 'bg-rose-500' : 'bg-muted-foreground/30'
                    )}
                  >
                    <span
                      className={cn(
                        'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                        bloquearEmaee ? 'translate-x-5' : 'translate-x-0'
                      )}
                    />
                  </button>
                </div>

                <div
                  className={cn(
                    'p-3.5 rounded-xl border flex items-start gap-3 transition-colors',
                    bloquearEmaee
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200'
                      : 'bg-muted/50 border-border text-muted-foreground'
                  )}
                >
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <span className="font-bold block">
                      {bloquearEmaee
                        ? 'Proteção Ativa: Módulo EMAEE Bloqueado'
                        : 'Módulo EMAEE Liberado'}
                    </span>
                    <p className="text-[11px] leading-tight">
                      {bloquearEmaee
                        ? 'Especialistas e secretários escolares não poderão alterar dados de lotação AEE nem editar matrículas do EMAEE sem autorização de Nível 1 ou inclusão na Whitelist.'
                        : 'Especialistas e secretários podem registrar e editar atendimentos e fichas conforme permissões habituais.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Conteúdo da Aba 3: Bloqueio por Ano Letivo */}
          {activeTab === 'anos' && (
            <div className="space-y-4">
              <div className="bg-card border border-border p-5 rounded-xl space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    Fechamento & Bloqueio por Ano Letivo
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Anos letivos selecionados ficam como somente-leitura. Alterações em turmas, diários e notas referentes a estes anos serão travadas.
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Selecione os Anos Letivos para Bloquear:
                  </span>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {defaultAnosSugestoes.map((ano) => {
                      const isLocked = anosLetivosSel.includes(ano)
                      return (
                        <button
                          key={ano}
                          type="button"
                          onClick={() => handleToggleAno(ano)}
                          className={cn(
                            'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all',
                            isLocked
                              ? 'bg-rose-500/15 border-rose-500/50 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/30 shadow-sm'
                              : 'bg-background border-border text-foreground hover:border-foreground/30'
                          )}
                        >
                          {isLocked ? (
                            <Lock className="w-3.5 h-3.5 text-rose-500" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                          <span>Ano {ano}</span>
                          {isLocked && (
                            <span className="text-[10px] uppercase px-1 py-0.2 bg-rose-500 text-white rounded font-extrabold">
                              Bloqueado
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Adicionar Ano Personalizado */}
                <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                  <div className="relative flex-1 max-w-xs">
                    <input
                      type="number"
                      placeholder="Outro ano letivo (ex: 2021)..."
                      value={novoAnoInput}
                      onChange={(e) => setNovoAnoInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddAnoCustom()
                        }
                      }}
                      className="w-full text-xs bg-background border border-border rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="text-xs h-8"
                    onClick={handleAddAnoCustom}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Adicionar Ano
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Conteúdo da Aba 4: Nível de Usuário (Whitelist & Blacklist) */}
          {activeTab === 'usuarios' && (
            <div className="space-y-4">
              {/* Seletor de Sub-aba: Whitelist vs Blacklist */}
              <div className="flex items-center gap-2 p-1 bg-muted rounded-xl border border-border max-w-md">
                <button
                  type="button"
                  onClick={() => setModoUsuarioTab('whitelist')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                    modoUsuarioTab === 'whitelist'
                      ? 'bg-card text-emerald-700 dark:text-emerald-400 shadow-sm border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Exceções (Whitelist)</span>
                  {whitelistUsuariosSel.length > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] bg-emerald-500 text-white rounded-full">
                      {whitelistUsuariosSel.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setModoUsuarioTab('blacklist')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all',
                    modoUsuarioTab === 'blacklist'
                      ? 'bg-card text-rose-700 dark:text-rose-400 shadow-sm border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <UserX className="w-3.5 h-3.5" />
                  <span>Bloqueados (Blacklist)</span>
                  {blacklistUsuariosSel.length > 0 && (
                    <span className="px-1.5 py-0.2 text-[10px] bg-rose-500 text-white rounded-full">
                      {blacklistUsuariosSel.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Explicação da Lista Atual */}
              <div
                className={cn(
                  'p-3 rounded-xl border flex items-start gap-2.5 text-xs',
                  modoUsuarioTab === 'whitelist'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-300'
                )}
              >
                {modoUsuarioTab === 'whitelist' ? (
                  <>
                    <UserCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <span className="font-bold block">Whitelist (Exceções de Liberação):</span>
                      <span>
                        Servidores autorizados a editar livremente mesmo quando sua escola, secretaria ou ano letivo estiver sob bloqueio.
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <UserX className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                    <div>
                      <span className="font-bold block">Blacklist (Bloqueios Individuais):</span>
                      <span>
                        Servidores expressamente impedidos de realizar ou receber edições em fichas e registros do sistema.
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Campo de Busca de Servidores */}
              <div className="bg-card border border-border p-4 rounded-xl space-y-3">
                <span className="text-xs font-bold text-foreground block">
                  Pesquisar e Adicionar Servidor:
                </span>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Digite o nome, e-mail ou cargo do servidor..."
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    className="w-full text-xs bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                {/* Dropdown / Sugestões da Busca */}
                {filteredUsersAvailable.length > 0 && (
                  <div className="border border-border rounded-xl divide-y divide-border/50 max-h-48 overflow-y-auto bg-background/50">
                    {filteredUsersAvailable.map((func) => {
                      const inWhitelist = whitelistUsuariosSel.includes(func.id)
                      const inBlacklist = blacklistUsuariosSel.includes(func.id)
                      const isCurrentMode =
                        modoUsuarioTab === 'whitelist' ? inWhitelist : inBlacklist

                      return (
                        <div
                          key={func.id}
                          className="flex items-center justify-between p-2 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={getAvatarUrl(func)}
                              alt={func.nome}
                              className="w-7 h-7 rounded-full object-cover border border-border shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-foreground block truncate">
                                {func.nome}
                              </span>
                              <span className="text-[10px] text-muted-foreground block truncate">
                                {func.cargo || 'Servidor'} {func.email ? `• ${func.email}` : ''}
                              </span>
                            </div>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            variant={isCurrentMode ? 'destructive' : 'secondary'}
                            className="text-[11px] h-7 px-2.5 shrink-0 ml-2"
                            onClick={() => {
                              if (modoUsuarioTab === 'whitelist') {
                                handleToggleUserWhitelist(func.id)
                              } else {
                                handleToggleUserBlacklist(func.id)
                              }
                            }}
                          >
                            {isCurrentMode ? (
                              <>
                                <X className="w-3 h-3 mr-1" />
                                Remover
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3 mr-1" />
                                Adicionar
                              </>
                            )}
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Lista de Usuários Configurados no Modo Selecionado */}
                <div className="pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                    {modoUsuarioTab === 'whitelist'
                      ? `Servidores na Whitelist (${whitelistUsersList.length})`
                      : `Servidores na Blacklist (${blacklistUsersList.length})`}
                  </span>

                  {(modoUsuarioTab === 'whitelist' ? whitelistUsersList : blacklistUsersList).length ===
                  0 ? (
                    <p className="text-xs text-muted-foreground italic py-2">
                      Nenhum servidor adicionado a esta lista.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                      {(modoUsuarioTab === 'whitelist'
                        ? whitelistUsersList
                        : blacklistUsersList
                      ).map((func) => (
                        <div
                          key={func.id}
                          className="flex items-center justify-between p-2 rounded-lg border border-border bg-background"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img
                              src={getAvatarUrl(func)}
                              alt={func.nome}
                              className="w-6 h-6 rounded-full object-cover border border-border shrink-0"
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-semibold text-foreground block truncate">
                                {func.nome}
                              </span>
                              <span className="text-[10px] text-muted-foreground block truncate">
                                {func.cargo || 'Servidor'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (modoUsuarioTab === 'whitelist') {
                                handleToggleUserWhitelist(func.id)
                              } else {
                                handleToggleUserBlacklist(func.id)
                              }
                            }}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            title="Remover da lista"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </StandardDialog>
  )
}
