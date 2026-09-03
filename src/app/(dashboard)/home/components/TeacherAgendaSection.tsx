'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Clock, Loader2 } from 'lucide-react'
import { getHojeBrasilia } from '@/lib/dateUtils'

const ModalDetalhesTurma = dynamic(
  () => import('@/components/ModalDetalhesTurma').then((m) => m.ModalDetalhesTurma),
  { ssr: false }
)

interface TeacherAgendaSectionProps {
  aulasHoje: any[]
  loadingAulasHoje: boolean
}

export function TeacherAgendaSection({
  aulasHoje,
  loadingAulasHoje,
}: TeacherAgendaSectionProps) {
  const [selectedTurmaChamada, setSelectedTurmaChamada] = useState<any | null>(null)
  const [selectedAulaChamada, setSelectedAulaChamada] = useState<any | null>(null)
  const [isModalChamadaOpen, setIsModalChamadaOpen] = useState(false)

  return (
    <>
      <Card className="bg-surface-1 border-borderCustom rounded-2xl p-6 shadow-sm">
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-highlight" />
          Minha Agenda de Aulas — Hoje
        </h3>

        {loadingAulasHoje ? (
          <div className="space-y-3 py-6 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-highlight" />
            <span>Buscando agenda de aulas...</span>
          </div>
        ) : aulasHoje.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-borderCustom rounded-2xl text-muted-foreground text-sm">
            Nenhuma aula programada na agenda para o dia de hoje.
          </div>
        ) : (
          <div className="rounded-xl border border-borderCustom overflow-hidden bg-surface-2/40 overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader className="bg-muted/40">
                <TableRow className="border-borderCustom hover:bg-transparent">
                  <TableHead className="text-foreground">Horário</TableHead>
                  <TableHead className="text-foreground text-center">Turma</TableHead>
                  <TableHead className="text-foreground text-center">Disciplina</TableHead>
                  <TableHead className="text-foreground text-center">Status</TableHead>
                  <TableHead className="text-foreground text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aulasHoje.map((aula) => (
                  <TableRow key={aula.id} className="border-borderCustom hover:bg-muted/50 transition-colors">
                    <TableCell className="font-semibold text-foreground font-mono text-xs">
                      {aula.horario_inicio.slice(0, 5)} - {aula.horario_fim.slice(0, 5)}
                    </TableCell>
                    <TableCell className="text-center text-foreground font-bold">
                      {aula.turmas?.nome ?? '-'}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground font-medium">
                      {aula.materias?.nome ?? '-'}
                    </TableCell>

                    <TableCell className="text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        aula.status === 'normal'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : aula.status === 'alterado'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {aula.status.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        onClick={() => {
                          setSelectedTurmaChamada({
                            id: aula.turma_id,
                            nome: aula.turmas?.nome || 'Turma'
                          })
                          setSelectedAulaChamada(aula)
                          setIsModalChamadaOpen(true)
                        }}
                        disabled={aula.status === 'cancelado'}
                        className="bg-highlight hover:bg-highlight/90 text-background font-bold text-xs h-8 rounded-lg cursor-pointer"
                      >
                        Lançar Presença
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {isModalChamadaOpen && selectedTurmaChamada && (
        <ModalDetalhesTurma
          open={isModalChamadaOpen}
          onOpenChange={setIsModalChamadaOpen}
          turma={selectedTurmaChamada}
          initialMateriaId={selectedAulaChamada?.materia_id}
          initialAgendaAulaId={selectedAulaChamada?.id}
          initialData={getHojeBrasilia()}
        />
      )}
    </>
  )
}
