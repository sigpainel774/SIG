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
  Paperclip
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
  created_at: string
}

export default function AlunosPage() {
  const { funcionario, escolaAtivaId, acessos, isAdminGlobalOrRoot } = useAuthStore()
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolaAtivaId])

  const alunosFiltrados = alunos.filter(
    (aluno) =>
      aluno.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-borderCustom">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/home">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
                <GraduationCap className="w-7 h-7 sm:w-8 sm:h-8 text-highlight shrink-0" />
                <span>Gestão de Alunos</span>
              </h1>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              Cadastro completo com 11 seções, busca por INEP/CPF e impressão individual da Ficha de Matrícula.
            </p>
          </div>
          {isEditMode && (
            <Button 
              onClick={handleNovoAluno}
              className="bg-highlight text-background hover:bg-highlight/90 font-bold gap-2 self-start sm:self-auto shrink-0 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Aluno</span>
            </Button>
          )}
        </div>

        {/* Busca e Estatísticas */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Buscar por Nome, CPF ou Código INEP..."
              className="pl-9 bg-[#121212] border-borderCustom text-white focus-visible:ring-highlight w-full h-11 text-sm rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="text-xs text-muted-foreground font-medium self-end sm:self-center shrink-0">
            Total: <span className="text-white font-bold">{alunosFiltrados.length}</span> aluno{alunosFiltrados.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Lista de Alunos em Cards Responsivos */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-16 bg-[#121212] rounded-2xl border border-borderCustom text-muted-foreground text-sm">
              Carregando alunos...
            </div>
          ) : alunosFiltrados.length === 0 ? (
            <div className="text-center py-16 bg-[#121212] rounded-2xl border border-borderCustom text-muted-foreground text-sm">
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
                  className="bg-[#141416] border border-[#26262a] hover:border-[#3ea6ff]/40 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Avatar + Nome + Informações Principais */}
                  <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                    {/* Foto / Iniciais */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border border-[#3ea6ff]/40 flex-shrink-0 flex items-center justify-center bg-[#3ea6ff]/10 text-[#3ea6ff] text-base sm:text-lg font-bold overflow-hidden shadow-inner">
                      {aluno.foto_url ? (
                        <img src={aluno.foto_url} alt={aluno.nome} className="w-full h-full object-cover" />
                      ) : (
                        aluno.nome.substring(0, 2).toUpperCase()
                      )}
                    </div>

                    {/* Informações Funcionais */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight truncate max-w-full">
                          {aluno.nome}
                        </h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0090ff]/10 text-[#0090ff] border border-[#0090ff]/20 shrink-0">
                          {serieNome}
                        </span>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 text-xs text-zinc-400">
                        <div className="flex items-center gap-1.5 truncate">
                          <Building2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span className="truncate">{escolaNome}</span>
                        </div>

                        {telefone !== '-' && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span className="truncate">{telefone}</span>
                          </div>
                        )}

                        {aluno.cpf && (
                          <div className="flex items-center gap-1.5 truncate">
                            <FileText className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span className="truncate">CPF: {aluno.cpf}</span>
                          </div>
                        )}

                        {aluno.inep && (
                          <div className="flex items-center gap-1.5 truncate">
                            <BadgeInfo className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span className="truncate">INEP: {aluno.inep}</span>
                          </div>
                        )}

                        {nomeMae && (
                          <div className="flex items-center gap-1.5 truncate">
                            <User className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span className="truncate">Mãe: {nomeMae}</span>
                          </div>
                        )}

                        {endereco !== '-' && (
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span className="truncate">{endereco}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex items-center justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#26262a]">
                    <button 
                      onClick={() => setAlunoAnexos(aluno)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold transition-colors cursor-pointer border border-indigo-500/30"
                      title="Anexos do Aluno"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Anexos</span>
                    </button>

                    {isEditMode && (
                      <button 
                        onClick={() => handleEditarAluno(aluno)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-zinc-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-[#3f3f46]"
                        title="Editar Aluno"
                      >
                        <Edit className="w-3.5 h-3.5 text-[#0090ff]" />
                        <span className="hidden sm:inline">Editar</span>
                      </button>
                    )}

                    <button 
                      onClick={() => handleImprimirAluno(aluno)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0090ff]/10 hover:bg-[#0090ff]/20 text-[#0090ff] text-xs font-semibold transition-colors cursor-pointer border border-[#0090ff]/30"
                      title="Imprimir Ficha de Matrícula"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Imprimir Ficha</span>
                    </button>

                    <button 
                      onClick={() => setAlunoComprovanteImprimir(aluno)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition-colors cursor-pointer border border-emerald-500/30"
                      title="Imprimir Comprovante de Matrícula"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Comprovante</span>
                    </button>

                    {isEditMode && (
                      <button 
                        onClick={() => setAlunoArquivar(aluno)}
                        className="p-2 sm:px-3 sm:py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition-colors cursor-pointer border border-rose-500/30 flex items-center gap-1.5"
                        title="Arquivar Aluno"
                      >
                        <Archive className="w-3.5 h-3.5" />
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
