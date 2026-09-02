'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabaseClient'
import { useAuthStore } from '@/store/useAuthStore'
import { useSchoolStore } from '@/store/useSchoolStore'
import {
  Heart,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  FolderOpen,
  MapPin,
  FileText,
  Printer,
  Edit,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { getAvatarUrl } from '@/lib/photoHelper'

// Dynamic imports para code-splitting e aceleração de carregamento inicial
const ModalMatriculaEmaee = dynamic(
  () => import('@/components/modals/modal-matricula-emaee').then((mod) => mod.ModalMatriculaEmaee),
  { ssr: false }
)
const PrintFichaInscricaoEmaee = dynamic(
  () => import('@/components/print/print-ficha-inscricao-emaee').then((mod) => mod.PrintFichaInscricaoEmaee),
  { ssr: false }
)
const PrintComprovanteMatriculaEmaee = dynamic(
  () => import('@/components/print/print-comprovante-matricula-emaee').then((mod) => mod.PrintComprovanteMatriculaEmaee),
  { ssr: false }
)

export default function PacientesPage() {
  const { escolaAtivaId } = useAuthStore()
  const [prontuarios, setProntuarios] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroZona, setFiltroZona] = useState('todos')
  const [refreshKey, setRefreshKey] = useState(0)

  // Paginação client-side leve para acelerar a montagem do DOM
  const [paginaAtual, setPaginaAtual] = useState(1)
  const itensPorPagina = 24

  // Estado de Abertura do Modal de Nova Matrícula
  const [modalNovaMatriculaOpen, setModalNovaMatriculaOpen] = useState(false)

  // Estado de Edição de Ficha / Matrícula
  const [matriculaEditando, setMatriculaEditando] = useState<any | null>(null)

  // Estados de Visualização de Impressão
  const [fichaInscricaoProntuario, setFichaInscricaoProntuario] = useState<any | null>(null)
  const [comprovanteMatriculaProntuario, setComprovanteMatriculaProntuario] = useState<any | null>(null)

  // Estado de carregamento sob demanda para ações por card
  const [carregandoAcao, setCarregandoAcao] = useState<{ id: string; tipo: 'editar' | 'ficha' | 'comprovante' } | null>(null)

  useEffect(() => {
    let isMounted = true
    async function carregarProntuarios() {
      setCarregando(true)
      const supabase = createClient()
      try {
        const { selectedEscola } = useSchoolStore.getState()
        const isEmaeeUnit = selectedEscola?.tipo === 'EMAEE' || /emaee/i.test(selectedEscola?.nome || '')

        // Consulta enxuta com apenas as colunas necessárias para renderizar os cards da listagem
        let query = supabase
          .from('emaee_matriculas')
          .select(`
            id,
            status,
            numero_matricula_emaee,
            cid_codigo,
            ano_escolarizacao,
            localizacao_atendimento,
            escola_origem_fora_rede,
            escola_origem_nome,
            escola_origem_municipio,
            escola_origem_uf,
            escola_atendimento_id,
            created_at,
            alunos (
              id,
              nome,
              cpf,
              foto_url,
              foto_avatar_path,
              foto_visualizacao_path,
              foto_updated_at
            ),
            escolas:escola_regular_id (
              nome
            )
          `)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })

        if (escolaAtivaId && isEmaeeUnit) {
          query = query.eq('escola_atendimento_id', escolaAtivaId)
        }

        const { data, error } = await query

        if (error) throw error

        if (isMounted && data) {
          setProntuarios(data)
        }
      } catch (err) {
        console.error('Erro ao carregar prontuários do EMAEE:', err)
        toast.error('Erro ao carregar prontuários')
      } finally {
        if (isMounted) setCarregando(false)
      }
    }

    carregarProntuarios()
    return () => {
      isMounted = false
    }
  }, [escolaAtivaId, refreshKey])

  // Resetar paginação ao filtrar
  useEffect(() => {
    setPaginaAtual(1)
  }, [busca, filtroStatus, filtroZona])

  const prontuariosFiltrados = useMemo(() => {
    const txtBusca = busca.toLowerCase().trim()
    return prontuarios.filter((p) => {
      const nomeAluno = (p.alunos?.nome || '').toLowerCase()
      const cpfAluno = (p.alunos?.cpf || '').toLowerCase()
      const escolaNome = (p.escola_origem_nome || p.escolas?.nome || '').toLowerCase()
      const matchesBusca = !txtBusca || nomeAluno.includes(txtBusca) || cpfAluno.includes(txtBusca) || escolaNome.includes(txtBusca)
      const matchesStatus = filtroStatus === 'todos' || p.status === filtroStatus
      const matchesZona = filtroZona === 'todos' || p.localizacao_atendimento === filtroZona

      return matchesBusca && matchesStatus && matchesZona
    })
  }, [prontuarios, busca, filtroStatus, filtroZona])

  const totalPaginas = Math.ceil(prontuariosFiltrados.length / itensPorPagina) || 1
  const prontuariosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina
    return prontuariosFiltrados.slice(inicio, inicio + itensPorPagina)
  }, [prontuariosFiltrados, paginaAtual, itensPorPagina])

  // Busca rápida on-demand do registro completo com todos os dados apenas quando o usuário clica em Editar ou Imprimir
  const carregarProntuarioCompleto = async (matriculaId: string) => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('emaee_matriculas')
      .select(`
        *,
        alunos (
          id,
          nome,
          foto_url,
          foto_avatar_path,
          foto_visualizacao_path,
          foto_updated_at,
          cpf,
          rg,
          nis,
          inep,
          identif_unica_censo,
          cartao_sus,
          certidao_nascimento,
          certidao_nascimento_novo_modelo,
          municipio_nascimento,
          uf_nascimento,
          data_nascimento,
          sexo,
          cor_raca,
          nome_mae,
          profissao_mae,
          nome_pai,
          profissao_pai,
          telefone,
          endereco,
          latitude,
          longitude,
          zona_residencial,
          nome_contato_emergencia,
          dados_matricula
        ),
        escola_origem_fora_rede,
        escola_origem_nome,
        escola_origem_municipio,
        escola_origem_uf,
        escolas:escola_regular_id (
          nome
        )
      `)
      .eq('id', matriculaId)
      .maybeSingle()

    if (error) {
      console.error('Erro ao buscar prontuário completo:', error)
      toast.error('Erro ao carregar dados completos do aluno.')
      return null
    }
    return data
  }

  const handleEditar = async (paciente: any) => {
    setCarregandoAcao({ id: paciente.id, tipo: 'editar' })
    try {
      const completo = await carregarProntuarioCompleto(paciente.id)
      if (completo) setMatriculaEditando(completo)
    } finally {
      setCarregandoAcao(null)
    }
  }

  const handleVerFicha = async (paciente: any) => {
    setCarregandoAcao({ id: paciente.id, tipo: 'ficha' })
    try {
      const completo = await carregarProntuarioCompleto(paciente.id)
      if (completo) setFichaInscricaoProntuario(completo)
    } finally {
      setCarregandoAcao(null)
    }
  }

  const handleImprimirComprovante = async (paciente: any) => {
    setCarregandoAcao({ id: paciente.id, tipo: 'comprovante' })
    try {
      const completo = await carregarProntuarioCompleto(paciente.id)
      if (completo) setComprovanteMatriculaProntuario(completo)
    } finally {
      setCarregandoAcao(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Heart className="w-8 h-8 text-primary stroke-[2.5]" />
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Pastas de Alunos / Saúde (EMAEE)
            </h1>
            <p className="text-xs text-muted-foreground">
              Acolhimento clínico, prontuários de saúde e evolução multidisciplinar
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/emaee/fila-espera">
            <Button variant="outline" className="border-border text-foreground hover:bg-hoverCustom rounded-xl gap-2 font-semibold text-xs py-2.5 shadow-sm">
              Fila de Espera
            </Button>
          </Link>
          
          <Button 
            onClick={() => setModalNovaMatriculaOpen(true)}
            className="bg-[#3ea6ff] hover:bg-[#3ea6ff]/90 text-[#09090b] rounded-xl gap-2 font-bold text-xs py-2.5 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Nova Matrícula EMAEE
          </Button>
        </div>
      </div>

      {/* Barra de Filtro e Pesquisa */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-border p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome do paciente ou CPF..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full bg-secondary border border-border text-foreground rounded-xl pl-10 pr-4 py-2 text-sm outline-none focus:border-primary/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="bg-secondary border border-border text-foreground rounded-xl px-3 py-2 text-xs font-semibold outline-none cursor-pointer"
          >
            <option value="todos">Todos os Status</option>
            <option value="FILA_ESPERA">Fila de Espera</option>
            <option value="EM_INVESTIGACAO">Em Investigação</option>
            <option value="ATIVO">Em Atendimento</option>
            <option value="ALTA">Alta Médica</option>
            <option value="INATIVO">Arquivado</option>
          </select>

          <select
            value={filtroZona}
            onChange={(e) => setFiltroZona(e.target.value)}
            className="bg-secondary border border-border text-foreground rounded-xl px-3 py-2 text-xs font-semibold outline-none cursor-pointer"
          >
            <option value="todos">Todas as Zonas</option>
            <option value="Urbana">Zona Urbana</option>
            <option value="Rural">Zona Rural</option>
          </select>
        </div>
      </div>

      {/* Grid de Pacientes */}
      {carregando ? (
        <div className="text-center py-16 bg-surface-1 rounded-2xl border border-border text-muted-foreground text-sm animate-pulse">
          Carregando prontuários do EMAEE...
        </div>
      ) : prontuariosFiltrados.length === 0 ? (
        <div className="text-center py-16 bg-surface-1 rounded-2xl border border-border text-muted-foreground text-sm">
          Nenhum prontuário clínico encontrado com os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {prontuariosPaginados.map((paciente) => {
              const regularEscola = paciente.escola_origem_fora_rede && paciente.escola_origem_nome
                ? `${paciente.escola_origem_nome}${paciente.escola_origem_municipio ? ` (${paciente.escola_origem_municipio} - ${paciente.escola_origem_uf ?? 'BA'})` : ''}`
                : (paciente.escolas?.nome ?? 'Sem Escola Regular');
              const avatarUrl = getAvatarUrl(paciente.alunos);
              const isActionBusy = carregandoAcao?.id === paciente.id;

              return (
                <div
                  key={paciente.id}
                  className="bg-card border border-border hover:border-primary/40 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 shadow-sm relative group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-border/50 pb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 overflow-hidden border border-border/50">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt={paciente.alunos?.nome || 'Foto 3x4'} className="w-full h-full object-cover" />
                          ) : (
                            paciente.alunos?.nome?.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate" title={paciente.alunos?.nome}>
                            {paciente.alunos?.nome}
                          </h3>
                          <span className="text-[10px] text-muted-foreground truncate block">
                            Matrícula: {paciente.numero_matricula_emaee ?? 'Não gerada'}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 whitespace-nowrap ${
                        paciente.status === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        paciente.status === 'EM_INVESTIGACAO' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        paciente.status === 'ALTA' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        paciente.status === 'INATIVO' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                      }`}>
                        {paciente.status === 'ATIVO' ? 'Em Atendimento' :
                         paciente.status === 'EM_INVESTIGACAO' ? 'Em Investigação' :
                         paciente.status === 'ALTA' ? 'Alta Médica / AEE' :
                         paciente.status === 'INATIVO' ? 'Arquivado' : 'Fila de Espera'}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs font-normal text-muted-foreground pt-3">
                      {paciente.cid_codigo && (
                        <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>CID: {paciente.cid_codigo}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <FolderOpen className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                        <span className="truncate">{regularEscola} ({paciente.ano_escolarizacao ?? 'Ano não inf.'})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                        <span>Localidade: {paciente.localizacao_atendimento}</span>
                      </div>
                    </div>
                  </div>

                  {/* Botões Rápidos no Rodapé do Card */}
                  <div className="border-t border-border/50 pt-3 grid grid-cols-2 gap-2">
                    {/* Botão Editar Ficha Completa */}
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isActionBusy}
                      onClick={() => handleEditar(paciente)}
                      className="w-full text-amber-500 border-amber-500/30 hover:bg-amber-500/10 text-xs rounded-xl font-bold py-1.5 px-2.5 gap-1.5 justify-center cursor-pointer disabled:opacity-50"
                      title="Editar Ficha e Dados do Aluno / Matrícula EMAEE"
                    >
                      {isActionBusy && carregandoAcao?.tipo === 'editar' ? (
                        <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                      ) : (
                        <Edit className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="truncate">Editar</span>
                    </Button>

                    {/* Botão Ver Ficha de Inscrição */}
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isActionBusy}
                      onClick={() => handleVerFicha(paciente)}
                      className="w-full text-[#3ea6ff] border-[#3ea6ff]/30 hover:bg-[#3ea6ff]/10 text-xs rounded-xl font-bold py-1.5 px-2.5 gap-1.5 justify-center cursor-pointer disabled:opacity-50"
                      title="Ver e Imprimir Ficha de Inscrição Completa com Minimapa"
                    >
                      {isActionBusy && carregandoAcao?.tipo === 'ficha' ? (
                        <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="truncate">Ficha</span>
                    </Button>

                    {/* Botão Imprimir Comprovante de Matrícula Rápido */}
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isActionBusy}
                      onClick={() => handleImprimirComprovante(paciente)}
                      className="w-full text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 text-xs rounded-xl font-bold py-1.5 px-2.5 gap-1.5 justify-center cursor-pointer disabled:opacity-50"
                      title="Imprimir Comprovante de Matrícula para o Responsável Assinar"
                    >
                      {isActionBusy && carregandoAcao?.tipo === 'comprovante' ? (
                        <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                      ) : (
                        <Printer className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="truncate">Comprovante</span>
                    </Button>

                    {/* Link Prontuário Completo */}
                    <Link href={`/emaee/pacientes/${paciente.id}`} className="w-full min-w-0">
                      <Button
                        variant="outline"
                        className="w-full text-xs rounded-xl font-bold py-1.5 px-2.5 gap-1.5 border-border hover:bg-hoverCustom justify-center cursor-pointer"
                        title="Acessar Prontuário e Histórico Clínico Completo"
                      >
                        <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">Prontuário</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Paginação Client-Side */}
          {totalPaginas > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs text-muted-foreground">
              <span>
                Mostrando <strong>{(paginaAtual - 1) * itensPorPagina + 1}</strong> a <strong>{Math.min(paginaAtual * itensPorPagina, prontuariosFiltrados.length)}</strong> de <strong>{prontuariosFiltrados.length}</strong> prontuários
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={paginaAtual <= 1}
                  onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                  className="rounded-xl text-xs gap-1 border-border"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Anterior
                </Button>
                <span className="font-semibold text-foreground px-2">
                  {paginaAtual} / {totalPaginas}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={paginaAtual >= totalPaginas}
                  onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                  className="rounded-xl text-xs gap-1 border-border"
                >
                  Próximo <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Nova Matrícula EMAEE (Montado apenas quando clicado para abrir) */}
      {modalNovaMatriculaOpen && (
        <ModalMatriculaEmaee 
          open={modalNovaMatriculaOpen}
          onOpenChange={setModalNovaMatriculaOpen}
          escolaEmaeeId={escolaAtivaId || ''} 
          onSuccess={() => {
            setModalNovaMatriculaOpen(false)
            setRefreshKey((prev) => prev + 1)
          }}
        />
      )}

      {/* Modal de Edição Completa de Ficha / Matrícula EMAEE */}
      {matriculaEditando && (
        <ModalMatriculaEmaee
          open={!!matriculaEditando}
          onOpenChange={(open) => {
            if (!open) setMatriculaEditando(null)
          }}
          escolaEmaeeId={escolaAtivaId || ''}
          matriculaEditar={matriculaEditando}
          onSuccess={() => {
            setMatriculaEditando(null)
            setRefreshKey((prev) => prev + 1)
          }}
        />
      )}

      {/* Modal / Portal de Visualização e Impressão da Ficha de Inscrição EMAEE */}
      {fichaInscricaoProntuario && (
        <PrintFichaInscricaoEmaee
          prontuario={fichaInscricaoProntuario}
          onClose={() => setFichaInscricaoProntuario(null)}
        />
      )}

      {/* Modal / Portal de Visualização e Impressão do Comprovante de Matrícula EMAEE */}
      {comprovanteMatriculaProntuario && (
        <PrintComprovanteMatriculaEmaee
          prontuario={comprovanteMatriculaProntuario}
          onClose={() => setComprovanteMatriculaProntuario(null)}
        />
      )}
    </div>
  )
}
