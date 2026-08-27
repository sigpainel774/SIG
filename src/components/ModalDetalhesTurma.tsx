'use client'

import { BookOpen, Users, CalendarDays, FileSpreadsheet, MessageSquare, BookOpenCheck } from 'lucide-react'
import { ModalDetalhesAluno } from './ModalDetalhesAluno'
import { TabMateriasTurma } from './turmas/TabMateriasTurma'
import { TabAlunosTurma } from './turmas/TabAlunosTurma'
import { TabFrequenciasTurma } from './turmas/TabFrequenciasTurma'
import { TabNotasTurma } from './turmas/TabNotasTurma'
import { TabComunicacoesTurma } from './turmas/TabComunicacoesTurma'
import { TabDiarioConteudoTurma } from './turmas/TabDiarioConteudoTurma'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { useTurmaDetalhes } from '@/hooks/useTurmaDetalhes'
import { useSchoolStore } from '@/store/useSchoolStore'

interface ModalDetalhesTurmaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  turma: any // Objeto da turma selecionada
  initialMateriaId?: string
  initialAgendaAulaId?: string
  initialData?: string
}

export function ModalDetalhesTurma({
  open,
  onOpenChange,
  turma,
  initialMateriaId,
  initialAgendaAulaId,
  initialData
}: ModalDetalhesTurmaProps) {
  const selectedEscola = useSchoolStore((state) => state.selectedEscola)
  const portalComunicacoesAtivo = Boolean(selectedEscola?.portal_comunicacoes_ativo)

  const isEmaeeOuCursinho = Boolean(
    selectedEscola?.tipo === 'EMAEE' ||
    /emaee|cursinho|pré universitário/i.test(selectedEscola?.nome || '') ||
    /emaee|cursinho/i.test(turma?.nome || '')
  )

  const {
    activeTab,
    setActiveTab,
    isProfessor,
    selectedMateriaId,
    setSelectedMateriaId,
    setSelectedAgendaAulaId,
    dataFreq,
    setDataFreq,
    loading,
    loadingFreq,
    alunos,
    materias,
    professoresEscola,
    vinculosProfessores,
    catalogoMaterias,
    selectedProfId,
    setSelectedProfId,
    novaMateriaNome,
    setNovaMateriaNome,
    novaMateriaProfId,
    setNovaMateriaProfId,
    novaMateriaBaseCurricular,
    setNovaMateriaBaseCurricular,
    selectedAluno,
    setSelectedAluno,
    isEditMode,
    frequencias,
    hasExistingRecords,
    hasUnsavedChanges,
    savingFreq,
    isPrazoExpirado,
    prazoFrequenciaDias,
    notasState,
    recuperacoesState,
    unidadesAtivas,
    setUnidadesAtivas,
    savingNotas,
    materiaAberta,
    setMateriaAberta,
    calculosNotas,
    defaultCalculos,
    mutateNotasServidor,
    handleTogglePresenca,
    handleMarcarTodosPresentes,
    handleSalvarFrequencia,
    handleNotaChange,
    handleRecuperacaoChange,
    handleSalvarNotas,
    handleAddProfessor,
    handleRemoveProfessor,
    handleSelectMateriaCatalogo,
    handleAddMateria,
    handleImportarMateriasDaGrade,
    handleRemoveMateria,
    handleUpdateMateriaProfessor,
    handleUpdateMateriaBase,
    mutateFrequencias
  } = useTurmaDetalhes({
    open,
    turma,
    initialMateriaId,
    initialAgendaAulaId,
    initialData
  })

  if (!turma) return null

  return (
    <>
      <StandardDialog
        open={open}
        onOpenChange={onOpenChange}
        title={turma.nome}
        description={`${turma.turno} • Ano letivo ${turma.ano_letivo}`}
        maxWidth={portalComunicacoesAtivo ? "sm:max-w-[850px]" : "sm:max-w-[800px]"}
      >
        {/* Abas Nativas do SIG */}
        <div>
          <div className="bg-muted/80 border border-border p-1 rounded-xl w-full flex flex-wrap gap-1 text-muted-foreground">
            {!isProfessor && (
              <button
                onClick={() => setActiveTab('materias')}
                className={`flex-1 min-w-[90px] h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'materias' ? 'bg-card text-foreground shadow-sm border border-border/80 font-bold' : 'hover:text-foreground hover:bg-background/60'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Matérias
              </button>
            )}
            <button
              onClick={() => setActiveTab('alunos')}
              className={`flex-1 min-w-[90px] h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'alunos' ? 'bg-card text-foreground shadow-sm border border-border/80 font-bold' : 'hover:text-foreground hover:bg-background/60'
              }`}
            >
              <Users className="w-4 h-4" />
              Alunos
            </button>
            <button
              onClick={() => setActiveTab('frequencia')}
              className={`flex-1 min-w-[100px] h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'frequencia' ? 'bg-card text-foreground shadow-sm border border-border/80 font-bold' : 'hover:text-foreground hover:bg-background/60'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              Frequência
            </button>
            <button
              onClick={() => setActiveTab('notas')}
              className={`flex-1 min-w-[80px] h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'notas' ? 'bg-card text-foreground shadow-sm border border-border/80 font-bold' : 'hover:text-foreground hover:bg-background/60'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Notas
            </button>

            {!isEmaeeOuCursinho && (
              <button
                onClick={() => setActiveTab('diario')}
                className={`flex-1 min-w-[110px] h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'diario' ? 'bg-card text-sky-600 dark:text-sky-400 shadow-sm border border-border/80 font-bold' : 'hover:text-foreground hover:bg-background/60 text-sky-600/80 dark:text-sky-400/80'
                }`}
              >
                <BookOpenCheck className="w-4 h-4 text-sky-500" />
                Diário BNCC
              </button>
            )}

            {portalComunicacoesAtivo && (
              <button
                onClick={() => setActiveTab('comunicacoes')}
                className={`flex-1 min-w-[110px] h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'comunicacoes' ? 'bg-card text-foreground shadow-sm border border-border/80 font-bold text-indigo-500' : 'hover:text-foreground hover:bg-background/60 text-indigo-400/80'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                Comunicações
              </button>
            )}
          </div>

          <div className="mt-4">
            {!isProfessor && activeTab === 'materias' && (
              <TabMateriasTurma
                isEditMode={isEditMode}
                loading={loading}
                materias={materias}
                professoresEscola={professoresEscola}
                vinculosProfessores={vinculosProfessores}
                catalogoMaterias={catalogoMaterias}
                selectedProfId={selectedProfId}
                setSelectedProfId={setSelectedProfId}
                novaMateriaNome={novaMateriaNome}
                setNovaMateriaNome={setNovaMateriaNome}
                novaMateriaProfId={novaMateriaProfId}
                setNovaMateriaProfId={setNovaMateriaProfId}
                novaMateriaBaseCurricular={novaMateriaBaseCurricular}
                setNovaMateriaBaseCurricular={setNovaMateriaBaseCurricular}
                handleAddProfessor={handleAddProfessor}
                handleRemoveProfessor={handleRemoveProfessor}
                handleSelectMateriaCatalogo={handleSelectMateriaCatalogo}
                handleAddMateria={handleAddMateria}
                handleImportarMateriasDaGrade={handleImportarMateriasDaGrade}
                handleRemoveMateria={handleRemoveMateria}
                handleUpdateMateriaProfessor={handleUpdateMateriaProfessor}
                handleUpdateMateriaBase={handleUpdateMateriaBase}
              />
            )}

            {activeTab === 'alunos' && (
              <TabAlunosTurma
                loading={loading}
                alunos={alunos}
                setSelectedAluno={setSelectedAluno}
                turma={turma}
              />
            )}

            {activeTab === 'frequencia' && (
              <TabFrequenciasTurma
                alunos={alunos}
                materias={materias}
                selectedMateriaId={selectedMateriaId}
                setSelectedMateriaId={setSelectedMateriaId}
                setSelectedAgendaAulaId={setSelectedAgendaAulaId}
                initialMateriaId={initialMateriaId}
                dataFreq={dataFreq}
                setDataFreq={setDataFreq}
                loading={loading}
                loadingFreq={loadingFreq}
                frequencias={frequencias}
                hasExistingRecords={hasExistingRecords}
                hasUnsavedChanges={hasUnsavedChanges}
                savingFreq={savingFreq}
                isPrazoExpirado={isPrazoExpirado}
                prazoFrequenciaDias={prazoFrequenciaDias}
                handleTogglePresenca={handleTogglePresenca}
                handleMarcarTodosPresentes={handleMarcarTodosPresentes}
                handleSalvarFrequencia={handleSalvarFrequencia}
                mutateFrequencias={mutateFrequencias}
              />
            )}

            {activeTab === 'notas' && (
              <TabNotasTurma
                loading={loading}
                materias={materias}
                alunos={alunos}
                materiaAberta={materiaAberta}
                setMateriaAberta={setMateriaAberta}
                unidadesAtivas={unidadesAtivas}
                setUnidadesAtivas={setUnidadesAtivas}
                notasState={notasState}
                recuperacoesState={recuperacoesState}
                savingNotas={savingNotas}
                calculosNotas={calculosNotas}
                defaultCalculos={defaultCalculos}
                mutateNotasServidor={mutateNotasServidor}
                handleSalvarNotas={handleSalvarNotas}
                handleNotaChange={handleNotaChange}
                handleRecuperacaoChange={handleRecuperacaoChange}
              />
            )}

            {activeTab === 'diario' && !isEmaeeOuCursinho && (
              <TabDiarioConteudoTurma
                turma={turma}
                materias={materias}
                selectedMateriaId={selectedMateriaId}
                setSelectedMateriaId={setSelectedMateriaId}
                dataAula={dataFreq}
                setDataAula={setDataFreq}
                onNavigateToFrequencia={() => setActiveTab('frequencia')}
              />
            )}

            {activeTab === 'comunicacoes' && portalComunicacoesAtivo && (
              <TabComunicacoesTurma
                turma={turma}
                alunos={alunos}
                loading={loading}
              />
            )}
          </div>
        </div>
      </StandardDialog>

      {/* Modal Detalhes do Aluno */}
      <ModalDetalhesAluno
        open={selectedAluno !== null}
        onOpenChange={(val) => {
          if (!val) setSelectedAluno(null)
        }}
        aluno={selectedAluno}
        turma={turma}
      />
    </>
  )
}
