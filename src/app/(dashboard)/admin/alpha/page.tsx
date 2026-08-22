'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { toast } from 'sonner'
import {
  FlaskConical,
  ArrowLeft,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ShieldCheck,
  UserPlus,
  Users,
  Layers,
  Route,
  Loader2,
  RefreshCw,
  KeyRound,
  Eye,
  Building2,
  AlertCircle,
  Info,
} from 'lucide-react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { AlphaIcon, AlphaIconMap } from '@/components/alpha/AlphaIcon'
import { AlphaFuncao } from '@/components/alpha/AlphaSidebar'
import { cn } from '@/lib/utils'

interface ContaAlpha {
  id: string
  auth_user_id: string | null
  nome: string
  email: string
  cargo: string | null
  created_at: string
  is_alpha: boolean | null
}

export default function AdminAlphaPage() {
  const router = useRouter()
  const supabase = createClient()
  const { funcionario } = useAuthStore()

  const [activeTab, setActiveTab] = useState<'funcoes' | 'contas' | 'status'>('funcoes')

  // Estados de Funções
  const [funcoes, setFuncoes] = useState<AlphaFuncao[]>([])
  const [loadingFuncoes, setLoadingFuncoes] = useState(true)
  const [updatingFuncaoId, setUpdatingFuncaoId] = useState<string | null>(null)

  // Modal Nova Função
  const [isModalFuncaoOpen, setIsModalFuncaoOpen] = useState(false)
  const [savingFuncao, setSavingFuncao] = useState(false)
  const [formCodigo, setFormCodigo] = useState('')
  const [formNome, setFormNome] = useState('')
  const [formDescricao, setFormDescricao] = useState('')
  const [formRota, setFormRota] = useState('')
  const [formIcone, setFormIcone] = useState('Route')
  const [formOrdem, setFormOrdem] = useState(1)

  // Estados de Contas
  const [contas, setContas] = useState<ContaAlpha[]>([])
  const [loadingContas, setLoadingContas] = useState(true)
  const [escolas, setEscolas] = useState<{ id: string; nome: string }[]>([])

  // Modal Nova Conta
  const [isModalContaOpen, setIsModalContaOpen] = useState(false)
  const [creatingConta, setCreatingConta] = useState(false)
  const [contaNome, setContaNome] = useState('')
  const [contaEmail, setContaEmail] = useState('')
  const [contaSenha, setContaSenha] = useState('')
  const [contaCargo, setContaCargo] = useState('Operador de Rotas / Motorista')
  const [contaEscolaId, setContaEscolaId] = useState('')

  // Exclusão de conta
  const [deletingContaId, setDeletingContaId] = useState<string | null>(null)

  const isSuperAdmin = funcionario?.is_superadmin === true

  // 1. Carregar Funções
  const carregarFuncoes = async () => {
    setLoadingFuncoes(true)
    try {
      const { data, error } = await supabase
        .from('alpha_funcoes')
        .select('*')
        .order('ordem', { ascending: true })

      if (error) throw error
      setFuncoes(data || [])
    } catch (err) {
      console.error('Erro ao carregar funções:', err)
      toast.error('Não foi possível carregar as funções do Alpha.')
    } finally {
      setLoadingFuncoes(false)
    }
  }

  // 2. Carregar Contas Alpha e Escolas
  const carregarContas = async () => {
    setLoadingContas(true)
    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('id, auth_user_id, nome, email, cargo, created_at, is_alpha')
        .eq('is_alpha', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setContas(data || [])
    } catch (err) {
      console.error('Erro ao carregar contas Alpha:', err)
      toast.error('Não foi possível carregar as contas de teste.')
    } finally {
      setLoadingContas(false)
    }
  }

  const carregarEscolas = async () => {
    try {
      const { data, error } = await supabase
        .from('escolas')
        .select('id, nome')
        .is('deleted_at', null)
        .order('nome')
      if (error) throw error
      setEscolas(data || [])
    } catch (err) {
      console.error('Erro ao carregar escolas:', err)
    }
  }

  useEffect(() => {
    carregarFuncoes()
    carregarContas()
    carregarEscolas()
  }, [])

  // Toggle Ativo/Inativo da Função
  const handleToggleAtivo = async (funcao: AlphaFuncao) => {
    setUpdatingFuncaoId(funcao.id)
    const novoStatus = !funcao.ativo
    try {
      const { error } = await supabase
        .from('alpha_funcoes')
        .update({ ativo: novoStatus, updated_at: new Date().toISOString() })
        .eq('id', funcao.id)

      if (error) throw error

      setFuncoes((prev) =>
        prev.map((f) => (f.id === funcao.id ? { ...f, ativo: novoStatus } : f))
      )
      toast.success(
        `Função "${funcao.nome}" ${novoStatus ? 'ativada na Sidebar' : 'desativada'}!`
      )
    } catch (err: any) {
      console.error('Erro ao alterar status da função:', err)
      toast.error('Falha ao atualizar status da função.')
    } finally {
      setUpdatingFuncaoId(null)
    }
  }

  // Criar Nova Função
  const handleSaveNovaFuncao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formCodigo || !formNome || !formRota) {
      toast.error('Preencha os campos obrigatórios: Código, Nome e Rota.')
      return
    }

    setSavingFuncao(true)
    try {
      const { data, error } = await supabase
        .from('alpha_funcoes')
        .insert({
          codigo: formCodigo.trim().toLowerCase().replace(/\s+/g, '-'),
          nome: formNome.trim(),
          descricao: formDescricao.trim() || null,
          rota: formRota.trim(),
          icone: formIcone,
          ordem: Number(formOrdem) || 1,
          ativo: true,
          criado_por: funcionario?.id ?? null,
        })
        .select()
        .single()

      if (error) throw error

      toast.success(`Função "${formNome}" adicionada com sucesso ao Alpha!`)
      setIsModalFuncaoOpen(false)
      setFormCodigo('')
      setFormNome('')
      setFormDescricao('')
      setFormRota('')
      setFormIcone('Route')
      setFormOrdem(funcoes.length + 1)
      carregarFuncoes()
    } catch (err: any) {
      console.error('Erro ao cadastrar função Alpha:', err)
      toast.error(err.message || 'Erro ao cadastrar função no banco.')
    } finally {
      setSavingFuncao(false)
    }
  }

  // Criar Conta Alpha Autoconfirmada
  const handleCriarConta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contaNome || !contaEmail || !contaSenha) {
      toast.error('Preencha nome, e-mail e senha de teste.')
      return
    }

    setCreatingConta(true)
    try {
      const res = await fetch('/api/admin/alpha/criar-conta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: contaNome,
          email: contaEmail,
          senha: contaSenha,
          cargo: contaCargo,
          escola_id: contaEscolaId || null,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Falha ao criar conta de teste.')
      }

      toast.success(json.message || 'Conta Alpha criada e autoconfirmada com sucesso!')
      setIsModalContaOpen(false)
      setContaNome('')
      setContaEmail('')
      setContaSenha('')
      setContaCargo('Operador de Rotas / Motorista')
      setContaEscolaId('')
      carregarContas()
    } catch (err: any) {
      console.error('Erro ao criar conta Alpha:', err)
      toast.error(err.message || 'Erro ao criar conta de teste.')
    } finally {
      setCreatingConta(false)
    }
  }

  // Excluir Conta Alpha
  const handleExcluirConta = async (id: string, nome: string) => {
    if (!confirm(`Deseja realmente excluir a conta de teste de "${nome}"?`)) return

    setDeletingContaId(id)
    try {
      const res = await fetch('/api/admin/alpha/excluir-conta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ funcionario_id: id }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || 'Falha ao excluir conta.')
      }

      toast.success('Conta de teste excluída com sucesso.')
      setContas((prev) => prev.filter((c) => c.id !== id))
    } catch (err: any) {
      console.error('Erro ao excluir conta:', err)
      toast.error(err.message || 'Erro ao excluir conta.')
    } finally {
      setDeletingContaId(null)
    }
  }

  return (
    <div className="space-y-6 select-none -mt-3 max-w-7xl mx-auto">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2.5 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-hoverCustom transition-colors"
            title="Voltar ao Super Painel"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Link href="/admin" className="hover:text-foreground transition-colors">
                Administração
              </Link>
              <span>/</span>
              <span className="text-violet-600 dark:text-violet-400 font-semibold">
                Sistema Alpha (Lab)
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2.5">
              <FlaskConical className="w-7 h-7 text-violet-500 stroke-[2.2]" />
              Painel de Controle — Sistema Alpha
              <span className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/25 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold tracking-wider uppercase">
                ROOT LAB
              </span>
            </h1>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="flex items-center gap-3">
          <Link
            href="/alpha"
            target="_blank"
            className="bg-violet-600 hover:bg-violet-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors shadow-sm shadow-violet-600/30"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Abrir Rota Alpha (/alpha)</span>
          </Link>
        </div>
      </div>

      {/* ── Navegação entre Abas ── */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('funcoes')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
            activeTab === 'funcoes'
              ? 'bg-violet-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-card border border-transparent'
          )}
        >
          <Layers className="w-4 h-4" />
          <span>Funções & Sidebar ({funcoes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('contas')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
            activeTab === 'contas'
              ? 'bg-violet-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-card border border-transparent'
          )}
        >
          <Users className="w-4 h-4" />
          <span>Contas de Teste ({contas.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('status')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer',
            activeTab === 'status'
              ? 'bg-violet-600 text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-card border border-transparent'
          )}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Isolamento & Status</span>
        </button>
      </div>

      {/* ── ABA 1: FUNÇÕES & SIDEBAR ── */}
      {activeTab === 'funcoes' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-5 rounded-2xl">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-500" />
                Módulos do Sistema Alpha
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ative ou desative quais funções aparecem no sidebar do sistema Alpha e adicione novas
                ferramentas experimentais.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFormOrdem(funcoes.length + 1)
                setIsModalFuncaoOpen(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm shadow-violet-600/25 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Nova Função</span>
            </button>
          </div>

          {loadingFuncoes ? (
            <div className="flex items-center justify-center py-16 text-xs text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
              Carregando funções do Alpha...
            </div>
          ) : funcoes.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-2xl bg-card">
              <p className="text-sm font-semibold text-foreground">Nenhuma função cadastrada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {funcoes.map((fn) => (
                <div
                  key={fn.id}
                  onClick={() => router.push(`/admin/alpha/funcoes/${fn.codigo}`)}
                  className={cn(
                    'group bg-card border rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md hover:border-violet-500/50',
                    fn.ativo ? 'border-border' : 'border-border/60 opacity-75 bg-card/60'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <AlphaIcon name={fn.icone} className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                            {fn.nome}
                          </h3>
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            Ordem #{fn.ordem}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {fn.descricao || 'Sem descrição cadastrada.'}
                        </p>
                      </div>
                    </div>

                    {/* Toggle de ativação com stopPropagation */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleToggleAtivo(fn)
                      }}
                      disabled={updatingFuncaoId === fn.id}
                      className={cn(
                        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50',
                        fn.ativo ? 'bg-emerald-500' : 'bg-zinc-600'
                      )}
                      title={fn.ativo ? 'Desativar da Sidebar' : 'Ativar na Sidebar'}
                    >
                      <span
                        className={cn(
                          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                          fn.ativo ? 'translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-border text-xs font-mono text-muted-foreground">
                    <span className="truncate max-w-[180px] sm:max-w-[240px]">Rota: {fn.rota}</span>
                    <div className="flex items-center gap-2">
                      <Link
                        href={fn.rota}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-foreground flex items-center gap-1 font-sans text-xs px-2 py-1 rounded-lg hover:bg-hoverCustom transition-colors"
                      >
                        <span>Testar</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                      <Link
                        href={`/admin/alpha/funcoes/${fn.codigo}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-violet-600 dark:text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1 font-sans font-bold text-xs transition-colors"
                      >
                        <span>Configurar</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ABA 2: CONTAS DE TESTE ALPHA ── */}
      {activeTab === 'contas' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-5 rounded-2xl">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-violet-500" />
                Contas de Teste Autoconfirmadas
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Crie usuários de teste com 1 clique. As contas são autoconfirmadas e marcadas com{' '}
                <code className="text-violet-400">is_alpha = true</code>, operando sem interferir
                nos dados oficiais do SIG.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsModalContaOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm shadow-violet-600/25 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Conta de Teste</span>
            </button>
          </div>

          {loadingContas ? (
            <div className="flex items-center justify-center py-16 text-xs text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
              Carregando contas de teste...
            </div>
          ) : contas.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-border rounded-2xl bg-card">
              <p className="text-sm font-semibold text-foreground">Nenhuma conta de teste criada</p>
              <p className="text-xs text-muted-foreground mt-1">
                Clique no botão acima para gerar sua primeira conta de teste autoconfirmada.
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Operador / Servidor</th>
                      <th className="px-4 py-3">E-mail de Login</th>
                      <th className="px-4 py-3">Cargo Operacional</th>
                      <th className="px-4 py-3">Criado em</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {contas.map((c) => (
                      <tr key={c.id} className="hover:bg-hoverCustom transition-colors">
                        <td className="px-4 py-3.5 font-bold text-foreground">
                          <div className="flex items-center gap-2">
                            <span>{c.nome}</span>
                            <span className="bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 text-[9px] font-extrabold px-1.5 py-0.2 rounded-sm">
                              ALPHA
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono text-muted-foreground">{c.email}</td>
                        <td className="px-4 py-3.5 text-muted-foreground">
                          {c.cargo ?? 'Operador Alpha'}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleExcluirConta(c.id, c.nome)}
                              disabled={deletingContaId === c.id}
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-50 cursor-pointer"
                              title="Excluir Conta de Teste"
                            >
                              {deletingContaId === c.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ABA 3: ISOLAMENTO & STATUS ── */}
      {activeTab === 'status' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border p-5 rounded-2xl space-y-3">
            <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>Status do Encapsulamento</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O ecossistema Alpha possui blindagem estrita. Contas operacionais de teste não
              possuem privilégios ROOT, possuem permissões operacionais e são excluídas
              automaticamente de relatórios de folha, contagem de servidores e aniversários.
            </p>
            <div className="pt-2 border-t border-border space-y-1.5 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Funções ativas na Sidebar:</span>
                <strong className="text-foreground">
                  {funcoes.filter((f) => f.ativo).length} de {funcoes.length}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Contas de teste ativas:</span>
                <strong className="text-foreground">{contas.length}</strong>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border p-5 rounded-2xl space-y-3">
            <div className="flex items-center gap-2.5 text-violet-600 dark:text-violet-400 font-bold text-sm">
              <Info className="w-5 h-5" />
              <span>Como funciona a rota /alpha</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A rota <code className="text-violet-400">/alpha</code> possui layout próprio, menu
              lateral reativo às funções ativadas nesta página e identificação clara de ambiente de
              laboratório experimental.
            </p>
            <div className="pt-2">
              <Link
                href="/alpha"
                target="_blank"
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 text-xs font-bold transition-colors"
              >
                <span>Acessar /alpha agora</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: NOVA FUNÇÃO ── */}
      <StandardDialog
        open={isModalFuncaoOpen}
        onOpenChange={setIsModalFuncaoOpen}
        title="Cadastrar Nova Função no Alpha"
        description="Adicione um novo módulo experimental que será listado na sidebar do sistema Alpha."
      >
        <form onSubmit={handleSaveNovaFuncao} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Código Único (Slug)</label>
              <input
                type="text"
                value={formCodigo}
                onChange={(e) => setFormCodigo(e.target.value)}
                placeholder="ex: rotas-escolas"
                required
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Nome da Função</label>
              <input
                type="text"
                value={formNome}
                onChange={(e) => setFormNome(e.target.value)}
                placeholder="ex: Geolocalização e Rotas"
                required
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">Descrição</label>
            <input
              type="text"
              value={formDescricao}
              onChange={(e) => setFormDescricao(e.target.value)}
              placeholder="Breve resumo da finalidade da função"
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-foreground">Rota de Destino</label>
              <input
                type="text"
                value={formRota}
                onChange={(e) => setFormRota(e.target.value)}
                placeholder="ex: /alpha/rotas-escolas"
                required
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-violet-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Ordem no Menu</label>
              <input
                type="number"
                value={formOrdem}
                onChange={(e) => setFormOrdem(Number(e.target.value))}
                min={1}
                required
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">Ícone Lucide</label>
            <select
              value={formIcone}
              onChange={(e) => setFormIcone(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-violet-500"
            >
              {Object.keys(AlphaIconMap).map((iconName) => (
                <option key={iconName} value={iconName}>
                  {iconName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsModalFuncaoOpen(false)}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-hoverCustom transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingFuncao}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-sm shadow-violet-600/25 flex items-center gap-2"
            >
              {savingFuncao && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Salvar Função</span>
            </button>
          </div>
        </form>
      </StandardDialog>

      {/* ── MODAL: NOVA CONTA ALPHA ── */}
      <StandardDialog
        open={isModalContaOpen}
        onOpenChange={setIsModalContaOpen}
        title="Criar Conta de Teste Autoconfirmada"
        description="Crie uma conta operacional autoconfirmada para testar o sistema Alpha como um funcionário de campo."
      >
        <form onSubmit={handleCriarConta} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-bold text-foreground">Nome Completo do Operador</label>
            <input
              type="text"
              value={contaNome}
              onChange={(e) => setContaNome(e.target.value)}
              placeholder="ex: João Silva (Testes)"
              required
              className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-violet-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">E-mail de Login</label>
              <input
                type="email"
                value={contaEmail}
                onChange={(e) => setContaEmail(e.target.value)}
                placeholder="alpha.operador@sapeacu.ba.gov.br"
                required
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-violet-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Senha Inicial</label>
              <input
                type="text"
                value={contaSenha}
                onChange={(e) => setContaSenha(e.target.value)}
                placeholder="Mínimo 6 dígitos"
                required
                minLength={6}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-violet-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Função / Cargo</label>
              <input
                type="text"
                value={contaCargo}
                onChange={(e) => setContaCargo(e.target.value)}
                placeholder="ex: Motorista / Operador de Rotas"
                required
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground">Escola de Vínculo (Opcional)</label>
              <select
                value={contaEscolaId}
                onChange={(e) => setContaEscolaId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-xs text-foreground focus:outline-none focus:border-violet-500"
              >
                <option value="">Nenhuma / Geral da Rede</option>
                {escolas.map((esc) => (
                  <option key={esc.id} value={esc.id}>
                    {esc.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsModalContaOpen(false)}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-hoverCustom transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creatingConta}
              className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50 shadow-sm shadow-violet-600/25 flex items-center gap-2"
            >
              {creatingConta && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Criar Conta Autoconfirmada</span>
            </button>
          </div>
        </form>
      </StandardDialog>
    </div>
  )
}
