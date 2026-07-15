'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  GraduationCap, 
  Printer, 
  Edit, 
  Trash2, 
  Phone, 
  MapPin, 
  School, 
  BookOpen, 
  User, 
  FileText,
  BadgeInfo,
  Building2,
  ArrowLeft,
  Archive,
  Paperclip,
  Lock,
  Check,
  XCircle,
  Hash
} from 'lucide-react'
import Link from 'next/link'
import { ModalAluno } from '@/components/modals/modal-aluno'
import { PrintFichaAluno } from '@/components/print/print-ficha-aluno'
import { PrintComprovanteMatricula } from '@/components/print/print-comprovante-matricula'
import { ModalJustificativaArquivamento } from '@/components/modals/modal-justificativa-arquivamento'
import { ModalAlunosAnexos } from '@/components/modals/modal-alunos-anexos'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/useAuthStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { IconTile } from '@/components/ui/icon-tile'

interface Aluno {
  id: string
  nome: string
  cpf?: string | null
  inep?: string | null
  telefone?: string | null
  data_nascimento?: string | null
  rg?: string | null
  nis?: string | null
  cartao_sus?: string | null
  certidao_nascimento?: string | null
  nome_mae?: string | null
  nome_pai?: string | null
  endereco?: string | null
  latitude?: number | null
  longitude?: number | null
  serie?: string | null
  escola_id?: string | null
  escola_nome?: string
  foto_url?: string | null
  dados_matricula?: Record<string, any>
  numero_matricula?: string | null
  created_at: string
}

