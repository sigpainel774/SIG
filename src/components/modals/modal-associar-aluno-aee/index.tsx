'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { StandardDialog } from '@/components/ui/standard-dialog'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabaseClient'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface ModalAssociarAlunoAEEProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  profissionalId: string
  profissionalNome: string
  profissionalCargo: string
  escolaEmaeeId: string
  onSuccess?: () => void
}

export function ModalAssociarAlunoAEE({
  open,
  onOpenChange,
  profissionalId,
  profissionalNome,
  profissionalCargo,
  escolaEmaeeId,
  onSuccess
}: ModalAssociarAlunoAEEProps) {
  const [isOpen, setIsOpen] = useState(false)
  const activeOpen = open !== undefined ? open : isOpen

  const [loading, setLoading] = useState(false)
  const [alunosDisponiveis, setAlunosDisponiveis] = useState<any[]>([])
  const [alunoSelecionadoId, setAlunoSelecionadoId] = useState<string>('')
  const [frequencia, setFrequencia] = useState<string>('SEMANAL')

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    let isMounted = true

    const fetchAlunos = async () => {
      if (!activeOpen) return
      setLoading(true)
      try {
        // Busca matriculas EMAEE desta escola, que ainda NÃO estão associadas a este profissional
        const { data: matriculas, error } = await supabase
          .from('emaee_matriculas')
          .select(`
            id,
            status,
            aluno_id,
            alunos ( nome, cpf )
          `)
          .eq('escola_atendimento_id', escolaEmaeeId)

        if (error) throw error

        // Busca vínculos deste profissional para filtrar
        const { data: vinculados, error: vincError } = await supabase
          .from('emaee_especialidades_vinculadas')
          .select('emaee_matricula_id')
          .eq('profissional_id', profissionalId)

        if (vincError) throw vincError

        const vinculadosIds = vinculados.map(v => v.emaee_matricula_id)

        if (isMounted) {
          const disponiveis = (matriculas || []).filter(m => !vinculadosIds.includes(m.id))
          // Ordena por nome do aluno
          disponiveis.sort((a, b) => {
            const nomeA = (a.alunos as any)?.nome || ''
            const nomeB = (b.alunos as any)?.nome || ''
            return nomeA.localeCompare(nomeB)
          })
          setAlunosDisponiveis(disponiveis)
        }
      } catch (err: any) {
        console.error(err)
        toast.error('Erro ao buscar alunos disponíveis.')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchAlunos()

    return () => {
      isMounted = false
    }
  }, [activeOpen, escolaEmaeeId, profissionalId, supabase])

  const handleOpenChange = (val: boolean) => {
    if (onOpenChange) onOpenChange(val)
    setIsOpen(val)
    if (!val) {
      setAlunoSelecionadoId('')
      setFrequencia('SEMANAL')
    }
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!alunoSelecionadoId) {
      toast.error('Selecione um aluno primeiro.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('emaee_especialidades_vinculadas')
        .insert({
          emaee_matricula_id: alunoSelecionadoId,
          profissional_id: profissionalId,
          especialidade: profissionalCargo || 'Outros',
          frequencia: frequencia,
          dia_semana: 1, // Placeholder padrão
          horario_inicio: '08:00:00'
        })

      if (error) throw error

      toast.success('Aluno vinculado com sucesso!')
      if (onSuccess) onSuccess()
      handleOpenChange(false)
    } catch (err: any) {
      console.error(err)
      toast.error('Erro ao vincular aluno ao profissional.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <StandardDialog
      open={activeOpen}
      onOpenChange={handleOpenChange}
      title="Vincular Aluno"
      maxWidth="sm:max-w-[500px]"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            className="text-gray-400 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="form-vincular-aee"
            disabled={loading || !alunoSelecionadoId}
            className="bg-[#3ea6ff] hover:bg-[#3ea6ff]/90 text-[#050505] font-bold px-6 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Vincular'}
          </Button>
        </div>
      }
    >
      <form id="form-vincular-aee" onSubmit={handleSalvar} className="space-y-6 pb-4">
        <div>
          <p className="text-sm text-gray-400 mb-4">
            Associando aluno ao profissional <span className="font-bold text-white">{profissionalNome}</span> ({profissionalCargo}).
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-xs text-gray-300">Selecione o Aluno (Prontuário EMAEE)</Label>
            <Select value={alunoSelecionadoId} onValueChange={(val) => setAlunoSelecionadoId(val || '')}>
              <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                <SelectValue placeholder={loading ? "Carregando..." : "Selecione o aluno..."} />
              </SelectTrigger>
              <SelectContent className="bg-[#18181b] border-[#27272a] text-white max-h-60">
                {alunosDisponiveis.map(m => {
                  const nome = (m.alunos as any)?.nome || 'Sem Nome'
                  const statusLabel = m.status === 'FILA_ESPERA' ? ' (Fila)' : ''
                  return (
                    <SelectItem key={m.id} value={m.id}>
                      {nome}{statusLabel}
                    </SelectItem>
                  )
                })}
                {!loading && alunosDisponiveis.length === 0 && (
                  <div className="p-3 text-sm text-gray-400 text-center">Nenhum aluno disponível.</div>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-gray-300">Frequência de Atendimento</Label>
            <Select value={frequencia} onValueChange={(val) => setFrequencia(val || '')}>
              <SelectTrigger className="bg-[#121212] border-[#2a2a2a] text-white mt-1">
                <SelectValue placeholder="Frequência" />
              </SelectTrigger>
              <SelectContent className="bg-[#18181b] border-[#27272a] text-white">
                <SelectItem value="SEMANAL">Semanal</SelectItem>
                <SelectItem value="QUINZENAL">Quinzenal</SelectItem>
                <SelectItem value="MENSAL">Mensal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </form>
    </StandardDialog>
  )
}
