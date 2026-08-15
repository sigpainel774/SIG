'use client'

import React, { useState, useCallback, useEffect } from 'react'
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
    periodo: string
  }>({
    periodo: '30d' // Padrão 30 dias para não sobrecarregar
  })

  // Instanciar o hook passando a escola ativa
  const {
    loading,
    error,
    notas,
    turmas,
    materias,
    alunos,
    frequencias,
    escolasDesempenho,
    mediaRede,
    taxaAprovados,
    taxaRisco,
    refetch
  } = useRelatorioNotas(selectedEscola?.id ?? null)

  // Recarregar os dados do relatório quando a escola ou o período de frequência mudarem
  useEffect(() => {
    refetch({ periodo: filters.periodo })
  }, [selectedEscola?.id, filters.periodo, refetch])

  // Callback acionado quando filtros mudam nos componentes filhos
  const handleFilterChange = useCallback((newFilters: { turmaId?: string; materiaId?: string; periodo?: string }) => {
    if (newFilters.periodo) {
      setFilters((prev) => {
        if (prev.periodo === newFilters.periodo) return prev
        return { ...prev, periodo: newFilters.periodo! }
      })
    }
  }, [])

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-200 rounded-2xl p-6 text-center shadow-sm">
        <h3 className="text-base font-bold mb-2 text-rose-950 dark:text-rose-100">Erro de Carregamento</h3>
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
          periodo={filters.periodo}
          onFilterChange={handleFilterChange}
        />
      ) : (
        <SchoolDetailedReport
          school={selectedEscola}
          alunos={alunos}
          notas={notas}
          turmas={turmas}
          materias={materias}
          frequencias={frequencias}
          loading={loading}
          periodo={filters.periodo}
          onFilterChange={handleFilterChange}
        />
      )}
    </div>
  )
}
