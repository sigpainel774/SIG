'use client'

import React, { useState, useCallback } from 'react'
import { useRelatorioNotas } from '@/hooks/useRelatorioNotas'
import { NetworkConsolidatedReport } from './NetworkConsolidatedReport'
import { SchoolDetailedReport } from './SchoolDetailedReport'

import { Escola } from '@/store/useSchoolStore'

interface RelatorioNotasProps {
  selectedEscola: Escola | null
}

export default function RelatorioNotas({ selectedEscola }: RelatorioNotasProps) {
  // Lógica de controle de filtros locais
  const [filters, setFilters] = useState<{
    turmaId?: string
    materiaId?: string
  }>({})

  // Instanciar o hook passando a escola ativa
  const {
    loading,
    error,
    notas,
    turmas,
    materias,
    alunos,
    escolasDesempenho,
    mediaRede,
    taxaAprovados,
    taxaRisco,
    refetch
  } = useRelatorioNotas(selectedEscola?.id ?? null)

  // Callback acionado quando filtros mudam no componente filho
  const handleFilterChange = useCallback((newFilters: { turmaId?: string; materiaId?: string }) => {
    setFilters(newFilters)
    refetch(newFilters)
  }, [refetch])

  if (error) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 text-center text-rose-300">
        <h3 className="text-base font-bold mb-2">Erro de Carregamento</h3>
        <p className="text-xs">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {selectedEscola === null ? (
        <NetworkConsolidatedReport
          escolasDesempenho={escolasDesempenho}
          mediaRede={mediaRede}
          taxaAprovados={taxaAprovados}
          taxaRisco={taxaRisco}
          loading={loading}
        />
      ) : (
        <SchoolDetailedReport
          school={selectedEscola}
          alunos={alunos}
          notas={notas}
          turmas={turmas}
          materias={materias}
          loading={loading}
          onFilterChange={handleFilterChange}
        />
      )}
    </div>
  )
}
