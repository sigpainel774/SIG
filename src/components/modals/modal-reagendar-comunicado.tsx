'use client'

import { useState } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Clock, Loader2, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabaseClient'
import { getHojeBrasilia } from '@/lib/dateUtils'

interface ModalReagendarComunicadoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  comunicado: {
    id: string
    title: string
    scheduled_for: string | null
    date?: string
  } | null
  onSuccess: () => void
}

export function ModalReagendarComunicado({
  open,
  onOpenChange,
  comunicado,
  onSuccess,
}: ModalReagendarComunicadoProps) {
  const [dataAgendamento, setDataAgendamento] = useState(() => {
    if (comunicado?.scheduled_for) {
      return new Date(comunicado.scheduled_for).toISOString().split('T')[0]
    }
    return getHojeBrasilia()
  })

  const [horaAgendamento, setHoraAgendamento] = useState(() => {
    if (comunicado?.scheduled_for) {
      const d = new Date(comunicado.scheduled_for)
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      return `${hh}:${mm}`
    }
    return '07:00'
  })

  const [salvando, setSalvando] = useState(false)

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!comunicado) return

    if (!dataAgendamento || !horaAgendamento) {
      toast.error('Informe a data e o horário desejados para o reagendamento.')
      return
    }

    const scheduledTimestamp = new Date(`${dataAgendamento}T${horaAgendamento}:00-03:00`).getTime()
    if (isNaN(scheduledTimestamp)) {
      toast.error('Data ou horário de agendamento inválidos.')
      return
    }

    if (scheduledTimestamp <= Date.now()) {
      toast.error('O novo horário de agendamento deve ser futuro.')
      return
    }

    const scheduledForIso = new Date(scheduledTimestamp).toISOString()

    setSalvando(true)
    try {
      const supabase = createClient()
      const { error } = await (supabase.from('comunicados') as any)
        .update({
          scheduled_for: scheduledForIso,
          date: dataAgendamento,
          status: 'agendado',
        })
        .eq('id', comunicado.id)

      if (error) {
        toast.error('Erro ao reagendar comunicado: ' + error.message)
      } else {
        toast.success(`Comunicado reagendado para ${new Date(`${dataAgendamento}T${horaAgendamento}:00`).toLocaleDateString('pt-BR')} às ${horaAgendamento}!`)
        onOpenChange(false)
        onSuccess()
      }
    } catch (err: any) {
      toast.error('Falha ao processar reagendamento: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Reagendar Transmissão"
      description={`Altere a programação de envio do comunicado "${comunicado?.title || ''}".`}
      maxWidth="sm:max-w-md"
    >
      <form onSubmit={handleSalvar} className="space-y-4 pt-2">
        <div className="p-3.5 bg-amber-500/10 dark:bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-700 dark:text-amber-300 font-bold flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Novo Horário de Disparo:
            </span>
            <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400/80 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/20">
              Horário de Brasília
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-foreground/80 block mb-1">
                Data
              </label>
              <Input
                type="date"
                value={dataAgendamento}
                onChange={(e) => setDataAgendamento(e.target.value)}
                className="h-9 text-xs bg-input border-borderCustom text-foreground focus-visible:ring-amber-500/40"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-foreground/80 block mb-1">
                Horário
              </label>
              <Input
                type="time"
                value={horaAgendamento}
                onChange={(e) => setHoraAgendamento(e.target.value)}
                className="h-9 text-xs bg-input border-borderCustom text-foreground focus-visible:ring-amber-500/40"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-borderCustom">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-borderCustom text-muted-foreground hover:text-foreground cursor-pointer text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={salvando}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold cursor-pointer text-xs gap-1.5"
          >
            {salvando ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Calendar className="w-3.5 h-3.5" />
            )}
            <span>Confirmar Reagendamento</span>
          </Button>
        </div>
      </form>
    </StandardDialog>
  )
}
