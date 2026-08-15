'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import {
  FileCheck2,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  FileText,
  Building2,
  User,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import PortalPaisLayout from '@/components/portal-pais/PortalPaisLayout'

const AZUL = '#0B4FB3'
const LARANJA = '#F47C12'

interface AlunoDependente {
  id: string
  nome: string
  numero_matricula: string | null
  escola: {
    id: string
    nome: string
    portal_pais_ativo: boolean
  } | null
  turma: {
    id: string
    nome: string
  } | null
}

interface Solicitacao {
  id: string
  escola_id: string
  aluno_id: string
  responsavel_id: string
  tipo: string
  titulo: string
  observacoes: string | null
  status: 'pendente' | 'em_analise' | 'concluido' | 'recusado'
  resposta_escola: string | null
  concluido_em: string | null
  created_at: string
  aluno?: {
    nome: string
  }
  escola?: {
    nome: string
  }
}

export default function SolicitacoesPaisPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [responsavel, setResponsavel] = useState<{ id: string; nome: string; email: string } | null>(null)
  const [filhos, setFilhos] = useState<AlunoDependente[]>([])
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])

  // Modal de nova solicitação
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedAlunoId, setSelectedAlunoId] = useState<string>('')
  const [tipoDocumento, setTipoDocumento] = useState<string>('declaracao_bolsa_familia')
  const [observacoes, setObservacoes] = useState<string>('')
  const [enviando, setEnviando] = useState(false)

  const isMounted = useRef(true)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  const carregarDados = async () => {
    try {
      setLoading(true)
      const { data: authData } = await supabase.auth.getUser()
      const authUser = authData?.user

      if (!authUser) {
        router.push('/portal-aluno/login')
        return
      }

      // Buscar perfil do responsável
      const { data: respData, error: respError } = await supabase
        .from('responsaveis')
        .select('id, nome, email')
        .eq('auth_user_id', authUser.id)
        .maybeSingle()

      if (respError || !respData) {
        toast.error('Perfil de responsável não encontrado.')
        return
      }

      if (!isMounted.current) return
      setResponsavel(respData)

      // Buscar dependentes vinculados
      const { data: vinculosData, error: vincError } = await supabase
        .from('responsaveis_alunos')
        .select(`
          aluno_id,
          aluno:aluno_id (
            id,
            nome,
            numero_matricula,
            escola:escola_id (id, nome, portal_pais_ativo),
            turma:turma_id (id, nome)
          )
        `)
        .eq('responsavel_id', respData.id)

      if (vincError) throw vincError

      const listaFilhos: AlunoDependente[] = (vinculosData || [])
        .map((v: any) => v.aluno)
        .filter(Boolean)

      if (!isMounted.current) return
      setFilhos(listaFilhos)
      if (listaFilhos.length > 0) {
        setSelectedAlunoId(listaFilhos[0].id)
      }

      // Buscar solicitações existentes
      const { data: solData, error: solError } = await supabase
        .from('solicitacoes_responsaveis')
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
          aluno:aluno_id (nome),
          escola:escola_id (nome)
        `)
        .eq('responsavel_id', respData.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (solError) throw solError

      if (!isMounted.current) return
      setSolicitacoes(solData || [])
    } catch (err: unknown) {
      console.error('Erro ao carregar solicitações do responsável:', err)
      toast.error('Não foi possível carregar o histórico de solicitações.')
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [supabase, router])

const TITULOS_MAP: Record<string, string> = {
  declaracao_bolsa_familia: 'Declaração para Bolsa Família',
  declaracao_matricula: 'Declaração de Matrícula e Frequência',
  historico_escolar: 'Solicitação de Histórico Escolar',
  outro: 'Outra Solicitação à Secretaria',
}

  const resetForm = () => {
    setObservacoes('')
    setTipoDocumento('declaracao_bolsa_familia')
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm()
    setModalOpen(open)
  }

  const abrirModalSolicitacao = (tipo: string = 'declaracao_bolsa_familia') => {
    setTipoDocumento(tipo)
    setObservacoes('')
    if (filhos.length > 0 && !selectedAlunoId) {
      setSelectedAlunoId(filhos[0].id)
    }
    setModalOpen(true)
  }

  const handleEnviarSolicitacao = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedAlunoId) {
      toast.error('Selecione o dependente para quem deseja a declaração.')
      return
    }

    const alunoSelecionado = filhos.find((f) => f.id === selectedAlunoId)
    if (!alunoSelecionado || !alunoSelecionado.escola?.id) {
      toast.error('Escola do dependente não identificada.')
      return
    }

    if (!responsavel?.id) {
      toast.error('Identificação do responsável ausente.')
      return
    }

    setEnviando(true)
    const novoTitulo = TITULOS_MAP[tipoDocumento] ?? 'Declaração Escolar'

    try {
      const payload = {
        escola_id: alunoSelecionado.escola.id,
        aluno_id: alunoSelecionado.id,
        responsavel_id: responsavel.id,
        tipo: tipoDocumento,
        titulo: novoTitulo,
        observacoes: observacoes.trim() || null,
        status: 'pendente',
      }

      const { data, error } = await supabase
        .from('solicitacoes_responsaveis')
        .insert(payload)
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
          aluno:aluno_id (nome),
          escola:escola_id (nome)
        `)
        .single()

      if (error) throw error

      setSolicitacoes((prev) => [data, ...prev])
      resetForm()
      setModalOpen(false)
      toast.success('Solicitação enviada com sucesso para a secretaria da escola!')
    } catch (err: unknown) {
      console.error('Erro ao enviar solicitação:', err)
      toast.error('Erro ao enviar solicitação. Tente novamente mais tarde.')
    } finally {
      setEnviando(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err: unknown) {
      console.error('Erro ao encerrar sessão:', err)
    } finally {
      router.push('/portal-aluno/login')
    }
  }

  const getStatusBadge = (status: Solicitacao['status']) => {
    switch (status) {
      case 'pendente':
        return (
          <Badge className="bg-amber-500/10 text-amber-700 border-amber-300 font-bold gap-1 px-2.5 py-1">
            <Clock className="w-3.5 h-3.5" />
            Aguardando Secretaria
          </Badge>
        )
      case 'em_analise':
        return (
          <Badge className="bg-sky-500/10 text-sky-700 border-sky-300 font-bold gap-1 px-2.5 py-1">
            <Clock className="w-3.5 h-3.5" />
            Em Confecção
          </Badge>
        )
      case 'concluido':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 font-bold gap-1 px-2.5 py-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Pronto para Retirada
          </Badge>
        )
      case 'recusado':
        return (
          <Badge className="bg-rose-500/10 text-rose-700 border-rose-300 font-bold gap-1 px-2.5 py-1">
            <XCircle className="w-3.5 h-3.5" />
            Recusada
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <PortalPaisLayout
      nomeResponsavel={responsavel?.nome ?? 'Responsável'}
      onLogout={handleLogout}
      headerSubtitle="Central de Solicitações"
    >
      <div className="space-y-7 max-w-5xl mx-auto">
        
        {/* Cabeçalho da Página */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-black tracking-tight"
              style={{ color: '#102D50', fontFamily: 'var(--font-manrope), sans-serif' }}
            >
              Solicitações Escolares
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Peça declarações, documentos e acompanhe o andamento direto com a secretaria da escola.
            </p>
          </div>

          <Button
            onClick={() => abrirModalSolicitacao('declaracao_bolsa_familia')}
            className="font-bold text-white shadow-md gap-2 h-11 px-5 rounded-xl cursor-pointer"
            style={{ backgroundColor: AZUL }}
          >
            <Plus className="w-4 h-4" />
            Nova Solicitação
          </Button>
        </div>

        {/* Card Destaque: Solicitação Rápida Bolsa Família */}
        <div
          className="rounded-2xl p-6 bg-white border border-[#DCE7F2] shadow-[0_8px_24px_rgba(16,45,80,0.06)] relative overflow-hidden"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4">
              <div
                className="w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 shadow-sm"
                style={{ backgroundColor: '#FFF2E6' }}
              >
                <FileCheck2 className="w-7 h-7" style={{ color: LARANJA }} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md">
                    Mais Solicitada
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-[#102D50]">
                  Declaração para Bolsa Família / CadÚnico
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
                  Solicite a declaração de frequência e matrícula escolar do seu filho exigida para comprovação no CRAS e manutenção do benefício Bolsa Família.
                </p>
              </div>
            </div>

            <Button
              onClick={() => abrirModalSolicitacao('declaracao_bolsa_familia')}
              className="font-extrabold text-white h-11 px-6 rounded-xl shrink-0 cursor-pointer"
              style={{ backgroundColor: LARANJA }}
            >
              Pedir Declaração
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Seção de Histórico de Solicitações */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-[#102D50]">
              Histórico de Pedidos ({solicitacoes.length})
            </h2>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-[#DCE7F2] p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#0B4FB3]" />
              <p className="text-sm text-slate-500 font-medium">Carregando solicitações...</p>
            </div>
          ) : solicitacoes.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#DCE7F2] p-10 sm:p-12 text-center space-y-4">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <FileText className="w-7 h-7" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-base font-bold text-[#102D50]">Nenhuma solicitação realizada</h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Quando você pedir uma declaração do Bolsa Família ou documento escolar, ela aparecerá aqui para você acompanhar o status em tempo real.
                </p>
              </div>
              <Button
                onClick={() => abrirModalSolicitacao('declaracao_bolsa_familia')}
                className="font-bold text-white rounded-xl gap-2 mt-2"
                style={{ backgroundColor: AZUL }}
              >
                <Plus className="w-4 h-4" />
                Fazer meu primeiro pedido
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5">
              {solicitacoes.map((sol) => (
                <div
                  key={sol.id}
                  className="bg-white rounded-2xl border border-[#DCE7F2] p-5 sm:p-6 shadow-xs hover:border-[#BDD5ED] transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B4FB3] flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold text-[#102D50]">{sol.titulo}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <User className="w-3.5 h-3.5 text-[#0B4FB3]" />
                            {sol.aluno?.nome ?? 'Aluno'}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {sol.escola?.nome ?? 'Escola Municipal'}
                          </span>
                          <span>•</span>
                          <span>
                            Pedido em: {new Date(sol.created_at).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(sol.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="self-start sm:self-center">
                      {getStatusBadge(sol.status)}
                    </div>
                  </div>

                  {sol.observacoes && (
                    <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 border border-slate-100">
                      <span className="font-bold text-slate-700">Suas observações: </span>
                      {sol.observacoes}
                    </div>
                  )}

                  {sol.resposta_escola && (
                    <div className="bg-emerald-50 rounded-xl p-3.5 text-xs text-emerald-900 border border-emerald-200/80 flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-emerald-950">Mensagem da Secretaria Escolar:</p>
                        <p className="mt-0.5 leading-relaxed">{sol.resposta_escola}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Modal de Nova Solicitação */}
      <Dialog open={modalOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[500px] p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-[#102D50] flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-[#0B4FB3]" />
              Nova Solicitação à Escola
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Preencha os dados abaixo. A secretaria da escola receberá seu pedido imediatamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEnviarSolicitacao} className="space-y-4 pt-2">
            {/* Seleção do Dependente/Filho */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#102D50]">
                Aluno / Dependente <span className="text-rose-500">*</span>
              </label>
              {filhos.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Nenhum dependente vinculado.</p>
              ) : (
                <select
                  value={selectedAlunoId}
                  onChange={(e) => setSelectedAlunoId(e.target.value)}
                  required
                  disabled={enviando}
                  className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B4FB3]/20 focus:border-[#0B4FB3]"
                >
                  {filhos.map((filho) => (
                    <option key={filho.id} value={filho.id}>
                      {filho.nome} ({filho.escola?.nome ?? 'Escola'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Tipo de Documento */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#102D50]">
                Tipo de Solicitação <span className="text-rose-500">*</span>
              </label>
              <select
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
                required
                disabled={enviando}
                className="w-full h-11 px-3 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0B4FB3]/20 focus:border-[#0B4FB3]"
              >
                <option value="declaracao_bolsa_familia">Declaração para Bolsa Família / CadÚnico</option>
                <option value="declaracao_matricula">Declaração de Matrícula e Frequência</option>
                <option value="historico_escolar">Histórico Escolar</option>
                <option value="outro">Outro Requerimento à Secretaria</option>
              </select>
            </div>

            {/* Observações Opcionais */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#102D50]">
                Observações / Informações Adicionais (Opcional)
              </label>
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Necessário constar o NIS do aluno para atualização no CRAS..."
                rows={3}
                disabled={enviando}
                className="w-full p-3 bg-white border border-slate-300 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B4FB3]/20 focus:border-[#0B4FB3] resize-none"
              />
            </div>

            {/* Aviso Informativo */}
            <div className="flex items-start gap-2 bg-blue-50 p-3 rounded-xl text-[11px] text-blue-900 border border-blue-100">
              <ShieldCheck className="w-4 h-4 text-[#0B4FB3] shrink-0 mt-0.5" />
              <span>
                Assim que a secretaria emitir a declaração, o status será atualizado e você poderá retirar o documento assinado na secretaria da escola.
              </span>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={enviando}
                className="rounded-xl font-bold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={enviando || filhos.length === 0}
                className="rounded-xl font-bold text-white gap-2 px-5 cursor-pointer"
                style={{ backgroundColor: AZUL }}
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Enviar Solicitação
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PortalPaisLayout>
  )
}
