'use client'

import React, { useState, useMemo } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Search,
  Stethoscope,
  Building2,
  Calendar,
  Activity,
  UserCheck,
  Clock,
  Download,
  AlertCircle,
  FileQuestion,
} from 'lucide-react'

export interface CasoInvestigacao {
  id: string
  aluno_id: string
  aluno_nome: string
  escola_nome: string
  status: string
  data_matricula: string
  suspeita_clinica: string
  especialidades: string[]
}

interface ModalDetalhesInvestigacaoEmaeeProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  casos: CasoInvestigacao[]
  anoLetivo?: number
}

export function ModalDetalhesInvestigacaoEmaee({
  open,
  onOpenChange,
  casos = [],
  anoLetivo = new Date().getFullYear(),
}: ModalDetalhesInvestigacaoEmaeeProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'EM_INVESTIGACAO' | 'FILA_ESPERA' | 'ATIVO'>('TODOS')

  // Filtros combinados
  const filteredCasos = useMemo(() => {
    return casos.filter((item) => {
      const matchesSearch =
        item.aluno_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.escola_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.suspeita_clinica.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.especialidades.some((esp) => esp.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesStatus =
        statusFilter === 'TODOS' ? true : item.status.toUpperCase() === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [casos, searchTerm, statusFilter])

  // Métricas rápidas
  const totalCasos = casos.length
  const totalEmInvestigacao = casos.filter((c) => c.status === 'EM_INVESTIGACAO').length
  const totalFila = casos.filter((c) => c.status === 'FILA_ESPERA').length
  const totalAtivos = casos.filter((c) => c.status === 'ATIVO').length

  const handleExportCSV = () => {
    if (casos.length === 0) return

    const headers = ['Nome do Aluno', 'Escola de Origem', 'Status', 'Data Matrícula', 'Suspeita Clínica / Avaliação', 'Especialidades Vinculadas']
    const rows = filteredCasos.map((c) => [
      `"${c.aluno_nome.replace(/"/g, '""')}"`,
      `"${c.escola_nome.replace(/"/g, '""')}"`,
      `"${c.status}"`,
      `"${c.data_matricula ? new Date(c.data_matricula).toLocaleDateString('pt-BR') : 'N/D'}"`,
      `"${c.suspeita_clinica.replace(/"/g, '""')}"`,
      `"${c.especialidades.join(', ')}"`,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', `EMAEE_Casos_Em_Investigacao_${anoLetivo}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase()
    if (s === 'EM_INVESTIGACAO') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
          <Clock className="w-3 h-3" /> Em Investigação
        </span>
      )
    }
    if (s === 'FILA_ESPERA') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
          <Clock className="w-3 h-3" /> Fila de Espera
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
        <UserCheck className="w-3 h-3" /> Em Atendimento
      </span>
    )
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Casos em Investigação Diagnóstica / Aguardando Laudo"
      description={`Detalhamento dos ${totalCasos} alunos em processo de avaliação clínica ou aguardando conclusão diagnóstica no EMAEE.`}
      maxWidth="sm:max-w-4xl"
    >
      <div className="space-y-4 pt-1">
        {/* 1. Cards de Resumo Sintético */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-card border border-border flex flex-col justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase flex items-center gap-1.5">
              <FileQuestion className="w-3.5 h-3.5 text-primary" /> Total Casos
            </span>
            <span className="text-xl font-bold text-foreground mt-1">{totalCasos}</span>
          </div>

          <div className="p-3 rounded-xl bg-card border border-border flex flex-col justify-between">
            <span className="text-[11px] font-medium text-amber-500 uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Triagem / Inv.
            </span>
            <span className="text-xl font-bold text-amber-500 mt-1">{totalEmInvestigacao}</span>
          </div>

          <div className="p-3 rounded-xl bg-card border border-border flex flex-col justify-between">
            <span className="text-[11px] font-medium text-indigo-400 uppercase flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Na Fila
            </span>
            <span className="text-xl font-bold text-indigo-400 mt-1">{totalFila}</span>
          </div>

          <div className="p-3 rounded-xl bg-card border border-border flex flex-col justify-between">
            <span className="text-[11px] font-medium text-emerald-400 uppercase flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" /> Em Atendimento
            </span>
            <span className="text-xl font-bold text-emerald-400 mt-1">{totalAtivos}</span>
          </div>
        </div>

        {/* 2. Barra de Busca e Filtros */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Buscar por aluno, escola, especialidade ou suspeita clínica..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs bg-input border-border text-foreground rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-muted/50 p-0.5 rounded-lg border border-border text-xs">
              {(
                [
                  { key: 'TODOS', label: 'Todos' },
                  { key: 'EM_INVESTIGACAO', label: 'Investigação' },
                  { key: 'FILA_ESPERA', label: 'Fila' },
                  { key: 'ATIVO', label: 'Ativos' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                    statusFilter === tab.key
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-9 px-3 gap-1.5 rounded-xl text-xs border-border text-foreground hover:bg-hoverCustom"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </Button>
          </div>
        </div>

        {/* 3. Tabela de Alunos em Investigação */}
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Estudante</th>
                  <th className="py-2.5 px-3">Escola de Origem</th>
                  <th className="py-2.5 px-3">Suspeita / Condição em Investigação</th>
                  <th className="py-2.5 px-3">Especialidades Vinculadas</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredCasos.length > 0 ? (
                  filteredCasos.map((item) => (
                    <tr key={item.id} className="hover:bg-hoverCustom/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-foreground">
                        <div>{item.aluno_nome}</div>
                        {item.data_matricula && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-normal mt-0.5">
                            <Calendar className="w-3 h-3" />
                            Entrada: {new Date(item.data_matricula).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-muted-foreground">
                        <div className="flex items-center gap-1.5 text-foreground/90 font-medium">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[160px]">{item.escola_nome}</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="inline-flex items-start gap-1.5 max-w-[240px]">
                          <Stethoscope className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span className="text-foreground/90 text-[11px] leading-snug">
                            {item.suspeita_clinica}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        {item.especialidades && item.especialidades.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[180px]">
                            {item.especialidades.map((esp, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 rounded-md bg-secondary/80 text-[10px] font-medium text-foreground border border-border"
                              >
                                {esp}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground italic">
                            Aguardando triagem
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      <AlertCircle className="w-6 h-6 mx-auto mb-1.5 opacity-50" />
                      Nenhum aluno em investigação encontrado com os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rodapé Informativo */}
        <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1">
          <span>Mostrando {filteredCasos.length} de {totalCasos} alunos</span>
          <span className="italic">* Casos em investigação requerem acompanhamento periódico pelo corpo multidisciplinar.</span>
        </div>
      </div>
    </StandardDialog>
  )
}
