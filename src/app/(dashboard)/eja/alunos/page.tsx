'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { GraduationCap, ArrowLeft, Plus, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useAuthStore } from '@/store/useAuthStore'
import { useEditModeStore } from '@/store/useEditModeStore'
import { useEjaGuard } from '@/hooks/useEjaGuard'
import { IconTile } from '@/components/ui/icon-tile'
import { useAlunos } from '@/hooks/useAlunos'
import { AlunosFilters } from '@/components/alunos/AlunosFilters'
import { AlunosList } from '@/components/alunos/AlunosList'
import { SolicitacoesLiberacao } from '@/components/alunos/SolicitacoesLiberacao'
import type { Aluno } from '@/hooks/useAlunos'

const ModalAluno = dynamic(
  () => import('@/components/modals/modal-aluno').then((mod) => mod.ModalAluno),
  { ssr: false }
)
const PrintFichaAluno = dynamic(
  () =>
    import('@/components/print/print-ficha-aluno').then(
      (mod) => mod.PrintFichaAluno
    ),
  { ssr: false }
)
const PrintComprovanteMatricula = dynamic(
  () =>
    import('@/components/print/print-comprovante-matricula').then(
      (mod) => mod.PrintComprovanteMatricula
    ),
  { ssr: false }
)
const ModalJustificativaArquivamento = dynamic(
  () =>
    import(
      '@/components/modals/modal-justificativa-arquivamento'
    ).then((mod) => mod.ModalJustificativaArquivamento),
  { ssr: false }
)
const ModalAlunosAnexos = dynamic(
  () =>
    import('@/components/modals/modal-alunos-anexos').then(
      (mod) => mod.ModalAlunosAnexos
    ),
  { ssr: false }
)
const ModalHistoricoAluno = dynamic(
  () =>
    import('@/components/modals/modal-historico-aluno').then(
      (mod) => mod.ModalHistoricoAluno
    ),
  { ssr: false }
)
const ModalFotoAmpliada = dynamic(
  () =>
    import('@/components/modals/modal-foto-ampliada').then(
      (mod) => mod.ModalFotoAmpliada
    ),
  { ssr: false }
)

