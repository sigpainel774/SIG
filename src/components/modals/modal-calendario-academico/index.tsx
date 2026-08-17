'use client'

import React from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { CalendarioAcademicoContent } from './CalendarioAcademicoContent'

interface ModalCalendarioAcademicoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  secretariaId?: string
  secretariaNome?: string
}

export function ModalCalendarioAcademico({
  open,
  onOpenChange,
  secretariaId,
  secretariaNome = 'Secretaria Municipal de Educação'
}: ModalCalendarioAcademicoProps) {
  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Calendário Acadêmico da Rede Municipal"
      description={`Planejamento temporal oficial do ano letivo de toda a rede municipal de ensino — ${secretariaNome}.`}
      maxWidth="sm:max-w-6xl"
    >
      <div className="py-1">
        <CalendarioAcademicoContent
          secretariaId={secretariaId}
          secretariaNome={secretariaNome}
          onClose={() => onOpenChange(false)}
          showCloseButton={true}
        />
      </div>
    </StandardDialog>
  )
}
export { CalendarioAcademicoContent }
