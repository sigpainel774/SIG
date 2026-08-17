'use client'

import { getAvatarUrl } from '@/lib/photoHelper'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Lock,
  CheckCheck,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react'

interface TabFrequenciasTurmaProps {
  alunos: any[]
  materias: any[]
  selectedMateriaId: string
  setSelectedMateriaId: (id: string) => void
  setSelectedAgendaAulaId: (id: string | null) => void
  initialMateriaId?: string
  dataFreq: string
  setDataFreq: (data: string) => void
  loading: boolean
  loadingFreq: boolean
  frequencias: Record<string, boolean>
  hasExistingRecords?: boolean
  hasUnsavedChanges?: boolean
  savingFreq?: boolean
  isPrazoExpirado?: boolean
  prazoFrequenciaDias?: number
  handleTogglePresenca: (alunoId: string, presenca: boolean) => void
  handleMarcarTodosPresentes: () => void
  handleSalvarFrequencia: () => Promise<void>
  mutateFrequencias: () => any
}

export function TabFrequenciasTurma({
  alunos,
  materias,
  selectedMateriaId,
  setSelectedMateriaId,
  setSelectedAgendaAulaId,
  initialMateriaId,
  dataFreq,
  setDataFreq,
  loading,
  loadingFreq,
  frequencias,
  hasExistingRecords = false,
  hasUnsavedChanges = false,
  savingFreq = false,
  isPrazoExpirado = false,
  prazoFrequenciaDias = 15,
  handleTogglePresenca,
  handleMarcarTodosPresentes,
  handleSalvarFrequencia,
  mutateFrequencias
}: TabFrequenciasTurmaProps) {
  // Navegação de Datas na Frequência
  const alterarData = (dias: number) => {
    const d = new Date(dataFreq + 'T00:00:00')
    d.setDate(d.getDate() + dias)
    setDataFreq(d.toISOString().split('T')[0])
  }

  // Contadores rápidos para feedback ao professor
  const totalAlunos = alunos.length
  const totalPresentes = Object.values(frequencias).filter((v) => v === true).length
  const totalAusentes = Object.values(frequencias).filter((v) => v === false).length

  return (
    <div className="space-y-4 mt-5">
      {/* Alerta de Bloqueio por Prazo Expirado */}
      {isPrazoExpirado && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-2.5 shadow-xs">
          <Lock className="w-4 h-4 shrink-0 text-amber-500" />
          <span>
            <strong>Edição Bloqueada:</strong> O prazo limite de alteração de frequência para esta data expirou ({prazoFrequenciaDias} dias). Apenas a Direção e o Superadmin podem fazer alterações.
          </span>
        </div>
      )}

      {/* Barra de Controles Principais */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-3 rounded-2xl border border-border">
        {/* Lado Esquerdo: Data e Matéria */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-background border border-border rounded-xl overflow-hidden h-10 shadow-xs">
            <button
              onClick={() => alterarData(-1)}
              className="p-2.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Dia anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={dataFreq}
              onChange={(e) => setDataFreq(e.target.value)}
              className="bg-transparent text-xs text-primary font-bold text-center w-34 outline-none px-1 focus:ring-0 cursor-pointer"
            />
            <button
              onClick={() => alterarData(1)}
              className="p-2.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Próximo dia"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <select
            value={selectedMateriaId}
            onChange={(e) => {
              setSelectedMateriaId(e.target.value)
              setSelectedAgendaAulaId(null)
            }}
            disabled={!!initialMateriaId}
            className="h-10 rounded-xl border border-border bg-background text-foreground px-3 text-xs font-semibold focus:outline-none cursor-pointer outline-none shadow-xs max-w-[200px]"
          >
            <option value="" disabled className="bg-background text-foreground">
              -- Selecione a Matéria --
            </option>
            {materias.map((m) => (
              <option
                key={m.id}
                value={m.id}
                className="bg-background text-foreground"
              >
                {m.nome}
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => mutateFrequencias()}
            className="bg-background text-foreground border border-border hover:bg-muted rounded-xl h-10 w-10 shrink-0 cursor-pointer"
            title="Recarregar do servidor"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Lado Direito: Ações Rápidas e Salvar */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleMarcarTodosPresentes}
            disabled={isPrazoExpirado || loadingFreq || savingFreq}
            className="bg-background border-border hover:bg-muted text-foreground font-semibold h-10 px-3 text-xs rounded-xl gap-1.5 cursor-pointer"
            title="Marcar todos como presentes"
          >
            <CheckCheck className="w-4 h-4 text-emerald-500" />
            <span className="hidden sm:inline">Todos Presentes</span>
          </Button>

          <Button
            type="button"
            onClick={handleSalvarFrequencia}
            disabled={isPrazoExpirado || loadingFreq || savingFreq}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-10 px-4 text-xs rounded-xl gap-1.5 shadow-sm cursor-pointer"
          >
            {savingFreq ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Salvar Frequência</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Indicadores de Status e Resumo */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-2">
          {hasUnsavedChanges ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <AlertCircle className="w-3 h-3" />
              Alterações pendentes de salvamento
            </span>
          ) : hasExistingRecords ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3 h-3" />
              Chamada gravada no diário
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <CheckCheck className="w-3 h-3" />
              Pré-selecionada (Clique em Salvar Frequência)
            </span>
          )}
        </div>

        {alunos.length > 0 && !loading && !loadingFreq && (
          <div className="flex items-center gap-3 text-muted-foreground text-[11px] font-medium">
            <span>Total: <strong className="text-foreground">{totalAlunos}</strong></span>
            <span className="h-3 w-px bg-border"></span>
            <span className="text-emerald-600 dark:text-emerald-400">Presentes: <strong>{totalPresentes}</strong></span>
            <span className="h-3 w-px bg-border"></span>
            <span className="text-red-500">Ausentes: <strong>{totalAusentes}</strong></span>
          </div>
        )}
      </div>

      {/* Lista de Alunos com Presença/Falta */}
      {loading || loadingFreq ? (
        <div className="text-center py-12 text-xs text-muted-foreground font-medium flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span>Carregando diário de presenças...</span>
        </div>
      ) : alunos.length === 0 ? (
        <div className="text-center py-10 text-xs text-muted-foreground font-medium">
          Sem alunos matriculados nesta turma.
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {alunos.map((aluno) => {
            const status = frequencias[aluno.id] ?? true // Padrão ágil: Presente
            return (
              <div
                key={aluno.id}
                className="bg-card border border-border shadow-[0_2px_10px_rgba(15,23,42,0.04)] p-3 rounded-xl flex items-center justify-between text-foreground hover:border-border/80 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center overflow-hidden flex-shrink-0">
                    {getAvatarUrl(aluno) ? (
                      <img
                        src={getAvatarUrl(aluno)}
                        alt={aluno.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      aluno.nome.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <span className="text-sm font-semibold text-foreground truncate pr-2">
                    {aluno.nome}
                  </span>
                </div>

                {/* Botões Presente / Falta */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isPrazoExpirado || savingFreq}
                    onClick={() => handleTogglePresenca(aluno.id, true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      isPrazoExpirado
                        ? 'opacity-50 cursor-not-allowed bg-muted border-border text-muted-foreground'
                        : status === true
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-xs cursor-pointer font-bold'
                        : 'bg-transparent text-muted-foreground border-border hover:bg-muted cursor-pointer'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Presente
                  </button>
                  <button
                    type="button"
                    disabled={isPrazoExpirado || savingFreq}
                    onClick={() => handleTogglePresenca(aluno.id, false)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      isPrazoExpirado
                        ? 'opacity-50 cursor-not-allowed bg-muted border-border text-muted-foreground'
                        : status === false
                        ? 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/40 shadow-xs cursor-pointer font-bold'
                        : 'bg-transparent text-muted-foreground border-border hover:bg-muted cursor-pointer'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Falta
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
