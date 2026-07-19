'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { BookOpen, ChevronDown, RefreshCw, Save } from 'lucide-react'

interface TabNotasTurmaProps {
  loading: boolean
  materias: any[]
  alunos: any[]
  materiaAberta: string | null
  setMateriaAberta: (id: string | null) => void
  unidadesAtivas: Record<string, number>
  setUnidadesAtivas: React.Dispatch<
    React.SetStateAction<Record<string, number>>
  >
  notasState: any
  recuperacoesState: any
  savingNotas: Record<string, boolean>
  calculosNotas: any
  defaultCalculos: any
  mutateNotasServidor: () => any
  handleSalvarNotas: (materiaId: string) => Promise<void>
  handleNotaChange: (
    alunoId: string,
    materiaId: string,
    unidade: number,
    campo: 'nota1' | 'nota2' | 'nota3' | 'nota4',
    valor: string
  ) => void
  handleRecuperacaoChange: (
    alunoId: string,
    materiaId: string,
    valor: string
  ) => void
}

export function TabNotasTurma({
  loading,
  materias,
  alunos,
  materiaAberta,
  setMateriaAberta,
  unidadesAtivas,
  setUnidadesAtivas,
  notasState,
  recuperacoesState,
  savingNotas,
  calculosNotas,
  defaultCalculos,
  mutateNotasServidor,
  handleSalvarNotas,
  handleNotaChange,
  handleRecuperacaoChange
}: TabNotasTurmaProps) {
  return (
    <div className="space-y-4 mt-5">
      <div className="space-y-3 w-full">
        {loading ? (
          <div className="text-center py-10 text-xs text-muted-foreground font-medium bg-card border border-border rounded-xl">
            Carregando notas...
          </div>
        ) : materias.length === 0 ? (
          <div className="text-center py-10 text-xs text-muted-foreground font-medium bg-card border border-border rounded-xl p-4">
            Nenhuma matéria vinculada a esta turma. Cadastre as matérias na aba
            "Matérias" para poder lançar notas.
          </div>
        ) : (
          materias.map((mat) => {
            const isOpen = materiaAberta === mat.id
            const unidAtiva = unidadesAtivas[mat.id] || 1
            const isSaving = savingNotas[mat.id] || false

            return (
              <div
                key={mat.id}
                className="border border-border bg-card rounded-xl overflow-hidden shadow-[0_2px_10px_rgba(15,23,42,0.04)]"
              >
                <button
                  onClick={() => setMateriaAberta(isOpen ? null : mat.id)}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-foreground border-b border-border bg-muted/20 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-4.5 h-4.5 text-muted-foreground" />
                    {mat.nome}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="p-4 bg-background space-y-4">
                    {/* Controles de Lançamento por Unidade e Botões de Ação */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3.5">
                      {/* Tabs de Unidade */}
                      <div className="flex gap-1.5 bg-muted border border-border p-1 rounded-lg">
                        {[1, 2, 3].map((u) => (
                          <button
                            key={u}
                            onClick={() =>
                              setUnidadesAtivas((prev) => ({
                                ...prev,
                                [mat.id]: u
                              }))
                            }
                            className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                              unidAtiva === u
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {u}ª Unidade
                          </button>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => mutateNotasServidor()}
                          className="bg-muted text-foreground border border-border hover:bg-muted/80 rounded-lg h-9 gap-1 text-xs font-semibold cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Atualizar
                        </Button>
                        <Button
                          size="sm"
                          disabled={isSaving}
                          onClick={() => handleSalvarNotas(mat.id)}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-9 gap-1 text-xs rounded-lg cursor-pointer"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {isSaving ? 'Salvando...' : 'Salvar Notas'}
                        </Button>
                      </div>
                    </div>

                    {/* Tabela de Notas */}
                    <div className="overflow-x-auto border border-border rounded-xl bg-muted/5">
                      <table className="w-full text-left border-collapse min-w-[500px]">
                        <thead>
                          <tr className="border-b border-border text-[10.5px] text-muted-foreground font-semibold uppercase bg-muted/30">
                            <th className="p-3">Aluno</th>
                            <th className="p-3 w-16 text-center">Nota 1</th>
                            <th className="p-3 w-16 text-center">Nota 2</th>
                            <th className="p-3 w-16 text-center">Nota 3</th>
                            <th className="p-3 w-16 text-center">Nota 4</th>
                            <th className="p-3 w-20 text-center font-bold bg-muted/20">
                              Média Unid.
                            </th>
                            <th className="p-3 w-20 text-center font-bold bg-muted/40">
                              Média Final
                            </th>
                            <th className="p-3 w-20 text-center font-bold bg-muted/60">
                              Recup. Final
                            </th>
                            <th className="p-3 w-20 text-center font-bold bg-muted/70">
                              Média Pós-Rec
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {alunos.length === 0 ? (
                            <tr>
                              <td
                                colSpan={9}
                                className="p-8 text-center text-xs text-muted-foreground font-medium"
                              >
                                Nenhum aluno matriculado nesta turma.
                              </td>
                            </tr>
                          ) : (
                            alunos.map((aluno) => {
                              const key = `${aluno.id}_${mat.id}`
                              const calc =
                                calculosNotas[key] ?? defaultCalculos
                              const mediaUnid =
                                unidAtiva === 1
                                  ? calc.m1
                                  : unidAtiva === 2
                                  ? calc.m2
                                  : calc.m3
                              const keyNota = `${key}_${unidAtiva}`
                              const n = notasState[keyNota] || {
                                nota1: null,
                                nota2: null,
                                nota3: null,
                                nota4: null
                              }
                              const rec = recuperacoesState[key] || {
                                nota: null
                              }

                              return (
                                <RowAlunoNotas
                                  key={aluno.id}
                                  alunoId={aluno.id}
                                  alunoNome={aluno.nome}
                                  materiaId={mat.id}
                                  unidAtiva={unidAtiva}
                                  nota1={
                                    n.nota1 !== null ? String(n.nota1) : null
                                  }
                                  nota2={
                                    n.nota2 !== null ? String(n.nota2) : null
                                  }
                                  nota3={
                                    n.nota3 !== null ? String(n.nota3) : null
                                  }
                                  nota4={
                                    n.nota4 !== null ? String(n.nota4) : null
                                  }
                                  recNota={
                                    rec.nota !== null ? String(rec.nota) : null
                                  }
                                  mediaUnid={mediaUnid}
                                  mediaFinal={calc.mediaFinal}
                                  mediaPosRec={calc.mediaPosRec}
                                  situacao={calc.situacao}
                                  isElegivelRec={calc.isElegivelRec}
                                  onNotaChange={handleNotaChange}
                                  onRecuperacaoChange={handleRecuperacaoChange}
                                />
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

interface RowAlunoNotasProps {
  alunoId: string
  alunoNome: string
  materiaId: string
  unidAtiva: number
  nota1: string | null
  nota2: string | null
  nota3: string | null
  nota4: string | null
  recNota: string | null
  mediaUnid: number | null
  mediaFinal: number | null
  mediaPosRec: number | null
  situacao: string
  isElegivelRec: boolean
  onNotaChange: (
    alunoId: string,
    materiaId: string,
    unidade: number,
    campo: 'nota1' | 'nota2' | 'nota3' | 'nota4',
    valor: string
  ) => void
  onRecuperacaoChange: (
    alunoId: string,
    materiaId: string,
    valor: string
  ) => void
}

const RowAlunoNotas = memo(
  function RowAlunoNotas({
    alunoId,
    alunoNome,
    materiaId,
    unidAtiva,
    nota1,
    nota2,
    nota3,
    nota4,
    recNota,
    mediaUnid,
    mediaFinal,
    mediaPosRec,
    situacao,
    isElegivelRec,
    onNotaChange,
    onRecuperacaoChange
  }: RowAlunoNotasProps) {
    return (
      <tr className="border-b border-border last:border-0 hover:bg-muted/30 text-xs text-foreground">
        <td className="p-3 font-semibold text-foreground">{alunoNome}</td>

        {/* Nota 1 */}
        <td className="p-2 text-center">
          <input
            type="text"
            value={nota1 ?? ''}
            onChange={(e) =>
              onNotaChange(alunoId, materiaId, unidAtiva, 'nota1', e.target.value)
            }
            placeholder="-"
            className="w-11 h-8 bg-background border border-border text-center rounded focus:outline-none focus:border-primary text-xs font-semibold text-foreground"
          />
        </td>

        {/* Nota 2 */}
        <td className="p-2 text-center">
          <input
            type="text"
            value={nota2 ?? ''}
            onChange={(e) =>
              onNotaChange(alunoId, materiaId, unidAtiva, 'nota2', e.target.value)
            }
            placeholder="-"
            className="w-11 h-8 bg-background border border-border text-center rounded focus:outline-none focus:border-primary text-xs font-semibold text-foreground"
          />
        </td>

        {/* Nota 3 */}
        <td className="p-2 text-center">
          <input
            type="text"
            value={nota3 ?? ''}
            onChange={(e) =>
              onNotaChange(alunoId, materiaId, unidAtiva, 'nota3', e.target.value)
            }
            placeholder="-"
            className="w-11 h-8 bg-background border border-border text-center rounded focus:outline-none focus:border-primary text-xs font-semibold text-foreground"
          />
        </td>

        {/* Nota 4 */}
        <td className="p-2 text-center">
          <input
            type="text"
            value={nota4 ?? ''}
            onChange={(e) =>
              onNotaChange(alunoId, materiaId, unidAtiva, 'nota4', e.target.value)
            }
            placeholder="-"
            className="w-11 h-8 bg-background border border-border text-center rounded focus:outline-none focus:border-primary text-xs font-semibold text-foreground"
          />
        </td>

        {/* Média Unidade */}
        <td className="p-3 text-center bg-muted/10 font-bold">
          {mediaUnid !== null ? (
            <span className={mediaUnid < 6 ? 'text-red-500' : 'text-green-500'}>
              {mediaUnid}
            </span>
          ) : (
            '-'
          )}
        </td>

        {/* Média Final */}
        <td className="p-3 text-center bg-muted/20 font-bold text-sm">
          {mediaFinal !== null ? (
            <span className={mediaFinal < 5 ? 'text-red-500' : 'text-green-500'}>
              {mediaFinal}
            </span>
          ) : (
            '-'
          )}
        </td>

        {/* Recuperação Final */}
        <td className="p-2 text-center bg-yellow-500/5">
          <input
            type="text"
            value={recNota ?? ''}
            onChange={(e) =>
              onRecuperacaoChange(alunoId, materiaId, e.target.value)
            }
            disabled={!isElegivelRec}
            placeholder={isElegivelRec ? '-' : 'N/A'}
            className={`w-11 h-8 text-center rounded focus:outline-none focus:border-yellow-500 text-xs font-semibold text-foreground ${
              isElegivelRec
                ? 'bg-background border border-yellow-500/50'
                : 'bg-muted/40 border border-border text-muted-foreground cursor-not-allowed'
            }`}
          />
        </td>

        {/* Média Pós-Rec / Situação */}
        <td className="p-3 text-center bg-muted/30 font-bold">
          {mediaPosRec !== null ? (
            <div className="flex flex-col items-center">
              <span
                className={mediaPosRec < 5 ? 'text-red-500' : 'text-green-500'}
              >
                {mediaPosRec}
              </span>
              <span
                className={`text-[9px] uppercase mt-0.5 font-bold ${
                  situacao.startsWith('Aprovado')
                    ? 'text-green-600'
                    : situacao === 'Em Recuperação'
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}
              >
                {situacao}
              </span>
            </div>
          ) : (
            '-'
          )}
        </td>
      </tr>
    )
  },
  (prevProps, nextProps) => {
    return (
      prevProps.alunoId === nextProps.alunoId &&
      prevProps.alunoNome === nextProps.alunoNome &&
      prevProps.materiaId === nextProps.materiaId &&
      prevProps.unidAtiva === nextProps.unidAtiva &&
      prevProps.nota1 === nextProps.nota1 &&
      prevProps.nota2 === nextProps.nota2 &&
      prevProps.nota3 === nextProps.nota3 &&
      prevProps.nota4 === nextProps.nota4 &&
      prevProps.recNota === nextProps.recNota &&
      prevProps.mediaUnid === nextProps.mediaUnid &&
      prevProps.mediaFinal === nextProps.mediaFinal &&
      prevProps.mediaPosRec === nextProps.mediaPosRec &&
      prevProps.situacao === nextProps.situacao &&
      prevProps.isElegivelRec === nextProps.isElegivelRec
    )
  }
)
