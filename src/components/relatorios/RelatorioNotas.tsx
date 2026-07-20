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

  // Recarregar os dados do relatório sempre que escola ou filtros (como periodo) mudarem
  useEffect(() => {
    refetch(filters)
  }, [selectedEscola, filters.periodo, refetch])

  // Callback acionado quando filtros mudam nos componentes filhos
  const handleFilterChange = useCallback((newFilters: { turmaId?: string; materiaId?: string; periodo?: string }) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters
    }))
    // Se mudou algum filtro estrutural que precise de refetch imediato:
    if (newFilters.turmaId !== undefined || newFilters.materiaId !== undefined || newFilters.periodo !== undefined) {
      refetch({
        ...filters,
        ...newFilters
      })
    }
  }, [refetch, filters])

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
