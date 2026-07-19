'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { GraduationCap, ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useAuthStore } from '@/store/useAuthStore'
import { useEditModeStore } from '@/store/useEditModeStore'
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

export default function AlunosPage() {
  const { funcionario, escolaAtivaId, acessos, isAdminGlobalOrRoot, isProfessor: checkProfessor } =
    useAuthStore()
  const isProfessor = checkProfessor()

  /* ── Guard: Professores não acessam esta tela ─────────────── */
  if (isProfessor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-surface-1 border border-borderCustom rounded-2xl space-y-6">
        <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[#185FA5] dark:text-[#3ea6ff]">
          <GraduationCap className="w-8 h-8" />
        </div>
        <div className="space-y-2 max-w-md">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Área de Alunos do Professor
          </h1>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Esta funcionalidade está sendo customizada e atualmente está em
            desenvolvimento. Em breve você poderá gerenciar a lista de alunos de
            suas turmas e disciplinas.
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

  /* ── Hook de dados ────────────────────────────────────────── */
  const {
    alunosFiltrados,
    loading,
    searchTerm,
    setSearchTerm,
    carregarAlunos,
    solicitacoes,
    handleResponderSolicitacao,
  } = useAlunos()

  /* ── Estados de modais locais ─────────────────────────────── */
  const [modalOpen, setModalOpen] = useState(false)
  const [alunoEditando, setAlunoEditando] = useState<Aluno | null>(null)
  const [alunoImprimir, setAlunoImprimir] = useState<Aluno | null>(null)
  const [alunoComprovanteImprimir, setAlunoComprovanteImprimir] = useState<Aluno | null>(null)
  const [alunoArquivar, setAlunoArquivar] = useState<Aluno | null>(null)
  const [alunoAnexos, setAlunoAnexos] = useState<Aluno | null>(null)

  const isDiretorOuAdmin =
    acessos.some((a) => a.nivel === 2 && a.ativo) || isAdminGlobalOrRoot()

  /* ── Handlers de modais ───────────────────────────────────── */
  const handleNovoAluno = () => {
    setAlunoEditando(null)
    setModalOpen(true)
  }

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div className="space-y-6 max-w-7xl mx-auto min-w-0">
      {/* Modais */}
      <ModalAluno
        open={modalOpen}
        onOpenChange={setModalOpen}
        alunoEditar={alunoEditando}
        onSuccess={carregarAlunos}
      />

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
                Gestão de Alunos
              </h1>
            </div>
            <p className="text-muted-foreground text-sm font-normal mt-2 ml-1">
              Cadastro completo com 11 seções, busca por INEP/CPF e impressão
              individual da Ficha de Matrícula.
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

        {/* Painel de Solicitações — visível apenas para Diretores e Admins */}
        {isDiretorOuAdmin && (
          <SolicitacoesLiberacao
            solicitacoes={solicitacoes}
            onResponder={handleResponderSolicitacao}
          />
        )}

        {/* Busca e Estatísticas */}
        <AlunosFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          totalFiltrado={alunosFiltrados.length}
        />

        {/* Lista de Cards */}
        <AlunosList
          carregando={loading}
          alunosFiltrados={alunosFiltrados}
          isEditMode={isEditMode}
          onAnexos={setAlunoAnexos}
          onEditar={(aluno) => {
            setAlunoEditando(aluno)
            setModalOpen(true)
          }}
          onImprimir={setAlunoImprimir}
          onComprovante={setAlunoComprovanteImprimir}
          onArquivar={setAlunoArquivar}
        />
      </div>
    </div>
  )
}
