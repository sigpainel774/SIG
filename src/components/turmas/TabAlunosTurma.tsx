'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'

interface TabAlunosTurmaProps {
  loading: boolean
  alunos: any[]
  setSelectedAluno: (aluno: any) => void
}

export function TabAlunosTurma({
  loading,
  alunos,
  setSelectedAluno
}: TabAlunosTurmaProps) {
  const [searchAluno, setSearchAluno] = useState('')

  const filteredAlunos = useMemo(() => {
    return alunos.filter((a) =>
      a.nome.toLowerCase().includes(searchAluno.toLowerCase())
    )
  }, [alunos, searchAluno])

  return (
    <div className="space-y-4 mt-5">
      {/* Campo de Busca */}
      <div className="relative">
        <Input
          type="search"
          placeholder="Buscar aluno..."
          value={searchAluno}
          onChange={(e) => setSearchAluno(e.target.value)}
          className="bg-background border-border text-foreground placeholder-muted-foreground h-10 text-sm rounded-xl pl-3 focus-visible:ring-primary"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-10 text-xs text-muted-foreground font-medium">
          Carregando alunos...
        </div>
      ) : filteredAlunos.length === 0 ? (
        <div className="text-center py-10 text-xs text-muted-foreground font-medium">
          Nenhum aluno encontrado.
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {filteredAlunos.map((aluno) => (
            <div
              key={aluno.id}
              onClick={() => setSelectedAluno(aluno)}
              className="bg-card border border-border hover:border-primary/40 shadow-[0_2px_10px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 p-3 rounded-xl flex items-center gap-3.5 cursor-pointer transition-all duration-200 text-foreground"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold flex items-center justify-center overflow-hidden flex-shrink-0">
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
              <span className="text-sm font-semibold text-foreground truncate">
                {aluno.nome}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