export default function AlunosPage() {
  const { funcionario, escolaAtivaId, acessos, isAdminGlobalOrRoot } = useAuthStore()

  const isProfessor = acessos?.some(a => a.nivel === 4 || a.nivel === 5) || funcionario?.cargo?.toLowerCase().includes('professor')

  if (isProfessor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-surface-1 border border-borderCustom rounded-2xl space-y-6">
        <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[#185FA5] dark:text-[#3ea6ff]">
          <GraduationCap className="w-8 h-8" />
        </div>
        <div className="space-y-2 max-w-md">
          <h1 className="text-2xl font-bold text-white tracking-tight">Área de Alunos do Professor</h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Esta funcionalidade está sendo customizada e atualmente está em desenvolvimento. Em breve você poderá gerenciar a lista de alunos de suas turmas e disciplinas.
          </p>
        </div>
        <div className="pt-2">
          <Link href="/home">
            <Button className="bg-[#185FA5] hover:bg-[#144f8a] text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-all shadow-md cursor-pointer border-none">
              Voltar ao Início
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const { isEditMode } = useEditModeStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [alunoSelecionadoEditar, setAlunoSelecionadoEditar] = useState<Aluno | null>(null)
  const [alunoImprimir, setAlunoImprimir] = useState<Aluno | null>(null)
  const [alunoComprovanteImprimir, setAlunoComprovanteImprimir] = useState<Aluno | null>(null)
  const [alunoArquivar, setAlunoArquivar] = useState<Aluno | null>(null)
  const [alunoAnexos, setAlunoAnexos] = useState<Aluno | null>(null)
  
  // Estados para gerenciamento de solicitações de liberação pelo Diretor/Admin
  const [solicitacoes, setSolicitacoes] = useState<any[]>([])
  const [carregandoSolicitacoes, setCarregandoSolicitacoes] = useState(false)

  const carregarSolicitacoes = async () => {
    const isDiretor = acessos.some(a => a.nivel === 2 && a.ativo)
    const isAdmin = isAdminGlobalOrRoot()
    
    // Apenas diretores e admins gerenciam solicitações
    if (!isDiretor && !isAdmin) return

    const supabase = createClient()
    setCarregandoSolicitacoes(true)
    
    try {
      // Filtrar solicitações da escola ativa
      let query = (supabase
        .from('solicitacoes_edicao_aluno' as any) as any)
        .select('*, alunos!inner(nome, escola_id, escolas(nome)), solicitante:funcionarios(nome)')
        .eq('status', 'pendente')
      
      if (!isAdmin && escolaAtivaId) {
        query = query.eq('alunos.escola_id', escolaAtivaId)
      }
      
      const { data, error } = await query.order('criado_em', { ascending: true })
      if (error) throw error
      setSolicitacoes(data || [])
    } catch (err: any) {
      console.error('Erro ao carregar solicitações de liberação:', err)
    } finally {
      setCarregandoSolicitacoes(false)
    }
  }

  const handleResponderSolicitacao = async (id: string, status: 'aprovado' | 'rejeitado') => {
    const supabase = createClient()
    
    try {
      const { error } = await (supabase
        .from('solicitacoes_edicao_aluno' as any) as any)
        .update({
          status,
          aprovado_por: funcionario?.id || null,
          respondido_em: new Date().toISOString()
        } as any)
        .eq('id', id)
      
      if (error) throw error
      
      toast.success(`Solicitação ${status === 'aprovado' ? 'aprovada' : 'rejeitada'} com sucesso!`)
      carregarSolicitacoes()
      carregarAlunos() // Recarregar alunos para destravar a ficha
    } catch (err: any) {
      toast.error(`Erro ao responder solicitação: ${err.message}`)
    }
  }

  const carregarAlunos = async () => {
    const supabase = createClient()
    setLoading(true)
    
    const isAdmin = isAdminGlobalOrRoot()
    const isDiretor = acessos.some(a => a.nivel === 2 && a.ativo)
    const isSecretario = acessos.some(a => a.nivel === 3 && a.ativo) && 
      !funcionario?.cargo?.toLowerCase().includes('coordenador')

    let query = supabase.from('alunos').select('*, escolas(nome)').is('deleted_at', null)
    
    if (!isAdmin && escolaAtivaId) {
      if (isDiretor || isSecretario) {
        query = query.eq('escola_id', escolaAtivaId)
      } else {
        // Professor ou Coordenador: só vê alunos das suas turmas
        const { data: vTurmas } = await supabase
          .from('vinculos_turmas')
          .select('turma_id')
          .eq('funcionario_id', funcionario?.id || '')
          .eq('escola_id', escolaAtivaId)

        const ids = (vTurmas ?? []).map((vt: any) => vt.turma_id)
        if (ids.length > 0) {
          query = query.eq('escola_id', escolaAtivaId).in('turma_id', ids) as typeof query
        } else {
          setAlunos([])
          setLoading(false)
          return
        }
      }
    } else if (isAdmin && escolaAtivaId) {
      // Se for admin global e tiver escola selecionada, filtra por ela
      query = query.eq('escola_id', escolaAtivaId)
    }
    
    const { data } = await query.order('nome', { ascending: true })
    if (data) {
      const mapped = (data as any[]).map((aluno: any) => ({
        ...aluno,
        escola_nome: aluno.escolas?.nome ?? aluno.dados_matricula?.escolaNome ?? 'Sem Escola'
      }))
      setAlunos(mapped)
    }
    setLoading(false)
  }

  useEffect(() => {
    carregarAlunos()
    carregarSolicitacoes()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolaAtivaId])

  const alunosFiltrados = alunos.filter(
    (aluno) =>
      aluno.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (aluno.numero_matricula && aluno.numero_matricula.includes(searchTerm)) ||
      (aluno.cpf && aluno.cpf.includes(searchTerm)) ||
      (aluno.inep && aluno.inep.includes(searchTerm))
  )

  const handleNovoAluno = () => {
    setAlunoSelecionadoEditar(null)
    setModalOpen(true)
  }

  const handleEditarAluno = (aluno: Aluno) => {
    setAlunoSelecionadoEditar(aluno)
    setModalOpen(true)
  }

  const handleImprimirAluno = (aluno: Aluno) => {
    setAlunoImprimir(aluno)
  }


  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0">
      {/* Modal de Cadastro / Edição */}
      <ModalAluno 
        open={modalOpen} 
        onOpenChange={setModalOpen}
        alunoEditar={alunoSelecionadoEditar}
        onSuccess={carregarAlunos} 
      />

      {/* Tela / Modal de Impressão da Ficha do Aluno */}
      {alunoImprimir && (
        <PrintFichaAluno 
          aluno={alunoImprimir}
          onClose={() => setAlunoImprimir(null)}
        />
      )}

      {/* Tela / Modal de Impressão do Comprovante de Matrícula */}
      {alunoComprovanteImprimir && (
        <PrintComprovanteMatricula 
          aluno={alunoComprovanteImprimir}
          onClose={() => setAlunoComprovanteImprimir(null)}
        />
      )}

      {/* Modal de Justificativa de Arquivamento */}
      {alunoArquivar && (
        <ModalJustificativaArquivamento
          open={!!alunoArquivar}
          onOpenChange={(open) => !open && setAlunoArquivar(null)}
          aluno={alunoArquivar}
          funcionario={funcionario}
          escolaAtivaId={escolaAtivaId}
          onSuccess={carregarAlunos}
        />
      )}

      {/* Modal de Anexos do Aluno */}
      {alunoAnexos && (
        <ModalAlunosAnexos
          open={!!alunoAnexos}
          onOpenChange={(open) => !open && setAlunoAnexos(null)}
          aluno={alunoAnexos}
          funcionario={funcionario}
          escolaAtivaId={escolaAtivaId}
        />
      )}

      {/* Topo / Título */}
      <div className="print:hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/home">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <IconTile icon={GraduationCap} variant="primary" className="h-10 w-10 shrink-0" />
              <h1 className="text-2xl font-bold text-foreground">Gestão de Alunos</h1>
            </div>
            <p className="text-muted-foreground text-sm font-normal mt-2 ml-1">
              Cadastro completo com 11 seções, busca por INEP/CPF e impressão individual da Ficha de Matrícula.
            </p>
          </div>
          {isEditMode && (
            <Button 
              onClick={handleNovoAluno}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2 self-start sm:self-auto shrink-0 cursor-pointer shadow-md rounded-xl border-none px-4 py-2"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Aluno</span>
            </Button>
          )}
        </div>

        {/* Painel de Solicitações do Diretor (Apenas se houver pendências e for Diretor/Admin) */}
        {solicitacoes.length > 0 && (acessos.some(a => a.nivel === 2 && a.ativo) || isAdminGlobalOrRoot()) && (
          <div className="bg-[#121214] border border-[#26262a] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl relative overflow-hidden print:hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#818cf8]/40 to-transparent" />
            
            <div className="flex items-center justify-between border-b border-[#26262a] pb-3 mb-1">
              <div className="flex items-center gap-2 text-white">
                <Lock className="w-4 h-4 text-[#818cf8]" />
                <h2 className="text-sm font-bold uppercase tracking-wider">Solicitações de Liberação de Ficha ({solicitacoes.length})</h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300 border-collapse">
                <thead>
                  <tr className="border-b border-[#26262a] text-zinc-500 font-bold uppercase text-[10px]">
                    <th className="py-2 px-3">Aluno</th>
                    <th className="py-2 px-3">Escola</th>
                    <th className="py-2 px-3">Solicitante</th>
                    <th className="py-2 px-3">Justificativa</th>
                    <th className="py-2 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {solicitacoes.map((sol) => (
                    <tr key={sol.id} className="border-b border-[#26262a]/50 hover:bg-[#18181b]/50">
                      <td className="py-3 px-3 font-bold text-white">{sol.alunos?.nome}</td>
                      <td className="py-3 px-3 text-zinc-400">{sol.alunos?.escolas?.nome || 'Escola Principal'}</td>
                      <td className="py-3 px-3 font-medium text-[#3ea6ff]">{sol.solicitante?.nome || 'Funcionário'}</td>
                      <td className="py-3 px-3 text-zinc-300 italic max-w-xs truncate" title={sol.justificativa}>
                        "{sol.justificativa}"
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex gap-1.5 justify-end w-full">
                          <Button
                            onClick={() => handleResponderSolicitacao(sol.id, 'aprovado')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-8 px-3 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            Liberar
                          </Button>
                          <Button
                            onClick={() => handleResponderSolicitacao(sol.id, 'rejeitado')}
                            variant="ghost"
                            className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 h-8 px-3 rounded-lg text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3 h-3" />
                            Recusar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Busca e Estatísticas */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Buscar por Nome, Matrícula, CPF ou Código INEP..."
              className="pl-9 bg-surface-1 border-borderCustom text-foreground focus-visible:ring-highlight w-full h-11 text-sm rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-xs text-muted-foreground font-medium self-end sm:self-center shrink-0">
            Total: <span className="text-foreground font-bold">{alunosFiltrados.length}</span> aluno{alunosFiltrados.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Lista de Alunos em Cards Responsivos */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-16 bg-surface-1 rounded-2xl border border-borderCustom text-muted-foreground text-sm">
              Carregando alunos...
            </div>
          ) : alunosFiltrados.length === 0 ? (
            <div className="text-center py-16 bg-surface-1 rounded-2xl border border-borderCustom text-muted-foreground text-sm">
              Nenhum aluno encontrado.
            </div>
          ) : (
            alunosFiltrados.map((aluno) => {
              const escolaNome = aluno.escola_nome ?? aluno.dados_matricula?.escolaNome ?? 'Sem Escola'
              const serieNome = aluno.serie ?? aluno.dados_matricula?.serieAluno ?? 'Sem Série'
              const telefone = aluno.telefone ?? aluno.dados_matricula?.telMaeAluno ?? '-'
              const endereco = aluno.endereco ?? aluno.dados_matricula?.ruaAluno ?? '-'
              const nomeMae = aluno.nome_mae ?? aluno.dados_matricula?.nomeMaeAluno ?? null

              return (
                <div 
                  key={aluno.id} 
                  className="bg-card border-[0.5px] border-border hover:border-primary/40 rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200 shadow-sm"
                >
                  {/* ── Topo do card: Foto + Nome + Série ── */}
                  <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/50">
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Foto / Iniciais */}
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border border-border flex-shrink-0 flex items-center justify-center bg-muted text-foreground text-base sm:text-lg font-bold overflow-hidden shadow-inner">
                        {aluno.foto_url ? (
                          <img src={aluno.foto_url} alt={aluno.nome} className="w-full h-full object-cover" />
                        ) : (
                          aluno.nome.substring(0, 2).toUpperCase()
                        )}
                      </div>

                      {/* Informações Principais */}
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-foreground tracking-tight truncate max-w-full flex items-center gap-2">
                          <span>{aluno.nome}</span>
                          {aluno.dados_matricula?.documento_bloqueado === true && (
                            <span className="p-1 bg-primary/10 border border-primary/20 rounded-md text-primary" title="Ficha Assinada e Trancada">
                              <Lock className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </h3>
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 border border-primary/20 text-primary shrink-0">
                            {serieNome}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Detalhes do Aluno ── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 text-sm font-normal text-muted-foreground">
                    {aluno.numero_matricula && (
                      <div className="flex items-center gap-1.5 truncate text-purple-400 font-semibold">
                        <Hash className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate">Matrícula: {aluno.numero_matricula}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                      <span className="truncate">{escolaNome}</span>
                    </div>

                    {telefone !== '-' && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                        <span className="truncate">{telefone}</span>
                      </div>
                    )}

                    {aluno.cpf && (
                      <div className="flex items-center gap-1.5 truncate">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                        <span className="truncate">CPF: {aluno.cpf}</span>
                      </div>
                    )}

                    {aluno.inep && (
                      <div className="flex items-center gap-1.5 truncate">
                        <BadgeInfo className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                        <span className="truncate">INEP: {aluno.inep}</span>
                      </div>
                    )}

                    {nomeMae && (
                      <div className="flex items-center gap-1.5 truncate">
                        <User className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                        <span className="truncate">Mãe: {nomeMae}</span>
                      </div>
                    )}

                    {endereco !== '-' && (
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                        <span className="truncate">{endereco}</span>
                      </div>
                    )}
                  </div>

                  {/* ── Botões de Ação ── */}
                  <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 pt-2">
                    <button 
                      onClick={() => setAlunoAnexos(aluno)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-transparent border border-border text-foreground hover:bg-hoverCustom text-xs font-semibold transition-colors cursor-pointer"
                      title="Anexos do Aluno"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="hidden sm:inline">Anexos</span>
                    </button>

                    {isEditMode && (
                      <button 
                        onClick={() => handleEditarAluno(aluno)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-transparent border border-border text-foreground hover:bg-hoverCustom text-xs font-semibold transition-colors cursor-pointer"
                        title="Editar Aluno"
                      >
                        <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="hidden sm:inline">Editar</span>
                      </button>
                    )}

                    {/* Imprimir Ficha (Único Destaque) */}
                    <button 
                      onClick={() => handleImprimirAluno(aluno)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors cursor-pointer border-none shadow-sm"
                      title="Imprimir Ficha de Matrícula"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Imprimir Ficha</span>
                    </button>

                    <button 
                      onClick={() => setAlunoComprovanteImprimir(aluno)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-transparent border border-border text-foreground hover:bg-hoverCustom text-xs font-semibold transition-colors cursor-pointer"
                      title="Imprimir Comprovante de Matrícula"
                    >
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="hidden sm:inline">Comprovante</span>
                    </button>

                    {isEditMode && (
                      <button 
                        onClick={() => setAlunoArquivar(aluno)}
                        className="p-2 sm:px-3 sm:py-2 rounded-xl bg-transparent border border-border text-foreground hover:bg-destructive/10 hover:text-destructive text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
                        title="Arquivar Aluno"
                      >
                        <Archive className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="hidden sm:inline">Arquivar</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
