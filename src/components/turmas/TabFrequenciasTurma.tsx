'use client'

import { Button } from '@/components/ui/button'
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Lock
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
  isPrazoExpirado?: boolean
  prazoFrequenciaDias?: number
  handleLancarFrequencia: (alunoId: string, presenca: boolean) => Promise<void>
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
  isPrazoExpirado = false,
  prazoFrequenciaDias = 15,
  handleLancarFrequencia,
  mutateFrequencias
}: TabFrequenciasTurmaProps) {
  // Navegação de Datas na Frequência
  const alterarData = (dias: number) => {
    const d = new Date(dataFreq + 'T00:00:00')
    d.setDate(d.getDate() + dias)
    setDataFreq(d.toISOString().split('T')[0])
  }

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

      {/* Controles de Data e Matéria */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center bg-background border border-border rounded-xl overflow-hidden h-10">
          <button
            onClick={() => alterarData(-1)}
            className="p-2.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4.5 h-4.5" />
          </button>
          <input
            type="date"
            value={dataFreq}
            onChange={(e) => setDataFreq(e.target.value)}
            className="bg-transparent text-sm text-primary font-bold text-center w-36 outline-none px-2 focus:ring-0 cursor-pointer"
          />
          <button
            onClick={() => alterarData(1)}
            className="p-2.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4.5 h-4.5" />
          </button>
        </div>

        <select
          value={selectedMateriaId}
          onChange={(e) => {
            setSelectedMateriaId(e.target.value)
            setSelectedAgendaAulaId(null) // Reseta se trocar matéria manualmente
          }}
          disabled={!!initialMateriaId}
          className="h-10 rounded-xl border border-border bg-background text-foreground px-3.5 text-xs font-semibold focus:outline-none cursor-pointer outline-none"
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
          size="sm"
          onClick={() => mutateFrequencias()}
          className="bg-muted text-foreground border border-border hover:bg-muted/80 rounded-xl px-3.5 h-10 gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </Button>
      </div>

      {/* Lista com Presença/Falta */}
      {loading || loadingFreq ? (
        <div className="text-center py-10 text-xs text-muted-foreground font-medium">
          Carregando diário de presenças...
        </div>
      ) : alunos.length === 0 ? (
        <div className="text-center py-10 text-xs text-muted-foreground font-medium">
          Sem alunos matriculados nesta turma.
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {alunos.map((aluno) => {
            const status = frequencias[aluno.id] // true = Presente, false = Falta, undefined = Pendente
            return (
              <div
                key={aluno.id}
                className="bg-card border border-border shadow-[0_2px_10px_rgba(15,23,42,0.04)] p-3 rounded-xl flex items-center justify-between text-foreground"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-full bg-muted text-muted-foreground text-xs font-bold flex items-center justify-center overflow-hidden flex-shrink-0">
                    {aluno.foto_url ? (
                      <img
                        src={aluno.foto_url}
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
                    disabled={isPrazoExpirado}
                    onClick={() => handleLancarFrequencia(aluno.id, true)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      isPrazoExpirado
                        ? 'opacity-50 cursor-not-allowed bg-muted border-border text-muted-foreground'
                        : status === true
                        ? 'bg-green-500/10 text-green-500 border-green-500/30 cursor-pointer'
                        : 'bg-transparent text-muted-foreground border-border hover:bg-muted cursor-pointer'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Presente
                  </button>
                  <button
                    disabled={isPrazoExpirado}
                    onClick={() => handleLancarFrequencia(aluno.id, false)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      isPrazoExpirado
                        ? 'opacity-50 cursor-not-allowed bg-muted border-border text-muted-foreground'
                        : status === false
                        ? 'bg-red-500/10 text-red-500 border-red-500/30 cursor-pointer'
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