export default function EjaAlunosPage() {
  const { authorized } = useEjaGuard()
  const { funcionario, escolaAtivaId, acessos, isAdminGlobalOrRoot, isProfessor: checkProfessor } =
    useAuthStore()
  const isProfessor = checkProfessor()
  const { isEditMode } = useEditModeStore()

  const {
    alunosFiltrados,
    totalCount,
    page,
    setPage,
    pageSize,
    loading,
    searchTerm,
    setSearchTerm,
    carregarAlunos,
    solicitacoes,
    handleResponderSolicitacao,
    salvarHistoricoAluno,
  } = useAlunos({ onlyEja: true })

  /* ── Alunos exclusivamente da modalidade EJA ── */
  const alunosEja = alunosFiltrados

  /* ── Estados de modais locais ─────────────────────────────── */
  const [modalOpen, setModalOpen] = useState(false)
  const [alunoEditando, setAlunoEditando] = useState<Aluno | null>(null)
  const [alunoImprimir, setAlunoImprimir] = useState<Aluno | null>(null)
  const [alunoComprovanteImprimir, setAlunoComprovanteImprimir] = useState<Aluno | null>(null)
  const [alunoArquivar, setAlunoArquivar] = useState<Aluno | null>(null)
  const [alunoAnexos, setAlunoAnexos] = useState<Aluno | null>(null)
  const [alunoHistorico, setAlunoHistorico] = useState<Aluno | null>(null)
  const [alunoFotoAmpliada, setAlunoFotoAmpliada] = useState<Aluno | null>(null)

  const isDiretorOuAdmin =
    acessos.some((a) => a.nivel === 2 && a.ativo) || isAdminGlobalOrRoot()

  const handleNovoAluno = () => {
    setAlunoEditando(null)
    setModalOpen(true)
  }

  if (authorized === false) return null

  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0">
      {/* Modais */}
      {modalOpen && (
        <ModalAluno
          open={modalOpen}
          onOpenChange={setModalOpen}
          alunoEditar={alunoEditando}
          onSuccess={carregarAlunos}
        />
      )}

      {alunoImprimir && (
        <PrintFichaAluno
          aluno={alunoImprimir}
          onClose={() => setAlunoImprimir(null)}
        />
      )}

      {alunoComprovanteImprimir && (
        <PrintComprovanteMatricula
          aluno={alunoComprovanteImprimir}
          onClose={() => setAlunoComprovanteImprimir(null)}
        />
      )}

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

      {alunoAnexos && (
        <ModalAlunosAnexos
          open={!!alunoAnexos}
          onOpenChange={(open) => !open && setAlunoAnexos(null)}
          aluno={alunoAnexos}
          funcionario={funcionario}
          escolaAtivaId={escolaAtivaId}
        />
      )}

      {alunoHistorico && (
        <ModalHistoricoAluno
          open={!!alunoHistorico}
          onOpenChange={(open) => !open && setAlunoHistorico(null)}
          aluno={alunoHistorico}
          isEditMode={isEditMode}
          onSalvar={salvarHistoricoAluno}
        />
      )}

      {alunoFotoAmpliada && (
        <ModalFotoAmpliada
          aluno={alunoFotoAmpliada}
          onClose={() => setAlunoFotoAmpliada(null)}
        />
      )}

      {/* Topo */}
      <div className="print:hidden space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/home">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <IconTile
                icon={GraduationCap}
                variant="primary"
                className="h-10 w-10 shrink-0"
              />
              <h1 className="text-2xl font-bold text-foreground">
                Alunos - EJA
              </h1>
            </div>
            <p className="text-muted-foreground text-sm font-normal mt-2 ml-1">
              Cadastro e ficha individual dos estudantes da modalidade Educação de Jovens e Adultos.
            </p>
          </div>
          {isEditMode && (
            <Button
              onClick={handleNovoAluno}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-2 self-start sm:self-auto shrink-0 cursor-pointer shadow-md rounded-xl border-none px-4 py-2"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Aluno EJA</span>
            </Button>
          )}
        </div>

        {/* Painel de Solicitações */}
        {isDiretorOuAdmin && (
          <SolicitacoesLiberacao
            solicitacoes={solicitacoes}
            onResponder={handleResponderSolicitacao}
          />
        )}

        {/* Alerta de Modo de Edição Desativado */}
        {!isEditMode && (
          <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-300 text-xs flex items-center gap-3 font-medium shadow-xs backdrop-blur-xs">
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span className="leading-relaxed">
              O <strong className="font-bold text-amber-950 dark:text-amber-100">Modo de Edição</strong> está desativado no painel. Ative o alternador de edição no topo da página para habilitar os botões de <strong className="font-bold text-amber-950 dark:text-amber-100">Editar</strong>, <strong className="font-bold text-amber-950 dark:text-amber-100">Novo Aluno</strong> e <strong className="font-bold text-amber-950 dark:text-amber-100">Arquivar</strong>.
            </span>
          </div>
        )}

        {/* Busca e Estatísticas */}
        <AlunosFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          totalFiltrado={totalCount}
        />

        {/* Lista de Cards */}
        <AlunosList
          carregando={loading}
          alunosFiltrados={alunosEja}
          isEditMode={isEditMode}
          onHistorico={setAlunoHistorico}
          onAmpliarFoto={setAlunoFotoAmpliada}
          onAnexos={setAlunoAnexos}
          onEditar={(aluno) => {
            setAlunoEditando(aluno)
            setModalOpen(true)
          }}
          onImprimir={setAlunoImprimir}
          onComprovante={setAlunoComprovanteImprimir}
          onArquivar={setAlunoArquivar}
        />

        {/* Paginação */}
        {totalCount > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Mostrando <strong className="text-foreground">{Math.min(totalCount, (page - 1) * pageSize + 1)}</strong> a{' '}
              <strong className="text-foreground">{Math.min(page * pageSize, totalCount)}</strong> de{' '}
              <strong className="text-foreground">{totalCount}</strong> alunos EJA
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1 || loading}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                className="bg-surface-1 border-borderCustom text-foreground hover:bg-hoverCustom disabled:opacity-50 text-xs cursor-pointer"
              >
                Anterior
              </Button>
              <span className="text-xs text-foreground font-medium">
                Página {page} de {Math.max(1, Math.ceil(totalCount / pageSize))}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= Math.ceil(totalCount / pageSize) || loading}
                onClick={() => setPage((prev) => prev + 1)}
                className="bg-surface-1 border-borderCustom text-foreground hover:bg-hoverCustom disabled:opacity-50 text-xs cursor-pointer"
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
