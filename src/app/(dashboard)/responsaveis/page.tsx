'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useSchoolStore } from '@/store/useSchoolStore'
import { useAuthStore } from '@/store/useAuthStore'
import { createClient } from '@/lib/supabaseClient'
import { StandardTable, TableColumn } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  UserPlus, 
  Search, 
  RefreshCw, 
  Edit, 
  ShieldAlert, 
  GraduationCap, 
  Phone, 
  Mail,
  CheckCircle2,
  Clock,
  FileCheck2,
  MessageSquareText,
  Send,
  XCircle,
  Check,
  User,
  Loader2
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

const ModalCadastroResponsavel = dynamic(
  () => import('@/components/modals/modal-cadastro-responsavel').then(m => m.ModalCadastroResponsavel),
  { ssr: false }
)

export default function GestaoResponsaveisPage() {
  const { selectedEscola } = useSchoolStore()
  const { funcionario } = useAuthStore()
  const supabase = useMemo(() => createClient(), [])

  const [activeTab, setActiveTab] = useState<'responsaveis' | 'solicitacoes' | 'mensagens'>('responsaveis')

  // Estado: Responsáveis
  const [responsaveis, setResponsaveis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [modalCadastroOpen, setModalCadastroOpen] = useState(false)
  const [responsavelEmEdicao, setResponsavelEmEdicao] = useState<any | null>(null)

  // Estado: Solicitações de Documentos
  const [solicitacoes, setSolicitacoes] = useState<any[]>([])
  const [loadingSolicitacoes, setLoadingSolicitacoes] = useState(false)
  const [solicitacaoEmAtendimento, setSolicitacaoEmAtendimento] = useState<any | null>(null)
  const [modalAtenderSolOpen, setModalAtenderSolOpen] = useState(false)
  const [novoStatusSol, setNovoStatusSol] = useState<'em_analise' | 'concluido' | 'recusado'>('concluido')
  const [respostaSol, setRespostaSol] = useState('')
  const [salvandoSol, setSalvandoSol] = useState(false)

  // Estado: Mensagens da Família
  const [mensagens, setMensagens] = useState<any[]>([])
  const [loadingMensagens, setLoadingMensagens] = useState(false)
  const [conversaAtiva, setConversaAtiva] = useState<any | null>(null)
  const [modalConversaOpen, setModalConversaOpen] = useState(false)
  const [historicoConversa, setHistoricoConversa] = useState<any[]>([])
  const [respostaMsg, setRespostaMsg] = useState('')
  const [enviandoMsg, setEnviandoMsg] = useState(false)

  const isMounted = useRef(true)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Carregar responsáveis cadastrados
  const carregarResponsaveis = async () => {
    if (!selectedEscola?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/responsaveis?escola_id=${selectedEscola.id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao buscar responsáveis')
      if (isMounted.current) {
        setResponsaveis(json.responsaveis || [])
      }
    } catch (err: any) {
      console.error('Erro ao carregar lista de responsáveis:', err)
      toast.error('Erro ao carregar responsáveis da escola.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  // Carregar solicitações da escola ativa
  const carregarSolicitacoes = async () => {
    if (!selectedEscola?.id) return
    setLoadingSolicitacoes(true)
    try {
      const { data, error } = await (supabase.from as any)('solicitacoes_responsaveis')
        .select(`
          id,
          escola_id,
          aluno_id,
          responsavel_id,
          tipo,
          titulo,
          observacoes,
          status,
          resposta_escola,
          concluido_em,
          created_at,
          aluno:aluno_id (id, nome, numero_matricula, turma:turma_id (nome)),
          responsavel:responsavel_id (id, nome, email, telefone)
        `)
        .eq('escola_id', selectedEscola.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (isMounted.current) {
        setSolicitacoes(data || [])
      }
    } catch (err: any) {
      console.error('Erro ao carregar solicitações escolares:', err)
      toast.error('Erro ao carregar solicitações de documentos.')
    } finally {
      if (isMounted.current) setLoadingSolicitacoes(false)
    }
  }

  // Carregar mensagens de responsáveis
  const carregarMensagens = async () => {
    if (!selectedEscola?.id) return
    setLoadingMensagens(true)
    try {
      const { data, error } = await (supabase.from as any)('mensagens_responsaveis')
        .select(`
          id,
          escola_id,
          turma_id,
          aluno_id,
          professor_id,
          responsavel_id,
          remetente_tipo,
          autor_nome,
          titulo,
          conteudo,
          lida_responsavel,
          lida_professor,
          created_at,
          aluno:aluno_id (id, nome, turma:turma_id (nome)),
          responsavel:responsavel_id (id, nome, email, telefone)
        `)
        .eq('escola_id', selectedEscola.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (isMounted.current) {
        setMensagens(data || [])
      }
    } catch (err: any) {
      console.error('Erro ao carregar mensagens dos pais:', err)
      toast.error('Erro ao carregar mensagens.')
    } finally {
      if (isMounted.current) setLoadingMensagens(false)
    }
  }

  useEffect(() => {
    if (selectedEscola?.id) {
      carregarResponsaveis()
      carregarSolicitacoes()
      carregarMensagens()
    }
  }, [selectedEscola?.id])

  // Guarda de segurança: Se a escola ativa estiver sem o portal dos pais ativado
  if (!selectedEscola?.portal_pais_ativo) {
    return (
      <div className="space-y-6">
        <div className="p-8 text-center bg-card border border-border text-card-foreground rounded-2xl max-w-xl mx-auto my-12 space-y-4 shadow-xs">
          <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-foreground">Portal dos Pais Desativado nesta Escola</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              O acesso e a gestão do Portal dos Pais estão atualmente desabilitados para a escola <strong>{selectedEscola?.nome || 'selecionada'}</strong>.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Para gerenciar responsáveis, responder mensagens e atender solicitações desta unidade, ative o recurso no Painel Administrativo em <strong>Escolas &gt; Gerenciar Portal</strong>.
          </p>
        </div>
      </div>
    )
  }

  const abrirAtendimentoSolicitacao = (sol: any) => {
    setSolicitacaoEmAtendimento(sol)
    setNovoStatusSol(sol.status === 'pendente' ? 'concluido' : sol.status)
    setRespostaSol(sol.resposta_escola || '')
    setModalAtenderSolOpen(true)
  }

  const salvarAtendimentoSolicitacao = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!solicitacaoEmAtendimento?.id) return

    setSalvandoSol(true)
    try {
      const payload = {
        status: novoStatusSol,
        resposta_escola: respostaSol.trim() || null,
        concluido_em: novoStatusSol === 'concluido' ? new Date().toISOString() : null,
        concluido_por: funcionario?.id ?? null,
      }

      const { error } = await (supabase.from as any)('solicitacoes_responsaveis')
        .update(payload)
        .eq('id', solicitacaoEmAtendimento.id)

      if (error) throw error

      setSolicitacoes(prev =>
        prev.map(s => (s.id === solicitacaoEmAtendimento.id ? { ...s, ...payload } : s))
      )
      setModalAtenderSolOpen(false)
      toast.success('Solicitação atualizada com sucesso!')
    } catch (err: any) {
      console.error('Erro ao atualizar solicitação:', err)
      toast.error('Erro ao salvar resposta da solicitação.')
    } finally {
      setSalvandoSol(false)
    }
  }

  const abrirConversa = async (msg: any) => {
    setConversaAtiva(msg)
    setRespostaMsg('')
    setModalConversaOpen(true)

    try {
      const { data, error } = await (supabase.from as any)('mensagens_responsaveis')
        .select('*')
        .eq('aluno_id', msg.aluno_id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (error) throw error
      setHistoricoConversa(data || [])

      if (!msg.lida_professor) {
        await (supabase.from as any)('mensagens_responsaveis')
          .update({
            lida_professor: true,
            lida_professor_em: new Date().toISOString()
          })
          .eq('id', msg.id)

        setMensagens(prev => prev.map(m => m.id === msg.id ? { ...m, lida_professor: true } : m))
      }
    } catch (err: any) {
      console.error('Erro ao abrir conversa:', err)
    }
  }

  const enviarRespostaSecretaria = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!respostaMsg.trim() || !conversaAtiva) return

    setEnviandoMsg(true)
    try {
      const payload = {
        escola_id: selectedEscola.id,
        turma_id: conversaAtiva.turma_id ?? null,
        aluno_id: conversaAtiva.aluno_id,
        professor_id: funcionario?.id ?? null,
        responsavel_id: conversaAtiva.responsavel_id ?? null,
        remetente_tipo: 'professor' as const,
        autor_nome: `${funcionario?.nome ?? 'Secretaria Escolar'} (Secretaria)`,
        titulo: `Resposta da Secretaria: ${conversaAtiva.titulo ?? 'Recado'}`,
        conteudo: respostaMsg.trim(),
        lida_responsavel: false,
        lida_professor: true,
        lida_professor_em: new Date().toISOString(),
      }

      const { data, error } = await (supabase.from as any)('mensagens_responsaveis')
        .insert(payload)
        .select()
        .single()

      if (error) throw error

      setHistoricoConversa(prev => [...prev, data])
      setRespostaMsg('')
      toast.success('Resposta enviada ao responsável!')
    } catch (err: any) {
      console.error('Erro ao responder mensagem:', err)
      toast.error('Erro ao enviar resposta.')
    } finally {
      setEnviandoMsg(false)
    }
  }

  const responsaveisFiltrados = responsaveis.filter((r) => {
    const termo = busca.toLowerCase()
    const matchNome = r.nome?.toLowerCase().includes(termo)
    const matchCpf = r.cpf?.includes(termo)
    const matchEmail = r.email?.toLowerCase().includes(termo)
    const matchFilhos = (r.alunos || []).some((a: any) => a.nome?.toLowerCase().includes(termo))
    return matchNome || matchCpf || matchEmail || matchFilhos
  })

  const solicitacoesFiltradas = solicitacoes.filter((s) => {
    const termo = busca.toLowerCase()
    const matchAluno = s.aluno?.nome?.toLowerCase().includes(termo)
    const matchResp = s.responsavel?.nome?.toLowerCase().includes(termo)
    const matchTitulo = s.titulo?.toLowerCase().includes(termo)
    return matchAluno || matchResp || matchTitulo
  })

  const mensagensFiltradas = mensagens.filter((m) => {
    const termo = busca.toLowerCase()
    const matchAluno = m.aluno?.nome?.toLowerCase().includes(termo)
    const matchResp = m.responsavel?.nome?.toLowerCase().includes(termo)
    const matchConteudo = m.conteudo?.toLowerCase().includes(termo)
    return matchAluno || matchResp || matchConteudo
  })

  const totalPais = responsaveis.length
  const pendentesSolicitacao = solicitacoes.filter(s => s.status === 'pendente').length
  const mensagensNaoLidas = mensagens.filter(m => m.remetente_tipo === 'responsavel' && !m.lida_professor).length

  const columnsResponsaveis: TableColumn<any>[] = [
    {
      header: 'Responsável',
      accessor: (r) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0">
            {r.nome?.charAt(0) || 'R'}
          </div>
          <div>
            <div className="font-semibold text-foreground">{r.nome}</div>
            <div className="text-xs text-muted-foreground font-mono">CPF: {r.cpf || 'Não informado'}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Contato',
      accessor: (r) => (
        <div className="space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Mail className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="truncate max-w-[180px]">{r.email}</span>
          </div>
          {r.telefone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
              <span>{r.telefone}</span>
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Filhos / Dependentes',
      accessor: (r) => {
        const alunos = r.alunos || []
        if (alunos.length === 0) {
          return <span className="text-xs text-amber-500 italic">Nenhum aluno vinculado</span>
        }
        return (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {alunos.map((a: any) => (
              <Badge key={a.id} variant="secondary" className="text-xs bg-muted text-foreground border-border flex items-center gap-1">
                <GraduationCap className="w-3 h-3 text-indigo-500" />
                {a.nome}
              </Badge>
            ))}
          </div>
        )
      }
    },
    {
      header: 'Status',
      accessor: (r) => (
        <div>
          {r.must_change_password ? (
            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1">
              <Clock className="w-3 h-3" /> 1º Acesso Pendente
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Ativo
            </Badge>
          )}
        </div>
      )
    },
    {
      header: 'Ações',
      headClassName: 'text-right w-28',
      className: 'text-right',
      accessor: (r) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setResponsavelEmEdicao(r)
            setModalCadastroOpen(true)
          }}
          className="text-sky-600 dark:text-sky-400 hover:text-sky-700 hover:bg-sky-500/10"
          title="Editar dados e redefinir senha provisória"
        >
          <Edit className="w-4 h-4" />
        </Button>
      )
    }
  ]

  const columnsSolicitacoes: TableColumn<any>[] = [
    {
      header: 'Documento / Pedido',
      accessor: (s) => (
        <div className="space-y-1">
          <div className="font-bold text-foreground flex items-center gap-1.5">
            <FileCheck2 className="w-4 h-4 text-indigo-500 shrink-0" />
            {s.titulo}
          </div>
          {s.observacoes && (
            <div className="text-xs text-muted-foreground line-clamp-1 italic">
              &quot;{s.observacoes}&quot;
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Aluno / Turma',
      accessor: (s) => (
        <div>
          <div className="font-semibold text-foreground">{s.aluno?.nome ?? 'Aluno'}</div>
          <div className="text-xs text-muted-foreground">{s.aluno?.turma?.nome ?? 'Sem turma'}</div>
        </div>
      )
    },
    {
      header: 'Responsável',
      accessor: (s) => (
        <div className="text-xs space-y-0.5">
          <div className="font-medium text-foreground">{s.responsavel?.nome ?? 'Responsável'}</div>
          <div className="text-muted-foreground">{s.responsavel?.telefone || s.responsavel?.email}</div>
        </div>
      )
    },
    {
      header: 'Data do Pedido',
      accessor: (s) => (
        <div className="text-xs text-muted-foreground">
          {new Date(s.created_at).toLocaleDateString('pt-BR')} às{' '}
          {new Date(s.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: (s) => {
        switch (s.status) {
          case 'pendente':
            return (
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1">
                <Clock className="w-3 h-3" /> Aguardando
              </Badge>
            )
          case 'em_analise':
            return (
              <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 gap-1">
                <Clock className="w-3 h-3" /> Em Confecção
              </Badge>
            )
          case 'concluido':
            return (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1">
                <CheckCircle2 className="w-3 h-3" /> Pronto p/ Retirada
              </Badge>
            )
          case 'recusado':
            return (
              <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1">
                <XCircle className="w-3 h-3" /> Recusada
              </Badge>
            )
          default:
            return null
        }
      }
    },
    {
      header: 'Ações',
      headClassName: 'text-right w-28',
      className: 'text-right',
      accessor: (s) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => abrirAtendimentoSolicitacao(s)}
          className="text-xs font-semibold border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
        >
          Atender
        </Button>
      )
    }
  ]

  const columnsMensagens: TableColumn<any>[] = [
    {
      header: 'Remetente / Aluno',
      accessor: (m) => (
        <div>
          <div className="font-semibold text-foreground flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-indigo-500" />
            {m.autor_nome ?? m.responsavel?.nome ?? 'Responsável'}
          </div>
          <div className="text-xs text-muted-foreground">
            Aluno(a): <strong className="text-foreground">{m.aluno?.nome}</strong> ({m.aluno?.turma?.nome ?? 'Turma'})
          </div>
        </div>
      )
    },
    {
      header: 'Mensagem / Recado',
      accessor: (m) => (
        <div className="max-w-md space-y-0.5">
          {m.titulo && m.titulo !== 'Recado da Família' && (
            <div className="font-bold text-xs text-foreground">{m.titulo}</div>
          )}
          <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {m.conteudo}
          </div>
        </div>
      )
    },
    {
      header: 'Data / Hora',
      accessor: (m) => (
        <div className="text-xs text-muted-foreground">
          {new Date(m.created_at).toLocaleDateString('pt-BR')} às{' '}
          {new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: (m) => (
        <div>
          {m.remetente_tipo === 'responsavel' && !m.lida_professor ? (
            <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-xs">
              Nova Mensagem
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Lida / Respondida
            </Badge>
          )}
        </div>
      )
    },
    {
      header: 'Ações',
      headClassName: 'text-right w-24',
      className: 'text-right',
      accessor: (m) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => abrirConversa(m)}
          className="text-xs font-semibold border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
        >
          Conversar
        </Button>
      )
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Portal dos Pais — Secretaria &amp; Responsáveis
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Unidade Escolar: <span className="text-foreground font-semibold">{selectedEscola?.nome || 'Todas as Escolas'}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              carregarResponsaveis()
              carregarSolicitacoes()
              carregarMensagens()
            }}
            disabled={loading || loadingSolicitacoes || loadingMensagens}
            className="border-border text-foreground hover:bg-muted"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${(loading || loadingSolicitacoes || loadingMensagens) ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            onClick={() => {
              setResponsavelEmEdicao(null)
              setModalCadastroOpen(true)
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 font-semibold shadow-lg shadow-indigo-600/20"
          >
            <UserPlus className="w-4 h-4" />
            Novo Responsável
          </Button>
        </div>
      </div>

      <div className="flex border-b border-border space-x-2">
        <button
          type="button"
          onClick={() => setActiveTab('responsaveis')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'responsaveis'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="w-4 h-4" />
          Responsáveis ({totalPais})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('solicitacoes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'solicitacoes'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          Solicitações de Documentos
          {pendentesSolicitacao > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {pendentesSolicitacao}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('mensagens')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'mensagens'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <MessageSquareText className="w-4 h-4" />
          Mensagens da Família
          {mensagensNaoLidas > 0 && (
            <span className="bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {mensagensNaoLidas}
            </span>
          )}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={
              activeTab === 'responsaveis'
                ? 'Buscar por nome do responsável, CPF, e-mail ou nome do aluno...'
                : activeTab === 'solicitacoes'
                ? 'Buscar por aluno, tipo de declaração ou responsável...'
                : 'Buscar por mensagem, recado, aluno ou responsável...'
            }
            className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {activeTab === 'responsaveis' && (
        <StandardTable
          data={responsaveisFiltrados}
          columns={columnsResponsaveis}
          keyExtractor={(r) => r.id}
          loading={loading}
          loadingMessage="Carregando responsáveis da escola..."
          emptyMessage="Nenhum responsável cadastrado nesta unidade escolar. Clique em 'Novo Responsável' para criar o primeiro acesso."
          className="border-border"
        />
      )}

      {activeTab === 'solicitacoes' && (
        <StandardTable
          data={solicitacoesFiltradas}
          columns={columnsSolicitacoes}
          keyExtractor={(s) => s.id}
          loading={loadingSolicitacoes}
          loadingMessage="Carregando solicitações de documentos..."
          emptyMessage="Nenhuma solicitação de declaração realizada pelos pais até o momento."
          className="border-border"
        />
      )}

      {activeTab === 'mensagens' && (
        <StandardTable
          data={mensagensFiltradas}
          columns={columnsMensagens}
          keyExtractor={(m) => m.id}
          loading={loadingMensagens}
          loadingMessage="Carregando mensagens da família..."
          emptyMessage="Nenhuma mensagem recebida dos responsáveis até o momento."
          className="border-border"
        />
      )}

      {modalCadastroOpen && selectedEscola?.id && (
        <ModalCadastroResponsavel
          open={modalCadastroOpen}
          onClose={() => {
            setModalCadastroOpen(false)
            setResponsavelEmEdicao(null)
          }}
          onSuccess={carregarResponsaveis}
          escolaId={selectedEscola.id}
          responsavelEmEdicao={responsavelEmEdicao}
        />
      )}

      <Dialog open={modalAtenderSolOpen} onOpenChange={setModalAtenderSolOpen}>
        <DialogContent className="sm:max-w-[540px] p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-indigo-500" />
              Atender Solicitação de Documento
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Atualize o status da solicitação e informe a resposta ao responsável.
            </DialogDescription>
          </DialogHeader>

          {solicitacaoEmAtendimento && (
            <form onSubmit={salvarAtendimentoSolicitacao} className="space-y-4 pt-2">
              <div className="bg-muted/50 p-3.5 rounded-xl border border-border space-y-1.5 text-xs">
                <div>
                  <span className="text-muted-foreground">Documento:</span>{' '}
                  <strong className="text-foreground">{solicitacaoEmAtendimento.titulo}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Aluno(a):</span>{' '}
                  <strong className="text-foreground">{solicitacaoEmAtendimento.aluno?.nome}</strong> ({solicitacaoEmAtendimento.aluno?.turma?.nome ?? 'Turma'})
                </div>
                <div>
                  <span className="text-muted-foreground">Responsável Solicitante:</span>{' '}
                  <strong className="text-foreground">{solicitacaoEmAtendimento.responsavel?.nome}</strong>
                </div>
                {solicitacaoEmAtendimento.observacoes && (
                  <div className="pt-1 text-muted-foreground italic border-t border-border mt-1">
                    Obs do Pai: &quot;{solicitacaoEmAtendimento.observacoes}&quot;
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Status do Pedido
                </label>
                <select
                  value={novoStatusSol}
                  onChange={(e) => setNovoStatusSol(e.target.value as any)}
                  disabled={salvandoSol}
                  className="w-full h-10 px-3 bg-card border border-border rounded-xl text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="concluido">Pronto para Retirada (Concluído)</option>
                  <option value="em_analise">Em Confecção na Secretaria</option>
                  <option value="recusado">Recusada / Documentação Pendente</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">
                  Mensagem / Instrução para o Responsável
                </label>
                <textarea
                  value={respostaSol}
                  onChange={(e) => setRespostaSol(e.target.value)}
                  placeholder="Ex: A Declaração do Bolsa Família está assinada e carimbada na secretaria. Retirar das 08h às 14h com documento."
                  rows={3}
                  disabled={salvandoSol}
                  className="w-full p-3 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setModalAtenderSolOpen(false)}
                  disabled={salvandoSol}
                  className="rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={salvandoSol}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold gap-1.5 px-5"
                >
                  {salvandoSol ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Salvar Resposta
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={modalConversaOpen} onOpenChange={setModalConversaOpen}>
        <DialogContent className="sm:max-w-[600px] p-6 flex flex-col h-[560px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <MessageSquareText className="w-5 h-5 text-indigo-500" />
              Conversa com a Família
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Aluno(a): <strong>{conversaAtiva?.aluno?.nome}</strong> | Responsável:{' '}
              <strong>{conversaAtiva?.responsavel?.nome ?? conversaAtiva?.autor_nome}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-muted/40 rounded-xl border border-border my-2">
            {historicoConversa.map((msg) => {
              const isSecretaria = msg.remetente_tipo === 'professor'
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isSecretaria ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl p-3 text-xs space-y-1 ${
                      isSecretaria
                        ? 'bg-indigo-600 text-white'
                        : 'bg-card text-foreground border border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] opacity-80">
                      <span className="font-bold">{msg.autor_nome || (isSecretaria ? 'Secretaria' : 'Responsável')}</span>
                      <span>{new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.conteudo}</p>
                  </div>
                </div>
              )
            })}
          </div>

          <form onSubmit={enviarRespostaSecretaria} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={respostaMsg}
              onChange={(e) => setRespostaMsg(e.target.value)}
              placeholder="Digite a resposta da secretaria para a família..."
              disabled={enviandoMsg}
              className="flex-1 h-10 px-3 bg-card border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <Button
              type="submit"
              disabled={enviandoMsg || !respostaMsg.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold h-10 px-4"
            >
              {enviandoMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
