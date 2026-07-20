'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Users,
  BookOpen,
  Plus,
  Trash2,
  User as UserIcon
} from 'lucide-react'

interface TabMateriasTurmaProps {
  isEditMode: boolean
  loading: boolean
  materias: any[]
  professoresEscola: any[]
  vinculosProfessores: any[]
  catalogoMaterias: any[]
  selectedProfId: string
  setSelectedProfId: (id: string) => void
  novaMateriaNome: string
  setNovaMateriaNome: (nome: string) => void
  novaMateriaProfId: string
  setNovaMateriaProfId: (id: string) => void
  novaMateriaBaseCurricular: string
  setNovaMateriaBaseCurricular: (base: string) => void
  handleAddProfessor: () => Promise<void>
  handleRemoveProfessor: (vinculoId: string, funcionarioId: string) => Promise<void>
  handleSelectMateriaCatalogo: (nome: string) => void
  handleAddMateria: () => Promise<void>
  handleImportarMateriasDaGrade: () => Promise<void>
  handleRemoveMateria: (materiaId: string) => Promise<void>
  handleUpdateMateriaProfessor: (materiaId: string, professorId: string) => Promise<void>
  handleUpdateMateriaBase: (materiaId: string, baseCurricular: string) => Promise<void>
}

export function TabMateriasTurma({
  isEditMode,
  loading,
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
  handleAddProfessor,
  handleRemoveProfessor,
  handleSelectMateriaCatalogo,
  handleAddMateria,
  handleImportarMateriasDaGrade,
  handleRemoveMateria,
  handleUpdateMateriaProfessor,
  handleUpdateMateriaBase
}: TabMateriasTurmaProps) {
  return (
    <div className="space-y-4 mt-5">
      {isEditMode ? (
        // PAINEL DE ALOCAÇÃO ADMINISTRATIVA (Exibido se o Modo de Edição estiver ativo)
        <div className="space-y-5">
          <div className="border border-border bg-muted/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground border-b border-border pb-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              Professores da Turma
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <select
                  value={selectedProfId}
                  onChange={(e) => setSelectedProfId(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg text-foreground px-3 h-10 text-xs focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="">-- Selecione um Professor --</option>
                  {professoresEscola
                    .filter(
                      (p) =>
                        !vinculosProfessores.some(
                          (vp) => vp.funcionario_id === p.id
                        )
                    )
                    .map((prof) => (
                      <option
                        key={prof.id}
                        value={prof.id}
                        className="bg-background text-foreground"
                      >
                        {prof.nome}
                      </option>
                    ))}
                </select>
              </div>
              <Button
                onClick={handleAddProfessor}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-4 h-10 text-xs rounded-lg"
              >
                Adicionar
              </Button>
            </div>

            {/* Lista de Professores Adicionados */}
            {vinculosProfessores.length > 0 ? (
              <div className="space-y-2 mt-2 max-h-32 overflow-y-auto pr-1">
                {vinculosProfessores.map((vp) => (
                  <div
                    key={vp.id}
                    className="flex items-center justify-between bg-background p-2 rounded-lg border border-border"
                  >
                    <span className="text-xs font-semibold text-foreground pl-1">
                      {vp.funcionarios?.nome ?? 'Sem nome'}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        handleRemoveProfessor(vp.id, vp.funcionario_id)
                      }
                      className="h-8 w-8 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground text-center py-1 font-medium">
                Nenhum professor alocado.
              </div>
            )}
          </div>

          <div className="border border-border bg-muted/30 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground border-b border-border pb-2">
              <BookOpen className="w-4 h-4 text-muted-foreground" />
              Matérias da Turma
            </div>

            {/* Formulário de Adição (Dashed Container) */}
            <div className="border border-dashed border-border bg-background rounded-lg p-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={novaMateriaNome}
                  onChange={(e) => handleSelectMateriaCatalogo(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg text-foreground px-3 h-10 text-xs focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="" className="bg-background text-foreground">
                    -- Selecione a Matéria --
                  </option>
                  {catalogoMaterias.length === 0 ? (
                    <option
                      value=""
                      disabled
                      className="bg-background text-foreground"
                    >
                      Cadastre matérias nas Configurações
                    </option>
                  ) : (
                    catalogoMaterias.map((m) => (
                      <option
                        key={m.id}
                        value={m.nome}
                        className="bg-background text-foreground"
                      >
                        {m.nome}
                      </option>
                    ))
                  )}
                </select>
                <select
                  value={novaMateriaProfId}
                  onChange={(e) => setNovaMateriaProfId(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg text-foreground px-3 h-10 text-xs focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="" className="bg-background text-foreground">
                    -- Selecione o Professor --
                  </option>
                  <option value="sem_professor" className="bg-background text-foreground">
                    Sem professor
                  </option>
                  {vinculosProfessores.map((vp) => (
                    <option
                      key={vp.funcionario_id}
                      value={vp.funcionario_id}
                      className="bg-background text-foreground"
                    >
                      {vp.funcionarios?.nome ?? 'Sem nome'}
                    </option>
                  ))}
                </select>
                <div className="w-full bg-background border border-border rounded-lg text-muted-foreground px-3 h-10 text-xs flex items-center justify-between">
                  <span>Base:</span>
                  <span
                    className={cn(
                      'font-semibold uppercase text-[10px] px-2 py-0.5 rounded border',
                      novaMateriaBaseCurricular === 'comum'
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : 'bg-purple-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400'
                    )}
                  >
                    {novaMateriaBaseCurricular === 'comum'
                      ? 'Comum'
                      : 'Diversificada'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleAddMateria}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold w-auto gap-1 h-9 px-3 text-xs rounded-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Matéria
                </Button>
                <Button
                  onClick={handleImportarMateriasDaGrade}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 w-9 p-0 text-xs rounded-lg flex items-center justify-center cursor-pointer"
                  title="Importar todas as matérias da grade curricular"
                >
                  T
                </Button>
              </div>
            </div>

            {/* Lista de Matérias */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {materias.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center py-2 font-medium">
                  Nenhuma matéria cadastrada.
                </div>
              ) : (
                materias.map((mat) => (
                  <div
                    key={mat.id}
                    className="flex items-center justify-between bg-background p-3 rounded-lg border border-border gap-3"
                  >
                    <div className="flex flex-col min-w-0 flex-1 pr-2">
                      <span className="text-xs font-bold text-foreground truncate">
                        {mat.nome}
                      </span>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        <div className="flex items-center gap-1">
                          <UserIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <select
                            value={mat.professor_id ?? 'sem_professor'}
                            onChange={(e) =>
                              handleUpdateMateriaProfessor(mat.id, e.target.value)
                            }
                            className="bg-background border border-border rounded text-foreground px-2 py-0.5 text-[11px] focus:ring-1 focus:ring-primary outline-none max-w-[130px]"
                          >
                            <option value="sem_professor" className="bg-background text-foreground">
                              Sem professor
                            </option>
                            {professoresEscola.map((prof) => (
                              <option
                                key={prof.id}
                                value={prof.id}
                                className="bg-background text-foreground"
                              >
                                {prof.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                          <select
                            value={mat.base_curricular ?? 'comum'}
                            onChange={(e) =>
                              handleUpdateMateriaBase(mat.id, e.target.value)
                            }
                            className="bg-background border border-border rounded text-foreground px-2 py-0.5 text-[11px] focus:ring-1 focus:ring-primary outline-none"
                          >
                            <option value="comum" className="bg-background text-foreground">
                              Base Comum
                            </option>
                            <option value="diversificada" className="bg-background text-foreground">
                              Base Diversificada
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMateria(mat.id)}
                      className="h-8 w-8 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 flex-shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        // DIÁRIO SIMPLES (Exibido no modo de leitura comum)
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-10 text-xs text-muted-foreground font-medium">
              Carregando matérias...
            </div>
          ) : materias.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground font-medium">
              Nenhuma matéria vinculada a esta turma.
            </div>
          ) : (
            materias.map((mat) => (
              <div
                key={mat.id}
                className="bg-card border border-border hover:border-primary/50 shadow-[0_2px_10px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 rounded-xl p-4 flex items-center justify-between h-13 transition-all duration-200 text-foreground cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-foreground">
                    {mat.nome}
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">
                    {mat.base_curricular === 'diversificada'
                      ? 'Base Diversificada'
                      : 'Base Comum'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <UserIcon className="w-4 h-4 text-muted-foreground/60" />
                  <span>{mat.funcionarios?.nome ?? 'Sem professor'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
