'use client'

import React, { useState, useEffect } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { History, Save, BookOpen } from 'lucide-react'
import type { Aluno } from '@/hooks/useAlunos'

interface ModalHistoricoAlunoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  aluno: Aluno | null
  isEditMode: boolean
  onSalvar: (alunoId: string, historicoText: string) => Promise<void>
}

export function ModalHistoricoAluno({
  open,
  onOpenChange,
  aluno,
  isEditMode,
  onSalvar,
}: ModalHistoricoAlunoProps) {
  const [historicoText, setHistoricoText] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (aluno) {
      setHistoricoText(aluno.historico ?? aluno.dados_matricula?.historico ?? '')
    } else {
      setHistoricoText('')
    }
  }, [aluno])

  if (!aluno) return null

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      await onSalvar(aluno.id, historicoText)
      onOpenChange(false)
    } finally {
      setSalvando(false)
    }
  }

  const temHistorico = Boolean(historicoText.trim().length > 0)

  return (
    <StandardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Histórico do Aluno"
      description={`Histórico escolar e observações registradas para ${aluno.nome}`}
      maxWidth="sm:max-w-[700px]"
      className="w-[95vw]"
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                temHistorico ? 'bg-emerald-500' : 'bg-zinc-600'
              }`}
            />
            <span>
              {temHistorico ? 'Histórico Preenchido' : 'Sem histórico registrado'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-zinc-400 hover:text-white"
            >
              Fechar
            </Button>
            {isEditMode && (
              <Button
                type="button"
                onClick={handleSalvar}
                disabled={salvando}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-sm transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {salvando ? 'Salvando...' : 'Salvar Histórico'}
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-2">
        {/* Info do Aluno */}
        <div className="bg-surface-2 border border-borderCustom p-3.5 rounded-xl flex items-center justify-between text-xs">
          <div>
            <span className="text-muted-foreground block">Estudante:</span>
            <span className="font-bold text-foreground text-sm">{aluno.nome}</span>
          </div>
          {aluno.numero_matricula && (
            <div className="text-right">
              <span className="text-muted-foreground block">Matrícula:</span>
              <span className="font-semibold text-purple-400">{aluno.numero_matricula}</span>
            </div>
          )}
        </div>

        {/* Textarea ou Leitura */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>Informações e Histórico Registrado</span>
          </Label>

          {isEditMode ? (
            <textarea
              value={historicoText}
              onChange={(e) => setHistoricoText(e.target.value)}
              placeholder="Digite aqui as informações completas do histórico do aluno, transferências anteriores, observações pedagógicas ou de saúde..."
              rows={8}
              className="w-full bg-[#141416] border border-[#26262a] rounded-xl p-3.5 text-sm text-foreground focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-y min-h-[160px] leading-relaxed"
            />
          ) : (
            <div className="w-full bg-[#141416] border border-[#26262a] rounded-xl p-4 text-sm text-zinc-300 min-h-[140px] whitespace-pre-wrap leading-relaxed">
              {historicoText.trim() ? (
                historicoText
              ) : (
                <span className="text-zinc-500 italic">
                  Nenhum histórico registrado para este aluno até o momento.
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </StandardDialog>
  )
}
