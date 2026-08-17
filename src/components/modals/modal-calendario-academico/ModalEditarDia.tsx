'use client'

import React, { useState, useEffect } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { TipoDiaCalendario } from '@/hooks/useCalendarioAcademico'
import { formatarDataBR } from '@/lib/feriadosNacionais'
import { Calendar, Trash2, CheckCircle } from 'lucide-react'

interface ModalEditarDiaProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dataStr: string | null
  tipoAtual: TipoDiaCalendario
  descricaoAtual: string
  letivoAtual: boolean
  onSave: (data: string, tipo: TipoDiaCalendario, descricao: string, letivo: boolean) => void
  onRemove: (data: string) => void
}

export function ModalEditarDia({
  open,
  onOpenChange,
  dataStr,
  tipoAtual,
  descricaoAtual,
  letivoAtual,
  onSave,
  onRemove
}: ModalEditarDiaProps) {
  const [tipo, setTipo] = useState<TipoDiaCalendario>(tipoAtual)
  const [descricao, setDescricao] = useState<string>(descricaoAtual)
  const [letivo, setLetivo] = useState<boolean>(letivoAtual)

  useEffect(() => {
    if (open && dataStr) {
      setTipo(tipoAtual)
      setDescricao(descricaoAtual || '')
      setLetivo(letivoAtual)
    }
  }, [open, dataStr, tipoAtual, descricaoAtual, letivoAtual])

  if (!dataStr) return null

  const handleTipoChange = (novoTipo: TipoDiaCalendario) => {
    setTipo(novoTipo)
    if (novoTipo === 'sabado_letivo' || novoTipo === 'dia_letivo_especial' || novoTipo === 'letivo_regular') {
      setLetivo(true)
    } else {
      setLetivo(false)
    }
  }

  const handleSalvar = () => {
    onSave(dataStr, tipo, descricao, letivo)
    onOpenChange(false)
  }

  const handleRestaurar = () => {
    onRemove(dataStr)
    onOpenChange(false)
  }

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Configuração do Dia"
      description={`Personalize a classificação e o status letivo do dia ${formatarDataBR(dataStr)}.`}
      maxWidth="sm:max-w-[480px]"
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleRestaurar}
            className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Restaurar Padrão
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSalvar}
              className="text-xs h-9 bg-primary text-primary-foreground font-semibold hover:bg-primary/90 cursor-pointer"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Salvar Dia
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        <div className="bg-[#18181b] border border-border/60 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">{formatarDataBR(dataStr)}</p>
              <p className="text-[11px] text-muted-foreground">Classificação no ano letivo</p>
            </div>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
              letivo
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
          >
            {letivo ? 'Dia Letivo' : 'Não Letivo'}
          </span>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
            Tipo de Evento / Classificação
          </label>
          <Select value={tipo} onValueChange={(val: any) => handleTipoChange(val)}>
            <SelectTrigger className="w-full h-9 text-xs bg-background/60">
              <SelectValue placeholder="Selecione o tipo do dia" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              <SelectItem value="letivo_regular">🟢 Dia Letivo Regular</SelectItem>
              <SelectItem value="ponto_facultativo">🟡 Ponto Facultativo (Decreto)</SelectItem>
              <SelectItem value="feriado_nacional">🔴 Feriado Nacional</SelectItem>
              <SelectItem value="feriado_estadual">🟠 Feriado Estadual</SelectItem>
              <SelectItem value="feriado_municipal">🟣 Feriado Municipal</SelectItem>
              <SelectItem value="recesso_escolar">🟤 Recesso Escolar / Férias</SelectItem>
              <SelectItem value="sabado_letivo">🔷 Sábado Letivo (Reposição)</SelectItem>
              <SelectItem value="dia_letivo_especial">✨ Dia Letivo Especial (Evento/Feira)</SelectItem>
              <SelectItem value="conselho_classe">📋 Conselho de Classe</SelectItem>
              <SelectItem value="planejamento_pedagogico">📚 Planejamento Pedagógico</SelectItem>
              <SelectItem value="fim_de_semana">⚪ Fim de Semana (Padrão)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
            Descrição / Motivo / Decreto Oficial
          </label>
          <Input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Decreto Municipal 12/2026 - Ponto Facultativo"
            className="h-9 text-xs bg-background/60"
          />
        </div>

        <div className="bg-card border border-border/60 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-foreground">Contabilizar como Dia Letivo?</p>
            <p className="text-[11px] text-muted-foreground">
              Se ativado, este dia somará para a meta de 200 dias da LDB.
            </p>
          </div>
          <input
            type="checkbox"
            checked={letivo}
            onChange={(e) => setLetivo(e.target.checked)}
            className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
          />
        </div>
      </div>
    </StandardDialog>
  )
}
