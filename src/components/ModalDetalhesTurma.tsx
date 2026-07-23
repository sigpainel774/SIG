'use client'

import { BookOpen, Users, CalendarDays, FileSpreadsheet } from 'lucide-react'
import { ModalDetalhesAluno } from './ModalDetalhesAluno'
import { TabMateriasTurma } from './turmas/TabMateriasTurma'
import { TabAlunosTurma } from './turmas/TabAlunosTurma'
import { TabFrequenciasTurma } from './turmas/TabFrequenciasTurma'
import { TabNotasTurma } from './turmas/TabNotasTurma'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { useTurmaDetalhes } from '@/hooks/useTurmaDetalhes'

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
  const {
    activeTab,
    setActiveTab,
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
    handleLancarFrequencia,
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
        maxWidth="sm:max-w-[700px]"
      >
        {/* Abas Nativas do SIG */}
        <div>
          <div className="bg-muted/80 border border-border p-1 rounded-xl w-full grid grid-cols-4 h-11 text-muted-foreground">
            <button
              onClick={() => setActiveTab('materias')}
              className={`rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'materias' ? 'bg-card text-foreground shadow-sm border border-border/80 font-bold' : 'hover:text-foreground hover:bg-background/60'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Matérias
            </button>
            <button
              onClick={() => setActiveTab('alunos')}
              className={`rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'alunos' ? 'bg-card text-foreground shadow-sm border border-border/80 font-bold' : 'hover:text-foreground hover:bg-background/60'
              }`}
            >
              <Users className="w-4 h-4" />
              Alunos
            </button>
            <button
              onClick={() => setActiveTab('frequencia')}
              className={`rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'frequencia' ? 'bg-card text-foreground shadow-sm border border-border/80 font-bold' : 'hover:text-foreground hover:bg-background/60'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              Frequência
            </button>
            <button
              onClick={() => setActiveTab('notas')}
              className={`rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'notas' ? 'bg-card text-foreground shadow-sm border border-border/80 font-bold' : 'hover:text-foreground hover:bg-background/60'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Notas
            </button>
          </div>

          <div className="mt-4">
            {activeTab === 'materias' && (
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
                handleLancarFrequencia={handleLancarFrequencia}
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
