'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { CalendarRange, Clock, User, AlertCircle, CalendarDays, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { toast } from 'sonner'
import { getAvatarUrl } from '@/lib/photoHelper'

const DIAS_SEMANA_NOMES: Record<number, string> = {
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
  7: 'Domingo',
}

interface ModalRemarcarAtendimentoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  atendimento: any
  dataOriginal: Date | string
  escolaId?: string | null
  funcionarioId?: string | null
  funcionarioNome?: string | null
  onSuccess: (registroSalvo: any) => void
}

/** Formata data ISO (YYYY-MM-DD) para DD/MM/YYYY sem deslocamento de timezone */
function formatarDataIsoBr(dataIso: string): string {
  if (!dataIso) return ''
  const partes = dataIso.split('T')[0].split('-')
  if (partes.length !== 3) return dataIso
  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

/** Extrai YYYY-MM-DD com segurança de Date ou string */
function extrairDataIso(d: Date | string): string {
  if (d instanceof Date) {
    const ano = d.getFullYear()
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const dia = String(d.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
  }
  if (typeof d === 'string') {
    return d.split('T')[0]
  }
  return ''
}

export function ModalRemarcarAtendimento({
  open,
  onOpenChange,
  atendimento,
  dataOriginal,
  escolaId,
  funcionarioId,
  funcionarioNome,
  onSuccess,
}: ModalRemarcarAtendimentoProps) {
  const [novaData, setNovaData] = useState<string>('')
  const [novoHorario, setNovoHorario] = useState<string>('')
  const [motivo, setMotivo] = useState<string>('')
  const [salvando, setSalvando] = useState<boolean>(false)

  const dataOriginalIso = useMemo(() => extrairDataIso(dataOriginal), [dataOriginal])
  const dataOriginalFormatada = useMemo(() => formatarDataIsoBr(dataOriginalIso), [dataOriginalIso])

  // Inicializa os campos ao abrir o modal
  useEffect(() => {
    if (open && atendimento) {
      const hInicio = atendimento.horario_inicio
        ? atendimento.horario_inicio.substring(0, 5)
        : '08:00'
      setNovoHorario(hInicio)
      setNovaData('')
      setMotivo('')
      setSalvando(false)
    }
  }, [open, atendimento])

  // Calcula o dia da semana da nova data escolhida
  const infoNovaData = useMemo(() => {
    if (!novaData) return null
    const partes = novaData.split('-').map(Number)
    if (partes.length !== 3 || !partes[0] || !partes[1] || !partes[2]) return null
    const d = new Date(partes[0], partes[1] - 1, partes[2])
    const diaJs = d.getDay() // 0=Dom, 1=Seg...
    const diaAee = diaJs === 0 ? 7 : diaJs
    const isFimDeSemana = diaJs === 0 || diaJs === 6
    const isMesmoDiaSemana = atendimento?.dia_semana === diaAee

    return {
      diaSemanaNome: DIAS_SEMANA_NOMES[diaAee] || '',
      dataFormatada: `${String(partes[2]).padStart(2, '0')}/${String(partes[1]).padStart(2, '0')}/${partes[0]}`,
      isFimDeSemana,
      isMesmoDiaSemana,
      diaAee,
    }
  }, [novaData, atendimento])

  if (!atendimento) return null

  const aluno = atendimento.emaee_matriculas?.alunos
  const prof = atendimento.funcionarios
  const especialidade =
    atendimento.especialidade && atendimento.especialidade !== 'Outro' && atendimento.especialidade !== 'Outros'
      ? atendimento.especialidade
      : atendimento.especialidade_outros || prof?.cargo || 'Atendimento AEE'
  const avatarUrl = getAvatarUrl(prof)
  const hInicioOrig = atendimento.horario_inicio ? atendimento.horario_inicio.substring(0, 5) : ''
  const hFimOrig = atendimento.horario_fim ? atendimento.horario_fim.substring(0, 5) : ''

  const handleConfirmar = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!novaData) {
      toast.error('Selecione a nova data prevista para o atendimento.')
      return
    }

    if (novaData === dataOriginalIso) {
      toast.error('A nova data não pode ser igual à data original da sessão.')
      return
    }

    setSalvando(true)
    try {
      const res = await fetch('/api/emaee/atendimentos/registros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vinculo_id: atendimento.id,
          escola_id: escolaId || atendimento.emaee_matriculas?.escola_atendimento_id || null,
          data_atendimento: dataOriginalIso,
          status: 'remarcado',
          aluno_nao_compareceu: false,
          motivo_recusa_falta: null,
          observacoes: motivo?.trim() ? `Remarcação: ${motivo.trim()}` : 'Atendimento Remarcado',
          data_remarcada: novaData,
          horario_remarcado: novoHorario || hInicioOrig || '08:00',
          motivo_remarcacao: motivo?.trim() || null,
          registrado_por: funcionarioId || null,
          registrado_por_nome: funcionarioNome || 'Secretaria EMAEE',
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao remarcar atendimento')
      }

      toast.success(
        `Atendimento remarcado para ${infoNovaData?.diaSemanaNome || ''} (${formatarDataIsoBr(novaData)}) às ${novoHorario || hInicioOrig}!`,
      )
      onSuccess(data.registro)
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao remarcar atendimento:', err)
      toast.error(err?.message || 'Falha ao salvar a remarcação.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Remarcar Consulta / Atendimento"
      description="Escolha a nova data e horário para reposição ou reagendamento da consulta."
      maxWidth="sm:max-w-[480px]"
      footer={
        <div className="flex items-center justify-end gap-2 w-full pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={salvando}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirmar}
            disabled={salvando || !novaData}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl px-4 shadow-sm cursor-pointer disabled:opacity-50"
          >
            {salvando ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Remarcando...</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <CalendarRange className="w-3.5 h-3.5" />
                <span>Confirmar Remarcação</span>
              </span>
            )}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleConfirmar} className="space-y-3.5 text-xs">
        {/* Resumo do Atendimento */}
        <div className="p-3 bg-secondary/30 border border-border rounded-xl space-y-2">
          {/* Identificação do Aluno */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Paciente
            </span>
            {atendimento.emaee_matriculas?.numero_matricula_emaee && (
              <span className="text-[9px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full border border-primary/20">
                Matrícula: {atendimento.emaee_matriculas.numero_matricula_emaee}
              </span>
            )}
          </div>
          <div className="font-bold text-foreground text-sm truncate">
            {aluno?.nome ?? 'Aluno não identificado'}
          </div>

          {/* Identificação do Profissional */}
          <div className="flex items-center gap-2.5 pt-1 border-t border-border/50">
            <div className="h-7 w-7 rounded-full bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={prof?.nome || ''} className="w-full h-full object-cover" />
              ) : (
                <User className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-foreground text-xs truncate">
                {prof?.nome ?? 'Profissional AEE'}
              </div>
              <div className="text-amber-600 dark:text-amber-400 font-medium text-[10px] truncate">
                {especialidade}
              </div>
            </div>
          </div>

          {/* Sessão Original */}
          <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1 font-medium text-foreground">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span>Sessão original: {dataOriginalFormatada}</span>
            </div>
            {hInicioOrig && (
              <div className="flex items-center gap-1 font-bold text-foreground">
                <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                <span>
                  {hInicioOrig}
                  {hFimOrig ? ` - ${hFimOrig}` : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bloco de Campos de Remarcação */}
        <div className="p-3.5 bg-amber-500/5 border border-amber-500/25 rounded-xl space-y-3">
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs">
            <CalendarRange className="w-4 h-4 shrink-0" />
            <span>Definir Nova Data e Horário</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Campo Nova Data */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                <span>
                  Nova Data <span className="text-rose-500">*</span>
                </span>
              </Label>
              <input
                type="date"
                value={novaData}
                onChange={(e) => setNovaData(e.target.value)}
                required
                className="w-full h-9 bg-background border border-border text-foreground rounded-xl px-2.5 text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all cursor-pointer"
              />
            </div>

            {/* Campo Novo Horário */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-foreground">
                Novo Horário Previsto
              </Label>
              <input
                type="time"
                value={novoHorario}
                onChange={(e) => setNovoHorario(e.target.value)}
                className="w-full h-9 bg-background border border-border text-foreground rounded-xl px-2.5 text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all cursor-pointer"
              />
            </div>
          </div>

          {/* Destaque do Dia da Semana Selecionado */}
          {infoNovaData && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-background/80 border border-amber-500/20 text-foreground">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="font-semibold text-xs">
                  {infoNovaData.diaSemanaNome}, {infoNovaData.dataFormatada}
                </span>
                {novoHorario && (
                  <span className="text-muted-foreground text-[11px]">às {novoHorario}</span>
                )}
              </div>

              {infoNovaData.isFimDeSemana && (
                <div className="flex items-center gap-1.5 text-[10.5px] text-rose-500 font-medium bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Atenção: a data selecionada cai em um final de semana.</span>
                </div>
              )}

              {infoNovaData.isMesmoDiaSemana && (
                <div className="flex items-center gap-1.5 text-[10.5px] text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Nota: O aluno já possui horário regular de {infoNovaData.diaSemanaNome}.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Motivo da Remarcação */}
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-foreground">
              Motivo da Remarcação / Observação
            </Label>
            <textarea
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Solicitação da família para consulta pediátrica, reposição na quinta-feira..."
              className="w-full bg-background border border-border text-foreground rounded-xl p-2.5 text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all placeholder:text-muted-foreground/60 resize-none"
            />
          </div>
        </div>
      </form>
    </StandardDialog>
  )
}
